import assert from "node:assert/strict";
import test from "node:test";
import { delimiter, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { backendLaunchOptions, startBackend } from "./start-backend.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

test("backend launcher resolves compiled output and adds it to NODE_PATH", () => {
  const options = backendLaunchOptions({ rootDir: repositoryRoot, env: { NODE_PATH: "existing-path" } });
  assert.equal(options.cwd, repositoryRoot);
  assert.equal(options.entryPoint, resolve(repositoryRoot, "apps/backend/dist/apps/backend/src/main.js"));
  assert.equal(options.env.NODE_PATH, `${resolve(repositoryRoot, "apps/backend/dist")}${delimiter}existing-path`);
});

test("backend launcher gives a useful error before a build", () => {
  const missingRoot = resolve(repositoryRoot, "does-not-exist");
  assert.throws(() => startBackend(backendLaunchOptions({ rootDir: missingRoot, env: {} })), /npm run build/);
});

test("explicit launcher environment wins over values loaded from the root template", () => {
  const options = backendLaunchOptions({ rootDir: repositoryRoot, env: { RUNTIME_PROFILE: "DEMO" } });
  assert.equal(options.env.RUNTIME_PROFILE, "DEMO");
});
