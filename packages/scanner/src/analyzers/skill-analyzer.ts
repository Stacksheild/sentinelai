import { readFileSync } from "node:fs";
import type { ScanFinding } from "@sentinelai/core";
import {
  DANGEROUS_SHELL_PATTERNS,
  severityForRuleId,
} from "./shared-patterns.js";

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
          severity: severityForRuleId(rule.ruleId),
          title: rule.title,
          description: rule.description,
          filePath,
          line: i + 1,
          snippet: line.trim(),
        });
      }
      rule.pattern.lastIndex = 0;
    }
  }

  // Hidden unicode characters (zero-width, RTL overrides)
  for (let i = 0; i < lines.length; i++) {
    if (/[\u200B\u200C\u200D\u2060\u202A-\u202E\uFEFF]/.test(lines[i])) {
      findings.push({
        ruleId: "OBFSC-003",
        severity: "high",
        title: "Hidden unicode characters",
        description:
          "Zero-width or bidirectional override characters detected — may hide malicious content",
        filePath,
        line: i + 1,
        snippet: lines[i].trim().slice(0, 80),
      });
    }
  }

  return findings;
}
