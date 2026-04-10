/**
 * Fuzzy matching and string similarity algorithms.
 */

/** Levenshtein edit distance */
export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1,     // insertion
          matrix[i - 1]![j]! + 1,     // deletion
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

/** Damerau-Levenshtein distance (includes transpositions) */
export function damerauLevenshtein(a: string, b: string): number {
  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0) return lenB;
  if (lenB === 0) return lenA;

  const matrix: number[][] = Array.from({ length: lenB + 1 }, () =>
    Array(lenA + 1).fill(0),
  );

  for (let i = 0; i <= lenB; i++) matrix[i]![0] = i;
  for (let j = 0; j <= lenA; j++) matrix[0]![j] = j;

  for (let i = 1; i <= lenB; i++) {
    for (let j = 1; j <= lenA; j++) {
      let cost = 1;
      if (a.charAt(j - 1) === b.charAt(i - 1)) cost = 0;

      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,         // deletion
        matrix[i]![j - 1]! + 1,         // insertion
        matrix[i - 1]![j - 1]! + cost, // substitution
      );

      // Transposition
      if (
        i > 1 && j > 1 &&
        a.charAt(j - 1) === b.charAt(i - 2) &&
        a.charAt(j - 2) === b.charAt(i - 1)
      ) {
        matrix[i]![j] = Math.min(matrix[i]![j]!, matrix[i - 2]![j - 2]! + cost);
      }
    }
  }

  return matrix[lenB]![lenA]!;
}

/** Jaro-Winkler similarity (0-1 scale) */
export function jaroWinkler(a: string, b: string, prefixScale = 0.1): number {
  if (a === b) return 1;

  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0 || lenB === 0) return 0;

  const matchDistance = Math.floor(Math.max(lenA, lenB) / 2) - 1;
  if (matchDistance < 0) return 0;

  const matchesA = new Array(lenA).fill(false);
  const matchesB = new Array(lenB).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < lenA; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, lenB);

    for (let j = start; j < end; j++) {
      if (matchesB[j] || a.charAt(i) !== b.charAt(j)) continue;
      matchesA[i] = true;
      matchesB[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < lenA; i++) {
    if (!matchesA[i]) continue;
    while (!matchesB[k]) k++;
    if (a.charAt(i) !== b.charAt(k)) transpositions++;
    k++;
  }

  const jaro = (
    matches / lenA +
    matches / lenB +
    (matches - transpositions / 2) / matches
  ) / 3;

  // Winkler prefix bonus
  let prefixLen = 0;
  for (let i = 0; i < Math.min(lenA, lenB); i++) {
    if (a.charAt(i) !== b.charAt(i)) break;
    prefixLen++;
  }

  return jaro + Math.min(prefixLen * prefixScale, 0.4) * (1 - jaro);
}

/** Cosine similarity between two strings (character n-gram based) */
export function cosineSimilarity(a: string, b: string, n = 2): number {
  const vecA = buildNGramVector(a, n);
  const vecB = buildNGramVector(b, n);

  const allTerms = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (const term of allTerms) {
    const va = vecA[term] ?? 0;
    const vb = vecB[term] ?? 0;
    dotProduct += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

function buildNGramVector(text: string, n: number): Record<string, number> {
  const vector: Record<string, number> = {};
  const normalized = text.toLowerCase();

  for (let i = 0; i <= normalized.length - n; i++) {
    const gram = normalized.slice(i, i + n);
    vector[gram] = (vector[gram] ?? 0) + 1;
  }

  return vector;
}

/** Sørensen-Dice coefficient (bigram overlap) */
export function sorensenDice(a: string, b: string): number {
  const bigramsA = getBigrams(a.toLowerCase());
  const bigramsB = getBigrams(b.toLowerCase());

  const intersection = new Set<string>();
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) intersection.add(bigram);
  }

  const unionSize = bigramsA.size + bigramsB.size;
  if (unionSize === 0) return 1;
  return (2 * intersection.size) / unionSize;
}

function getBigrams(text: string): Set<string> {
  const bigrams = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) {
    bigrams.add(text.slice(i, i + 2));
  }
  return bigrams;
}

/** Fuzzy search: find best match(es) from candidates */
export function fuzzySearch(
  query: string,
  candidates: string[],
  options: FuzzySearchOptions = {},
): FuzzySearchResult[] {
  const {
    threshold = 0.3,
    algorithm = "jaroWinkler",
    maxResults = 10,
    caseSensitive = false,
  } = options;

  const q = caseSensitive ? query : query.toLowerCase();

  const scored = candidates.map((candidate) => {
    const c = caseSensitive ? candidate : candidate.toLowerCase();
    let score: number;

    switch (algorithm) {
      case "levenshtein": {
        const dist = levenshtein(q, c);
        score = 1 - dist / Math.max(q.length, c.length);
        break;
      }
      case "cosine":
        score = cosineSimilarity(q, c);
        break;
      case "dice":
        score = sorensenDice(q, c);
        break;
      case "jaroWinkler":
      default:
        score = jaroWinkler(q, c);
        break;
    }

    // Bonus for exact substring match
    if (c.includes(q)) score = Math.min(1, score + 0.1);
    // Bonus for starting with query
    if (c.startsWith(q)) score = Math.min(1, score + 0.15);

    return { candidate, score, rank: 0 };
  })
  .filter((r) => r.score >= threshold)
  .sort((a, b) => b.score - a.score)
  .slice(0, maxResults);

  // Assign ranks
  scored.forEach((r, i) => { r.rank = i + 1; });

  return scored;
}

export interface FuzzySearchOptions {
  /** Minimum similarity score (0-1) */
  threshold?: number;
  /** Algorithm to use */
  algorithm?: "levenshtein" | "jaroWinkler" | "cosine" | "dice";
  /** Max results to return */
  maxResults?: number;
  /** Case sensitive comparison */
  caseSensitive?: boolean;
}

export interface FuzzySearchResult {
  candidate: string;
  score: number;
  rank: number;
}

/** Find best single match */
export function findBestMatch(
  query: string,
  candidates: string[],
  minScore = 0.3,
): FuzzySearchResult | null {
  const results = fuzzySearch(query, candidates, { threshold: minScore, maxResults: 1 });
  return results[0] ?? null;
}

/** Check if two strings are approximately equal within tolerance */
export function approximatelyEqual(
  a: string,
  b: string,
  tolerance = 0.9,
): boolean {
  return jaroWinkler(a, b) >= tolerance;
}

/** Generate spelling suggestions for a word */
export function suggestSpelling(
  word: string,
  dictionary: string[],
  maxSuggestions = 5,
): FuzzySearchResult[] {
  return fuzzySearch(word, dictionary, {
    threshold: 0.6,
    algorithm: "jaroWinkler",
    maxResults: maxSuggestions,
  });
}
