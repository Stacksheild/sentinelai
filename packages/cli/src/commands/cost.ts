import { Command } from "commander";
import { CostDatabase, forecastCosts } from "@sentinelai/cost-tracker";
import { loadConfig } from "@sentinelai/core";

export const costCommand = new Command("cost")
  .description("Track and analyze LLM API costs");

costCommand
  .command("report")
  .description("Show cost report for a time period")
  .option("-p, --period <period>", "Reporting period: day, week, month", "month")
  .option("--by <dimension>", "Group by: model, provider, project", "provider")
  .option("-f, --format <format>", "Output format: table, json, csv", "table")
  .action((opts: { period: string; by: string; format: string }) => {
    const config = loadConfig();
    const db = new CostDatabase(config.cost.storage);

    const now = new Date();
    let start: Date;

    switch (opts.period) {
      case "day":
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        break;
      case "week":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      default:
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
    }

    const report = db.getReport(start.toISOString(), now.toISOString());

    if (opts.format === "json") {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log("\nCost Report");
      console.log(`Period: ${report.period.start.slice(0, 10)} to ${report.period.end.slice(0, 10)}`);
      console.log(`Total:  $${report.totalCostUsd.toFixed(2)}`);
      console.log(`Trend:  ${report.trend}`);
      console.log("");

      const breakdown = opts.by === "model"
        ? report.breakdown.byModel
        : opts.by === "project"
          ? report.breakdown.byProject
          : report.breakdown.byProvider;

      console.log(`By ${opts.by}:`);
      const sorted = Object.entries(breakdown).sort(([, a], [, b]) => b - a);
      for (const [key, value] of sorted) {
        const pct = report.totalCostUsd > 0 ? value / report.totalCostUsd : 0;
        const bar = "#".repeat(Math.round(pct * 30));
        console.log(`  ${key.padEnd(30)} $${value.toFixed(2).padStart(10)} ${bar}`);
      }
    }

    db.close();
  });

costCommand
  .command("predict")
  .description("Forecast future costs based on usage history")
  .option("--horizon <days>", "Number of days to forecast", "30")
  .action((opts: { horizon: string }) => {
    const config = loadConfig();
    const db = new CostDatabase(config.cost.storage);
    const horizonDays = parseInt(opts.horizon, 10);

    const dailyCosts = db.getDailyCosts(90);

    if (dailyCosts.length < 3) {
      console.log("Need at least 3 days of cost data for prediction. Keep tracking!");
      db.close();
      return;
    }

    const forecast = forecastCosts(dailyCosts, horizonDays);

    console.log("\nCost Forecast");
    console.log(`Horizon:    ${forecast.horizonDays} days`);
    console.log(`Projected:  $${forecast.projectedCostUsd.toFixed(2)}`);
    console.log(`95% CI:     $${forecast.confidenceInterval[0].toFixed(2)} - $${forecast.confidenceInterval[1].toFixed(2)}`);
    console.log(`Daily avg:  $${(forecast.projectedCostUsd / forecast.horizonDays).toFixed(2)}`);

    db.close();
  });

costCommand
  .command("budget")
  .description("Set a spending budget")
  .option("--set <amount>", "Set monthly budget in USD")
  .option("--alert-at <percent>", "Alert when spending reaches this percentage", "80")
  .option("--name <name>", "Budget name", "default")
  .action((opts: { set?: string; alertAt: string; name: string }) => {
    if (!opts.set) {
      console.log("Usage: sentinelai cost budget --set <amount>");
      return;
    }

    const config = loadConfig();
    const db = new CostDatabase(config.cost.storage);

    db.setBudget({
      name: opts.name,
      period: "monthly",
      limitUsd: parseFloat(opts.set),
      alertAtPct: parseFloat(opts.alertAt),
    });

    console.log(`Budget "${opts.name}" set: $${opts.set}/month (alert at ${opts.alertAt}%)`);
    db.close();
  });
