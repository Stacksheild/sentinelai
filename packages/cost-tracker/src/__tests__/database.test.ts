import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CostDatabase } from "../storage/database.js";
import type { UsageRecord } from "@sentinelai/core";

function makeRecord(overrides: Partial<UsageRecord> = {}): UsageRecord {
  return {
    timestamp: new Date().toISOString(),
    provider: "anthropic",
    model: "claude-haiku-3.5",
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUsd: 0.001,
    ...overrides,
  };
}

describe("CostDatabase", () => {
  let db: CostDatabase;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `sentinel-db-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
    db = new CostDatabase(join(tmpDir, "test.db"));
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("insertUsage / getReport", () => {
    it("getReport returns empty totals when no records exist", () => {
      const report = db.getReport("2020-01-01T00:00:00Z", "2030-01-01T00:00:00Z");
      expect(report.totalCostUsd).toBe(0);
      expect(report.breakdown.byProvider).toEqual({});
    });

    it("inserted record appears in the report", () => {
      db.insertUsage(makeRecord({ costUsd: 0.05, provider: "openai", model: "gpt-4o" }));
      const report = db.getReport("2020-01-01T00:00:00Z", "2030-01-01T00:00:00Z");
      expect(report.totalCostUsd).toBeCloseTo(0.05, 4);
    });

    it("aggregates costs by provider correctly", () => {
      db.insertUsage(makeRecord({ provider: "anthropic", costUsd: 0.10 }));
      db.insertUsage(makeRecord({ provider: "anthropic", costUsd: 0.05 }));
      db.insertUsage(makeRecord({ provider: "openai", costUsd: 0.20 }));
      const report = db.getReport("2020-01-01T00:00:00Z", "2030-01-01T00:00:00Z");
      expect(report.breakdown.byProvider["anthropic"]).toBeCloseTo(0.15, 4);
      expect(report.breakdown.byProvider["openai"]).toBeCloseTo(0.20, 4);
    });

    it("aggregates costs by model correctly", () => {
      db.insertUsage(makeRecord({ model: "claude-haiku-3.5", costUsd: 0.01 }));
      db.insertUsage(makeRecord({ model: "gpt-4o", provider: "openai", costUsd: 0.10 }));
      const report = db.getReport("2020-01-01T00:00:00Z", "2030-01-01T00:00:00Z");
      expect(report.breakdown.byModel["claude-haiku-3.5"]).toBeCloseTo(0.01, 4);
      expect(report.breakdown.byModel["gpt-4o"]).toBeCloseTo(0.10, 4);
    });

    it("aggregates costs by project correctly", () => {
      db.insertUsage(makeRecord({ project: "proj-a", costUsd: 0.30 }));
      db.insertUsage(makeRecord({ project: "proj-a", costUsd: 0.10 }));
      db.insertUsage(makeRecord({ project: "proj-b", costUsd: 0.50 }));
      const report = db.getReport("2020-01-01T00:00:00Z", "2030-01-01T00:00:00Z");
      expect(report.breakdown.byProject["proj-a"]).toBeCloseTo(0.40, 4);
      expect(report.breakdown.byProject["proj-b"]).toBeCloseTo(0.50, 4);
    });

    it("excludes records outside the time window", () => {
      db.insertUsage(makeRecord({ timestamp: "2023-01-01T00:00:00Z", costUsd: 9.99 }));
      const report = db.getReport("2024-01-01T00:00:00Z", "2030-01-01T00:00:00Z");
      expect(report.totalCostUsd).toBe(0);
    });

    it("trend is stable for flat usage", () => {
      const base = new Date("2025-01-01");
      for (let i = 0; i < 10; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        db.insertUsage(makeRecord({ timestamp: d.toISOString(), costUsd: 1.0 }));
      }
      const report = db.getReport("2024-01-01T00:00:00Z", "2030-01-01T00:00:00Z");
      expect(report.trend).toBe("stable");
    });
  });

  describe("getDailyCosts", () => {
    it("returns empty array when no records exist", () => {
      expect(db.getDailyCosts(30)).toHaveLength(0);
    });

    it("returns daily aggregated costs", () => {
      const today = new Date().toISOString();
      db.insertUsage(makeRecord({ timestamp: today, costUsd: 0.10 }));
      db.insertUsage(makeRecord({ timestamp: today, costUsd: 0.20 }));
      const rows = db.getDailyCosts(1);
      expect(rows[0]?.cost).toBeCloseTo(0.30, 4);
    });
  });

  describe("setBudget / getBudgets", () => {
    it("getBudgets returns empty array when no budgets exist", () => {
      expect(db.getBudgets()).toHaveLength(0);
    });

    it("inserted budget is returned with correct camelCase fields", () => {
      db.setBudget({
        name: "monthly-cap",
        period: "monthly",
        limitUsd: 500,
        alertAtPct: 80,
      });
      const budgets = db.getBudgets();
      expect(budgets).toHaveLength(1);
      expect(budgets[0]?.name).toBe("monthly-cap");
      expect(budgets[0]?.limitUsd).toBe(500);
      expect(budgets[0]?.alertAtPct).toBe(80);
      expect(budgets[0]?.period).toBe("monthly");
    });

    it("budget with optional fields round-trips correctly", () => {
      db.setBudget({
        name: "project-budget",
        period: "weekly",
        limitUsd: 100,
        alertAtPct: 70,
        project: "my-project",
        webhookUrl: "https://hooks.example.com/alert",
      });
      const b = db.getBudgets()[0]!;
      expect(b.project).toBe("my-project");
      expect(b.webhookUrl).toBe("https://hooks.example.com/alert");
    });

    it("optional fields are undefined when not set", () => {
      db.setBudget({ name: "bare", period: "daily", limitUsd: 10, alertAtPct: 90 });
      const b = db.getBudgets()[0]!;
      expect(b.project).toBeUndefined();
      expect(b.webhookUrl).toBeUndefined();
    });

    it("upserts on duplicate name", () => {
      db.setBudget({ name: "cap", period: "monthly", limitUsd: 100, alertAtPct: 80 });
      db.setBudget({ name: "cap", period: "monthly", limitUsd: 200, alertAtPct: 90 });
      const budgets = db.getBudgets();
      expect(budgets).toHaveLength(1);
      expect(budgets[0]?.limitUsd).toBe(200);
    });
  });
});
