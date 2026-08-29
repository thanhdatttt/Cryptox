This layer owns adapters for Sentiment persistence. The default `LEXICON_V1`
provider is a deterministic local computation in the application layer; it has
no hosted API, downloaded model, ONNX/Transformers runtime, or LLM dependency.

`LEXICON_V1` policy is intentionally small and reviewable:

- exact normalized word tokens from the title and content are looked up in a
  source-controlled positive/negative vocabulary;
- `not`, `no`, `never`, `without`, `hardly`, and `barely` negate a following
  sentiment token within the previous three tokens, stopping at `.`, `?`, `!`,
  `;`, or `:`;
- intensifiers (`very`, `highly`, `strongly`, `major`, `extremely`, and
  `massive`) multiply that token by a fixed factor, while diminishers
  (`slightly`, `somewhat`, `mildly`, `modestly`, and `limited`) halve it;
- modifiers compose within the same three-token window, and words absent from
  the vocabulary contribute zero;
- the raw sum is normalized as `raw / (1 + abs(raw))`, rounded to six decimal
  places, and mapped by sign to `POSITIVE`, `NEUTRAL`, or `NEGATIVE`.

The PostgreSQL adapter persists successful results with provider, analysis
profile, model name, model version, and analysis timestamp provenance. Invalid
inputs and provider failures are rejected before persistence; missing reads are
represented as `undefined`.
