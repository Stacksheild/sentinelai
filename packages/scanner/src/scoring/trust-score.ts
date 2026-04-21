import type { ScanFinding, Severity, TrustBand } from "@sentinelai/core";

const SEVERITY_POINTS: Record<Severity, number> = {
  critical: 40,
  high: 25,
  medium: 10,
  low: 3,
  info: 0,
};

export function calculateTrustScore(findings: ScanFinding[]): number {
  // Deduplicate by (filePath, line) before summing deductions: when multiple
  // rules match the same line, keep only the highest-severity finding for
  // scoring. This prevents a single malicious line from stacking deductions
  // (e.g. EXFIL-001 and EXFIL-002 both firing on one `curl | bash` line).
  // The findings list itself is unchanged — only the score calculation
  // is de-duplicated.
  const severityRank: Record<Severity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0,
  };

  const byLocation = new Map<string, ScanFinding>();
  for (const finding of findings) {
    const key = `${finding.filePath}:${finding.line ?? "file"}`;
    const existing = byLocation.get(key);
    if (!existing || severityRank[finding.severity] > severityRank[existing.severity]) {
      byLocation.set(key, finding);
    }
  }

  let deduction = 0;
  for (const finding of byLocation.values()) {
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
