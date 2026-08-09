import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = resolve(packageRoot, "..", "..");
const outputDirectory = join(packageRoot, "dist", "schemas");
const schemas = ["review-report.schema.json", "review-snapshot.schema.json"];

await mkdir(outputDirectory, { recursive: true });
for (const name of schemas) {
  let source;
  try {
    source = await readFile(join(repositoryRoot, "schemas", name), "utf8");
  } catch {
    source = await readFile(join(outputDirectory, name), "utf8");
  }
  JSON.parse(source);
  await writeFile(join(outputDirectory, name), source, "utf8");
}

process.stdout.write(`Copied ${schemas.length} JSON schemas into dist/schemas/.\n`);
