import { describe, expect, it } from "vitest";
import { runPipeline } from "../core/engine/src/runPipeline.js";

describe("pipeline integration", () => {
  it("runs parser -> weather research -> decision and returns decisions", async () => {
    delete process.env.DATABASE_URL;
    const result = await runPipeline();

    expect(result.decisions.length).toBeGreaterThan(0);
    expect(result.decisions[0]).toHaveProperty("recommendation");
    expect(result.decisions[0]).toHaveProperty("bestValueOpportunity");
  });
});
