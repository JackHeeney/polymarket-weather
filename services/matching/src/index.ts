import type { ParsedMarket, WeatherSnapshot } from "../../../packages/types/src/index.js";

export interface MarketWeatherMatch {
  marketExternalId: string;
  city: string;
  matched: boolean;
}

export const matchParsedMarketsToWeather = (
  markets: ParsedMarket[],
  snapshots: WeatherSnapshot[]
): MarketWeatherMatch[] => {
  return markets.map((market) => {
    const snapshot = snapshots.find((item) => item.marketExternalId === market.externalId && item.city === market.city);
    return {
      marketExternalId: market.externalId,
      city: market.city,
      matched: Boolean(snapshot)
    };
  });
};
