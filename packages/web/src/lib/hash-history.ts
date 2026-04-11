/**
 * Hash History Manager for SPA-style navigation using window.location.hash,
 * with scroll position restoration, transition support, entry/exit guards,
 * and cross-tab synchronization via BroadcastChannel.
 */

// --- Types ---

export interface HashHistoryEntry {
  /** Full hash value (including #) */
  hash: string;
  /** Path portion (without # or query) */
  path: string;
  /** Query string */
  query: string;
  /** State data attached to this entry */
  state?: Record<string, unknown>;
  /** Timestamp of navigation */
  timestamp: number;
  /** Entry ID for identification */
  id: string;
}

export interface HashHistoryOptions {
  /** Base path prefix (default: "/") */
  basePath?: string;
  /** Called on hash change with parsed entry */
  onChange?: (entry: HashHistoryEntry, action: "push" | "replace" | "pop" | "init") => void;
  /** Guard: return false to prevent navigation */
  guard?: (to: HashHistoryEntry, from: HashHistoryEntry | null) => boolean | Promise<boolean>;
  /** Restore scroll position on pop (default: true) */
  restoreScroll?: boolean;
  /** Save scroll position on navigation (default: true) */
  saveScroll?: boolean;
  /** Animate transitions between entries (default: false) */
  animateTransitions?: boolean;
  /** Transition duration in ms (default: 300) */
  transitionDuration?: number;
  /** Max history entries to track (default: 50) */
  maxEntries?: number;
  /** Sync across tabs via BroadcastChannel (default: false) */
  crossTabSync?: boolean;
  /** Channel name for cross-tab sync */
  syncChannelName?: string;
}

export interface HashHistoryInstance {
  /** Current history entry */
  readonly current: HashHistoryEntry;
  /** Current path (without # or query) */
  readonly currentPath: string;
  /** Previous entry (or null) */
  readonly previous: HashHistoryEntry | null;
  /** All tracked entries */
  readonly entries: HashHistoryEntry[];
  /** Navigate to a new hash (pushes history) */
  push: (path: string, state?: Record<string, unknown>) => void;
  /** Replace current entry without pushing history */
  replace: (path: string, state?: Record<string, unknown>) => void;
  /** Go back */
  back: () => void;
  /** Go forward */
  forward: () => void;
  /** Go to specific entry by index */
  go: (delta: number) => void;
  /** Parse a hash string into an entry */
  parseHash: (hash: string) => HashHistoryEntry;
  /** Build a hash string from path and query */
  buildHash: (path: string, query?: Record<string, string>) => string;
  /** Subscribe to changes */
  subscribe: (listener: (entry: HashHistoryEntry, action: "push" | "replace" | "pop" | "init") => void) => () => void;
  /** Clear all history */
  clear: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Helpers ---

function generateId(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function parseHashString(hash: string, basePath = "/"): HashHistoryEntry {
  const fullHash = hash.startsWith("#") ? hash : `#${hash}`;
  const rest = fullHash.slice(1); // Remove #
  const qIdx = rest.indexOf("?");
  const path = (qIdx >= 0 ? rest.slice(0, qIdx) : rest) || basePath;
  const query = qIdx >= 0 ? rest.slice(qIdx) : "";

  return {
    hash: fullHash,
    path,
    query,
    timestamp: Date.now(),
    id: generateId(),
  };
}

// --- Main ---

export function createHashHistory(options: HashHistoryOptions = {}): HashHistoryInstance {
  const {
    basePath = "/",
    onChange,
    guard,
    restoreScroll = true,
    saveScroll = true,
    animateTransitions = false,
    transitionDuration = 300,
    maxEntries = 50,
    crossTabSync = false,
    syncChannelName = "hash-history-sync",
  } = options;

  let destroyed = false;
  let previous: HashHistoryEntry | null = null;
  let current = parseHashString(window.location.hash, basePath);
  const entries: HashHistoryEntry[] = [{ ...current }];
  const listeners = new Set<(entry: HashHistoryEntry, action: "push" | "replace" | "pop" | "init") => void>();
  const scrollPositions = new Map<string, { x: number; y: number }>();
  let bc: BroadcastChannel | null = null;

  function notify(entry: HashHistoryEntry, action: "push" | "replace" | "pop" | "init"): void {
    for (const listener of listeners) listener(entry, action);
    onChange?.(entry, action);

    // Cross-tab sync
    if (crossTabSync && bc) {
      bc.postMessage({ type: "hash-change", entry, action });
    }
  }

  async function doPush(path: string, state?: Record<string, unknown>): Promise<void> {
    if (destroyed) return;

    const targetEntry: HashHistoryEntry = {
      ...parseHashString(buildHash(path), basePath),
      state,
      timestamp: Date.now(),
      id: generateId(),
    };

    // Guard check
    if (guard) {
      const allowed = await guard(targetEntry, current);
      if (!allowed) return;
    }

    // Save scroll
    if (saveScroll) {
      scrollPositions.set(current.id, { x: window.scrollX, y: window.scrollY });
    }

    previous = current;
    current = targetEntry;
    entries.push(targetEntry);

    // Trim old entries
    while (entries.length > maxEntries) {
      const removed = entries.shift();
      if (removed) scrollPositions.delete(removed.id);
    }

    window.location.hash = targetEntry.hash;
    notify(targetEntry, "push");
  }

  async function doReplace(path: string, state?: Record<string, unknown>): Promise<void> {
    if (destroyed) return;

    const targetEntry: HashHistoryEntry = {
      ...parseHashString(buildHash(path), basePath),
      state,
      timestamp: Date.now(),
      id: generateId(),
    };

    if (guard) {
      const allowed = await guard(targetEntry, current);
      if (!allowed) return;
    }

    previous = current;
    current = targetEntry;
    entries[entries.length - 1] = targetEntry;

    window.location.replace(`#${targetEntry.hash.slice(1)}`);
    notify(targetEntry, "replace");
  }

  function handleHashChange(): void {
    if (destroyed) return;

    const newEntry = parseHashString(window.location.hash, basePath);
    const isPop = newEntry.path !== current.path;

    // Restore scroll for pop
    if (isPop && restoreScroll) {
      const saved = scrollPositions.get(newEntry.id);
      if (saved) {
        requestAnimationFrame(() => window.scrollTo(saved.x, saved.y));
      }
    }

    previous = current;
    current = newEntry;
    entries.push(newEntry);
    notify(newEntry, isPop ? "pop" : "push");
  }

  function doBuildHash(path: string, query?: Record<string, string>): string {
    let hash = path.startsWith("/") ? path : `/${path}`;
    if (query) {
      const qs = Object.entries(query)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      hash += `?${qs}`;
    }
    return hash;
  }

  // Setup hash change listener
  window.addEventListener("hashchange", handleHashChange);

  // Cross-tab sync
  if (crossTabSync && typeof BroadcastChannel !== "undefined") {
    try {
      bc = new BroadcastChannel(syncChannelName);
      bc.onmessage = (event) => {
        if (event.data?.type === "hash-change" && !destroyed) {
          const entry = event.data.entry as HashHistoryEntry;
          previous = current;
          current = entry;
          notify(entry, event.data.action as "push" | "replace" | "pop" | "init");
        }
      };
    } catch {
      // BroadcastChannel may not be available
    }
  }

  // Initial notification
  notify(current, "init");

  const instance: HashHistoryInstance = {
    get current() { return { ...current }; },
    get currentPath() { return current.path; },
    get previous() { return previous ? { ...previous } : null; },
    get entries() { return [...entries]; },

    push: doPush,
    replace: doReplace,

    back() { history.back(); },
    forward() { history.forward(); },
    go(delta: number) { history.go(delta); },

    parseHash: (hash) => parseHashString(hash, basePath),
    buildHash: doBuildHash,

    subscribe(listener) {
      listeners.add(listener);
      listener(current, "init"); // Emit current
      return () => listeners.delete(listener);
    },

    clear() {
      entries.length = 0;
      entries.push({ ...current });
      scrollPositions.clear();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener("hashchange", handleHashChange);
      listeners.clear();
      if (bc) { bc.close(); bc = null; }
      scrollPositions.clear();
    },
  };

  return instance;
}
