import type { ParsedMarket, RawMarket } from "../../../packages/types/src/index.js";

const detectUnit = (text: string): "C" | "F" => (text.toLowerCase().includes("celsius") || text.includes("C")) ? "C" : "F";

const parseCity = (title: string, description: string): string => {
  const content = `${title} ${description}`;
  if (content.includes("NYC") || content.includes("New York")) {
    return "NYC";
  }
  return "UNKNOWN";
};

const parseStation = (rules: string): string => {
  const match = rules.match(/station\s+([A-Z0-9]+)/i);
  return match ? match[1].toUpperCase() : "UNKNOWN";
};

const parseResolutionSource = (rules: string): string => {
  if (rules.toLowerCase().includes("noaa")) {
    return "NOAA";
  }
  return "UNSPECIFIED";
};

export const parseMarket = (raw: RawMarket): ParsedMarket => {
  const city = parseCity(raw.title, raw.description);
  const station = parseStation(raw.rules);
  const unit = detectUnit(`${raw.title} ${raw.description} ${raw.rules}`);
  const resolutionSource = parseResolutionSource(raw.rules);
  const parsingConfidence =
    city === "UNKNOWN" || station === "UNKNOWN" || resolutionSource === "UNSPECIFIED" ? 0.55 : 0.9;

  return {
    externalId: raw.externalId,
    title: raw.title,
    description: raw.description,
    rules: raw.rules,
    city,
    station,
    unit,
    marketDate: raw.marketDate,
    bucketStructure: raw.bucketLabels,
    resolutionSource,
    parsingConfidence,
    liquidityUsd: raw.liquidityUsd,
    spreadBps: raw.spreadBps,
    bucketPrices: raw.bucketPrices
  };
};

export const parseMarkets = (rawMarkets: RawMarket[]): ParsedMarket[] => rawMarkets.map(parseMarket);
