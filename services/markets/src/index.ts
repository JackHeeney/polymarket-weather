import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { RawMarket } from "../../../packages/types/src/index.js";
import { ValidationError } from "../../../packages/utils/src/errors.js";

const marketRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  rules: z.string().min(1),
  bucketLabels: z.array(z.string().min(1)).min(1),
  marketDate: z.string().datetime(),
  liquidityUsd: z.number().nonnegative(),
  spreadBps: z.number().int().nonnegative(),
  bucketPrices: z.record(z.string(), z.number().min(0).max(1))
});

const marketPayloadSchema = z.array(marketRecordSchema);

export const loadRawMarkets = async (): Promise<RawMarket[]> => {
  const filePath = path.resolve(process.cwd(), "data/mocks/markets.json");
  const fileContents = await readFile(filePath, "utf8");
  const parsedJson = JSON.parse(fileContents) as unknown;
  const validated = marketPayloadSchema.safeParse(parsedJson);

  if (!validated.success) {
    throw new ValidationError("Invalid markets payload.", validated.error.flatten());
  }

  return validated.data.map((record) => ({
    externalId: record.id,
    title: record.title,
    description: record.description,
    rules: record.rules,
    bucketLabels: record.bucketLabels,
    marketDate: record.marketDate,
    liquidityUsd: record.liquidityUsd,
    spreadBps: record.spreadBps,
    bucketPrices: record.bucketPrices
  }));
};
