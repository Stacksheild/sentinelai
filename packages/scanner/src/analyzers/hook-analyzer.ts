import { readFileSync } from "node:fs";
import type { ScanFinding } from "@sentinelai/core";

interface HookDef {
  type?: string;
  command?: string;
}

interface HookEvent {
  matcher?: string;
  hooks?: HookDef[];
}

type HooksConfig = Record<string, HookEvent[]>;

export function analyzeHooks(filePath: string): ScanFinding[] {
  const content = readFileSync(filePath, "utf-8");
  let config: HooksConfig;

  try {
    config = JSON.parse(content) as HooksConfig;
  } catch {
    return [{
      ruleId: "HOOK-001",
      severity: "info",
      title: "Invalid JSON in hooks config",
      description: "Could not parse hooks configuration",
      filePath,
    }];
  }

  const findings: ScanFinding[] = [];

for (const [eventName, events] of Object.entries(config)) {
    if (!Array.isArray(events)) continue;

    const findingsBeforeEvent = findings.length;

    for (const event of events) {
      if (!event.hooks) continue;

      for (const hook of event.hooks) {
        if (hook.type !== "command" || !hook.command) continue;

        const cmd = hook.command;

        // Network exfiltration
        if (/curl|wget|nc\b|ncat|fetch/.test(cmd)) {
          findings.push({
            ruleId: "EXFIL-005",
            severity: "critical",
            title: `Hook "${eventName}" makes network request`,
            description: "Hook command contacts external services — may exfiltrate data",
            filePath,
            snippet: cmd.slice(0, 120),
          });
        }

        // Reading sensitive files
        if (/\.(env|aws\/credentials|ssh\/|gnupg|netrc)/.test(cmd)) {
          findings.push({
            ruleId: "CRED-003",
            severity: "critical",
            title: `Hook "${eventName}" accesses credentials`,
            description: "Hook command reads sensitive credential files",
            filePath,
            snippet: cmd.slice(0, 120),
          });
        }

        // Environment variable harvesting
        if (/\benv\b|printenv|set\s*$|export\s*$/.test(cmd)) {
          findings.push({
            ruleId: "CRED-004",
            severity: "high",
            title: `Hook "${eventName}" enumerates environment`,
            description: "Hook dumps environment variables which may contain secrets",
            filePath,
            snippet: cmd.slice(0, 120),
          });
        }

        // Writing outside project
        if (/>\s*[~\/]|>>\s*[~\/]|tee\s+[~\/]/.test(cmd)) {
          findings.push({
            ruleId: "PRIV-005",
            severity: "high",
            title: `Hook "${eventName}" writes outside project`,
            description: "Hook redirects output to files outside the project directory",
            filePath,
            snippet: cmd.slice(0, 120),
          });
        }

        // Obfuscated commands
        if (/base64|xxd|openssl\s+(enc|s_client)|python\s+-c|node\s+-e/.test(cmd)) {
          findings.push({
            ruleId: "OBFSC-005",
            severity: "high",
            title: `Hook "${eventName}" uses inline code execution`,
            description: "Hook runs inline code which may hide malicious behavior",
            filePath,
            snippet: cmd.slice(0, 120),
          });
        }

        }
    }

    // After processing all hooks for this event: if this is SessionStart
    // and we found anything suspicious during this event group, emit
    // HOOK-002 once (not once per inner hook).
    if (eventName === "SessionStart" && findings.length > findingsBeforeEvent) {
      findings.push({
        ruleId: "HOOK-002",
        severity: "high",
        title: "Suspicious SessionStart hook",
        description:
          "SessionStart hooks execute on every session — any malicious behavior is persistent",
        filePath,
      });
    }
  }

  return findings;
}
