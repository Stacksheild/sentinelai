export type TaskType =
  | "code-generation"
  | "code-review"
  | "summarization"
  | "chat"
  | "analysis"
  | "translation"
  | "extraction"
  | "creative";

export interface ModelProfile {
  model: string;
  provider: string;
  capabilities: Partial<Record<TaskType, number>>;
  pricing: {
    inputPerMtok: number;
    outputPerMtok: number;
  };
  maxContext: number;
  medianLatencyMs: number;
  outputSpeedTps: number;
}

export type RouteStrategy = "cost" | "quality" | "balanced";

export interface RouteRequest {
  taskType?: TaskType;
  prompt?: string;
  qualityFloor?: number;
  maxCostPerMtok?: number;
  maxLatencyMs?: number;
  strategy?: RouteStrategy;
}

export interface ModelScore {
  model: string;
  provider: string;
  score: number;
  qualityEstimate: number;
  estimatedCostPer1k: number;
  estimatedLatencyMs: number;
}

export interface RouteRecommendation {
  rankings: ModelScore[];
  selected: string;
  reasoning: string;
}
