import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const envPath = resolve(repositoryRoot, ".env");
const explicitEnvironment = { ...process.env };
if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  try { process.loadEnvFile(envPath); } catch {}
}
Object.assign(process.env, explicitEnvironment);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    ...options,
  });
}

function runNpm(args) {
  if (process.env.npm_execpath) return run(process.execPath, [process.env.npm_execpath, ...args]);
  return run(npmCommand, args, { shell: process.platform === "win32" });
}

async function waitForExit(child) {
  return await new Promise((resolveExit, rejectExit) => {
    child.once("error", rejectExit);
    child.once("exit", (code) => resolveExit(code ?? 1));
  });
}

async function main() {
  const build = runNpm(["run", "build:backend"]);
  if (await waitForExit(build) !== 0) {
    process.exitCode = 1;
    return;
  }

  const backend = run(process.execPath, ["scripts/start-backend.mjs"]);
  const frontendDirectory = resolve(repositoryRoot, "apps", "frontend");
  const frontendRequire = createRequire(resolve(frontendDirectory, "package.json"));
  const viteMain = frontendRequire.resolve("vite");
  const vitePackageDirectory = dirname(dirname(dirname(viteMain)));
  const viteArguments = [resolve(vitePackageDirectory, "bin", "vite.js"), "--host", "0.0.0.0"];
  if (process.env.FRONTEND_PORT) viteArguments.push("--port", process.env.FRONTEND_PORT);
  const backendPort = process.env.PORT ?? "3000";
  const frontend = run(process.execPath, viteArguments, { cwd: frontendDirectory, env: { ...process.env, VITE_BACKEND_URL: process.env.VITE_BACKEND_URL ?? `http://127.0.0.1:${backendPort}` } });
  const children = [backend, frontend];
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    console.log("Stopping development services...");
    for (const child of children) child.kill("SIGTERM");
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  const shutdownAfterMilliseconds = Number(process.env.DEV_SHUTDOWN_AFTER_MS ?? 0);
  if (Number.isFinite(shutdownAfterMilliseconds) && shutdownAfterMilliseconds > 0) {
    setTimeout(stop, shutdownAfterMilliseconds);
  }
  const exits = children.map(async (child) => ({ child, code: await waitForExit(child) }));
  const firstExit = await Promise.race(exits);
  if (!stopping) stop();
  const exitCodes = (await Promise.all(exits)).map(({ code }) => code);
  if (stopping) console.log("Development services stopped.");
  process.exitCode = stopping ? 0 : (firstExit.code !== 0 ? firstExit.code : (exitCodes.find((code) => code !== 0) ?? 0));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
