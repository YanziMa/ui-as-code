/**
 * Environment variable helpers with type safety.
 */

/** Get env var or return default */
export function env(key: string, defaultValue: string = ""): string {
  return process.env[key] ?? defaultValue;
}

/** Get env var as number, or return default */
export function envNumber(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const num = Number(val);
  return isNaN(num) ? defaultValue : num;
}

/** Check if an env var is set (truthy) */
export function envBool(key: string): boolean {
  const val = process.env[key];
  if (!val) return false;
  return val !== "0" && val !== "false" && val !== "";
}

/** Get required env var — throws if missing in production */
export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || val.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    console.warn(`[env] Missing: ${key}`);
    return "";
  }
  return val;
}
