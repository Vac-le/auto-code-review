import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const required = [
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'plugins/auto-code-review/.codex-plugin/plugin.json',
  'plugins/auto-code-review/skills/auto-code-review/SKILL.md',
  'plugins/auto-code-review/skills/auto-code-review/agents/openai.yaml',
  '.agents/plugins/marketplace.json',
  '.claude-plugin/marketplace.json',
  'integrations/claude/.claude-plugin/plugin.json',
  'integrations/claude/bin/auto-code-review-git',
  'integrations/claude/.mcp.json',
  'integrations/claude/mcp/git-server.mjs',
  'packages/installer/src/cli.mjs',
  'benchmark/manifest.json',
  'schemas/review-report.schema.json',
  'schemas/review-snapshot.schema.json',
  'package-lock.json',
  '.github/workflows/ci.yml',
  'website/index.html',
  'website/styles.css',
  'website/app.js',
  'website/og.png',
  'website/docs/index.html',
  'website/docs/docs.css',
  'website/docs/docs.js',
  'website/docs/usage.zh-CN.md',
  'website/docs/usage.en.md',
  'packages/cli/src/host-review.ts',
  'packages/cli/src/ui.ts',
  'packages/cli/src/dashboard/index.html',
  'packages/cli/src/dashboard/styles.css',
  'packages/cli/src/dashboard/responsive.css',
  'packages/cli/src/dashboard/app.js'
];

for (const relative of required) {
  try { await access(resolve(root, relative)); } catch { failures.push(`Missing required file: ${relative}`); }
}

async function json(relative) {
  try { return JSON.parse(await readFile(resolve(root, relative), 'utf8')); }
  catch (error) { failures.push(`Invalid JSON in ${relative}: ${error.message}`); return null; }
}

const manifest = await json('plugins/auto-code-review/.codex-plugin/plugin.json');
if (manifest) {
  if (manifest.name !== 'auto-code-review') failures.push('Codex plugin name must be auto-code-review');
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.version ?? '')) failures.push('Codex plugin version must be strict semver');
  if (manifest.skills !== './skills/') failures.push('Codex plugin must expose ./skills/');
  if (manifest.interface?.displayName !== 'Auto Code Review') failures.push('Codex display name is inconsistent');
  for (const assetField of ['composerIcon', 'logo']) {
    const asset = manifest.interface?.[assetField];
    if (asset) {
      try { await access(resolve(root, 'plugins/auto-code-review', asset)); }
      catch { failures.push(`Plugin ${assetField} does not exist: ${asset}`); }
    }
  }
}

const marketplace = await json('.agents/plugins/marketplace.json');
const entry = marketplace?.plugins?.find((plugin) => plugin.name === 'auto-code-review');
if (marketplace?.name !== 'auto-code-review') failures.push('Marketplace name must be auto-code-review');
if (!entry) failures.push('Marketplace is missing auto-code-review entry');
if (entry?.source?.path !== './plugins/auto-code-review') failures.push('Marketplace source path is invalid');
if (!entry?.policy?.installation || !entry?.policy?.authentication || !entry?.category) failures.push('Marketplace policy/category fields are required');

const claudeMarketplace = await json('.claude-plugin/marketplace.json');
const claudeEntry = claudeMarketplace?.plugins?.find((plugin) => plugin.name === 'auto-code-review');
if (!claudeEntry) failures.push('Root Claude marketplace is missing auto-code-review entry');
if (claudeEntry?.source !== './integrations/claude') failures.push('Root Claude plugin source must point to ./integrations/claude');

const claudeManifest = await json('integrations/claude/.claude-plugin/plugin.json');
if (claudeManifest?.name !== 'auto-code-review') failures.push('Claude plugin name must be auto-code-review');
if (manifest && claudeManifest && manifest.version !== claudeManifest.version) failures.push('Codex and Claude plugin versions must match');

const codexSkillSource = await readFile(resolve(root, 'plugins/auto-code-review/skills/auto-code-review/SKILL.md'), 'utf8');
const codexFrontmatter = codexSkillSource.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
if (!codexFrontmatter) {
  failures.push('Codex skill must have valid YAML frontmatter');
} else {
  const scalar = (key) => codexFrontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))?.[1]?.replace(/^(['"])(.*)\1$/, '$2');
  if (scalar('name') !== 'auto-code-review') failures.push('Codex skill frontmatter name must be auto-code-review');
  if (!scalar('description')) failures.push('Codex skill frontmatter description is required');
}
const openAiYaml = await readFile(resolve(root, 'plugins/auto-code-review/skills/auto-code-review/agents/openai.yaml'), 'utf8');
for (const key of ['display_name', 'short_description', 'default_prompt']) {
  if (!new RegExp(`^\\s*${key}:\\s*\\S`, 'm').test(openAiYaml)) failures.push(`Codex agents/openai.yaml is missing ${key}`);
}

const installerPackage = await json('packages/installer/package.json');
if (installerPackage?.bin?.['auto-code-review-install'] !== './src/cli.mjs') failures.push('Installer binary entry is invalid');
const cliPackage = await json('packages/cli/package.json');
for (const [label, version] of [
  ['CLI', cliPackage?.version],
  ['installer', installerPackage?.version]
]) {
  if (manifest && version !== manifest.version) failures.push(`${label} package version must match plugin version`);
}

const reportSchema = await json('schemas/review-report.schema.json');
const findingProperties = reportSchema?.$defs?.finding?.properties ?? {};
if (reportSchema?.properties?.findings?.maxItems !== 10) failures.push('Report schema must cap findings at 10');
if (!Array.isArray(findingProperties.priority?.enum) || findingProperties.priority.enum.join(',') !== 'P0,P1,P2,P3') failures.push('Report schema priority contract is invalid');
if (!reportSchema?.$comment?.includes('startLine <= endLine')) failures.push('Report schema must document cross-field semantic validation');

const benchmark = await json('benchmark/manifest.json');
if (!Array.isArray(benchmark?.cases) || benchmark.cases.length < 16) failures.push('Benchmark must contain at least 16 labeled cases');

const textFiles = [
  'README.md',
  'plugins/auto-code-review/skills/auto-code-review/SKILL.md',
  'plugins/auto-code-review/.codex-plugin/plugin.json',
  'integrations/claude/skills/review/SKILL.md',
  'packages/installer/README.md',
  'website/index.html'
];
for (const relative of textFiles) {
  const content = await readFile(resolve(root, relative), 'utf8');
  if (/\[TODO:|TODO_PLACEHOLDER|example\.com\/plugin/i.test(content)) failures.push(`Placeholder remains in ${relative}`);
}

if (failures.length) {
  console.error(`Project validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Project validation passed (${required.length} required files, manifests, assets, and placeholders checked).`);
}
