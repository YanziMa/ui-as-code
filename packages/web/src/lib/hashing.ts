/**
 * Hashing utilities — non-crypto and crypto hash functions,
 * fingerprint generation, checksums, and content addressing.
 */

// --- Non-Crypto Hash Functions ---

/** DJB2 hash (fast, good for strings) */
export function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // Unsigned 32-bit
}

/** FNV-1a hash (better distribution than DJB2) */
export function fnv1a(str: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

/** MurmurHash3 (32-bit, simplified — non-crypto but good distribution) */
export function murmur3(str: string, seed = 0): number {
  const data = new TextEncoder().encode(str);
  const len = data.length;

  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  const nblocks = Math.floor(len / 4);

  for (let i = 0; i < nblocks; i++) {
    const offset = i * 4;
    let k1 = data[offset]! | (data[offset + 1]! << 8) |
             (data[offset + 2]! << 16) | (data[offset + 3]! << 24);

    k1 = Math.imul(k1, c1) >>> 0;
    k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
    k1 = Math.imul(k1, c2) >>> 0;

    h1 ^= k1;
    h1 = ((h1 << 13) | (h1 >>> 19)) >>> 0;
    h1 = (Math.imul(h1, 5) + 0xe6546b64) >>> 0;
  }

  // Tail
  const tailOffset = nblocks * 4;
  let k1 = 0;

  switch (len & 3) {
    case 3: k1 ^= data[tailOffset + 2]! << 16; // fall through
    case 2: k1 ^= data[tailOffset + 1]! << 8; // fall through
    case 1:
      k1 ^= data[tailOffset]!;
      k1 = Math.imul(k1, c1) >>> 0;
      k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
      k1 = Math.imul(k1, c2) >>> 0;
      h1 ^= k1;
  }

  // Finalization
  h1 ^= len;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b) >>> 0;
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35) >>> 0;
  h1 ^= h >>> 16;

  return h1;
}

/** SDBM hash (another fast string hash) */
export function sdbm(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
    hash = hash >>> 0; // Keep as unsigned 32-bit
  }
  return hash;
}

// --- Crypto Hash Wrappers ---

/** SHA-256 hash of a string using Web Crypto API */
export async function sha256(data: string): Promise<string> {
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return arrayToHex(new Uint8Array(hashBuffer));
}

/** SHA-1 hash using Web Crypto API */
export async function sha1(data: string): Promise<string> {
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
  return arrayToHex(new Uint8Array(hashBuffer));
}

/** SHA-384 hash using Web Crypto API */
export async function sha384(data: string): Promise<string> {
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-384", buffer);
  return arrayToHex(new Uint8Array(hashBuffer));
}

/** SHA-512 hash using Web Crypto API */
export async function sha512(data: string): Promise<string> {
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-512", buffer);
  return arrayToHex(new Uint8Array(hashBuffer));
}

// --- Checksums ---

/** Simple CRC32 checksum */
export function crc32(str: string): number {
  let crc = 0xFFFFFFFF >>> 0;
  const table = makeCrcTable();

  for (let i = 0; i < str.length; i++) {
    crc = table[(crc ^ str.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/** Adler-32 checksum (faster than CRC32, less robust) */
export function adler32(str: string): number {
  let a = 1, b = 0;

  for (let i = 0; i < str.length; i++) {
    a = (a + str.charCodeAt(i)) % 65521;
    b = (b + a) % 65521;
  }

  return ((b << 16) | a) >>> 0;
}

// --- Fingerprinting ---

/** Generate a content-addressable fingerprint for any value */
export async function fingerprint(value: unknown): Promise<string> {
  const serialized = serializeForHash(value);
  return sha256(serialized);
}

/** Generate a short fingerprint (first N hex chars of SHA-256) */
export async function shortFingerprint(value: unknown, length = 12): Promise<string> {
  const full = await fingerprint(value);
  return full.slice(0, length);
}

/** Generate a numeric ID from a string (consistent, not unique) */
export function consistentId(str: string): string {
  return fnv1a(str).toString(36);
}

/** Generate a color from a string (deterministic, useful for avatars) */
export function stringToColor(str: string): string {
  const hash = djb2(str);
  const h = hash % 360;
  const s = 60 + (hash >> 8) % 30; // 60-90% saturation
  const l = 45 + (hash >> 16) % 20; // 45-65% lightness
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// --- Object Hashing ---

/** Serialize any value to a canonical string for hashing */
export function serializeForHash(value: unknown, depth = 0): string {
  if (depth > 10) return "[MAX_DEPTH]";
  if (value === null) return "null";
  if (value === undefined) return "undefined";

  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "number") return isNaN(value) ? "NaN" : isFinite(value) ? String(value) : "Infinity";
  if (typeof value === "boolean") return value ? "true" : "false";

  if (Array.isArray(value)) {
    return `[${value.map((v) => serializeForHash(v, depth + 1)).join(",")}]`;
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const pairs = keys.map((k) => `${JSON.stringify(k)}:${serializeForHash((value as Record<string, unknown>)[k], depth + 1)}`);
    return `{${pairs.join(",")}}`;
  }

  if (typeof value === "function") return `[Function:${(value as Function).name || "anonymous"}]`;
  if (typeof value === "symbol") return `[Symbol:${value.toString()}]`;

  return `[${typeof value}]`;
}

/** Hash an object (non-crypto, deterministic) */
export function objectHash(obj: unknown): string {
  return fnv1a(serializeForHash(obj)).toString(36);
}

// --- Internal Helpers ---

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc;
  }
  return table;
}

function arrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
