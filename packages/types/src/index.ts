export type TradeSide = "YES" | "NO";
export type Recommendation = "BUY" | "PASS" | "REDUCE";

export interface RawMarket {
  externalId: string;
  title: string;
  description: string;
  rules: string;
  bucketLabels: string[];
  marketDate: string;
  liquidityUsd: number;
  spreadBps: number;
  bucketPrices: Record<string, number>;
}

export interface ParsedMarket {
  externalId: string;
  title: string;
  description: string;
  rules: string;
  city: string;
  station: string;
  unit: "C" | "F";
  marketDate: string;
  bucketStructure: string[];
  resolutionSource: string;
  parsingConfidence: number;
  liquidityUsd: number;
  spreadBps: number;
  bucketPrices: Record<string, number>;
}

export interface WeatherSnapshot {
  marketExternalId: string;
  city: string;
  station: string;
  unit: "C" | "F";
  targetDate: string;
  currentForecast: number;
  hourlyForecast: number[];
  uncertaintyNotes: string[];
  sourceListUsed: string[];
}

export interface BucketEstimate {
  bucket: string;
  estimatedProbability: number;
  marketProbability: number;
  edge: number;
}

export interface DecisionResult {
  marketExternalId: string;
  estimatedProbabilityPerBucket: BucketEstimate[];
  bestValueOpportunity: BucketEstimate | null;
  recommendation: Recommendation;
  confidence: number;
  reason: string;
  riskNotes: string[];
}

export interface JournalInput {
  marketExternalId: string;
  predictedBucket: string | null;
  predictedProbability: number | null;
  recommendation: Recommendation;
  manualBetPlaced: boolean;
  manualBetBucket: string | null;
  entryPrice: number | null;
  exitPrice: number | null;
  resolvedBucket: string | null;
  profitLoss: number | null;
  rationale: string;
}
