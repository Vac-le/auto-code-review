import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const svg = readFileSync(join(packageRoot, "assets", "logo.svg"), "utf8");
const renderer = new Resvg(svg, { fitTo: { mode: "width", value: 512 } });
writeFileSync(join(packageRoot, "assets", "icon.png"), renderer.render().asPng());
