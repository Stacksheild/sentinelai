export interface UsageRecord {
  id?: number;
  timestamp: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  project?: string;
  sessionId?: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelPricing {
  provider: string;
  model: string;
  inputPerMtok: number;
  outputPerMtok: number;
  cacheReadPerMtok?: number;
  cacheWritePerMtok?: number;
  effectiveDate: string;
}

export interface Budget {
  id?: number;
  name: string;
  project?: string;
  period: "daily" | "weekly" | "monthly";
  limitUsd: number;
  alertAtPct: number;
  webhookUrl?: string;
}

export interface CostReport {
  period: { start: string; end: string };
  totalCostUsd: number;
  breakdown: {
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    byProject: Record<string, number>;
  };
  trend: "increasing" | "stable" | "decreasing";
  prediction?: {
    horizonDays: number;
    projectedCostUsd: number;
    confidenceInterval: [number, number];
  };
}
