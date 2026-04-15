import { describe, expect, it } from "vitest";
import { parseMarket } from "../services/market-parser/src/index.js";
import type { RawMarket } from "../packages/types/src/index.js";

describe("market parser", () => {
  it("extracts city, station, unit and confidence", () => {
    const raw: RawMarket = {
      externalId: "m1",
      title: "NYC High Temperature",
      description: "Temperature market for New York City.",
      rules: "Resolves by NOAA station KNYC daily high in Celsius.",
      bucketLabels: ["<=15C", "16-20C"],
      marketDate: new Date().toISOString(),
      liquidityUsd: 10000,
      spreadBps: 100,
      bucketPrices: { "<=15C": 0.4, "16-20C": 0.6 }
    };
    const parsed = parseMarket(raw);
    expect(parsed.city).toBe("NYC");
    expect(parsed.station).toBe("KNYC");
    expect(parsed.unit).toBe("C");
    expect(parsed.parsingConfidence).toBeGreaterThan(0.8);
  });
});
