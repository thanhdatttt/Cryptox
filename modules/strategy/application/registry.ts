import type { StrategyFactoryPort } from "./ports";
import { bollingerBandsFactory } from "../domain/plugins/bollinger-bands";
import { movingAverageFactory } from "../domain/plugins/moving-average";
import { rsiFactory } from "../domain/plugins/rsi";
import { smcLiteFactory } from "../domain/plugins/smc-lite";
import { supportResistanceFactory } from "../domain/plugins/support-resistance";
import { wyckoffLiteFactory } from "../domain/plugins/wyckoff-lite";

/**
 * The Strategy-owned factory set used by public composition roots.
 *
 * Keep this collection ordered: the four baseline registrations are followed
 * by the approved deterministic Lite profiles. The factories themselves stay
 * in their domain plugin modules; this file only composes their public seams.
 */
export const strategyFactoryCollection: readonly StrategyFactoryPort[] = Object.freeze([
  movingAverageFactory,
  rsiFactory,
  bollingerBandsFactory,
  supportResistanceFactory,
  smcLiteFactory,
  wyckoffLiteFactory,
]);
