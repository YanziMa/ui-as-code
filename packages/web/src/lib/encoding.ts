/**
 * Encoding / decoding utilities.
 */

/** Base64 encode string */
export function base64Encode(str: string): string {
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(str)));
  }
  return Buffer.from(str).toString("base64");
}

/** Base64 decode string */
export function base64Decode(str: string): string {
  if (typeof atob === "function") {
    try { return decodeURIComponent(escape(atob(str))); } catch { return ""; }
  }
  try { return Buffer.from(str, "base64").toString("utf-8"); } catch { return ""; }
}

/** Encode URI component (safe) */
export function safeEncode(str: string): string {
  return encodeURIComponent(str).replace(/%20/g, "+");
}

/** Decode URI component (safe) */
export function safeDecode(str: string): string {
  return decodeURIComponent(str.replace(/\+/g, "%20"));
}

/** Unicode escape string (for safe HTML attributes) */
export function unicodeEscape(str: string): string {
  return str.replace(/[^\x20-\x7E]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

/** Unescape unicode string */
export function unicodeUnescape(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

/** Encode object to URL-safe query string */
export function encodeQuery(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${safeEncode(k)}=${safeEncode(String(v))}`)
    .join("&");
}

/** Simple XOR cipher (for obfuscation, not security) */
export function xorCipher(str: string, key: number = 42): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key);
  }
  return result;
}

/** Reverse XOR cipher */
export function xorDecipher(str: string, key: number = 42): string {
  return xorCipher(str, key);
}

/** Generate a short hash of a string (non-crypto) */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** Truncate string with ellipsis in the middle (for long IDs/paths) */
export function truncateMiddle(str: string, maxLen: number = 30): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return str.slice(0, half) + "..." + str.slice(-half);
}
