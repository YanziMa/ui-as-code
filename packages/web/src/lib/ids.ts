/**
 * UUID generation utilities with multiple formats.
 */

/** Generate a UUID v4 (random) */
export function uuidv4(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const v = (typeof crypto !== "undefined")
      ? crypto.getRandomValues(new Uint8Array(1))[0]! & 0xf
      : Math.floor(Math.random() * 16);
    return v.toString(16);
  });
}

/** Generate a UUID v4 without dashes */
export function uuidv4Compact(): string {
  return uuidv4().replace(/-/g, "");
}

/** Generate a nil UUID (all zeros) */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/** Check if a string is a valid UUID format */
export function isValidUuid(str: string): boolean {
  const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pattern.test(str);
}

/** Generate a short ID (base36, default 12 chars) */
export function shortId(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const values = typeof crypto !== "undefined"
    ? crypto.getRandomValues(new Uint8Array(length))
    : Array.from({ length }, () => Math.floor(Math.random() * 36));

  for (let i = 0; i < length; i++) {
    result += chars[values[i]! % chars.length];
  }

  return result;
}

/** Generate a nanoid (similar to nanoid package) */
export function nanoid(size = 21): string {
  const urlAlphabet = "useABCDEFGHIJKLMNOPQRSTUVWXYZ-9_";
  let id = "";

  if (typeof crypto !== "undefined") {
    const values = crypto.getRandomValues(new Uint8Array(size));
    for (let i = 0; i < size; i++) {
      id += urlAlphabet[values[i]! % urlAlphabet.length];
    }
  } else {
    for (let i = 0; i < size; i++) {
      id += urlAlphabet[Math.floor(Math.random() * urlAlphabet.length)];
    }
  }

  return id;
}

/** Generate a cuid (collision-resistant unique ID) */
export function cuid(prefix = ""): string {
  const now = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);

  return `${prefix}${now}${random}`;
}

/** Generate a cuid with custom length */
export function cuidWithLength(prefix = "", length = 12): string {
  const random = shortId(length).slice(0, length);
  const now = Date.now().toString(36).slice(-8);

  return `${prefix}${now}${random}`;
}

/** Generate an ordered ULID (time-sortable) */
export function ulid(): string {
  const now = Date.now();
  const time = now.toString(36); // milliseconds since epoch

  const randomness = typeof crypto !== "undefined"
    ? crypto.getRandomValues(new Uint8Array(12))
    : Array.from({ length: 12 }, () => Math.floor(Math.random() * 256));

  let rand = "";
  for (const byte of randomness) {
    rand += byte!.toString(16).padStart(2, "0");
  }

  // Encode time as base36 (12 chars for ~48 bits of millisecond precision)
  const timeEncoded = now.toString(36).padStart(12, "0");

  return `${timeEncoded}${rand.slice(0, 12)}`;
}

/** Parse a ULID back into timestamp */
export function parseUlid(ulid: string): { timestamp: number; randomness: string } | null {
  if (ulid.length !== 24) return null;

  try {
    const timePart = ulid.slice(0, 12);
    const randPart = ulid.slice(12, 24);

    const timestamp = parseInt(timePart, 36);
    const randomness = randPart;

    if (isNaN(timestamp)) return null;

    return { timestamp, randomness };
  } catch {
    return null;
  }
}

/** Generate a sortable ID based on timestamp */
export function sortedId(): string {
  return `${Date.now().toString(36)}-${shortId(8)}`;
}
