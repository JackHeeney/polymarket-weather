import type { PrismaClient } from "@prisma/client";
import type { JournalInput, ParsedMarket } from "../../types/src/index.js";

export const upsertParsedMarkets = async (prisma: PrismaClient, markets: ParsedMarket[]): Promise<void> => {
  for (const market of markets) {
    await prisma.market.upsert({
      where: { externalId: market.externalId },
      update: {
        title: market.title,
        description: market.description,
        ruleText: market.rules,
        city: market.city,
        station: market.station,
        unit: market.unit,
        marketDate: new Date(market.marketDate),
        bucketLabels: JSON.stringify(market.bucketStructure),
        resolutionSource: market.resolutionSource,
        parsingConfidence: market.parsingConfidence,
        liquidityUsd: market.liquidityUsd,
        spreadBps: market.spreadBps,
        bucketPricesJson: JSON.stringify(market.bucketPrices)
      },
      create: {
        externalId: market.externalId,
        title: market.title,
        description: market.description,
        ruleText: market.rules,
        city: market.city,
        station: market.station,
        unit: market.unit,
        marketDate: new Date(market.marketDate),
        bucketLabels: JSON.stringify(market.bucketStructure),
        resolutionSource: market.resolutionSource,
        parsingConfidence: market.parsingConfidence,
        liquidityUsd: market.liquidityUsd,
        spreadBps: market.spreadBps,
        bucketPricesJson: JSON.stringify(market.bucketPrices)
      }
    });
  }
};

export const recordJournalEntry = async (
  prisma: PrismaClient,
  journal: JournalInput
): Promise<void> => {
  const market = await prisma.market.findUnique({ where: { externalId: journal.marketExternalId } });
  if (!market) {
    return;
  }

  await prisma.journalEntry.create({
    data: {
      marketId: market.id,
      predictedBucket: journal.predictedBucket,
      predictedProbability: journal.predictedProbability,
      recommendation: journal.recommendation,
      manualBetPlaced: journal.manualBetPlaced,
      manualBetBucket: journal.manualBetBucket,
      entryPrice: journal.entryPrice,
      exitPrice: journal.exitPrice,
      resolvedBucket: journal.resolvedBucket,
      profitLoss: journal.profitLoss,
      rationale: journal.rationale
    }
  });
};
