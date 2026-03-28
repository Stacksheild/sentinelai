import { Command } from "commander";
import { scanPath, formatTable, formatJson } from "@sentinelai/scanner";

export const scanCommand = new Command("scan")
  .description("Scan a directory or file for security issues in AI artifacts")
  .argument("<path>", "Path to scan (directory or file)")
  .option("-f, --format <format>", "Output format: table, json", "table")
  .option("-s, --severity <level>", "Minimum severity to report: critical, high, medium, low, info", "low")
  .option("--fail-on <level>", "Exit with code 1 if findings at this severity or above")
  .action((targetPath: string, opts: { format: string; severity: string; failOn?: string }) => {
    try {
      const results = scanPath(targetPath);

      if (results.length === 0) {
        console.log("No scannable artifacts found. Looking for SKILL.md, hooks.json, or MCP config files.");
        return;
      }

      const severityOrder = ["info", "low", "medium", "high", "critical"];
      const minSeverityIdx = severityOrder.indexOf(opts.severity);

      for (const result of results) {
        // Filter findings by severity
        const filtered = {
          ...result,
          findings: result.findings.filter(
            (f) => severityOrder.indexOf(f.severity) >= minSeverityIdx,
          ),
        };

        if (opts.format === "json") {
          console.log(formatJson(filtered));
        } else {
          console.log(formatTable(filtered));
        }
      }

      // Exit with failure if --fail-on threshold is met
      if (opts.failOn) {
        const failIdx = severityOrder.indexOf(opts.failOn);
        const hasFailure = results.some((r) =>
          r.findings.some((f) => severityOrder.indexOf(f.severity) >= failIdx),
        );
        if (hasFailure) {
          process.exit(1);
        }
      }
    } catch (err) {
      console.error(`Scan failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });
