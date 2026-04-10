/**
 * Cryptography Toolkit: Client-side cryptographic utilities including
 * hashing (SHA-256/384/512), HMAC, PBKDF2, AES-GCM encryption/decryption,
 * RSA-OAEP, ECDSA signing/verification, key generation, password strength,
 * secure random, token generation, encoding (base64/hex/utf8), and
 * Web Crypto API wrappers.
 */

// --- Types ---

export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
export type SymmetricAlgorithm = "AES-GCM" | "AES-CBC" | "AES-CTR";
export type AsymmetricAlgorithm = "RSA-OAEP" | "ECDSA" | "ECDH";
export type Encoding = "base64" | "hex" | "utf8" | "arraybuffer";

export interface KeyPairResult {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

export interface EncryptedData {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  tag?: Uint8Array;        // For GCM auth tag
  salt?: Uint8Array;        // For password-based encryption
  algorithm: string;
}

export interface PasswordStrengthResult {
  score: number;            // 0-4 (very weak to very strong)
  verdict: string;          // "very_weak" | "weak" | "fair" | "strong" | "very_strong"
  suggestions: string[];
  crackTimeEstimate: string;
  entropy: number;
}

export interface TokenOptions {
  length?: number;          // Byte length of random data
  encoding?: "hex" | "base64url" | "base64";
  prefix?: string;
  alphabet?: string;        // Custom character set
}

// --- Encoding Utilities ---

/** Encode ArrayBuffer to string */
export function encode(data: ArrayBuffer | Uint8Array, format: Encoding): string {
  const bytes = new Uint8Array(data instanceof ArrayBuffer ? data : data);
  switch (format) {
    case "base64":
      return btoa(String.fromCharCode(...bytes));
    case "hex":
      return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    case "utf8":
      return new TextDecoder().decode(bytes);
    case "arraybuffer":
      return "[ArrayBuffer]";
    default:
      return btoa(String.fromCharCode(...bytes));
  }
}

/** Decode string to Uint8Array */
export function decode(str: string, format: Encoding): Uint8Array {
  switch (format) {
    case "base64":
      return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
    case "hex": {
      const bytes = new Uint8Array(str.length / 2);
      for (let i = 0; i < str.length; i += 2) bytes[i] = parseInt(str.slice(i, i + 2), 16);
      return bytes;
    }
    case "utf8":
      return new TextEncoder().encode(str);
    default:
      return new TextEncoder().encode(str);
  }
}

/** Convert ArrayBuffer to Base64URL (URL-safe, no padding) */
export function toBase64Url(data: ArrayBuffer | Uint8Array): string {
  let b64 = encode(data, "base64");
  b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return b64;
}

/** Convert Base64URL back to Uint8Array */
export function fromBase64Url(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return decode(b64, "base64");
}

// --- Hashing ---

/** Compute a cryptographic hash of data */
export async function hash(
  data: string | ArrayBuffer | Uint8Array,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<ArrayBuffer> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return crypto.subtle.digest(algorithm, bytes);
}

/** Compute hash and return as hex string */
export async function hashHex(
  data: string | ArrayBuffer | Uint8Array,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  const result = await hash(data, algorithm);
  return encode(result, "hex");
}

/** Compute hash and return as base64 string */
export async function hashBase64(
  data: string | ArrayBuffer | Uint8Array,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  const result = await hash(data, algorithm);
  return encode(result, "base64");
}

/** Compute HMAC (Hash-based Message Authentication Code) */
export async function hmac(
  key: string | CryptoKey,
  data: string | ArrayBuffer | Uint8Array,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<ArrayBuffer> {
  let cryptoKey: CryptoKey;
  if (typeof key === "string") {
    cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: algorithm }, false, ["sign"]);
  } else {
    cryptoKey = key;
  }
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return crypto.subtle.sign("HMAC", cryptoKey, bytes);
}

/** HMAC as hex string */
export async function hmacHex(
  key: string | CryptoKey,
  data: string | ArrayBuffer | Uint8Array,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  const result = await hmac(key, data, algorithm);
  return encode(result, "hex");
}

// --- Key Derivation ---

/** Derive a key from a password using PBKDF2 */
export async function pbkdf2(
  password: string,
  salt: string | Uint8Array,
  iterations = 100000,
  hashAlg: HashAlgorithm = "SHA-256",
  keyLength = 256,
): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const saltBytes = typeof salt === "string" ? new TextEncoder().encode(salt) : salt;
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: hashAlg },
    keyMaterial,
    keyLength,
  );
}

/** Derive a key from password using PBKDF2, returning hex */
export async function pbkdf2Hex(
  password: string,
  salt: string | Uint8Array,
  iterations = 100000,
  hashAlg: HashAlgorithm = "SHA-256",
  keyLength = 256,
): Promise<string> {
  const result = await pbkdf2(password, salt, iterations, hashAlg, keyLength);
  return encode(result, "hex");
}

// --- Symmetric Encryption (AES-GCM) ---

/** Generate a random AES key */
export async function generateAesKey(bits = 256): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: bits }, true, ["encrypt", "decrypt"]);
}

/** Import an AES key from raw bytes or base64/hex string */
export async function importAesKey(
  keyData: string | Uint8Array,
  format: "raw" | "hex" | "base64" = "raw",
  bits = 256,
): Promise<CryptoKey> {
  let bytes: Uint8Array | ArrayBuffer;
  if (format === "raw") bytes = keyData instanceof Uint8Array ? keyData : new Uint8Array(keyData as unknown as ArrayBuffer);
  else if (format === "hex") bytes = decode(keyData as string, "hex");
  else bytes = decode(keyData as string, "base64");

  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM", length: bits }, false, ["encrypt", "decrypt"]);
}

/** Export an AES key to raw bytes */
export async function exportAesKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey("raw", key);
}

/** Encrypt data with AES-GCM */
export async function encrypt(
  plaintext: string | ArrayBuffer | Uint8Array,
  key: CryptoKey | string | Uint8Array,
  iv?: Uint8Array,
): Promise<EncryptedData> {
  // Resolve key
  let cryptoKey: CryptoKey;
  if (key instanceof CryptoKey) {
    cryptoKey = key;
  } else if (typeof key === "string") {
    cryptoKey = await importAesKey(key, "base64");
  } else {
    cryptoKey = await importAesKey(key, "raw");
  }

  // Generate IV if not provided
  const actualIv = iv ?? crypto.getRandomValues(new Uint8Array(12));

  // Prepare plaintext
  const data = typeof plaintext === "string" ? new TextEncoder().encode(plaintext) : plaintext;

  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: actualIv }, cryptoKey, data);

  return {
    ciphertext,
    iv: actualIv,
    algorithm: "AES-GCM",
  };
}

/** Decrypt AES-GCM encrypted data */
export async function decrypt(
  encrypted: EncryptedData,
  key: CryptoKey | string | Uint8Array,
): Promise<ArrayBuffer> {
  let cryptoKey: CryptoKey;
  if (key instanceof CryptoKey) {
    cryptoKey = key;
  } else if (typeof key === "string") {
    cryptoKey = await importAesKey(key, "base64");
  } else {
    cryptoKey = await importAesKey(key, "raw");
  }

  return crypto.subtle.decrypt({ name: "AES-GCM", iv: encrypted.iv }, cryptoKey, encrypted.ciphertext);
}

/** Decrypt and return as UTF-8 string */
export async function decryptString(
  encrypted: EncryptedData,
  key: CryptoKey | string | Uint8Array,
): Promise<string> {
  const decrypted = await decrypt(encrypted, key);
  return new TextDecoder().decode(decrypted);
}

/** Encrypt a string and return the full EncryptedData object */
export async function encryptString(
  plaintext: string,
  key: CryptoKey | string | Uint8Array,
  iv?: Uint8Array,
): Promise<EncryptedData> {
  return encrypt(plaintext, key, iv);
}

// --- Asymmetric Cryptography ---

/** Generate an RSA-OAEP key pair for asymmetric encryption */
export async function generateRsaKeyPair(modulusLength = 2048): Promise<KeyPairResult> {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );

  return {
    publicKey: pair.publicKey,
    privateKey: pair.privateKey,
    publicKeyJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateKeyJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
}

/** Generate an ECDSA key pair for signing/verification */
export async function generateEcKeyPair(curve: "P-256" | "P-384" | "P-521" = "P-256"): Promise<KeyPairResult> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: curve },
    true,
    ["sign", "verify"],
  );

  return {
    publicKey: pair.publicKey,
    privateKey: pair.privateKey,
    publicKeyJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateKeyJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
}

/** Sign data with ECDSA private key */
export async function sign(
  data: string | ArrayBuffer | Uint8Array,
  privateKey: CryptoKey,
  algorithm: AsymmetricAlgorithm = "ECDSA",
): Promise<ArrayBuffer> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return crypto.subtle.sign(algorithm, privateKey, bytes);
}

/** Verify an ECDSA signature */
export async function verify(
  signature: ArrayBuffer | Uint8Array,
  data: string | ArrayBuffer | Uint8Array,
  publicKey: CryptoKey,
  algorithm: AsymmetricAlgorithm = "ECDSA",
): Promise<boolean> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return crypto.subtle.verify(algorithm, publicKey, signature, bytes);
}

/** Encrypt data with RSA-OAEP public key */
export async function rsaEncrypt(
  data: string | ArrayBuffer | Uint8Array,
  publicKey: CryptoKey,
): Promise<ArrayBuffer> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, bytes);
}

/** Decrypt data with RSA-OAEP private key */
export async function rsaDecrypt(
  ciphertext: ArrayBuffer | Uint8Array,
  privateKey: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, ciphertext);
}

// --- Secure Random ---

/** Generate cryptographically secure random bytes */
export function secureRandom(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Generate a cryptographically secure random integer in [min, max) */
export function secureRandomInt(min = 0, max = 256): number {
  const range = max - min;
  const bitsNeeded = Math.ceil(Math.log2(range));
  const bytesNeeded = Math.ceil(bitsNeeded / 8);
  const mask = (1 << bitsNeeded) - 1;

  let result: number;
  do {
    const bytes = secureRandom(bytesNeeded);
    result = 0;
    for (const byte of bytes) result = (result << 8) | byte;
    result &= mask;
  } while (result >= range);

  return result + min;
}

/** Pick a random element from an array using CSPRNG */
export function secureRandomPick<T>(arr: T[]): T {
  return arr[secureRandomInt(0, arr.length)]!;
}

/** Shuffle an array in-place using Fisher-Yates with CSPRNG */
export function secureShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

// --- Token Generation ---

/** Generate a secure random token */
export function generateToken(options: TokenOptions = {}): string {
  const {
    length = 32,
    encoding = "hex",
    prefix = "",
    alphabet,
  } = options;

  const bytes = secureRandom(length);

  switch (encoding) {
    case "hex":
      return prefix + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    case "base64url":
      return prefix + toBase64Url(bytes);
    case "base64":
      return prefix + encode(bytes, "base64");
    default:
      if (alphabet) {
        let token = "";
        for (const byte of bytes) token += alphabet[byte % alphabet.length]!;
        return prefix + token;
      }
      return prefix + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

/** Generate a UUID v4 using crypto.randomUUID() */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/** Generate a unique ID with optional prefix and custom alphabet */
export function uniqueId(prefix = "", length = 16): string {
  return generateToken({ length, encoding: "hex", prefix });
}

/** Generate a nanoid-style ID */
export function nanoid(size = 21): string {
  const urlAlphabet = "ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZX6jWQu";
  return generateToken({ length: size, alphabet: urlAlphabet });
}

// --- Password Strength ---

/** Analyze password strength */
export function analyzePassword(password: string): PasswordStrengthResult {
  let score = 0;
  const suggestions: string[] = [];

  // Length checks
  if (password.length < 6) {
    suggestions.push("Use at least 6 characters");
  } else if (password.length < 8) {
    score += 1;
  } else if (password.length < 12) {
    score += 2;
  } else {
    score += 3;
  }

  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  score += Math.min(varietyCount, 2);

  if (!hasLower) suggestions.push("Add lowercase letters");
  if (!hasUpper) suggestions.push("Add uppercase letters");
  if (!hasDigit) suggestions.push("Add numbers");
  if (!hasSpecial) suggestions.push("Add special characters");

  // Common patterns penalty
  if (/^[a-zA-Z]+$/.test(password)) score = Math.max(score - 1, 0);
  if (/^\d+$/.test(password)) score = Math.max(score - 1, 0);
  if (/^(123|abc|qwerty|password|admin|letmein)/i.test(password)) {
    score = Math.max(score - 2, 0);
    suggestions.push("Avoid common patterns");
  }
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(score - 1, 0);
    suggestions.push("Avoid repeated characters");
  }

  // Sequential patterns
  if (/(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    score = Math.max(score - 1, 0);
    suggestions.push("Avoid sequential characters");
  }

  // Clamp score
  score = Math.min(Math.max(score, 0), 4);

  // Entropy calculation
  let charsetSize = 0;
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSpecial) charsetSize += 32;
  const entropy = charsetSize > 0 ? Math.floor(password.length * Math.log2(charsetSize)) : 0;

  // Crack time estimate (rough approximation at 10 billion guesses/sec)
  const combinations = Math.pow(charsetSize || 1, password.length);
  const guessesPerSecond = 10_000_000_000;
  const secondsToCrack = combinations / guessesPerSecond;
  const crackTimeEstimate = formatCrackTime(secondsToCrack);

  const verdicts = ["very_weak", "weak", "fair", "strong", "very_strong"] as const;

  return {
    score,
    verdict: verdicts[score],
    suggestions,
    crackTimeEstimate,
    entropy,
  };
}

function formatCrackTime(seconds: number): string {
  if (seconds < 1) return "instant";
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000 * 100) return `${Math.round(seconds / 31536000)} years`;
  if (seconds < 31536000 * 1000000) return `${Math.round(seconds / 31536000 / 1000)} thousand years`;
  return "centuries+";
}

// --- JWT-like Utilities (client-side only, no verification library needed) ---

/** Create a simple unsigned JWT-like token (for client-side state encoding) */
export function createUnsignedJwt(payload: Record<string, unknown>, headerOverrides?: Record<string, unknown>): string {
  const header = { alg: "none", typ: "JWT", ...headerOverrides };
  const encodedHeader = toBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encodedHeader}.${encodedPayload}.`;
}

/** Parse a JWT-like token without signature verification */
export function parseJwt(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1])));
    return { header, payload };
  } catch {
    return null;
  }
}

// --- Diffie-Hellman Key Exchange (ECDH) ---

/** Perform ECDH key derivation */
export async function ecdhDeriveBits(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  curve: "P-256" | "P-384" | "P-521" = "P-256",
  bitLength = 256,
): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits({ name: "ECDH", namedCurve: curve }, privateKey, publicKey, bitLength);
}

/** Generate an ECDH key pair */
export async function generateEcdhKeyPair(curve: "P-256" | "P-384" | "P-521" = "P-256"): Promise<KeyPairResult> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: curve },
    true,
    ["deriveBits"],
  );

  return {
    publicKey: pair.publicKey,
    privateKey: pair.privateKey,
    publicKeyJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateKeyJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
}

// --- Constant-Time Comparison ---

/** Constant-time string comparison to prevent timing attacks */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

// --- Utility: Check Web Crypto availability ---

/** Check if Web Crypto API is available */
export function isCryptoAvailable(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";
}
