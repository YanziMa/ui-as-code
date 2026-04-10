/**
 * Math utilities for data visualization and calculations.
 */

/** Calculate mean of numbers */
export function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

/** Calculate median */
export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Calculate standard deviation */
export function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const avg = mean(nums);
  const squareDiffs = nums.map((n) => Math.pow(n - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/** Calculate percentiles */
export function percentile(nums: number[], p: number): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (upper - idx) + sorted[upper] * (idx - lower);
}

/** Linear regression (returns slope and intercept) */
export function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  const sumX = sum(data.map((d) => d.x));
  const sumY = sum(data.map((d) => d.y));
  const sumXY = sum(data.map((d) => d.x * d.y));
  const sumX2 = sum(data.map((d) => d.x * d.x));

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  const ssTotal = sum(data.map((d) => Math.pow(d.y - yMean, 2)));
  const ssResidual = sum(data.map((d) => Math.pow(d.y - (slope * d.x + intercept), 2)));
  const r2 = ssTotal === 0 ? 1 : 1 - ssResidual / ssTotal;

  return { slope, intercept, r2 };
}

/** Sum array */
export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

/** Min/max in one pass */
export function minmax(nums: number[]): { min: number; max: number } {
  if (nums.length === 0) return { min: 0, max: 0 };
  let min = nums[0];
  let max = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < min) min = nums[i];
    if (nums[i] > max) max = nums[i];
  }
  return { min, max };
}

/** Normalize values to 0-1 range */
export function normalize(nums: number[]): number[] {
  const { min, max } = minmax(nums);
  if (max === min) return nums.map(() => 0.5);
  return nums.map((n) => (n - min) / (max - min));
}

/** Moving average */
export function movingAverage(nums: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = nums.slice(start, i + 1);
    result.push(mean(slice));
  }
  return result;
}

/** Exponential moving average */
export function ema(nums: number[], alpha: number = 0.3): number[] {
  if (nums.length === 0) return [];
  const result: number[] = [nums[0]];
  for (let i = 1; i < nums.length; i++) {
    result.push(alpha * nums[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}
