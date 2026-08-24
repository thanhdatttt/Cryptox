# Cryptox Project Guide

Cryptox is a crypto strategy platform. It is a TypeScript monorepo with a
backend, a backtest worker, and a React frontend.

## Quick start

Install dependencies:

```bash
npm install
```

Run the checks:

```bash
npm run build
npm test
npm run lint
npm run arch:check
```

Start the local services:

```bash
docker compose -f infra/docker-compose.yml up --build
```

The backend health check is available at `http://localhost:3000/health`.

## Running applications

Run the backend:

```bash
npm run build --workspace @cryptox/backend
npm run start --workspace @cryptox/backend
```

The backend runs on `http://localhost:3000`.

Run the backtest worker:

```bash
npm run build --workspace @cryptox/backtest-worker
npm run start --workspace @cryptox/backtest-worker
```

The worker prints `worker skeleton ready` when it starts.

Run the frontend:

```bash
npm run dev --workspace @cryptox/frontend
```

The frontend runs on `http://localhost:5173`.

## Docker service commands

Start all services in the background:

```bash
docker compose -f infra/docker-compose.yml up --build -d
```

Check service status:

```bash
docker compose -f infra/docker-compose.yml ps
```

View logs:

```bash
docker compose -f infra/docker-compose.yml logs -f
```

Stop services without deleting data:

```bash
docker compose -f infra/docker-compose.yml stop
```

Start stopped services again:

```bash
docker compose -f infra/docker-compose.yml start
```

Stop and remove containers and the network:

```bash
docker compose -f infra/docker-compose.yml down
```

To also delete the PostgreSQL volume and all local database data:

```bash
docker compose -f infra/docker-compose.yml down -v
```

## Project folders

- `modules/` — business modules and their public APIs
- `apps/backend/` — backend composition and HTTP server
- `apps/backtest-worker/` — worker composition for backtesting
- `apps/frontend/` — React/Vite user interface
- `packages/contracts/` — shared REST, WebSocket, and queue contracts
- `infra/` — Docker and database migration setup
- `docs/` — architecture and design documentation
- `openspec/` — feature specifications and change proposals

## Important rules

1. Keep business logic inside the correct module.
2. Other modules may import a module's `api` or `api/bootstrap` only.
3. Do not import another module's `domain` or `infrastructure` directly.
4. Keep domain code free from frameworks, databases, queues, HTTP, and UI code.
5. Strategies must remain pure and must not call external services.
6. Do not add real business behavior until the skeleton is approved.

## Adding a feature

1. Read the related files in `docs/design/` and `openspec/specs/`.
2. Create or update an OpenSpec change.
3. Implement the feature inside the owning module.
4. Add tests.
5. Run build, tests, lint, and `arch:check` before submitting the change.

## Useful references

- `docs/design/architecture.md`
- `docs/design/project-structure.md`
- `docs/design/component-contracts.md`
- `docs/design/architecture-conventions.md`
- `openspec/config.yaml`
