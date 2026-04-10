/**
 * Encoding Utilities: Base64 variants, Base32/Base58/Hex encoding,
 * URL encoding, Unicode normalization, JWT encode/decode (no crypto),
 * HTML entity encoding, CSV parse/generate, query string,
 * percent encoding, binary/text conversion.
 */

// --- Base64 ---

/** Encode string to standard Base64 */
export function base64Encode(str: string): string {
  if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(str)));
  // Fallback for environments without btoa
  return Buffer.from(str, "utf-8").toString("base64");
}

/** Decode Base64 to string */
export function base64Decode(encoded: string): string {
  if (typeof atob === "function") return decodeURIComponent(escape(atob(encoded)));
  return Buffer.from(encoded, "base64").toString("utf-8");
}

/** Encode to URL-safe Base64 (replaces + with -, / with _, removes padding) */
export function base64UrlEncode(str: string): string {
  return base64Encode(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode URL-safe Base64 */
export function base64UrlDecode(encoded: string): string {
  let padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4 !== 0) padded += "=";
  return base64Decode(padded);
}

/** Base64 encode with line wrapping (for MIME/email) */
export function base64Wrap(str: string, lineLength = 76): string {
  const encoded = base64Encode(str);
  const lines: string[] = [];
  for (let i = 0; i < encoded.length; i += lineLength) {
    lines.push(encoded.slice(i, i + lineLength));
  }
  return lines.join("\n");
}

// --- Base32 ---

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const BASE32_PAD_CHAR = "=";

/** Encode bytes/string to Base32 (RFC 4648) */
export function base32Encode(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += BASE32_ALPHABET[(buffer >> bitsLeft) & 0x1f];
    }
  }

  if (bitsLeft > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 0x1f];
  }

  // Pad to multiple of 8 characters
  while (result.length % 8 !== 0) result += BASE32_PAD_CHAR;
  return result;
}

/** Decode Base32 to Uint8Array */
export function base32Decode(encoded: string): Uint8Array {
  const clean = encoded.toUpperCase().replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const ch of clean) {
    const val = BASE32_ALPHABET.indexOf(ch);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

// --- Base58 (Bitcoin-style) ---

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Encode to Base58 */
export function base58Encode(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digits: number[] = [0];

  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i]!;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j]! * 256;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
  }

  let result = "";
  // Count leading zeros
  let leadingZeros = 0;
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) leadingZeros++;

  for (let i = digits.length - 1; i >= 0; i--) result += BASE58_ALPHABET[digits[i]!] ?? "";
  return "1".repeat(leadingZeros) + result;
}

/** Decode Base58 to Uint8Array */
export function base58Decode(encoded: string): Uint8Array {
  const digits: number[] = [0];

  for (const ch of encoded) {
    const val = BASE58_ALPHABET.indexOf(ch);
    if (val === -1) throw new Error(`Invalid Base58 character: ${ch}`);
    let carry = val;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j]! * 58;
      digits[j] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    while (carry > 0) { digits.push(carry % 256); carry = Math.floor(carry / 256); }
  }

  let leadingZeros = 0;
  while (leadingZeros < encoded.length && encoded[leadingZeros] === "1") leadingZeros++;

  const result = new Uint8Array(digits.reverse().length + leadingZeros);
  result.fill(0, 0, leadingZeros);
  for (let i = 0; i < digits.length; i++) result[i + leadingZeros] = digits[i]!;
  return result;
}

// --- Hex Encoding ---

/** Encode bytes/string to hex string */
export function hexEncode(data: string | Uint8Array): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Decode hex string to Uint8Array */
export function hexDecode(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  return bytes;
}

/** Check if a string is valid hex */
export function isHex(str: string): boolean { return /^[0-9a-fA-F]*$/.test(str); }

// --- URL Encoding ---

/** Full URL encoding (encodes all non-safe chars) */
export function urlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Full URL decoding */
export function urlDecode(str: string): string {
  try { return decodeURIComponent(str); } catch { return str; }
}

/** Encode query parameters from object */
export function queryStringify(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    parts.push(`${urlEncode(key)}=${urlEncode(String(value))}`);
  }
  return parts.join("&");
}

/** Decode query string to object */
export function queryParse(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  const search = query.startsWith("?") ? query.slice(1) : query;
  for (const pair of search.split("&")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx < 0) { params[urlDecode(pair)] = ""; continue; }
    params[urlDecode(pair.slice(0, eqIdx))] = urlDecode(pair.slice(eqIdx + 1));
  }
  return params;
}

/** Parse full URL into components */
export interface ParsedURL {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  username?: string;
  password?: string;
}

export function parseUrl(url: string): ParsedURL | null {
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol.replace(":", ""),
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      search: u.search,
      hash: u.hash,
      username: u.username || undefined,
      password: u.password || undefined,
    };
  } catch { return null; }
}

// --- Unicode ---

/** Normalize Unicode string (NFC, NFD, NFKC, NFKD) */
export function normalizeUnicode(str: string, form: "NFC" | "NFD" | "NFKC" | "NFKD" = "NFC"): string {
  return str.normalize(form);
}

/** Get Unicode code points of a string */
export function codePoints(str: string): number[] {
  return Array.from(str).map((ch) => ch.codePointAt(0)!);
}

/** Check if string contains only BMP characters (no surrogate pairs) */
export function isBMP(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) > 0xffff) return false;
  }
  return true;
}

/** Reverse a string that may contain surrogate pairs correctly */
export function reverseUnicode(str: string): string {
  return Array.from(str).reverse().join("");
}

// --- HTML Entities ---

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  "\u00a0": "&nbsp;", "\u2002": "&ensp;", "\u2003": "&emsp;",
  "\u2009": "&thinsp;", "\u2014": "&mdash;", "\u2013": "&ndash;",
  "\u2018": "&lsquo;", "\u2019": "&rsquo;", "\u201c": "&ldquo;", "\u201d": "&rdquo;",
  "\u2026": "&hellip;", "\u00a9": "&copy;", "\u00ae": "&reg;", "\u2122": "&trade;",
};

const REVERSE_HTML_ENTITIES: Record<string, string> = {};
for (const [char, entity] of Object.entries(HTML_ENTITIES)) REVERSE_HTML_ENTITIES[entity] = char;

/** Encode HTML entities in string */
export function htmlEncode(str: string): string {
  return str.replace(/[&<>"'\u00a0\u2002\u2003\u2009\u2014\u2013\u2018\u2019\u201c\u201d\u2026\u00a9\u00ae\u2122]/g,
    (ch) => HTML_ENTITIES[ch] ?? `&#${ch.charCodeAt(0)};`);
}

/** Decode HTML entities in string */
export function htmlDecode(str: string): string {
  return str.replace(/&(?:#\d+?|#x[\da-fA-F]+?|[a-z][a-z\d]*);/gi, (entity) => {
    if (REVERSE_HTML_ENTITIES[entity]) return REVERSE_HTML_ENTITIES[entity];
    // Numeric references
    if (entity.startsWith("&#x")) return String.fromCharCode(parseInt(entity.slice(3, -1), 16));
    if (entity.startsWith("&#")) return String.fromCharCode(parseInt(entity.slice(2, -1), 10));
    return entity;
  });
}

// --- CSV ---

/** Parse CSV string into array of records */
export function parseCSV(csvText: string, options: { delimiter?: string; headers?: boolean } = {}): Record<string, string>[] {
  const { delimiter = ",", headers: hasHeaders = true } = options;
  const rows = splitCSVRows(csvText);
  if (rows.length === 0) return [];

  const headerRow = rows[0]!;
  const startIdx = hasHeaders ? 1 : 0;
  const keys = hasHeaders ? headerRow : headerRow.map((_, i) => `col_${i}`);

  const results: Record<string, string>[] = [];
  for (let i = startIdx; i < rows.length; i++) {
    const row: Record<string, string> = {};
    for (let j = 0; j < keys.length; j++) row[keys[j]!] = rows[i]?.[j] ?? "";
    results.push(row);
  }
  return results;
}

function splitCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { currentField += '"'; i++; }
        else inQuotes = false;
      } else currentField += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { current.push(currentField); currentField = ""; }
      else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        current.push(currentField);
        rows.push(current);
        current = []; currentField = "";
        if (ch === "\r") i++;
      } else currentField += ch;
    }
  }
  if (currentField || current.length > 0) { current.push(currentField); rows.push(current); }
  return rows;
}

/** Generate CSV string from array of objects */
export function generateCSV(data: Record<string, unknown>[], columns?: string[]): string {
  if (data.length === 0) return "";
  const cols = columns ?? Object.keys(data[0]!);

  const escapeField = (val: unknown): string => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = cols.map(escapeField).join(",");
  const body = data.map((row) => cols.map((col) => escapeField(row[col])).join(","));
  return [header, ...body].join("\n");
}

// --- Binary/Text Conversion ---

/** Convert ArrayBuffer/Uint8Array to string using specified encoding */
export function decodeBuffer(buffer: ArrayBuffer | Uint8Array, encoding: "utf-8" | "ascii" | "latin1" = "utf-8"): string {
  const decoder = new TextDecoder(encoding);
  return decoder.decode(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
}

/** Convert string to Uint8Array using specified encoding */
export function encodeBuffer(str: string, encoding: "utf-8" | "ascii" | "latin1" = "utf-8"): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/** Convert Uint8Array to binary string (each byte as char code) */
export function uint8ToBinaryString(arr: Uint8Array): string {
  return String.fromCharCode(...arr);
}

/** Convert binary string back to Uint8Array */
export function binaryStringToUint8(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

// --- JWT (decode only — no signature verification) ---

export interface JWTPayload {
  iss?: string; sub?: string; aud?: string | string[];
  exp?: number; nbf?: number; iat?: number; jti?: string;
  [key: string]: unknown;
}

export interface DecodedJWT {
  header: Record<string, unknown>;
  payload: JWTPayload;
  signature: string;
  raw: string;
}

/**
 * Decode a JWT token without verifying the signature.
 * Useful for reading payload data client-side.
 */
export function decodeJWT(token: string): DecodedJWT | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(base64UrlDecode(parts[0]!));
    const payload = JSON.parse(base64UrlDecode(parts[1]!));

    return { header, payload: payload as JWTPayload, signature: parts[2]!, raw: token };
  } catch { return null; }
}

/** Check if JWT is expired */
export function isJWTExpired(token: string, bufferSeconds = 0): boolean {
  const decoded = decodeJWT(token);
  if (!decoded?.payload.exp) return false;
  return Date.now() >= (decoded.payload.exp + bufferSeconds) * 1000;
}

/** Create an unsigned JWT (for testing purposes only!) */
export function createUnsignedJWT(payload: Record<string, unknown>, header: Record<string, unknown> = {}): string {
  const defaultHeader = { alg: "none", typ: "JWT", ...header };
  return `${base64UrlEncode(JSON.stringify(defaultHeader))}.${base64UrlEncode(JSON.stringify(payload))}.`;
}

// --- Byte Size Formatting ---

/** Format byte count as human-readable string */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));
  return `${size} ${sizes[i]}`;
}

/** Parse human-readable byte string back to number */
export function parseBytes(str: string): number {
  const match = str.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB|PB)?$/i);
  if (!match) return NaN;
  const num = parseFloat(match[1]!);
  const unit = (match[2] ?? "B").toUpperCase();
  const sizes: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4, PB: 1024 ** 5 };
  return num * (sizes[unit] ?? 1);
}
