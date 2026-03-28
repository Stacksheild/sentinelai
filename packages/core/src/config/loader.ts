import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

export interface SentinelConfig {
  scanner: {
    rulesDir?: string;
    exclude: string[];
    severityThreshold: string;
  };
  cost: {
    storage: string;
    proxyPort: number;
    defaultProject?: string;
    pricingOverrides?: Record<string, Record<string, { inputPerMtok: number; outputPerMtok: number }>>;
    budgets: Array<{
      name: string;
      limitUsd: number;
      period: string;
      alertAtPct: number;
    }>;
  };
  router: {
    strategy: string;
    weights: { quality: number; cost: number; latency: number };
    allowedProviders?: string[];
    blockedModels?: string[];
  };
}

const DEFAULT_CONFIG: SentinelConfig = {
  scanner: {
    exclude: ["node_modules/**", "**/*.test.*", "**/*.spec.*"],
    severityThreshold: "low",
  },
  cost: {
    storage: "./sentinelai.db",
    proxyPort: 9191,
    budgets: [],
  },
  router: {
    strategy: "balanced",
    weights: { quality: 0.5, cost: 0.3, latency: 0.2 },
  },
};

const CONFIG_FILENAMES = [
  "sentinelai.config.yaml",
  "sentinelai.config.yml",
  ".sentinelairc.yaml",
];

export function loadConfig(cwd: string = process.cwd()): SentinelConfig {
  for (const filename of CONFIG_FILENAMES) {
    const filepath = resolve(cwd, filename);
    if (existsSync(filepath)) {
      const raw = readFileSync(filepath, "utf-8");
      const parsed = parseYaml(raw) as Partial<SentinelConfig>;
      return mergeConfig(DEFAULT_CONFIG, parsed);
    }
  }
  return DEFAULT_CONFIG;
}

function mergeConfig(
  defaults: SentinelConfig,
  overrides: Partial<SentinelConfig>,
): SentinelConfig {
  return {
    scanner: { ...defaults.scanner, ...overrides.scanner },
    cost: { ...defaults.cost, ...overrides.cost },
    router: {
      ...defaults.router,
      ...overrides.router,
      weights: {
        ...defaults.router.weights,
        ...overrides.router?.weights,
      },
    },
  };
}
