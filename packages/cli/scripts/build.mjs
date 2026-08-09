import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = join(packageRoot, "src");
const outputDirectory = join(packageRoot, "dist");
const moduleApi = await import("node:module");
const stripTypeScriptTypes = moduleApi.stripTypeScriptTypes;

if (typeof stripTypeScriptTypes !== "function") {
  await import("./check.mjs");
  process.stdout.write("Node.js 20 verified the committed runtime. Use npm run build for a compiler-backed rebuild.\n");
} else {
  await mkdir(outputDirectory, { recursive: true });
  const sourceFiles = (await readdir(sourceDirectory)).filter((name) => name.endsWith(".ts")).sort();
  for (const sourceName of sourceFiles) {
    const sourcePath = join(sourceDirectory, sourceName);
    const outputName = sourceName.replace(/\.ts$/, ".js");
    const outputPath = join(outputDirectory, outputName);
    const source = await readFile(sourcePath, "utf8");
    const rewrittenImports = source
      .replace(/(from\s+["'][^"']+)\.ts(["'])/g, "$1.js$2")
      .replace(/(import\s*\(\s*["'][^"']+)\.ts(["']\s*\))/g, "$1.js$2");
    const javascript = stripTypeScriptTypes(rewrittenImports, { mode: "strip", sourceMap: false });
    await writeFile(outputPath, javascript, "utf8");
  }
  process.stdout.write(`Built ${sourceFiles.length} modules in dist/.\n`);
}
await import("./copy-schemas.mjs");
