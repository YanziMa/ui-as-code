/**
 * Cryptographic utilities for browser environments using Web Crypto API.
 * Hashing, HMAC, key derivation, symmetric/asymmetric encryption,
 * digital signatures, secure random generation, password utilities, encoding.
 */

// --- Encoding Utilities ---

/** Encode Uint8Array to base64 string */
export function toBase64(data: Uint8Array): string {
  let binary = "";
  const bytes = new Uint8Array(data);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

/** Decode base64 string to Uint8Array */
export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)!;
  return bytes;
}

/** Encode Uint8Array to hex string */
export function toHex(data: Uint8Array): string {
  return Array.from(new Uint8Array(data), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Decode hex string to Uint8Array */
export function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

/** String to Uint8Array (UTF-8) */
export function strToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Uint8Array to string (UTF-8) */
export function bytesToStr(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

/** URL-safe base64 encode */
export function toBase64Url(data: Uint8Array): string {
  return toBase64(data).replace(/\+/g, "-").replace(/\//g, "_");
}

/** URL-safe base64 decode */
export function fromBase64Url(b64: string): Uint8Array {
  return fromBase64(b64.replace(/-/g, "+").replace(/_/g, "/"));
}

// --- Secure Random Generation ---

/** Generate cryptographically strong random bytes */
export async function randomBytes(length: number): Promise<Uint8Array> {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Generate random integer in [min, max] inclusive */
export async function randomInt(min = 0, max = Number.MAX_SAFE_INTEGER): Promise<number> {
  const range = max - min + 1;
  const bytes = await randomBytes(6);
  const view = new DataView(bytes);
  const rand = view.getUint32(0) % range;
  return min + rand;
}

/** Generate secure random UUID v4 */
export async function randomUUID(): Promise<string> {
  const bytes = await randomBytes(16);
  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 14).charAt(0)}${hex.slice(14, 16)}-${hex.slice(16)}`;
}

/** Generate secure random string from charset */
export async function randomString(length = 32, charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"): Promise<string> {
  const chars = strToBytes(charset);
  const bytes = await randomBytes(length);
  return Array.from(bytes, (b) => chars[b % chars.byteLength]).join("");
}

/** Generate secure token (hex format) */
export async function generateToken(bytes = 32): Promise<string> {
  return toHex(await randomBytes(bytes));
}

/** Generate API key with prefix (e.g., "sk_live_a1b2c3...") */
export async function generateApiKey(prefix = "sk", bytes = 24): Promise<string> {
  const secret = toHex(await randomBytes(bytes));
  return `${prefix}_${secret}`;
}

// --- Hashing ---

type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

/** Hash data using specified algorithm. Returns hex-encoded digest. */
export async function hash(data: string | Uint8Array, algo: HashAlgorithm = "SHA-256"): Promise<string> {
  const encoder = new TextEncoder();
  const dataBytes = typeof data === "string" ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest(algo, dataBuffer);
  return toHex(new Uint8Array(hashBuffer));
}

/** SHA-256 convenience */
export async function sha256(data: string | Uint8Array): Promise<string> { return hash(data, "SHA-256"); }
/** SHA-512 convenience */
export async function sha512(data: string | Uint8Array): Promise<string> { return hash(data, "SHA-512"); }

// --- HMAC ---

/** Compute HMAC using specified hash algorithm */
export async function hmac(
  key: string | Uint8Array,
  message: string | Uint8Array,
  algo: HashAlgorithm = "SHA-256",
): Promise<string> {
  const keyBytes = typeof key === "string" ? strToBytes(key) : key;
  const msgBytes = typeof message === "string" ? strToBytes(message) : message;
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: algo }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
  return toHex(new Uint8Array(sig));
}

/** HMAC-SHA256 convenience */
export async function hmacSha256(key: string | Uint8Array, message: string | Uint8Array): Promise<string> {
  return hmac(key, message, "SHA-256");
}

// --- Key Derivation ---

/** Derive key from password using PBKDF2 */
export async function pbkdf2(
  password: string,
  salt: string | Uint8Array,
  iterations = 100000,
  length = 256,
  hash: HashAlgorithm = "SHA-256",
): Promise<Uint8Array> {
  const passBytes = strToBytes(password);
  const saltBytes = typeof salt === "string" ? strToBytes(salt) : salt;
  const keyMaterial = await crypto.subtle.importKey("raw", passBytes, "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2" },
    keyMaterial,
    { name: hash, salt: saltBytes, iterations },
    length,
    ["raw"],
  );
  return new Uint8Array(derived);
}

// --- Symmetric Encryption (AES-GCM) ---

interface AesGcmResult {
  ciphertext: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
}

/** Generate a random AES-GCM key (256-bit) */
export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

/** Export AES key to raw bytes */
export async function exportAesKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return new Uint8Array(exported);
}

/** Import AES key from raw bytes */
export async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Encrypt data with AES-GCM. Returns { ciphertext, iv, tag }. */
export async function aesEncrypt(
  plaintext: string | Uint8Array,
  key?: CryptoKey | Uint8Array,
  aad?: string | Uint8Array,
): Promise<AesGcmResult> {
  const aesKey = key ?? await generateAesKey();
  const cryptoKey = aesKey instanceof CryptoKey ? aesKey : await importAesKey(aesKey);
  const iv = await randomBytes(12);
  const plainBytes = typeof plaintext === "string" ? strToBytes(plaintext) : plaintext;
  const aadBytes = aad ? (typeof aad === "string" ? strToBytes(aad) : aad) : undefined;
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128, ...(aadBytes ? { additionalData: aadBytes } : {}) },
    cryptoKey,
    plainBytes,
  );
  // Split into ciphertext + tag
  const ct = new Uint8Array(cipher.slice(0, -16));
  const tag = new Uint8Array(cipher.slice(-16));
  return { ciphertext: ct, iv, tag };
}

/** Decrypt AES-GCM ciphertext. Returns original plaintext as Uint8Array. */
export async function aesDecrypt(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  tag: Uint8Array,
  key?: CryptoKey | Uint8Array,
  aad?: string | Uint8Array,
): Promise<Uint8Array> {
  const aesKey = key ?? await generateAesKey();
  const cryptoKey = aesKey instanceof CryptoKey ? aesKey : await importAesKey(aesKey);
  // Combine ciphertext + tag
  const combined = new Uint8Array([...ciphertext, ...tag]);
  const aadBytes = aad ? (typeof aad === "string" ? strToBytes(aad) : aad) : undefined;
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: 128, ...(aadBytes ? { additionalData: aadBytes } : {}) },
    cryptoKey,
    combined,
  );
  return new Uint8Array(plain);
}

// --- Asymmetric Encryption (RSA-OAEP) ---

/** Generate RSA key pair (default 2048-bit) */
export async function generateRsaKeyPair(modulusLength = 2048): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: "SHA-256" },
    true, ["encrypt", "decrypt"],
  );
}

/** Encrypt with RSA-OAEP public key */
export async function rsaEncrypt(
  plaintext: string | Uint8Array,
  publicKey: CryptoKey,
): Promise<Uint8Array> {
  const plainBytes = typeof plaintext === "string" ? strToBytes(plaintext) : plaintext;
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, plainBytes);
  return new Uint8Array(encrypted);
}

/** Decrypt with RSA-OAEP private key */
export async function rsaDecrypt(
  ciphertext: Uint8Array,
  privateKey: CryptoKey,
): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt({ name: "DSA-OAEP" }, privateKey, ciphertext);
  return new Uint8Array(decrypted);
}

/** Export RSA public key to SPKI format (base64) */
export async function exportRsaPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", key);
  return toBase64(new Uint8Array(exported));
}

/** Import RSA public key from SPKI (base64) */
export async function importRsaPublicKey(spkiB64: string): Promise<CryptoKey> {
  const spki = fromBase64(spkiB64);
  return crypto.subtle.importKey("spki", spki, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
}

// --- Digital Signatures ---

type EcCurve = "P-256" | "P-384" | "P-521";

/** Generate ECDSA key pair */
export async function generateEcKeyPair(curve: EcCurve = "P-256"): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: curve }, true, ["sign", "verify"]);
}

/** Sign data with ECDSA private key */
export async function ecdsaSign(
  data: string | Uint8Array,
  privateKey: CryptoKey,
): Promise<Uint8Array> {
  const dataBytes = typeof data === "string" ? strToBytes(data) : data;
  const signature = await crypto.subtle.sign({ name: "ECDSA" }, privateKey, dataBytes);
  return new Uint8Array(signature);
}

/** Verify ECDSA signature */
export async function ecdsaVerify(
  data: string | Uint8Array,
  signature: Uint8Array,
  publicKey: CryptoKey,
): Promise<boolean> {
  const dataBytes = typeof data === "string" ? strToBytes(data) : data;
  try {
    return await crypto.subtle.verify({ name: "ECDSA" }, publicKey, signature, dataBytes);
  } catch { return false; }
}

/** Sign with RSA-PSS */
export async function rsaPssSign(
  data: string | Uint8Array,
  privateKey: CryptoKey,
): Promise<Uint8Array> {
  const dataBytes = typeof data === "string" ? strToBytes(data) : data;
  const signature = await crypto.subtle.sign({ name: "RSA-PSS" }, privateKey, dataBytes);
  return new Uint8Array(signature);
}

/** Verify RSA-PSS signature */
export async function rsaPssVerify(
  data: string | Uint8Array,
  signature: Uint8Array,
  publicKey: CryptoKey,
): Promise<boolean> {
  const dataBytes = typeof data === "string" ? strToBytes(data) : data;
  try {
    return await crypto.subtle.verify({ name: "RSA-PSS" }, publicKey, signature, dataBytes);
  } catch { return false; }
}

// --- Key Fingerprint ---

/** Get SHA-256 fingerprint of an exported SPKI public key */
export async function keyFingerprint(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  return hash(new Uint8Array(spki), "SHA-256");
}

// --- Diffie-Hellman (ECDH) ---

/** Derive shared secret from two ECDH key pairs */
export async function ecdhDeriveBits(
  publicKey: CryptoKey,
  privateKey: CryptoKey,
  bits = 256,
): Promise<Uint8Array> {
  return crypto.subtle.deriveBits({ name: ECDH, namedCurve: "P-256" }, privateKey, publicKey, bits, []);
}

// --- Password Utilities ---

interface PasswordStrengthResult {
  score: number;       // 0-100
  entropy: number;     // bits
  crackTime: string;   // estimated time to crack
  level: "weak" | "fair" | "good" | "strong";
  feedback: string[];
}

/** Estimate password strength based on entropy and common patterns */
export function estimatePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const feedback: string[] = [];
  const len = password.length;

  // Length scoring
  if (len >= 8) score += 20;
  if (len >= 12) score += 15;
  if (len >= 16) score += 15;
  if (len >= 20) score += 10;

  // Character variety
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (hasLower) { score += 10; } else { feedback.push("Add lowercase letters"); }
  if (hasUpper) { score += 10; } else { feedback.push("Add uppercase letters"); }
  if (hasDigit) { score += 10; } else { feedback.push("Add numbers"); }
  if (hasSpecial) { score += 15; } else { feedback.push("Add special characters"); }

  // Character set size estimation
  let charsetSize = 0;
  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSpecial) charsetSize += 33;
  if (charsetSize > 0) {
    const entropy = Math.log2(charsetSize) * len;
    score = Math.min(100, Math.round(entropy / 4)); // Normalize to ~0-100
  }

  // Common pattern penalties
  if (/^[a-z]+$/.test(password)) { score -= 30; feedback.push("All lowercase - easy to guess"); }
  if (/^[A-Z]+$/.test(password)) { score -= 30; feedback.push("All uppercase - easy to guess"); }
  if (/^\d+$/.test(password)) { score -= 40; feedback.push("All numbers - very weak"); }
  if (/^(123456|password|qwerty|abc123|admin|letmein)/i.test(password)) { score -= 50; feedback.push("Common password - extremely weak"); }
  if (/(.)\1{3,}/.test(password)) { score -= 15; feedback.push("Repeating characters detected"); }

  // Crack time estimation (assumes 10 billion guesses/second)
  const entropy = Math.log2(Math.max(charsetSize, 1)) * len;
  const guessesPerSec = 1e10;
  const seconds = Math.pow(2, entropy) / guessesPerSec;
  const crackTime = formatCrackTime(seconds);

  let level: "weak" | "fair" | "good" | "strong";
  if (score < 25) level = "weak";
  else if (score < 50) level = "fair";
  else if (score < 75) level = "good";
  else level = "strong";

  return { score: Math.max(0, Math.min(100, score)), entropy: Math.round(entropy), crackTime, level, feedback };
}

function formatCrackTime(seconds: number): string {
  if (seconds < 1) return "instant";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  if (seconds < 2592000) return `${Math.round(seconds / 86400)}d`;
  if (seconds < 31536000) return `${Math.round(seconds / 2592000)}mo`;
  return `${(seconds / 31536000).toFixed(1)}y`;
}

/** Generate a secure random password with configurable requirements */
export async function generatePassword(options?: {
  length?: number;
  lowercase?: boolean;
  uppercase?: boolean;
  digits?: boolean;
  special?: boolean;
}): Promise<string> {
  const opts = { length: 16, lowercase: true, uppercase: true, digits: true, special: true, ...options };
  let chars = "";
  if (opts.lowercase) chars += "abcdefghijklmnopqrstuvwxyz";
  if (opts.uppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (opts.digits) chars += "0123456789";
  if (opts.special) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";

  if (chars.length === 0) chars = "abcdefghijklmnopqrstuvwxyz";
  const charBytes = strToBytes(chars);
  const bytes = await randomBytes(opts.length);
  return Array.from(bytes, (b) => charBytes[b % charBytes.byteLength]).join("");
}
