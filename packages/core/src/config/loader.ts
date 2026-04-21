import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";
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
function defaultStoragePath(): string {
  // Prefer XDG_DATA_HOME on Linux/macOS, fallback to ~/.local/share.
  // On Windows, use LOCALAPPDATA.
  const xdg = process.env.XDG_DATA_HOME;
  if (xdg) return join(xdg, "sentinelai", "usage.db");

  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    return join(local, "sentinelai", "usage.db");
  }

  return join(homedir(), ".local", "share", "sentinelai", "usage.db");
}

const DEFAULT_CONFIG: SentinelConfig = {
  scanner: {
    exclude: ["node_modules/**", "**/*.test.*", "**/*.spec.*"],
    severityThreshold: "low",
  },
  cost: {
    storage: defaultStoragePath(),
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
