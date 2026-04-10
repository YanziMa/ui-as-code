/**
 * @module encryption
 * @description Comprehensive cryptography and encryption utilities for browser environments.
 * Built entirely on the Web Crypto API (`crypto.subtle`). No external dependencies.
 *
 * Features:
 * - Symmetric encryption (AES-GCM)
 * - Asymmetric encryption (RSA-OAEP)
 * - Cryptographic hashing (SHA-2 family, HMAC)
 * - Password hashing (PBKDF2)
 * - Cryptographically secure random generation
 * - Encoding utilities (Base64, Hex, UTF-8)
 * - Key management (memory + localStorage with wrapping, key derivation)
 * - Digital signatures (ECDSA)
 * - JWT-like token creation and verification
 *
 * All operations are asynchronous where they involve `crypto.subtle`.
 */

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

/** Supported hash algorithms for digest operations */
export type HashAlgorithm = "SHA-256" | "SHA-384" | "SHA-512";

/** Supported HMAC hash algorithms */
export type HmacAlgorithm = "SHA-256" | "SHA-384" | "SHA-512";

/** AES-GCM algorithm configuration */
export interface AesGcmConfig {
  /** Length of the AES key in bits: 128, 192, or 256 */
  keyLength?: 128 | 192 | 256;
  /** Length of the initialization vector / nonce in bytes (default: 12, recommended for GCM) */
  ivLength?: number;
}

/** Result of an AES-GCM encryption operation */
export interface AesEncryptedResult {
  /** Base64url-encoded ciphertext (includes IV prepended) */
  ciphertext: string;
  /** Base64url-encoded authentication tag (extracted for convenience) */
  tag: string;
  /** The IV used (base64url-encoded) */
  iv: string;
}

/** RSA-OAEP key pair generation options */
export interface RsaKeyPairOptions {
  /** Modulus length in bits (default: 2048) */
  modulusLength?: 2048 | 4096;
  /** Public exponent (default: 65537) */
  publicExponent?: Uint8Array;
  /** Hash algorithm for OAEP (default: SHA-256) */
  hash?: HashAlgorithm;
}

/** Generated RSA key pair (exportable as spki/pkcs8) */
export interface RsaKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  /** SPKI-formatted public key (base64url) */
  publicKeySpki: string;
  /** PKCS#8-formatted private key (base64url) */
  privateKeyPkcs8: string;
}

/** ECDSA key pair generation options */
export interface EcdsaKeyPairOptions {
  /** Named curve (default: P-256) */
  namedCurve?: "P-256" | "P-384" | "P-521";
}

/** Generated ECDSA key pair */
export interface EcdsaKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  /** SPKI-formatted public key (base64url) */
  publicKeySpki: string;
  /** PKCS#8-formatted private key (base64url) */
  privateKeyPkcs8: string;
}

/** PBKDF2 derivation options */
export interface Pbkdf2Options {
  /** Number of iterations (default: 600000 per OWASP 2023 recommendation) */
  iterations?: number;
  /** Hash algorithm (default: SHA-256) */
  hash?: HashAlgorithm;
  /** Desired key length in bytes (default: 32 for 256-bit) */
  keyLength?: number;
  /** Optional salt; generated randomly if omitted */
  salt?: Uint8Array;
}

/** Result of a PBKDF2 derivation */
export interface Pbkdf2Result {
  /** Derived key in raw bytes */
  key: Uint8Array;
  /** Salt used (base64url-encoded) */
  salt: string;
  /** Iterations used */
  iterations: number;
}

/** Key storage entry metadata */
export interface KeyEntry {
  /** Unique identifier for this key */
  id: string;
  /** Algorithm the key is intended for */
  algorithm: string;
  /** Extractable flag at creation time */
  extractable: boolean;
  /** Key usages */
  usages: KeyUsage[];
  /** Creation timestamp (ms since epoch) */
  createdAt: number;
  /** Optional expiration timestamp (ms since epoch) */
  expiresAt?: number;
  /** Optional metadata map */
  metadata?: Record<string, string>;
}

/** Key storage configuration */
export interface KeyStoreConfig {
  /** Prefix for localStorage keys (default: "enc_key_") */
  storagePrefix?: string;
  /** Whether to persist to localStorage (default: false — memory only) */
  persist?: boolean;
  /** Master passphrase for wrapping keys before storage (optional but recommended when persisting) */
  wrappingPassphrase?: string;
}

/** Key derivation from passphrase options */
export interface KeyDerivationOptions {
  /** Passphrase to derive from */
  passphrase: string;
  /** Optional salt (randomly generated if not provided) */
  salt?: Uint8Array;
  /** Number of PBKDF2 iterations (default: 600000) */
  iterations?: number;
  /** Hash algorithm (default: SHA-256) */
  hash?: HashAlgorithm;
  /** Desired output key length in bits (default: 256) */
  length?: 128 | 192 | 256;
}

/** Result of key derivation from passphrase */
export interface DerivedKeyResult {
  /** The derived CryptoKey suitable for AES-GCM */
  key: CryptoKey;
  /** Raw key bytes */
  rawKey: Uint8Array;
  /** Salt used (base64url-encoded) */
  salt: string;
  /** Iterations used */
  iterations: number;
}

/** JWT-like token payload */
export interface JwtPayload {
  /** Issuer identifier */
  iss?: string;
  /** Subject identifier */
  sub?: string;
  /** Audience(s) */
  aud?: string | string[];
  /** Expiration time (seconds since epoch) */
  exp?: number;
  /** Not-before time (seconds since epoch) */
  nbf?: number;
  /** Issued-at time (seconds since epoch) */
  iat?: number;
  /** Unique token identifier */
  jti?: string;
  /** Custom claims */
  [key: string]: unknown;
}

/** JWT-like token header */
export interface JwtHeader {
  /** Algorithm identifier */
  alg: string;
  /** Token type */
  typ: string;
  /** Key ID (optional) */
  kid?: string;
}

/** Result of token verification */
export interface TokenVerifyResult {
  /** Whether the signature is valid and token is not expired */
  valid: boolean;
  /** Decoded payload (null if invalid) */
  payload: JwtPayload | null;
  /** Reason for failure, if any */
  error?: string;
}

/** Random string generator options */
export interface RandomStringOptions {
  /** Length of the output string (default: 32) */
  length?: number;
  /** Character set to draw from (default: alphanumeric) */
  charset?: RandomCharset;
}

/** Predefined character sets for random string generation */
export type RandomCharset =
  | "alphanumeric"
  | "alphabetic"
  | "numeric"
  | "hex"
  | "base64"
  | " printable";

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Asserts that the Web Crypto API is available.
 * @throws {Error} If `crypto.subtle` is not available in the current environment.
 */
function assertSubtle(): void {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(
      "Web Crypto API (crypto.subtle) is not available in this environment. " +
        "Ensure you are running in a secure context (HTTPS or localhost).",
    );
  }
}

/**
 * Converts an ArrayBuffer or ArrayBufferView to a Uint8Array.
 * @param buffer - The buffer to convert.
 * @returns A Uint8Array view of the data.
 */
function toUint8Array(buffer: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (buffer instanceof Uint8Array) return buffer;
  return new Uint8Array(buffer);
}

// ---------------------------------------------------------------------------
// 1. Symmetric Encryption (AES-GCM)
// ---------------------------------------------------------------------------

/**
 * Generates a new AES-GCM symmetric key.
 *
 * @param config - Optional configuration for key length.
 * @returns A Promise resolving to the generated CryptoKey.
 *
 * @example
 * ```ts
 * const key = await generateAesKey({ keyLength: 256 });
 * ```
 */
export async function generateAesKey(
  config: AesGcmConfig = {},
): Promise<CryptoKey> {
  assertSubtle();
  const keyLength = config.keyLength ?? 256;
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: keyLength },
    true, // extractable
    ["encrypt", "decrypt"],
  );
}

/**
 * Exports an AES key to raw bytes (base64url-encoded).
 *
 * @param key - The CryptoKey to export.
 * @returns A Promise resolving to the base64url-encoded raw key.
 */
export async function exportAesKey(key: CryptoKey): Promise<string> {
  assertSubtle();
  const raw = await crypto.subtle.exportKey("raw", key);
  return uint8ArrayToBase64Url(new Uint8Array(raw));
}

/**
 * Imports a raw AES key from base64url-encoded bytes.
 *
 * @param rawKey - The base64url-encoded raw key material.
 * @param usages - Key usages (default: ['encrypt', 'decrypt']).
 * @returns A Promise resolving to the imported CryptoKey.
 */
export async function importAesKey(
  rawKey: string,
  usages: KeyUsage[] = ["encrypt", "decrypt"],
): Promise<CryptoKey> {
  assertSubtle();
  const keyData = base64UrlToUint8Array(rawKey);
  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: keyData.length * 8 },
    true,
    usages,
  );
}

/**
 * Encrypts a UTF-8 string using AES-GCM.
 *
 * The IV is prepended to the ciphertext so that decryption can be performed
 * with only the key and the combined output. The authentication tag is
 * appended by GCM automatically and included in the ciphertext.
 *
 * @param plaintext - The string to encrypt.
 * @param key - The AES-GCM CryptoKey.
 * @param config - Optional IV length (default: 12 bytes).
 * @returns A Promise resolving to an {@link AesEncryptedResult}.
 *
 * @example
 * ```ts
 * const key = await generateAesKey();
 * const result = await aesGcmEncrypt("secret message", key);
 * console.log(result.ciphertext); // base64url-encoded
 * const decrypted = await aesGcmDecrypt(result.ciphertext, key);
 * ```
 */
export async function aesGcmEncrypt(
  plaintext: string,
  key: CryptoKey,
  config: AesGcmConfig = {},
): Promise<AesEncryptedResult> {
  assertSubtle();
  const ivLength = config.ivLength ?? 12;
  const iv = getRandomBytes(ivLength);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  const cipherBytes = new Uint8Array(cipherBuffer);
  // GCM appends the 16-byte authentication tag at the end
  const tagLength = 16;
  const ctLength = cipherBytes.length - tagLength;
  const ciphertext = cipherBytes.slice(0, ctLength);
  const tag = cipherBytes.slice(ctLength);

  // Prepend IV to ciphertext for convenient transport
  const combined = new Uint8Array(ivLength + ctLength);
  combined.set(iv, 0);
  combined.set(ciphertext, ivLength);

  return {
    ciphertext: uint8ArrayToBase64Url(combined),
    tag: uint8ArrayToBase64Url(tag),
    iv: uint8ArrayToBase64Url(iv),
  };
}

/**
 * Decrypts an AES-GCM encrypted string.
 *
 * Expects the ciphertext to have the IV prepended (as produced by
 * {@link aesGcmEncrypt}).
 *
 * @param ciphertext - The base64url-encoded ciphertext (IV prepended).
 * @param key - The AES-GCM CryptoKey.
 * @param ivLength - The IV length used during encryption (default: 12).
 * @returns A Promise resolving to the decrypted plaintext string.
 * @throws {Error} If decryption fails (wrong key, tampered data, etc.).
 */
export async function aesGcmDecrypt(
  ciphertext: string,
  key: CryptoKey,
  ivLength: number = 12,
): Promise<string> {
  assertSubtle();
  const combined = base64UrlToUint8Array(ciphertext);

  if (combined.length <= ivLength) {
    throw new Error("Ciphertext is too short to contain an IV.");
  }

  const iv = combined.slice(0, ivLength);
  const cipherAndTag = combined.slice(ivLength);

  const decoder = new TextDecoder();
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherAndTag,
    );
    return decoder.decode(plaintext);
  } catch (err) {
    throw new Error(
      `Decryption failed. The data may be corrupted or the key is incorrect: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Asymmetric Encryption (RSA-OAEP)
// ---------------------------------------------------------------------------

/**
 * Generates an RSA-OAEP key pair for asymmetric encryption/decryption.
 *
 * @param options - Key generation parameters.
 * @returns A Promise resolving to an {@link RsaKeyPair}.
 *
 * @example
 * ```ts
 * const keyPair = await generateRsaKeyPair({ modulusLength: 2048 });
 * const encrypted = await rsaEncrypt("sensitive data", keyPair.publicKey);
 * const decrypted = await rsaDecrypt(encrypted, keyPair.privateKey);
 * ```
 */
export async function generateRsaKeyPair(
  options: RsaKeyPairOptions = {},
): Promise<RsaKeyPair> {
  assertSubtle();
  const modulusLength = options.modulusLength ?? 2048;
  const publicExponent =
    options.publicExponent ?? new Uint8Array([0x01, 0x00, 0x01]); // 65537
  const hash = options.hash ?? "SHA-256";

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength,
      publicExponent,
      hash,
    },
    true, // extractable
    ["encrypt", "decrypt"],
  );

  const publicKeySpki = uint8ArrayToBase64Url(
    new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey)),
  );
  const privateKeyPkcs8 = uint8ArrayToBase64Url(
    new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)),
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeySpki,
    privateKeyPkcs8,
  };
}

/**
 * Imports an RSA public key from SPKI format (base64url-encoded).
 *
 * @param spkiBase64 - The SPKI-formatted public key.
 * @param hash - Hash algorithm (default: SHA-256).
 * @returns A Promise resolving to the imported CryptoKey.
 */
export async function importRsaPublicKey(
  spkiBase64: string,
  hash: HashAlgorithm = "SHA-256",
): Promise<CryptoKey> {
  assertSubtle();
  const keyData = base64UrlToUint8Array(spkiBase64);
  return crypto.subtle.importKey(
    "spki",
    keyData,
    { name: "RSA-OEP", hash },
    false,
    ["encrypt"],
  );
}

/**
 * Imports an RSA private key from PKCS#8 format (base64url-encoded).
 *
 * @param pkcs8Base64 - The PKCS#8-formatted private key.
 * @param hash - Hash algorithm (default: SHA-256).
 * @returns A Promise resolving to the imported CryptoKey.
 */
export async function importRsaPrivateKey(
  pkcs8Base64: string,
  hash: HashAlgorithm = "SHA-256",
): Promise<CryptoKey> {
  assertSubtle();
  const keyData = base64UrlToUint8Array(pkcs8Base64);
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSA-OAEP", hash },
    false,
    ["decrypt"],
  );
}

/**
 * Encrypts data with an RSA-OAEP public key.
 *
 * Note: RSA-OAEP has size limitations. For large data, use hybrid encryption:
 * generate a random AES key, encrypt the data with AES-GCM, then encrypt the
 * AES key with RSA-OAEP.
 *
 * @param plaintext - The string to encrypt.
 * @param publicKey - The recipient's RSA public key.
 * @returns A Promise resolving to the base64url-encoded ciphertext.
 */
export async function rsaEncrypt(
  plaintext: string,
  publicKey: CryptoKey,
): Promise<string> {
  assertSubtle();
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    data,
  );
  return uint8ArrayToBase64Url(new Uint8Array(encrypted));
}

/**
 * Decrypts data with an RSA-OAEP private key.
 *
 * @param ciphertext - The base64url-encoded ciphertext.
 * @param privateKey - The recipient's RSA private key.
 * @returns A Promise resolving to the decrypted plaintext string.
 */
export async function rsaDecrypt(
  ciphertext: string,
  privateKey: CryptoKey,
): Promise<string> {
  assertSubtle();
  const decoder = new TextDecoder();
  const data = base64UrlToUint8Array(ciphertext);
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      data,
    );
    return decoder.decode(decrypted);
  } catch (err) {
    throw new Error(
      `RSA decryption failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Performs hybrid encryption: encrypts data with AES-GCM, then wraps the AES
 * key with RSA-OAEP. Suitable for data larger than RSA's size limit.
 *
 * @param plaintext - The string to encrypt.
 * @param publicKey - The recipient's RSA public key.
 * @returns A Promise resolving to a combined encrypted package (base64url).
 */
export async function hybridEncrypt(
  plaintext: string,
  publicKey: CryptoKey,
): Promise<string> {
  assertSubtle();

  // Generate a one-time AES-256 key
  const aesKey = await generateAesKey({ keyLength: 256 });

  // Encrypt the plaintext with AES-GCM
  const encrypted = await aesGcmEncrypt(plaintext, aesKey);

  // Export and wrap the AES key with RSA
  const rawAesKey = await exportAesKey(aesKey);
  const wrappedKey = await rsaEncrypt(rawAesKey, publicKey);

  // Combine: wrappedKey . encrypted.ciphertext . encrypted.tag . encrypted.iv
  const packageObj = {
    wk: wrappedKey,
    ct: encrypted.ciphertext,
    tg: encrypted.tag,
    iv: encrypted.iv,
  };
  return uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(packageObj)),
  );
}

/**
 * Decrypts a hybrid-encrypted package.
 *
 * @param packageStr - The base64url-encoded package from {@link hybridEncrypt}.
 * @param privateKey - The recipient's RSA private key.
 * @returns A Promise resolving to the decrypted plaintext string.
 */
export async function hybridDecrypt(
  packageStr: string,
  privateKey: CryptoKey,
): Promise<string> {
  assertSubtle();

  const pkgJson = new TextDecoder().decode(base64UrlToUint8Array(packageStr));
  const pkg = JSON.parse(pkgJson) as { wk: string; ct: string; tg: string; iv: string };

  // Unwrap the AES key
  const rawAesKey = await rsaDecrypt(pkg.wk, privateKey);
  const aesKey = await importAesKey(rawAesKey);

  // Decrypt the ciphertext
  return aesGcmDecrypt(pkg.ct, aesKey);
}

// ---------------------------------------------------------------------------
// 3. Hashing (SHA-2 Family & HMAC)
// ---------------------------------------------------------------------------

/**
 * Computes a cryptographic hash of a UTF-8 string.
 *
 * @param data - The string to hash.
 * @param algorithm - Hash algorithm (default: SHA-256).
 * @returns A Promise resolving to the hex-encoded hash digest.
 *
 * @example
 * ```ts
 * const digest = await hash("hello world", "SHA-256");
 * // => "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
 * ```
 */
export async function hash(
  data: string,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  assertSubtle();
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(algorithm, encoder.encode(data));
  return arrayBufferToHex(digest);
}

/**
 * Computes a cryptographic hash of raw bytes.
 *
 * @param data - The bytes to hash.
 * @param algorithm - Hash algorithm (default: SHA-256).
 * @returns A Promise resolving to the hex-encoded hash digest.
 */
export async function hashBytes(
  data: ArrayBufferView | ArrayBuffer,
  algorithm: HashAlgorithm = "SHA-256",
): Promise<string> {
  assertSubtle();
  const digest = await crypto.subtle.digest(algorithm, data);
  return arrayBufferToHex(digest);
}

/**
 * Computes an HMAC (Hash-based Message Authentication Code).
 *
 * @param key - The secret key as a string.
 * @param message - The message to authenticate.
 * @param algorithm - HMAC hash algorithm (default: SHA-256).
 * @returns A Promise resolving to the hex-encoded HMAC.
 *
 * @example
 * ```ts
 * const mac = await hmac("secret-key", "important message", "SHA-256");
 * ```
 */
export async function hmac(
  key: string,
  message: string,
  algorithm: HmacAlgorithm = "SHA-256",
): Promise<string> {
  assertSubtle();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return arrayBufferToHex(signature);
}

/**
 * Verifies an HMAC against a message and key.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param key - The secret key as a string.
 * @param message - The message that was authenticated.
 * @param expectedMac - The expected hex-encoded HMAC.
 * @param algorithm - HMAC hash algorithm (default: SHA-256).
 * @returns A Promise resolving to `true` if the MAC is valid.
 */
export async function verifyHmac(
  key: string,
  message: string,
  expectedMac: string,
  algorithm: HmacAlgorithm = "SHA-256",
): Promise<boolean> {
  const computed = await hmac(key, message, algorithm);
  return timingSafeEqual(computed, expectedMac);
}

// ---------------------------------------------------------------------------
// 4. Password Hashing (PBKDF2)
// ---------------------------------------------------------------------------

/**
 * Derives a cryptographic key from a password using PBKDF2.
 * Suitable for password storage simulation and key derivation scenarios.
 *
 * Per OWASP recommendations (2023):
 * - Use at least 600,000 iterations for SHA-256
 * - Use a 128-bit (16-byte) or longer salt
 *
 * @param password - The password to derive from.
 * @param options - PBKDF2 parameters.
 * @returns A Promise resolving to a {@link Pbkdf2Result}.
 *
 * @example
 * ```ts
 * const result = await pbkdf2("user-password", { iterations: 600000 });
 * console.log(result.key);       // Uint8Array derived key
 * console.log(result.salt);      // base64url-encoded salt (store this!)
 * ```
 */
export async function pbkdf2(
  password: string,
  options: Pbkdf2Options = {},
): Promise<Pbkdf2Result> {
  assertSubtle();
  const iterations = options.iterations ?? 600_000;
  const hash = options.hash ?? "SHA-256";
  const keyLength = options.keyLength ?? 32; // 256 bits
  const salt = options.salt ?? getRandomBytes(16);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash,
    },
    keyMaterial,
    keyLength * 8,
  );

  return {
    key: new Uint8Array(bits),
    salt: uint8ArrayToBase64Url(salt),
    iterations,
  };
}

/**
 * Verifies a password against a previously-derived PBKDF2 hash.
 *
 * @param password - The password to verify.
 * @param storedKey - The stored derived key (hex or base64url-encoded).
 * @param salt - The salt used during derivation (base64url-encoded).
 * @param iterations - The iteration count used.
 * @param hash - The hash algorithm used.
 * @returns A Promise resolving to `true` if the password matches.
 */
export async function verifyPbkdf2(
  password: string,
  storedKey: string,
  salt: string,
  iterations: number,
  hash: HashAlgorithm = "SHA-256",
): Promise<boolean> {
  const result = await pbkdf2(password, { salt: base64UrlToUint8Array(salt), iterations, hash });
  const storedBytes = isHexString(storedKey)
    ? hexToUint8Array(storedKey)
    : base64UrlToUint8Array(storedKey);
  return timingSafeEqualBytes(result.key, storedBytes);
}

// ---------------------------------------------------------------------------
// 5. Cryptographically Secure Random Generation
// ---------------------------------------------------------------------------

/**
 * Generates cryptographically secure random bytes.
 *
 * @param length - Number of random bytes to generate.
 * @returns A Uint8Array filled with random values.
 *
 * @example
 * ```ts
 * const nonce = getRandomBytes(12); // for AES-GCM IV
 * ```
 */
export function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("crypto.getRandomValues is not available in this environment.");
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generates a UUID v4 (RFC 4122) using cryptographically secure randomness.
 *
 * Falls back to `crypto.randomUUID()` when available (modern browsers).
 *
 * @returns A UUID v4 string, e.g., "550e8400-e29b-41d4-a716-446655440000".
 */
export function randomUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const bytes = getRandomBytes(16);
  // Set version 4 bits: 0100xxxx
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant bits: 10xxxxxx
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = arrayBufferToHex(bytes.buffer as ArrayBuffer);
  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20, 32)
  );
}

/**
 * Generates a cryptographically secure random string.
 *
 * @param options - Generator options (length, charset).
 * @returns A random string of the specified length and character set.
 *
 * @example
 * ```ts
 * const token = secureRandomString({ length: 32, charset: "alphanumeric" });
 * const apiKey = secureRandomString({ length: 64, charset: "base64" });
 * ```
 */
export function secureRandomString(options: RandomStringOptions = {}): string {
  const length = options.length ?? 32;
  const charsetType = options.charset ?? "alphanumeric";

  const charsets: Record<RandomCharset, string> = {
    alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    alphabetic: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    numeric: "0123456789",
    hex: "0123456789abcdef",
    base64: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    printable: ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~' +
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  };

  const charset = charsets[charsetType];
  const charsetLen = charset.length;
  const maxValid = 256 - (256 % charsetLen); // avoid modulo bias

  let result = "";
  const needed = length;
  let collected = 0;

  while (collected < needed) {
    // Read enough bytes for remaining characters
    const batchSize = Math.min((needed - collected) * 2, 256);
    const bytes = getRandomBytes(batchSize);

    for (let i = 0; i < batchSize && collected < needed; i++) {
      const byte = bytes[i]!;
      if (byte < maxValid) {
        result += charset[byte % charsetLen]!;
        collected++;
      }
    }
  }

  return result;
}

/**
 * Returns a cryptographically secure random integer within `[min, max)` (half-open interval).
 *
 * Uses rejection sampling to avoid modulo bias.
 *
 * @param min - Inclusive minimum value.
 * @param max - Exclusive maximum value.
 * @returns A random integer in the range [min, max).
 * @throws {Error} If min >= max or range exceeds 2^48.
 */
export function secureRandomInt(min: number, max: number): number {
  if (min >= max) {
    throw new Error(`secureRandomInt: min (${min}) must be less than max (${max}).`);
  }
  const range = max - min;
  if (range > Number.MAX_SAFE_INTEGER) {
    throw new Error("secureRandomInt: range exceeds safe integer limit.");
  }

  // Calculate how many bits we need
  const bitLength = Math.ceil(Math.log2(range));
  const byteLength = Math.ceil(bitLength / 8);
  const maxVal = 2 ** (byteLength * 8);
  const maxAllowed = maxVal - (maxVal % range); // rejection threshold

  while (true) {
    const bytes = getRandomBytes(byteLength);
    let value = 0;
    for (let i = 0; i < byteLength; i++) {
      value = (value << 8) | (bytes[i] ?? 0);
    }
    if (value < maxAllowed) {
      return min + (value % range);
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Encoding Utilities
// ---------------------------------------------------------------------------

/**
 * Encodes binary data to a standard Base64 string.
 *
 * @param data - The bytes to encode.
 * @returns A standard Base64 string.
 */
export function base64Encode(data: Uint8Array | ArrayBuffer): string {
  const bytes = toUint8Array(data);
  if (typeof btoa !== "undefined") {
    // Chunk to avoid Latin1 range issues in some engines
    const binStr = String.fromCharCode(...bytes);
    return btoa(binStr);
  }
  // Fallback for Node.js-like environments without btoa
  return Buffer.from(bytes).toString("base64");
}

/**
 * Decodes a standard Base64 string to bytes.
 *
 * @param encoded - The Base64 string to decode.
 * @returns A Uint8Array containing the decoded bytes.
 */
export function base64Decode(encoded: string): Uint8Array {
  if (typeof atob !== "undefined") {
    const binStr = atob(encoded);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i)!;
    }
    return bytes;
  }
  // Fallback
  return new Uint8Array(Buffer.from(encoded, "base64"));
}

/**
 * Encodes binary data to a URL-safe Base64 string (no padding).
 * This is the preferred encoding for tokens, keys, and web transmission.
 *
 * @param data - The bytes to encode.
 * @returns A URL-safe Base64 string without padding.
 */
export function uint8ArrayToBase64Url(data: Uint8Array | ArrayBuffer): string {
  const bytes = toUint8Array(data);
  const base64 = base64Encode(bytes);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decodes a URL-safe Base64 string to bytes.
 * Accepts both padded and unpadded input.
 *
 * @param encoded - The URL-safe Base64 string.
 * @returns A Uint8Array containing the decoded bytes.
 */
export function base64UrlToUint8Array(encoded: string): Uint8Array {
  // Restore standard Base64 characters and padding
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  switch (base64.length % 4) {
    case 2:
      base64 += "==";
      break;
    case 3:
      base64 += "=";
      break;
  }
  return base64Decode(base64);
}

/**
 * Encodes binary data to a hexadecimal string.
 *
 * @param data - The bytes to encode.
 * @returns A lowercase hex string.
 */
export function arrayBufferToHex(buffer: ArrayBuffer | ArrayBufferView): string {
  const bytes = toUint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i]!.toString(16).padStart(2, "0"));
  }
  return hex;
}

/**
 * Decodes a hexadecimal string to bytes.
 *
 * @param hex - The hex string (case-insensitive).
 * @returns A Uint8Array containing the decoded bytes.
 * @throws {Error} If the string contains non-hex characters or has odd length.
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const sanitized = hex.replace(/[^0-9a-fA-F]/g, "");
  if (sanitized.length % 2 !== 0) {
    throw new Error("hexToUint8Array: hex string must have an even length.");
  }
  const bytes = new Uint8Array(sanitized.length / 2);
  for (let i = 0; i < sanitized.length; i += 2) {
    bytes[i / 2] = parseInt(sanitized.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Encodes a UTF-8 string to a Uint8Array.
 *
 * @param str - The string to encode.
 * @returns A Uint8Array containing the UTF-8 encoded bytes.
 */
export function utf8Encode(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Decodes a Uint8Array of UTF-8 bytes to a string.
 *
 * @param bytes - The UTF-8 encoded bytes.
 * @returns The decoded string.
 */
export function utf8Decode(bytes: Uint8Array | ArrayBuffer): string {
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// 7. Key Management
// ---------------------------------------------------------------------------

/**
 * In-memory key store with optional localStorage persistence and key wrapping.
 *
 * Keys are identified by a unique ID and can optionally be persisted to
 * localStorage (wrapped with a derived encryption key for security).
 *
 * @example
 * ```ts
 * const store = new KeyStore({ persist: true, wrappingPassphrase: "master-secret" });
 * await store.set("session-aes", aesKey, { algorithm: "AES-GCM" });
 * const retrieved = await store.get("session-aes");
 * ```
 */
export class KeyStore {
  private memoryMap: Map<string, { key: CryptoKey; meta: KeyEntry }>;
  private storagePrefix: string;
  private persist: boolean;
  private wrappingKey: CryptoKey | null;

  /**
   * Creates a new KeyStore instance.
   * @param config - Storage configuration options.
   */
  constructor(config: KeyStoreConfig = {}) {
    this.memoryMap = new Map();
    this.storagePrefix = config.storagePrefix ?? "enc_key_";
    this.persist = config.persist ?? false;
    this.wrappingKey = null;

    // Initialize wrapping key if passphrase is provided
    if (config.wrappingPassphrase) {
      // We defer actual key creation until first use to keep constructor sync
      this.initWrappingKey(config.wrappingPassphrase).then((key) => {
        this.wrappingKey = key;
      });
    }
  }

  private async initWrappingKey(passphrase: string): Promise<CryptoKey> {
    assertSubtle();
    const encoder = new TextEncoder();
    // Use a fixed salt for deterministic derivation of the wrapping key
    const salt = encoder.encode("key-store-wrapping-salt-v1");
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100_000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["wrapKey", "unwrapKey"],
    );
  }

  /**
   * Stores a CryptoKey under the given ID.
   *
   * @param id - Unique key identifier.
   * @param key - The CryptoKey to store.
   * @param meta - Metadata about the key.
   */
  async set(id: string, key: CryptoKey, meta: Partial<KeyEntry> = {}): Promise<void> {
    const entry: KeyEntry = {
      id,
      algorithm: meta.algorithm ?? key.algorithm?.name ?? "unknown",
      extractable: key.extractable,
      usages: key.usages ?? [],
      createdAt: Date.now(),
      expiresAt: meta.expiresAt,
      metadata: meta.metadata,
    };

    this.memoryMap.set(id, { key, meta: entry });

    if (this.persist && typeof localStorage !== "undefined") {
      await this.persistKey(id, key, entry);
    }
  }

  /**
   * Retrieves a CryptoKey by ID.
   *
   * @param id - The key identifier.
   * @returns The CryptoKey, or `null` if not found/expired.
   */
  async get(id: string): Promise<CryptoKey | null> {
    // Check memory first
    const memEntry = this.memoryMap.get(id);
    if (memEntry) {
      if (this.isExpired(memEntry.meta)) {
        this.memoryMap.delete(id);
        if (this.persist) this.removePersisted(id);
        return null;
      }
      return memEntry.key;
    }

    // Try loading from persistence
    if (this.persist && typeof localStorage !== "undefined") {
      return this.loadPersisted(id);
    }

    return null;
  }

  /**
   * Removes a key by ID.
   * @param id - The key identifier.
   */
  async delete(id: string): Promise<void> {
    this.memoryMap.delete(id);
    if (this.persist) {
      this.removePersisted(id);
    }
  }

  /**
   * Lists all stored key IDs (excluding expired keys).
   * @returns An array of key IDs.
   */
  list(): string[] {
    const now = Date.now();
    const ids: string[] = [];
    for (const [id, entry] of this.memoryMap) {
      if (!entry.meta.expiresAt || entry.meta.expiresAt > now) {
        ids.push(id);
      }
    }
    return ids;
  }

  /**
   * Clears all keys from memory and persistence.
   */
  async clear(): Promise<void> {
    this.memoryMap.clear();
    if (this.persist && typeof localStorage !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(this.storagePrefix)) {
          keysToRemove.push(k!);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    }
  }

  /**
   * Returns metadata for a stored key without exposing the key itself.
   * @param id - The key identifier.
   * @returns The KeyEntry metadata, or null if not found.
   */
  getMeta(id: string): KeyEntry | null {
    const entry = this.memoryMap.get(id);
    return entry?.meta ?? null;
  }

  // --- Persistence helpers ---

  private async persistKey(id: string, key: CryptoKey, _meta: KeyEntry): Promise<void> {
    try {
      if (!key.extractable) {
        // Non-extractable keys cannot be serialized; skip persistence
        console.warn(`Key "${id}" is not extractable and cannot be persisted.`);
        return;
      }

      const rawData = await crypto.subtle.exportKey("raw", key);
      const iv = getRandomBytes(12);

      let storedData: string;
      if (this.wrappingKey) {
        const wrapped = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          this.wrappingKey,
          rawData,
        );
        const combined = new Uint8Array(iv.length + wrapped.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(wrapped), iv.length);
        storedData = uint8ArrayToBase64Url(combined);
      } else {
        // Warning: storing unwrapped keys is insecure
        console.warn(`Storing key "${id}" without wrapping. Provide a wrappingPassphrase for security.`);
        storedData = uint8ArrayToBase64Url(new Uint8Array(rawData));
      }

      localStorage.setItem(this.storagePrefix + id, JSON.stringify({
        data: storedData,
        algorithm: key.algorithm?.name ?? "unknown",
        extractable: key.extractable,
        usages: key.usages,
        createdAt: Date.now(),
      }));
    } catch (err) {
      console.error(`Failed to persist key "${id}":`, err);
    }
  }

  private async loadPersisted(id: string): Promise<CryptoKey | null> {
    try {
      const raw = localStorage.getItem(this.storagePrefix + id);
      if (!raw) return null;

      const stored = JSON.parse(raw) as {
        data: string;
        algorithm: string;
        extractable: boolean;
        usages: KeyUsage[];
        createdAt: number;
      };

      let keyData: ArrayBuffer;

      if (this.wrappingKey) {
        const combined = base64UrlToUint8Array(stored.data);
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);
        keyData = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          this.wrappingKey,
          encrypted,
        );
      } else {
        keyData = base64UrlToUint8Array(stored.data);
      }

      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: stored.algorithm, length: (keyData as ArrayBuffer).byteLength * 8 },
        stored.extractable,
        stored.usages,
      );

      const entry: KeyEntry = {
        id,
        algorithm: stored.algorithm,
        extractable: stored.extractable,
        usages: stored.usages,
        createdAt: stored.createdAt,
      };
      this.memoryMap.set(id, { key, meta: entry });

      return key;
    } catch {
      return null;
    }
  }

  private removePersisted(id: string): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(this.storagePrefix + id);
    }
  }

  private isExpired(meta: KeyEntry): boolean {
    return meta.expiresAt !== undefined && Date.now() > meta.expiresAt;
  }
}

/**
 * Derives a cryptographic key from a passphrase using PBKDF2.
 * The resulting key is suitable for AES-GCM encryption/decryption.
 *
 * @param options - Derivation parameters.
 * @returns A Promise resolving to a {@link DerivedKeyResult}.
 *
 * @example
 * ```ts
 * const { key, salt } = await deriveKeyFromPassphrase({
 *   passphrase: "my-strong-passphrase",
 *   length: 256,
 * });
 * // Store `salt` alongside encrypted data to allow later re-derivation
 * ```
 */
export async function deriveKeyFromPassphrase(
  options: KeyDerivationOptions,
): Promise<DerivedKeyResult> {
  assertSubtle();
  const salt = options.salt ?? getRandomBytes(16);
  const iterations = options.iterations ?? 600_000;
  const hash = options.hash ?? "SHA-256";
  const length = options.length ?? 256;

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(options.passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash,
    },
    keyMaterial,
    { name: "AES-GCM", length },
    true, // extractable
    ["encrypt", "decrypt"],
  );

  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));

  return {
    key,
    rawKey,
    salt: uint8ArrayToBase64Url(salt),
    iterations,
  };
}

/**
 * Re-derives a key from a previously-used passphrase and salt.
 * Convenience wrapper around {@link deriveKeyFromPassphrase} for re-derivation.
 *
 * @param passphrase - The original passphrase.
 * @param salt - The base64url-encoded salt from the initial derivation.
 * @param iterations - The iteration count used initially.
 * @param length - The key length in bits (default: 256).
 * @returns A Promise resolving to a {@link DerivedKeyResult}.
 */
export async function rederiveKey(
  passphrase: string,
  salt: string,
  iterations: number,
  length: 128 | 192 | 256 = 256,
): Promise<DerivedKeyResult> {
  return deriveKeyFromPassphrase({
    passphrase,
    salt: base64UrlToUint8Array(salt),
    iterations,
    length,
  });
}

// ---------------------------------------------------------------------------
// 8. Digital Signatures (ECDSA)
// ---------------------------------------------------------------------------

/**
 * Generates an ECDSA key pair for signing and verification.
 *
 * @param options - Key generation options.
 * @returns A Promise resolving to an {@link EcdsaKeyPair}.
 *
 * @example
 * ```ts
 * const keyPair = await generateEcdsaKeyPair({ namedCurve: "P-256" });
 * const signature = await ecdsaSign("important document", keyPair.privateKey);
 * const valid = await ecdsaVerify("important document", signature, keyPair.publicKey);
 * ```
 */
export async function generateEcdsaKeyPair(
  options: EcdsaKeyPairOptions = {},
): Promise<EcdsaKeyPair> {
  assertSubtle();
  const namedCurve = options.namedCurve ?? "P-256";

  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve },
    true,
    ["sign", "verify"],
  );

  const publicKeySpki = uint8ArrayToBase64Url(
    new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey)),
  );
  const privateKeyPkcs8 = uint8ArrayToBase64Url(
    new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)),
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeySpki,
    privateKeyPkcs8,
  };
}

/**
 * Imports an ECDSA public key from SPKI format.
 *
 * @param spkiBase64 - The SPKI-formatted public key (base64url).
 * @param namedCurve - The named curve (default: P-256).
 * @returns A Promise resolving to the imported CryptoKey.
 */
export async function importEcdsaPublicKey(
  spkiBase64: string,
  namedCurve: "P-256" | "P-384" | "P-521" = "P-256",
): Promise<CryptoKey> {
  assertSubtle();
  const keyData = base64UrlToUint8Array(spkiBase64);
  return crypto.subtle.importKey(
    "spki",
    keyData,
    { name: "ECDSA", namedCurve },
    false,
    ["verify"],
  );
}

/**
 * Imports an ECDSA private key from PKCS#8 format.
 *
 * @param pkcs8Base64 - The PKCS#8-formatted private key (base64url).
 * @param namedCurve - The named curve (default: P-256).
 * @returns A Promise resolving to the imported CryptoKey.
 */
export async function importEcdsaPrivateKey(
  pkcs8Base64: string,
  namedCurve: "P-256" | "P-384" | "P-521" = "P-256",
): Promise<CryptoKey> {
  assertSubtle();
  const keyData = base64UrlToUint8Array(pkcs8Base64);
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve },
    false,
    ["sign"],
  );
}

/**
 * Signs data using ECDSA.
 *
 * @param data - The string data to sign.
 * @param privateKey - The signer's ECDSA private key.
 * @param hash - Hash algorithm for the signature (default: SHA-256).
 * @returns A Promise resolving to the base64url-encoded signature.
 */
export async function ecdsaSign(
  data: string,
  privateKey: CryptoKey,
  hash: HashAlgorithm = "SHA-256",
): Promise<string> {
  assertSubtle();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash },
    privateKey,
    encoder.encode(data),
  );
  return uint8ArrayToBase64Url(new Uint8Array(signature));
}

/**
 * Signs raw bytes using ECDSA.
 *
 * @param data - The bytes to sign.
 * @param privateKey - The signer's ECDSA private key.
 * @param hash - Hash algorithm (default: SHA-256).
 * @returns A Promise resolving to the base64url-encoded signature.
 */
export async function ecdsaSignBytes(
  data: ArrayBufferView | ArrayBuffer,
  privateKey: CryptoKey,
  hash: HashAlgorithm = "SHA-256",
): Promise<string> {
  assertSubtle();
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash },
    privateKey,
    data,
  );
  return uint8ArrayToBase64Url(new Uint8Array(signature));
}

/**
 * Verifies an ECDSA signature.
 *
 * @param data - The original signed data.
 * @param signature - The base64url-encoded signature.
 * @param publicKey - The signer's ECDSA public key.
 * @param hash - Hash algorithm (must match the one used for signing).
 * @returns A Promise resolving to `true` if the signature is valid.
 */
export async function ecdsaVerify(
  data: string,
  signature: string,
  publicKey: CryptoKey,
  hash: HashAlgorithm = "SHA-256",
): Promise<boolean> {
  assertSubtle();
  const encoder = new TextEncoder();
  const sigBytes = base64UrlToUint8Array(signature);
  try {
    return await crypto.subtle.verify(
      { name: "ECDSA", hash },
      publicKey,
      sigBytes,
      encoder.encode(data),
    );
  } catch {
    return false;
  }
}

/**
 * Verifies an ECDSA signature over raw bytes.
 *
 * @param data - The original signed bytes.
 * @param signature - The base64url-encoded signature.
 * @param publicKey - The signer's ECDSA public key.
 * @param hash - Hash algorithm (default: SHA-256).
 * @returns A Promise resolving to `true` if the signature is valid.
 */
export async function ecdsaVerifyBytes(
  data: ArrayBufferView | ArrayBuffer,
  signature: string,
  publicKey: CryptoKey,
  hash: HashAlgorithm = "SHA-256",
): Promise<boolean> {
  assertSubtle();
  const sigBytes = base64UrlToUint8Array(signature);
  try {
    return await crypto.subtle.verify(
      { name: "ECDSA", hash },
      publicKey,
      sigBytes,
      data,
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 9. JWT-Like Token Utilities
// ---------------------------------------------------------------------------

/**
 * Creates a simplified JWT-like token for application-internal use.
 *
 * The token uses HMAC-SHA256 for integrity. This is NOT a full RFC 7519 JWT
 * implementation and should not be used for cross-service or third-party
 * integration. It is designed for internal stateless session/auth tokens.
 *
 * @param payload - The token payload (claims).
 * @param secret - The HMAC secret key.
 * @param options - Optional header fields (alg, kid).
 * @returns The encoded token string (header.payload.signature).
 *
 * @example
 * ```ts
 * const token = createToken(
 *   { sub: "user-123", exp: Math.floor(Date.now() / 1000) + 3600, role: "admin" },
 *   "my-app-secret"
 * );
 * const result = verifyToken(token, "my-app-secret");
 * ```
 */
export function createToken(
  payload: JwtPayload,
  secret: string,
  options: Partial<Pick<JwtHeader, "kid">> = {},
): string {
  const now = Math.floor(Date.now() / 1000);

  const header: JwtHeader = {
    alg: "HS256",
    typ: "JWT",
    ...options,
  };

  const finalPayload: JwtPayload = {
    ...payload,
    iat: payload.iat ?? now,
  };

  const headerB64 = uint8ArrayToBase64Url(utf8Encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(utf8Encode(JSON.stringify(finalPayload)));

  // Synchronous fallback for token creation: use simple keyed hash
  // In production flows, prefer createTokenAsync which uses real HMAC
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = simpleHmac(signingInput, secret);

  return `${signingInput}.${signature}`;
}

/**
 * Creates a JWT-like token using Web Crypto API HMAC-SHA256 (asynchronous).
 * Prefer this over {@link createToken} for stronger security guarantees.
 *
 * @param payload - The token payload (claims).
 * @param secret - The HMAC secret key.
 * @param options - Optional header fields.
 * @returns A Promise resolving to the encoded token string.
 */
export async function createTokenAsync(
  payload: JwtPayload,
  secret: string,
  options: Partial<Pick<JwtHeader, "kid">> = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header: JwtHeader = {
    alg: "HS256",
    typ: "JWT",
    ...options,
  };

  const finalPayload: JwtPayload = {
    ...payload,
    iat: payload.iat ?? now,
  };

  const headerB64 = uint8ArrayToBase64Url(utf8Encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(utf8Encode(JSON.stringify(finalPayload)));

  const signingInput = `${headerB64}.${payloadB64}`;
  const mac = await hmac(secret, signingInput, "SHA-256");

  return `${signingInput}.${mac}`;
}

/**
 * Verifies a JWT-like token created by {@link createToken} or {@link createTokenAsync}.
 *
 * Checks:
 * 1. Token structure (three dot-separated parts)
 * 2. Signature validity (using HMAC-SHA256 via Web Crypto)
 * 3. Expiration (`exp` claim)
 * 4. Not-before (`nbf` claim)
 *
 * @param token - The token string to verify.
 * @param secret - The HMAC secret key.
 * @param options - Verification options.
 * @returns A {@link TokenVerifyResult} indicating validity and decoded payload.
 */
export async function verifyToken(
  token: string,
  secret: string,
  options: { clockToleranceSec?: number } = {},
): Promise<TokenVerifyResult> {
  const { clockToleranceSec = 0 } = options;
  const now = Math.floor(Date.now() / 1000);

  // Check basic structure
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, payload: null, error: "Invalid token format: expected three parts." };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header and payload
  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    header = JSON.parse(utf8Decode(base64UrlToUint8Array(headerB64))) as JwtHeader;
    payload = JSON.parse(utf8Decode(base64UrlToUint8Array(payloadB64))) as JwtPayload;
  } catch {
    return { valid: false, payload: null, error: "Invalid token encoding." };
  }

  // Verify signature using Web Crypto HMAC
  const signingInput = `${headerB64}.${payloadB64}`;
  const signatureValid = await verifyHmac(secret, signingInput, signatureB64, "SHA-256");

  if (!signatureValid) {
    return { valid: false, payload: null, error: "Invalid signature." };
  }

  // Check expiration
  if (payload.exp !== undefined && now > payload.exp + clockToleranceSec) {
    return { valid: false, payload: null, error: "Token has expired." };
  }

  // Check not-before
  if (payload.nbf !== undefined && now < payload.nbf - clockToleranceSec) {
    return { valid: false, payload: null, error: "Token is not yet valid." };
  }

  return { valid: true, payload };
}

/**
 * Decodes a token without verifying its signature.
 * Useful for inspecting token contents (e.g., reading claims from a valid token).
 * WARNING: Never trust the payload of an unverified token for authorization decisions.
 *
 * @param token - The token string.
 * @returns The decoded payload, or `null` if malformed.
 */
export function decodeTokenUnverified(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(utf8Decode(base64UrlToUint8Array(parts[1]))) as JwtPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Constant-time string comparison to prevent timing attacks.
 * Always compares the full length of both strings regardless of early mismatches.
 *
 * @param a - First hex-encoded string.
 * @param b - Second hex-encoded string.
 * @returns `true` if strings are identical.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Constant-time byte-array comparison to prevent timing attacks.
 *
 * @param a - First byte array.
 * @param b - Second byte array.
 * @returns `true` if arrays are identical.
 */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return result === 0;
}

/**
 * Checks whether a string looks like a hex digest (even length, valid chars).
 * @param str - String to test.
 * @returns `true` if the string is a plausible hex encoding.
 */
export function isHexString(str: string): boolean {
  return /^[0-9a-fA-F]*$/.test(str) && str.length % 2 === 0;
}

/**
 * Simple synchronous HMAC-like hash for non-critical use cases (e.g., token creation fallback).
 * Uses a djb2-based construction. NOT cryptographically secure — prefer the async
 * {@link hmac} function for all security-sensitive operations.
 *
 * @internal
 */
function simpleHmac(message: string, key: string): string {
  let hash = 5381;
  const combined = `${key}.${message}`;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash + combined.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}
