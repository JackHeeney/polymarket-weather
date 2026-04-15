import { describe, expect, it } from "vitest";
import { makeDecision } from "../services/signal-engine/src/index.js";
import type { ParsedMarket, WeatherSnapshot } from "../packages/types/src/index.js";

describe("signal engine", () => {
  it("produces ranked bucket estimates and recommendation", () => {
    const market: ParsedMarket = {
      externalId: "m1",
      title: "title",
      description: "desc",
      rules: "NOAA station KNYC in Celsius",
      city: "NYC",
      station: "KNYC",
      unit: "C",
      marketDate: new Date().toISOString(),
      bucketStructure: ["<=15C", "16-20C", "21-25C"],
      resolutionSource: "NOAA",
      parsingConfidence: 0.9,
      liquidityUsd: 12000,
      spreadBps: 120,
      bucketPrices: { "<=15C": 0.2, "16-20C": 0.5, "21-25C": 0.3 }
    };
    const snapshot: WeatherSnapshot = {
      marketExternalId: "m1",
      city: "NYC",
      station: "KNYC",
      unit: "C",
      targetDate: new Date().toISOString(),
      currentForecast: 22,
      hourlyForecast: [19, 20, 21, 22],
      uncertaintyNotes: [],
      sourceListUsed: ["mock"]
    };
    const decision = makeDecision(market, snapshot, 0.01);
    expect(decision.estimatedProbabilityPerBucket.length).toBe(3);
    expect(decision.bestValueOpportunity).toBeTruthy();
  });
});
