import type { BucketEstimate, DecisionResult, ParsedMarket, WeatherSnapshot } from "../../../packages/types/src/index.js";

const parseBucketMidpoint = (bucket: string): number => {
  const clean = bucket.replace("C", "").replace(">=", "").replace("<=", "").trim();
  if (clean.includes("-")) {
    const [low, high] = clean.split("-").map((part) => Number(part));
    return (low + high) / 2;
  }
  return Number(clean);
};

const estimateProbabilities = (parsedMarket: ParsedMarket, snapshot: WeatherSnapshot): BucketEstimate[] => {
  const current = snapshot.currentForecast;
  const unnormalised = parsedMarket.bucketStructure.map((bucket) => {
    const midpoint = parseBucketMidpoint(bucket);
    const distance = Math.abs(midpoint - current);
    const score = 1 / (1 + distance);
    return { bucket, score };
  });
  const total = unnormalised.reduce((acc, item) => acc + item.score, 0);

  return unnormalised.map((item) => {
    const estimatedProbability = total > 0 ? item.score / total : 0;
    const marketProbability = parsedMarket.bucketPrices[item.bucket] ?? 0;
    return {
      bucket: item.bucket,
      estimatedProbability,
      marketProbability,
      edge: estimatedProbability - marketProbability
    };
  });
};

export const makeDecision = (
  parsedMarket: ParsedMarket,
  snapshot: WeatherSnapshot,
  minEdge = 0.05
): DecisionResult => {
  const estimates = estimateProbabilities(parsedMarket, snapshot).sort((a, b) => b.edge - a.edge);
  const best = estimates[0] ?? null;

  if (!best || best.edge < minEdge || parsedMarket.liquidityUsd < 5000) {
    return {
      marketExternalId: parsedMarket.externalId,
      estimatedProbabilityPerBucket: estimates,
      bestValueOpportunity: best,
      recommendation: "PASS",
      confidence: parsedMarket.parsingConfidence * 0.7,
      reason: "No-trade: weak edge or insufficient liquidity.",
      riskNotes: [
        `Liquidity ${parsedMarket.liquidityUsd} may be too low.`,
        `Best edge ${best ? best.edge.toFixed(3) : "n/a"} below threshold ${minEdge}.`
      ]
    };
  }

  return {
    marketExternalId: parsedMarket.externalId,
    estimatedProbabilityPerBucket: estimates,
    bestValueOpportunity: best,
    recommendation: "BUY",
    confidence: parsedMarket.parsingConfidence * 0.85,
    reason: "Deterministic edge exceeds threshold with adequate liquidity.",
    riskNotes: [`Spread is ${parsedMarket.spreadBps} bps.`]
  };
};
