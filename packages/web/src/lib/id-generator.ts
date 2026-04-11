/**
 * ID Generation utilities: UUID v4, nanoid-style, sequential IDs,
 * snowflake-style IDs, CUIDs, ULIDs, and custom ID generators.
 */

// --- UUID v4 ---

/** Generate a random UUID v4 (RFC 4122) */
export function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const hex = "0123456789abcdef";
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  values[6] = (values[6] & 0x0f) | 0x40; // version 4
  values[8] = (values[8] & 0x3f) | 0x80; // variant RFC 4122

  let result = "";
  for (let i = 0; i < 16; i++) {
    result += hex[values[i] >> 4]! + hex[values[i] & 0x0f]!;
    if (i === 3 || i === 5 || i === 7 || i === 9) result += "-";
  }
  return result;
}

/** Generate a UUID v4 without dashes (32 chars) */
export function uuidShort(): string {
  return uuid().replace(/-/g, "");
}

/** Generate a UUID v4 with a custom prefix */
export function uuidPrefixed(prefix: string): string {
  return `${prefix}_${uuidShort()}`;
}

// --- NanoID-style ---

const DEFAULT_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

interface NanoidOptions {
  /** Length of generated ID (default: 21) */
  length?: number;
  /** Character set to use (default: alphanumeric) */
  alphabet?: string;
  /** Custom prefix */
  prefix?: string;
  /** Custom separator between prefix and ID */
  separator?: string;
}

/** Generate a nanoid-style unique string */
export function nanoid(options: NanoidOptions = {}): string {
  const { length = 21, alphabet = DEFAULT_ALPHABET, prefix = "", separator = "_" } = options;

  const values = new Uint8Array(length);
  crypto.getRandomValues(values);

  let id = "";
  for (let i = 0; i < length; i++) {
    id += alphabet[values[i] % alphabet.length];
  }

  return prefix ? `${prefix}${separator}${id}` : id;
}

/** Generate a short nanoid (default 10 chars) */
export function nanoIdShort(length = 10): string {
  return nanoid({ length });
}

// --- Sequential ID ---

class SequentialIdGenerator {
  private counter = 0;
  private prefix: string;
  private padding: number;

  constructor(prefix = "", startFrom = 0, padLength = 6) {
    this.prefix = prefix;
    this.counter = startFrom;
    this.padding = padLength;
  }

  next(): string {
    const id = String(this.counter++).padStart(this.padding, "0");
    return this.prefix ? `${prefix}${id}` : id;
  }

  reset(startFrom = 0): void {
    this.counter = startFrom;
  }

  peek(): string {
    return String(this.counter).padStart(this.padding, "0");
  }
}

/** Create a sequential ID generator instance */
export function createSequentialGenerator(
  prefix = "",
  options?: { startFrom?: number; padLength?: number },
): SequentialIdGenerator {
  return new SequentialIdGenerator(prefix, options?.startFrom ?? 0, options?.padLength ?? 6);
}

// --- Snowflake-style ---

interface SnowflakeOptions {
  /** Worker ID (0-31) */
  workerId?: number;
  /** Data center / process ID (0-31) */
  datacenterId?: number;
  /** Epoch in ms (default: 2024-01-01) */
  epoch?: number;
}

/**
 * Generate a snowflake-style 64-bit integer as a string.
 * Format: timestamp(42bits) + datacenter(5bits) + worker(5bits) + sequence(12bits)
 */
export function snowflake(options: SnowflakeOptions = {}): string {
  const { workerId = 0, datacenterId = 0, epoch = 1704067200000 } = options;

  // Clamp to valid ranges
  const w = Math.max(0, Math.min(workerId, 31));
  const d = Math.max(0, Math.min(datacenterId, 31));

  const now = Date.now();
  const ts = BigInt(now - epoch);

  // Simple sequence - not thread-safe but sufficient for single-threaded browser use
  const seq = BigInt(Math.floor(Math.random() * 4096)); // 12 bits

  const id = (ts << 22n) | (BigInt(d) << 17n) | (BigInt(w) << 12n) | seq;
  return id.toString();
}

// --- CUID-style ---

let cuidCounter = 0;
let lastCuidTimestamp = 0;

/** Generate a CUID-style ID (timestamp + counter + random) */
export function cuid(length = 25): string {
  const now = Date.now();

  // Reset counter if same millisecond
  if (now === lastCuidTimestamp) {
    cuidCounter++;
  } else {
    cuidCounter = 0;
    lastCuidTimestamp = now;
  }

  const ts = now.toString(36);
  const cnt = cuidCounter.toString(36).padStart(2, "0");
  const rand = nanoid({ length: length - ts.length - cnt.length });

  return `${ts}${cnt}${rand}`.slice(0, length);
}

// --- ULID-style ---

/** Generate a ULID-style ID (Crockford base32 encoded time + randomness) */
export function ulid(): string {
  const now = Date.now();
  const timeChars = encodeTime(now);
  const randChars = nanoid({ length: 16, alphabet: "0123456789ABCDEFGHJKMNPQRSTVWXYZ" });

  return `${timeChars}${randChars}`;
}

function encodeTime(now: number): string {
  const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let n = now;
  let result = "";

  for (let i = 0; i < 10; i++) {
    result = ENCODING[n % 32]! + result;
    n = Math.floor(n / 32);
  }

  return result;
}

// --- Object ID (MongoDB-style) ---

/** Generate a MongoDB ObjectId-style 24-char hex string */
export function objectId(): string {
  const now = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const rand = nanoid({ length: 16, alphabet: "0123456789abcdef" });
  return `${now}${rand}`;
}

// --- Hash-based ID ---

/** Generate a deterministic ID from a string input using simple hash */
export function hashId(input: string, length = 16): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }

  const absHash = Math.abs(hash);
  let result = absHash.toString(36);

  while (result.length < length) {
    result += hashId(result + input, length);
  }

  return result.slice(0, length);
}

// --- Slug ID ---

/** Generate a URL-friendly slug from text with optional random suffix */
export function slugId(text: string, suffixLength = 6): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48); // max 48 chars before suffix

  const suffix = nanoid({ length: suffixLength, alphabet: "abcdefghijklmnopqrstuvwxyz0123456789" });
  return `${base}-${suffix}`;
}
