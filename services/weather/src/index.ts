import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { WeatherSnapshot } from "../../../packages/types/src/index.js";
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

export const loadRawWeatherRows = async (): Promise<WeatherSnapshot[]> => {
  const filePath = path.resolve(process.cwd(), "data/mocks/weather.json");
  const fileContents = await readFile(filePath, "utf8");
  const parsedJson = JSON.parse(fileContents) as unknown;
  const validated = weatherPayloadSchema.safeParse(parsedJson);

  if (!validated.success) {
    throw new ValidationError("Invalid weather payload.", validated.error.flatten());
  }

  return validated.data.map((record) => ({
    marketExternalId: record.id,
    city: record.city,
    station: "UNKNOWN",
    unit: (record.unit === "F" ? "F" : "C"),
    targetDate: record.endTime,
    currentForecast: record.threshold ?? record.probability * 25,
    hourlyForecast: [],
    uncertaintyNotes: [record.uncertainty === null ? "No uncertainty provided." : `Uncertainty ${record.uncertainty}`],
    sourceListUsed: [record.provider]
  }));
};
