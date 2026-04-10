/**
 * Pattern matching and text processing utilities.
 */

/** Simple glob pattern to regex conversion */
export function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regex = escaped
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${regex}$`);
}

/** Check if string matches a glob pattern */
export function isGlobMatch(str: string, pattern: string): boolean {
  return globToRegex(pattern).test(str);
}

/** Wildcard match (supports * and ?) */
export function wildcardMatch(str: string, pattern: string): boolean {
  const sLen = str.length;
  const pLen = pattern.length;
  let si = 0, pi = 0;
  let starIdx = -1, matchIdx = 0;

  while (si < sLen) {
    if (pi < pLen && (pattern[pi] === "?" || pattern[pi] === str[si])) {
      si++;
      pi++;
    } else if (pi < pLen && pattern[pi] === "*") {
      starIdx = pi;
      matchIdx = si;
      pi++;
    } else if (starIdx !== -1) {
      pi = starIdx + 1;
      matchIdx++;
      si = matchIdx;
    } else {
      return false;
    }
  }

  while (pi < pLen && pattern[pi] === "*") pi++;

  return pi === pLen;
}

/** Levenshtein distance between two strings */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

/** Fuzzy string matching (returns score 0-1, higher = better match) */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  let ti = 0;
  let score = 0;
  const consecutiveBonus = 5;

  while (qi < q.length && ti < t.length) {
    if (q[qi] === t[ti]) {
      score += 10;
      // Bonus for consecutive matches at word boundaries
      if (qi > 0 && q[qi - 1] === t[ti - 1]) score += consecutiveBonus;
      if (ti === 0 || t[ti - 1] === " " || t[ti - ] === "-") score += consecutiveBonus;
      qi++;
    }
    ti++;
  }

  if (qi < q.length) return 0;
  return score / (q.length * (10 + consecutiveBonus));
}

/** Find closest match from a list of candidates */
export function findBestMatch(
  query: string,
  candidates: string[],
): { best: string; score: number } | null {
  let best = "";
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = fuzzyScore(query, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore > 0 ? { best, score: bestScore } : null;
}

/** CamelCase to words (e.g., "camelCaseString" → "camel case string") */
export function camelToWords(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase();
}

/** Kebab-case to words (e.g., "kebab-case-string" → "kebab case string") */
export function kebabToWords(str: string): string {
  return str.replace(/-/g, " ").toLowerCase();
}

/** Snake_case to words */
export function snakeToWords(str: string): string {
  return str.replace(/_/g, " ").toLowerCase();
}
