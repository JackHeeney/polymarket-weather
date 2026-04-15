import express from "express";

const app = express();
const port = Number(process.env.DASHBOARD_PORT ?? 3002);
const apiPort = Number(process.env.API_PORT ?? 3001);
app.use(express.json());

app.get("/data", async (_req, res) => {
  try {
    const response = await fetch(`http://localhost:${apiPort}/decisions`);
    const payload = (await response.json()) as unknown;
    res.json(payload);
  } catch (error) {
    res.status(502).json({
      decisions: [],
      error: error instanceof Error ? error.message : "Failed to fetch decisions from API."
    });
  }
});

app.get("/journal", async (_req, res) => {
  try {
    const response = await fetch(`http://localhost:${apiPort}/journal`);
    const payload = (await response.json()) as unknown;
    res.json(payload);
  } catch (error) {
    res.status(502).json({
      entries: [],
      error: error instanceof Error ? error.message : "Failed to fetch journal entries."
    });
  }
});

app.post("/journal", async (req, res) => {
  try {
    const response = await fetch(`http://localhost:${apiPort}/journal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const payload = (await response.json()) as unknown;
    res.status(response.status).json(payload);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Failed to create journal entry." });
  }
});

app.post("/journal/settle", async (req, res) => {
  try {
    const response = await fetch(`http://localhost:${apiPort}/journal/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const payload = (await response.json()) as unknown;
    res.status(response.status).json(payload);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Failed to settle journal entry." });
  }
});

app.get("/", (_req, res) => {
  res.type("html").send(`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Weather Market Research</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
      th { background: #f5f5f5; }
      section { margin-top: 1.5rem; padding: 1rem; border: 1px solid #ddd; border-radius: 6px; }
      label { display: block; margin-top: 0.5rem; font-weight: bold; }
      input, select, textarea, button { margin-top: 0.25rem; padding: 0.4rem; font-size: 14px; }
      button { cursor: pointer; }
      .muted { color: #666; }
      .error { color: #b00020; font-size: 12px; margin-top: 0.2rem; min-height: 1em; }
      .summary { background: #f7f9fc; padding: 0.75rem; border: 1px solid #d8e1f0; margin-top: 0.75rem; }
      .stat-grid { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
      .stat-card { border: 1px solid #ddd; border-radius: 6px; padding: 0.6rem 0.8rem; min-width: 180px; }
      .pnl-positive { color: #1b7f3b; font-weight: bold; }
      .pnl-negative { color: #b00020; font-weight: bold; }
      .pnl-neutral { color: #666; font-weight: bold; }
      .mode-badge { display: inline-block; border-radius: 12px; padding: 0.1rem 0.5rem; font-size: 12px; font-weight: bold; }
      .mode-badge-test { background: #eaf2ff; color: #1f4f8a; border: 1px solid #c8dcff; }
      .mode-badge-live { background: #e9f9ef; color: #166534; border: 1px solid #b6e8c7; }
      .validation-note { margin-top: 0.5rem; color: #1f4f8a; font-size: 13px; }
      .validation-counter { margin-top: 0.4rem; font-weight: bold; color: #1f4f8a; }
    </style>
  </head>
  <body>
    <h1>Weather Market Research</h1>
    <p>Follow the 3 simple steps: choose decision, place manual bet, settle outcome.</p>
    <table>
      <thead>
        <tr>
          <th>Market</th>
          <th>Best Bucket</th>
          <th>Edge</th>
          <th>Confidence</th>
          <th>Recommendation</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>

    <section>
      <h2>Step 1: Choose Decision</h2>
      <label for="decisionSelect">Decision</label>
      <select id="decisionSelect"></select>
      <div id="decisionError" class="error"></div>
      <p id="decisionHint" class="muted"></p>
    </section>

    <section>
      <h2>Step 2: Record Bet Entry</h2>
      <p id="step2State" class="muted"></p>
      <label for="selectedMarket">Market</label>
      <input id="selectedMarket" readonly />
      <label for="suggestedBucket">Suggested bucket</label>
      <input id="suggestedBucket" readonly />
      <button id="useSuggestedBtn" type="button">Use suggested bucket</button>
      <label for="manualBetBucket">Bucket you bet</label>
      <select id="manualBetBucket"></select>
      <div id="manualBetBucketError" class="error"></div>
      <label for="entryPrice">Entry price</label>
      <input id="entryPrice" type="number" step="0.0001" placeholder="e.g. 0.42" />
      <p class="muted">Enter the price you bought at (e.g. 0.63)</p>
      <p id="evFeedback" class="muted"></p>
      <p id="entryPriceGuidance" class="muted"></p>
      <div>
        <button type="button" class="quick-price" data-price="0.50">0.50</button>
        <button type="button" class="quick-price" data-price="0.60">0.60</button>
        <button type="button" class="quick-price" data-price="0.70">0.70</button>
        <button type="button" class="quick-price" data-price="0.80">0.80</button>
      </div>
      <div id="entryPriceError" class="error"></div>
      <label for="entryNotes">Notes</label>
      <textarea id="entryNotes" rows="2" placeholder="Why this trade was taken"></textarea>
      <label for="tradeMode">Trade mode</label>
      <select id="tradeMode">
        <option value="test">test</option>
        <option value="live">live</option>
      </select>
      <p id="liveModeNotice" class="muted" style="display:none;">This entry will be included in live performance stats.</p>
      <div class="summary" id="entrySummary"></div>
      <br />
      <button id="saveEntryBtn">Save Entry</button>
      <p id="entryStatus" class="muted"></p>
    </section>

    <section>
      <h2>Step 3: Settle Outcome / P&L</h2>
      <p id="step3State" class="muted"></p>
      <label for="openEntrySelect">Open Journal Entry</label>
      <select id="openEntrySelect"></select>
      <div id="openEntryError" class="error"></div>
      <label for="resolvedBucket">Resolved bucket</label>
      <select id="resolvedBucket"></select>
      <p class="muted">Select the bucket the actual outcome falls into (not the raw temperature).</p>
      <div id="resolvedBucketError" class="error"></div>
      <label for="exitPrice">Exit / resolution price</label>
      <input id="exitPrice" type="number" step="0.0001" placeholder="e.g. 1.00" />
      <div id="exitPriceError" class="error"></div>
      <br />
      <button id="settleEntryBtn">Settle Entry</button>
      <p id="settleStatus" class="muted"></p>
    </section>

    <section>
      <h2>Journal History</h2>
      <div class="stat-grid">
        <div class="stat-card"><strong>Total P/L</strong><br/><span id="totalPnl">0.0000</span></div>
        <div class="stat-card"><strong>Win rate</strong><br/><span id="winRate">0%</span></div>
        <div class="stat-card"><strong>Average entry price</strong><br/><span id="avgEntryPrice">n/a</span></div>
        <div class="stat-card"><strong>Average P/L per trade</strong><br/><span id="avgPnlPerTrade">0.0000</span></div>
        <div class="stat-card"><strong>Trade count</strong><br/><span id="tradeCount">0</span></div>
        <div class="stat-card"><strong>Wins / Losses</strong><br/><span id="winLossCount">0 / 0</span></div>
      </div>
      <label><input type="checkbox" id="hideLowEdgeToggle" /> Hide high-price trades (entry >= 0.95)</label>
      <label><input type="checkbox" id="showTestTradesToggle" checked /> Show test trades</label>
      <label><input type="checkbox" id="showLiveTradesToggle" checked /> Show live trades</label>
      <label for="minEdgeThreshold">Min edge threshold (>=)</label>
      <input id="minEdgeThreshold" type="number" step="0.0001" value="0.00" />
      <p class="validation-note">Validation mode: review live trades only with entry &lt; 0.70 and edge &gt;= 0.08.</p>
      <p class="validation-counter" id="validationRunCounter">Validation run: 0 / 30 live trades logged</p>
      <table>
        <thead>
          <tr>
            <th>Market</th>
            <th>Suggested Bucket</th>
            <th>Executed Bucket</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Status</th>
            <th>Mode</th>
            <th>P/L</th>
            <th>Notes</th>
            <th>Created</th>
            <th>Settled</th>
          </tr>
        </thead>
        <tbody id="journalRows"></tbody>
      </table>
    </section>

    <script>
      let cachedDecisions = [];
      let cachedJournalEntries = [];
      const VALIDATION_LIVE_MAX_ENTRY_PRICE = 0.7;
      const VALIDATION_LIVE_MIN_EDGE = 0.08;
      const VALIDATION_TARGET_TRADE_COUNT = 30;

      function selectedDecision() {
        const select = document.getElementById("decisionSelect");
        const id = select.value;
        return cachedDecisions.find((item) => item.marketId === id) || null;
      }

      function bucketsForMarket(marketExternalId) {
        const decision = cachedDecisions.find((item) => item.marketId === marketExternalId);
        if (!decision || !Array.isArray(decision.buckets)) {
          return [];
        }
        return decision.buckets.map((item) => item.label);
      }

      function populateSelectOptions(selectId, options) {
        const select = document.getElementById(selectId);
        const baseOption = "<option value=''>Select bucket</option>";
        select.innerHTML = baseOption + options.map((bucket) => (
          "<option value='" + bucket + "'>" + bucket + "</option>"
        )).join("");
      }

      function setFieldError(id, message) {
        document.getElementById(id).textContent = message || "";
      }

      function selectedTradeMode() {
        const rawMode = document.getElementById("tradeMode").value;
        return rawMode === "live" ? "live" : "test";
      }

      function setStep2Enabled(enabled) {
        ["manualBetBucket", "entryPrice", "entryNotes", "saveEntryBtn", "useSuggestedBtn"].forEach((id) => {
          document.getElementById(id).disabled = !enabled;
        });
        document.getElementById("step2State").textContent = enabled
          ? "Fill in your bet details, then review the summary before saving."
          : "Complete Step 1 first.";
      }

      function setStep3Enabled(enabled) {
        ["openEntrySelect", "resolvedBucket", "exitPrice", "settleEntryBtn"].forEach((id) => {
          document.getElementById(id).disabled = !enabled;
        });
        document.getElementById("step3State").textContent = enabled
          ? "Choose an open entry and settle it."
          : "Create at least one journal entry first.";
      }

      function validateStep2() {
        const decision = selectedDecision();
        const bucket = document.getElementById("manualBetBucket").value;
        const price = Number(document.getElementById("entryPrice").value);
        const hasPrice = Number.isFinite(price);
        const mode = selectedTradeMode();
        const edge = decision ? decision.edgeAtBestBucket : null;
        setFieldError("decisionError", decision ? "" : "Decision is required.");
        setFieldError("manualBetBucketError", bucket ? "" : "Bet bucket is required.");
        if (!hasPrice || price <= 0 || price >= 1) {
          setFieldError("entryPriceError", "Entry price must be greater than 0 and less than 1.");
        } else if (mode === "live" && price >= VALIDATION_LIVE_MAX_ENTRY_PRICE) {
          setFieldError("entryPriceError", "Live validation rule: entry must be below 0.70.");
        } else if (mode === "live" && (typeof edge !== "number" || edge < VALIDATION_LIVE_MIN_EDGE)) {
          setFieldError("entryPriceError", "Live validation rule: edge must be at least 0.08.");
        } else {
          setFieldError("entryPriceError", "");
        }
        const passesLiveRules = mode !== "live"
          || (price < VALIDATION_LIVE_MAX_ENTRY_PRICE && typeof edge === "number" && edge >= VALIDATION_LIVE_MIN_EDGE);
        return Boolean(decision && bucket && hasPrice && price > 0 && price < 1 && passesLiveRules);
      }

      function validateStep3() {
        const openId = document.getElementById("openEntrySelect").value;
        const resolvedBucket = document.getElementById("resolvedBucket").value;
        const exitPrice = Number(document.getElementById("exitPrice").value);
        const hasExit = Number.isFinite(exitPrice);
        setFieldError("openEntryError", openId ? "" : "Open entry is required.");
        setFieldError("resolvedBucketError", resolvedBucket ? "" : "Resolved bucket is required.");
        setFieldError("exitPriceError", hasExit && exitPrice >= 0 && exitPrice <= 1 ? "" : "Exit price must be between 0 and 1.");
        return Boolean(openId && resolvedBucket && hasExit && exitPrice >= 0 && exitPrice <= 1);
      }

      function renderEntrySummary() {
        const decision = selectedDecision();
        const bucket = document.getElementById("manualBetBucket").value.trim() || "n/a";
        const entryPrice = document.getElementById("entryPrice").value || "n/a";
        const notes = document.getElementById("entryNotes").value.trim() || "none";
        const mode = selectedTradeMode();
        const liveModeNotice = document.getElementById("liveModeNotice");
        liveModeNotice.style.display = mode === "live" ? "block" : "none";
        const suggested = decision && decision.bestBucket ? decision.bestBucket : "n/a";
        const edgeText = decision && typeof decision.edgeAtBestBucket === "number" ? decision.edgeAtBestBucket.toFixed(4) : "n/a";
        const market = decision ? decision.marketId : "n/a";
        const liveRuleStatus = mode === "live"
          ? (decision && typeof decision.edgeAtBestBucket === "number" && Number(entryPrice) < VALIDATION_LIVE_MAX_ENTRY_PRICE && decision.edgeAtBestBucket >= VALIDATION_LIVE_MIN_EDGE
            ? "PASS"
            : "BLOCKED")
          : "n/a";
        document.getElementById("entrySummary").innerHTML =
          "<strong>Review before save</strong><br/>" +
          "Market: " + market + "<br/>" +
          "Suggested bucket: " + suggested + "<br/>" +
          "Decision edge: " + edgeText + "<br/>" +
          "Actual bucket: " + bucket + "<br/>" +
          "Mode: " + mode + "<br/>" +
          "Live rule check: " + liveRuleStatus + "<br/>" +
          "Entry price: " + entryPrice + "<br/>" +
          "Notes: " + notes;
      }

      function renderEntryPriceGuidance() {
        const decision = selectedDecision();
        const entryPriceRaw = Number(document.getElementById("entryPrice").value);
        const hasPrice = Number.isFinite(entryPriceRaw);
        const evFeedbackEl = document.getElementById("evFeedback");
        const entryPriceGuidanceEl = document.getElementById("entryPriceGuidance");

        if (!decision || !hasPrice) {
          evFeedbackEl.textContent = "";
          entryPriceGuidanceEl.textContent = "";
          return;
        }

        const ev = decision.confidence - entryPriceRaw;
        if (ev > 0) {
          evFeedbackEl.textContent = "Positive expected value (EV " + ev.toFixed(4) + ").";
        } else if (ev < 0) {
          evFeedbackEl.textContent = "Negative expected value (EV " + ev.toFixed(4) + ").";
        } else {
          evFeedbackEl.textContent = "Neutral expected value (EV 0.0000).";
        }

        if (entryPriceRaw > 0.9) {
          entryPriceGuidanceEl.textContent = "Strong warning: entry price is above 0.90.";
        } else if (entryPriceRaw > 0.8) {
          entryPriceGuidanceEl.textContent = "Caution: entry price is above 0.80.";
        } else {
          entryPriceGuidanceEl.textContent = "";
        }
      }

      function renderDecisionSelect() {
        const select = document.getElementById("decisionSelect");
        select.innerHTML = cachedDecisions.map((item) => (
          "<option value='" + item.marketId + "'>" +
          item.marketQuestion + " (" + item.recommendation + ")" +
          "</option>"
        )).join("");
        const decision = selectedDecision();
        document.getElementById("selectedMarket").value = decision ? decision.marketQuestion : "";
        document.getElementById("suggestedBucket").value = decision && decision.bestBucket ? decision.bestBucket : "";
        populateSelectOptions("manualBetBucket", decision ? bucketsForMarket(decision.marketId) : []);
        setStep2Enabled(Boolean(decision));
        document.getElementById("decisionHint").textContent = decision
          ? ("Best bucket: " + (decision.bestBucket || "n/a") +
            " | Edge: " + (typeof decision.edgeAtBestBucket === "number" ? decision.edgeAtBestBucket.toFixed(4) : "n/a"))
          : "No decision selected.";
        if (decision && typeof decision.entryPriceAtBestBucket === "number") {
          document.getElementById("entryPrice").value = decision.entryPriceAtBestBucket.toFixed(4);
        }
        renderEntrySummary();
        renderEntryPriceGuidance();
        validateStep2();
      }

      function renderJournal() {
        const rows = document.getElementById("journalRows");
        const hideLowEdge = document.getElementById("hideLowEdgeToggle").checked;
        const showTestTrades = document.getElementById("showTestTradesToggle").checked;
        const showLiveTrades = document.getElementById("showLiveTradesToggle").checked;
        const minEdgeRaw = Number(document.getElementById("minEdgeThreshold").value);
        const minEdge = Number.isFinite(minEdgeRaw) ? minEdgeRaw : 0;
        const visibleEntries = cachedJournalEntries.filter((entry) => {
          const mode = entry.mode === "live" || entry.mode === "test" ? entry.mode : "unknown";
          if (mode === "test" && !showTestTrades) {
            return false;
          }
          if (mode === "live" && !showLiveTrades) {
            return false;
          }
          if (hideLowEdge && entry.entryPrice !== null && entry.entryPrice >= 0.95) {
            return false;
          }
          if (minEdge > 0) {
            if (typeof entry.edgeAtEntry !== "number") {
              return false;
            }
            return entry.edgeAtEntry >= minEdge;
          }
          return true;
        });

        const settledEntries = visibleEntries.filter((entry) => entry.status === "SETTLED");
        const tradeCount = settledEntries.length;
        const pnlValues = settledEntries
          .map((entry) => entry.profitLoss)
          .filter((value) => typeof value === "number");
        const totalPnl = pnlValues.reduce((sum, value) => sum + value, 0);
        const wins = pnlValues.filter((value) => value > 0).length;
        const losses = pnlValues.filter((value) => value < 0).length;
        const winRate = pnlValues.length ? (wins / pnlValues.length) * 100 : 0;
        const avgPnlPerTrade = tradeCount > 0 ? totalPnl / tradeCount : 0;
        const entryPrices = settledEntries
          .map((entry) => entry.entryPrice)
          .filter((value) => typeof value === "number");
        const avgEntryPrice = entryPrices.length
          ? entryPrices.reduce((sum, value) => sum + value, 0) / entryPrices.length
          : null;
        const liveTradesLogged = cachedJournalEntries.filter((entry) => entry.mode === "live").length;

        const totalPnlEl = document.getElementById("totalPnl");
        totalPnlEl.textContent = totalPnl.toFixed(4);
        totalPnlEl.className = totalPnl > 0 ? "pnl-positive" : (totalPnl < 0 ? "pnl-negative" : "pnl-neutral");
        document.getElementById("winRate").textContent = winRate.toFixed(1) + "%";
        document.getElementById("avgEntryPrice").textContent = avgEntryPrice === null ? "n/a" : avgEntryPrice.toFixed(4);
        document.getElementById("avgPnlPerTrade").textContent = avgPnlPerTrade.toFixed(4);
        document.getElementById("tradeCount").textContent = String(tradeCount);
        document.getElementById("winLossCount").textContent = wins + " / " + losses;
        document.getElementById("validationRunCounter").textContent =
          "Validation run: " + liveTradesLogged + " / " + VALIDATION_TARGET_TRADE_COUNT + " live trades logged";

        rows.innerHTML = visibleEntries.map((entry) => (
          (() => {
            const pnl = entry.profitLoss;
            const pnlClass = typeof pnl === "number"
              ? (pnl > 0 ? "pnl-positive" : (pnl < 0 ? "pnl-negative" : "pnl-neutral"))
              : "pnl-neutral";
            const pnlText = typeof pnl === "number" ? pnl.toFixed(4) : "n/a";
            return (
          "<tr>" +
            "<td>" + entry.marketExternalId + "</td>" +
            "<td>" + (entry.predictedBucket || "n/a") + "</td>" +
            "<td>" + (entry.manualBetBucket || "n/a") + "</td>" +
            "<td>" + (entry.entryPrice ?? "n/a") + "</td>" +
            "<td>" + (entry.exitPrice ?? "n/a") + "</td>" +
            "<td>" + entry.status + "</td>" +
            "<td>" +
              (entry.mode === "live"
                ? "<span class='mode-badge mode-badge-live'>live</span>"
                : (entry.mode === "test"
                  ? "<span class='mode-badge mode-badge-test'>test</span>"
                  : "<span class='mode-badge mode-badge-test'>unknown</span>")) +
            "</td>" +
            "<td class='" + pnlClass + "'>" + pnlText + "</td>" +
            "<td>" + (entry.notes || "") + "</td>" +
            "<td>" + new Date(entry.createdAt).toLocaleString() + "</td>" +
            "<td>" + (entry.settledAt ? new Date(entry.settledAt).toLocaleString() : "n/a") + "</td>" +
          "</tr>"
            );
          })()
        )).join("");
        if (!cachedJournalEntries.length) {
          rows.innerHTML = "<tr><td colspan='11'>No journal entries yet.</td></tr>";
        } else if (!visibleEntries.length) {
          rows.innerHTML = "<tr><td colspan='11'>No entries match current filter.</td></tr>";
        }

        const openEntries = visibleEntries.filter((entry) => entry.status === "OPEN");
        const openSelect = document.getElementById("openEntrySelect");
        openSelect.innerHTML = openEntries.map((entry) => (
          "<option value='" + entry.id + "'>" + entry.marketExternalId + " | " + (entry.manualBetBucket || "n/a") + "</option>"
        )).join("");
        if (openEntries.length > 0) {
          const selectedId = openSelect.value || openEntries[0].id;
          openSelect.value = selectedId;
          const selectedOpen = openEntries.find((entry) => entry.id === selectedId) || openEntries[0];
          populateSelectOptions("resolvedBucket", bucketsForMarket(selectedOpen.marketExternalId));
        } else {
          populateSelectOptions("resolvedBucket", []);
        }
        setStep3Enabled(openEntries.length > 0);
      }

      async function loadJournal() {
        const response = await fetch("/journal");
        const payload = await response.json();
        cachedJournalEntries = Array.isArray(payload.entries) ? payload.entries : [];
        renderJournal();
      }

      async function load() {
        const resp = await fetch("/data");
        const data = await resp.json();
        const rows = document.getElementById("rows");
        cachedDecisions = Array.isArray(data.decisions) ? data.decisions : [];
        rows.innerHTML = cachedDecisions.map((item) => (
          "<tr>" +
            "<td>" + item.marketQuestion + "</td>" +
            "<td>" + (item.bestBucket || "n/a") + "</td>" +
            "<td>" + (typeof item.edgeAtBestBucket === "number" ? item.edgeAtBestBucket.toFixed(4) : "n/a") + "</td>" +
            "<td>" + item.confidence.toFixed(2) + "</td>" +
            "<td>" + item.recommendation + "</td>" +
            "<td>" + item.reason + "</td>" +
          "</tr>"
        )).join("");
        if (!cachedDecisions.length) {
          rows.innerHTML = "<tr><td colspan='6'>No decisions returned yet.</td></tr>";
        }
        renderDecisionSelect();
        await loadJournal();
        const showTestTradesToggle = document.getElementById("showTestTradesToggle");
        const showLiveTradesToggle = document.getElementById("showLiveTradesToggle");
        const minEdgeThreshold = document.getElementById("minEdgeThreshold");
        showTestTradesToggle.checked = false;
        showLiveTradesToggle.checked = true;
        minEdgeThreshold.value = VALIDATION_LIVE_MIN_EDGE.toFixed(2);
        renderJournal();
      }

      document.getElementById("decisionSelect").addEventListener("change", renderDecisionSelect);
      document.getElementById("manualBetBucket").addEventListener("input", () => { validateStep2(); renderEntrySummary(); });
      document.getElementById("manualBetBucket").addEventListener("change", () => { validateStep2(); renderEntrySummary(); });
      document.getElementById("entryPrice").addEventListener("input", () => { validateStep2(); renderEntrySummary(); renderEntryPriceGuidance(); });
      document.querySelectorAll(".quick-price").forEach((button) => {
        button.addEventListener("click", () => {
          const value = button.getAttribute("data-price");
          if (value) {
            document.getElementById("entryPrice").value = value;
            validateStep2();
            renderEntrySummary();
            renderEntryPriceGuidance();
          }
        });
      });
      document.getElementById("entryNotes").addEventListener("input", renderEntrySummary);
      document.getElementById("tradeMode").addEventListener("change", renderEntrySummary);
      document.getElementById("resolvedBucket").addEventListener("input", validateStep3);
      document.getElementById("resolvedBucket").addEventListener("change", validateStep3);
      document.getElementById("exitPrice").addEventListener("input", validateStep3);
      document.getElementById("openEntrySelect").addEventListener("change", validateStep3);
      document.getElementById("openEntrySelect").addEventListener("change", () => {
        const id = document.getElementById("openEntrySelect").value;
        const openEntry = cachedJournalEntries.find((entry) => entry.id === id);
        populateSelectOptions("resolvedBucket", openEntry ? bucketsForMarket(openEntry.marketExternalId) : []);
        validateStep3();
      });
      document.getElementById("hideLowEdgeToggle").addEventListener("change", renderJournal);
      document.getElementById("showTestTradesToggle").addEventListener("change", renderJournal);
      document.getElementById("showLiveTradesToggle").addEventListener("change", renderJournal);
      document.getElementById("minEdgeThreshold").addEventListener("input", renderJournal);

      document.getElementById("useSuggestedBtn").addEventListener("click", () => {
        const suggested = document.getElementById("suggestedBucket").value;
        if (suggested) {
          document.getElementById("manualBetBucket").value = suggested;
          validateStep2();
          renderEntrySummary();
        }
      });

      document.getElementById("saveEntryBtn").addEventListener("click", async () => {
        if (!validateStep2()) {
          document.getElementById("entryStatus").textContent = "Please fix the highlighted fields.";
          return;
        }
        const decision = selectedDecision();
        const selectedMode = selectedTradeMode();
        const payload = {
          marketExternalId: decision.marketId,
          predictedBucket: decision.bestBucket || null,
          predictedProbability: typeof decision.confidence === "number" ? decision.confidence : null,
          edgeAtEntry: typeof decision.edgeAtBestBucket === "number" ? decision.edgeAtBestBucket : null,
          confidenceAtEntry: typeof decision.confidence === "number" ? decision.confidence : null,
          recommendation: decision.recommendation,
          mode: selectedMode,
          manualBetPlaced: true,
          manualBetBucket: document.getElementById("manualBetBucket").value || null,
          entryPrice: Number(document.getElementById("entryPrice").value),
          rationale: decision.reason,
          notes: document.getElementById("entryNotes").value
        };
        const response = await fetch("/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const body = await response.json();
        if (!response.ok) {
          const message = body && typeof body.error === "string" ? body.error : "Failed to save entry.";
          document.getElementById("entryStatus").textContent = message;
          return;
        }
        const storedMode = body && body.entry && (body.entry.mode === "live" || body.entry.mode === "test")
          ? body.entry.mode
          : "unknown";
        document.getElementById("entryStatus").textContent =
          "Entry saved at " + new Date().toLocaleString() + ". Mode: " + storedMode + ".";
        await loadJournal();
      });

      document.getElementById("settleEntryBtn").addEventListener("click", async () => {
        if (!validateStep3()) {
          document.getElementById("settleStatus").textContent = "Please fix the highlighted fields.";
          return;
        }
        const payload = {
          id: document.getElementById("openEntrySelect").value,
          resolvedBucket: document.getElementById("resolvedBucket").value,
          exitPrice: Number(document.getElementById("exitPrice").value)
        };
        const response = await fetch("/journal/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          document.getElementById("settleStatus").textContent = "Failed to settle entry.";
          return;
        }
        const body = await response.json();
        const entry = body.entry;
        const pnl = entry && typeof entry.profitLoss === "number" ? entry.profitLoss : null;
        const pnlText = pnl === null ? "P/L unavailable" : (pnl >= 0 ? "Profit +" + pnl.toFixed(4) : "Loss " + pnl.toFixed(4));
        document.getElementById("settleStatus").textContent =
          "Settled at " + new Date().toLocaleString() + ". Outcome: " + entry.resolvedBucket + ". " + pnlText + ".";
        await loadJournal();
      });

      load().catch((err) => {
        document.getElementById("rows").innerHTML = "<tr><td colspan='6'>" + err.message + "</td></tr>";
      });
    </script>
  </body>
</html>
  `);
});

app.listen(port, () => {
  console.log(`Dashboard listening on http://localhost:${port}`);
});
