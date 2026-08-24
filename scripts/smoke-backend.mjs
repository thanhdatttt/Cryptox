import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.BACKEND_SMOKE_PORT ?? 41000 + Math.floor(Math.random() * 1000));
const launcher = resolve(repositoryRoot, "scripts", "start-backend.mjs");

function wait(milliseconds) { return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)); }

async function healthcheck() {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok && (await response.json()).status === "ok") return;
      lastError = new Error(`Unexpected health response: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(250);
  }
  throw lastError ?? new Error("Backend did not become healthy.");
}

const child = spawn(process.execPath, [launcher], {
  cwd: repositoryRoot,
  env: { ...process.env, PORT: String(port) },
  stdio: "inherit",
});

try {
  await healthcheck();
  console.log(`Backend healthcheck passed on port ${port}.`);
} finally {
  const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
  child.kill("SIGTERM");
  await exited;
}
