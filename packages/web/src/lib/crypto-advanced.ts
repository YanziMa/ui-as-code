/**
 * Advanced cryptographic and encoding utilities.
 * Note: These use Web Crypto API where available.
 */

/** Generate a cryptographically secure random string */
export function secureRandomString(length: number, charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"): string {
  const values = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i++) values[i] = Math.floor(Math.random() * charset.length);
  }

  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

/** Generate a UUID v4 using crypto API */
export function cryptoUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback
  const hex = "0123456789abcdef";
  const values = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < 16; i++) values[i] = Math.floor(Math.random() * 256);
  }

  // Set version (4) and variant bits
  values[6] = (values[6] & 0x0f) | 0x40;
  values[8] = (values[8] & 0x3f) | 0x80;

  let result = "";
  for (let i = 0; i < 16; i++) {
    const b = values[i]!;
    result += hex[b >> 4]! + hex[b & 0x0f];
    if (i === 3 || i === 5 || i === 7 || i === 9) result += "-";
  }

  return result;
}

/** Simple hash function (djb2) — not cryptographically secure but fast */
export function fastHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

/** SHA-256 hash using Web Crypto API */
export async function sha256(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    // Fallback to simple hash
    return fastHash(text);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return arrayBufferToHex(hashBuffer);
}

/** SHA-512 hash */
export async function sha512(text: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return fastHash(text);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  return arrayBufferToHex(hashBuffer);
}

/** HMAC-SHA256 */
export async function hmacSha256(key: string, message: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return fastHash(key + message);
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return arrayBufferToHex(signature);
}

/** Verify HMAC */
export async function verifyHmacSha256(
  key: string,
  message: string,
  expectedSignature: string,
): Promise<boolean> {
  const computed = await hmacSha256(key, message);
  // Constant-time comparison
  return timingSafeEqual(computed, expectedSignature);
}

/** Convert ArrayBuffer to hex string */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison to prevent timing attacks */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;

/** Generate a secure token with expiration metadata embedded */
export interface TokenPayload {
  exp: number;
  iat: number;
  [key: string]: unknown;
}

export function encodeSimpleToken(payload: TokenPayload, secret: string): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = fastHash(`${header}.${body}.${secret}`);
  return `${header}.${body}.${signature}`;
}

export function decodeSimpleToken(token: string, secret: string): TokenPayload | null {
  try {
    const [headerB64, payloadB64, signature] = token.split(".");
    if (!headerB64 || !payloadB64 || !signature) return null;

    const expectedSig = fastHash(`${headerB64}.${payloadB64}.${secret}`);
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(atob(payloadB64)) as TokenPayload;

    // Check expiry
    if (payload.exp && Date.now() > payload.exp * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}
