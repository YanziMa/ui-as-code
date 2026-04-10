/**
 * Extended validation helpers beyond basic validators.
 */

/** Validate IP address (IPv4) */
export function isValidIP(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

/** Validate IPv6 address */
export function isValidIPv6(ip: string): boolean {
  // Basic validation
  return /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip) || ip === "::1" || ip === "::";
}

/** Validate MAC address */
export function isValidMac(mac: string): boolean {
  return /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/.test(mac);
}

/** Validate hex color code */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/i.test(color);
}

/** Validate CSS value (basic) */
export function isValidCSS(value: string): boolean {
  try {
    const el = document.createElement("div");
    el.style.cssText = `width:${value}`;
    return el.style.width !== "";
  } catch {
    return false;
  }
}

/** Validate date string (ISO or common formats) */
export function isValidDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.toISOString() !== new Date(null).toISOString();
}

/** Validate port number (1-65535) */
export function isValidPort(port: number | string): boolean {
  const p = typeof port === "string" ? parseInt(port, 10) : port;
  return Number.isInteger(p) && p >= 1 && p <= 65535;
}

/** Validate hostname */
export function isValidHostname(host: string): boolean {
  if (host.length > 253) return false;
  const labelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  return host.split(".").every(label => label.length >= 1 && label.length <= 63 && labelRegex.test(label));
}

/** Check if string is a valid JSON object */
export function isJsonObject(str: string): boolean {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

/** Validate that all items in array pass predicate */
export function validateAll<T>(items: T[], predicate: (item: T) => boolean): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  items.forEach((item, i) => {
    if (!predicate(item)) errors.push(`Item at index ${i} failed validation`);
  });
  return { valid: errors.length === 0, errors };
}

/** Create a validator composition (AND logic) */
export function and(...validators: ((value: unknown) => boolean)[]): (value: unknown) => boolean {
  return (value) => validators.every((v) => v(value));
}

/** Create a validator composition (OR logic) */
export function or(...validators: ((value: unknown) => boolean)[]): (value: unknown) => boolean {
  return (value) => validators.some((v) => v(value));
}
