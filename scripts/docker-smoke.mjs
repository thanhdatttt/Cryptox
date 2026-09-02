import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const composeFile = resolve(repositoryRoot, "infra", "docker-compose.yml");

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

async function allocatePorts(count) {
  const servers = await Promise.all(Array.from({ length: count }, () => new Promise((resolveServer, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  })));
  const ports = servers.map((server) => {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Unable to allocate a Docker smoke-test port.");
    return address.port;
  });
  await Promise.all(servers.map((server) => new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))));
  return ports;
}

function positivePort(value, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) throw new Error(`Invalid Docker smoke-test port: ${value}`);
  return parsed;
}

function projectName(value) {
  const name = value || `cryptox-smoke-${process.pid}`;
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) throw new Error(`Invalid Docker Compose project name: ${name}`);
  return name;
}

function compose(project, environment, args, capture = false) {
  const result = spawnSync("docker", ["compose", "-f", composeFile, "--project-name", project, ...args], {
    cwd: repositoryRoot,
    env: environment,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = capture ? `\n${result.stdout ?? ""}${result.stderr ?? ""}` : "";
    throw new Error(`docker compose ${args.join(" ")} failed with exit code ${result.status}.${details}`);
  }
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function requireDocker(environment) {
  const result = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    cwd: repositoryRoot,
    env: environment,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.error?.code === "ENOENT") throw new Error("Docker is not installed or is not available on PATH.");
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new Error(`Docker Engine is not available. Start Docker Desktop or the Docker daemon, then rerun npm run docker:smoke.${details ? `\n${details}` : ""}`);
  }
}

async function waitFor(url, validate, attempts = 40) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok && await validate(response)) return;
      lastError = new Error(`Unexpected response from ${url}: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(500);
  }
  throw lastError ?? new Error(`${url} did not become ready.`);
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${url} returned ${response.status}: ${text}`);
  return body;
}

async function verifyApplication(backendUrl, frontendUrl) {
  await waitFor(`${backendUrl}/health`, async (response) => (await response.json()).status === "ok");
  await waitFor(`${frontendUrl}/`, async (response) => (await response.text()).includes("id=\"root\""));

  const email = `docker-smoke-${Date.now()}@example.test`;
  const password = "docker-smoke-password";
  await jsonRequest(`${backendUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = await jsonRequest(`${backendUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!login || typeof login.token !== "string" || login.token.length === 0) throw new Error("Docker smoke login did not return a JWT.");
  const headers = { authorization: `Bearer ${login.token}` };
  const identity = await jsonRequest(`${backendUrl}/auth/me`, { headers });
  if (!identity || typeof identity.userId !== "string") throw new Error("Docker smoke identity response is invalid.");
  const capabilities = await jsonRequest(`${backendUrl}/market/pairs`, { headers });
  if (!capabilities || capabilities.provider !== "BINANCE" || !Array.isArray(capabilities.pairs) || capabilities.pairs.length === 0) throw new Error("Docker smoke market capabilities are invalid.");
  return email;
}

function verifyMigrations(project, environment) {
  const migrationCount = compose(project, environment, ["exec", "-T", "postgres", "psql", "-U", "cryptox", "-d", "cryptox", "-tAc", "SELECT count(*) FROM pgmigrations;"], true).trim();
  if (migrationCount !== "20") throw new Error(`Expected 20 applied migrations, received: ${migrationCount || "empty output"}`);
  const latestMigration = compose(project, environment, ["exec", "-T", "postgres", "psql", "-U", "cryptox", "-d", "cryptox", "-tAc", "SELECT name FROM pgmigrations WHERE name = '020_create_news_extraction_templates';"], true).trim();
  if (latestMigration !== "020_create_news_extraction_templates") throw new Error("Migration 020_create_news_extraction_templates was not applied.");
}

export async function runDockerSmoke(inputEnvironment = process.env) {
  requireDocker(inputEnvironment);
  const [allocatedPostgres, allocatedRedis, allocatedBackend, allocatedFrontend] = await allocatePorts(4);
  const ports = {
    postgres: positivePort(inputEnvironment.DOCKER_SMOKE_POSTGRES_PORT, allocatedPostgres),
    redis: positivePort(inputEnvironment.DOCKER_SMOKE_REDIS_PORT, allocatedRedis),
    backend: positivePort(inputEnvironment.DOCKER_SMOKE_BACKEND_PORT, allocatedBackend),
    frontend: positivePort(inputEnvironment.DOCKER_SMOKE_FRONTEND_PORT, allocatedFrontend),
  };
  const project = projectName(inputEnvironment.DOCKER_SMOKE_PROJECT_NAME);
  const backendUrl = `http://127.0.0.1:${ports.backend}`;
  const frontendUrl = `http://127.0.0.1:${ports.frontend}`;
  const environment = {
    ...inputEnvironment,
    COMPOSE_PROGRESS: inputEnvironment.COMPOSE_PROGRESS ?? "plain",
    POSTGRES_PORT: String(ports.postgres),
    REDIS_PORT: String(ports.redis),
    BACKEND_PORT: String(ports.backend),
    FRONTEND_PORT: String(ports.frontend),
    VITE_BACKEND_URL: backendUrl,
    RUNTIME_PROFILE: "DEVELOPMENT",
    JWT_SECRET: "cryptox-docker-smoke-jwt-secret-not-for-production",
    MARKET_DATA_PROVIDER: "BINANCE",
    NEWS_PROVIDER: "COINDESK_RSS",
    STRATEGY_MODEL_ENDPOINT: "http://model.invalid/v1/chat/completions",
    STRATEGY_MODEL_NAME: "docker-smoke-model",
    STRATEGY_MODEL_VERSION: "docker-smoke-v1",
    STRATEGY_LLM_API_KEY: "docker-smoke-key-not-for-production",
  };
  let succeeded = false;
  try {
    console.log(`Starting isolated Docker smoke stack ${project}.`);
    compose(project, environment, ["up", "--build", "--detach", "--wait", "--wait-timeout", "240"]);
    await verifyApplication(backendUrl, frontendUrl);
    verifyMigrations(project, environment);
    const database = compose(project, environment, ["exec", "-T", "postgres", "psql", "-U", "cryptox", "-d", "cryptox", "-tAc", "SELECT to_regclass('public.users');"], true).trim();
    if (database !== "users") throw new Error(`Expected migrated users table, received: ${database || "empty output"}`);
    const redis = compose(project, environment, ["exec", "-T", "redis", "redis-cli", "ping"], true).trim();
    if (redis !== "PONG") throw new Error(`Expected Redis PONG, received: ${redis || "empty output"}`);
    const workerLogs = compose(project, environment, ["logs", "--no-color", "backtest-worker"], true);
    if (!workerLogs.includes("backtest worker ready")) throw new Error("Backtest worker did not report queue readiness.");
    succeeded = true;
    console.log(`Docker smoke passed: ${backendUrl}, ${frontendUrl}, PostgreSQL, Redis, migrations, and worker readiness.`);
  } finally {
    if (!succeeded) {
      try { console.error(compose(project, environment, ["logs", "--no-color", "--tail", "200"], true)); } catch (error) { console.error(error instanceof Error ? error.message : error); }
    }
    if (inputEnvironment.DOCKER_SMOKE_KEEP === "1") console.log(`Keeping Docker smoke stack ${project} because DOCKER_SMOKE_KEEP=1.`);
    else {
      try {
        compose(project, environment, ["down", "--volumes", "--remove-orphans"]);
        const remaining = compose(project, environment, ["ps", "-aq"], true).trim();
        if (remaining) throw new Error(`Docker smoke cleanup left containers behind: ${remaining}`);
      } catch (error) { console.error(error instanceof Error ? error.message : error); }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runDockerSmoke().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
