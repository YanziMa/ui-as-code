/**
 * UUID / Unique ID generation: v4 UUID, v7 (time-ordered) UUID,
 * nanoid-style IDs, custom ID formats, and collision-resistant
 * random string generation.
 */

// --- v4 UUID ---

/** Generate a random UUID v4 (RFC 4122 compliant) */
export function uuidv4(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: manual generation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf);
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/** Generate a time-ordered UUID v7 (draft RFC) */
export function uuidv7(): string {
  const now = Date.now();
  const secs = Math.floor(now / 1000);
  const msecs = now % 1000;

  // Unix timestamp in milliseconds as hex (12 chars)
  const unixTsMs = secs.toString(16).padStart(12, "0");

  // Version + variant
  const ver = "7";
  const variant = Math.floor(Math.random() * 4) + 8; // 8, 9, 10, or 11

  // Random portion (enough for uniqueness)
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Combine: 48 bits timestamp + 4 bits version + 12 bits variant/rand + 62 bits random
  return `${unixTsMs.slice(0, 8)}-${unixTsMs.slice(8, 12)}${ver}${rand.slice(0, 3)}-${variant.toString(16)}${rand.slice(3, 8)}-${rand.slice(8)}`;
}

/** Generate a short ID (like nanoid) — URL-safe, collision-resistant */
export function nanoId(size = 21): string {
  const urlChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let id = "";

  while (id.length < size) {
    const bytes = crypto.getRandomValues(new Uint8Array(size - id.length));
    for (let i = 0; i < bytes.length && id.length < size; i++) {
      const byte = bytes[i]!;
      id += urlChars[byte % urlChars.length];
    }
  }

  return id;
}

/** Generate a short numeric ID */
export function shortId(length = 8): string {
  let id = "";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No ambiguous characters

  while (id.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length - id.length));
    for (let i = 0; i < bytes.length && id.length < length; i++) {
      id += chars[bytes[i]! % chars.length];
    }
  }

  return id;
}

/** Generate a sequential-like ID with prefix and randomness */
export function prefixedId(prefix = "id", entropy = 8): string {
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(entropy)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, entropy);
  return `${prefix}_${rand}`;
}

/** Check if a string looks like a valid UUID */
export function isUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/** Validate UUID version */
export function getUuidVersion(uuid: string): number | null {
  if (!isUuid(uuid)) return null;
  return parseInt(uuid.charAt(14), 16) >> 4;
}
