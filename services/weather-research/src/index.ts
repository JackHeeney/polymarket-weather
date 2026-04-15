import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { ParsedMarket, WeatherSnapshot } from "../../../packages/types/src/index.js";
import { ValidationError } from "../../../packages/utils/src/errors.js";

const weatherRecordSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  city: z.string().min(1),
  kind: z.enum(["PRECIPITATION", "TEMPERATURE"]),
  probability: z.number().min(0).max(1),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  threshold: z.number().nullable(),
  unit: z.string().nullable(),
  uncertainty: z.number().min(0).max(1).nullable(),
  observedAt: z.string().datetime()
});

const weatherPayloadSchema = z.array(weatherRecordSchema);

export const buildWeatherResearch = async (market: ParsedMarket): Promise<WeatherSnapshot> => {
  const filePath = path.resolve(process.cwd(), "data/mocks/weather.json");
  const fileContents = await readFile(filePath, "utf8");
  const parsedJson = JSON.parse(fileContents) as unknown;
  const validated = weatherPayloadSchema.safeParse(parsedJson);

  if (!validated.success) {
    throw new ValidationError("Invalid weather payload.", validated.error.flatten());
  }

  const cityRows = validated.data.filter((row) => row.city === market.city && row.kind === "TEMPERATURE");
  const baseProbability = cityRows[0]?.probability ?? 0.5;
  const uncertainty = cityRows[0]?.uncertainty ?? 0.25;

  return {
    marketExternalId: market.externalId,
    city: market.city,
    station: market.station,
    unit: market.unit,
    targetDate: market.marketDate,
    currentForecast: 10 + baseProbability * 20,
    hourlyForecast: [9, 11, 13, 15, 16, 18, 19, 20, 21],
    uncertaintyNotes: [`Model uncertainty ${Math.round(uncertainty * 100)}%.`],
    sourceListUsed: ["mock-weather-api"]
  };
};
