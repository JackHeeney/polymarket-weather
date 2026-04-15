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
  lastActionAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalMetrics {
  startedCount: number;
  completedCount: number;
  completionRate: number;
  avgHoursToSettle: number | null;
  dropOff: {
    under24h: number;
    between24hAnd72h: number;
    over72h: number;
  };
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
  let needsBackfill = false;
  const entries = (parsed as Partial<JournalEntry>[]).map((entry) => {
    const mode = entry.mode === "test" || entry.mode === "live" ? entry.mode : "test";
    if (entry.mode !== mode || typeof entry.lastActionAt !== "string") {
      needsBackfill = true;
    }
    return {
      ...entry,
      mode,
      lastActionAt: typeof entry.lastActionAt === "string" ? entry.lastActionAt : (entry.updatedAt ?? entry.createdAt ?? new Date().toISOString())
    } as JournalEntry;
  });
  if (needsBackfill) {
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
    lastActionAt: now,
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
  const now = new Date().toISOString();
  existing.settledAt = now;
  existing.lastActionAt = now;
  existing.updatedAt = now;

  await writeEntries(entries);
  return existing;
};

export const calculateJournalMetrics = (entries: JournalEntry[]): JournalMetrics => {
  const startedCount = entries.length;
  const settledEntries = entries.filter((entry) => entry.status === "SETTLED" && typeof entry.settledAt === "string");
  const completedCount = settledEntries.length;

  const hoursToSettle = settledEntries
    .map((entry) => {
      const createdMs = new Date(entry.createdAt).getTime();
      const settledMs = entry.settledAt ? new Date(entry.settledAt).getTime() : Number.NaN;
      if (!Number.isFinite(createdMs) || !Number.isFinite(settledMs) || settledMs < createdMs) {
        return null;
      }
      return (settledMs - createdMs) / (1000 * 60 * 60);
    })
    .filter((value): value is number => value !== null);

  const avgHoursToSettle = hoursToSettle.length
    ? Number((hoursToSettle.reduce((sum, value) => sum + value, 0) / hoursToSettle.length).toFixed(2))
    : null;

  const nowMs = Date.now();
  const openEntries = entries.filter((entry) => entry.status === "OPEN");
  const dropOff = openEntries.reduce(
    (acc, entry) => {
      const createdMs = new Date(entry.createdAt).getTime();
      if (!Number.isFinite(createdMs)) {
        return acc;
      }
      const openHours = (nowMs - createdMs) / (1000 * 60 * 60);
      if (openHours < 24) {
        acc.under24h += 1;
      } else if (openHours < 72) {
        acc.between24hAnd72h += 1;
      } else {
        acc.over72h += 1;
      }
      return acc;
    },
    { under24h: 0, between24hAnd72h: 0, over72h: 0 }
  );

  const completionRate = startedCount > 0 ? Number(((completedCount / startedCount) * 100).toFixed(1)) : 0;

  return {
    startedCount,
    completedCount,
    completionRate,
    avgHoursToSettle,
    dropOff
  };
};
