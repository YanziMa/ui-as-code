/**
 * RBAC (Role-Based Access Control): Comprehensive role and permission
 * management system with hierarchical roles, dynamic assignments,
 * permission inheritance, wildcard matching, role composition,
 * session-scoped permissions, and audit logging.
 */

// --- Types ---

export interface RoleDefinition {
  /** Unique role identifier */
  name: string;
  /** Display name */
  displayName?: string;
  /** Description */
  description?: string;
  /** Parent role(s) for inheritance */
  parents?: string[];
  /** Direct permissions assigned to this role */
  permissions?: string[];
  /** Is this a system role (cannot be deleted)? */
  isSystem?: boolean;
  /** Priority for conflict resolution (higher = more important) */
  priority?: number;
  /** Metadata tags */
  tags?: string[];
}

export interface RoleAssignment {
  userId: string;
  roleName: string;
  /** Assignment source (manual, inherited, group, etc.) */
  source?: "manual" | "inherited" | "group" | "api" | "sso";
  /** Scope restriction (e.g., org ID, project ID) */
  scope?: string;
  /** Granted at timestamp */
  grantedAt?: number;
  /** Expires at timestamp (null = never) */
  expiresAt?: number | null;
  /** Granted by user ID */
  grantedBy?: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  roleName: string;
  matchedPermission: string | null;
  reason: string;
  inheritedFrom?: string[];
}

export interface RbacConfig {
  /** Enable strict mode (deny by default)? */
  strictMode?: boolean;
  /** Enable audit logging? */
  auditEnabled?: boolean;
  /** Custom permission separator (default: ":") */
  separator?: string;
  /** Enable caching of check results? */
  cacheEnabled?: boolean;
  /** Cache TTL in ms (default: 5000) */
  cacheTtlMs?: number;
  /** Max depth for role hierarchy traversal */
  maxInheritanceDepth?: number;
}

export interface AuditEntry {
  timestamp: number;
  userId: string;
  action: "check" | "grant" | "revoke" | "assign" | "unassign";
  resource: string;
  permission?: string;
  result?: boolean;
  details?: string;
}

// --- Internal Types ---

interface CacheEntry {
  result: boolean;
  timestamp: number;
}

// --- Main RBAC Engine ---

export class RBACEngine {
  private config: Required<RbacConfig>;
  private roles = new Map<string, RoleDefinition>();
  private assignments = new Map<string, Set<RoleAssignment>>(); // userId -> assignments
  private cache = new Map<string, CacheEntry>();
  private auditLog: AuditEntry[] = [];
  private maxAuditEntries = 1000;

  constructor(config: RbacConfig = {}) {
    this.config = {
      strictMode: config.strictMode ?? false,
      auditEnabled: config.auditEnabled ?? false,
      separator: config.separator ?? ":",
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTtlMs: config.cacheTtlMs ?? 5000,
      maxInheritanceDepth: config.maxInheritanceDepth ?? 10,
    };
  }

  // --- Role Management ---

  /** Define or update a role */
  defineRole(role: RoleDefinition): this {
    const existing = this.roles.get(role.name);
    if (existing && existing.isSystem) {
      throw new Error(`Cannot modify system role: ${role.name}`);
    }

    this.roles.set(role.name, {
      ...existing,
      ...role,
      isSystem: existing?.isSystem ?? role.isSystem ?? false,
    });

    // Invalidate cache when roles change
    this.invalidateCache();

    return this;
  }

  /** Define multiple roles at once */
  defineRoles(roles: RoleDefinition[]): this {
    for (const role of roles) {
      this.defineRole(role);
    }
    return this;
  }

  /** Remove a role definition */
  removeRole(name: string): this {
    const role = this.roles.get(name);
    if (!role) return this;

    if (role.isSystem) {
      throw new Error(`Cannot remove system role: ${name}`);
    }

    this.roles.delete(name);

    // Remove all assignments for this role
    for (const [, assigns] of this.assignments) {
      for (const a of assigns) {
        if (a.roleName === name) assigns.delete(a);
      }
    }

    this.invalidateCache();
    return this;
  }

  /** Get a role definition */
  getRole(name: string): RoleDefinition | undefined {
    return this.roles.get(name);
  }

  /** List all defined roles */
  listRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  /** Check if a role exists */
  hasRole(name: string): boolean {
    return this.roles.has(name);
  }

  // --- Permission Management ---

  /** Grant a permission to a role */
  grantPermission(roleName: string, permission: string): this {
    const role = this.roles.get(roleName);
    if (!role) throw new Error(`Unknown role: ${roleName}`);

    if (!role.permissions) role.permissions = [];
    if (!role.permissions.includes(permission)) {
      role.permissions.push(permission);
    }

    this.invalidateCache();
    this.audit({ action: "grant", resource: roleName, permission });

    return this;
  }

  /** Revoke a permission from a role */
  revokePermission(roleName: string, permission: string): this {
    const role = this.roles.get(roleName);
    if (!role) return this;

    if (role.permissions) {
      role.permissions = role.permissions.filter((p) => p !== permission);
    }

    this.invalidateCache();
    this.audit({ action: "revoke", resource: roleName, permission });

    return this;
  }

  /** Grant multiple permissions to a role */
  grantPermissions(roleName: string, permissions: string[]): this {
    for (const perm of permissions) {
      this.grantPermission(roleName, perm);
    }
    return this;
  }

  // --- Assignment Management ---

  /** Assign a role to a user */
  assign(userId: string, roleName: string, options?: Omit<RoleAssignment, "userId" | "roleName">): this {
    if (!this.roles.has(roleName)) {
      throw new Error(`Unknown role: ${roleName}`);
    }

    let userAssignments = this.assignments.get(userId);
    if (!userAssignments) {
      userAssignments = new Set();
      this.assignments.set(userId, userAssignments);
    }

    // Remove existing assignment for same role+scope
    for (const existing of userAssignments) {
      if (existing.roleName === roleName && existing.scope === options?.scope) {
        userAssignments.delete(existing);
      }
    }

    userAssignments.add({
      userId,
      roleName,
      source: options?.source ?? "manual",
      scope: options?.scope,
      grantedAt: options?.grantedAt ?? Date.now(),
      expiresAt: options?.expiresAt ?? null,
      grantedBy: options?.grantedBy,
    });

    this.invalidateCache();
    this.audit({ action: "assign", resource: userId, details: roleName });

    return this;
  }

  /** Unassign a role from a user */
  unassign(userId: string, roleName: string, scope?: string): this {
    const userAssignments = this.assignments.get(userId);
    if (!userAssignments) return this;

    for (const a of userAssignments) {
      if (a.roleName === roleName && (scope === undefined || a.scope === scope)) {
        userAssignments.delete(a);
      }
    }

    if (userAssignments.size === 0) {
      this.assignments.delete(userId);
    }

    this.invalidateCache();
    this.audit({ action: "unassign", resource: userId, details: roleName });

    return this;
  }

  /** Get all roles assigned to a user */
  getUserRoles(userId: string): RoleAssignment[] {
    const userAssignments = this.assignments.get(userId);
    if (!userAssignments) return [];

    const now = Date.now();
    return [...userAssignments].filter((a) => {
      if (a.expiresAt && now > a.expiresAt) return false;
      return true;
    });
  }

  /** Get all users with a specific role */
  getUsersWithRole(roleName: string): string[] {
    const users: string[] = [];
    const now = Date.now();

    for (const [userId, assigns] of this.assignments) {
      for (const a of assigns) {
        if (a.roleName === roleName && (!a.expiresAt || now <= a.expiresAt)) {
          users.push(userId);
          break;
        }
      }
    }

    return users;
  }

  // --- Permission Checking ---

  /** Check if a user has a specific permission */
  can(userId: string, permission: string): boolean {
    return this.check(userId, permission).allowed;
  }

  /** Detailed permission check with reasoning */
  check(userId: string, permission: string): PermissionCheckResult {
    // Audit
    this.audit({ action: "check", resource: userId, permission });

    // Check cache
    const cacheKey = `${userId}:${permission}`;
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
        return {
          allowed: cached.result,
          roleName: "",
          matchedPermission: null,
          reason: "cached",
        };
      }
    }

    // Get user's effective roles (including inherited)
    const effectiveRoles = this.getEffectiveRoles(userId);

    // Check each role's permissions
    for (const { roleName, inheritedFrom } of effectiveRoles) {
      const role = this.roles.get(roleName);
      if (!role || !role.permissions) continue;

      for (const rp of role.permissions) {
        if (this.matchPermission(rp, permission)) {
          const result: PermissionCheckResult = {
            allowed: true,
            roleName,
            matchedPermission: rp,
            reason: inheritedFrom.length > 0
              ? `Inherited from: ${inheritedFrom.join(" → ")}`
              : "Directly granted",
            inheritedFrom: inheritedFrom.length > 0 ? inheritedFrom : undefined,
          };

          this.setCache(cacheKey, true);
          return result;
        }
      }
    }

    const result: PermissionCheckResult = {
      allowed: !this.config.strictMode,
      roleName: "",
      matchedPermission: null,
      reason: this.config.strictMode ? "No matching permission found" : "Allowed by default (non-strict)",
    };

    this.setCache(cacheKey, result.allowed);
    return result;
  }

  /** Check multiple permissions at once (AND logic) */
  canAll(userId: string, permissions: string[]): boolean {
    return permissions.every((p) => this.can(userId, p));
  }

  /** Check if user has any of the given permissions (OR logic) */
  canAny(userId: string, permissions: string[]): boolean {
    return permissions.some((p) => this.can(userId, p));
  }

  /** Filter a list of permissions to only those the user has */
  filterPermissions(userId: string, permissions: string[]): string[] {
    return permissions.filter((p) => this.can(userId, p));
  }

  /** Get all permissions a user effectively has */
  getEffectivePermissions(userId: string): string[] {
    const perms = new Set<string>();
    const effectiveRoles = this.getEffectiveRoles(userId);

    for (const { roleName } of effectiveRoles) {
      const role = this.roles.get(roleName);
      if (role?.permissions) {
        for (const p of role.permissions) {
          perms.add(p);
        }
      }
    }

    return [...perms];
  }

  // --- Hierarchy ---

  /** Get all ancestors of a role (following parent chain) */
  getAncestors(roleName: string, depth = 0): string[] {
    if (depth > this.config.maxInheritanceDepth) return [];

    const role = this.roles.get(roleName);
    if (!role?.parents?.length) return [];

    const ancestors: string[] = [];
    for (const parent of role.parents) {
      ancestors.push(parent);
      ancestors.push(...this.getAncestors(parent, depth + 1));
    }

    return ancestors;
  }

  /** Get all descendants of a role */
  getDescendants(roleName: string): string[] {
    const descendants: string[] = [];
    for (const [, role] of this.roles) {
      if (role.parents?.includes(roleName)) {
        descendants.push(role.name);
        descendants.push(...this.getDescendants(role.name));
      }
    }
    return descendants;
  }

  /** Build the full role hierarchy tree */
  getHierarchy(): Record<string, string[]> {
    const tree: Record<string, string[]> = {};
    for (const [name, role] of this.roles) {
      tree[name] = role.parents ?? [];
    }
    return tree;
  }

  // --- Utility ---

  /** Create a permission guard function for React/components */
  createGuard(userId: string) {
    return {
      can: (permission: string) => this.can(userId, permission),
      canAll: (permissions: string[]) => this.canAll(userId, permissions),
      canAny: (permissions: string[]) => this.canAny(userId, permissions),
      filter: (permissions: string[]) => this.filterPermissions(userId, permissions),
    };
  }

  /** Export current state as JSON */
  exportState(): {
    roles: RoleDefinition[];
    assignments: Array<{ userId: string; assignments: RoleAssignment[] }>;
  } {
    const assignments = Array.from(this.assignments.entries()).map(([userId, assigns]) => ({
      userId,
      assignments: [...assigns],
    }));

    return {
      roles: this.listRoles(),
      assignments,
    };
  }

  /** Import state from JSON */
  importState(state: { roles: RoleDefinition[]; assignments: Array<{ userId: string; assignments: RoleAssignment[] }> }): void {
    for (const role of state.roles) {
      this.defineRole(role);
    }
    for (const { userId, assignments } of state.assignments) {
      for (const a of assignments) {
        this.assign(userId, a.roleName, a);
      }
    }
  }

  /** Clear all data */
  clear(): void {
    this.roles.clear();
    this.assignments.clear();
    this.cache.clear();
    this.auditLog = [];
  }

  /** Get audit log */
  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  /** Clear audit log */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  // --- Private ---

  private getEffectiveRoles(userId: string): Array<{ roleName: string; inheritedFrom: string[] }> {
    const assignments = this.getUserRoles(userId);
    const visited = new Set<string>();
    const result: Array<{ roleName: string; inheritedFrom: string[] }> = [];

    const traverse = (roleName: string, path: string[]) => {
      if (visited.has(roleName)) return; // Prevent cycles
      visited.add(roleName);

      result.push({ roleName, inheritedFrom: [...path] });

      const role = this.roles.get(roleName);
      if (role?.parents) {
        for (const parent of role.parents) {
          traverse(parent, [...path, roleName]);
        }
      }
    };

    for (const a of assignments) {
      traverse(a.roleName, []);
    }

    // Sort by priority (highest first)
    result.sort((a, b) => {
      const prioA = this.roles.get(a.roleName)?.priority ?? 0;
      const prioB = this.roles.get(b.roleName)?.priority ?? 0;
      return prioB - prioA;
    });

    return result;
  }

  private matchPermission(pattern: string, permission: string): boolean {
    if (pattern === "*") return true;
    if (pattern === permission) return true;

    // Wildcard matching: "resource:*" matches "resource:action"
    // "resource:sub:*" matches "resource:sub:action"
    const patternParts = pattern.split(this.config.separator);
    const permParts = permission.split(this.config.separator);

    if (patternParts.length !== permParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== "*" && patternParts[i] !== permParts[i]) {
        return false;
      }
    }

    return true;
  }

  private setCache(key: string, value: boolean): void {
    if (!this.config.cacheEnabled) return;
    this.cache.set(key, { result: value, timestamp: Date.now() });
  }

  private invalidateCache(): void {
    this.cache.clear();
  }

  private audit(entry: Omit<AuditEntry, "timestamp">): void {
    if (!this.config.auditEnabled) return;

    this.auditLog.push({ ...entry, timestamp: Date.now() });
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog.shift();
    }
  }
}

// --- Pre-built Roles ---

export const BUILT_IN_ROLES: RoleDefinition[] = [
  {
    name: "superadmin",
    displayName: "Super Admin",
    description: "Full system access",
    permissions: ["*"],
    isSystem: true,
    priority: 1000,
  },
  {
    name: "admin",
    displayName: "Administrator",
    description: "Administrative access",
    parents: ["superadmin"],
    permissions: [
      "users:*", "roles:*", "settings:*", "audit:*",
      "content:*", "reports:*", "analytics:*",
    ],
    isSystem: true,
    priority: 900,
  },
  {
    name: "moderator",
    displayName: "Moderator",
    description: "Content moderation",
    parents: ["admin"],
    permissions: [
      "content:review", "content:edit", "content:delete",
      "content:flag", "reports:view", "comments:manage",
      "users:warn", "users:suspend",
    ],
    isSystem: true,
    priority: 700,
  },
  {
    name: "editor",
    displayName: "Editor",
    description: "Content editing",
    permissions: [
      "content:create", "content:edit", "content:publish",
      "media:*", "drafts:*",
    ],
    isSystem: true,
    priority: 500,
  },
  {
    name: "user",
    displayName: "User",
    description: "Standard user access",
    permissions: [
      "profile:*", "content:view", "content:comment",
      "bookmarks:*", "notifications:*",
    ],
    isSystem: true,
    priority: 300,
  },
  {
    name: "viewer",
    displayName: "Viewer",
    description: "Read-only access",
    parents: ["user"],
    permissions: ["content:view", "profile:view"],
    isSystem: true,
    priority: 100,
  },
  {
    name: "guest",
    displayName: "Guest",
    description: "Limited public access",
    permissions: ["content:view", "landing:*"],
    isSystem: true,
    priority: 50,
  },
];

/** Create an RBAC engine pre-loaded with built-in roles */
export function createRBAC(config?: RbacConfig): RBACEngine {
  const engine = new RBACEngine(config);
  engine.defineRoles(BUILT_IN_ROLES);
  return engine;
}
