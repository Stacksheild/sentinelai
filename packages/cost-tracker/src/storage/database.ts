import Database from "better-sqlite3";
import { mkdirSync, chmodSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { UsageRecord, CostReport, Budget } from "@sentinelai/core";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS usage_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       TEXT NOT NULL,
    provider        TEXT NOT NULL,
    model           TEXT NOT NULL,
    input_tokens    INTEGER NOT NULL,
    output_tokens   INTEGER NOT NULL,
    cache_read_tokens  INTEGER DEFAULT 0,
    cache_write_tokens INTEGER DEFAULT 0,
    cost_usd        REAL NOT NULL,
    project         TEXT,
    session_id      TEXT,
    latency_ms      INTEGER,
    metadata        TEXT
  );

  CREATE TABLE IF NOT EXISTS pricing (
    provider          TEXT NOT NULL,
    model             TEXT NOT NULL,
    input_per_mtok    REAL NOT NULL,
    output_per_mtok   REAL NOT NULL,
    cache_read_per_mtok  REAL,
    cache_write_per_mtok REAL,
    effective_date    TEXT NOT NULL,
    PRIMARY KEY (provider, model, effective_date)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    project       TEXT,
    period        TEXT NOT NULL,
    limit_usd     REAL NOT NULL,
    alert_at_pct  REAL DEFAULT 80.0,
    webhook_url   TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_log(timestamp);
  CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_log(provider);
  CREATE INDEX IF NOT EXISTS idx_usage_model ON usage_log(model);
  CREATE INDEX IF NOT EXISTS idx_usage_project ON usage_log(project);
`;

export class CostDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure parent directory exists and the DB file is created with
    // restrictive permissions (0600) on POSIX. On Windows, chmod is a no-op.
    const parent = dirname(dbPath);
    if (parent && parent !== "." && !existsSync(parent)) {
      mkdirSync(parent, { recursive: true, mode: 0o700 });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(SCHEMA);

    if (process.platform !== "win32") {
      try {
        chmodSync(dbPath, 0o600);
      } catch {
        // Best effort — don't fail the caller if chmod isn't permitted.
      }
    }
  }

  insertUsage(record: UsageRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO usage_log (timestamp, provider, model, input_tokens, output_tokens,
        cache_read_tokens, cache_write_tokens, cost_usd, project, session_id, latency_ms, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.timestamp,
      record.provider,
      record.model,
      record.inputTokens,
      record.outputTokens,
      record.cacheReadTokens,
      record.cacheWriteTokens,
      record.costUsd,
      record.project ?? null,
      record.sessionId ?? null,
      record.latencyMs ?? null,
      record.metadata ? JSON.stringify(record.metadata) : null,
    );
  }

  getReport(start: string, end: string): CostReport {
    const rows = this.db.prepare(`
      SELECT provider, model, project, cost_usd
      FROM usage_log
      WHERE timestamp >= ? AND timestamp <= ?
    `).all(start, end) as Array<{
      provider: string;
      model: string;
      project: string | null;
      cost_usd: number;
    }>;

    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    const byProject: Record<string, number> = {};
    let total = 0;

    for (const row of rows) {
      total += row.cost_usd;
      byProvider[row.provider] = (byProvider[row.provider] ?? 0) + row.cost_usd;
      byModel[row.model] = (byModel[row.model] ?? 0) + row.cost_usd;
      if (row.project) {
        byProject[row.project] = (byProject[row.project] ?? 0) + row.cost_usd;
      }
    }

    // Simple trend detection using daily costs
    const dailyCosts = this.db.prepare(`
      SELECT date(timestamp) as day, SUM(cost_usd) as daily_cost
      FROM usage_log
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY day
      ORDER BY day
    `).all(start, end) as Array<{ day: string; daily_cost: number }>;

    let trend: CostReport["trend"] = "stable";
    if (dailyCosts.length >= 3) {
      const mid = Math.floor(dailyCosts.length / 2);
      const firstHalf = dailyCosts.slice(0, mid).reduce((s, r) => s + r.daily_cost, 0) / mid;
      const secondHalf = dailyCosts.slice(mid).reduce((s, r) => s + r.daily_cost, 0) / (dailyCosts.length - mid);

      if (secondHalf > firstHalf * 1.15) trend = "increasing";
      else if (secondHalf < firstHalf * 0.85) trend = "decreasing";
    }

    return {
      period: { start, end },
      totalCostUsd: Math.round(total * 100) / 100,
      breakdown: { byProvider, byModel, byProject },
      trend,
    };
  }

  getDailyCosts(days: number): Array<{ day: string; cost: number }> {
    const rows = this.db.prepare(`
      SELECT date(timestamp) as day, SUM(cost_usd) as cost
      FROM usage_log
      WHERE timestamp >= date('now', ?)
      GROUP BY day
      ORDER BY day
    `).all(`-${days} days`) as Array<{ day: string; cost: number }>;

    return rows;
  }

  setBudget(budget: Budget): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO budgets (name, project, period, limit_usd, alert_at_pct, webhook_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(budget.name, budget.project ?? null, budget.period, budget.limitUsd, budget.alertAtPct, budget.webhookUrl ?? null);
  }

  getBudgets(): Budget[] {
    return this.db.prepare("SELECT * FROM budgets").all() as Budget[];
  }

  close(): void {
    this.db.close();
  }
}
