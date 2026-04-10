/**
 * Feature flag / toggle management system.
 */

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  /** Percentage rollout (0-100, only if enabled) */
  rollout?: number;
  /** Targeted user IDs (only these users if set) */
  allowedUsers?: string[];
  /** Targeted team IDs */
  allowedTeams?: string[];
  /** Metadata for the flag */
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlagContext {
  userId?: string;
  teamId?: string;
  email?: string;
  attributes?: Record<string, unknown>;
}

/** In-memory feature flag store */
export class FeatureFlagStore {
  private flags = new Map<string, FeatureFlag>();

  constructor(initialFlags?: FeatureFlag[]) {
    if (initialFlags) {
      for (const flag of initialFlags) {
        this.flags.set(flag.key, flag);
      }
    }
  }

  /** Set or update a flag */
  set(key: string, updates: Partial<FeatureFlag>): FeatureFlag {
    const existing = this.flags.get(key);
    const now = new Date().toISOString();

    const flag: FeatureFlag = existing
      ? { ...existing, ...updates, updatedAt: now }
      : {
          key,
          enabled: false,
          createdAt: now,
          updatedAt: now,
          ...updates,
        };

    this.flags.set(key, flag);
    return flag;
  }

  /** Get a flag by key */
  get(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /** Check if a flag is enabled for a given context */
  isEnabled(key: string, context?: FlagContext): boolean {
    const flag = this.flags.get(key);
    if (!flag || !flag.enabled) return false;

    // Check user allowlist
    if (flag.allowedUsers?.length && context?.userId) {
      return flag.allowedUsers.includes(context.userId);
    }

    // Check team allowlist
    if (flag.allowedTeams?.length && context?.teamId) {
      return flag.allowedTeams.includes(context.teamId);
    }

    // Check percentage rollout
    if (flag.rollout !== undefined && flag.rollout < 100) {
      // Deterministic hash-based rollout
      const hashInput = `${key}:${context?.userId ?? "anonymous"}`;
      let hash = 0;
      for (let i = 0; i < hashInput.length; i++) {
        hash = ((hash << 5) - hash + hashInput.charCodeAt(i)) | 0;
      }
      const normalizedHash = Math.abs(hash) % 100;
      return normalizedHash < flag.rollout;
    }

    return true;
  }

  /** List all flags */
  list(): FeatureFlag[] {
    return [...this.flags.values()];
  }

  /** List only enabled flags */
  listEnabled(): FeatureFlag[] {
    return this.list().filter((f) => f.enabled);
  }

  /** Delete a flag */
  delete(key: string): boolean {
    return this.flags.delete(key);
  }

  /** Get count stats */
  get stats() {
    const all = this.list();
    return {
      total: all.length,
      enabled: all.filter((f) => f.enabled).length,
      withRollout: all.filter((f) => f.rollout !== undefined).length,
    };
  }
}

/** Default feature flags for UI-as-Code */
export const DEFAULT_FLAGS: FeatureFlag[] = [
  { key: "ai-diff-generation", enabled: true, description: "AI-powered diff generation", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
  { key: "sandbox-preview", enabled: true, description: "Live sandbox preview of diffs", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-03-15T00:00:00Z" },
  { key: "team-workspaces", enabled: true, rollout: 80, description: "Team collaboration workspaces", createdAt: "2026-02-01T00:00:00Z", updatedAt: "2026-04-05T00:00:00Z" },
  { key: "advanced-editor", enabled: true, rollout: 50, description: "Advanced diff editor with syntax highlighting", createdAt: "2026-02-15T00:00:00Z", updatedAt: "2026-04-08T00:00:00Z" },
  { key: "dark-mode", enabled: true, description: "Dark mode theme", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" },
  { key: "export-pdf", enabled: false, description: "Export PRs as PDF", createdAt: "2026-03-20T00:00:00Z", updatedAt: "2026-03-20T00:00:00Z" },
  { key: "webhooks-v2", enabled: true, rollout: 30, description: "Enhanced webhook system", createdAt: "2026-04-01T00:00:00Z", updatedAt: "2026-04-09T00:00:00Z" },
  { key: "analytics-dashboard", enabled: true, description: "Usage analytics dashboard", createdAt: "2026-03-10T00:00:00Z", updatedAt: "2026-04-01T00:00:00Z" },
];

/** Global feature flag store instance */
export const featureFlags = new FeatureFlagStore(DEFAULT_FLAGS);

/** Quick check helper — uses global store */
export function isFeatureEnabled(key: string, context?: FlagContext): boolean {
  return featureFlags.isEnabled(key, context);
}
