import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

export function workerLaunchOptions({ rootDir = repositoryRoot, env = process.env } = {}) {
  const explicitEnvironment = { ...env };
  const envPath = resolve(rootDir, ".env");
  if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore invalid or unreadable .env file
    }
  }
  const outputDirectory = resolve(rootDir, "apps", "backtest-worker", "dist");
  const entryPoint = resolve(outputDirectory, "apps", "backtest-worker", "src", "main.js");
  const nodePath = env.NODE_PATH ? `${outputDirectory}${delimiter}${env.NODE_PATH}` : outputDirectory;
  return { cwd: rootDir, entryPoint, env: { ...process.env, ...explicitEnvironment, NODE_PATH: nodePath } };
}

export function startWorker(options = workerLaunchOptions()) {
  if (!existsSync(options.entryPoint)) throw new Error("Backtest worker build output is missing. Run `npm run build` from the repository root first.");
  return spawn(process.execPath, [options.entryPoint], { cwd: options.cwd, env: options.env, stdio: "inherit" });
}

function main() {
  let child;
  try { child = startWorker(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; return; }
  const stop = () => child.kill("SIGTERM");
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  child.once("exit", (code) => { process.exitCode = code ?? 1; });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
