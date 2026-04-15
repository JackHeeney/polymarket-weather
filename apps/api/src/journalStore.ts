import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface JournalEntry {
  id: string;
  mode: "test" | "live" | "unknown";
  marketExternalId: string;
  predictedBucket: string | null;
  predictedProbability: number | null;
  edgeAtEntry: number | null;
  confidenceAtEntry: number | null;
  recommendation: string;
  manualBetPlaced: boolean;
  manualBetBucket: string | null;
  entryPrice: number | null;
  exitPrice: number | null;
  resolvedBucket: string | null;
  profitLoss: number | null;
  rationale: string;
  notes: string;
  status: "OPEN" | "SETTLED";
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const storePath = path.resolve(process.cwd(), "data/journal-entries.json");

const ensureStore = async (): Promise<void> => {
  await mkdir(path.dirname(storePath), { recursive: true });
  try {
    await readFile(storePath, "utf8");
  } catch {
    await writeFile(storePath, "[]", "utf8");
  }
};

const readEntries = async (): Promise<JournalEntry[]> => {
  await ensureStore();
  const content = await readFile(storePath, "utf8");
  const parsed = JSON.parse(content) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }
  let hasBackfilledModes = false;
  const entries = (parsed as Partial<JournalEntry>[]).map((entry) => {
    if (entry.mode === "test" || entry.mode === "live") {
      return entry as JournalEntry;
    }
    hasBackfilledModes = true;
    return {
      ...entry,
      mode: "test"
    } as JournalEntry;
  });
  if (hasBackfilledModes) {
    await writeEntries(entries);
  }
  return entries;
};

const writeEntries = async (entries: JournalEntry[]): Promise<void> => {
  await writeFile(storePath, JSON.stringify(entries, null, 2), "utf8");
};

export interface CreateJournalEntryInput {
  mode: "test" | "live" | "unknown";
  marketExternalId: string;
  predictedBucket: string | null;
  predictedProbability: number | null;
  edgeAtEntry: number | null;
  confidenceAtEntry: number | null;
  recommendation: string;
  manualBetPlaced: boolean;
  manualBetBucket: string | null;
  entryPrice: number | null;
  rationale: string;
  notes: string;
}

export interface SettleJournalEntryInput {
  id: string;
  exitPrice: number;
  resolvedBucket: string;
}

export const listJournalEntries = async (): Promise<JournalEntry[]> => {
  const entries = await readEntries();
  return entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};

export const createJournalEntry = async (input: CreateJournalEntryInput): Promise<JournalEntry> => {
  const entries = await readEntries();
  const now = new Date().toISOString();
  const entry: JournalEntry = {
    id: randomUUID(),
    mode: input.mode,
    marketExternalId: input.marketExternalId,
    predictedBucket: input.predictedBucket,
    predictedProbability: input.predictedProbability,
    edgeAtEntry: input.edgeAtEntry,
    confidenceAtEntry: input.confidenceAtEntry,
    recommendation: input.recommendation,
    manualBetPlaced: input.manualBetPlaced,
    manualBetBucket: input.manualBetBucket,
    entryPrice: input.entryPrice,
    exitPrice: null,
    resolvedBucket: null,
    profitLoss: null,
    rationale: input.rationale,
    notes: input.notes,
    status: "OPEN",
    settledAt: null,
    createdAt: now,
    updatedAt: now
  };
  entries.push(entry);
  await writeEntries(entries);
  return entry;
};

export const settleJournalEntry = async (input: SettleJournalEntryInput): Promise<JournalEntry | null> => {
  const entries = await readEntries();
  const existing = entries.find((entry) => entry.id === input.id);
  if (!existing) {
    return null;
  }

  const stake = existing.entryPrice ?? 0;
  const pnl = input.resolvedBucket === existing.manualBetBucket ? input.exitPrice - stake : -stake;
  existing.exitPrice = input.exitPrice;
  existing.resolvedBucket = input.resolvedBucket;
  existing.profitLoss = Number(pnl.toFixed(4));
  existing.status = "SETTLED";
  existing.settledAt = new Date().toISOString();
  existing.updatedAt = new Date().toISOString();

  await writeEntries(entries);
  return existing;
};
