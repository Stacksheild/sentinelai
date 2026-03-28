import { readFileSync } from "node:fs";
import type { ScanFinding, ScanRule } from "@sentinelai/core";

const DANGEROUS_SHELL_PATTERNS: Array<{ pattern: RegExp; ruleId: string; title: string; description: string }> = [
  {
    pattern: /curl\s+.*\|\s*(ba)?sh/gi,
    ruleId: "EXFIL-001",
    title: "Pipe to shell from remote URL",
    description: "Detected curl piped to shell — downloads and executes remote code",
  },
  {
    pattern: /(curl|wget|fetch)\s+["']?https?:\/\/(?!localhost|127\.0\.0\.1|github\.com)/gi,
    ruleId: "EXFIL-002",
    title: "Outbound HTTP to non-standard domain",
    description: "HTTP request to an external domain detected in skill instructions",
  },
  {
    pattern: /\beval\s*\(/gi,
    ruleId: "OBFSC-001",
    title: "Dynamic code evaluation",
    description: "eval() can execute arbitrary code and hide malicious intent",
  },
  {
    pattern: /base64\s+(--decode|-d)/gi,
    ruleId: "OBFSC-002",
    title: "Base64 decode in command",
    description: "Base64 decoding may hide malicious payloads",
  },
  {
    pattern: /\$\(.*\bcat\b.*\/(\.env|\.aws|\.ssh|credentials)/gi,
    ruleId: "CRED-001",
    title: "Credential file access",
    description: "Accessing sensitive credential files (.env, .aws, .ssh)",
  },
  {
    pattern: /\b(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY)\b/gi,
    ruleId: "CRED-002",
    title: "Sensitive environment variable reference",
    description: "References to sensitive environment variable names",
  },
  {
    pattern: /rm\s+(-rf?|--force)\s+[~\/]/gi,
    ruleId: "PRIV-001",
    title: "Destructive filesystem operation",
    description: "Force-removing files outside the project directory",
  },
  {
    pattern: /sudo\s+/gi,
    ruleId: "PRIV-002",
    title: "Privilege escalation via sudo",
    description: "sudo usage in a skill is unexpected and risky",
  },
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|guidelines)/gi,
    ruleId: "INJECT-001",
    title: "Prompt injection — instruction override",
    description: "Attempts to override system instructions",
  },
  {
    pattern: /you\s+are\s+(now|no\s+longer)\s+/gi,
    ruleId: "INJECT-002",
    title: "Prompt injection — role hijacking",
    description: "Attempts to redefine the AI's role",
  },
  {
    pattern: /\bdocker\.sock\b/gi,
    ruleId: "PRIV-003",
    title: "Docker socket access",
    description: "Accessing the Docker socket grants full host control",
  },
  {
    pattern: /chmod\s+[0-7]*7[0-7]*\s/gi,
    ruleId: "PRIV-004",
    title: "World-writable permission set",
    description: "Setting world-writable permissions on files",
  },
];

export function analyzeSkill(filePath: string): ScanFinding[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const findings: ScanFinding[] = [];

  for (const rule of DANGEROUS_SHELL_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (rule.pattern.test(line)) {
        findings.push({
          ruleId: rule.ruleId,
          severity: getSeverity(rule.ruleId),
          title: rule.title,
          description: rule.description,
          filePath,
          line: i + 1,
          snippet: line.trim(),
        });
      }
      // Reset regex lastIndex for global patterns
      rule.pattern.lastIndex = 0;
    }
  }

  // Check for hidden unicode characters (zero-width spaces, RTL overrides)
  for (let i = 0; i < lines.length; i++) {
    if (/[\u200B\u200C\u200D\u2060\u202A-\u202E\uFEFF]/.test(lines[i])) {
      findings.push({
        ruleId: "OBFSC-003",
        severity: "high",
        title: "Hidden unicode characters",
        description: "Zero-width or bidirectional override characters detected — may hide malicious content",
        filePath,
        line: i + 1,
        snippet: lines[i].trim().slice(0, 80),
      });
    }
  }

  return findings;
}

function getSeverity(ruleId: string): ScanFinding["severity"] {
  const prefix = ruleId.split("-")[0];
  switch (prefix) {
    case "EXFIL": return "critical";
    case "INJECT": return "high";
    case "CRED": return "high";
    case "PRIV": return "high";
    case "OBFSC": return "medium";
    case "SUPPLY": return "medium";
    default: return "info";
  }
}
