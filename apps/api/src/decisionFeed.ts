import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Recommendation = "BUY" | "PASS";

interface MarketBucket {
  label: string;
  marketPrice: number;
}

interface MarketSnapshot {
  marketId: string;
  externalId: string;
  slug: string | null;
  question: string;
  closeTime: string | null;
  resolutionTime: string | null;
  snapshotTime: string;
  bucketPrices: MarketBucket[];
  rawPayload: unknown;
}

interface ForecastSnapshot {
  location: string;
  latitude: number;
  longitude: number;
  targetDate: string;
  forecastMaxTempC: number;
  forecastMinTempC: number;
  forecastTimestamp: string;
  sourceName: string;
  rawPayload: unknown;
}

interface DecisionBucket {
  label: string;
  marketPrice: number;
  modelProb: number;
  edge: number;
}

export interface DecisionFeedItem {
  marketId: string;
  marketExternalId: string;
  marketQuestion: string;
  snapshotTime: string;
  buckets: DecisionBucket[];
  bestBucket: string | null;
  confidence: number;
  edgeAtBestBucket: number | null;
  recommendation: Recommendation;
  reason: string;
  entryPriceAtBestBucket: number | null;
}

const MARKET_API_URL = process.env.POLYMARKET_GAMMA_URL ?? "https://gamma-api.polymarket.com/markets";
const WEATHER_API_URL = process.env.WEATHER_API_URL ?? "https://api.open-meteo.com/v1/forecast";
const WEATHER_LOCATION = process.env.WEATHER_LOCATION ?? "New York City";
const WEATHER_LAT = Number(process.env.WEATHER_LAT ?? 40.7128);
const WEATHER_LON = Number(process.env.WEATHER_LON ?? -74.006);
const MIN_BUY_EDGE = Number(process.env.MIN_BUY_EDGE ?? 0.05);
const MAX_DECISIONS = Math.max(1, Number(process.env.MAX_DECISIONS ?? 5));
const POLYMARKET_MARKET_ID = process.env.POLYMARKET_MARKET_ID ?? "";
const POLYMARKET_MARKET_SLUG = process.env.POLYMARKET_MARKET_SLUG ?? "";
const WEATHER_KEYWORD_REGEX = /\b(weather|temperature|precipitation|rain|snow)\b/i;
const TEMPERATURE_PHRASE_REGEX = /\b(high(?:est)?\s+temp(?:erature)?|temp(?:erature)?)\b/i;

const CITY_COORDINATES: Record<string, { location: string; lat: number; lon: number }> = {
  nyc: { location: "New York City", lat: 40.7128, lon: -74.006 },
  seoul: { location: "Seoul", lat: 37.5665, lon: 126.978 },
  tokyo: { location: "Tokyo", lat: 35.6762, lon: 139.6503 },
  shanghai: { location: "Shanghai", lat: 31.2304, lon: 121.4737 },
  singapore: { location: "Singapore", lat: 1.3521, lon: 103.8198 },
  london: { location: "London", lat: 51.5072, lon: -0.1276 },
  wellington: { location: "Wellington", lat: -41.2865, lon: 174.7762 },
  hongkong: { location: "Hong Kong", lat: 22.3193, lon: 114.1694 },
  "hong kong": { location: "Hong Kong", lat: 22.3193, lon: 114.1694 }
};

const normalCdf = (x: number): number => {
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;
  if (x >= 0) {
    const t = 1 / (1 + p * x);
    return 1 - c * Math.exp((-x * x) / 2) * t * ((((b5 * t + b4) * t + b3) * t + b2) * t + b1);
  }
  return 1 - normalCdf(-x);
};

const clampProbability = (value: number): number => Math.max(0, Math.min(1, value));

const parseDateFromQuestion = (question: string): string | null => {
  const match = question.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return match ? match[1] : null;
};

const parseArrayField = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return [];
    }
  }
  return [];
};

const parsePriceArray = (value: unknown): number[] => {
  const parsed = parseArrayField(value);
  return parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item >= 0 && item <= 1);
};

const isYesNoLabel = (label: string): boolean => {
  const lower = label.trim().toLowerCase();
  return lower === "yes" || lower === "no";
};

const parseNumberField = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normaliseMarketBuckets = (outcomes: string[], prices: number[]): MarketBucket[] => {
  const count = Math.min(outcomes.length, prices.length);
  return outcomes.slice(0, count).map((label, index) => ({
    label: label.trim(),
    marketPrice: prices[index]
  }));
};

const isWeatherMarket = (question: string): boolean => {
  return WEATHER_KEYWORD_REGEX.test(question) || TEMPERATURE_PHRASE_REGEX.test(question);
};

const parseTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    if (typeof item === "string") {
      return item.toLowerCase();
    }
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return String(record.label ?? record.name ?? record.slug ?? "").toLowerCase();
    }
    return "";
  }).filter((item) => item.length > 0);
};

const weatherSignalScore = (market: Record<string, unknown>): number => {
  const question = String(market.question ?? market.title ?? "").toLowerCase();
  const slug = String(market.slug ?? "").toLowerCase();
  const category = String(market.category ?? market.groupItemTitle ?? "").toLowerCase();
  const eventSlug = String(market.eventSlug ?? "").toLowerCase();
  const tags = parseTags(market.tags);

  let score = 0;
  if (isWeatherMarket(question)) {
    score += 2;
  }
  if (isWeatherMarket(slug) || isWeatherMarket(eventSlug)) {
    score += 2;
  }
  if (category.includes("weather") || category.includes("temperature") || category.includes("precipitation")) {
    score += 2;
  }
  if (tags.some((tag) => isWeatherMarket(tag) || tag.includes("weather") || tag.includes("temperature"))) {
    score += 1;
  }
  return score;
};

const hasTradableBuckets = (market: Record<string, unknown>): boolean => {
  const outcomes = parseArrayField(market.outcomes);
  const prices = parsePriceArray(market.outcomePrices);
  return outcomes.length > 0 && prices.length > 0 && Math.min(outcomes.length, prices.length) >= 2;
};

const isTemperatureBucketLabel = (label: string): boolean => {
  const text = label.toLowerCase().trim();
  if (/^-?\d+(\.\d+)?\s*(c|f|°c|°f)$/.test(text)) {
    return true;
  }
  if (/^-?\d+(\.\d+)?\s*-\s*-?\d+(\.\d+)?\s*(c|f|°c|°f)?$/.test(text)) {
    return true;
  }
  if (/^-?\d+(\.\d+)?\s*(c|f|°c|°f)?\s*(or higher|or lower)$/.test(text)) {
    return true;
  }
  if (/^(>=|<=)\s*-?\d+(\.\d+)?\s*(c|f|°c|°f)?$/.test(text)) {
    return true;
  }
  return false;
};

const parseThresholdFromQuestion = (
  question: string
): { thresholdC: number; direction: "above" | "below" } | null => {
  const lower = question.toLowerCase();
  const match = lower.match(/(-?\d+(?:\.\d+)?)\s*(°?\s*[cf])?(?:\s*(or higher|or lower|or above|or below))?/i);
  if (!match) {
    return null;
  }

  const rawThreshold = Number(match[1]);
  if (!Number.isFinite(rawThreshold)) {
    return null;
  }
  const unit = match[2]?.replace(/\s+/g, "").toLowerCase() ?? "c";
  const qualifier = match[3] ?? "";
  const direction: "above" | "below" = qualifier.includes("lower") || qualifier.includes("below") ? "below" : "above";
  const thresholdC = unit.includes("f") ? (rawThreshold - 32) * (5 / 9) : rawThreshold;
  return { thresholdC, direction };
};

const isBinaryThresholdQuestionMarket = (market: Record<string, unknown>): boolean => {
  const outcomes = parseArrayField(market.outcomes);
  if (outcomes.length !== 2 || !outcomes.every((outcome) => isYesNoLabel(outcome))) {
    return false;
  }
  const question = String(market.question ?? market.title ?? "");
  return parseThresholdFromQuestion(question) !== null && isWeatherMarket(question);
};

const hasTemperatureStyleOutcomes = (market: Record<string, unknown>): boolean => {
  const outcomes = parseArrayField(market.outcomes);
  if (outcomes.length < 2) {
    return false;
  }
  if (outcomes.every((label) => isYesNoLabel(label))) {
    return isBinaryThresholdQuestionMarket(market);
  }
  return outcomes.some((label) => isTemperatureBucketLabel(label));
};

const isStrictWeatherCandidate = (market: Record<string, unknown>): boolean => (
  hasTradableBuckets(market)
  && weatherSignalScore(market) >= 2
  && hasTemperatureStyleOutcomes(market)
);

const toIsoNow = (): string => new Date().toISOString();

const getMarketLocation = (question: string): { location: string; lat: number; lon: number } => {
  const lowerQuestion = question.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (lowerQuestion.includes(key)) {
      return coords;
    }
  }
  return {
    location: WEATHER_LOCATION,
    lat: WEATHER_LAT,
    lon: WEATHER_LON
  };
};

const parseBucketRangeC = (label: string): { min: number; max: number } | null => {
  const clean = label.replace(/\s+/g, "").toLowerCase();
  const rangeMatch = clean.match(/^(-?\d+(?:\.\d+)?)\-(-?\d+(?:\.\d+)?)(c|°c)?$/);
  if (rangeMatch) {
    return { min: Number(rangeMatch[1]), max: Number(rangeMatch[2]) };
  }
  const leMatch = clean.match(/^<=?(-?\d+(?:\.\d+)?)(c|°c)?$/);
  if (leMatch) {
    return { min: -100, max: Number(leMatch[1]) };
  }
  const geMatch = clean.match(/^>=?(-?\d+(?:\.\d+)?)(c|°c)?$/);
  if (geMatch) {
    return { min: Number(geMatch[1]), max: 100 };
  }
  return null;
};

const modelBucketProbability = (bucket: string, expectedTempC: number, stdDevC = 2.5): number => {
  const range = parseBucketRangeC(bucket);
  if (!range) {
    return 0;
  }
  const zMin = (range.min - expectedTempC) / stdDevC;
  const zMax = (range.max - expectedTempC) / stdDevC;
  return clampProbability(normalCdf(zMax) - normalCdf(zMin));
};

const modelYesProbabilityFromThreshold = (question: string, expectedTempC: number, stdDevC = 2.5): number | null => {
  const threshold = parseThresholdFromQuestion(question);
  if (!threshold) {
    return null;
  }
  const z = (threshold.thresholdC - expectedTempC) / stdDevC;
  if (threshold.direction === "below") {
    return clampProbability(normalCdf(z));
  }
  return clampProbability(1 - normalCdf(z));
};

const normaliseModelProbabilities = (buckets: Array<{ label: string; rawProb: number }>): Record<string, number> => {
  const total = buckets.reduce((sum, bucket) => sum + bucket.rawProb, 0);
  if (total <= 0) {
    const even = buckets.length > 0 ? 1 / buckets.length : 0;
    return Object.fromEntries(buckets.map((bucket) => [bucket.label, even]));
  }
  return Object.fromEntries(buckets.map((bucket) => [bucket.label, bucket.rawProb / total]));
};

const storeRawMarketSnapshot = async (snapshot: MarketSnapshot): Promise<void> => {
  const outputDir = path.resolve(process.cwd(), "data/market-snapshots");
  await mkdir(outputDir, { recursive: true });
  const safeId = snapshot.marketId.replace(/[^a-zA-Z0-9-_]/g, "_");
  const fileName = `${safeId}-${snapshot.snapshotTime.replace(/[:.]/g, "-")}.json`;
  await writeFile(path.join(outputDir, fileName), JSON.stringify(snapshot, null, 2), "utf8");
};

const normaliseMarketSnapshot = async (selected: Record<string, unknown>): Promise<MarketSnapshot> => {
  const question = String(selected.question ?? selected.title ?? "Unknown market");
  const outcomes = parseArrayField(selected.outcomes);
  const prices = parsePriceArray(selected.outcomePrices);
  const bucketPrices = normaliseMarketBuckets(outcomes, prices);
  if (!bucketPrices.length) {
    throw new Error("Weather market did not include priced bucket outcomes.");
  }

  const snapshot: MarketSnapshot = {
    marketId: String(selected.id ?? selected.conditionId ?? question),
    externalId: String(selected.id ?? selected.conditionId ?? question),
    slug: selected.slug ? String(selected.slug) : null,
    question,
    closeTime: selected.closeTime ? String(selected.closeTime) : null,
    resolutionTime: selected.endDate ? String(selected.endDate) : null,
    snapshotTime: toIsoNow(),
    bucketPrices,
    rawPayload: selected
  };
  await storeRawMarketSnapshot(snapshot);
  return snapshot;
};

const fetchMarketSnapshots = async (): Promise<MarketSnapshot[]> => {
  const fetchMarketList = async (query: string): Promise<Record<string, unknown>[]> => {
    const response = await fetch(`${MARKET_API_URL}${query}`);
    if (!response.ok) {
      throw new Error(`Failed market fetch: ${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as Record<string, unknown>[]) : [];
  };
  const fetchEventList = async (query: string): Promise<Record<string, unknown>[]> => {
    const response = await fetch(`https://gamma-api.polymarket.com/events${query}`);
    if (!response.ok) {
      throw new Error(`Failed event fetch: ${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as Record<string, unknown>[]) : [];
  };

  const activeMarkets = await fetchMarketList("?active=true&closed=false&limit=500");
  const fallbackMarkets = await fetchMarketList("?closed=false&limit=500");
  const weatherEvents = await fetchEventList("?closed=false&limit=250");
  const eventMarkets = weatherEvents.flatMap((event) => {
    const eventTitle = String(event.title ?? event.slug ?? event.ticker ?? "");
    const eventTags = parseTags(event.tags);
    const eventLooksWeather =
      isWeatherMarket(eventTitle)
      || eventTags.some((tag) => isWeatherMarket(tag) || tag.includes("weather") || tag.includes("temperature"));
    if (!eventLooksWeather) {
      return [];
    }
    const markets = Array.isArray(event.markets) ? (event.markets as Record<string, unknown>[]) : [];
    return markets.map((market) => ({
      ...market,
      eventTitle
    }));
  });
  const allMarkets = [...eventMarkets, ...activeMarkets, ...fallbackMarkets];

  const forced = allMarkets.find((market) => {
    const id = String(market.id ?? market.conditionId ?? "");
    const slug = String(market.slug ?? "");
    if (POLYMARKET_MARKET_ID && id === POLYMARKET_MARKET_ID) {
      return hasTradableBuckets(market);
    }
    if (POLYMARKET_MARKET_SLUG && slug === POLYMARKET_MARKET_SLUG) {
      return hasTradableBuckets(market);
    }
    return false;
  });

  if (forced) {
    return [await normaliseMarketSnapshot(forced)];
  }

  const rankedCandidates = allMarkets
    .filter(isStrictWeatherCandidate)
    .sort((a, b) => {
      const scoreDiff = weatherSignalScore(b) - weatherSignalScore(a);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      const volumeA = parseNumberField(a.volumeNum ?? a.volume24hr ?? a.liquidityNum);
      const volumeB = parseNumberField(b.volumeNum ?? b.volume24hr ?? b.liquidityNum);
      return volumeB - volumeA;
    })
    .slice(0, MAX_DECISIONS);

  if (!rankedCandidates.length) {
    const sampledQuestions = allMarkets
      .filter((market) => weatherSignalScore(market) > 0)
      .slice(0, 8)
      .map((market) => String(market.question ?? market.title ?? "unknown question"));
    throw new Error(
      `No weather market found in current Gamma response. Active markets scanned: ${activeMarkets.length}. `
      + `Set POLYMARKET_MARKET_ID or POLYMARKET_MARKET_SLUG to force a market. `
      + `Weather-like active questions: ${sampledQuestions.join(" | ") || "none"}`
    );
  }

  return Promise.all(rankedCandidates.map((candidate) => normaliseMarketSnapshot(candidate)));
};

const fetchForecastSnapshot = async (market: MarketSnapshot): Promise<ForecastSnapshot> => {
  const targetDate = parseDateFromQuestion(market.question)
    ?? market.closeTime?.slice(0, 10)
    ?? new Date().toISOString().slice(0, 10);
  const marketLocation = getMarketLocation(market.question);
  const url = `${WEATHER_API_URL}?latitude=${marketLocation.lat}&longitude=${marketLocation.lon}&daily=temperature_2m_max,temperature_2m_min&timezone=UTC&start_date=${targetDate}&end_date=${targetDate}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed forecast fetch: ${response.status}`);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const daily = (payload.daily ?? {}) as Record<string, unknown>;
  const maxTemps = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
  const minTemps = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
  const maxTemp = Number(maxTemps[0]);
  const minTemp = Number(minTemps[0]);
  if (!Number.isFinite(maxTemp) || !Number.isFinite(minTemp)) {
    throw new Error("Forecast payload missing daily max/min temperature.");
  }

  return {
    location: marketLocation.location,
    latitude: marketLocation.lat,
    longitude: marketLocation.lon,
    targetDate,
    forecastMaxTempC: maxTemp,
    forecastMinTempC: minTemp,
    forecastTimestamp: toIsoNow(),
    sourceName: "open-meteo",
    rawPayload: payload
  };
};

const buildDecision = (market: MarketSnapshot, forecast: ForecastSnapshot): DecisionFeedItem => {
  const expectedTempC = (forecast.forecastMaxTempC + forecast.forecastMinTempC) / 2;
  const isYesNoMarket = market.bucketPrices.length === 2 && market.bucketPrices.every((bucket) => isYesNoLabel(bucket.label));
  const yesProbability = isYesNoMarket ? modelYesProbabilityFromThreshold(market.question, expectedTempC) : null;
  const rawProbs = market.bucketPrices.map((bucket) => {
    if (yesProbability !== null) {
      return {
        label: bucket.label,
        rawProb: bucket.label.trim().toLowerCase() === "yes" ? yesProbability : 1 - yesProbability
      };
    }
    return {
      label: bucket.label,
      rawProb: modelBucketProbability(bucket.label, expectedTempC)
    };
  });
  const normalisedProbs = normaliseModelProbabilities(rawProbs);
  const buckets = market.bucketPrices.map((bucket) => {
    const modelProb = normalisedProbs[bucket.label] ?? 0;
    return {
      label: bucket.label,
      marketPrice: bucket.marketPrice,
      modelProb,
      edge: modelProb - bucket.marketPrice
    };
  });
  const best = [...buckets].sort((a, b) => b.edge - a.edge)[0] ?? null;
  const recommendation: Recommendation = best && best.edge >= MIN_BUY_EDGE ? "BUY" : "PASS";
  const reason = recommendation === "BUY"
    ? "Model probability exceeds market price by threshold."
    : "No bucket edge exceeds buy threshold.";

  return {
    marketId: market.marketId,
    marketExternalId: market.externalId,
    marketQuestion: market.question,
    snapshotTime: market.snapshotTime,
    buckets,
    bestBucket: best ? best.label : null,
    confidence: best ? best.modelProb : 0,
    edgeAtBestBucket: best ? best.edge : null,
    recommendation,
    reason,
    entryPriceAtBestBucket: best ? best.marketPrice : null
  };
};

export interface DecisionFeedResult {
  decisions: DecisionFeedItem[];
}

export const buildDecisionFeed = async (): Promise<DecisionFeedResult> => {
  const markets = await fetchMarketSnapshots();
  const decisions = await Promise.all(markets.map(async (market) => {
    const forecast = await fetchForecastSnapshot(market);
    return buildDecision(market, forecast);
  }));
  return { decisions };
};
