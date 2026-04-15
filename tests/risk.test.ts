import { describe, expect, it } from "vitest";
import { passesRiskFilters } from "../services/risk/src/index.js";
import type { ParsedMarket } from "../packages/types/src/index.js";

describe("risk filters", () => {
  it("returns ok for healthy market", () => {
    const market: ParsedMarket = {
      externalId: "m1",
      title: "title",
      description: "desc",
      rules: "rules",
      city: "NYC",
      station: "KNYC",
      unit: "C",
      marketDate: new Date().toISOString(),
      bucketStructure: ["<=15C", "16-20C"],
      resolutionSource: "NOAA",
      parsingConfidence: 0.9,
      liquidityUsd: 15000,
      spreadBps: 120,
      bucketPrices: { "<=15C": 0.4, "16-20C": 0.6 }
    };
    const result = passesRiskFilters(market, {
      minLiquidityUsd: 5000,
      maxSpreadBps: 250
    });
    expect(result.ok).toBe(true);
  });
});
