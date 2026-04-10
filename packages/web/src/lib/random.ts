/**
 * Random value generation: seeded PRNG, weighted random,
 * shuffle, normal distribution sampling, and secure random
 * fallbacks.
 */

// --- Secure Random ---

/** Get a cryptographically secure random integer in [min, max] inclusive */
export function secureRandomInt(min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const range = max - min + 1;
  if (range <= 0) return min;

  const bitsNeeded = Math.ceil(Math.log2(range));
  const bytesNeeded = Math.ceil(bitsNeeded / 8);
  const maxValid = 2 ** (bytesNeeded * 8) - (2 ** (bytesNeeded * 8) % range);

  let result: number;
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(bytesNeeded));
    result = 0;
    for (const byte of bytes) {
      result = (result << 8) | byte;
    }
    result = result % (max - min + 1) + min;
  } while (result > max);

  return result;
}

/** Get a cryptographically secure random float in [0, 1) */
export function secureRandomFloat(): number {
  const arr = crypto.getRandomValues(new Uint32Array(1))[0];
  return arr / 4294967295; // 2^32 - 1
}

/** Pick a random element from an array securely */
export function securePick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("Cannot pick from empty array");
  return arr[secureRandomInt(0, arr.length - 1)];
}

/** Shuffle an array securely (Fisher-Yates with crypto RNG) */
export function secureShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomInt(0, i);
    [result[i], result[j]] = [result[j]!, result[i]];
  }
  return result;
}

// --- Weighted Random ---

interface WeightedItem<T> {
  item: T;
  weight: number;
}

/**
 * Pick a random item based on weights.
 * Higher weight = higher probability of selection.
 *
 * @example
 * weightedRandom([{ item: "a", weight: 3 }, { item: "b", weight: 1 }])
 * → "a" ~75% of the time, "b" ~25%
 */
export function weightedRandom<T>(items: WeightedItem<T>[]): T {
  if (items.length === 0) throw new Error("Cannot pick from empty items");

  const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
  if (totalWeight <= 0) throw new Error("Total weight must be positive");

  let random = secureRandomFloat() * totalWeight;

  for (const it of items) {
    random -= it.weight;
    if (random <= 0) return it.item;
  }

  // Floating point rounding safety net
  return items[items.length - 1].item;
}

/**
 * Create a weighted random picker that can be called repeatedly.
 */
export function createWeightedPicker<T>(
  items: WeightedItem<T>[],
): () => T {
  // Precompute cumulative weights for efficiency
  const cumulative: { item: T; cumWeight: number }[] = [];
  let total = 0;

  for (const it of items) {
    total += it.weight;
    cumulative.push({ item: it.item, cumWeight: total });
  }

  return (): T => {
    if (total <= 0) throw new Error("No valid items");
    const r = secureRandomFloat() * total;
    for (const entry of cumulative) {
      if (r <= entry.cumWeight) return entry.item;
    }
    return cumulative[cumulative.length - 1].item;
  };
}

// --- Seeded PRNG (Mulberry32) ---

/**
 * A seeded pseudo-random number generator using the Mulberry32 algorithm.
 * Produces reproducible sequences given the same seed.
 *
 * @example
 * const rng = createSeededRng(42);
 * rng(); // Always returns same sequence
 */
export function createSeededRng(seed?: number): () => number {
  let s = seed ?? Date.now();

  // Initialize state from seed
  let state = new Uint32Array([s & 0xffffffff]);

  return (): number => {
    // Mulberry32 step
    state[0] ^= state[0] << 13;
    state[0] ^= state[0] >>> 17;
    state[0] ^= state[0] << 5;
    state[0] &= 0xffffffff;

    // Output transformation (counter mode)
    state[0] ^= state[0] >>> 7;
    state[0] ^= state[0] << 11;
    state[0] ^= state[0] >>> 14;

    return (state[0] >>> 0) / 4294967295; // Normalize to [0, 1)
  };
}

/**
 * Seeded random integer in [min, max].
 */
export function seededInt(rng: () => number, min = 0, max = 100): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Seeded random pick from array.
 */
export function seededPick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Seeded shuffle (Fisher-Yates).
 */
export function seededShuffle<T>(rng: () => number, arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]];
  }
  return result;
}

// --- Normal Distribution ---

/**
 * Generate a normally-distributed (Gaussian) random number
 * using the Box-Muller transform.
 * Mean=0, StdDev=1 by default.
 */
export function normalRandom(mean = 0, stdDev = 1): number {
  // Box-Muller transform
  let u1: number;
  let u2: number;

  // Reject degenerate pairs
  do {
    u1 = secureRandomFloat();
    u2 = secureRandomFloat();
  } while (u1 === 0);

  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * stdDev + mean;
}

/**
 * Generate a random number within a normal distribution clamped to [min, max].
 */
export function clampedNormal(
  mean = 0,
  stdDev = 1,
  min = -Infinity,
  max = Infinity,
): number {
  let val: number;
  do {
    val = normalRandom(mean, stdDev);
  } while (val < min || val > max);
  return val;
}

// --- Random String ---

/**
 * Generate a random alphanumeric string of given length.
 */
export function randomString(
  length = 16,
  charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
): string {
  let result = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));

  for (let i = 0; i < length; i++) {
    result += charset[bytes[i]! % charset.length];
  }

  return result;
}

/**
 * Generate a random hex string of given byte length.
 */
export function randomHex(byteLength = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a random password with configurable character sets.
 */
export function generatePassword(options: {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
} = {}): string {
  const opts = {
    length: options.length ?? 16,
    uppercase: options.uppercase ?? true,
    lowercase: options.lowercase ?? true,
    numbers: options.numbers ?? true,
    symbols: options.symbols ?? false,
  };

  let chars = "";
  if (opts.uppercase) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (opts.lowercase) chars += "abcdefghijklmnopqrstuvwxyz";
  if (opts.numbers) chars += "0123456789";
  if (opts.symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";

  if (!chars) chars = "abcdefghijklmnopqrstuvwxyz0123456789";

  return randomString(opts.length, chars);
}
