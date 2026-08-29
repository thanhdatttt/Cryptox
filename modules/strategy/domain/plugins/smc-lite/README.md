# SMC Lite V1 profile

`SMC_LITE_V1` is a bounded, deterministic Strategy plugin. It is intentionally
not a full discretionary or professional SMC implementation.

The plugin uses strict confirmed pivots. A pivot high is a candle whose high is
strictly greater than the highs of the configured `leftWindow` and
`rightWindow` neighboring closed candles. A pivot low is the corresponding
strictly lower low rule. A pivot is not usable until every right-side candle
exists, so the current candle can never be treated as a newly confirmed pivot.

For the latest closed candle, the latest confirmed swing high and low are the
only structure levels considered. BUY is emitted only when the latest close
crosses above the latest confirmed swing high from at-or-below that level. SELL
is emitted only when the latest close crosses below the latest confirmed swing
low from at-or-above that level. Missing structure, equality, an unconfirmed
pivot, or no close cross emits HOLD. The signal is based on close, not an
intracandle wick.

Inputs must contain ordered, valid, closed finite OHLCV candles. Invalid
parameters or context fail before analysis; insufficient history returns HOLD
without inventing padded candles or future pivots. The result includes finite
confirmed-pivot and BOS visualization points and does not mutate the input.

This profile does not model order blocks, liquidity, market-maker intent,
inducement, multi-timeframe structure, discretionary phase interpretation, or
execution/risk management.
