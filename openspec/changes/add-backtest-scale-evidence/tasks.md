## 1. Timing projection

- [x] 1.1 Inspect attempt timestamp contracts and implement completed-attempt duration aggregation without changing lifecycle semantics.
- [x] 1.2 Add focused Backtesting/Search tests for valid duration, empty samples, and exclusion of failed or incomplete attempts.

## 2. Concurrency correctness

- [x] 2.1 Extend Search lifecycle tests to assert bounded queued-plus-running submission and refill after terminal completion.
- [x] 2.2 Add a real-queue integration harness/test for two worker consumers, retry behavior, and no duplicate Experiment creation.
- [x] 2.3 Fail a Search Run explicitly when its bounded generation budget cannot produce a new fingerprint.

## 3. Reproducible benchmark

- [x] 3.1 Add a benchmark command that runs real sealed-scope candidates and writes a validated JSON result without committing generated runs by default.
- [ ] 3.2 Add a documented result schema and execute the 100/500-candidate matrix for `W=1,C=1` and `W=2,C=1`, repeating each run three times.

## 4. Evidence documentation

- [x] 4.1 Update README, architecture, and ADR-003 with the capacity model, reproducible commands, and measured-result boundaries.
- [ ] 4.2 Add reviewed benchmark evidence and update the demonstration checklist only after every validation gate passes.

## 5. Validation

- [ ] 5.1 Run focused tests, architecture checks, benchmark validation, and an isolated Docker multi-worker demonstration; record PASS/UNVERIFIED separately.
