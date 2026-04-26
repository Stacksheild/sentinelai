import { describe, it, expect } from "vitest";
import { forecastCosts } from "../predictor/forecast.js";

function dailyCosts(values: number[]): Array<{ day: string; cost: number }> {
  return values.map((cost, i) => {
    const d = new Date("2025-01-01");
    d.setDate(d.getDate() + i);
    return { day: d.toISOString().slice(0, 10), cost };
  });
}

describe("forecastCosts", () => {
  it("throws when fewer than 3 days of data are provided", () => {
    expect(() => forecastCosts(dailyCosts([1, 2]))).toThrow("at least 3");
  });

  it("returns a forecast for exactly 3 days of data", () => {
    const result = forecastCosts(dailyCosts([1, 1, 1]));
    expect(result.projectedCostUsd).toBeGreaterThanOrEqual(0);
  });

  it("horizonDays matches the requested horizon", () => {
    const result = forecastCosts(dailyCosts([1, 2, 3, 2, 1, 2, 3]), 14);
    expect(result.horizonDays).toBe(14);
    expect(result.dailyForecasts).toHaveLength(14);
  });

  it("defaults to 30-day horizon", () => {
    const result = forecastCosts(dailyCosts([1, 2, 3]));
    expect(result.horizonDays).toBe(30);
    expect(result.dailyForecasts).toHaveLength(30);
  });

  it("projectedCostUsd is daily forecast × horizon", () => {
    // Flat series — smoothed value equals that constant
    const result = forecastCosts(dailyCosts([2, 2, 2, 2, 2]), 10);
    expect(result.projectedCostUsd).toBeCloseTo(20, 1);
  });

  it("confidence interval lower bound is >= 0", () => {
    const result = forecastCosts(dailyCosts([1, 2, 3, 1, 2, 3]));
    expect(result.confidenceInterval[0]).toBeGreaterThanOrEqual(0);
  });

  it("confidence interval upper >= lower", () => {
    const result = forecastCosts(dailyCosts([5, 10, 3, 7, 2, 8, 4]));
    expect(result.confidenceInterval[1]).toBeGreaterThanOrEqual(result.confidenceInterval[0]);
  });

  it("dailyForecasts dates start one day after the last input day", () => {
    const input = dailyCosts([1, 2, 3]);
    const result = forecastCosts(input, 5);
    expect(result.dailyForecasts[0]?.day).toBe("2025-01-04");
    expect(result.dailyForecasts[4]?.day).toBe("2025-01-08");
  });

  it("all daily forecasts have the same predicted value (flat smoothing)", () => {
    const result = forecastCosts(dailyCosts([3, 3, 3, 3, 3]), 7);
    const values = result.dailyForecasts.map((d) => d.predicted);
    expect(new Set(values).size).toBe(1);
  });

  it("increasing trend produces higher projected cost than flat one", () => {
    const flat = forecastCosts(dailyCosts([2, 2, 2, 2, 2]), 30);
    const rising = forecastCosts(dailyCosts([1, 2, 3, 4, 5]), 30);
    expect(rising.projectedCostUsd).toBeGreaterThan(flat.projectedCostUsd);
  });
});
