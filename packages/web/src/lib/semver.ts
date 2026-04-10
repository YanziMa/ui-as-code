/**
 * Semantic versioning (SemVer) parsing, comparison, and manipulation.
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

/** Parse a semver string into components */
export function parseSemVer(version: string): SemVer | null {
  const match = version.match(
    /^v?(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/,
  );

  if (!match) return null;

  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
    prerelease: match[4],
    build: match[5],
  };
}

/** Format a SemVer object back to string */
export function formatSemVer(ver: SemVer, includePrefix = false): string {
  let result = `${ver.major}.${ver.minor}.${ver.patch}`;
  if (ver.prerelease) result += `-${ver.prerelease}`;
  if (ver.build) result += `+${ver.build}`;
  if (includePrefix) result = `v${result}`;
  return result;
}

/** Compare two versions: returns -1, 0, or 1 */
export function compareSemVer(a: string | SemVer, b: string | SemVer): number {
  const pa = typeof a === "string" ? parseSemVer(a) : a;
  const pb = typeof b === "string" ? parseSemVer(b) : b;

  if (!pa || !pb) throw new Error(`Invalid semver: ${a} or ${b}`);

  // Compare major.minor.patch
  if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1;
  if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1;
  if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1;

  // Prerelease versions have lower precedence
  if (pa.prerelease && !pb.prerelease) return -1;
  if (!pa.prerelease && pb.prerelease) return 1;
  if (pa.prerelease && pb.prerelease) {
    return pa.prerelease.localeCompare(pb.prerelease);
  }

  return 0;
}

/** Check if version a satisfies the range constraint */
export function satisfies(version: string, range: string): boolean {
  const parsed = parseSemVer(version);
  if (!parsed) return false;

  // Handle simple comparison operators
  const trimmedRange = range.trim();

  // Exact match
  if (/^[\d.]+$/.test(trimmedRange)) {
    return compareSemVer(version, trimmedRange) === 0;
  }

  // caret range (^)
  if (trimmedRange.startsWith("^")) {
    const base = parseSemVer(trimmedRange.slice(1));
    if (!base) return false;

    // ^1.2.3 := >=1.2.3 <2.0.0
    // ^0.2.3 := >=0.2.3 <0.3.0
    // ^0.0.3 := >=0.0.3 <0.0.4
    const minOk = compareSemVer(parsed, base) >= 0;

    let maxMajor = base.major + 1;
    let maxMinor = 0;
    let maxPatch = 0;

    if (base.major === 0) {
      maxMajor = 0;
      if (base.minor === 0) {
        maxPatch = base.patch + 1;
      } else {
        maxMinor = base.minor + 1;
      }
    }

    const maxOk = compareSemVer(parsed, { major: maxMajor, minor: maxMinor, patch: maxPatch }) < 0;
    return minOk && maxOk;
  }

  // Tilde range (~)
  if (trimmedRange.startsWith("~")) {
    const base = parseSemVer(trimmedRange.slice(1));
    if (!base) return false;

    // ~1.2.3 := >=1.2.3 <1.3.0
    const minOk = compareSemVer(parsed, base) >= 0;
    const maxOk = compareSemVer(parsed, { ...base, minor: base.minor + 1, patch: 0 }) < 0;
    return minOk && maxOk;
  }

  // Comparison operators
  const compMatch = trimmedRange.match(/^(>=?|<=?|==?)\s*(.+)$/);
  if (compMatch) {
    const [, op, target] = compMatch;
    const targetParsed = parseSemVer(target!);
    if (!targetParsed) return false;

    const cmp = compareSemVer(parsed, targetParsed);
    switch (op) {
      case ">": return cmp > 0;
      case ">=": return cmp >= 0;
      case "<": return cmp < 0;
      case "<=": return cmp <= 0;
      case "=":
      case "==": return cmp === 0;
      default: return false;
    }
  }

  // Hyphen range (1.2.3 - 2.0.0)
  const hyphenMatch = trimmedRange.match(/^(\S+)\s+-\s+(\S+)$/);
  if (hyphenMatch) {
    const low = parseSemVer(hyphenMatch[1]!);
    const high = parseSemVer(hyphenMatch[2]!);
    if (!low || !high) return false;
    return compareSemVer(parsed, low) >= 0 && compareSemVer(parsed, high) <= 0;
  }

  // X-range (1.x, 1.2.x, *)
  const xMatch = trimmedRange.match(/^(\d+)\.(\d+|\*)\.(\d+|\*|\^)$/);
  if (xMatch) {
    const major = xMatch[1] === "*" ? -1 : parseInt(xMatch[1]!, 10);
    const minor = xMatch[2] === "*" || xMatch[2] === "^" ? -1 : parseInt(xMatch[2]!, 10);
    const patch = xMatch[3] === "*" || xMatch[3] === "^" ? -1 : parseInt(xMatch[3]!, 10);

    if (major >= 0 && parsed.major !== major) return false;
    if (minor >= 0 && parsed.minor !== minor) return false;
    if (patch >= 0 && parsed.patch !== patch) return false;
    return true;
  }

  return false;
}

/** Increment a version */
export function incrementVersion(
  version: string,
  part: "major" | "minor" | "patch",
  prerelease?: string,
): string {
  const parsed = parseSemVer(version);
  if (!parsed) throw new Error(`Invalid semver: ${version}`);

  switch (part) {
    case "major":
      return formatSemVer({ major: parsed.major + 1, minor: 0, patch: 0 });
    case "minor":
      return formatSemVer({ ...parsed, minor: parsed.minor + 1, patch: 0 });
    case "patch":
      return formatSemVer({ ...parsed, patch: parsed.patch + 1, prerelease });
    default:
      throw new Error(`Invalid part: ${part}`);
  }
}

/** Get the distance between two versions in terms of releases */
export function versionDistance(from: string, to: string): number {
  const f = parseSemVer(from);
  const t = parseSemVer(to);
  if (!f || !t) return -1;

  // Simple distance calculation
  const fromValue = f.major * 1000000 + f.minor * 1000 + f.patch;
  const toValue = t.major * 1000000 + t.minor * 1000 + t.patch;
  return Math.abs(toValue - fromValue);
}

/** Sort an array of version strings */
export function sortVersions(versions: string[], order: "asc" | "desc" = "asc"): string[] {
  return [...versions].sort((a, b) => {
    const cmp = compareSemVer(a, b);
    return order === "asc" ? cmp : -cmp;
  });
}

/** Get the latest version from an array */
export function getLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  return sortVersions(versions, "desc")[0]!;
}

/** Validate a semver string */
export function isValidSemVer(version: string): boolean {
  return parseSemVer(version) !== null;
}

/** Extract all version strings from text */
export function extractVersions(text: string): string[] {
  const pattern = /v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?)/g;
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    matches.push(m[1]!);
  }
  return matches;
}

/** Check if a version is a prerelease */
export function isPrerelease(version: string): boolean {
  const parsed = parseSemVer(version);
  return !!parsed?.prerelease;
}

/** Strip prerelease and build metadata */
export function coerce(version: string): string {
  const parsed = parseSemVer(version);
  if (!parsed) return version;
  return formatSemVer({ major: parsed.major, minor: parsed.minor, patch: parsed.patch });
}
