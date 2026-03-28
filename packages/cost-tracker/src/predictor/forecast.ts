/**
 * Simple exponential smoothing for cost prediction.
 * No external dependencies — just math.
 */

export interface Forecast {
  horizonDays: number;
  projectedCostUsd: number;
  confidenceInterval: [number, number];
  dailyForecasts: Array<{ day: string; predicted: number }>;
}

export function forecastCosts(
  dailyCosts: Array<{ day: string; cost: number }>,
  horizonDays: number = 30,
  alpha: number = 0.3,
): Forecast {
  if (dailyCosts.length < 3) {
    throw new Error("Need at least 3 days of data for forecasting");
  }

  const costs = dailyCosts.map((d) => d.cost);

  // Simple exponential smoothing
  let smoothed = costs[0];
  const smoothedValues: number[] = [smoothed];

  for (let i = 1; i < costs.length; i++) {
    smoothed = alpha * costs[i] + (1 - alpha) * smoothed;
    smoothedValues.push(smoothed);
  }

  // Forecast is the last smoothed value repeated
  const dailyForecast = smoothed;

  // Calculate residuals for confidence interval
  const residuals: number[] = [];
  for (let i = 0; i < costs.length; i++) {
    residuals.push(costs[i] - smoothedValues[i]);
  }

  const rmse = Math.sqrt(
    residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length,
  );

  // Generate daily forecasts
  const lastDate = new Date(dailyCosts[dailyCosts.length - 1].day);
  const dailyForecasts: Array<{ day: string; predicted: number }> = [];

  for (let i = 1; i <= horizonDays; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);
    dailyForecasts.push({
      day: date.toISOString().slice(0, 10),
      predicted: Math.round(dailyForecast * 100) / 100,
    });
  }

  const totalProjected = Math.round(dailyForecast * horizonDays * 100) / 100;
  const margin = rmse * Math.sqrt(horizonDays) * 1.96; // 95% CI

  return {
    horizonDays,
    projectedCostUsd: totalProjected,
    confidenceInterval: [
      Math.round(Math.max(0, totalProjected - margin) * 100) / 100,
      Math.round((totalProjected + margin) * 100) / 100,
    ],
    dailyForecasts,
  };
}
