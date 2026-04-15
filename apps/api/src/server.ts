import express from "express";
import { buildDecisionFeed } from "./decisionFeed.js";
import {
  calculateJournalMetrics,
  createJournalEntry,
  listJournalEntries,
  settleJournalEntry
} from "./journalStore.js";

const app = express();
const port = Number(process.env.API_PORT ?? 3001);
const VALIDATION_LIVE_MAX_ENTRY_PRICE = 0.7;
const VALIDATION_LIVE_MIN_EDGE = 0.08;
const STALE_TRADE_THRESHOLD_HOURS = Number(process.env.STALE_TRADE_THRESHOLD_HOURS ?? 24);
app.use(express.json());

type NotificationPriority = "HIGH" | "MEDIUM" | "LOW";

const createJournalNotification = (priority: NotificationPriority, message: string) => ({
  priority,
  message,
  createdAt: new Date().toISOString()
});

const toEntryView = (entry: Awaited<ReturnType<typeof listJournalEntries>>[number]) => {
  const lastActionDate = new Date(entry.lastActionAt);
  const lastActionMs = lastActionDate.getTime();
  const hoursSinceLastAction = Number.isFinite(lastActionMs)
    ? Number(((Date.now() - lastActionMs) / (1000 * 60 * 60)).toFixed(1))
    : null;
  const isStale = typeof hoursSinceLastAction === "number" && hoursSinceLastAction > STALE_TRADE_THRESHOLD_HOURS;
  const notification = entry.status === "SETTLED"
    ? createJournalNotification("HIGH", "Trade completed.")
    : isStale
      ? createJournalNotification("MEDIUM", `Waiting for your action. Last activity ${hoursSinceLastAction?.toFixed(1)}h ago.`)
      : createJournalNotification("LOW", "Trade updated.");
  return {
    ...entry,
    stale: {
      thresholdHours: STALE_TRADE_THRESHOLD_HOURS,
      hoursSinceLastAction,
      isStale
    },
    notification
  };
};

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/decisions", async (_req, res) => {
  try {
    const result = await buildDecisionFeed();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Failed to build decisions.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.get("/journal", async (_req, res) => {
  const entries = await listJournalEntries();
  const entryViews = entries.map(toEntryView);
  const metrics = calculateJournalMetrics(entries);
  res.json({
    entries: entryViews,
    metrics,
    staleThresholdHours: STALE_TRADE_THRESHOLD_HOURS
  });
});

app.post("/journal", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const marketExternalId = typeof body.marketExternalId === "string" ? body.marketExternalId : "";
  const rawMode = String(body.mode || "").trim().toLowerCase();
  const mode: "test" | "live" | "unknown" = rawMode === "test" || rawMode === "live" ? rawMode : "unknown";
  if (!marketExternalId) {
    res.status(400).json({ error: "marketExternalId is required." });
    return;
  }

  const createInput = {
    mode,
    marketExternalId,
    predictedBucket: typeof body.predictedBucket === "string" ? body.predictedBucket : null,
    predictedProbability: typeof body.predictedProbability === "number" ? body.predictedProbability : null,
    edgeAtEntry: typeof body.edgeAtEntry === "number" ? body.edgeAtEntry : null,
    confidenceAtEntry: typeof body.confidenceAtEntry === "number" ? body.confidenceAtEntry : null,
    recommendation: typeof body.recommendation === "string" ? body.recommendation : "PASS",
    manualBetPlaced: Boolean(body.manualBetPlaced),
    manualBetBucket: typeof body.manualBetBucket === "string" ? body.manualBetBucket : null,
    entryPrice: typeof body.entryPrice === "number" ? body.entryPrice : null,
    rationale: typeof body.rationale === "string" ? body.rationale : "",
    notes: typeof body.notes === "string" ? body.notes : ""
  };

  if (createInput.mode === "live") {
    const entryPrice = createInput.entryPrice;
    const edgeAtEntry = createInput.edgeAtEntry;
    const hasValidEntryPrice = typeof entryPrice === "number" && entryPrice < VALIDATION_LIVE_MAX_ENTRY_PRICE;
    const hasValidEdge = typeof edgeAtEntry === "number" && edgeAtEntry >= VALIDATION_LIVE_MIN_EDGE;

    if (!hasValidEntryPrice || !hasValidEdge) {
      const reasons: string[] = [];
      if (!hasValidEntryPrice) {
        reasons.push("Live trade rejected: entry price must be below 0.70.");
      }
      if (!hasValidEdge) {
        reasons.push("Live trade rejected: edge at entry must be at least 0.08.");
      }
      res.status(400).json({
        error: reasons.join(" "),
        reasons,
        validation: {
          maxEntryPriceExclusive: VALIDATION_LIVE_MAX_ENTRY_PRICE,
          minEdgeInclusive: VALIDATION_LIVE_MIN_EDGE
        }
      });
      return;
    }
  }

  const created = await createJournalEntry(createInput);
  res.status(201).json({
    entry: toEntryView(created),
    notification: createJournalNotification("MEDIUM", "Waiting for your action.")
  });
});

app.post("/journal/settle", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  if (typeof body.id !== "string" || typeof body.exitPrice !== "number" || typeof body.resolvedBucket !== "string") {
    res.status(400).json({ error: "id, exitPrice, and resolvedBucket are required." });
    return;
  }

  const updated = await settleJournalEntry({
    id: body.id,
    exitPrice: body.exitPrice,
    resolvedBucket: body.resolvedBucket
  });
  if (!updated) {
    res.status(404).json({ error: "Journal entry not found." });
    return;
  }
  res.json({
    entry: toEntryView(updated),
    notification: createJournalNotification("HIGH", "Trade completed.")
  });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
