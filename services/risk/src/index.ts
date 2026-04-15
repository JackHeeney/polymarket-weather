import type { ParsedMarket } from "../../../packages/types/src/index.js";

export interface DeterministicRiskConfig {
  minLiquidityUsd: number;
  maxSpreadBps: number;
}

export const passesRiskFilters = (
  market: ParsedMarket,
  config: DeterministicRiskConfig
): { ok: boolean; reason: string } => {
  if (market.liquidityUsd < config.minLiquidityUsd) {
    return { ok: false, reason: "Liquidity below threshold." };
  }
  if (market.spreadBps > config.maxSpreadBps) {
    return { ok: false, reason: "Spread above threshold." };
  }
  return { ok: true, reason: "Risk checks passed." };
};
