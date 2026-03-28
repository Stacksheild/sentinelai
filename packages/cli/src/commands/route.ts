import { Command } from "commander";
import { recommend } from "@sentinelai/model-router";
import { loadConfig } from "@sentinelai/core";
import type { TaskType, RouteStrategy } from "@sentinelai/core";

const VALID_TASKS: TaskType[] = [
  "code-generation", "code-review", "summarization", "chat",
  "analysis", "translation", "extraction", "creative",
];

export const routeCommand = new Command("route")
  .description("Get a model recommendation for your task")
  .argument("[task-type]", `Task type: ${VALID_TASKS.join(", ")}`)
  .option("-q, --quality <level>", "Minimum quality (1-5)")
  .option("--max-cost <usd>", "Maximum cost per million input tokens")
  .option("--max-latency <ms>", "Maximum acceptable latency in ms")
  .option("-s, --strategy <strategy>", "Routing strategy: cost, quality, balanced", "balanced")
  .option("-p, --prompt <text>", "Prompt text for auto-classification")
  .option("-f, --format <format>", "Output format: table, json", "table")
  .action((taskType: string | undefined, opts: {
    quality?: string;
    maxCost?: string;
    maxLatency?: string;
    strategy: string;
    prompt?: string;
    format: string;
  }) => {
    const config = loadConfig();

    const result = recommend(
      {
        taskType: taskType as TaskType | undefined,
        prompt: opts.prompt,
        qualityFloor: opts.quality ? parseFloat(opts.quality) : undefined,
        maxCostPerMtok: opts.maxCost ? parseFloat(opts.maxCost) : undefined,
        maxLatencyMs: opts.maxLatency ? parseInt(opts.maxLatency, 10) : undefined,
        strategy: opts.strategy as RouteStrategy,
      },
      undefined, // Let the strategy determine weights
      config.router.allowedProviders,
    );

    if (opts.format === "json") {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log("\nModel Recommendation");
    console.log(`Selected: ${result.selected}`);
    console.log(`Reason:   ${result.reasoning}`);
    console.log("");

    console.log(
      `${"Rank".padEnd(5)} ${"Model".padEnd(35)} ${"Provider".padEnd(12)} ` +
      `${"Score".padEnd(7)} ${"Quality".padEnd(9)} ${"$/1k tok".padEnd(10)} ${"Latency".padEnd(8)}`,
    );
    console.log("-".repeat(90));

    result.rankings.forEach((m, i) => {
      const selected = i === 0 ? ">" : " ";
      console.log(
        `${selected}${String(i + 1).padEnd(4)} ${m.model.padEnd(35)} ${m.provider.padEnd(12)} ` +
        `${m.score.toFixed(3).padEnd(7)} ${m.qualityEstimate.toFixed(1).padEnd(9)} ` +
        `$${m.estimatedCostPer1k.toFixed(4).padEnd(9)} ${m.estimatedLatencyMs}ms`,
      );
    });
    console.log("");
  });
