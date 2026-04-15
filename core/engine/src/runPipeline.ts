import { getPrismaClient } from "../../../packages/db/src/client.js";
import { upsertParsedMarkets } from "../../../packages/db/src/repositories.js";
import { logger } from "../../../packages/utils/src/logger.js";
import type { DecisionResult } from "../../../packages/types/src/index.js";
import { loadRawMarkets } from "../../../services/markets/src/index.js";
import { parseMarkets } from "../../../services/market-parser/src/index.js";
import { buildWeatherResearch } from "../../../services/weather-research/src/index.js";
import { makeDecision } from "../../../services/signal-engine/src/index.js";
import { buildJournalFromDecision, persistJournal } from "../../../services/trade-journal/src/index.js";

export interface PipelineResult {
  decisions: DecisionResult[];
}

export const runPipeline = async (): Promise<PipelineResult> => {
  logger.info("Starting weather market pipeline.");
  const rawMarkets = await loadRawMarkets();
  const parsedMarkets = parseMarkets(rawMarkets);

  logger.info("Loaded and parsed markets.", {
    marketCount: parsedMarkets.length
  });

  const decisions: DecisionResult[] = [];
  for (const market of parsedMarkets) {
    const weatherResearch = await buildWeatherResearch(market);
    const decision = makeDecision(market, weatherResearch);
    decisions.push(decision);
    logger.info("Decision generated.", {
      marketExternalId: market.externalId,
      recommendation: decision.recommendation,
      confidence: decision.confidence
    });
  }

  if (process.env.DATABASE_URL) {
    const prisma = getPrismaClient();
    await upsertParsedMarkets(prisma, parsedMarkets);
    for (const decision of decisions) {
      await persistJournal(prisma, buildJournalFromDecision(decision));
    }
    logger.info("Persisted parsed markets and journal entries.");
  } else {
    logger.warn("Skipping DB persistence because DATABASE_URL is not set.");
  }

  return { decisions };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runPipeline()
    .then((result) => {
      logger.info("Pipeline finished.", { decisions: result.decisions });
    })
    .catch((error: unknown) => {
      logger.error("Pipeline failed.", { error });
      process.exitCode = 1;
    });
}
