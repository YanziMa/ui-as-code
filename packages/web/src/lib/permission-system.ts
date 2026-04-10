/**
 * Permission System: Role-Based Access Control (RBAC) with attribute-based
 * policies (ABAC hybrid), resource-level permissions, permission inheritance,
 * conditional grants, audit logging, and policy evaluation engine.
 */

// --- Types ---

export type PermissionAction =
  | "create" | "read" | "update" | "delete"
  | "execute" | "admin" | "manage" | "own"
  | "invite" | "remove" | "approve" | "reject"
  | "publish" | "archive" | "export" | "import"
  | string; // Custom actions

export interface Permission {
  /** Resource identifier (e.g., "document", "user:123") */
  resource: string;
  /** Action allowed on the resource */
  action: PermissionAction;
  /** Conditions that must be true for this permission to apply */
  conditions?: Condition[];
  /** Effect: allow or deny (default: allow) */
  effect?: "allow" | "deny";
  /** Fields restricted by this permission (e.g., can read but only certain fields) */
  fields?: string[];
  /** Time-based constraints */
  timeConstraints?: TimeConstraint;
  /** Where this permission came from */
  source?: "direct" | "role" | "inherited" | "policy";
  /** Priority for conflict resolution (higher wins) */
  priority?: number;
  /** Human-readable description */
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  permissions: Permission[];
  /** Roles this role inherits from */
  inheritsFrom?: string[];
  /** Is this a system role (non-deletable) */
  isSystem?: boolean;
  /** Tags for categorization */
  tags?: string[];
  /** Created at timestamp */
  createdAt?: number;
}

export interface Condition {
  /** Field path to check (supports dot notation) */
  field: string;
  /** Comparison operator */
  operator: "eq" | "neq" | "in" | "nin" | "gt" | "gte" | "lt" | "lte" | "contains" | "startsWith" | "endsWith" | "exists" | "notExists" | "matches" | "custom";
  /** Value(s) to compare against */
  value?: unknown;
  /** Custom evaluator function */
  fn?: (context: EvaluationContext) => boolean;
  /** Logical grouping */
  logic?: "and" | "or";
  /** Nested conditions */
  conditions?: Condition[];
}

export interface TimeConstraint {
  /** Only apply during these hours (24h format) */
  hours?: [number, number];
  /** Only apply on these weekdays (0=Sun, 6=Sat) */
  weekdays?: number[];
  /** Start date (inclusive) */
  from?: Date;
  /** End date (exclusive) */
  until?: Date;
  /** Duration limit in ms per session */
  sessionDurationMs?: number;
}

export interface UserIdentity {
  id: string;
  roles: string[];
  /** Direct permissions assigned to user (bypass roles) */
  directPermissions?: Permission[];
  /** Arbitrary attributes for ABAC evaluation */
  attributes?: Record<string, unknown>;
  /** Groups/user belongs to */
  groups?: string[];
  /** Tenant/organization context */
  tenantId?: string;
  /** When this identity was issued */
  issuedAt?: number;
  /** When this identity expires */
  expiresAt?: number;
}

export interface ResourceContext {
  /** Resource type (e.g., "document", "project") */
  type: string;
  /** Resource ID */
  id?: string;
  /** Resource owner's user ID */
  ownerId?: string;
  /** Resource attributes for condition evaluation */
  attributes?: Record<string, unknown>;
  /** Parent resource (for hierarchical checks) */
  parentId?: string;
  /** Resource tags */
  tags?: string[];
}

export interface EvaluationContext {
  user: UserIdentity;
  resource: ResourceContext;
  action: PermissionAction;
  /** Current timestamp for time-based conditions */
  now?: number;
  /** Additional arbitrary context */
  extra?: Record<string, unknown>;
  /** IP address for location-based policies */
  ipAddress?: string;
  /** Request method (for API contexts) */
  method?: string;
}

export interface EvaluationResult {
  allowed: boolean;
  /** Which permission granted/denied access */
  matchedPermission?: Permission;
  /** Why access was granted or denied */
  reason: string;
  /** All evaluated permissions (for debugging) */
  evaluated: Array<{ permission: Permission; matched: boolean; reason?: string }>;
  /** Warnings (e.g., expired identity, conflicting rules) */
  warnings: string[];
  /** Evaluation duration in ms */
  durationMs: number;
}

export interface Policy {
  id: string;
  name: string;
  description?: string;
  effect: "allow" | "deny";
  /** Resources this policy applies to (glob pattern) */
  resources: string[];
  /** Actions this policy applies to */
  actions: PermissionAction[];
  /** Conditions for this policy */
  conditions?: Condition[];
  /** Roles this policy applies to */
  roles?: string[];
  /** Priority (higher = more important) */
  priority?: number;
  /** Whether this policy is enabled */
  enabled?: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: string;
  action: PermissionAction;
  resource: string;
  result: "allowed" | "denied";
  reason: string;
  ip?: string;
  userAgent?: string;
  context?: Record<string, unknown>;
}

// --- Condition Evaluator ---

function evaluateCondition(condition: Condition, ctx: EvaluationContext): boolean {
  // Resolve field value from context
  const resolveValue = (field: string): unknown => {
    const parts = field.split(".");
    let val: unknown = ctx;

    for (const part of parts) {
      if (val === null || val === undefined) return undefined;
      val = (val as Record<string, unknown>)[part];
    }

    return val;
  };

  const fieldValue = resolveValue(condition.field);

  switch (condition.operator) {
    case "eq": return fieldValue === condition.value;
    case "neq": return fieldValue !== condition.value;
    case "in": return Array.isArray(condition.value) && condition.value.includes(fieldValue);
    case "nin": return !Array.isArray(condition.value) || !condition.value.includes(fieldValue);
    case "gt": return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue > condition.value;
    case "gte": return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue >= condition.value;
    case "lt": return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue < condition.value;
    case "lte": return typeof fieldValue === "number" && typeof condition.value === "number" && fieldValue <= condition.value;
    case "contains":
      return Array.isArray(fieldValue) ? fieldValue.includes(condition.value)
        : typeof fieldValue === "string" && String(condition.value).length > 0
          ? fieldValue.includes(String(condition.value))
          : false;
    case "startsWith": return typeof fieldValue === "string" && fieldValue.startsWith(String(condition.value ?? ""));
    case "endsWith": return typeof fieldValue === "string" && fieldValue.endsWith(String(condition.value ?? ""));
    case "exists": return fieldValue !== undefined && fieldValue !== null;
    case "notExists": return fieldValue === undefined || fieldValue === null;
    case "matches":
      return typeof fieldValue === "string" && typeof condition.value === "string"
        ? new RegExp(condition.value).test(fieldValue)
        : false;
    case "custom":
      return condition.fn ? condition.fn(ctx) : true;
    default:
      return true;
  }
}

function evaluateConditions(conditions: Condition[], ctx: EvaluationContext, logic: "and" | "or" = "and"): boolean {
  if (conditions.length === 0) return true;

  for (const cond of conditions) {
    // Handle nested conditions
    if (cond.conditions && cond.conditions.length > 0) {
      const nestedResult = evaluateConditions(cond.conditions, ctx, cond.logic ?? "and");
      if (logic === "and" && !nestedResult) return false;
      if (logic === "or" && nestedResult) return true;
      continue;
    }

    const result = evaluateCondition(cond, ctx);
    if (logic === "and" && !result) return false;
    if (logic === "or" && result) return true;
  }

  return logic === "and"; // "and" needs all true, "or" needs at least one true
}

// --- Time Constraint Checker ---

function checkTimeConstraint(constraint: TimeConstraint, now: number): boolean {
  const date = new Date(now);

  if (constraint.hours) {
    const hour = date.getHours();
    if (hour < constraint.hours[0]! || hour >= constraint.hours[1]!) return false;
  }

  if (constraint.weekdays) {
    const day = date.getDay();
    if (!constraint.weekdays.includes(day)) return false;
  }

  if (constraint.from && now < constraint.from.getTime()) return false;
  if (constraint.until && now >= constraint.until.getTime()) return false;

  return true;
}

// --- Permission Engine ---

export class PermissionEngine {
  private roles = new Map<string, Role>();
  private policies: Policy[] = [];
  private auditLog: AuditLogEntry[] = [];
  private maxAuditLogSize: number;
  private listeners = new Set<(result: EvaluationResult) => void>();
  private resolvedCache = new Map<string, { result: EvaluationResult; ttl: number }>();
  private cacheTtlMs: number;

  constructor(options?: { maxAuditLogSize?: number; cacheTtlMs?: number }) {
    this.maxAuditLogSize = options?.maxAuditLogSize ?? 10000;
    this.cacheTtlMs = options?.cacheTtlMs ?? 5000;
  }

  // --- Role Management ---

  /** Register a role definition */
  addRole(role: Role): void {
    this.roles.set(role.id, role);
    this.invalidateCache();
  }

  /** Remove a role */
  removeRole(id: string): boolean {
    const role = this.roles.get(id);
    if (role?.isSystem) return false; // Can't remove system roles
    this.roles.delete(id);
    this.invalidateCache();
    return true;
  }

  /** Get a role by ID */
  getRole(id: string): Role | undefined {
    return this.roles.get(id);
  }

  /** List all roles */
  listRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  // --- Policy Management ---

  /** Add a policy rule */
  addPolicy(policy: Policy): void {
    this.policies.push(policy);
    // Sort by priority descending
    this.policies.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.invalidateCache();
  }

  /** Remove a policy */
  removePolicy(id: string): void {
    this.policies = this.policies.filter((p) => p.id !== id);
    this.invalidateCache();
  }

  /** List all policies */
  listPolicies(): Policy[] {
    return [...this.policies];
  }

  // --- Core Evaluation ---

  /**
   * Evaluate whether a user can perform an action on a resource.
   * This is the main entry point for authorization checks.
   */
  evaluate(context: EvaluationContext): EvaluationResult {
    const startTime = performance.now();
    const warnings: string[] = [];
    const evaluated: EvaluationResult["evaluated"] = [];

    // Check identity expiration
    if (context.user.expiresAt && Date.now() > context.user.expiresAt) {
      warnings.push("User identity has expired");
    }

    const now = context.now ?? Date.now();

    // Collect all applicable permissions
    const allPermissions = this.collectPermissions(context.user);

    // Also evaluate policies
    const policyPermissions = this.evaluatePolicies(context, warnings);
    allPermissions.push(...policyPermissions);

    // Sort by priority (highest first), then deny before allow
    allPermissions.sort((a, b) => {
      // Deny always takes precedence over allow at same priority
      if (a.effect === "deny" && b.effect === "allow") return -1;
      if (a.effect === "allow" && b.effect === "deny") return 1;
      return (b.priority ?? 0) - (a.priority ?? 0);
    });

    // Evaluate each permission
    let allowed = false;
    let matchedPermission: Permission | undefined;
    let reason = "No matching permission found";

    for (const perm of allPermissions) {
      // Check resource match (support glob patterns)
      if (!this.matchResource(perm.resource, context.resource.type)) {
        evaluated.push({ permission: perm, matched: false, reason: "Resource mismatch" });
        continue;
      }

      // Check action match
      if (perm.action !== "*" && perm.action !== context.action &&
          !(Array.isArray(perm.action) ? (perm.action as string[]).includes(context.action) : false)) {
        evaluated.push({ permission: perm, matched: false, reason: "Action mismatch" });
        continue;
      }

      // Check conditions
      let conditionMet = true;
      if (perm.conditions && perm.conditions.length > 0) {
        conditionMet = evaluateConditions(perm.conditions, context);
      }

      // Check time constraints
      let timeOk = true;
      if (perm.timeConstraints) {
        timeOk = checkTimeConstraint(perm.timeConstraints, now);
      }

      const fullyMatched = conditionMet && timeOk;

      evaluated.push({
        permission: perm,
        matched: fullyMatched,
        reason: fullyMatched ? "Granted" :
          !conditionMet ? "Condition not met" : "Time constraint not satisfied",
      });

      if (fullyMatched) {
        if (perm.effect === "deny") {
          // Explicit deny always wins
          allowed = false;
          matchedPermission = perm;
          reason = `Denied by ${perm.description ?? perm.resource}:${perm.action}`;
          break;
        }
        // Allow
        allowed = true;
        matchedPermission = perm;
        reason = `Granted by ${perm.description ?? `${perm.resource}:${perm.action}`}`;
        // Don't break — keep checking for potential denies
      }
    }

    const result: EvaluationResult = {
      allowed,
      matchedPermission,
      reason,
      evaluated,
      warnings,
      durationMs: performance.now() - startTime,
    };

    // Audit log
    this.audit({
      id: crypto.randomUUID(),
      timestamp: now,
      userId: context.user.id,
      action: context.action,
      resource: `${context.resource.type}${context.resource.id ? ":" + context.resource.id : ""}`,
      result: allowed ? "allowed" : "denied",
      reason,
      ip: context.ipAddress,
      context: { ...context.extra },
    });

    // Notify listeners
    for (const l of this.listeners) l(result);

    return result;
  }

  /** Quick check: returns boolean only */
  can(user: UserIdentity, action: PermissionAction, resource: ResourceContext): boolean {
    return this.evaluate({ user, action, resource }).allowed;
  }

  /** Check multiple actions at once */
  canAny(user: UserIdentity, actions: PermissionAction[], resource: ResourceContext): { [action: string]: boolean } {
    const result: Record<string, boolean> = {};
    for (const action of actions) {
      result[action] = this.can(user, action, resource);
    }
    return result;
  }

  // --- Permission Collection ---

  private collectPermissions(user: UserIdentity): Permission[] {
    const permissions: Permission[] = [];
    const visitedRoles = new Set<string>();

    // Direct permissions
    if (user.directPermissions) {
      permissions.push(...user.directPermissions.map((p) => ({ ...p, source: "direct" as const })));
    }

    // Role-based permissions (with inheritance)
    const collectFromRole = (roleId: string) => {
      if (visitedRoles.has(roleId)) return;
      visitedRoles.add(roleId);

      const role = this.roles.get(roleId);
      if (!role) return;

      // Add role's own permissions
      for (const perm of role.permissions) {
        permissions.push({ ...perm, source: "role" as const });
      }

      // Recurse into inherited roles
      if (role.inheritsFrom) {
        for (const parentRoleId of role.inheritsFrom) {
          collectFromRole(parentRoleId);
        }
      }
    };

    for (const roleId of user.roles) {
      collectFromRole(roleId);
    }

    return permissions;
  }

  private evaluatePolicies(ctx: EvaluationContext, warnings: string[]): Permission[] {
    const perms: Permission[] = [];

    for (const policy of this.policies) {
      if (policy.enabled === false) continue;

      // Check if policy applies to user's roles
      if (policy.roles && policy.roles.length > 0) {
        if (!policy.roles.some((r) => ctx.user.roles.includes(r))) continue;
      }

      // Check resource match
      const resourceMatches = policy.resources.some((r) =>
        this.matchResource(r, ctx.resource.type),
      );
      if (!resourceMatches) continue;

      // Check action match
      const actionMatches = policy.actions.includes(ctx.action) || policy.actions.includes("*");
      if (!actionMatches) continue;

      // Check conditions
      let conditionMet = true;
      if (policy.conditions && policy.conditions.length > 0) {
        conditionMet = evaluateConditions(policy.conditions, ctx);
      }

      if (conditionMet) {
        perms.push({
          resource: policy.resources[0]!,
          action: ctx.action,
          effect: policy.effect,
          conditions: policy.conditions,
          priority: policy.priority,
          description: `Policy: ${policy.name}`,
          source: "policy",
        });
      }
    }

    return perms;
  }

  private matchResource(pattern: string, resourceType: string): boolean {
    if (pattern === "*") return true;
    if (pattern === resourceType) return true;

    // Simple glob support (* matches any segment)
    if (pattern.includes("*")) {
      const regexStr = "^" + pattern.replace(/\*/g, "[^:]*").replace(/\?/g, "[^:]") + "$";
      return new RegExp(regexStr).test(resourceType);
    }

    return false;
  }

  // --- Audit Log ---

  /** Get audit log entries */
  getAuditLog(options?: {
    userId?: string;
    resource?: string;
    result?: "allowed" | "denied";
    since?: number;
    limit?: number;
  }): AuditLogEntry[] {
    let entries = [...this.auditLog];

    if (options?.userId) entries = entries.filter((e) => e.userId === options.userId);
    if (options?.resource) entries = entries.filter((e) => e.resource === options.resource);
    if (options?.result) entries = entries.filter((e) => e.result === options.result);
    if (options?.since) entries = entries.filter((e) => e.timestamp >= options.since);
    if (options?.limit) entries = entries.slice(-options.limit);

    return entries;
  }

  /** Clear audit log */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  private audit(entry: AuditLogEntry): void {
    this.auditLog.push(entry);
    while (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog.shift();
    }
  }

  // --- Events & Cache ---

  /** Subscribe to evaluation events */
  onEvaluate(listener: (result: EvaluationResult) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private invalidateCache(): void {
    this.resolvedCache.clear();
  }

  // --- Utility Builders ---

  /** Create a simple role with common CRUD permissions */
  static createCrudRole(
    id: string,
    name: string,
    resource: string,
    options?: {
      canCreate?: boolean;
      canRead?: boolean;
      canUpdate?: boolean;
      canDelete?: boolean;
      ownOnly?: boolean;
      description?: string;
    },
  ): Role {
    const opts = {
      canCreate: true, canRead: true, canUpdate: true, canDelete: false,
      ownOnly: false, ...options,
    };

    const permissions: Permission[] = [];

    if (opts.canCreate) permissions.push({ resource, action: "create" });
    if (opts.canRead) {
      permissions.push({
        resource, action: "read",
        conditions: opts.ownOnly ? [{ field: "resource.ownerId", operator: "eq", value: "__USER_ID__" }] : undefined,
      });
    }
    if (opts.canUpdate) {
      permissions.push({
        resource, action: "update",
        conditions: opts.ownOnly ? [{ field: "resource.ownerId", operator: "eq", value: "__USER_ID__" }] : undefined,
      });
    }
    if (opts.canDelete) {
      permissions.push({
        resource, action: "delete",
        conditions: opts.ownOnly ? [{ field: "resource.ownerId", operator: "eq", value: "__USER_ID__" }] : undefined,
      });
    }

    return { id, name, permissions, description: opts.description };
  }

  /** Create an admin role with full access */
  static createAdminRole(id = "admin", name = "Administrator"): Role {
    return {
      id,
      name,
      displayName: name,
      isSystem: true,
      permissions: [
        { resource: "*", action: "*", effect: "allow", description: "Full system access" },
      ],
    };
  }
}
