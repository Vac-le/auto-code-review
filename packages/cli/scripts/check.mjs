import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const files = (await readdir(join(packageRoot, "dist"))).filter((name) => name.endsWith(".js")).sort();
let failed = false;
for (const name of files) {
  const result = spawnSync(process.execPath, ["--check", join(packageRoot, "dist", name)], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || `${name} failed syntax validation.\n`);
  }
}
if (failed) process.exitCode = 1;
else process.stdout.write(`Checked ${files.length} runtime modules.\n`);
