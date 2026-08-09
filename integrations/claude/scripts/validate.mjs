import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function fail(message) {
  errors.push(message);
}

function load(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function loadJson(relativePath) {
  const source = load(relativePath);
  if (!source) return {};
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return {};
  }
}

function frontmatter(relativePath) {
  const source = load(relativePath).replace(/\r\n/g, "\n");
  const match = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) {
    fail(`${relativePath} has no valid YAML frontmatter block`);
    return { source, yaml: "" };
  }
  return { source, yaml: match[1] };
}

function scalar(yaml, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = yaml.match(new RegExp(`^${escaped}:\\s*(.+?)\\s*$`, "m"));
  if (!match) return undefined;
  return match[1].replace(/^(["'])(.*)\1$/, "$2");
}

function list(yaml, key) {
  const lines = yaml.split("\n");
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start < 0) return [];
  const values = [];
  for (const line of lines.slice(start + 1)) {
    const item = line.match(/^\s{2}-\s+(.+?)\s*$/);
    if (item) {
      values.push(item[1].replace(/^(["'])(.*)\1$/, "$2"));
      continue;
    }
    if (/^[A-Za-z][A-Za-z0-9-]*:/.test(line)) break;
  }
  return values;
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const plugin = loadJson(".claude-plugin/plugin.json");
const marketplace = loadJson(".claude-plugin/marketplace.json");
const skill = frontmatter("skills/review/SKILL.md");
const agent = frontmatter("agents/code-reviewer.md");
const broker = load("bin/auto-code-review-git");
const mcp = loadJson(".mcp.json");
const mcpServer = load("mcp/git-server.mjs");

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(plugin.name ?? "")) {
  fail("plugin.json name must be non-empty kebab-case");
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(plugin.version ?? "")) {
  fail("plugin.json version must be semantic version syntax");
}
if (plugin.skills !== "./skills/") fail('plugin.json skills must be "./skills/"');
if (
  !Array.isArray(plugin.agents) ||
  plugin.agents.length !== 1 ||
  plugin.agents[0] !== "./agents/code-reviewer.md"
) {
  fail("plugin.json must declare the read-only agent file explicitly");
}
if (plugin.defaultEnabled !== true) fail("plugin.json must default to enabled");
if (plugin.license !== "Apache-2.0") fail("plugin.json license must match the repository");

if (marketplace.name !== "auto-code-review") fail("Unexpected marketplace name");
if (!marketplace.owner?.name) fail("marketplace.json owner.name is required");
if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length !== 1) {
  fail("marketplace.json must contain exactly one plugin entry");
} else {
  const entry = marketplace.plugins[0];
  if (entry.name !== plugin.name) fail("Marketplace plugin name must match plugin.json");
  if (entry.version !== plugin.version) fail("Marketplace and plugin versions must match");
  if (entry.license !== plugin.license) fail("Marketplace and plugin licenses must match");
  if (entry.source !== "./") fail('Self-contained marketplace source must be "./"');
  if (entry.strict !== true) fail("Marketplace entry must use strict manifest mode");
}

if (scalar(skill.yaml, "name") !== "review") fail("Skill name must be review");
if (!scalar(skill.yaml, "description")) fail("Skill description is required");
if (scalar(skill.yaml, "disable-model-invocation") !== "true") {
  fail("Review must require explicit user invocation");
}
if (scalar(skill.yaml, "context") !== "fork") fail("Review must run in a forked context");
if (scalar(skill.yaml, "agent") !== "auto-code-review:code-reviewer") {
  fail("Review must target the scoped read-only agent");
}

if (scalar(agent.yaml, "name") !== "code-reviewer") fail("Unexpected agent name");
if (!scalar(agent.yaml, "description")) fail("Agent description is required");
const agentTools = list(agent.yaml, "tools");
for (const required of ["Read", "Grep", "Glob"]) {
  if (!agentTools.includes(required)) fail(`Agent is missing required tool: ${required}`);
}
if (agentTools.includes("Bash")) fail("Reviewer agent must not expose unrestricted Bash");
const mcpTools = ["git_status", "git_diff", "git_show", "default_branch", "pr_view", "pr_diff"]
  .map((name) => `mcp__auto-code-review__${name}`);
for (const tool of mcpTools) {
  if (!agentTools.includes(tool)) fail(`Reviewer agent is missing typed MCP tool: ${tool}`);
}
for (const tool of agentTools.filter((value) => value === "Bash" || value.startsWith("Bash("))) {
  fail(`Reviewer agent exposes forbidden shell access: ${tool}`);
}
for (const forbidden of ["Write", "Edit"]) {
  if (agentTools.includes(forbidden)) fail(`Agent must not enable ${forbidden}`);
  if (!list(agent.yaml, "disallowedTools").includes(forbidden)) {
    fail(`Agent must explicitly disallow ${forbidden}`);
  }
}
if (!broker.startsWith("#!/usr/bin/env node")) fail("Read-only Git broker must use the Node shebang");
if (/shell:\s*true/.test(broker)) fail("Read-only Git broker must never launch a shell");
for (const guard of ["--no-ext-diff", "--no-textconv", "GIT_CONFIG_NOSYSTEM", "fstatSync(1).isFile()"] ) {
  if (!broker.includes(guard)) fail(`Read-only Git broker is missing guard: ${guard}`);
}
const brokerHelp = spawnSync(process.execPath, [join(root, "bin/auto-code-review-git"), "--help"], {
  cwd: root,
  encoding: "utf8",
  shell: false,
  windowsHide: true,
});
if (brokerHelp.status !== 0 || !brokerHelp.stdout.includes("Usage:")) fail("Read-only Git broker help smoke test failed");
const serverConfig = mcp.mcpServers?.["auto-code-review"];
if (serverConfig?.command !== "node") fail("MCP server must launch with Node");
if (serverConfig?.args?.length !== 1 || serverConfig.args[0] !== "${CLAUDE_PLUGIN_ROOT}/mcp/git-server.mjs") {
  fail("MCP server path must be rooted at CLAUDE_PLUGIN_ROOT");
}
for (const guard of ["spawnSync(process.execPath", "shell: false", "brokerArgs", "additionalProperties: false"]) {
  if (!mcpServer.includes(guard)) fail(`MCP Git server is missing guard: ${guard}`);
}
const mcpCheck = spawnSync(process.execPath, ["--check", join(root, "mcp/git-server.mjs")], {
  cwd: root, encoding: "utf8", shell: false, windowsHide: true,
});
if (mcpCheck.status !== 0) fail("MCP Git server syntax check failed");

for (const path of walk(root)) {
  if (!/\.(?:json|md|mjs)$/.test(path)) continue;
  const source = readFileSync(path, "utf8");
  if (/\[(?:TODO|FIXME)(?::|\])/i.test(source)) {
    fail(`Unresolved placeholder in ${path.slice(root.length + 1)}`);
  }
}

if (errors.length) {
  console.error("Claude adapter validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Claude adapter static validation passed.");
}
