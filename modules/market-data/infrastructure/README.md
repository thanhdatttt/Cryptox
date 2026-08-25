This layer contains normalized exchange adapters and PostgreSQL repositories
for mutable candles plus sealed historical dataset snapshots. Exchange access
remains explicit; persistence never fabricates missing provider data.

The active production/local-live provider is selected by `MARKET_DATA_PROVIDER=BINANCE`.
The Binance adapter uses public Spot defaults `https://api.binance.com` for REST
klines and `wss://stream.binance.com:9443` for combined trade/kline streams.
Override them with the backend-only variables `MARKET_DATA_BINANCE_REST_URL` and
`MARKET_DATA_BINANCE_WS_URL`. No Binance API key or secret is used.

Persisted candles are tagged `BINANCE:HISTORICAL_SYNC` or
`BINANCE:REALTIME_STREAM`; deterministic seed rows use a separate `DEV_SEED:*`
provenance and are available only through the explicit demo Compose profile.
