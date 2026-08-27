const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const entrypoint = path.join(repositoryRoot, "apps/backend/dist/apps/backend/src/main.js");

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("could not reserve a smoke-test port")));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function waitForLive(baseUrl, exited) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const earlyExit = await Promise.race([
      exited.then((result) => result),
      new Promise((resolve) => setTimeout(() => resolve(undefined), 100)),
    ]);
    if (earlyExit) throw new Error(`backend exited before liveness: ${earlyExit}`);
    try {
      const response = await fetch(`${baseUrl}/live`);
      if (response.status === 200) return;
    } catch {
      // Startup is still in progress.
    }
  }
  throw new Error("backend did not become live within 10 seconds");
}

async function main() {
  const port = await reservePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = "";
  const child = spawn(process.execPath, [entrypoint], {
    cwd: repositoryRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  const exited = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve(`code=${code} signal=${signal}`));
  });

  try {
    await waitForLive(baseUrl, exited);
    const live = await fetch(`${baseUrl}/live`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: "live" });

    const ready = await fetch(`${baseUrl}/ready`);
    assert.equal(ready.status, 503);
    const readiness = await ready.json();
    assert.equal(readiness.status, "not-ready");
    assert.deepEqual(
      readiness.unavailableRequired.map(({ name }) => name),
      ["market-data-provider", "backtest-runner", "persistence-adapters"],
    );

    const obsoleteHealth = await fetch(`${baseUrl}/health`);
    assert.equal(obsoleteHealth.status, 404);
    console.log("Backend smoke passed: /live=200, /ready=503, /health=404.");
  } catch (error) {
    if (output) console.error(output);
    throw error;
  } finally {
    if (child.exitCode === null) child.kill();
    const stopped = await Promise.race([
      exited.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
    ]);
    if (!stopped && child.exitCode === null) {
      child.kill("SIGKILL");
      await exited;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
