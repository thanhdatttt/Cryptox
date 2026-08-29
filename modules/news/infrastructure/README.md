This layer contains replaceable normalized News providers and PostgreSQL
persistence. The default provider fetches CoinDesk's official RSS feed and
unsupported configured providers fail explicitly.

The crawler provider accepts one or more public HTTP(S) page URLs and a
tool-free `HtmlNewsInterpreter`. It bounds redirects, response bytes, and
interpretation time, removes active/unsafe HTML while retaining semantic tags,
and validates schema-constrained candidates before returning canonical
`NewsItem` values. Provider, fetch, model, schema, and validation failures are
reported through `NewsObservability` without exposing HTML or model output.
