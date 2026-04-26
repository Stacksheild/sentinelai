import { describe, it, expect } from "vitest";
import { calculateTrustScore, getTrustBand, summarizeFindings } from "../scoring/trust-score.js";
import type { ScanFinding } from "@sentinelai/core";

function finding(
  severity: ScanFinding["severity"],
  opts: { line?: number; filePath?: string; ruleId?: string } = {},
): ScanFinding {
  return {
    ruleId: opts.ruleId ?? "TEST-001",
    severity,
    title: "Test finding",
    description: "Test",
    filePath: opts.filePath ?? "/test/skill.md",
    line: opts.line,
  };
}

describe("calculateTrustScore", () => {
  it("returns 100 with no findings", () => {
    expect(calculateTrustScore([])).toBe(100);
  });

  it("deducts 40 for a single critical finding", () => {
    expect(calculateTrustScore([finding("critical", { line: 1 })])).toBe(60);
  });

  it("deducts 25 for a single high finding", () => {
    expect(calculateTrustScore([finding("high", { line: 1 })])).toBe(75);
  });

  it("deducts 10 for a single medium finding", () => {
    expect(calculateTrustScore([finding("medium", { line: 1 })])).toBe(90);
  });

  it("deducts 3 for a single low finding", () => {
    expect(calculateTrustScore([finding("low", { line: 1 })])).toBe(97);
  });

  it("deducts 0 for an info finding", () => {
    expect(calculateTrustScore([finding("info", { line: 1 })])).toBe(100);
  });

  it("floors at 0, never goes negative", () => {
    const findings = Array.from({ length: 10 }, (_, i) =>
      finding("critical", { line: i + 1 }),
    );
    expect(calculateTrustScore(findings)).toBe(0);
  });

  it("deduplicates multiple rules on the same line — only worst counts", () => {
    const findings = [
      finding("critical", { line: 5, ruleId: "EXFIL-001" }),
      finding("high", { line: 5, ruleId: "EXFIL-002" }),
    ];
    // Only critical counts: 100 - 40 = 60
    expect(calculateTrustScore(findings)).toBe(60);
  });

  it("does not deduplicate findings on different lines", () => {
    const findings = [
      finding("high", { line: 1, ruleId: "PRIV-001" }),
      finding("high", { line: 2, ruleId: "PRIV-002" }),
    ];
    // Both count: 100 - 25 - 25 = 50
    expect(calculateTrustScore(findings)).toBe(50);
  });

  it("deduplicates file-level findings (no line) per file — only worst counts", () => {
    const findings = [
      finding("high", { ruleId: "MCP-002" }),
      finding("medium", { ruleId: "MCP-003" }),
    ];
    // Both have no line, same file — only high counts: 100 - 25 = 75
    expect(calculateTrustScore(findings)).toBe(75);
  });

  it("counts file-level findings separately across different files", () => {
    const findings = [
      finding("high", { filePath: "/a/skill.md" }),
      finding("medium", { filePath: "/b/hooks.json" }),
    ];
    // Different files — both count: 100 - 25 - 10 = 65
    expect(calculateTrustScore(findings)).toBe(65);
  });
});

describe("getTrustBand", () => {
  it("returns green for 100", () => expect(getTrustBand(100)).toBe("green"));
  it("returns green for 90", () => expect(getTrustBand(90)).toBe("green"));
  it("returns yellow for 89", () => expect(getTrustBand(89)).toBe("yellow"));
  it("returns yellow for 70", () => expect(getTrustBand(70)).toBe("yellow"));
  it("returns orange for 69", () => expect(getTrustBand(69)).toBe("orange"));
  it("returns orange for 40", () => expect(getTrustBand(40)).toBe("orange"));
  it("returns red for 39", () => expect(getTrustBand(39)).toBe("red"));
  it("returns red for 0", () => expect(getTrustBand(0)).toBe("red"));
});

describe("summarizeFindings", () => {
  it("returns all-zero summary for empty findings", () => {
    expect(summarizeFindings([])).toEqual({
      critical: 0, high: 0, medium: 0, low: 0, info: 0,
    });
  });

  it("counts each severity correctly", () => {
    const findings = [
      finding("critical", { line: 1 }),
      finding("critical", { line: 2 }),
      finding("high", { line: 3 }),
      finding("medium", { line: 4 }),
      finding("info", { line: 5 }),
    ];
    expect(summarizeFindings(findings)).toEqual({
      critical: 2, high: 1, medium: 1, low: 0, info: 1,
    });
  });
});
