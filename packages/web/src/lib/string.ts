/**
 * String manipulation utilities.
 */

/** Capitalize first letter */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Convert to title case (each word capitalized) */
export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** CamelCase to kebab-case */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** Kebab-case to camelCase */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** Truncate from middle (for long IDs/keys) */
export function truncateMiddle(str: string, maxLen: number = 12): string {
  if (str.length <= maxLen) return str;
  const half = Math.floor((maxLen - 3) / 2);
  return str.slice(0, half) + "..." + str.slice(-half);
}

/** Mask email (user***@domain.com) */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const masked = user.slice(0, 2) + "***";
  return `${masked}@${domain}`;
}

/** Mask string with asterisks (keep first/last N chars) */
export function maskString(str: string, visible: number = 4): string {
  if (str.length <= visible * 2) return "*".repeat(str.length);
  return str.slice(0, visible) + "*".repeat(str.length - visible * 2) + str.slice(-visible);
}

/** Check if string is valid JSON */
export function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/** Repeat string N times */
export function repeat(str: string, count: number): string {
  return str.repeat(Math.max(0, count));
}

/** Strip HTML tags from string */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}
