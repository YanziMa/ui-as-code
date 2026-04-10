/**
 * Role-Based Access Control (RBAC): Permission system with roles,
 * hierarchical role inheritance, resource-level permissions, attribute-based
 * policy evaluation, permission caching, and audit logging.
 */

// --- Types ---

export type Permission = string; // e.g., "users:read", "posts:write", "admin:*"
export type RoleName = string;

export interface Role {
  name: RoleName;
  displayName?: string;
  description?: string;
  /** Permissions this role grants */
  permissions: Permission[];
  /** Roles this role inherits from */
  inheritsFrom?: RoleName[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface User {
  id: string;
  roles: RoleName[];
  /** Direct permissions assigned to user (beyond role permissions) */
  permissions?: Permission[];
  /** Attributes for ABAC policies (e.g., { department: "engineering", level: 5 }) */
  attributes?: Record<string, unknown>;
}

export interface Policy {
  id: string;
  name: string;
  effect: "allow" | "deny";
  /** Resource pattern (e.g., "posts:*", "reports:123") */
  resource: string;
  /** Required permissions */
  permissions: Permission[];
  /** Attribute conditions (ABAC) */
  conditions?: Array<{
    attribute: string;
    operator: "eq" | "neq" | "in" | "contains" | "gt" | "lt" | "gte" | "lte" | "exists";
    value: unknown;
  }>;
  /** Priority (higher = evaluated first) */
  priority?: number;
}

export interface CheckResult {
  allowed: boolean;
  /** Which policy/role granted or denied access */
  reason?: string;
  /** Matching policy ID (if any) */
  policyId?: string;
}

export interface AuditEntry {
  timestamp: number;
  userId: string;
  permission: Permission;
  resource?: string;
  allowed: boolean;
  reason?: string;
}

// --- RBAC Engine ---

/**
 * Role-Based Access Control engine with:
 * - Role hierarchy (inheritance)
 * - Direct + role-based permissions
 * - Wildcard permission matching
 * - Attribute-based conditions (ABAC)
 * - Policy evaluation (allow/deny with priority)
 * - Audit trail
 *
 * @example
 * const rbac = new RBAC();
 * rbac.defineRole("admin", { permissions: ["*"], inheritsFrom: ["editor"] });
 * rbac.defineRole("editor", { permissions: ["posts:write", "posts:delete"] });
 * rbac.defineRole("viewer", { permissions: ["posts:read"] });
 *
 * const user = { id: "u1", roles: ["admin"] };
 * rbac.check(user, "posts:write"); // → true
 */
export class RBAC {
  private roles = new Map<RoleName, Role>();
  private policies = new Map<string, Policy>();
  private auditLog: AuditEntry[] = [];
  private maxAuditLog = 1000;
  private permissionCache = new Map<string, Set<Permission>>();
  private cacheDirty = true;

  /** Define or update a role */
  defineRole(name: RoleName, definition: Omit<Role, "name">): Role {
    const role: Role = { name, ...definition };
    this.roles.set(name, role);
    this.cacheDirty = true;
    return role;
  }

  /** Remove a role */
  removeRole(name: RoleName): boolean {
    const deleted = this.roles.delete(name);
    if (deleted) this.cacheDirty = true;
    return deleted;
  }

  /** Get a role by name */
  getRole(name: RoleName): Role | undefined {
    return this.roles.get(name);
  }

  /** List all defined roles */
  listRoles(): Role[] {
    return [...this.roles.values()];
  }

  /** Add a policy rule */
  addPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
  }

  /** Remove a policy */
  removePolicy(id: string): boolean {
    return this.policies.delete(id);
  }

  /** List all policies */
  listPolicies(): Policy[] {
    return [...this.policies.values()].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Check if a user has a specific permission.
   * Evaluates: direct permissions → role permissions (with inheritance) → policies
   */
  check(user: User, permission: Permission, resource?: string): CheckResult {
    // 1. Check direct user permissions
    if (user.permissions && this.matchPermission(permission, user.permissions)) {
      const result: CheckResult = { allowed: true, reason: "direct_permission" };
      this.logAudit(user.id, permission, resource, result.allowed, result.reason);
      return result;
    }

    // 2. Check role-based permissions
    const effectivePerms = this.getEffectivePermissions(user.roles);
    if (this.matchPermission(permission, effectivePerms)) {
      const result: CheckResult = { allowed: true, reason: "role_permission" };
      this.logAudit(user.id, permission, resource, result.allowed, result.reason);
      return result;
    }

    // 3. Evaluate policies
    for (const policy of this.listPolicies()) {
      if (this.policyMatches(policy, user, permission, resource)) {
        const allowed = policy.effect === "allow";
        const result: CheckResult = {
          allowed,
          reason: `policy:${policy.name}`,
          policyId: policy.id,
        };
        this.logAudit(user.id, permission, resource, result.allowed, result.reason);
        return result;
      }
    }

    // Default deny
    const result: CheckResult = { allowed: false, reason: "no_matching_policy" };
    this.logAudit(user.id, permission, resource, result.allowed, result.reason);
    return result;
  }

  /**
   * Check multiple permissions at once.
   * Returns true only if ALL permissions are granted.
   */
  checkAll(user: User, permissions: Permission[], resource?: string): CheckResult {
    for (const perm of permissions) {
      const result = this.check(user, perm, resource);
      if (!result.allowed) return result;
    }
    return { allowed: true, reason: "all_permissions_granted" };
  }

  /**
   * Check if ANY of the given permissions is granted.
   */
  checkAny(user: User, permissions: Permission[], resource?: string): CheckResult {
    for (const perm of permissions) {
      const result = this.check(user, perm, resource);
      if (result.allowed) return result;
    }
    return { allowed: false, reason: "no_permissions_matched" };
  }

  /** Get all effective permissions for a set of roles (resolved with inheritance) */
  getEffectivePermissions(roles: RoleName[]): Set<Permission> {
    const cacheKey = roles.sort().join(",");
    if (!this.cacheDirty && this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    const perms = new Set<Permission>();
    const visited = new Set<RoleName>();

    for (const roleName of roles) {
      this.collectPermissions(roleName, perms, visited);
    }

    this.permissionCache.set(cacheKey, perms);
    this.cacheDirty = false;

    return perms;
  }

  /** Get the audit log */
  getAuditLog(limit?: number): AuditEntry[] {
    return limit ? this.auditLog.slice(-limit) : [...this.auditLog];
  }

  /** Clear the audit log */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /** Export current state (roles + policies) */
  exportState(): { roles: Role[]; policies: Policy[] } {
    return {
      roles: this.listRoles(),
      policies: this.listPolicies(),
    };
  }

  /** Import state (merge roles and policies) */
  importState(state: { roles?: Role[]; policies?: Policy[] }): void {
    if (state.roles) {
      for (const role of state.roles) this.defineRole(role.name, role);
    }
    if (state.policies) {
      for (const policy of state.policies) this.addPolicy(policy);
    }
  }

  // --- Private ---

  private collectPermissions(roleName: RoleName, perms: Set<Permission>, visited: Set<RoleName>): void {
    if (visited.has(roleName)) return;
    visited.add(roleName);

    const role = this.roles.get(roleName);
    if (!role) return;

    for (const perm of role.permissions) {
      perms.add(perm);
    }

    if (role.inheritsFrom) {
      for (const parent of role.inheritsFrom) {
        this.collectPermissions(parent, perms, visited);
      }
    }
  }

  private matchPermission(needle: Permission, haystack: Permission[] | Set<Permission>): boolean {
    for (const perm of haystack) {
      if (this.wildcardMatch(needle, perm) || this.wildcardMatch(perm, needle)) {
        return true;
      }
    }
    return false;
  }

  private wildcardMatch(pattern: Permission, value: Permission): boolean {
    // Exact match
    if (pattern === value) return true;
    // Super wildcard
    if (pattern === "*") return true;
    // Partial wildcard: "resource:*" matches "resource:read"
    if (pattern.endsWith(":*")) {
      const prefix = pattern.slice(0, -1); // "resource:"
      return value.startsWith(prefix);
    }
    // Prefix wildcard: "resource:" matches "resource:read" and "resource:write"
    if (pattern.endsWith(":")) {
      return value.startsWith(pattern);
    }
    return false;
  }

  private policyMatches(policy: Policy, user: User, permission: Permission, resource?: string): boolean {
    // Check resource match
    if (policy.resource !== "*" && resource && !this.wildcardMatch(policy.resource, resource)) {
      return false;
    }

    // Check permissions
    if (!this.matchPermission(permission, policy.permissions)) {
      return false;
    }

    // Check attribute conditions (ABAC)
    if (policy.conditions) {
      for (const condition of policy.conditions) {
        if (!this.evaluateCondition(condition, user.attributes ?? {})) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateCondition(
    condition: Policy["conditions"][0],
    attributes: Record<string, unknown>,
  ): boolean {
    const attrValue = attributes[condition.attribute];

    switch (condition.operator) {
      case "eq": return attrValue === condition.value;
      case "neq": return attrValue !== condition.value;
      case "in": return Array.isArray(condition.value) && condition.value.includes(attrValue);
      case "contains":
        return Array.isArray(attrValue) ? attrValue.includes(condition.value)
          : typeof attrValue === "string" && attrValue.includes(String(condition.value));
      case "gt": return Number(attrValue) > Number(condition.value);
      case "lt": return Number(attrValue) < Number(condition.value);
      case "gte": return Number(attrValue) >= Number(condition.value);
      case "lte": return Number(attrValue) <= Number(condition.value);
      case "exists": return attrValue !== undefined && attrValue !== null;
      default: return false;
    }
  }

  private logAudit(userId: string, permission: Permission, resource: string | undefined, allowed: boolean, reason?: string): void {
    this.auditLog.push({
      timestamp: Date.now(),
      userId,
      permission,
      resource,
      allowed,
      reason,
    });

    if (this.auditLog.length > this.maxAuditLog) {
      this.auditLog.shift();
    }
  }
}

// --- Predefined Roles ---

/** Common role definitions for SaaS applications */
export const COMMON_ROLES: Role[] = [
  {
    name: "super_admin",
    displayName: "Super Admin",
    description: "Full system access",
    permissions: ["*"],
  },
  {
    name: "admin",
    displayName: "Administrator",
    description: "Administrative access",
    permissions: [
      "users:read", "users:write", "users:delete",
      "settings:read", "settings:write",
      "reports:*",
      "audit:read",
    ],
    inheritsFrom: ["moderator"],
  },
  {
    name: "moderator",
    displayName: "Moderator",
    description: "Content moderation access",
    permissions: [
      "posts:read", "posts:write", "posts:delete",
      "comments:read", "comments:write", "comments:delete",
      "users:read",
    ],
    inheritsFrom: ["editor"],
  },
  {
    name: "editor",
    displayName: "Editor",
    description: "Can create and edit content",
    permissions: [
      "posts:read", "posts:write",
      "comments:read", "comments:write",
      "media:upload",
    ],
  },
  {
    name: "viewer",
    displayName: "Viewer",
    description: "Read-only access",
    permissions: ["posts:read", "comments:read"],
  },
];

/** Create an RBAC instance pre-loaded with common SaaS roles */
export function createRBAC(withCommonRoles = true): RBAC {
  const rbac = new RBAC();
  if (withCommonRoles) {
    for (const role of COMMON_ROLES) {
      rbac.defineRole(role.name, role);
    }
  }
  return rbac;
}
