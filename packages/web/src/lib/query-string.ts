/**
 * Query string parsing, building, and manipulation utilities.
 */

// --- Types ---

export interface QueryStringOptions {
  /** Parse numbers as number type (default: true) */
  parseNumbers?: boolean;
  /** Parse booleans ("true"/"false") as boolean (default: true) */
  parseBooleans?: boolean;
  /** Decode URI components (default: true) */
  decode?: boolean;
  /** Separator for repeated keys (default: ",") */
  arraySeparator?: string;
}

export interface StringifyOptions {
  /** Encode values (default: true) */
  encode?: boolean;
  /** Skip null/undefined values (default: true) */
  skipNull?: boolean;
  /** Skip empty strings (default: false) */
  skipEmpty?: boolean;
  /** Array format: "indices" (a[0]=x), "brackets" (a[]=x), "repeat" (a=x&a=x), "comma" (a=x,y) */
  arrayFormat?: "indices" | "brackets" | "repeat" | "comma";
  /** Prefix with "?" */
  addPrefix?: boolean;
  /** Sort keys alphabetically */
  sort?: boolean;
}

// --- Parsing ---

/**
 * Parse a query string into an object.
 */
export function parse(
  queryString: string,
  options: QueryStringOptions = {},
): Record<string, unknown> {
  const {
    parseNumbers = true,
    parseBooleans = true,
    decode = true,
    arraySeparator = ",",
  } = options;

  if (!queryString || typeof queryString !== "string") return {};

  // Strip leading ? or #
  let qs = queryString.trim();
  if (qs.startsWith("?")) qs = qs.slice(1);
  if (qs.startsWith("#")) qs = qs.slice(1);

  if (!qs) return {};

  const result: Record<string, unknown> = {};
  const pairs = qs.split("&");

  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;

    const rawKey = pair.slice(0, eqIdx);
    const rawValue = pair.slice(eqIdx + 1);

    const key = decode ? decodeSafe(rawKey) : rawKey;
    let value: unknown = decode ? decodeSafe(rawValue) : rawValue;

    // Auto-type conversion
    if (parseNumbers && /^-?\d+(\.\d+)?$/.test(value as string)) {
      value = (value as string).includes(".")
        ? parseFloat(value as string)
        : parseInt(value as string, 10);
    }

    if (parseBooleans && typeof value === "string") {
      if (value === "true") value = true;
      else if (value === "false") value = false;
    }

    // Handle arrays (repeated keys)
    if (key in result) {
      const existing = result[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        result[key] = [existing, value];
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Parse a URL's query string into an object.
 */
export function parseUrlQuery(url: string, options?: QueryStringOptions): Record<string, unknown> {
  try {
    const parsed = new URL(url, typeof location !== "undefined" ? location.href : "https://example.com");
    return parse(parsed.search, options);
  } catch {
    return {};
  }
}

// --- Stringifying ---

/**
 * Build a query string from an object.
 */
export function stringify(
  params: Record<string, unknown>,
  options: StringifyOptions = {},
): string {
  const {
    encode = true,
    skipNull = true,
    skipEmpty = false,
    arrayFormat = "repeat",
    addPrefix = false,
    sort = false,
  } = options;

  const parts: string[] = [];

  const entries = sort
    ? Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
    : Object.entries(params);

  for (const [key, rawValue] of entries) {
    const value = rawValue;

    // Skip handling
    if (value === undefined || value === null) {
      if (!skipNull) parts.push(`${encode ? encodeURIComponent(key) : key}=`);
      continue;
    }
    if (value === "" && skipEmpty) continue;

    // Array handling
    if (Array.isArray(value)) {
      if (arrayFormat === "comma") {
        const strVal = value.map((v) => String(v)).join(",");
        parts.push(pair(key, strVal, encode));
      } else if (arrayFormat === "indices") {
        value.forEach((v, i) => {
          parts.push(pair(`${key}[i]`, v, encode));
        });
      } else if (arrayFormat === "brackets") {
        value.forEach((v) => {
          parts.push(pair(`${key}[]`, v, encode));
        });
      } else {
        // repeat
        value.forEach((v) => {
          parts.push(pair(key, v, encode));
        });
      }
      continue;
    }

    // Nested object
    if (typeof value === "object" && !Array.isArray(value)) {
      const nested = flattenObject(value, key);
      for (const [nk, nv] of nested) {
        parts.push(pair(nk, nv, encode));
      }
      continue;
    }

    parts.push(pair(key, value, encode));
  }

  const result = parts.join("&");
  return addPrefix && result ? `?${result}` : result;
}

// --- Manipulation ---

/**
 * Get a single query parameter value.
 */
export function getParam(
  urlOrSearch: string,
  key: string,
  options?: QueryStringOptions,
): string | undefined {
  const params = parse(urlOrSearch.includes("?")
    ? urlOrSearch.split("?")[1]!
    : urlOrSearch,
    options
  );
  const val = params[key];
  return val !== undefined ? String(val) : undefined;
}

/**
 * Set or update a query parameter on a URL/search string.
 */
export function setParam(
  urlOrSearch: string,
  key: string,
  value: unknown,
  stringifyOpts?: StringifyOptions,
): string {
  const hasQuery = urlOrSearch.includes("?");
  const base = hasQuery
    ? urlOrSearch.slice(0, urlOrSearch.indexOf("?"))
    : urlOrSearch;
  const search = hasQuery ? urlOrSearch.slice(urlOrSearch.indexOf("?")) : "";

  const params = parse(search);
  params[key] = value;

  const newSearch = stringify(params as Record<string, unknown>, stringifyOpts);
  return base + newSearch;
}

/**
 * Remove a query parameter.
 */
export function removeParam(urlOrSearch: string, key: string): string {
  const hasQuery = urlOrSearch.includes("?");
  if (!hasQuery) return urlOrSearch;

  const base = urlOrSearch.slice(0, urlOrSearch.indexOf("?"));
  const search = urlOrSearch.slice(urlOrSearch.indexOf("?"));

  const params = parse(search);
  delete params[key];

  const newSearch = stringify(params as Record<string, unknown>);
  return newSearch ? base + newSearch : base;
}

/**
 * Toggle a boolean query parameter.
 */
export function toggleParam(urlOrSearch: string, key: string): string {
  const current = getParam(urlOrSearch, key);
  if (current === "true" || current === "1") {
    return removeParam(urlOrSearch, key);
  }
  return setParam(urlOrSearch, key, "true");
}

/**
 * Merge query parameters into an existing URL/search string.
 */
export function mergeParams(
  urlOrSearch: string,
  extra: Record<string, unknown>,
  options?: { overwrite?: boolean; stringifyOpts?: StringifyOptions },
): string {
  const hasQuery = urlOrSearch.includes("?");
  const base = hasQuery
    ? urlOrSearch.slice(0, urlOrSearch.indexOf("?"))
    : urlOrSearch;
  const search = hasQuery ? urlOrSearch.slice(urlOrSearch.indexOf("?")) : "";

  const existing = parse(search);

  for (const [key, value] of Object.entries(extra)) {
    if (options?.overwrite !== false || !(key in existing)) {
      existing[key] = value;
    }
  }

  const newSearch = stringify(existing as Record<string, unknown>, options?.stringifyOpts);
  return base + newSearch;
}

/**
 * Extract only specified query parameters.
 */
export function pickParams(
  urlOrSearch: string,
  keys: string[],
  options?: StringifyOptions,
): string {
  const params = parse(urlOrSearch.includes("?")
    ? urlOrSearch.split("?")[1]!
    : urlOrSearch
  );
  const picked: Record<string, unknown> = {};

  for (const key of keys) {
    if (key in params) picked[key] = params[key];
  }

  return stringify(picked, options);
}

/**
 * Exclude specific query parameters.
 */
export function omitParams(
  urlOrSearch: string,
  keys: string[],
  options?: StringifyOptions,
): string {
  const params = parse(urlOrSearch.includes("?")
    ? urlOrSearch.split("?")[1]!
    : urlOrSearch
  );

  for (const key of keys) delete params[key];

  return stringify(params as Record<string, unknown>, options);
}

// --- Encoding Helpers ---

/** Safely decode a URI component (returns original on error) */
function decodeSafe(str: string): string {
  try {
    return decodeURIComponent(str.replace(/\+/g, " "));
  } catch {
    return str;
  }
}

/** Create a key=value pair */
function pair(key: string, value: unknown, encode: boolean): string {
  const encKey = encode ? encodeURIComponent(key) : key;
  const encVal = encode ? encodeURIComponent(String(value)) : String(value);
  return `${encKey}=${encVal}`;
}

/** Flatten nested object into dot-notation keys */
function flattenObject(
  obj: Record<string, unknown>,
  prefix: string,
): Array<[string, unknown]> {
  const result: Array<[string, unknown]> = [];

  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      result.push(...flattenObject(v as Record<string, unknown>, fullKey));
    } else {
      result.push([fullKey, v]);
    }
  }

  return result;
}
