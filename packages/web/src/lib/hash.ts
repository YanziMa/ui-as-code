/**
 * Hash utilities: string hashing using Web Crypto API,
 * object hashing, color hashing, fingerprinting, and
 * hash comparison (timing-safe).
 */

// --- String Hashing ---

/**
 * Hash a string using SHA-256 and return a hex string.
 * Uses Web Crypto API (available in all modern browsers).
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayToHex(hashBuffer);
}

/**
 * Hash a string using SHA-384 and return a hex string.
 */
export async function sha384(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-384", data);
  return arrayToHex(hashBuffer);
}

/**
 * Hash a string using SHA-512 and return a hex string.
 */
export async function sha512(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  return arrayToHex(hashBuffer);
}

/**
 * Simple non-cryptographic hash (djb2-like) for quick lookups.
 * NOT suitable for security purposes.
 */
export function simpleHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Generate a numeric hash in range [0, max] from any string.
 * Useful for consistent color assignment, etc.
 */
export function hashToInt(str: string, max = Number.MAX_SAFE_INTEGER): number {
  return simpleHash(str) % (max + 1);
}

// --- Object/Array Hashing ---

/**
 * Hash an object's stable JSON representation.
 * Note: key order matters for consistency.
 */
export async function hashObject(obj: unknown): Promise<string> {
  return sha256(canonicalJson(obj));
}

/**
 * Hash multiple values together (order-independent combination).
 */
export async function combineHashes(...values: string[]): Promise<string> {
  const sorted = [...values].sort();
  return sha256(sorted.join("|"));
}

// --- Color Hashing ---

/**
 * Generate a deterministic HSL color from a string.
 * Useful for avatar background colors, etc.
 *
 * @example
 * hashColor("alice@example.com") → "hsl(220, 60%, 55%)"
 */
export function hashColor(str: string, saturation = 60, lightness = 55): string {
  const hash = simpleHash(str);
  const hue = hash % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Generate a deterministic hex color from a string.
 */
export function hashHexColor(str: string): string {
  const hash = simpleHash(str);
  const h = hash % 360;
  const s = 50 + (hash % 30); // 50-80%
  const l = 45 + (hash % 25); // 45-70%

  // Convert HSL to approximate hex
  const { r, g, b } = hslToRgb(h, s, l);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// --- Fingerprinting ---

/**
 * Generate a basic browser fingerprint hash.
 * Uses available browser APIs without being invasive.
 * WARNING: This is for analytics/abuse prevention only, not security.
 */
export async function fingerprint(): Promise<string> {
  const components: string[] = [];

  // User agent
  components.push(navigator.userAgent);
  components.push(navigator.language);
  components.push(navigator.platform);

  // Screen info
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${window.devicePixelRatio}`);

  // Timezone
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {}

  // Available APIs
  components.push(typeof navigator.hardwareConcurrency === "number"
    ? String(navigator.hardwareConcurrency)
    : "na");
  components.push(typeof navigator.deviceMemory === "number"
    ? String(navigator.deviceMemory)
    : "na");
  components.push(typeof (navigator as any).webdriver === "boolean"
    ? String((navigator as any).webdriver)
    : "na");

  // Canvas fingerprint (if available)
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("fingerprint", 2, 2);
      components.push(canvas.toDataURL().slice(-32));
    }
  } catch {}

  return sha256(components.join("|||"));
}

// --- Timing-Safe Comparison ---

/**
 * Compare two strings in constant time to prevent timing attacks.
 * Returns true if strings are equal.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

// --- Internal Helpers ---

function arrayToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj ?? {}).sort());
}

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l + c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((m - r) * 255),
    g: Math.round((m - g) * 255),
    b: Math.round((m - b) * 255),
  };
}
