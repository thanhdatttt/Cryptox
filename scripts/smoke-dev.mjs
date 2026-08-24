import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const backendPort = Number(process.env.BACKEND_SMOKE_PORT ?? 43000 + Math.floor(Math.random() * 500));
const frontendPort = backendPort + 500;

function wait(milliseconds) { return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds)); }

async function waitFor(url, expected) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok && await expected(response)) return;
      lastError = new Error(`Unexpected response from ${url}: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(250);
  }
  throw lastError ?? new Error(`${url} did not become ready.`);
}

const child = spawn(process.execPath, [resolve(repositoryRoot, "scripts", "dev.mjs")], {
  cwd: repositoryRoot,
  env: { ...process.env, PORT: String(backendPort), FRONTEND_PORT: String(frontendPort), DEV_SHUTDOWN_AFTER_MS: "6000" },
  stdio: "inherit",
});

const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
let completed = false;
try {
  await waitFor(`http://127.0.0.1:${backendPort}/health`, async (response) => (await response.json()).status === "ok");
  console.log(`Backend healthcheck passed on port ${backendPort}.`);
  await waitFor(`http://127.0.0.1:${frontendPort}/`, async () => true);
  console.log(`Development launcher smoke passed on backend ${backendPort} and frontend ${frontendPort}.`);
  completed = true;
  await exited;
} finally {
  if (!completed) child.kill("SIGTERM");
}
