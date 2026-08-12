import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { mkdirSync } from "node:fs";

const MAX_RECENT = 8;

export function normalizeSettings(value) {
  const recent = Array.isArray(value?.recentRepositories)
    ? value.recentRepositories.filter((item) => typeof item === "string" && item.length > 0).slice(0, MAX_RECENT)
    : [];
  const lastRepository = typeof value?.lastRepository === "string" && recent.includes(value.lastRepository)
    ? value.lastRepository
    : null;
  const favorites = Array.isArray(value?.favoriteRepositories)
    ? value.favoriteRepositories.filter((item) => typeof item === "string" && recent.includes(item)).slice(0, MAX_RECENT)
    : [];
  return { lastRepository, recentRepositories: recent, favoriteRepositories: [...new Set(favorites)] };
}

export function rememberRepository(settings, repositoryPath) {
  const absolute = resolve(repositoryPath);
  const recentRepositories = [absolute, ...settings.recentRepositories.filter((item) => item !== absolute)].slice(0, MAX_RECENT);
  return normalizeSettings({ ...settings, lastRepository: absolute, recentRepositories });
}

export function toggleFavorite(settings, repositoryPath) {
  const normalized = normalizeSettings(settings);
  if (!normalized.recentRepositories.includes(repositoryPath)) return normalized;
  const favoriteRepositories = normalized.favoriteRepositories.includes(repositoryPath)
    ? normalized.favoriteRepositories.filter((item) => item !== repositoryPath)
    : [repositoryPath, ...normalized.favoriteRepositories];
  return normalizeSettings({ ...normalized, favoriteRepositories });
}

export function readSettings(path) {
  if (!existsSync(path)) return normalizeSettings(null);
  try {
    return normalizeSettings(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return normalizeSettings(null);
  }
}

export function writeSettings(path, settings) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(normalizeSettings(settings), null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporary, path);
}
