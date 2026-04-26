import { readFileSync } from "node:fs";
import type { ScanFinding } from "@sentinelai/core";
import {
  DANGEROUS_SHELL_PATTERNS,
  severityForRuleId,
} from "./shared-patterns.js";

interface McpToolDef {
  name?: string;
  description?: string;
  inputSchema?: {
    properties?: Record<string, { type?: string; description?: string }>;
  };
}

interface McpConfig {
  mcpServers?: Record<string, {
    command?: string;
    args?: string[];
    url?: string;
    tools?: McpToolDef[];
  }>;
}

export function analyzeMcpConfig(filePath: string): ScanFinding[] {
  const content = readFileSync(filePath, "utf-8");
  let config: McpConfig;

  try {
    config = JSON.parse(content) as McpConfig;
  } catch {
    return [{
      ruleId: "MCP-001",
      severity: "info",
      title: "Invalid JSON in MCP config",
      description: "Could not parse MCP configuration file",
      filePath,
    }];
  }

  const findings: ScanFinding[] = [];

  if (!config.mcpServers) return findings;

  for (const [serverName, server] of Object.entries(config.mcpServers)) {
    // Check for suspicious commands
    if (server.command) {
      if (/curl|wget|nc|ncat/.test(server.command)) {
        findings.push({
          ruleId: "EXFIL-003",
          severity: "critical",
          title: `MCP server "${serverName}" uses network command`,
          description: `Server command "${server.command}" can exfiltrate data`,
          filePath,
          snippet: `command: ${server.command}`,
        });
      }

      if (/bash\s+-c|sh\s+-c|eval/.test(server.command)) {
        findings.push({
          ruleId: "OBFSC-004",
          severity: "high",
          title: `MCP server "${serverName}" uses inline shell`,
          description: "Inline shell execution can hide malicious commands",
          filePath,
          snippet: `command: ${server.command}`,
        });
      }
    }

    // Check args for suspicious patterns
    if (server.args) {
      const argsStr = server.args.join(" ");
      if (/https?:\/\/(?!localhost|127\.0\.0\.1)/.test(argsStr)) {
        findings.push({
          ruleId: "EXFIL-004",
          severity: "high",
          title: `MCP server "${serverName}" connects to external URL`,
          description: `Server args contain external URL: check if the destination is trusted`,
          filePath,
          snippet: `args: ${argsStr.slice(0, 100)}`,
        });
      }
    }
    // Run shared shell-pattern rules against the effective command
    // (command + args joined). This catches reverse shells, credential
    // exfiltration, and inline code execution hidden inside args[].
    const effectiveCommand = [server.command ?? "", ...(server.args ?? [])]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (effectiveCommand) {
      for (const rule of DANGEROUS_SHELL_PATTERNS) {
        if (rule.pattern.test(effectiveCommand)) {
          findings.push({
            ruleId: rule.ruleId,
            severity: severityForRuleId(rule.ruleId),
            title: `MCP server "${serverName}": ${rule.title}`,
            description: rule.description,
            filePath,
            snippet: effectiveCommand.slice(0, 160),
          });
        }
        rule.pattern.lastIndex = 0;
      }
    }

    // Check remote MCP server URLs
    if (server.url && !/^https:\/\//.test(server.url)) {
      findings.push({
        ruleId: "MCP-002",
        severity: "medium",
        title: `MCP server "${serverName}" uses non-HTTPS URL`,
        description: "Remote MCP servers should use HTTPS for secure communication",
        filePath,
        snippet: `url: ${server.url}`,
      });
    }

    // Check tool definitions for overly broad schemas
    if (server.tools) {
      for (const tool of server.tools) {
        const props = tool.inputSchema?.properties ?? {};

        for (const [propName, propDef] of Object.entries(props)) {
          if (propName.match(/^(url|path|file|command|script|code|exec)$/i)) {
            findings.push({
              ruleId: "MCP-003",
              severity: "medium",
              title: `Tool "${tool.name}" accepts arbitrary ${propName}`,
              description: `The "${propName}" parameter could allow arbitrary ${propName} injection`,
              filePath,
              snippet: `tool: ${tool.name}, param: ${propName}`,
            });
          }
        }

        // Check for instruction-override in tool descriptions
        if (tool.description && /ignore|override|forget|disregard/i.test(tool.description)) {
          findings.push({
            ruleId: "INJECT-003",
            severity: "high",
            title: `Tool "${tool.name}" description contains override language`,
            description: "Tool description may attempt to override AI instructions",
            filePath,
            snippet: tool.description.slice(0, 100),
          });
        }
      }
    }
  }

  return findings;
}
