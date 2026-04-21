import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import type {
  ModelProfile,
  RouteRequest,
  RouteRecommendation,
  ModelScore,
  TaskType,
  RouteStrategy,
} from "@sentinelai/core";
import { classifyTask } from "../classifier/task-classifier.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RouteWeights {
  quality: number;
  cost: number;
  latency: number;
}

const DEFAULT_WEIGHTS: Record<RouteStrategy, RouteWeights> = {
  cost: { quality: 0.2, cost: 0.6, latency: 0.2 },
  quality: { quality: 0.7, cost: 0.1, latency: 0.2 },
  balanced: { quality: 0.5, cost: 0.3, latency: 0.2 },
};

function loadProfiles(): ModelProfile[] {
  const profilePath = resolve(__dirname, "../profiles/models.yaml");
  const raw = readFileSync(profilePath, "utf-8");
  return parseYaml(raw) as ModelProfile[];
}

export function recommend(
  request: RouteRequest,
  customWeights?: RouteWeights,
  allowedProviders?: string[],
): RouteRecommendation {
  const profiles = loadProfiles();
  const taskType = request.taskType ?? (request.prompt ? classifyTask(request.prompt) : "chat");
  const strategy = request.strategy ?? "balanced";
  const weights = customWeights ?? DEFAULT_WEIGHTS[strategy];

  // Filter models
  let candidates = profiles;

  if (allowedProviders?.length) {
    candidates = candidates.filter((p) => allowedProviders.includes(p.provider));
  }

  if (request.maxCostPerMtok !== undefined) {
    candidates = candidates.filter(
      (p) => p.pricing.inputPerMtok <= request.maxCostPerMtok!,
    );
  }

if (request.maxLatencyMs !== undefined) {
    candidates = candidates.filter(
      (p) => p.medianLatencyMs <= request.maxLatencyMs!,
    );
  }

  if (request.qualityFloor !== undefined) {
    const taskTypeForFilter =
      request.taskType ?? (request.prompt ? classifyTask(request.prompt) : "chat");
    candidates = candidates.filter(
      (p) => (p.capabilities[taskTypeForFilter] ?? 0) >= request.qualityFloor!,
    );
  }

  if (candidates.length === 0) {
    return {
      rankings: [],
      selected: "none",
      reasoning: "No models match the given constraints. Try relaxing cost or latency limits.",
    };
  }

  // Normalize values for scoring
  const maxCost = Math.max(...candidates.map((p) => p.pricing.outputPerMtok));
  const maxLatency = Math.max(...candidates.map((p) => p.medianLatencyMs));
  const maxQuality = 5.0;

  // Score each model
  const scored: ModelScore[] = candidates.map((profile) => {
    const quality = profile.capabilities[taskType] ?? 3.0;
    const normalizedQuality = quality / maxQuality;
    const normalizedCost = 1 - (profile.pricing.outputPerMtok / maxCost);
    const normalizedLatency = 1 - (profile.medianLatencyMs / maxLatency);

    const score =
      normalizedQuality * weights.quality +
      normalizedCost * weights.cost +
      normalizedLatency * weights.latency;

    // Average cost per 1k tokens (assuming 1:1 input:output ratio)
    const avgCostPer1k =
      ((profile.pricing.inputPerMtok + profile.pricing.outputPerMtok) / 2) / 1000;

    return {
      model: profile.model,
      provider: profile.provider,
      score: Math.round(score * 1000) / 1000,
      qualityEstimate: quality,
      estimatedCostPer1k: Math.round(avgCostPer1k * 10000) / 10000,
      estimatedLatencyMs: profile.medianLatencyMs,
    };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const selected = scored[0];
  const reasoning = buildReasoning(selected, taskType, strategy);

  return {
    rankings: scored,
    selected: `${selected.provider}/${selected.model}`,
    reasoning,
  };
}

function buildReasoning(top: ModelScore, taskType: TaskType, strategy: RouteStrategy): string {
  const parts: string[] = [];
  parts.push(`Best match for "${taskType}" with "${strategy}" strategy.`);
  parts.push(`${top.provider}/${top.model} scores ${top.qualityEstimate}/5.0 on ${taskType}`);
  parts.push(`at $${top.estimatedCostPer1k}/1k tokens`);
  parts.push(`with ~${top.estimatedLatencyMs}ms latency.`);
  return parts.join(" ");
}
