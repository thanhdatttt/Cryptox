The infrastructure layer contains replaceable News provider adapters and the
PostgreSQL repository. Provider-specific payloads are mapped to the normalized
News application port before they leave this layer; Sentiment persistence stays
owned by the Sentiment module. News deduplicates on the stable
`(providerId, providerItemId)` pair and reads in the frozen publication/provider/
provider-item order. CoinDesk HTTP and response-body work is bounded by its
configured request timeout; unavailable live access is a provider failure, not
a fixture fallback.
