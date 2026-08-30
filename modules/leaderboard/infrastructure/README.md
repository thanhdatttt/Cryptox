# Leaderboard persistence boundary

The PostgreSQL adapter owns only shared ranking-configuration rows and the
user-owned Leaderboard scope/entry rows. Every scope, entry read, entry
mutation, and Experiment lookup carries the trusted authenticated owner
predicate. Duplicate `(scope, experiment)` admission is handled idempotently
against the database uniqueness constraint. Active rows are read before
application-level Top-K reordering; the persisted rank is an ordering hint,
not a provenance snapshot.

Leaderboard does not store, copy, or mutate Experiment, Trade, or Evaluation
data. Admission reads the owner-scoped `RankableExperiment` projection through
`LeaderboardExperimentRepository`; an entry retains the Experiment ID and
ranking-configuration ID so a caller can resolve the authoritative Backtesting
Experiment projection separately.

The frozen public projection exposes extension provenance only through its
approved `extensionProvenance` fields (`searchProfileId`,
`paperExecutionProfileId`, and `newsExtractionTemplateVersion`). The wider
strategy/composite version, seeded Search configuration, dataset/code details,
and complete paper decimal profile remain owned by Backtesting/Search and are
not duplicated in Leaderboard storage. Consequently, the adapter provides
traceable references and read-through validation, not an independent persisted
provenance snapshot or an exact-replay guarantee. Eviction uses the existing
schema's owner-scoped delete, so PostgreSQL retains no tombstone for an evicted
Experiment; active duplicate resubmission is idempotent, but the adapter cannot
distinguish a later re-admission of an evicted Experiment without a history
column or table, which are outside this change.
