# Wyckoff Lite V1 profile

`WYCKOFF_LITE_V1` is a bounded, deterministic Strategy plugin. It is an
explicitly limited heuristic, not a full discretionary or professional Wyckoff
implementation.

For each candidate latest closed candle, the plugin builds a fixed prior range
from `rangeWindow` candles and a fixed prior volume baseline from
`volumeWindow` candles. Both windows exclude the current candle. The current
candle confirms a breakout when its close is strictly outside the configured
percentage threshold beyond the prior range and its volume is at least the
configured multiplier of the prior average. An upward breakout is BUY and a
downward breakout is SELL.

If there is no breakout, a compressed current candle whose close is strictly in
the lower half of the prior range and whose volume meets the same baseline is
classified as accumulation (BUY). The symmetric upper-half case is distribution
(SELL). Equality at the range midpoint, no volume confirmation, a flat prior
range, and all other cases are HOLD. Breakout is checked before accumulation or
distribution, so the phase remains distinguishable in the phase-code overlay:
`1` accumulation, `-1` distribution, `2` upward breakout, `-2` downward
breakout, and `0` HOLD.

Insufficient history returns HOLD with no fabricated/padded values. Parameters
and context are validated before execution; malformed, non-finite, non-closed,
out-of-order, or inconsistent OHLCV input is rejected. The plugin is pure,
deterministic, closed-candle-only, and leaves input arrays/candles unchanged.

This profile does not infer springs, upthrusts, composite operator intent,
multi-phase accumulation/distribution schematics, volume-spread analysis, or
execution/risk management.
