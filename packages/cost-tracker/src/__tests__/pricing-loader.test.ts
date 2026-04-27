import { describe, it, expect } from "vitest";
import { loadPricing, calculateCost } from "../providers/pricing-loader.js";

describe("loadPricing", () => {
  it("returns a non-empty list of pricing entries", () => {
    const pricing = loadPricing();
    expect(pricing.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const p of loadPricing()) {
      expect(typeof p.provider).toBe("string");
      expect(typeof p.model).toBe("string");
      expect(typeof p.inputPerMtok).toBe("number");
      expect(typeof p.outputPerMtok).toBe("number");
      expect(p.inputPerMtok).toBeGreaterThan(0);
      expect(p.outputPerMtok).toBeGreaterThan(0);
    }
  });

  it("includes anthropic models", () => {
    const pricing = loadPricing();
    expect(pricing.some((p) => p.provider === "anthropic")).toBe(true);
  });

  it("includes openai models", () => {
    const pricing = loadPricing();
    expect(pricing.some((p) => p.provider === "openai")).toBe(true);
  });
});

describe("calculateCost", () => {
  it("calculates cost for input tokens only", () => {
    // claude-haiku-3.5: input = 0.8 per Mtok
    // 1M tokens × 0.8 = $0.80
    const cost = calculateCost("anthropic", "claude-haiku-3.5", 1_000_000, 0);
    expect(cost).toBeCloseTo(0.8, 4);
  });

  it("calculates cost for output tokens only", () => {
    // claude-haiku-3.5: output = 4.0 per Mtok
    // 1M tokens × 4.0 = $4.00
    const cost = calculateCost("anthropic", "claude-haiku-3.5", 0, 1_000_000);
    expect(cost).toBeCloseTo(4.0, 4);
  });

  it("calculates combined input + output cost", () => {
    // 500k input @ 0.8/Mtok + 500k output @ 4.0/Mtok = 0.4 + 2.0 = $2.40
    const cost = calculateCost("anthropic", "claude-haiku-3.5", 500_000, 500_000);
    expect(cost).toBeCloseTo(2.4, 4);
  });

  it("adds cache read cost when provided", () => {
    // claude-haiku-3.5: cache_read = 0.08 per Mtok
    const withCache = calculateCost("anthropic", "claude-haiku-3.5", 0, 0, 1_000_000, 0);
    expect(withCache).toBeCloseTo(0.08, 4);
  });

  it("adds cache write cost when provided", () => {
    // claude-haiku-3.5: cache_write = 1.0 per Mtok
    const withCache = calculateCost("anthropic", "claude-haiku-3.5", 0, 0, 0, 1_000_000);
    expect(withCache).toBeCloseTo(1.0, 4);
  });

  it("returns 0 for zero tokens", () => {
    expect(calculateCost("anthropic", "claude-haiku-3.5", 0, 0)).toBe(0);
  });

  it("throws for unknown provider/model combination", () => {
    expect(() => calculateCost("unknown-provider", "unknown-model", 100, 100)).toThrow();
  });

  it("calculates correct cost for gpt-4o", () => {
    // gpt-4o: input=2.5, output=10.0 per Mtok
    // 100k input + 100k output = 0.25 + 1.0 = $1.25
    const cost = calculateCost("openai", "gpt-4o", 100_000, 100_000);
    expect(cost).toBeCloseTo(1.25, 4);
  });
});
