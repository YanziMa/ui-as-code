/**
 * Environment detection and configuration utilities.
 */

/** Detect if running in development mode */
export function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

/** Detect if running in production mode */
export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Detect if running in test environment */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test" || typeof jest !== "undefined";
}

/** Get current environment name */
export function getEnv(): string {
  return process.env.NODE_ENV ?? "development";
}

/** Check if a feature flag is enabled */
export function isFeatureEnabled(flag: string): boolean {
  const val = process.env[`FEATURE_${flag.toUpperCase()}`];
  if (!val) return false;
  return val === "1" || val === "true" || val === "enabled";
}

/** Get required env variable or throw */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** Get optional env variable with default */
export function getEnv(name: string, defaultValue: string = ""): string {
  return process.env[name] ?? defaultValue;
}

/** Get numeric env variable with default */
export function getEnvNumber(name: string, defaultValue: number = 0): number {
  const val = process.env[name];
  if (!val) return defaultValue;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultValue : parsed;
}

/** Get boolean env variable */
export function getEnvBool(name: string, defaultValue: boolean = false): boolean {
  const val = process.env[name]?.toLowerCase();
  if (!val) return defaultValue;
  return val === "true" || val === "1" || val === "yes";
}

/** Check if we're running on Vercel */
export function isVercel(): boolean {
  return !!process.env.VERCEL;
}

/** Check if we're running in serverless/edge environment */
export function isServerless(): boolean {
  return isVercel() || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.NETLIFY;
}

/** Get deployment info */
export function getDeploymentInfo(): { platform: string; region: string; env: string } {
  return {
    platform: isVercel() ? "Vercel" : isServerless() ? "Serverless" : "Unknown",
    region: process.env.VERCEL_REGION || process.env.AWS_REGION || "unknown",
    env: getEnv(),
  };
}
