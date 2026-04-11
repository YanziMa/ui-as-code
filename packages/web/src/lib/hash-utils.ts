/**
 * Hash Utilities: Non-cryptographic and cryptographic hash functions,
 * consistent hashing, bloom filters, hash tables, fingerprinting,
 * checksums, and content-addressable storage helpers.
 */

// --- Types ---

export interface HashFunction {
  (data: string): string;
  /** Raw 32-bit integer output */
  int32?: (data: string) => number;
}

export interface HashTableEntry<V> {
  key: string;
  value: V;
  deleted: boolean;
}

// --- Non-Cryptographic Hash Functions ---

/**
 * FNV-1a 32-bit hash. Fast, good distribution, widely used for hash tables.
 */
export function fnv1a32(data: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < data.length; i++) {
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return h >>> 0; // unsigned
}

/**
 * FNV-1a 64-bit hash.
 */
export function fnv1a64(data: string): bigint {
  let h = 0xcbf29ce484222325n; // FNV offset basis 64-bit
  const prime = 0x100000001b3n;
  for (let i = 0; i < data.length; i++) {
    h ^= BigInt(data.charCodeAt(i));
    h *= prime;
  }
  return h;
}

/**
 * MurmurHash3 (32-bit). Excellent distribution, very fast.
 * Not cryptographically secure — use for hash tables / bloom filters only.
 *
 * Based on the public domain implementation by Austin Appleby.
 */
export function murmur3_32(data: string, seed = 0): number {
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  const r1 = 15;
  const r2 = 13;
  const m = 5;
  const n = 0xe6546b64;

  let len = data.length;
  let h1 = seed;

  const roundedEnd = len & ~3; // round down to multiple of 4

  for (let i = 0; i < roundedEnd; i += 4) {
    let k = data.charCodeAt(i) | (data.charCodeAt(i + 1) << 8) |
             (data.charCodeAt(i + 2) << 16) | (data.charCodeAt(i + 3) << 24);

    k = Math.imul(k, c1);
    k = (k << r1) | (k >>> (32 - r1));
    k = Math.imul(k, c2);

    h1 ^= k;
    h1 = (h1 << r2) | (h1 >>> (32 - r2));
    h1 = Math.imul(h1, m) + 0xe6546b64;
  }

  // Tail
  let k = 0;
  switch (len & 3) {
    case 3: k ^= data.charCodeAt(roundedEnd + 2) << 16; // fall through
    case 2: k ^= data.charCodeAt(roundedEnd + 1) << 8;  // fall through
    case 1:
      k ^= data.charCodeAt(roundedEnd);
      k = Math.imul(k, c1);
      k = (k << r1) | (k >>> (32 - r1));
      k = Math.imul(k, c2);
      h1 ^= k;
  }

  // Finalization
  h1 ^= len;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

/**
 * DJB2 hash (the "xor" variant used by Berkeley DB).
 */
export function djb2(data: string): number {
  let h = 5381;
  for (let i = 0; i < data.length; i++) {
    h = ((h << 5) + h + data.charCodeAt(i)) | 0; // h * 33 + c
  }
  return h >>> 0;
}

/**
 * SDBM hash. Another simple but effective non-cryptographic hash.
 */
export function sdbm(data: string): number {
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h = data.charCodeAt(i) + (h << 6) + (h << 16) - h;
  }
  return h >>> 0;
}

/**
 * Jenkins one-at-a-time hash (JOAAT).
 */
export function jenkinsOaat(data: string): number {
  let h = 0;
  for (let i = 0; i < data.length; i++) {
    h += data.charCodeAt(i);
    h += h << 10;
    h ^= h >>> 6;
  }
  h += h << 3;
  h ^= h >>> 11;
  h += h << 15;
  return h >>> 0;
}

/**
 * CRC32 (table-less polynomial-based implementation).
 */
export function crc32(data: string): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    let byte = data.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      if ((crc ^ byte) & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
      byte >>= 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// --- Cryptographic Hash Wrappers ---

/**
 * SHA-256 hash using Web Crypto API. Returns hex string.
 */
export async function sha256(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SHA-1 hash using Web Crypto API. Returns hex string.
 */
export async function sha1(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data);
  const hashBuf = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SHA-512 hash using Web Crypto API. Returns hex string.
 */
export async function sha512(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data);
  const hashBuf = await crypto.subtle.digest("SHA-512", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// --- Consistent Hashing ---

/**
 * Consistent Hash Ring with virtual nodes for even distribution.
 * Used in distributed systems to map keys to nodes with minimal remapping.
 */
export class ConsistentHashRing<T> {
  private ring: Map<number, T> = new Map();
  private sortedKeys: number[] = [];
  private virtualNodes: number;
  private hashFn: (s: string) => number;

  constructor(virtualNodes = 150, hashFn?: (s: string) => number) {
    this.virtualNodes = virtualNodes;
    this.hashFn = hashFn ?? murmur3_32;
  }

  /** Add a node to the ring */
  addNode(node: T, weight = 1): void {
    const count = this.virtualNodes * weight;
    for (let i = 0; i < count; i++) {
      const key = this.hashFn(`${String(node)}:${i}`);
      this.ring.set(key, node);
    }
    this._rebuildSortedKeys();
  }

  /** Remove a node from the ring */
  removeNode(node: T): void {
    const keysToDelete: number[] = [];
    for (const [key, val] of this.ring) {
      if (val === node) keysToDelete.push(key);
    }
    for (const k of keysToDelete) this.ring.delete(k);
    this._rebuildSortedKeys();
  }

  /** Get the node responsible for a given key */
  getNode(key: string): T | undefined {
    if (this.sortedKeys.length === 0) return undefined;
    const hash = this.hashFn(key);
    // Binary search for first node >= hash (clockwise)
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid]! < hash) lo = mid + 1;
      else hi = mid;
    }
    // Wrap around if past end
    const idx = lo >= this.sortedKeys.length ? 0 : lo;
    return this.ring.get(this.sortedKeys[idx]!);
  }

  /** Get N responsible nodes for replication */
  getNodes(key: string, count = 1): T[] {
    if (this.sortedKeys.length === 0) return [];
    const hash = this.hashFn(key);
    const result: T[] = [];
    const seen = new Set<T>();
    let idx = this._upperBound(hash);

    while (result.length < count && seen.size < this.ring.size) {
      if (idx >= this.sortedKeys.length) idx = 0;
      const node = this.ring.get(this.sortedKeys[idx]!)!;
      if (!seen.has(node)) { seen.add(node); result.push(node); }
      idx++;
    }
    return result;
  }

  get size(): number {
    // Count unique nodes
    return new Set(this.ring.values()).size;
  }

  private _rebuildSortedKeys(): void {
    this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  private _upperBound(hash: number): number {
    let lo = 0, hi = this.sortedKeys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.sortedKeys[mid]! < hash) lo = mid + 1;
      else hi = mid;
    }
    return lo >= this.sortedKeys.length ? 0 : lo;
  }
}

// --- Bloom Filter ---

/**
 * Probabilistic Bloom Filter for membership testing.
 * False positives possible, false negatives impossible.
 */
export class BloomFilter {
  private bits: Uint8Array;
  private size: number;
  private hashCount: number;
  private added = 0;

  /**
   * @param expectedItems Expected number of items
   * @param falsePositiveRate Desired false positive rate (0-1)
   */
  constructor(expectedItems = 1000, falsePositiveRate = 0.01) {
    // Optimal bit array size: m = -n*ln(p) / (ln2)^2
    this.size = Math.ceil(
      (-expectedItems * Math.log(falsePositiveRate)) / (Math.LN2 * Math.LN2)
    );
    // Optimal hash count: k = (m/n) * ln2
    this.hashCount = Math.ceil((this.size / expectedItems) * Math.LN2);
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
  }

  /** Add an item to the filter */
  add(item: string): void {
    for (const pos of this._positions(item)) {
      this.bits[pos >> 3] |= 1 << (pos & 7);
    }
    this.added++;
  }

  /** Check if item might be in the set (may have false positives) */
  has(item: string): boolean {
    for (const pos of this._positions(item)) {
      if ((this.bits[pos >> 3] & (1 << (pos & 7))) === 0) return false;
    }
    return true;
  }

  /** Current approximate fill ratio */
  get fillRatio(): number {
    let setBits = 0;
    for (const byte of this.bits) {
      // Count set bits in each byte
      let b = byte;
      while (b) { setBits++; b &= b - 1; }
    }
    return setBits / this.size;
  }

  get itemCount(): number { return this.added; }

  private *_positions(item: string): Generator<number> {
    let hash1 = murmur3_32(item, 0);
    let hash2 = murmur3_32(item, hash1);
    for (let i = 0; i < this.hashCount; i++) {
      yield Math.abs((hash1 + i * hash2) % this.size);
    }
  }
}

// --- Hash Table ---

/**
 * Open-addressing hash table with linear probing.
 * Simple, fast, no allocations after construction (for fixed capacity).
 */
export class HashTable<V> {
  private entries: (HashTableEntry<V> | null)[];
  private count = 0;
  private capacity: number;

  constructor(capacity = 64) {
    // Use next power of 2 for efficient masking
    this.capacity = Math.max(16, 1 << Math.ceil(Math.log2(capacity)));
    this.entries = new Array(this.capacity).fill(null);
  }

  /** Set a key-value pair */
  set(key: string, value: V): void {
    if (this.count >= this.capacity * 0.7) this._resize();

    const idx = this._findSlot(key);
    if (this.entries[idx]) {
      this.entries[idx]!.value = value;
      if (this.entries[idx]!.deleted) { this.entries[idx]!.deleted = false; this.count++; }
    } else {
      this.entries[idx] = { key, value, deleted: false };
      this.count++;
    }
  }

  /** Get value by key */
  get(key: string): V | undefined {
    const entry = this._findEntry(key);
    return entry?.value;
  }

  /** Check if key exists */
  has(key: string): boolean {
    return this._findEntry(key) !== null;
  }

  /** Delete a key */
  delete(key: string): boolean {
    const idx = this._findIndex(key);
    if (idx >= 0 && this.entries[idx] && !this.entries[idx]!.deleted) {
      this.entries[idx]!.deleted = true;
      this.count--;
      return true;
    }
    return false;
  }

  /** Get all keys */
  keys(): string[] {
    const result: string[] = [];
    for (const e of this.entries) {
      if (e && !e.deleted) result.push(e.key);
    }
    return result;
  }

  /** Get all values */
  values(): V[] {
    const result: V[] = [];
    for (const e of this.entries) {
      if (e && !e.deleted) result.push(e.value);
    }
    return result;
  }

  get size(): number { return this.count; }

  get loadFactor(): number { return this.count / this.capacity; }

  private _hash(key: string): number {
    return murmur3_32(key) & (this.capacity - 1);
  }

  private _findSlot(key: string): number {
    let idx = this._hash(key);
    let firstDeleted = -1;
    for (let i = 0; i < this.capacity; i++) {
      const pos = (idx + i) & (this.capacity - 1);
      const entry = this.entries[pos];
      if (!entry) return firstDeleted >= 0 ? firstDeleted : pos;
      if (entry.deleted && firstDeleted < 0) firstDeleted = pos;
      if (!entry.deleted && entry.key === key) return pos;
    }
    return firstDeleted >= 0 ? firstDeleted : 0;
  }

  private _findEntry(key: string): HashTableEntry<V> | null {
    const idx = this._findIndex(key);
    return idx >= 0 ? this.entries[idx] ?? null : null;
  }

  private _findIndex(key: string): number {
    let idx = this._hash(key);
    for (let i = 0; i < this.capacity; i++) {
      const pos = (idx + i) & (this.capacity - 1);
      const entry = this.entries[pos];
      if (!entry) return -1;
      if (!entry.deleted && entry.key === key) return pos;
    }
    return -1;
  }

  private _resize(): void {
    const oldEntries = this.entries;
    this.capacity *= 2;
    this.entries = new Array(this.capacity).fill(null);
    this.count = 0;
    for (const e of oldEntries) {
      if (e && !e.deleted) this.set(e.key, e.value);
    }
  }
}

// --- Checksum / Fingerprint ---

/**
 * Compute a simple additive checksum (like sum of bytes mod 256).
 */
export function simpleChecksum(data: string): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data.charCodeAt(i)) & 0xff;
  }
  return sum;
}

/**
 * Compute Adler-32 checksum (used in zlib).
 */
export function adler32(data: string): number {
  let a = 1, b = 0;
  const MOD = 65521;
  for (let i = 0; i < data.length; i++) {
    a = (a + data.charCodeAt(i)) % MOD;
    b = (b + a) % MOD;
  }
  return ((b << 16) | a) >>> 0;
}

/**
 * Generate a short content fingerprint (first 8 chars of hex-encoded FNV-1a).
 */
export function fingerprint(data: string): string {
  return fnv1a32(data).toString(16).padStart(8, "0");
}

/**
 * Generate a content-addressable identifier (SHA-256 prefix).
 * Useful for deduplication keys.
 */
export async function contentAddress(data: string, prefixLength = 12): Promise<string> {
  const hash = await sha256(data);
  return hash.slice(0, prefixLength);
}

// --- Utility ---

/** Combine multiple hashes into one (simple XOR folding) */
export function combineHashes(...hashes: number[]): number {
  return hashes.reduce((acc, h) => acc ^ h, 0) >>> 0;
}

/** Convert a numeric hash to a hex string of specified length */
export function hashToHex(hash: number, digits = 8): string {
  return hash.toString(16).padStart(digits, "0").slice(-digits);
}
