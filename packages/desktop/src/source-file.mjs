import { existsSync, lstatSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export function resolveRepositoryFile(repositoryRoot, file) {
  if (typeof repositoryRoot !== "string" || typeof file !== "string" || file.length < 1 || file.length > 1_024 || file.includes("\\") || file.split("/").some((segment) => segment === ".." || segment === "")) return null;
  const target = resolve(repositoryRoot, ...file.split("/"));
  const withinRepository = relative(repositoryRoot, target);
  if (!withinRepository || withinRepository.startsWith("..") || isAbsolute(withinRepository) || !existsSync(target)) return null;
  const stat = lstatSync(target);
  if (stat.isSymbolicLink() || !stat.isFile()) return null;
  const canonicalTarget = realpathSync(target);
  const canonicalRoot = realpathSync(repositoryRoot);
  const canonicalRelative = relative(canonicalRoot, canonicalTarget);
  return !canonicalRelative || canonicalRelative.startsWith("..") || isAbsolute(canonicalRelative) ? null : canonicalTarget;
}
