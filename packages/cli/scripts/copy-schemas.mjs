import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = resolve(packageRoot, "..", "..");
const outputDirectory = join(packageRoot, "dist", "schemas");
const schemas = ["review-report.schema.json", "review-snapshot.schema.json"];
let reportSchema;

await mkdir(outputDirectory, { recursive: true });
for (const name of schemas) {
  let source;
  try {
    source = await readFile(join(repositoryRoot, "schemas", name), "utf8");
  } catch {
    source = await readFile(join(outputDirectory, name), "utf8");
  }
  const parsed = JSON.parse(source);
  if (name === "review-report.schema.json") reportSchema = parsed;
  await writeFile(join(outputDirectory, name), source, "utf8");
}

// Structured-output providers require every declared object property to be
// listed as required. The canonical public schema keeps convenience fields
// optional, so emit a provider-only variant without weakening validation.
const hostSchema = structuredClone(reportSchema);
delete hostSchema.$schema;
delete hostSchema.$id;
delete hostSchema.$comment;
function addProviderTypes(node) {
  if (!node || typeof node !== "object") return;
  // Provider structured-output dialects do not consistently support ECMA
  // regex (notably lookarounds). The canonical validator applies patterns.
  delete node.pattern;
  if (!node.type && Object.hasOwn(node, "const")) node.type = typeof node.const;
  if (!node.type && Array.isArray(node.enum) && node.enum.every((value) => typeof value === "string")) node.type = "string";
  if (node.properties) node.required = Object.keys(node.properties);
  for (const child of Object.values(node.properties ?? {})) addProviderTypes(child);
  for (const child of Object.values(node.$defs ?? {})) addProviderTypes(child);
  if (node.items) addProviderTypes(node.items);
}
addProviderTypes(hostSchema);
await writeFile(join(outputDirectory, "review-host-output.schema.json"), `${JSON.stringify(hostSchema, null, 2)}\n`, "utf8");

await cp(join(packageRoot, "src", "dashboard"), join(packageRoot, "dist", "dashboard"), { recursive: true, force: true });

process.stdout.write(`Copied ${schemas.length} public schemas, one host schema, and dashboard assets into dist/.\n`);
