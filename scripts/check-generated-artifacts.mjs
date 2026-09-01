import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function gitFiles(args) {
  const result = spawnSync("git", args, { cwd: repositoryRoot, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "Unable to inspect generated artifacts.");
  return result.stdout.split("\0").filter(Boolean);
}

function canonicalSource(file) {
  if (file.endsWith(".d.ts")) return `${file.slice(0, -5)}.ts`;
  if (file.endsWith(".js")) return `${file.slice(0, -3)}.ts`;
  return undefined;
}

function isGeneratedSourceSidecar(file) {
  if (!/\.(?:js|d\.ts)$/.test(file) || /(^|[\\/])dist([\\/]|$)/.test(file) || !existsSync(resolve(repositoryRoot, file))) return false;
  if (!/^(?:modules|apps|packages)[\\/]/.test(file)) return false;
  const source = canonicalSource(file);
  return source !== undefined && existsSync(resolve(repositoryRoot, source));
}

const trackedSidecars = gitFiles(["ls-files", "-z"]).filter(isGeneratedSourceSidecar);
const untrackedSidecars = gitFiles(["ls-files", "--others", "--exclude-standard", "-z"]).filter(isGeneratedSourceSidecar);
const failures = [
  ...(trackedSidecars.length ? [`Tracked generated source sidecars are not allowed; use TypeScript sources and dist/ output:\n${trackedSidecars.join("\n")}`] : []),
  ...(untrackedSidecars.length ? [`Untracked generated source sidecars are not allowed outside dist/:\n${untrackedSidecars.join("\n")}`] : []),
];

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else console.log("Generated artifact policy passed: no source-tree .js/.d.ts sidecars; compiled output belongs under dist/.");
