/**
 * Base64 encoding/decoding utilities with URL-safe variants.
 */

/** Standard base64 encode */
export function base64Encode(input: string): string {
  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(input)));
  }

  // Node.js Buffer fallback
  try {
    return Buffer.from(input, "utf-8").toString("base64");
  } catch {
    return manualBase64Encode(input);
  }
}

/** Standard base64 decode */
export function base64Decode(input: string): string {
  if (typeof atob !== "undefined") {
    try {
      return decodeURIComponent(escape(atob(input)));
    } catch {
      return ""; // Invalid base64
    }
  }

  // Node.js Buffer fallback
  try {
    return Buffer.from(input, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/** URL-safe base64 encode (replaces + and / with - and _) */
export function base64UrlEncode(input: string): string {
  return base64Encode(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** URL-safe base64 decode */
export function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  // Add back padding
  switch (padded.length % 4) {
    case 2: padded += "==";
    case 3: padded += "=";
  }
  return base64Decode(padded);
}

/** Encode to base64 and prepend data URI prefix */
export function dataUriEncode(input: string, mediaType = "text/plain"): string {
  const encoded = base64Encode(input);
  return `data:${mediaType};base64,${encoded}`;
}

/** Decode a data URI */
export function dataUriDecode(dataUri: string): { mediaType: string; data: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) return null;

  try {
    return {
      mediaType: match[1]!,
      data: base64Decode(match[2]!),
    };
  } catch {
    return null;
  }
}

/** Check if a string is valid base64 */
export function isValidBase64(str: string): boolean {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) return false;

  try {
    atob(str.includes("-") || str.includes("_") ? str.replace(/-/g, "+").replace(/_/g, "/") : str);
    return true;
  } catch {
    return false;
  }
}

/** Encode object as JSON base64 */
export function base64EncodeObject(obj: unknown): string {
  return base64Encode(JSON.stringify(obj));
}

/** Decode JSON from base64 */
export function base64DecodeObject<T = unknown>(input: string): T | null {
  try {
    return JSON.parse(base64Decode(input)) as T;
  } catch {
    return null;
  }
}

/** Manual base64 encode (no built-in functions) */
function manualBase64Encode(str: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";

  for (let i = 0; i < str.length; ) {
    const byte1 = str.charCodeAt(i++);
    const byte2 = i < str.length ? str.charCodeAt(i++) : 0;

    const octet = (byte1 << 8) | byte2;
    result += chars.charAt(octet >> 18 & 0x3F);
    result += chars.charAt(octet >> 12 & 0x3F);
    result += chars.charAt(octet >> 6 & 0x3F);
    result += chars.charAt(octet & 0x3F);
  }

  return result;
}
