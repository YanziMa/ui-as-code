/**
 * ACL (Access Control List): Fine-grained, resource-level access control
 * with owner-based permissions, group policies, deny rules (override allow),
 * attribute-based conditions, policy evaluation engine,
 * and hierarchical resource inheritance.
 */

// --- Types ---

export interface AclResource {
  /** Unique resource identifier */
  id: string;
  /** Resource type (e.g., "document", "folder", "project") */
  type: string;
  /** Parent resource ID for inheritance */
  parentId?: string | null;
  /** Owner user ID */
  ownerId: string;
  /** Resource metadata */
  metadata?: Record<string, unknown>;
}

export interface AclEntry {
  /** Unique entry ID */
  id: string;
  /** Target resource ID */
  resourceId: string;
  /** Subject type */
  subjectType: "user" | "group" | "role" | "public";
  /** Subject identifier (user ID, group name, role name) */
  subject: string;
  /** Permissions granted (empty = no explicit grant) */
  grants: string[];
  /** Permissions explicitly denied (takes precedence over grants) */
  denies: string[];
  /** Inherited from parent? */
  inherited?: boolean;
  /** Priority for conflict resolution (higher = evaluated first) */
  priority?: number;
  /** Conditions that must be met (attribute-based) */
  conditions?: AclCondition[];
  /** Time-based restrictions */
  timeRestrictions?: {
    from?: string; // ISO date or cron-like
    until?: string;
    allowedHours?: number[]; // e.g., [9, 10, ..., 17]
    allowedDays?: number[]; // 0=Sun, 6=Sat
  };
  /** Created at */
  createdAt: number;
  /** Created by */
  createdBy?: string;
  /** Expires at (null = never) */
  expiresAt?: number | null;
}

export interface AclCondition {
  /** Attribute name to check */
  attribute: string;
  /** Comparison operator */
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "contains" | "startsWith" | "endsWith" | "exists";
  /** Expected value */
  value: unknown;
}

export interface AclCheckContext {
  /** User ID performing the action */
  userId?: string;
  /** User's roles */
  roles?: string[];
  /** User's groups */
  groups?: string[];
  /** IP address */
  ip?: string;
  /** Current timestamp override (for testing) */
  now?: number;
  /** Custom attributes for condition evaluation */
  attributes?: Record<string, unknown>;
  /** Request method (for CRUD mapping) */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
}

export interface AclDecision {
  /** Is the action allowed? */
  allowed: boolean;
  /** The matching entry (if any) */
  matchedEntry: AclEntry | null;
  /** Reason for the decision */
  reason: string;
  /** Which entries were evaluated */
  evaluatedEntries: number;
  /** Was this decision based on inheritance? */
  isInherited: boolean;
}

export interface AclConfig {
  /** Default behavior when no rules match (default: "deny") */
  defaultPolicy?: "allow" | "deny";
  /** Enable deny-override mode (deny always wins)? (default: true) */
  denyOverride?: boolean;
  /** Enable inheritance from parent resources? (default: true) */
  enableInheritance?: boolean;
  /** Max inheritance depth (default: 10) */
  maxInheritanceDepth?: number;
  /** Auto-grant full access to resource owners? (default: true) */
  ownerFullAccess?: boolean;
  /** Cache check results? (default: true) */
  cacheEnabled?: boolean;
  /** Cache TTL in ms (default: 10000) */
  cacheTtlMs?: number;
}

// --- Internal Types ---

interface CacheEntry {
  decision: AclDecision;
  timestamp: number;
}

// --- Main ACL Engine ---

export class ACLEngine {
  private config: Required<AclConfig>;
  private resources = new Map<string, AclResource>();
  private entries = new Map<string, AclEntry[]>(); // resourceId -> entries
  private cache = new Map<string, CacheEntry>();
  private idCounter = 0;

  constructor(config: AclConfig = {}) {
    this.config = {
      defaultPolicy: config.defaultPolicy ?? "deny",
      denyOverride: config.denyOverride ?? true,
      enableInheritance: config.enableInheritance ?? true,
      maxInheritanceDepth: config.maxInheritanceDepth ?? 10,
      ownerFullAccess: config.ownerFullAccess ?? true,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTtlMs: config.cacheTtlMs ?? 10000,
    };
  }

  // --- Resource Management ---

  /** Register a resource in the ACL system */
  registerResource(resource: AclResource): void {
    this.resources.set(resource.id, resource);
    if (!this.entries.has(resource.id)) {
      this.entries.set(resource.id, []);
    }
    this.invalidateCache();
  }

  /** Unregister a resource */
  unregisterResource(resourceId: string): void {
    this.resources.delete(resourceId);
    this.entries.delete(resourceId);
    this.invalidateCache();
  }

  /** Get a resource */
  getResource(resourceId: string): AclResource | undefined {
    return this.resources.get(resourceId);
  }

  /** Get resource with full ancestry chain */
  getResourceChain(resourceId: string): AclResource[] {
    const chain: AclResource[] = [];
    let currentId: string | null | undefined = resourceId;
    let depth = 0;

    while (currentId && depth <= this.config.maxInheritanceDepth) {
      const resource = this.resources.get(currentId);
      if (!resource) break;

      chain.push(resource);
      currentId = resource.parentId;
      depth++;
    }

    return chain;
  }

  // --- ACL Entry Management ---

  /** Add an ACL rule */
  addEntry(entry: Omit<AclEntry, "id" | "createdAt">): AclEntry {
    const fullEntry: AclEntry = {
      ...entry,
      id: `acl_${Date.now()}_${++this.idCounter}`,
      createdAt: Date.now(),
    };

    let resourceEntries = this.entries.get(entry.resourceId);
    if (!resourceEntries) {
      resourceEntries = [];
      this.entries.set(entry.resourceId, resourceEntries);
    }

    resourceEntries.push(fullEntry);
    this.invalidateCache();
    return fullEntry;
  }

  /** Remove an ACL entry by ID */
  removeEntry(entryId: string): boolean {
    for (const [, entries] of this.entries) {
      const idx = entries.findIndex((e) => e.id === entryId);
      if (idx !== -1) {
        entries.splice(idx, 1);
        this.invalidateCache();
        return true;
      }
    }
    return false;
  }

  /** Remove all entries for a resource */
  clearEntries(resourceId: string): void {
    this.entries.set(resourceId, []);
    this.invalidateCache();
  }

  /** Update an existing entry */
  updateEntry(entryId: string, updates: Partial<Omit<AclEntry, "id" | "createdAt">>): AclEntry | null {
    const entry = this.findEntry(entryId);
    if (!entry) return null;

    Object.assign(entry, updates);
    this.invalidateCache();
    return entry;
  }

  /** Get all entries for a resource */
  getEntries(resourceId: string): AclEntry[] {
    return [...(this.entries.get(resourceId) ?? [])];
  }

  // --- Permission Checking ---

  /** Check if a subject can perform an action on a resource */
  can(
    resourceId: string,
    permission: string,
    context: AclCheckContext = {},
  ): AclDecision {
    // Check cache
    const cacheKey = `${resourceId}:${permission}:${context.userId ?? "_"}:${context.roles?.join(",") ?? ""}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
        return cached.decision;
      }
    }

    const decision = this.evaluate(resourceId, permission, context);

    // Cache result
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, { decision, timestamp: Date.now() });
    }

    return decision;
  }

  /** Quick boolean check */
  isAllowed(
    resourceId: string,
    permission: string,
    context?: AclCheckContext,
  ): boolean {
    return this.can(resourceId, permission, context).allowed;
  }

  /** Check multiple resources/permissions at once */
  batchCheck(
    checks: Array<{ resourceId: string; permission: string }>,
    context?: AclCheckContext,
  ): Map<string, AclDecision> {
    const results = new Map<string, AclDecision>();
    for (const { resourceId, permission } of checks) {
      results.set(`${resourceId}:${permission}`, this.can(resourceId, permission, context));
    }
    return results;
  }

  // --- Bulk Operations ---

  /** Grant permission(s) to a subject on a resource */
  grant(
    resourceId: string,
    subjectType: AclEntry["subjectType"],
    subject: string,
    permissions: string[],
    options?: Partial<Pick<AclEntry, "priority" | "conditions" | "expiresAt" | "createdBy">>,
  ): AclEntry {
    return this.addEntry({
      resourceId,
      subjectType,
      subject,
      grants: permissions,
      denies: [],
      priority: options?.priority,
      conditions: options?.conditions,
      expiresAt: options?.expiresAt,
      createdBy: options?.createdBy,
    });
  }

  /** Deny permission(s) to a subject on a resource */
  deny(
    resourceId: string,
    subjectType: AclEntry["subjectType"],
    subject: string,
    permissions: string[],
    options?: Partial<Pick<AclEntry, "priority" | "conditions" | "expiresAt" | "createdBy">>,
  ): AclEntry {
    return this.addEntry({
      resourceId,
      subjectType,
      subject,
      grants: [],
      denies: permissions,
      priority: options?.priority ?? 1000, // Denies get higher priority by default
      conditions: options?.conditions,
      expiresAt: options?.expiresAt,
      createdBy: options?.createdBy,
    });
  }

  /** Set owner of a resource and optionally grant full access */
  setOwner(resourceId: string, userId: string): void {
    const resource = this.resources.get(resourceId);
    if (resource) {
      resource.ownerId = userId;
    }
    this.invalidateCache();
  }

  // --- Convenience ---

  /** Grant public read access */
  allowPublicRead(resourceId: string): AclEntry {
    return this.grant(resourceId, "public", "", ["read", "view"]);
  }

  /** Grant group access */
  allowGroup(
    resourceId: string,
    groupName: string,
    permissions: string[],
  ): AclEntry {
    return this.grant(resourceId, "group", groupName, permissions);
  }

  /** Grant role-based access */
  allowRole(
    resourceId: string,
    roleName: string,
    permissions: string[],
  ): AclEntry {
    return this.grant(resourceId, "role", roleName, permissions);
  }

  // --- Query ---

  /** Find all resources a user has a specific permission on */
  findAccessibleResources(
    userId: string,
    permission: string,
    resourceType?: string,
  ): AclResource[] {
    const accessible: AclResource[] = [];

    for (const [id, resource] of this.resources) {
      if (resourceType && resource.type !== resourceType) continue;

      const decision = this.can(id, permission, { userId });
      if (decision.allowed) {
        accessible.push(resource);
      }
    }

    return accessible;
  }

  /** List all resources owned by a user */
  getResourcesOwnedBy(userId: string): AclResource[] {
    return Array.from(this.resources.values()).filter((r) => r.ownerId === userId);
  }

  // --- Export / Import ---

  exportState(): { resources: AclResource[]; entries: AclEntry[] } {
    const allEntries: AclEntry[] = [];
    for (const [, entries] of this.entries) {
      allEntries.push(...entries);
    }
    return {
      resources: Array.from(this.resources.values()),
      entries: allEntries,
    };
  }

  importState(state: { resources: AclResource[]; entries: AclEntry[] }): void {
    for (const resource of state.resources) {
      this.registerResource(resource);
    }
    for (const entry of state.entries) {
      const { id, createdAt, ...rest } = entry;
      this.addEntry({ ...rest, createdAt: createdAt ?? Date.now() });
    }
  }

  /** Clear everything */
  clear(): void {
    this.resources.clear();
    this.entries.clear();
    this.cache.clear();
  }

  // --- Private ---

  private evaluate(
    resourceId: string,
    permission: string,
    context: AclCheckContext,
    depth = 0,
  ): AclDecision {
    const now = context.now ?? Date.now();
    let evaluatedCount = 0;

    // Owner check
    if (this.config.ownerFullAccess && context.userId) {
      const resource = this.resources.get(resourceId);
      if (resource && resource.ownerId === context.userId) {
        return {
          allowed: true,
          matchedEntry: null,
          reason: "Resource owner",
          evaluatedEntries: 0,
          isInherited: false,
        };
      }
    }

    // Gather applicable entries (this resource + inherited)
    const applicableEntries = this.gatherEntries(resourceId, depth);

    // Sort by priority (highest first), then denies before allows
    const sortedEntries = [...applicableEntries].sort((a, b) => {
      // Deny entries sort first if denyOverride is on
      if (this.config.denyOverride) {
        const aDenies = a.denies.length > 0 ? 1 : 0;
        const bDenies = b.denies.length > 0 ? 1 : 0;
        if (aDenies !== bDenies) return bDenies - aDenies;
      }
      return (b.priority ?? 0) - (a.priority ?? 0);
    });

    // Evaluate each entry
    for (const entry of sortedEntries) {
      evaluatedCount++;

      // Skip expired entries
      if (entry.expiresAt && now > entry.expiresAt) continue;

      // Check subject match
      if (!this.subjectMatches(entry, context)) continue;

      // Check conditions
      if (entry.conditions && !this.evaluateConditions(entry.conditions, context)) continue;

      // Check time restrictions
      if (entry.timeRestrictions && !this.checkTimeRestrictions(entry.timeRestrictions, now)) continue;

      // Check deny first
      if (entry.denies.length > 0) {
        for (const denyPerm of entry.denies) {
          if (this.matchPermission(denyPerm, permission)) {
            return {
              allowed: false,
              matchedEntry: entry,
              reason: `Explicitly denied by entry ${entry.id}`,
              evaluatedEntries: evaluatedCount,
              isInherited: entry.inherited ?? false,
            };
          }
        }
      }

      // Check grant
      if (entry.grants.length > 0) {
        for (const grantPerm of entry.grants) {
          if (this.matchPermission(grantPerm, permission)) {
            return {
              allowed: true,
              matchedEntry: entry,
              reason: `Granted by entry ${entry.id}`,
              evaluatedEntries: evaluatedCount,
              isInherited: entry.inherited ?? false,
            };
          }
        }
      }
    }

    // No matching entry found — apply default policy
    return {
      allowed: this.config.defaultPolicy === "allow",
      matchedEntry: null,
      reason: `No matching rule (default: ${this.config.defaultPolicy})`,
      evaluatedEntries: evaluatedCount,
      isInherited: false,
    };
  }

  private gatherEntries(resourceId: string, depth: number): AclEntry[] {
    const allEntries: AclEntry[] = [];

    // Direct entries
    const directEntries = this.entries.get(resourceId) ?? [];
    allEntries.push(...directEntries.map((e) => ({ ...e, inherited: false })));

    // Inherited entries
    if (this.config.enableInheritance && depth < this.config.maxInheritanceDepth) {
      const resource = this.resources.get(resourceId);
      if (resource?.parentId) {
        const parentEntries = this.gatherEntries(resource.parentId, depth + 1);
        allEntries.push(...parentEntries.map((e) => ({ ...e, inherited: true })));
      }
    }

    return allEntries;
  }

  private subjectMatches(entry: AclEntry, context: AclCheckContext): boolean {
    switch (entry.subjectType) {
      case "public":
        return true;

      case "user":
        return entry.subject === context.userId;

      case "group":
        return context.groups?.includes(entry.subject) ?? false;

      case "role":
        return context.roles?.includes(entry.subject) ?? false;

      default:
        return false;
    }
  }

  private evaluateConditions(conditions: AclCondition[], context: AclCheckContext): boolean {
    const attrs = context.attributes ?? {};

    for (const cond of conditions) {
      const actualValue = attrs[cond.attribute];

      switch (cond.operator) {
        case "eq":   if (actualValue !== cond.value) return false; break;
        case "neq":  if (actualValue === cond.value) return false; break;
        case "gt":   if (!(typeof actualValue === "number" && typeof cond.value === "number" && actualValue > cond.value)) return false; break;
        case "gte":  if (!(typeof actualValue === "number" && typeof cond.value === "number" && actualValue >= cond.value)) return false; break;
        case "lt":   if (!(typeof actualValue === "number" && typeof cond.value === "number" && actualValue < cond.value)) return false; break;
        case "lte":  if (!(typeof actualValue === "number" && typeof cond.value === "number" && actualValue <= cond.value)) return false; break;
        case "in":   if (!Array.isArray(cond.value) || !cond.value.includes(actualValue)) return false; break;
        case "nin":  if (Array.isArray(cond.value) && cond.value.includes(actualValue)) return false; break;
        case "contains":
          if (Array.isArray(actualValue)) { if (!actualValue.includes(cond.value as string)) return false; }
          else if (typeof actualValue === "string") { if (!actualValue.includes(String(cond.value))) return false; }
          else return false;
          break;
        case "startsWith":
          if (typeof actualValue !== "string" || !actualValue.startsWith(String(cond.value))) return false;
          break;
        case "endsWith":
          if (typeof actualValue !== "string" || !actualValue.endsWith(String(cond.value))) return false;
          break;
        case "exists":
          if (cond.value === true && actualValue === undefined) return false;
          if (cond.value === false && actualValue !== undefined) return false;
          break;
      }
    }

    return true;
  }

  private checkTimeRestrictions(restrictions: NonNullable<AclEntry["timeRestrictions"]>, now: number): boolean {
    const date = new Date(now);
    const hours = date.getHours();
    const day = date.getDay();

    if (restrictions.allowedHours && !restrictions.allowedHours.includes(hours)) return false;
    if (restrictions.allowedDays && !restrictions.allowedDays.includes(day)) return false;

    // Basic from/until check
    if (restrictions.from) {
      const from = new Date(restrictions.from).getTime();
      if (now < from) return false;
    }
    if (restrictions.until) {
      const until = new Date(restrictions.until).getTime();
      if (now > until) return false;
    }

    return true;
  }

  private matchPermission(pattern: string, permission: string): boolean {
    if (pattern === "*") return true;
    if (pattern === permission) return true;

    const patternParts = pattern.split(":");
    const permParts = permission.split(":");

    if (patternParts.length !== permParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== "*" && patternParts[i] !== permParts[i]) {
        return false;
      }
    }

    return true;
  }

  private findEntry(entryId: string): AclEntry | null {
    for (const [, entries] of this.entries) {
      const entry = entries.find((e) => e.id === entryId);
      if (entry) return entry;
    }
    return null;
  }

  private invalidateCache(): void {
    this.cache.clear();
  }
}

/** Create a pre-configured ACL engine */
export function createACL(config?: AclConfig): ACLEngine {
  return new ACLEngine(config);
}
