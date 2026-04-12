/**
 * Storage Quota Manager: Monitor and manage browser storage usage across
 * localStorage, sessionStorage, IndexedDB, Cache API, and File System Access API.
 * Provides usage statistics, quota warnings, cleanup suggestions, and
 * storage migration utilities.
 */

// --- Types ---

export type StorageType = "localStorage" | "sessionStorage" | "indexedDB" | "cache" | "fileSystem";

export interface StorageUsage {
  /** Storage type */
  type: StorageType;
  /** Used bytes */
  used: number;
  /** Quota/limit in bytes (0 = unknown/unlimited) */
  quota: number;
  /** Usage percentage (0-1, -1 if quota unknown) */
  usageRatio: number;
  /** Number of keys/items stored */
  itemCount: number;
  /** Human-readable label */
  label: string;
}

export interface QuotaWarning {
  /** Warning level */
  level: "info" | "warning" | "critical";
  /** Message */
  message: string;
  /** Percentage threshold that triggered this warning */
  threshold: number;
  /** Which storage types are affected */
  types: StorageType[];
}

export interface CleanupSuggestion {
  /** Key/item to clean up */
  key: string;
  /** Storage type */
  storageType: StorageType;
  /** Estimated size in bytes */
  size: number;
  /** Last accessed timestamp (if available) */
  lastAccessed?: number;
  /** Reason for suggestion */
  reason: "expired" | "large" | "old" | "orphaned" | "duplicate";
}

export interface StorageQuotaOptions {
  /** Warning thresholds (default: [0.7, 0.85, 0.95]) */
  thresholds?: number[];
  /** Auto-cleanup expired items? (default: false) */
  autoCleanup?: boolean;
  /** TTL for items in ms (0 = no TTL, default: 0) */
  defaultTTL?: number;
  /** Prefix for managed items (default: "sq:") */
  prefix?: string;
  /** Callback on quota warning */
  onWarning?: (warning: QuotaWarning) => void;
  /** Callback when cleanup runs */
  onCleanup?: (removed: number) => void;
}

// --- Usage Estimators ---

async function estimateLocalStorageUsage(): Promise<{ used: number; count: number }> {
  let total = 0;
  let count = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key == null) continue;
      try { total += (localStorage.getItem(key) ?? "").length * 2; count++; } catch {}
    }
  } catch {}

  return { used: total, count };
}

async function estimateSessionStorageUsage(): Promise<{ used: number; count: number }> {
  let total = 0;
  let count = 0;

  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key == null) continue;
      try { total += (sessionStorage.getItem(key) ?? "").length * 2; count++; } catch {}
    }
  } catch {}

  return { used: total, count };
}

async function estimateCacheUsage(): Promise<{ used: number; count: number }> {
  if ("caches" in window) {
    try {
      const names = await caches.keys();
      let total = 0;
      let count = 0;

      for (const name of names) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            // Rough estimate from headers
            const clen = response.headers.get("content-length");
            total += parseInt(clen ?? "0", 10);
            count++;
          }
        }
      }

      return { used: total, count };
    } catch {
      return { used: 0, count: 0 };
    }
  }

  return { used: 0, count: 0 };
}

async function estimateIndexedDBUsage(): Promise<{ used: number; count: number }> {
  if (!("indexedDB" in window)) return { used: 0, count: 0 };

  try {
    const databases = await indexedDB.databases();
    let total = 0;
    let count = 0;

    for (const db of databases) {
      // Estimate based on reported quota
      if (navigator.storage?.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          total += estimate.usage || 0;
          count++;
        } catch {}
      }
    }

    return { used: total, count };
  } catch {
    return { used: 0, count: 0 };
  }
}

// --- Main Class ---

export class StorageQuotaManager {
  private options: Required<StorageQuotaOptions> & StorageQuotaOptions;
  private listeners = new Set<(usages: StorageUsage[]) => void>;
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(options: StorageQuotaOptions = {}) {
    this.options = {
      thresholds: options.thresholds ?? [0.7, 0.85, 0.95],
      autoCleanup: options.autoCleanup ?? false,
      defaultTTL: options.defaultTTL ?? 0,
      prefix: options.prefix ?? "sq:",
      onWarning: options.onWarning ?? (() => {}),
      onCleanup: options.onCleanup ?? (() => {}),
    };
  }

  /** Get usage estimates for all storage types */
  async getUsage(): Promise<StorageUsage[]> {
    const results: StorageUsage[] = [];

    const [ls, ss, cache, idb] = await Promise.all([
      estimateLocalStorageUsage(),
      estimateSessionStorageUsage(),
      estimateCacheUsage(),
      estimateIndexedDBUsage(),
    ]);

    results.push({
      type: "localStorage",
      used: ls.used,
      quota: 5 * 1024 * 1024, // ~5MB typical
      usageRatio: Math.min(1, ls.used / (5 * 1024 * 1024)),
      itemCount: ls.count,
      label: "Local Storage",
    });

    results.push({
      type: "sessionStorage",
      used: ss.used,
      quota: 5 * 1024 * 1024,
      usageRatio: Math.min(1, ss.used / (5 * 1024 * 1024)),
      itemCount: ss.count,
      label: "Session Storage",
    });

    results.push({
      type: "cache",
      used: cache.used,
      quota: 100 * 1024 * 1024, // ~100MB typical
      usageRatio: cache.quota > 0 ? Math.min(1, cache.used / cache.quota) : -1,
      itemCount: cache.count,
      label: "Cache API",
    });

    results.push({
      type: "indexedDB",
      used: idb.used,
      quota: 50 * 1024 * 1024, // ~50MB typical for browsers with unlimited
      usageRatio: idb.quota > 0 ? Math.min(1, idb.used / idb.quota) : -1,
      itemCount: idb.count,
      label: "IndexedDB",
    });

    return results;
  }

  /** Get total estimated usage across all storage */
  async getTotalUsage(): Promise<{ used: number; quota: number; ratio: number }> {
    const usages = await this.getUsage();
    let totalUsed = 0;
    let totalQuota = 0;
    let knownQuotaCount = 0;

    for (const u of usages) {
      totalUsed += u.used;
      if (u.usageRatio >= 0) {
        totalQuota += u.quota;
        knownQuotaCount++;
      }
    }

    return {
      used: totalUsed,
      quota: totalQuota > 0 ? totalQuota : -1,
      ratio: totalQuota > 0 ? Math.min(1, totalUsed / totalQuota) : -1,
    };
  }

  /** Check against thresholds and emit warnings */
  async checkWarnings(): Promise<QuotaWarning[]> {
    const usages = await this.getUsage();
    const warnings: QuotaWarning[] = [];

    for (const usage of usages) {
      if (usage.usageRatio < 0) continue; // Skip unknown quotas

      for (let i = 0; i < this.options.thresholds.length; i++) {
        const threshold = this.options.thresholds[i]!;
        if (usage.usageRatio >= threshold) {
          const level = i === 0 ? "warning" : i === 1 ? "critical" : "info";
          warnings.push({
            level,
            message: `${usage.label} is ${Math.round(usage.usageRatio * 100)}% full (${formatBytes(usage.used)} of ~${formatBytes(usage.quota)})`,
            threshold,
            types: [usage.type],
          });
          break; // Only report highest threshold per storage type
        }
      }
    }

    // Also check combined usage
    const total = await this.getTotalUsage();
    if (total.ratio >= 0) {
      for (const threshold of this.options.thresholds) {
        if (total.ratio >= threshold) {
          warnings.push({
            level: total.ratio >= 0.95 ? "critical" : "warning",
            message: `Total storage is ${Math.round(total.ratio * 100)}% full (${formatBytes(total.used)})`,
            threshold,
            types: usages.map((u) => u.type),
          });
          break;
        }
      }
    }

    for (const w of warnings) {
      this.options.onWarning(w);
    }

    return warnings;
  }

  /** Get cleanup suggestions */
  async getSuggestions(): Promise<CleanupSuggestion[]> {
    const suggestions: CleanupSuggestion[] = [];
    const now = Date.now();

    // Analyze localStorage items
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key == null || !key.startsWith(this.options.prefix)) continue;

        try {
          const value = localStorage.getItem(key);
          if (!value) continue;

          const parsed = JSON.parse(value);
          const size = value.length * 2;
          const createdAt = parsed._ts ?? parsed.createdAt ?? 0;
          const ttl = parsed._ttl ?? this.options.defaultTTL;

          // Expired items
          if (ttl > 0 && createdAt > 0 && now - createdAt > ttl) {
            suggestions.push({ key, storageType: "localStorage", size, lastAccessed: createdAt, reason: "expired" });
          }

          // Large items (>10KB)
          if (size > 10 * 1024) {
            suggestions.push({ key, storageType: "localStorage", size, lastAccessed: createdAt, reason: "large" });
          }

          // Old items (>30 days)
          if (createdAt > 0 && now - createdAt > 30 * 24 * 60 * 60 * 1000) {
            suggestions.push({ key, storageType: "localStorage", size, lastAccessed: createdAt, reason: "old" });
          }
        } catch {
          // Non-JSON values — skip analysis
        }
      }
    } catch {}

    // Sort by size descending (biggest cleanup wins first)
    suggestions.sort((a, b) => b.size - a.size);

    return suggestions.slice(0, 50); // Limit to top 50 suggestions
  }

  /** Execute cleanup of suggested items */
  async cleanup(suggestions?: CleanupSuggestion[]): Promise<number> {
    const targets = suggestions ?? await this.getSuggestions();
    let removed = 0;

    for (const item of targets) {
      try {
        switch (item.storageType) {
          case "localStorage":
            localStorage.removeItem(item.key);
            break;
          case "sessionStorage":
            sessionStorage.removeItem(item.key);
            break;
        }
        removed++;
      } catch {}
    }

    this.options.onCleanup(removed);
    return removed;
  }

  /** Store a value with optional TTL and metadata */
  setItem(key: string, value: unknown, ttlMs?: number): void {
    const fullKey = `${this.options.prefix}${key}`;
    const data = {
      v: value,
      _ts: Date.now(),
      _ttl: ttlMs ?? this.options.defaultTTL,
    };

    try {
      localStorage.setItem(fullKey, JSON.stringify(data));
    } catch (e) {
      console.warn("[StorageQuota] Failed to store item:", e);
    }
  }

  /** Retrieve a managed value (auto-cleans expired) */
  getItem<T = unknown>(key: string): T | null {
    const fullKey = `${this.options.prefix}${key}`;

    try {
      const raw = localStorage.getItem(fullKey);
      if (!raw) return null;

      const data = JSON.parse(raw);

      // Check TTL
      if (data._ttl && data._ts) {
        if (Date.now() - data._ts > data._ttl) {
          localStorage.removeItem(fullKey);
          return null;
        }
      }

      return data.v as T;
    } catch {
      return null;
    }
  }

  /** Remove a managed item */
  removeItem(key: string): void {
    localStorage.removeItem(`${this.options.prefix}${key}`);
  }

  /** Start periodic monitoring */
  startMonitoring(intervalMs = 60000): void {
    if (this.checkTimer) return;
    this.checkTimer = setInterval(async () => {
      if (this.destroyed) return;
      await this.checkWarnings();

      if (this.options.autoCleanup) {
        await this.cleanup();
      }

      const usages = await this.getUsage();
      for (const l of this.listeners) l(usages);
    }, intervalMs);
  }

  /** Stop monitoring */
  stopMonitoring(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /** Subscribe to usage updates */
  onUsageChange(listener: (usages: StorageUsage[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Destroy manager */
  destroy(): void {
    this.destroyed = true;
    this.stopMonitoring();
    this.listeners.clear();
  }
}

// -- Utilities --

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
