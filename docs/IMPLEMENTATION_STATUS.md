# Implementation Status

## Current state

- Branch: `implement`
- Project status: **Reopened — prior completion claim withdrawn on 2026-08-24**
- Current feature: None — stopped after feature 1 as requested
- Next feature: **2. Implement durable backtest execution and public API**

## Audit summary

The previous final-validation claim did not establish the assignment-required product flow. Targeted source inspection found public Backtesting, Search, and Leaderboard APIs that throw `NOT_IMPLEMENTED`; a skeleton backtest worker and queue adapter; only partial PostgreSQL durability; no backend HTTP route chain for backtest/evaluate/leaderboard/search; and a frontend explicitly presenting hard-coded demo data. See `docs/IMPLEMENTATION_PLAN.md` for evidence and the ordered remediation plan.

## Completed historical milestones (not evidence of full completion)

| Commit | Historical milestone | Current assessment |
| --- | --- | --- |
| `97bd4f6` | Strategy plugin runtime | Reusable domain implementation exists; not yet connected to a complete product flow. |
| `cd091a6`, `37fd18b` | Market-data contracts and optional Binance adapter | Partial: no durable/live end-to-end composed flow. |
| `0d8f1f8`, `9d9645e` | Evaluation and simulator | Domain logic exists; public durable worker path is incomplete. |
| `8f8364c`, `06b93e5` | Leaderboard and Search runtimes | Internal test runtimes exist; required public APIs are `NOT_IMPLEMENTED`. |
| `502e7e2` | News/Sentiment runtime | Boundary logic exists; concrete durable collection pipeline remains incomplete. |
| `da4ca1c`, `3e5d913`, `36bee80` | Auth, user persistence, initial facade routes | Partial: routes do not expose backtest/search/leaderboard flow. |
| `126e718` | Reference-screen frontend | Demo-only local presentation; must be replaced with live API flows. |
| `40f7e59`, `4e8d686` | Strategy authoring and library persistence | PostgreSQL strategy library exists; is an input to, not completion of, the pipeline. |
| `d9e9eaa` | Previous completion documentation | Superseded by this honest reopened status. |
| `2070778` | Cross-platform npm developer workflow | Completed: npm lockfile/workspace workflow, root development/start scripts, Node-based backend launcher, and focused smoke checks. |

## Latest validation

- `npm install`: passed from the repository root with npm 11.17.0; removed the obsolete `cross-env` dependency chain and refreshed the committed npm lockfile. npm reported its informational allow-scripts warning, but installation, compilation, and Vite all completed successfully.
- `npm run test:workflow`: passed — 2 Node launcher tests validate compiled-entry resolution, platform-delimited `NODE_PATH`, and the pre-build error.
- `npm run smoke:backend`: passed — compiled backend launched through the Node-based launcher and returned `GET /health` with `{ "status": "ok" }` on an isolated port.
- `npm run smoke:dev`: passed — the root development launcher built the backend, served its health endpoint, served the Vite frontend on an isolated port, and stopped both processes cleanly.
- `npm test`: passed — all workspace tests completed successfully (including the existing placeholder-oriented tests, which do not satisfy the reopened product requirements).
- `npm run build`: passed — all workspaces compiled and the frontend production bundle was generated.
- `npm run lint`: passed — all workspace TypeScript no-emit checks completed successfully.
- `npm run arch:check`: passed — dependency-cruiser reported no violations across 470 modules and 551 dependencies.
- Docker-backed validation is intentionally not run for this local-workflow feature; it remains a required final integration gate in feature 6.

## Current decisions and assumptions

- The PDF is authoritative; the Markdown companion and supplied images guide searchable details and visual acceptance respectively.
- npm is the supported developer package manager because the root declares npm workspaces and the user explicitly requires `npm install` from the repository root. `package-lock.json` is the committed lockfile.
- `ts-node` is not declared and will not be relied on. Shell-specific environment assignment is not an acceptable backend start mechanism.
- The root `npm run dev` script builds the backend once, starts it through a Node-based launcher, and starts the frontend’s declared Vite workspace dependency. Backend TypeScript changes require restarting that command; Vite continues to provide frontend development serving.
- The backend launcher sets `NODE_PATH` programmatically for its compiled child process using the operating system’s path delimiter. This keeps module-alias resolution portable across Windows, macOS, and Linux without relying on shell syntax.
- Existing code/tests that assert `NOT_IMPLEMENTED` are treated as placeholders to replace when their required feature is implemented, not as completion evidence.
- The repository’s OpenSpec apply skill was consulted, but the `openspec` CLI is not installed in this checkout. The durable plan/status documents remain the continuation record until that tooling is available.

## Unresolved decisions and blockers

- No product-scope blocker is known. The remaining work requires design/implementation of durable candidate/search/leaderboard records and a concrete worker/queue integration.
- Docker-backed validation has not yet been performed successfully for the actual assignment flow and remains a final required gate.
- The local Codex runtime exposes Node but not `npm` on `PATH`; a system npm executable was located at `C:\Program Files\nodejs\npm.cmd` for validation. The repository commands themselves must remain normal `npm ...` commands for developers.
