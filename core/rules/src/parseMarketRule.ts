import type { ParsedMarket } from "../../../packages/types/src/index.js";

export interface ParsedMarketRule {
  station: string;
  unit: "C" | "F";
  timeHint: string | null;
  thresholdHint: number | null;
}

export const parseMarketRule = (market: ParsedMarket): ParsedMarketRule => {
  const thresholdMatch = market.rules.match(/above\s+(\d+(?:\.\d+)?)/i);
  const timeMatch = market.rules.match(/before\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)/i);

  return {
    station: market.station,
    unit: market.unit,
    timeHint: typeof timeMatch?.[1] === "string" ? timeMatch[1] : null,
    thresholdHint: thresholdMatch ? Number(thresholdMatch[1]) : null
  };
};
