import type { ScanResult, Severity } from "@sentinelai/core";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "\x1b[31m",
  high: "\x1b[91m",
  medium: "\x1b[33m",
  low: "\x1b[36m",
  info: "\x1b[90m",
};

const BAND_COLORS: Record<string, string> = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  orange: "\x1b[91m",
  red: "\x1b[31m",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export function formatTable(result: ScanResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(`${BOLD}SentinelAI Scan Report${RESET}`);
  lines.push(`Target: ${result.target}`);
  lines.push(`Type:   ${result.artifactType}`);
  lines.push(`Time:   ${result.timestamp}`);
  lines.push("");

  // Trust score
  const bandColor = BAND_COLORS[result.trustBand] ?? "";
  lines.push(
    `Trust Score: ${bandColor}${BOLD}${result.trustScore}/100 [${result.trustBand.toUpperCase()}]${RESET}`,
  );
  lines.push("");

  // Summary
  const { summary } = result;
  lines.push(
    `Findings: ${SEVERITY_COLORS.critical}${summary.critical} critical${RESET}  ` +
    `${SEVERITY_COLORS.high}${summary.high} high${RESET}  ` +
    `${SEVERITY_COLORS.medium}${summary.medium} medium${RESET}  ` +
    `${SEVERITY_COLORS.low}${summary.low} low${RESET}  ` +
    `${SEVERITY_COLORS.info}${summary.info} info${RESET}`,
  );
  lines.push("");

  if (result.findings.length === 0) {
    lines.push(`${BOLD}No findings. This artifact looks clean.${RESET}`);
    return lines.join("\n");
  }

  // Findings table
  lines.push(`${"Rule".padEnd(12)} ${"Severity".padEnd(10)} ${"Title".padEnd(45)} Location`);
  lines.push("-".repeat(90));

  for (const f of result.findings) {
    const color = SEVERITY_COLORS[f.severity];
    const location = f.line ? `${f.filePath}:${f.line}` : f.filePath;
    lines.push(
      `${f.ruleId.padEnd(12)} ${color}${f.severity.padEnd(10)}${RESET} ${f.title.slice(0, 45).padEnd(45)} ${location}`,
    );
    if (f.snippet) {
      lines.push(`             ${"\x1b[90m"}> ${f.snippet.slice(0, 80)}${RESET}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function formatJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
