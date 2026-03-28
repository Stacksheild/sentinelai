import type { ScanFinding, Severity, TrustBand } from "@sentinelai/core";

const SEVERITY_POINTS: Record<Severity, number> = {
  critical: 40,
  high: 25,
  medium: 10,
  low: 3,
  info: 0,
};

export function calculateTrustScore(findings: ScanFinding[]): number {
  let deduction = 0;

  for (const finding of findings) {
    deduction += SEVERITY_POINTS[finding.severity];
  }

  return Math.max(0, 100 - deduction);
}

export function getTrustBand(score: number): TrustBand {
  if (score >= 90) return "green";
  if (score >= 70) return "yellow";
  if (score >= 40) return "orange";
  return "red";
}

export function summarizeFindings(findings: ScanFinding[]): Record<Severity, number> {
  const summary: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const finding of findings) {
    summary[finding.severity]++;
  }

  return summary;
}
