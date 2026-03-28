import { readdirSync, statSync, existsSync } from "node:fs";
import { resolve, basename, extname } from "node:path";
import type { ArtifactType, ScanFinding, ScanResult } from "@sentinelai/core";
import { analyzeSkill } from "./analyzers/skill-analyzer.js";
import { analyzeMcpConfig } from "./analyzers/mcp-analyzer.js";
import { analyzeHooks } from "./analyzers/hook-analyzer.js";
import { calculateTrustScore, getTrustBand, summarizeFindings } from "./scoring/trust-score.js";

export { formatTable, formatJson } from "./reporters/table-reporter.js";

function detectArtifactType(filePath: string): ArtifactType | null {
  const name = basename(filePath).toLowerCase();
  const ext = extname(filePath).toLowerCase();

  if (name === "skill.md") return "skill";
  if (name === "hooks.json") return "hook";
  if (name.includes("mcp") && ext === ".json") return "mcp-server";
  if (name === ".mcp.json" || name === "mcp.json") return "mcp-server";

  return null;
}

function findScanTargets(dir: string): Array<{ path: string; type: ArtifactType }> {
  const targets: Array<{ path: string; type: ArtifactType }> = [];

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = resolve(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        walk(fullPath);
      } else {
        const type = detectArtifactType(fullPath);
        if (type) {
          targets.push({ path: fullPath, type });
        }
      }
    }
  }

  walk(dir);
  return targets;
}

function analyzeFile(filePath: string, type: ArtifactType): ScanFinding[] {
  switch (type) {
    case "skill":
      return analyzeSkill(filePath);
    case "mcp-server":
      return analyzeMcpConfig(filePath);
    case "hook":
      return analyzeHooks(filePath);
    case "connector":
      // Connector analyzer is a future addition
      return [];
    default:
      return [];
  }
}

export function scanPath(targetPath: string): ScanResult[] {
  const resolvedPath = resolve(targetPath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Path does not exist: ${resolvedPath}`);
  }

  const stat = statSync(resolvedPath);
  const targets = stat.isDirectory()
    ? findScanTargets(resolvedPath)
    : (() => {
        const type = detectArtifactType(resolvedPath);
        return type ? [{ path: resolvedPath, type }] : [];
      })();

  if (targets.length === 0) {
    return [];
  }

  const results: ScanResult[] = [];
  const startTime = Date.now();

  for (const target of targets) {
    const findings = analyzeFile(target.path, target.type);
    const trustScore = calculateTrustScore(findings);

    results.push({
      target: target.path,
      artifactType: target.type,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      findings,
      trustScore,
      trustBand: getTrustBand(trustScore),
      summary: summarizeFindings(findings),
    });
  }

  return results;
}
