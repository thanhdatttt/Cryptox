# Instructor functional-amendment evidence — 2026-08-29

This directory preserves the five supplied screenshots that accompanied the later
Instructor functional amendment. They are durable source evidence for the
functional delta that was re-baselined in commit
`496d5a34b76841b9f5b142fa512225f502f5fa26` and approved in `DEC-007`.

## Interpretation boundary

The screenshots communicate functional capabilities only. They do **not** require
their visual layout, colours, copy, navigation, component arrangement, or
pixel-perfect frontend reproduction. Do not infer a new functional requirement
from presentation detail alone.

The screenshots are evidence, not a second operational task board. The current
authority for implementation remains the protected assignment together with
explicit later Instructor changes, then the reviewed requirements, accepted ADR
amendments, approved architecture/specifications, current Instructor signal, and
the task control plane. A function absent from the original assignment must not be
discarded merely for that reason when it is explicitly approved by the later
amendment; conversely, the screenshots cannot silently override a higher-authority
constraint or expand the bounded profiles recorded in DEC-007.

## Files and SHA-256

| Evidence file | Functional theme | SHA-256 |
| --- | --- | --- |
| `01-realtime-market.jpg` | Realtime multi-timeframe market data and observability | `375EF976560E581F1C15B3180193AE7DBA24AEB295B228D5D530411C8FC4D94E` |
| `02-strategy-authoring.jpg` | Controlled prompt/URL strategy authoring and approval | `2A8774B435C8366F848BDF018047827198B9742AB82AF4F33243DB619D39DC91` |
| `03-news-extraction.jpg` | News ingestion, extraction templates, refinement, and sentiment boundary | `DD549B498CE4AA4063E3B5E5837C5C29FF543F7E34D8CC0316E936296C37F2AA` |
| `04-backtesting.jpg` | Synthetic directional paper backtesting and reproducibility | `6DF54E52CE53235AD71D37D8509F9C4A6060DCF511B01BB6AAA40A0570B11B13` |
| `05-strategy-discovery.jpg` | Composite strategies, deterministic Lite plugins, and discovery | `6FDAF0BF31EA9F709F15B083F1544C2282C1E3DFB8EA62319034D8DFCA6630D3` |

## Re-baselined authority

Read these artifacts alongside [requirements.md](../../requirements.md),
[DEC-007](../../control/DECISIONS.md#dec-007--controlled-academic-functional-extension-profiles),
the accepted ADR amendments, and the active `mvp-implementation` specifications.
Those canonical documents define the approved bounded behavior, acceptance, and
deferred scope; this directory supplies traceable visual source evidence only.
