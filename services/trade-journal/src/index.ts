import type { PrismaClient } from "@prisma/client";
import type { DecisionResult, JournalInput } from "../../../packages/types/src/index.js";
import { recordJournalEntry } from "../../../packages/db/src/repositories.js";

export const buildJournalFromDecision = (decision: DecisionResult): JournalInput => ({
  marketExternalId: decision.marketExternalId,
  predictedBucket: decision.bestValueOpportunity?.bucket ?? null,
  predictedProbability: decision.bestValueOpportunity?.estimatedProbability ?? null,
  recommendation: decision.recommendation,
  manualBetPlaced: false,
  manualBetBucket: null,
  entryPrice: null,
  exitPrice: null,
  resolvedBucket: null,
  profitLoss: null,
  rationale: decision.reason
});

export const persistJournal = async (prisma: PrismaClient, journal: JournalInput): Promise<void> => {
  await recordJournalEntry(prisma, journal);
};
