/**
 * Permission and role-based access control utilities.
 */

export type Role = "admin" | "moderator" | "user" | "guest" | "bot";

export interface Permission {
  resource: string;
  action: string;
}

/** Role hierarchy (higher index = more permissions) */
const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 100,
  moderator: 60,
  user: 30,
  guest: 10,
  bot: 0,
};

/** Default permissions per role */
const ROLE_PERMISSIONS: Record<Role, Set<string>> = {
  admin: new Set(["*"]), // Admin can do everything
  moderator: new Set([
    "pr:review", "pr:comment", "pr:merge", "pr:close",
    "user:warn", "user:suspend",
    "content:edit", "content:delete",
    "reports:view", "audit:view",
  ]),
  user: new Set([
    "pr:create", "pr:view", "pr:comment", "pr:vote",
    "profile:edit", "profile:view",
    "bookmark:create", "bookmark:delete",
    "feedback:submit",
    "explore:view",
  ]),
  guest: new Set([
    "pr:view", "profile:view", "explore:view",
  ]),
  bot: new Set([
    "pr:view", "api:access",
  ]),
};

/** Check if a role has a specific permission */
export function hasPermission(role: Role, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.has("*")) return true; // Wildcard
  // Check exact match or wildcard resource
  if (perms.has(permission)) return true;

  const [resource] = permission.split(":");
  return perms.has(`${resource}:*`);
}

/** Check if role A has equal or higher privilege than role B */
export function hasRoleLevel(roleA: Role, roleB: Role): boolean {
  return (ROLE_HIERARCHY[roleA] ?? 0) >= (ROLE_HIERARCHY[roleB] ?? 0);
}

/** Get all permissions for a role */
export function getPermissions(role: Role): string[] {
  const perms = ROLE_PERMISSIONS[role];
  if (perms.has("*")) return ["*"];
  return [...perms];
}

/** Create an access control list for custom resources */
export class ACL<TResource extends string = string> {
  private rules = new Map<string, Map<Role, Set<string>>>();

  /** Grant a permission to a role for a resource */
  grant(resource: TResource, action: string, roles: Role[]): void {
    let resourceRules = this.rules.get(resource);
    if (!resourceRules) {
      resourceRules = new Map();
      this.rules.set(resource, resourceRules);
    }

    for (const role of roles) {
      let actions = resourceRules.get(role);
      if (!actions) {
        actions = new Set();
        resourceRules.set(role, actions);
      }
      actions.add(action);
    }
  }

  /** Revoke a permission from a role for a resource */
  revoke(resource: TResource, action: string, roles: Role[]): void {
    const resourceRules = this.rules.get(resource);
    if (!resourceRules) return;

    for (const role of roles) {
      const actions = resourceRules.get(role);
      if (actions) {
        actions.delete(action);
        if (actions.size === 0) resourceRules.delete(role);
      }
    }

    if (resourceRules.size === 0) this.rules.delete(resource);
  }

  /** Check if a role can perform an action on a resource */
  can(resource: TResource, action: string, role: Role): boolean {
    // First check built-in role permissions
    if (hasPermission(role, "*")) return true;
    if (hasPermission(role, `${resource}:${action}`)) return true;

    // Then check ACL-specific rules
    const resourceRules = this.rules.get(resource);
    if (!resourceRules) return false;

    const actions = resourceRules.get(role);
    if (!actions) return false;

    return actions.has(action) || actions.has("*");
  }

  /** List all resources with their permission rules */
  listResources(): { resource: TResource; rules: Record<Role, string[]> }[] {
    return [...this.rules.entries()].map(([resource, roleMap]) => ({
      resource,
      rules: Object.fromEntries(
        [...roleMap.entries()].map(([role, actions]) => [role, [...actions]]),
      ),
    }));
  }
}

/** Pre-configured app-wide ACL instance */
export const appACL = new ACL<"pr" | "user" | "team" | "settings" | "admin">();

// Seed default ACL rules
appACL.grant("pr", "merge", ["admin", "moderator"]);
appACL.grant("pr", "force-close", ["admin"]);
appACL.grant("user", "ban", ["admin"]);
appACL.grant("user", "unban", ["admin"]);
appACL.grant("team", "create", ["admin", "moderator", "user"]);
appACL.grant("team", "delete", ["admin"]);
appACL.grant("settings", "manage", ["admin"]);
appACL.grant("admin", "dashboard", ["admin"]);
