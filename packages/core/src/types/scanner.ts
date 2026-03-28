export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type TrustBand = "green" | "yellow" | "orange" | "red";
export type ArtifactType = "skill" | "mcp-server" | "hook" | "connector";

export interface ScanFinding {
  ruleId: string;
  severity: Severity;
  title: string;
  description: string;
  filePath: string;
  line?: number;
  column?: number;
  snippet?: string;
  cwe?: string;
  remediation?: string;
}

export interface ScanResult {
  target: string;
  artifactType: ArtifactType;
  timestamp: string;
  durationMs: number;
  findings: ScanFinding[];
  trustScore: number;
  trustBand: TrustBand;
  summary: Record<Severity, number>;
}

export interface ScanRule {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  analyzers: string[];
  pattern: {
    type: "regex" | "ast" | "semantic";
    value: string;
    exclude?: string[];
  };
  metadata?: {
    cwe?: string;
    references?: string[];
  };
}
