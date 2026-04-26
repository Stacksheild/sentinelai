import { describe, it, expect } from "vitest";
import { recommend } from "../router/recommend.js";

describe("recommend", () => {
  describe("basic routing", () => {
    it("returns a non-empty rankings list for a basic request", () => {
      const result = recommend({ taskType: "chat" });
      expect(result.rankings.length).toBeGreaterThan(0);
    });

    it("populates the selected field", () => {
      const result = recommend({ taskType: "code-generation" });
      expect(result.selected).not.toBe("");
      expect(result.selected).toContain("/");
    });

    it("populates the reasoning field", () => {
      const result = recommend({ taskType: "analysis" });
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("rankings are sorted by score descending", () => {
      const result = recommend({ taskType: "code-generation", strategy: "balanced" });
      for (let i = 1; i < result.rankings.length; i++) {
        expect(result.rankings[i - 1]!.score).toBeGreaterThanOrEqual(result.rankings[i]!.score);
      }
    });

    it("selected matches the top-ranked model", () => {
      const result = recommend({ taskType: "summarization" });
      const top = result.rankings[0]!;
      expect(result.selected).toBe(`${top.provider}/${top.model}`);
    });
  });

  describe("strategy", () => {
    it("cost strategy prefers cheaper models", () => {
      const cost = recommend({ taskType: "chat", strategy: "cost" });
      const quality = recommend({ taskType: "chat", strategy: "quality" });
      // Top cost pick should have lower or equal price than top quality pick
      expect(cost.rankings[0]!.estimatedCostPer1k).toBeLessThanOrEqual(
        quality.rankings[0]!.estimatedCostPer1k + 0.001,
      );
    });

    it("quality strategy prefers higher quality models", () => {
      const quality = recommend({ taskType: "code-generation", strategy: "quality" });
      const cost = recommend({ taskType: "code-generation", strategy: "cost" });
      // Top quality pick should have equal or higher qualityEstimate than top cost pick
      expect(quality.rankings[0]!.qualityEstimate).toBeGreaterThanOrEqual(
        cost.rankings[0]!.qualityEstimate - 0.1,
      );
    });
  });

  describe("filters", () => {
    it("allowedProviders restricts candidates to that provider", () => {
      const result = recommend({ taskType: "chat" }, undefined, ["openai"]);
      expect(result.rankings.every((m) => m.provider === "openai")).toBe(true);
    });

    it("returns no results when allowedProviders has no match", () => {
      const result = recommend({ taskType: "chat" }, undefined, ["nonexistent-provider"]);
      expect(result.rankings).toHaveLength(0);
      expect(result.selected).toBe("none");
    });

    it("maxCostPerMtok filters out expensive models", () => {
      // 0.2 /Mtok threshold keeps only models with inputPerMtok <= 0.2 (gpt-4o-mini, gemini-flash*)
      // all of which also have low output prices, so estimatedCostPer1k stays under 0.001
      const result = recommend({ taskType: "chat", maxCostPerMtok: 0.2 });
      expect(result.rankings.length).toBeGreaterThan(0);
      expect(result.rankings.every((m) => m.estimatedCostPer1k <= 0.001)).toBe(true);
    });

    it("maxLatencyMs filters out slow models", () => {
      const result = recommend({ taskType: "chat", maxLatencyMs: 500 });
      expect(result.rankings.every((m) => m.estimatedLatencyMs <= 500)).toBe(true);
    });

    it("qualityFloor filters out low-quality models", () => {
      const result = recommend({ taskType: "code-generation", qualityFloor: 4.5 });
      expect(result.rankings.every((m) => m.qualityEstimate >= 4.5)).toBe(true);
    });

    it("qualityFloor of 5.0 returns empty for most task types", () => {
      // No model scores 5.0 on any task (max in yaml is 4.9)
      const result = recommend({ taskType: "chat", qualityFloor: 5.0 });
      expect(result.rankings).toHaveLength(0);
      expect(result.selected).toBe("none");
    });
  });

  describe("prompt-based classification", () => {
    it("classifies a code generation prompt and routes accordingly", () => {
      const withPrompt = recommend({ prompt: "write a function to sort an array" });
      const explicit = recommend({ taskType: "code-generation" });
      expect(withPrompt.selected).toBe(explicit.selected);
    });
  });

  describe("model score fields", () => {
    it("every ranking has required score fields", () => {
      const result = recommend({ taskType: "analysis" });
      for (const m of result.rankings) {
        expect(typeof m.score).toBe("number");
        expect(typeof m.qualityEstimate).toBe("number");
        expect(typeof m.estimatedCostPer1k).toBe("number");
        expect(typeof m.estimatedLatencyMs).toBe("number");
        expect(m.provider.length).toBeGreaterThan(0);
        expect(m.model.length).toBeGreaterThan(0);
      }
    });
  });
});
