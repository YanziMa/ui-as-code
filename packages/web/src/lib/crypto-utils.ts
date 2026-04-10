/**
 * Comprehensive browser-side cryptography utility library.
 *
 * Built on top of the Web Crypto API (SubtleCrypto). All cryptographic
 * operations are async and return Promises. Encoding / random helpers are
 * synchronous where they do not touch SubtleCrypto.
 *
 * @module crypto-utils
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported hash algorithms for hashing operations */
export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

/** Supported HMAC hash algorithms */
export type HmacAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

/** Supported AES key lengths (bits) */
export type AesKeyLength = 128 | 192 | 256;

/** Supported EC named curves */
export type EcNamedCurve = 'P-256' | 'P-384' | 'P-521';

/** RSA key size in bits */
export type RsaKeySize = 2048 | 3072 | 4096;

/** Key format for import/export */
export type KeyFormat = 'raw' | 'jwk' | 'spki' | 'pkcs8';

/** PBKDF2 configuration options */
export interface Pbkdf2Options {
  /** Salt bytes (recommended: >=16) */
  salt: Uint8Array;
  /** Iteration count (recommended: >=600,000 for passwords) */
  iterations: number;
  /** Hash algorithm used by PBKDF2 */
  hash?: HashAlgorithm;
  /** Desired output length in bits (default: 256) */
  bitLength?: number;
}

/** AES-GCM encryption options */
export interface AesGcmOptions {
  /** Additional authenticated data (optional) */
  aad?: Uint8Array;
  /** Tag length in bits (default: 128) */
  tagLength?: number;
}

/** RSA-OAEP key generation options */
export interface RsaKeyGenOptions {
  /** Modulus length (default: 2048) */
  modulusLength?: RsaKeySize;
  /** Public exponent (default: 65537) */
  publicExponent?: Uint8Array;
  /** Hash algorithm (default: SHA-256) */
  hash?: HashAlgorithm;
}

/** ECDSA key generation options */
export interface EcdsaKeyGenOptions {
  /** Named curve (default: P-256) */
  namedCurve?: EcNamedCurve;
}

/** RSA-PSS signature options */
export interface RsaPssSignOptions {
  /** Salt length in bytes (default: 32) */
  saltLength?: number;
}

/** Password strength analysis result */
export interface PasswordStrengthResult {
  /** Estimated entropy in bits */
  entropy: number;
  /** Strength level classification */
  strength: 'very_weak' | 'weak' | 'fair' | 'strong' | 'very_strong';
  /** Estimated time to crack at 10 billion guesses/sec */
  crackTimeSeconds: number;
  /** Human-readable crack time description */
  crackTimeDescription: string;
  /** Detected common patterns (e.g., dictionary words, sequences, repeats) */
  patterns: string[];
  /** Score from 0 to 100 */
  score: number;
}

/** Password generator options */
export interface PasswordGeneratorOptions {
  /** Desired password length (default: 20) */
  length?: number;
  /** Include uppercase letters (default: true) */
  uppercase?: boolean;
  /** Include lowercase letters (default: true) */
  lowercase?: boolean;
  /** Include digits (default: true) */
  digits?: boolean;
  /** Include special characters (default: true) */
  special?: boolean;
  /** Exclude ambiguous characters like 0/O/l/1/I (default: false) */
  excludeAmbiguous?: boolean;
  /** Minimum count of each character class (default: 1) */
  minUppercase?: number;
  minLowercase?: number;
  minDigits?: number;
  minSpecial?: number;
}

/** API key generation options */
export interface ApiKeyOptions {
  /** Key prefix (e.g., "sk_live", "pk_test") */
  prefix?: string;
  /** Length of the random portion in bytes before encoding (default: 32) */
  randomBytes?: number;
  /** Encoding format for the random portion (default: "base64url") */
  format?: 'hex' | 'base64url';
}

/** Encrypted data envelope containing ciphertext + metadata */
export interface AesGcmEncryptedData {
  /** Base64url-encoded ciphertext (includes the authentication tag) */
  ciphertext: string;
  /** Base64url-encoded initialization vector */
  iv: string;
  /** Base64url-encoded additional authenticated data (if provided) */
  aad?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Obtain the SubtleCrypto instance (throws if unavailable in this context). */
function getSubtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }
  return crypto.subtle;
}

// ---------------------------------------------------------------------------
// 1. Hashing
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-1 digest of the given data.
 *
 * @param data - Input as string or ArrayBuffer-like.
 * @returns Promise resolving to an ArrayBuffer containing the raw hash bytes.
 */
export async function sha1(data: string | BufferSource): Promise<ArrayBuffer> {
  return hash(data, 'SHA-1');
}

/**
 * Compute a SHA-256 digest of the given data.
 *
 * @param data - Input as string or ArrayBuffer-like.
 * @returns Promise resolving to an ArrayBuffer containing the raw hash bytes.
 *
 * @example
 * const hashBuf = await sha256('hello world');
 * console.log(toHex(new Uint8Array(hashBuf)));
 * // "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
 */
export async function sha256(data: string | BufferSource): Promise<ArrayBuffer> {
  return hash(data, 'SHA-256');
}

/**
 * Compute a SHA-384 digest of the given data.
 *
 * @param data - Input as string or ArrayBuffer-like.
 * @returns Promise resolving to an ArrayBuffer containing the raw hash bytes.
 */
export async function sha384(data: string | BufferSource): Promise<ArrayBuffer> {
  return hash(data, 'SHA-384');
}

/**
 * Compute a SHA-512 digest of the given data.
 *
 * @param data - Input as string or ArrayBuffer-like.
 * @returns Promise resolving to an ArrayBuffer containing the raw hash bytes.
 */
export async function sha512(data: string | BufferSource): Promise<ArrayBuffer> {
  return hash(data, 'SHA-512');
}

/**
 * Generic hashing function using any supported algorithm.
 *
 * @param data - Input as string or binary.
 * @param algo - One of SHA-1, SHA-256, SHA-384, SHA-512.
 * @returns Raw hash bytes as ArrayBuffer.
 */
export async function hash(
  data: string | BufferSource,
  algo: HashAlgorithm = 'SHA-256',
): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  const buf = typeof data === 'string' ? encodeUtf8(data) : data;
  return subtle.digest(algo, buf);
}

/**
 * Hash data and return the result as a hex string.
 *
 * @param data - Input text or binary.
 * @param algo - Hash algorithm (default: "SHA-256").
 * @returns Hex-encoded hash string.
 */
export async function hashHex(
  data: string | BufferSource,
  algo: HashAlgorithm = 'SHA-256',
): Promise<string> {
  const buf = await hash(data, algo);
  return toHex(new Uint8Array(buf));
}

// ---------------------------------------------------------------------------
// 2. HMAC
// ---------------------------------------------------------------------------

/**
 * Compute an HMAC (Hash-based Message Authentication Code).
 *
 * @param key   - Secret key as string or binary.
 * @param data  - Message to authenticate.
 * @param algo  - Hash algorithm for HMAC (default: "SHA-256").
 * @returns Raw HMAC bytes as ArrayBuffer.
 */
export async function hmac(
  key: string | BufferSource,
  data: string | BufferSource,
  algo: HmacAlgorithm = 'SHA-256',
): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  const keyBuf = typeof key === 'string' ? encodeUtf8(key) : key;
  const dataBuf = typeof data === 'string' ? encodeUtf8(data) : data;

  const cryptoKey = await subtle.importKey(
    'raw',
    keyBuf,
    { name: 'HMAC', hash: algo },
    false,
    ['sign'],
  );

  return subtle.sign('HMAC', cryptoKey, dataBuf);
}

/**
 * Compute HMAC and return result as a hex string.
 *
 * @param key   - Secret key.
 * @param data  - Message.
 * @param algo  - Hash algorithm (default: "SHA-256").
 * @returns Hex-encoded HMAC string.
 */
export async function hmacHex(
  key: string | BufferSource,
  data: string | BufferSource,
  algo: HmacAlgorithm = 'SHA-256',
): Promise<string> {
  const buf = await hmac(key, data, algo);
  return toHex(new Uint8Array(buf));
}

// ---------------------------------------------------------------------------
// 3. Key Derivation (PBKDF2)
// ---------------------------------------------------------------------------

/**
 * Derive one or more cryptographic keys from a low-entropy secret (password)
 * using PBKDF2 (Password-Based Key Derivation Function 2).
 *
 * @param password - The password string.
 * @param options  - PBKDF2 parameters (salt, iterations, hash, output length).
 * @returns Derived key material as ArrayBuffer.
 *
 * @example
 * const key = await pbkdf2('s3cret', { salt: randomBytes(16), iterations: 600_000 });
 */
export async function pbkdf2(
  password: string,
  options: Pbkdf2Options,
): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  const { salt, iterations, hash = 'SHA-256', bitLength = 256 } = options;

  const keyMaterial = await subtle.importKey(
    'raw',
    encodeUtf8(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  return subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash,
    },
    keyMaterial,
    bitLength,
  );
}

/**
 * Derive an AES-GCM key from a password via PBKDF2.
 *
 * @param password - The password string.
 * @param options  - PBKDF2 parameters plus optional AES key length.
 * @returns A CryptoKey suitable for AES-GCM encrypt/decrypt.
 */
export async function deriveAesKey(
  password: string,
  options: Pbkdf2Options & { aesKeyLength?: AesKeyLength },
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const aesKeyLength = options.aesKeyLength ?? 256;
  const derivedBits = await pbkdf2(password, options);

  return subtle.importKey(
    'raw',
    derivedBits,
    { name: 'AES-GCM', length: aesKeyLength },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ---------------------------------------------------------------------------
// 4. Symmetric Encryption (AES-GCM)
// ---------------------------------------------------------------------------

/**
 * Generate a new random AES-GCM key.
 *
 * @param length - Key length in bits (default: 256).
 * @returns A CryptoKey for AES-GCM operations.
 */
export async function generateAesKey(length: AesKeyLength = 256): Promise<CryptoKey> {
  const subtle = getSubtle();
  return subtle.generateKey({ name: 'AES-GCM', length }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt data with AES-GCM.
 *
 * Generates a fresh random IV automatically. Returns an encrypted-data envelope
 * containing the base64url-encoded ciphertext and IV (and AAD if supplied).
 *
 * @param key     - AES-GCM CryptoKey.
 * @param data    - Plaintext string or binary.
 * @param options - Optional AAD and tag-length settings.
 * @returns Encrypted data envelope.
 */
export async function aesGcmEncrypt(
  key: CryptoKey,
  data: string | BufferSource,
  options: AesGcmOptions = {},
): Promise<AesGcmEncryptedData> {
  const subtle = getSubtle();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const plaintext = typeof data === 'string' ? encodeUtf8(data) : data;

  const cipherBuf = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: options.aad,
      tagLength: options.tagLength ?? 128,
    },
    key,
    plaintext,
  );

  return {
    ciphertext: toBase64Url(new Uint8Array(cipherBuf)),
    iv: toBase64Url(iv),
    ...(options.aad ? { aad: toBase64Url(options.aad) } : {}),
  };
}

/**
 * Decrypt data that was encrypted with {@link aesGcmEncrypt}.
 *
 * @param key   - The same AES-GCM CryptoKey used for encryption.
 * @param env   - Encrypted data envelope produced by `aesGcmEncrypt`.
 * @returns Decrypted plaintext as ArrayBuffer.
 */
export async function aesGcmDecrypt(
  key: CryptoKey,
  env: AesGcmEncryptedData,
): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  const iv = fromBase64Url(env.iv);
  const ciphertext = fromBase64Url(env.ciphertext);
  const aad = env.aad ? fromBase64Url(env.aad) : undefined;

  return subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: aad,
      tagLength: 128,
    },
    key,
    ciphertext,
  );
}

/**
 * Convenience wrapper: encrypt a UTF-8 string and return the envelope.
 *
 * @param key       - AES-GCM CryptoKey.
 * @param plaintext - String to encrypt.
 * @param options   - Optional AAD and tag-length settings.
 * @returns Encrypted data envelope.
 */
export async function aesGcmEncryptString(
  key: CryptoKey,
  plaintext: string,
  options?: AesGcmOptions,
): Promise<AesGcmEncryptedData> {
  return aesGcmEncrypt(key, plaintext, options);
}

/**
 * Convenience wrapper: decrypt an envelope back to a UTF-8 string.
 *
 * @param key - AES-GCM CryptoKey.
 * @param env - Encrypted data envelope.
 * @returns Decrypted plaintext string.
 */
export async function aesGcmDecryptString(
  key: CryptoKey,
  env: AesGcmEncryptedData,
): Promise<string> {
  const buf = await aesGcmDecrypt(key, env);
  return decodeUtf8(new Uint8Array(buf));
}

// ---------------------------------------------------------------------------
// 5. Asymmetric Encryption (RSA-OAEP)
// ---------------------------------------------------------------------------

/**
 * Generate an RSA-OAEP key pair for asymmetric encryption.
 *
 * @param options - Modulus length, public exponent, hash algorithm.
 * @returns A CryptoKeyPair containing publicKey and privateKey.
 */
export async function generateRsaOaepKeyPair(
  options: RsaKeyGenOptions = {},
): Promise<CryptoKeyPair> {
  const subtle = getSubtle();
  const {
    modulusLength = 2048,
    publicExponent = new Uint8Array([0x01, 0x00, 0x01]), // 65537
    hash = 'SHA-256',
  } = options;

  return subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength,
      publicExponent,
      hash,
    },
    true, // exportable
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt data with RSA-OAEP using a public key.
 *
 * @param publicKey - RSA-OAEP public CryptoKey.
 * @param data      - Plaintext string or binary.
 * @param hash      - Hash algorithm (must match the key's hash).
 * @returns Ciphertext as ArrayBuffer.
 */
export async function rsaOaepEncrypt(
  publicKey: CryptoKey,
  data: string | BufferSource,
  hash: HashAlgorithm = 'SHA-256',
): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  const plaintext = typeof data === 'string' ? encodeUtf8(data) : data;
  return subtle.encrypt({ name: 'RSA-OAEP', hash }, publicKey, plaintext);
}

/**
 * Decrypt data with RSA-OAEP using a private key.
 *
 * @param privateKey - RSA-OAEP private CryptoKey.
 * @param ciphertext - Ciphertext from `rsaOaepEncrypt`.
 * @param hash       - Hash algorithm (must match the key's hash).
 * @returns Decrypted plaintext as ArrayBuffer.
 */
export async function rsaOaepDecrypt(
  privateKey: CryptoKey,
  ciphertext: BufferSource,
  hash: HashAlgorithm = 'SHA-256',
): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  return subtle.decrypt({ name: 'RSA-OAEP', hash }, privateKey, ciphertext);
}

// ---------------------------------------------------------------------------
// 6. Digital Signatures
// ---------------------------------------------------------------------------

// --- ECDSA ---

/**
 * Generate an ECDSA key pair for digital signatures.
 *
 * @param options - Named curve selection.
 * @returns A CryptoKeyPair.
 */
export async function generateEcdsaKeyPair(
  options: EcdsaKeyGenOptions = {},
): Promise<CryptoKeyPair> {
  const subtle = getSubtle();
  const { namedCurve = 'P-256' } = options;

  return subtle.generateKey(
    { name: 'ECDSA', namedCurve },
    true,
    ['sign', 'verify'],
  );
}

/**
 * Sign data with an ECDSA private key.
 *
 * @param privateKey - ECDSA private CryptoKey.
 * @param data       - Data to sign.
 * @param hash       - Hash algorithm (default: matches curve best practice).
 * @returns Signature bytes as ArrayBuffer.
 */
export async function ecdsaSign(
  privateKey: CryptoKey,
  data: string | BufferSource,
  hash: HashAlgorithm = 'SHA-256',
): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  const dataBuf = typeof data === 'string' ? encodeUtf8(data) : data;
  return subtle.sign({ name: 'ECDSA', hash }, privateKey, dataBuf);
}

/**
 * Verify an ECDSA signature against data.
 *
 * @param publicKey - ECDSA public CryptoKey.
 * @param signature - Signature bytes from `ecdsaSign`.
 * @param data      - Original signed data.
 * @param hash      - Hash algorithm (must match signing).
 * @returns `true` if the signature is valid.
 */
export async function ecdsaVerify(
  publicKey: CryptoKey,
  signature: BufferSource,
  data: string | BufferSource,
  hash: HashAlgorithm = 'SHA-256',
): Promise<boolean> {
  const subtle = getSubtle();
  const dataBuf = typeof data === 'string' ? encodeUtf8(data) : data;
  return subtle.verify({ name: 'ECDSA', hash }, publicKey, signature, dataBuf);
}

// --- RSA-PSS ---

/**
 * Generate an RSA-PSS key pair for digital signatures.
 *
 * @param modulusLength - RSA key size in bits (default: 2048).
 * @returns A CryptoKeyPair.
 */
export async function generateRsaPssKeyPair(
  modulusLength: RsaKeySize = 2048,
): Promise<CryptoKeyPair> {
  const subtle = getSubtle();

  return subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
}

/**
 * Sign data with an RSA-PSS private key.
 *
 * @param privateKey - RSA-PSS private CryptoKey.
 * @param data       - Data to sign.
 * @param options    - Optional salt length.
 * @returns Signature bytes as ArrayBuffer.
 */
export async function rsaPssSign(
  privateKey: CryptoKey,
  data: string | BufferSource,
  options: RsaPssSignOptions = {},
): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  const dataBuf = typeof data === 'string' ? encodeUtf8(data) : data;
  return subtle.sign(
    { name: 'RSA-PSS', saltLength: options.saltLength ?? 32 },
    privateKey,
    dataBuf,
  );
}

/**
 * Verify an RSA-PSS signature against data.
 *
 * @param publicKey - RSA-PSS public CryptoKey.
 * @param signature - Signature bytes from `rsaPssSign`.
 * @param data      - Original signed data.
 * @param options   - Optional salt length (must match signing).
 * @returns `true` if the signature is valid.
 */
export async function rsaPssVerify(
  publicKey: CryptoKey,
  signature: BufferSource,
  data: string | BufferSource,
  options: RsaPssSignOptions = {},
): Promise<boolean> {
  const subtle = getSubtle();
  const dataBuf = typeof data === 'string' ? encodeUtf8(data) : data;
  return subtle.verify(
    { name: 'RSA-PSS', saltLength: options.saltLength ?? 32 },
    publicKey,
    signature,
    dataBuf,
  );
}

// ---------------------------------------------------------------------------
// 7. Key Utilities
// ---------------------------------------------------------------------------

/**
 * Export a CryptoKey to the specified format.
 *
 * Supports 'raw', 'jwk', 'spki', and 'pkcs8' depending on key type.
 *
 * @param key    - The CryptoKey to export.
 * @param format - Desired export format.
 * @returns Exported key data (ArrayBuffer for binary formats, JsonWebKey for JWK).
 */
export async function exportKey(
  key: CryptoKey,
  format: KeyFormat,
): Promise<ArrayBuffer | JsonWebKey> {
  const subtle = getSubtle();
  return subtle.exportKey(format, key);
}

/**
 * Import a key from external data into a CryptoKey.
 *
 * @param format     - Format of the input data.
 * @param keyData    - Raw key bytes or JWK object.
 * @param algorithm  - Algorithm identifier or full algorithm dictionary.
 * @param extractable - Whether the imported key should be extractable.
 * @param usages     - Allowed usages for the key.
 * @returns Imported CryptoKey.
 */
export async function importKey<T extends KeyFormat>(
  format: T,
  keyData: T extends 'jwk' ? JsonWebKey : BufferSource,
  algorithm:
    | AlgorithmIdentifier
    | RsaHashedImportParams
    | EcKeyImportParams
    | HmacImportParams
    | AesKeyAlgorithm,
  extractable: boolean,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const subtle = getSubtle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return subtle.importKey(format, keyData as any, algorithm, extractable, usages);
}

/**
 * Compute a key fingerprint: the SHA-256 hash of the SPKI representation of
 * a public key, encoded as hex. Useful for identifying / pinning keys.
 *
 * @param publicKey - An asymmetric public CryptoKey.
 * @returns Hex-encoded fingerprint string.
 */
export async function keyFingerprint(publicKey: CryptoKey): Promise<string> {
  const spki = await exportKey(publicKey, 'spki');
  return hashHex(spki as ArrayBuffer, 'SHA-256');
}

/**
 * Generate an ECDH key pair for key agreement.
 *
 * @param namedCurve - Elliptic curve (default: P-256).
 * @returns A CryptoKeyPair.
 */
export async function generateEcdhKeyPair(
  namedCurve: EcNamedCurve = 'P-256',
): Promise<CryptoKeyPair> {
  const subtle = getSubtle();
  return subtle.generateKey({ name: 'ECDH', namedCurve }, true, [
    'deriveBits',
    'deriveKey',
  ]);
}

// ---------------------------------------------------------------------------
// 12. Diffie-Hellman (ECDH)
// ---------------------------------------------------------------------------

/**
 * Perform Elliptic-Curve Diffie-Hellman key agreement.
 *
 * Given your own private key and the other party's public key, derive a shared
 * secret that both parties will compute identically.
 *
 * @param myPrivateKey   - Your ECDH private key.
 * @param theirPublicKey - The other party's ECDH public key.
 * @param namedCurve     - Curve name (must match both keys).
 * @param bitLength      - Number of bits of shared secret to derive (default: 256).
 * @returns Shared secret as ArrayBuffer.
 */
export async function ecdhDeriveSecret(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
  namedCurve: EcNamedCurve = 'P-256',
  bitLength: number = 256,
): Promise<ArrayBuffer> {
  const subtle = getSubtle();
  return subtle.deriveBits(
    { name: 'ECDH', public: theirPublicKey, namedCurve },
    myPrivateKey,
    bitLength,
  );
}

/**
 * Derive an AES-GCM key from an ECDH shared secret.
 *
 * @param myPrivateKey   - Your ECDH private key.
 * @param theirPublicKey - The other party's ECDH public key.
 * @param namedCurve     - Curve name.
 * @param aesKeyLength   - Output AES key length in bits (default: 256).
 * @returns An AES-GCM CryptoKey derived from the shared secret.
 */
export async function ecdhDeriveAesKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
  namedCurve: EcNamedCurve = 'P-256',
  aesKeyLength: AesKeyLength = 256,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const sharedBits = await ecdhDeriveSecret(myPrivateKey, theirPublicKey, namedCurve);

  return subtle.importKey(
    'raw',
    sharedBits,
    { name: 'AES-GCM', length: aesKeyLength },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ---------------------------------------------------------------------------
// 8. Random Generation
// ---------------------------------------------------------------------------

/**
 * Generate cryptographically secure random bytes.
 *
 * @param length - Number of random bytes.
 * @returns Uint8Array filled with random values.
 */
export function randomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return arr;
}

/**
 * Generate a cryptographically secure random integer within `[min, max)` (half-open interval).
 *
 * Uses rejection sampling to avoid modulo bias.
 *
 * @param min - Inclusive lower bound (default: 0).
 * @param max - Exclusive upper bound.
 * @returns Random integer >= min and < max.
 */
export function secureRandomInt(min: number, max: number): number {
  if (min >= max) throw new Error('min must be less than max');
  const range = max - min;
  const bitsNeeded = Math.ceil(Math.log2(range));
  const bytesNeeded = Math.ceil(bitsNeeded / 8);
  const mask = (1 << bitsNeeded) - 1;

  let result: number;
  const arr = new Uint8Array(bytesNeeded);
  do {
    crypto.getRandomValues(arr);
    result = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      result = (result << 8) | (arr[i]! ?? 0);
    }
    result &= mask;
  } while (result >= range);

  return min + result;
}

/**
 * Generate a cryptographically secure UUID v4.
 *
 * Uses `crypto.randomUUID()` when available, otherwise falls back to manual construction.
 *
 * @returns RFC 4122 UUID v4 string.
 */
export function secureRandomUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const hex = '0123456789abcdef';
  const values = randomBytes(16);
  values[6] = (values[6]! & 0x0f) | 0x40; // version 4
  values[8] = (values[8]! & 0x3f) | 0x80; // variant

  let result = '';
  for (let i = 0; i < 16; i++) {
    const b = values[i]!;
    result += hex[b >> 4]! + hex[b & 0x0f]!;
    if (i === 3 || i === 5 || i === 7 || i === 9) result += '-';
  }
  return result;
}

/**
 * Generate a cryptographically secure random string from a given charset.
 *
 * @param length  - Desired string length.
 * @param charset - Character set to draw from (default: alphanumeric).
 * @returns Random string of the specified length.
 */
export function secureRandomString(
  length: number,
  charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[values[i]! % charset.length]!;
  }
  return result;
}

// ---------------------------------------------------------------------------
// 9. Encoding
// ---------------------------------------------------------------------------

/**
 * Encode binary data as a standard base64 string.
 *
 * @param data - Binary data.
 * @returns Base64-encoded string.
 */
export function toBase64(data: Uint8Array): string {
  const bin = Array.from(data)
    .map((b) => String.fromCharCode(b))
    .join('');
  return btoa(bin);
}

/**
 * Decode a standard base64 string to binary data.
 *
 * @param encoded - Base64-encoded string.
 * @returns Decoded Uint8Array.
 */
export function fromBase64(encoded: string): Uint8Array {
  const bin = atob(encoded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encode binary data as URL-safe base64 (no padding, `-` instead of `+`, `_` instead of `/`).
 *
 * @param data - Binary data.
 * @returns URL-safe base64 string without padding.
 */
export function toBase64Url(data: Uint8Array): string {
  return toBase64(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a URL-safe base64 string to binary data.
 *
 * @param encoded - URL-safe base64 string (padding optional).
 * @returns Decoded Uint8Array.
 */
export function fromBase64Url(encoded: string): Uint8Array {
  // Restore padding
  let padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (padded.length % 4 !== 0) {
    padded += '=';
  }
  return fromBase64(padded);
}

/**
 * Encode binary data as a hexadecimal string.
 *
 * @param data - Binary data.
 * @returns Lower-case hex string.
 */
export function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b!.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Decode a hexadecimal string to binary data.
 *
 * @param hex - Hex string (case-insensitive).
 * @returns Decoded Uint8Array.
 */
export function fromHex(hex: string): Uint8Array {
  const cleaned = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes[i / 2] = parseInt(cleaned.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Encode a JavaScript string to a UTF-8 byte array.
 *
 * @param str - Input string.
 * @returns UTF-8 encoded Uint8Array.
 */
export function encodeUtf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Decode a UTF-8 byte array to a JavaScript string.
 *
 * @param bytes - UTF-8 encoded bytes.
 * @returns Decoded string.
 */
export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// 10. Password Utilities
// ---------------------------------------------------------------------------

const COMMON_PATTERNS: { regex: RegExp; label: string }[] = [
  { regex: /[a-z]+/, label: 'lowercase_letters' },
  { regex: /[A-Z]+/, label: 'uppercase_letters' },
  { regex: /\d+/, label: 'digits' },
  { regex: /[^a-zA-Z\d]+/, label: 'special_characters' },
  { regex: /(.)\1{2,}/, label: 'repeated_characters' },
  { regex: /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, label: 'alphabet_sequence' },
  { regex: /(123|234|345|456|567|678|789|890|012)/, label: 'number_sequence' },
  { regex: /^(password|123456|admin|qwerty|letmein|welcome|monkey|dragon)/i, label: 'common_password' },
  { regex: /^[a-z]+$/i, label: 'letters_only' },
  { regex: /^\d+$/, label: 'digits_only' },
];

/**
 * Estimate the strength of a password based on character-set entropy,
 * pattern detection, and estimated crack time.
 *
 * @param password - The password to analyze.
 * @returns Detailed strength analysis result.
 */
export function estimatePasswordStrength(password: string): PasswordStrengthResult {
  const len = password.length;

  // Determine pool size based on character classes present
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/\d/.test(password)) poolSize += 10;
  if (/[^a-zA-Z\d]/.test(password)) poolSize += 33;
  if (poolSize === 0) poolSize = 1;

  // Entropy = log2(pool^len) = len * log2(pool)
  const entropy = len > 0 ? Math.floor(len * Math.log2(poolSize)) : 0;

  // Crack time estimation (assumes 10 billion guesses per second)
  const guessesPerSecond = 10_000_000_000;
  const combinations = Math.pow(poolSize, len);
  const crackTimeSeconds =
    combinations <= 1 ? 0 : combinations / guessesPerSecond / 2; // average case

  // Detect patterns
  const patterns: string[] = [];
  for (const { regex, label } of COMMON_PATTERNS) {
    if (regex.test(password)) patterns.push(label);
  }

  // Adjust entropy down for weak patterns
  let adjustedEntropy = entropy;
  if (patterns.includes('common_password')) adjustedEntropy = Math.max(adjustedEntropy - 30, 0);
  if (patterns.includes('repeated_characters')) adjustedEntropy = Math.max(adjustedEntropy - 15, 0);
  if (patterns.includes('alphabet_sequence') || patterns.includes('number_sequence')) {
    adjustedEntropy = Math.max(adjustedEntropy - 10, 0);
  }
  if (patterns.includes('letters_only') || patterns.includes('digits_only')) {
    adjustedEntropy = Math.max(adjustedEntropy - 10, 0);
  }

  // Classify strength
  let strength: PasswordStrengthResult['strength'];
  if (adjustedEntropy < 28) strength = 'very_weak';
  else if (adjustedEntropy < 36) strength = 'weak';
  else if (adjustedEntropy < 60) strength = 'fair';
  else if (adjustedEntropy < 80) strength = 'strong';
  else strength = 'very_strong';

  // Score 0-100
  const score = Math.min(100, Math.round(Math.max(0, (adjustedEntropy / 128) * 100)));

  return {
    entropy: adjustedEntropy,
    strength,
    crackTimeSeconds,
    crackTimeDescription: formatCrackTime(crackTimeSeconds),
    patterns,
    score,
  };
}

/** Human-readable crack time formatting. */
function formatCrackTime(seconds: number): string {
  if (seconds < 1) return 'instant';
  if (seconds < 60) return `${Math.round(seconds)} second(s)`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minute(s)`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hour(s)`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)} day(s)`;
  if (seconds < 31536000 * 100) return `${(seconds / 31536000).toFixed(1)} year(s)`;
  if (seconds < 31536000 * 1_000_000) return `${(seconds / 31536000 / 1000).toFixed(1)} thousand years`;
  if (seconds < 31536000 * 1_000_000_000) return `${(seconds / 31536000 / 1_000_000).toFixed(1)} million years`;
  return `${(seconds / 31536000 / 1_000_000_000).toFixed(1)} billion years`;
}

/**
 * Generate a cryptographically secure random password meeting configurable requirements.
 *
 * Guarantees minimum counts of each required character class by first placing
 * mandatory characters, then filling the rest randomly, then shuffling.
 *
 * @param options - Generator configuration.
 * @returns Generated password string.
 */
export function generatePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 20,
    uppercase = true,
    lowercase = true,
    digits = true,
    special = true,
    excludeAmbiguous = false,
    minUppercase = 1,
    minLowercase = 1,
    minDigits = 1,
    minSpecial = 1,
  } = options;

  const AMBIGUOUS = '0OoIl1';
  const UPPER = excludeAmbiguous
    ? 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('').filter((c) => !AMBIGUOUS.includes(c)).join('')
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = excludeAmbiguous
    ? 'abcdefghijkmnopqrstuvwxyz'.split('').filter((c) => !AMBIGUOUS.includes(c)).join('')
    : 'abcdefghijklmnopqrstuvwxyz';
  const DIGIT = excludeAmbiguous ? '23456789' : '0123456789';
  const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  // Build charset
  let charset = '';
  if (uppercase) charset += UPPER;
  if (lowercase) charset += LOWER;
  if (digits) charset += DIGIT;
  if (special) charset += SPECIAL_CHARS;
  if (!charset) charset = LOWER + DIGIT; // fallback

  // Validate minimums fit within total length
  const totalMin = (uppercase ? minUppercase : 0) +
    (lowercase ? minLowercase : 0) +
    (digits ? minDigits : 0) +
    (special ? minSpecial : 0);
  if (totalMin > length) {
    throw new Error(`Minimum character requirements (${totalMin}) exceed requested length (${length}).`);
  }

  // Build password array
  const chars: string[] = [];

  // Place mandatory characters
  if (uppercase && minUppercase > 0) {
    for (let i = 0; i < minUppercase; i++) chars.push(UPPER[secureRandomInt(0, UPPER.length)]!);
  }
  if (lowercase && minLowercase > 0) {
    for (let i = 0; i < minLowercase; i++) chars.push(LOWER[secureRandomInt(0, LOWER.length)]!);
  }
  if (digits && minDigits > 0) {
    for (let i = 0; i < minDigits; i++) chars.push(DIGIT[secureRandomInt(0, DIGIT.length)]!);
  }
  if (special && minSpecial > 0) {
    for (let i = 0; i < minSpecial; i++) chars.push(SPECIAL_CHARS[secureRandomInt(0, SPECIAL_CHARS.length)]!);
  }

  // Fill remaining positions
  const remaining = length - chars.length;
  for (let i = 0; i < remaining; i++) {
    chars.push(charset[secureRandomInt(0, charset.length)]!);
  }

  // Fisher-Yates shuffle to avoid predictable positions of mandatory chars
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.join('');
}

// ---------------------------------------------------------------------------
// 11. Token Utilities
// ---------------------------------------------------------------------------

/**
 * Generate a secure random token encoded as hex.
 *
 * @param byteLength - Number of random bytes (default: 32 -> 64 hex chars).
 * @returns Hex-encoded token string.
 */
export function generateTokenHex(byteLength: number = 32): string {
  return toHex(randomBytes(byteLength));
}

/**
 * Generate a secure random token encoded as URL-safe base64.
 *
 * @param byteLength - Number of random bytes (default: 32).
 * @returns Base64url-encoded token string.
 */
export function generateTokenBase64Url(byteLength: number = 32): string {
  return toBase64Url(randomBytes(byteLength));
}

/**
 * Generate an API key with a prefix, formatted like `"sk_live_aB3dE..."`.
 *
 * @param options - Prefix, random byte length, and encoding format.
 * @returns Formatted API key string.
 *
 * @example
 * const apiKey = generateApiKey({ prefix: 'sk_live' });
 * // e.g. "sk_live_aB3dE5fG7hI9jK..."
 */
export function generateApiKey(options: ApiKeyOptions = {}): string {
  const { prefix = '', randomBytes: rb = 32, format = 'base64url' } = options;
  const token = format === 'hex'
    ? generateTokenHex(rb)
    : generateTokenBase64Url(rb);
  return prefix ? `${prefix}_${token}` : token;
}

/**
 * Generate a cryptographically secure session ID.
 *
 * Produces a URL-safe token suitable for use as a session identifier.
 *
 * @param byteLength - Number of random bytes (default: 24).
 * @returns Session ID string.
 */
export function generateSessionId(byteLength: number = 24): string {
  return generateTokenBase64Url(byteLength);
}

// ---------------------------------------------------------------------------
// Default export: bundled utility surface
// ---------------------------------------------------------------------------

/**
 * Default export: the entire utility surface as a single object.
 *
 * Usage:
 * ```ts
 * import cryptoUtils from './crypto-utils';
 * const hash = await cryptoUtils.sha256('hello');
 * ```
 */
const cryptoUtils = {
  // Hashing
  sha1, sha256, sha384, sha512, hash, hashHex,
  // HMAC
  hmac, hmacHex,
  // Key derivation
  pbkdf2, deriveAesKey,
  // Symmetric encryption
  generateAesKey, aesGcmEncrypt, aesGcmDecrypt,
  aesGcmEncryptString, aesGcmDecryptString,
  // Asymmetric encryption
  generateRsaOaepKeyPair, rsaOaepEncrypt, rsaOaepDecrypt,
  // Digital signatures -- ECDSA
  generateEcdsaKeyPair, ecdsaSign, ecdsaVerify,
  // Digital signatures -- RSA-PSS
  generateRsaPssKeyPair, rsaPssSign, rsaPssVerify,
  // Key utilities
  exportKey, importKey, keyFingerprint, generateEcdhKeyPair,
  // Diffie-Hellman
  ecdhDeriveSecret, ecdhDeriveAesKey,
  // Random generation
  randomBytes, secureRandomInt, secureRandomUuid, secureRandomString,
  // Encoding
  toBase64, fromBase64, toBase64Url, fromBase64Url, toHex, fromHex,
  encodeUtf8, decodeUtf8,
  // Password utilities
  estimatePasswordStrength, generatePassword,
  // Token utilities
  generateTokenHex, generateTokenBase64Url, generateApiKey, generateSessionId,
};

export default cryptoUtils;
