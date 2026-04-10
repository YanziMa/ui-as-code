/**
 * Enhanced Permission System — RBAC + ABAC hybrid with resource-level
 * permissions, attribute-based conditions, policy evaluation, and
 * hierarchical role inheritance.
 */

// --- Types ---

export type Action = string;
export type Resource = string;

export interface RoleDefinition {
  name: string;
  displayName: string;
  description?: string;
  /** Parent roles to inherit permissions from */
  inheritsFrom?: string[];
  /** Priority for conflict resolution (higher wins) */
  priority?: number;
}

export interface Permission {
  action: Action;
  resource: Resource;
  effect?: "allow" | "deny";
  conditions?: AttributeCondition[];
  /** Resource-specific field constraints */
  fields?: string[];
}

export interface AttributeCondition {
  attribute: string;
  operator: "eq" | "neq" | "in" | "notIn" | "gt" | "lt" | "gte" | "lte" | "contains" | "startsWith" | "endsWith";
  value: unknown;
}

export interface Policy {
  id: string;
  name: string;
  effect: "allow" | "deny";
  resources: Resource[];
  actions: Action[];
  conditions?: AttributeCondition[];
  priority?: number;
  /** Time-based restrictions */
  timeConstraints?: TimeConstraint;
}

export interface TimeConstraint {
  /** Allowed hours (0-23) */
  hours?: [number, number];
  /** Allowed days (0=Sun, 6=Sat) */
  days?: number[];
  /** ISO date range */
  dateRange?: { from?: string; to?: string };
}

export interface UserContext {
  userId: string;
  roles: string[];
  attributes: Record<string, unknown>;
  groups?: string[];
}

export interface EvaluationResult {
  allowed: boolean;
  matchedPolicy?: Policy;
  deniedBy?: string;
  reason?: string;
}

export interface RolePermissionMap {
  [roleName: string]: Permission[];
}

// --- Role Registry ---

class RoleRegistry {
  private roles = new Map<string, RoleDefinition>();

  register(role: RoleDefinition): void {
    this.roles.set(role.name, role);
  }

  get(name: string): RoleDefinition | undefined {
    return this.roles.get(name);
  }

  getAll(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  /**
   * Resolve all inherited roles for a given role (including itself).
   * Handles circular inheritance via visited set.
   */
  resolveHierarchy(roleName: string, visited = new Set<string>()): string[] {
    if (visited.has(roleName)) return [];
    visited.add(roleName);

    const result: string[] = [roleName];
    const role = this.roles.get(roleName);

    if (role?.inheritsFrom) {
      for (const parent of role.inheritsFrom) {
        result.push(...this.resolveHierarchy(parent, visited));
      }
    }

    return result;
  }
}

// --- Condition Evaluator ---

function evaluateCondition(condition: AttributeCondition, context: Record<string, unknown>): boolean {
  const attrValue = context[condition.attribute];

  switch (condition.operator) {
    case "eq": return attrValue === condition.value;
    case "neq": return attrValue !== condition.value;
    case "in": return Array.isArray(condition.value) && condition.value.includes(attrValue);
    case "notIn": return Array.isArray(condition.value) && !condition.value.includes(attrValue);
    case "gt": return typeof attrValue === "number" && typeof condition.value === "number" && attrValue > condition.value;
    case "lt": return typeof attrValue === "number" && typeof condition.value === "number" && attrValue < condition.value;
    case "gte": return typeof attrValue === "number" && typeof condition.value === "number" && attrValue >= condition.value;
    case "lte": return typeof attrValue === "number" && typeof condition.value === "number" && attrValue <= condition.value;
    case "contains":
      return typeof attrValue === "string" && typeof condition.value === "string"
        ? attrValue.includes(condition.value)
        : Array.isArray(attrValue) && attrValue.includes(condition.value);
    case "startsWith":
      return typeof attrValue === "string" && typeof condition.value === "string"
        ? attrValue.startsWith(condition.value)
        : false;
    case "endsWith":
      return typeof attrValue === "string" && typeof condition.value === "string"
        ? attrValue.endsWith(condition.value)
        : false;
    default:
      return false;
  }
}

function evaluateConditions(conditions: AttributeCondition[], context: Record<string, unknown>): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, context));
}

function evaluateTimeConstraints(constraint: TimeConstraint | undefined): boolean {
  if (!constraint) return true;

  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();

  // Check hour range
  if (constraint.hours) {
    const [from, to] = constraint.hours;
    if (hour < from || hour > to) return false;
  }

  // Check day of week
  if (constraint.days && !constraint.days.includes(day)) return false;

  // Check date range
  if (constraint.dateRange) {
    const isoStr = now.toISOString().split("T")[0]!;
    if (constraint.dateRange.from && isoStr < constraint.dateRange.from) return false;
    if (constraint.dateRange.to && isoStr > constraint.dateRange.to) return false;
  }

  return true;
}

// --- Main ACL Class ---

/**
 * Enhanced Access Control List supporting RBAC + ABAC.
 *
 * @example
 * ```ts
 * const acl = new EnhancedACL();
 * acl.defineRole("admin", { inheritsFrom: ["editor"] });
 * acl.grant("admin", "write", "users:*");
 * acl.setContext({ userId: "1", roles: ["admin"], attributes: { department: "eng" } });
 * acl.can("write", "users:123"); // true
 * ```
 */
export class EnhancedACL {
  private roleRegistry = new RoleRegistry();
  private rolePermissions = new RolePermissionMap();
  private policies: Policy[] = [];
  private context: UserContext | null = null;
  private defaultEffect: "allow" | "deny" = "deny";

  // --- Role Management ---

  /** Define a role with optional inheritance */
  defineRole(name: string, options?: Omit<RoleDefinition, "name">): void {
    this.roleRegistry.register({
      name,
      displayName: options?.displayName ?? name,
      description: options?.description,
      inheritsFrom: options?.inheritsFrom,
      priority: options?.priority ?? 0,
    });
  }

  /** Get a role definition */
  getRole(name: string): RoleDefinition | undefined {
    return this.roleRegistry.get(name);
  }

  /** Get all defined roles */
  getRoles(): RoleDefinition[] {
    return this.roleRegistry.getAll();
  }

  // --- Permission Management ---

  /**
   * Grant a permission to a role.
   * Supports wildcard resources like "users:*".
   */
  grant(
    roleName: string,
    action: Action,
    resource: Resource,
    options?: { effect?: "allow" | "deny"; conditions?: AttributeCondition[]; fields?: string[] },
  ): void {
    if (!this.rolePermissions[roleName]) {
      this.rolePermissions[roleName] = [];
    }

    this.rolePermissions[roleName]!.push({
      action,
      resource,
      effect: options?.effect ?? "allow",
      conditions: options?.conditions,
      fields: options?.fields,
    });
  }

  /**
   * Revoke a specific permission from a role.
   */
  revoke(roleName: string, action: Action, resource: Resource): void {
    const perms = this.rolePermissions[roleName];
    if (!perms) return;

    const idx = perms.findIndex(
      (p) => p.action === action && p.resource === resource
    );
    if (idx >= 0) perms.splice(idx, 1);
  }

  /** Get all permissions for a role (including inherited) */
  getRolePermissions(roleName: string): Permission[] {
    const hierarchy = this.roleRegistry.resolveHierarchy(roleName);
    const result: Permission[] = [];

    for (const r of hierarchy) {
      const perms = this.rolePermissions[r];
      if (perms) result.push(...perms);
    }

    return result;
  }

  // --- Policy Management ---

  /** Add an access control policy */
  addPolicy(policy: Policy): void {
    this.policies.push(policy);
    // Sort by priority descending
    this.policies.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /** Remove a policy by ID */
  removePolicy(policyId: string): void {
    this.policies = this.policies.filter((p) => p.id !== policyId);
  }

  /** Get all policies */
  getPolicies(): Policy[] {
    return [...this.policies];
  }

  // --- Context ---

  /** Set the current user context for evaluation */
  setContext(context: UserContext): void {
    this.context = context;
  }

  /** Clear the current context */
  clearContext(): void {
    this.context = null;
  }

  /** Set default effect when no policy matches */
  setDefaultEffect(effect: "allow" | "deny"): void {
    this.defaultEffect = effect;
  }

  // --- Evaluation ---

  /**
   * Check if current user can perform an action on a resource.
   * Returns detailed evaluation result.
   */
  evaluate(action: Action, resource: Resource): EvaluationResult {
    if (!this.context) {
      return { allowed: false, reason: "No user context set" };
    }

    // 1. Evaluate policies first (highest priority)
    for (const policy of this.policies) {
      if (this.matchesPolicy(policy, action, resource)) {
        const conditionsMet = evaluateConditions(policy.conditions ?? [], this.context.attributes)
          && evaluateTimeConstraints(policy.timeConstraints);

        if (conditionsMet) {
          const allowed = policy.effect === "allow";
          return {
            allowed,
            matchedPolicy: policy,
            deniedBy: allowed ? undefined : `Policy "${policy.name}" denies access`,
            reason: `Matched policy "${policy.name}"`,
          };
        }
      }
    }

    // 2. Fall back to role-based permissions
    const effectiveRoles = this.roleRegistry.resolveHierarchy(this.context.roles[0] ?? "");
    let hasAllow = false;
    let hasDeny = false;
    let denyReason = "";

    for (const roleName of effectiveRoles) {
      const perms = this.rolePermissions[roleName] ?? [];

      for (const perm of perms) {
        if (this.matchesPermission(perm, action, resource)) {
          const conditionsMet = evaluateConditions(perm.conditions ?? [], this.context.attributes);

          if (conditionsMet) {
            if (perm.effect === "deny") {
              hasDeny = true;
              denyReason = `Denied by role "${roleName}"`;
            } else {
              hasAllow = true;
            }
          }
        }
      }
    }

    // Deny always wins
    if (hasDeny) {
      return { allowed: false, deniedBy: denyReason };
    }

    if (hasAllow) {
      return { allowed: true };
    }

    // Default effect
    return {
      allowed: this.defaultEffect === "allow",
      reason: `No matching rule — default: ${this.defaultEffect}`,
    };
  }

  /** Simple boolean check (shorthand for evaluate().allowed) */
  can(action: Action, resource: Resource): boolean {
    return this.evaluate(action, resource).allowed;
  }

  /**
   * Check which actions are allowed on a resource.
   */
  getAllowedActions(resource: Resource): Action[] {
    if (!this.context) return [];

    const actions = new Set<Action>();
    const effectiveRoles = this.roleRegistry.resolveHierarchy(this.context.roles[0] ?? "");

    for (const roleName of effectiveRoles) {
      const perms = this.rolePermissions[roleName] ?? [];
      for (const perm of perms) {
        if (
          this.resourceMatches(perm.resource, resource) &&
          (perm.effect !== "deny") &&
          evaluateConditions(perm.conditions ?? [], this.context.attributes)
        ) {
          actions.add(perm.action);
        }
      }
    }

    return Array.from(actions);
  }

  /**
   * Filter a list of resources to only those accessible with given action.
   */
  filterAccessible(resources: Resource[], action: Action): Resource[] {
    return resources.filter((r) => this.can(action, r));
  }

  // --- Internal Matching ---

  private matchesPolicy(policy: Policy, action: Action, resource: Resource): boolean {
    return policy.actions.includes("*") || policy.actions.includes(action)
      && (policy.resources.includes("*") || policy.resources.some((r) => this.resourceMatches(r, resource)));
  }

  private matchesPermission(perm: Permission, action: Action, resource: Resource): boolean {
    return (perm.action === "*" || perm.action === action)
      && this.resourceMatches(perm.resource, resource);
  }

  private resourceMatches(pattern: Resource, resource: Resource): boolean {
    if (pattern === "*") return true;
    if (pattern === resource) return true;

    // Wildcard matching: "users:*" matches "users:123"
    if (pattern.endsWith(":*")) {
      const prefix = pattern.slice(0, -1); // "users:"
      return resource.startsWith(prefix);
    }

    // Glob-style: "users.*" matches "users.123"
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(resource);
    }

    return false;
  }
}
