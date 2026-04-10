/**
 * Client-side storage abstraction layer.
 * Provides a typed API over localStorage with SSR safety.
 */

const PREFIX = "uac-";

function isClient(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Get item from localStorage (returns null on server or if missing) */
export function storageGet<T>(key: string): T | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Set item in localStorage */
export function storageSet<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Silently fail in private browsing
  }
}

/** Remove item from localStorage */
export function storageRemove(key: string): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore
  }
}

/** Get all keys matching a prefix */
export function storageKeys(prefix: string = ""): string[] {
  if (!isClient()) return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX + prefix)) {
      keys.push(k.slice(PREFIX.length));
    }
  }
  return keys;
}

/** Clear all app storage */
export function storageClear(): void {
  if (!isClient()) return;
  const keys = storageKeys();
  for (const k of keys) {
    localStorage.removeItem(PREFIX + k);
  }
}
