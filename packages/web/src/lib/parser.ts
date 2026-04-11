/**
 * Parser: General-purpose parser combinators and utilities for building
 * safe, composable parsers for strings, numbers, dates, URLs,
 * CSV, query strings, and custom formats.
 *
 * Provides:
 *   - Parser<T> composable type with success/failure result
 *   - Char/class-level parsers (digit, letter, whitespace, etc.)
 *   - String parsers (exact, prefix, suffix, regex, oneOf)
 *   - Number parsers (int, float, bounded)
 *   - Combinators: sequence, choice, many, optional, separatedBy, map
 *   - Built-in parsers for common formats (email, URL, UUID, date, hex color, JSON)
 *   - ParseResult with position tracking for error reporting
 *   - Parser composition DSL (monadic bind/map/then)
 */

// --- Core Types ---

export interface ParseResult<T> {
  success: boolean;
  value: T;
  rest: string;
  position: number;
  error?: string;
  expected?: string;
}

export type Parser<T> = (input: string, position?: number) => ParseResult<T>;

export interface ParserCombinators<T> {
  /** Run this parser, then run next if successful */
  then<U>(next: Parser<U>): Parser<U>;
  /** Map over the result of this parser */
  map<U>(fn: (value: T) => U): Parser<U>;
  /** Return a default if this parser fails */
  or(defaultValue: T): Parser<T>;
  /** Filter: only succeed if predicate passes */
  filter(predicate: (value: T) => boolean): Parser<T>;
  /** Label this parser for better error messages */
  label(name: string): Parser<T>;
  /** Run but don't consume input (lookahead) */
  peek(): Parser<T>;
}

// --- Char Parsers ---

/** Parse exactly one character matching predicate */
export const char = (predicate: (ch: string) => boolean, expected = "character"): Parser<string> =>
  (input, pos = 0) => {
    if (pos >= input.length) return fail(input, pos, expected, "EOF");
    const ch = input[pos]!;
    return predicate(ch) ? success(ch, input.slice(pos + 1), pos + 1) : fail(input, pos, expected, `"${ch}"`);
  };

export const digit = char(/\d/.test.bind(/\d/), "digit");
export const letter = char(/[a-zA-Z]/.test, "letter");
export const hexDigit = char(/[\da-fA-F]/.test, "hex digit");
export const whitespace = char(/\s/.test.bind(/\s/), "whitespace");

/** Parse a specific string literal */
export const str = (literal: string): Parser<string> =>
  (input, pos = 0) => {
    if (input.slice(pos, pos + literal.length) === literal)
      return success(literal, input.slice(pos + literal.length), pos + literal.length);
    return fail(input, pos, `"${literal}"`, `got "${input.slice(pos, pos + 20)}"` );
  };

/** Parse using regex (must match at position) */
export const regex = (pattern: RegExp, expected = "match"): Parser<string> =>
  (input, pos = 0) => {
    pattern.lastIndex = 0;
    const match = pattern.exec(input.slice(pos));
    if (match && match.index === 0)
      return success(match[0], input.slice(pos + match[0].length), pos + match[0].length);
    return fail(input, pos, expected);
  };

// --- Number Parsers ---

/** Parse an integer */
export const int: Parser<number> = (input, pos = 0) => {
  const start = pos;
  if (pos >= input.length || !/\d/.test(input[pos]!])) return fail(input, pos, "integer");
  while (pos < input.length && /\d/.test(input[pos]!)) pos++;
  return success(parseInt(input.slice(start, pos), 10), input.slice(pos), pos);
};

/** Parse a float */
export const float: Parser<number> = (input, pos = 0) => {
  const start = pos;
  if (pos >= input.length || !/\d/.test(input[pos]!])) return fail(input, pos, "float");
  while (pos < input.length && /\d/.test(input[pos]!])) pos++;
  if (pos < input.length && input[pos] === ".") {
    pos++;
    while (pos < input.length && /\d/.test(input[pos]!])) pos++;
  }
  return parseFloat(input.slice(start, pos)), input.slice(pos), pos;
};

/** Parse int within bounds */
export const intRange = (min: number, max: number): Parser<number> =>
  int.chain((n) => n >= min && n <= max ? success(n) : fail(`number between ${min} and ${max}`));

// --- Combinators ---

function success<T>(value: T, rest: string, position: number): ParseResult<T> {
  return { success: true, value, rest, position, error: undefined, expected: undefined };
}

function fail(input: string, position: number, expected?: string, got?: string): ParseResult<never> {
  return { success: false, value: undefined as never, rest: input, position, error: `Expected ${expected}${got ? `, got "${got}"` : ""}`, expected };
}

/** Sequence: run parsers in order, return last value */
export const seq = <T extends unknown[]>(...parsers: Parser<unknown>[]): Parser<T> =>
  (input, pos = 0) => {
    let currentPos = pos;
    const values: unknown[] = [];
    for (const p of parsers) {
      const r = p(input, currentPos);
      if (!r.success) return fail(input, currentPos, r.expected);
      values.push(r.value);
      currentPos = r.position;
    }
    return success(values as T, input.slice(currentPos), currentPos);
  };

/** Choice: try each parser, return first success */
export const choice = <T>(...parsers: Parser<T>[]): Parser<T> =>
  (input, pos = 0) => {
    const errors: string[] = [];
    for (const p of parsers) {
      const r = p(input, pos);
      if (r.success) return r;
      errors.push(r.error ?? "unknown error");
    }
    return fail(input, pos, `one of (${errors.join(", ")})`);
  };

/** Many: parse zero or more occurrences */
export const many = <T>(parser: Parser<T>, min = 0, max = Infinity): Parser<T[]> =>
  (input, pos = 0) => {
    const results: T[] = [];
    while (results.length < max) {
      const r = parser(input, pos);
      if (!r.success) break;
      results.push(r.value);
      pos = r.position;
    }
    if (results.length < min) return fail(input, pos, `at least ${min} items`);
    return success(results, input.slice(pos), pos);
  };

/** Optional: parse zero or one */
export const optional = <T>(parser: Parser<T>): Parser<T | null> =>
  choice<T>(parser, (input, pos) => success(null as T, input, pos));

/** Separated by delimiter */
export const separatedBy = <T>(delimiter: string | Parser<string>, itemParser: Parser<T>): Parser<T[]> => {
  const delimParser = typeof delimiter === "string" ? str(delimiter) : delimiter;
  return (input, pos = 0) => {
    const results: T[] = [];
    if (input.length === pos) return success(results, input, pos);
    // Parse first item
    const first = itemParser(input, pos);
    if (!first.success) return fail(input, pos, "item");
    results.push(first.value);
    let currentPos = first.position;
    // Parse delimiter + item pairs
    while (currentPos < input.length) {
      const d = delimParser(input, currentPos);
      if (!d.success) break;
      currentPos = d.position;
      const item = itemParser(input, currentPos);
      if (!item.success) break;
      results.push(item.value);
      currentPos = item.position;
    }
    return success(results, input.slice(currentPos), currentPos);
  };
};

/** Map each parsed item */
export const mapParsers = <I, O>(itemParser: Parser<I>, fn: (val: I) => O): Parser<O[]> =>
  many(itemParser).map((items) => items.map(fn));

// --- Extend Parser with combinators ---

declare module "parser" {
  interface Parser<T> {
    (input: string, position?: number): ParseResult<T>;
    then<U>(next: Parser<U>): Parser<U>;
    map<U>(fn: (value: T) => U): Parser<U>;
    or(defaultValue: T): Parser<T>;
    filter(predicate: (value: T) => boolean): Parser<T>;
    label(name: string): Parser<T>;
    peek(): Parser<T>;
  }
}

// Monkey-patch Parser prototype to add combinators
const proto = Object.create(null) as ParserCombinators<unknown>;
proto.then = function<U>(this: Parser<unknown>, next: Parser<U>) {
  const self = this;
  return (input, pos) => {
    const r = self(input, pos);
    if (!r.success) return r;
    return next(r.rest, r.position);
  };
};
proto.map = function<U>(this: Parser<unknown>, fn: (val: unknown) => U) {
  const self = this;
  return (input, pos) => {
    const r = self(input, pos);
    if (!r.success) return r;
    return success(fn(r.value), r.rest, r.position);
  };
};
proto.or = function(this: Parser<unknown>, defaultValue: unknown) {
  const self = this;
  return (input, pos) => {
    const r = self(input, pos);
    return r.success ? r : success(defaultValue, r.rest, r.position);
  };
};
proto.filter = function(this: Parser<unknown>, predicate: (val: unknown) => boolean) {
  const self = this;
  return (input, pos) => {
    const r = self(input, pos);
    if (!r.success) return r;
    return predicate(r.value) ? r : fail(input, pos, "filter predicate");
  };
};
proto.label = function(this: Parser<unknown>, name: string) {
  const self = this;
  return (input, pos) => {
    const r = self(input, pos);
    if (!r.success) { r.error = `${name}: ${r.error}`; r.expected = name; return r; }
    return r;
  };
};
proto.peek = function(this: Parser<unknown>) {
  const self = this;
  return (input, pos) => {
    const r = self(input, pos);
    // Don't advance position
    return { ...r, position: pos };
  };
};

Object.setPrototypeOf(char, proto);
Object.setPrototypeOf(str, proto);
Object.setPrototypeOf(regex, proto);
Object.setPrototypeOf(int, proto);
Object.setPrototypeOf(float, proto);
Object.setPrototypeOf(seq, proto);
Object.setPrototypeOf(choice, proto);
Object.setPrototypeOf(many, proto);
Object.setPrototypeOf(optional, proto);
Object.setPrototypeOf(separatedBy, proto);
Object.setPrototypeOf(mapParsers, proto);

// --- Built-in Parsers ---

/** Email address parser */
export const email: Parser<string> = regex(
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  "email address"
).label("email").filter((v) => v.includes("@"));

/** URL parser */
export const url: Parser<string> = regex(
  /^https?:\/\/[^\s]+/,
  "URL"
).label("URL").filter((v) => v.length > 4);

/** UUID parser */
export const uuid: Parser<string> = regex(
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i,
  "UUID"
).label("UUID");

/** Hex color (#RGB or #RRGGBB) */
export const hexColor: Parser<string> = regex(
  /^#(?:[\da-fA-F]{3}){1,2}\b/i,
  "hex color"
).label("color");

/** JSON object/array parser */
export const json: Parser<unknown> = (input, pos = 0) => {
  const trimmed = input.slice(pos).trimStart();
  if (!trimmed) return fail(input, pos, "JSON");
  try {
    const parsed = JSON.parse(trimmed);
    const endPos = pos + input.slice(pos).indexOf(trimmed) + trimmed.length;
    return success(parsed, input.slice(endPos), endPos);
  } catch {
    return fail(input, pos, "valid JSON");
  }
}.label("JSON");

/** Query string key=value parser */
export const queryParam: Parser<[string, string]> = seq(
  regex(/^[^=]+/).label("key"),
  str("=").or(() => success("", "")),
  regex(/^[^&]*/).label("value")
).map(([k, , v]) => [k, v]);

/** Full query string parser (?key=val&key2=val2) */
export const queryString = separatedBy(
  str("&"),
  queryParam
).label("query string");

/** CSV row parser */
export const csvRow = (delimiter = ","): Parser<string[]> =>
  separatedBy(
    str(delimiter),
    regex(/^(?:"[^"]*""|[^,]*)*/).label("CSV field")
  ).map((fields) => fields.map((f) => f.replace(/^"|"$/g, "")));

/** CSV parser (header + rows) */
export const csv = (delimiter = ",", hasHeader = true): Parser<{ headers: string[]; rows: string[][] }> =>
  (input, pos = 0) => {
    let currentPos = pos;
    let headers: string[] = [];
    if (hasHeader) {
      const h = csvRow(delimiter)(input, currentPos);
      if (!h.success) return h;
      headers = h.value;
      currentPos = h.position;
      // Skip newline
      if (currentPos < input.length && input[currentPos] === "\n") currentPos++;
    }
    const rowsResult = many(csvRow(delimiter))(input, currentPos);
    if (!rowsResult.success) return rowsResult;
    return success({ headers, rows: rowsResult.value }, input.slice(rowsResult.position), rowsResult.position);
  }.label("CSV");
