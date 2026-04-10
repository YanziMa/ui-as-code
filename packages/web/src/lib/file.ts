/**
 * File / path utilities.
 */

/** Get file extension from path */
export function getExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  return lastDot > 0 ? path.slice(lastDot + 1) : "";
}

/** Get filename without extension */
export function getBasename(path: string, withoutExt?: boolean): string {
  const parts = path.replace(/\\/g, "/").split("/");
  const filename = parts[parts.length - 1] || "";
  return withoutExt ? filename.slice(0, filename.lastIndexOf(".")) : filename;
}

/** Get directory path */
export function getDirname(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash > 0 ? normalized.slice(0, lastSlash) : ".";
}

/** Join path segments (platform-aware) */
export function joinPath(...segments: string[]): string {
  return segments
    .filter(Boolean)
    .map((s) => s.replace(/\/+$/, ""))
    .join("/")
    .replace(/\/\/+/g, "/");
}

/** Normalize path (resolve .. and . segments) */
export function normalizePath(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== ".") {
      resolved.push(part);
    }
  }
  return resolved.length === 0 ? "." : "/" + resolved.join("/") + (path.endsWith("/") ? "/" : "");
}

/** Check if path is absolute */
export function isAbsolute(path: string): boolean {
  return /^[a-zA-Z]:\\|^\//.test(path);
}

/** Check if path looks like a URL */
export function isUrlPath(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

/** Make relative path from base to target */
export function relativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split("/").slice(1);
  const toParts = normalizePath(to).split("/").slice(1);

  let commonLength = 0;
  for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
    if (fromParts[i] === toParts[i]) commonLength++;
    else break;
  }

  const upCount = fromParts.length - commonLength;
  const downParts = toParts.slice(commonLength);

  const ups = Array(upCount).fill("..");
  return [...ups, ...downParts].join("/") || ".";
}
