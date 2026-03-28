import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import type { ModelPricing } from "@sentinelai/core";

const __dirname = dirname(fileURLToPath(import.meta.url));

type PricingYaml = Record<string, Record<string, {
  input_per_mtok: number;
  output_per_mtok: number;
  cache_read_per_mtok?: number;
  cache_write_per_mtok?: number;
}>>;

let cachedPricing: ModelPricing[] | null = null;

export function loadPricing(overridePath?: string): ModelPricing[] {
  if (cachedPricing && !overridePath) return cachedPricing;

  const pricingPath = overridePath ?? resolve(__dirname, "pricing.yaml");
  const raw = readFileSync(pricingPath, "utf-8");
  const data = parseYaml(raw) as PricingYaml;

  const pricing: ModelPricing[] = [];

  for (const [provider, models] of Object.entries(data)) {
    for (const [model, rates] of Object.entries(models)) {
      pricing.push({
        provider,
        model,
        inputPerMtok: rates.input_per_mtok,
        outputPerMtok: rates.output_per_mtok,
        cacheReadPerMtok: rates.cache_read_per_mtok,
        cacheWritePerMtok: rates.cache_write_per_mtok,
        effectiveDate: new Date().toISOString().slice(0, 10),
      });
    }
  }

  if (!overridePath) cachedPricing = pricing;
  return pricing;
}

export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
): number {
  const pricing = loadPricing();
  const entry = pricing.find((p) => p.provider === provider && p.model === model);

  if (!entry) {
    throw new Error(`No pricing data for ${provider}/${model}. Update pricing.yaml or add an override.`);
  }

  let cost = 0;
  cost += (inputTokens / 1_000_000) * entry.inputPerMtok;
  cost += (outputTokens / 1_000_000) * entry.outputPerMtok;

  if (cacheReadTokens > 0 && entry.cacheReadPerMtok) {
    cost += (cacheReadTokens / 1_000_000) * entry.cacheReadPerMtok;
  }
  if (cacheWriteTokens > 0 && entry.cacheWritePerMtok) {
    cost += (cacheWriteTokens / 1_000_000) * entry.cacheWritePerMtok;
  }

  return Math.round(cost * 1_000_000) / 1_000_000;
}
