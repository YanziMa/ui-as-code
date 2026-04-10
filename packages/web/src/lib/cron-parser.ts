/**
 * Cron expression parser and scheduler: parse cron syntax, calculate next/previous
 * run times, human-readable descriptions, validation, timezone support.
 */

export interface CronFields {
  minute: number[];    // 0-59
  hour: number[];      // 0-23
  dayOfMonth: number[]; // 1-31
  month: number[];     // 1-12
  dayOfWeek: number[]; // 0-6 (0=Sunday)
}

export interface CronExpression {
  raw: string;
  fields: CronFields;
  /** Seconds field (optional, some systems include it) */
  seconds?: number[];
}

export interface ParsedCron {
  expression: CronExpression;
  description: string;
  nextRuns: Date[];
  previousRuns: Date[];
  isValid: boolean;
  errors?: string[];
}

// --- Parser ---

/** Parse a cron expression string into structured fields */
export function parseCron(expression: string): CronExpression | null {
  const trimmed = expression.trim();

  // Handle optional seconds field (6 parts)
  const parts = trimmed.split(/\s+/);

  if (parts.length < 5 || parts.length > 6) return null;

  let offset = 0;
  let seconds: number[] | undefined;

  if (parts.length === 6) {
    seconds = parseField(parts[0]!, 0, 59);
    if (!seconds) return null;
    offset = 1;
  }

  const minute = parseField(parts[offset]!, 0, 59);
  const hour = parseField(parts[offset + 1]!, 0, 23);
  const dayOfMonth = parseField(parts[offset + 2]!, 1, 31);
  const month = parseField(parts[offset + 3]!, 1, 12);
  const dayOfWeek = parseField(parts[offset + 4]!, 0, 6);

  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) return null;

  return {
    raw: trimmed,
    fields: { minute, hour, dayOfMonth, month, dayOfWeek },
    ...(seconds !== undefined ? { seconds } : {}),
  };
}

/** Parse a single cron field (e.g., "1,3,5", "*/15", "1-5", "*") */
function parseField(field: string, min: number, max: number): number[] | null {
  const values = new Set<number>();

  const parts = field.split(",");

  for (const part of parts) {
    // Step (e.g., */15 or 1-20/5)
    if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr!, 10);
      if (isNaN(step) || step <= 0) return null;

      if (range === "*") {
        for (let i = min; i <= max; i += step) values.add(i);
      } else if (range.includes("-")) {
        const [startStr, endStr] = range.split("-");
        const start = parseInt(startStr!, 10);
        const end = parseInt(endStr!, 10);
        if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) return null;
        for (let i = start; i <= end; i += step) values.add(i);
      } else {
        return null;
      }
    }
    // Range (e.g., 1-5)
    else if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr!, 10);
      const end = parseInt(endStr!, 10);
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) return null;
      for (let i = start; i <= end; i++) values.add(i);
    }
    // Wildcard
    else if (part === "*" || part === "?") {
      for (let i = min; i <= max; i++) values.add(i);
    }
    // Single value
    else {
      const val = parseInt(part, 10);
      if (isNaN(val) || val < min || val > max) return null;
      values.add(val);
    }
  }

  return Array.from(values).sort((a, b) => a - b);
}

// --- Validation ---

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Validate a cron expression */
export function validateCron(expression: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length < 5 || parts.length > 6) {
    errors.push(`Expected 5 or 6 fields, got ${parts.length}`);
    return { valid: false, errors, warnings };
  }

  const hasSeconds = parts.length === 6;
  const fieldNames = hasSeconds
    ? ["seconds", "minutes", "hours", "day of month", "month", "day of week"]
    : ["minutes", "hours", "day of month", "month", "day of week"];
  const ranges = hasSeconds
    ? [[0, 59], [0, 59], [0, 23], [1, 31], [1, 12], [0, 6]]
    : [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];

  for (let i = 0; i < parts.length; i++) {
    const [min, max] = ranges[i]!;
    const result = validateField(parts[i]!, min, max);
    if (!result.valid) errors.push(`${fieldNames[i]}: ${result.error}`);
  }

  // Check for impossible combinations
  const parsed = parseCron(expression);
  if (parsed && parsed.fields.dayOfMonth.length === 1 && parsed.fields.dayOfMonth[0] === 31) {
    warnings.push("Day-of-month is set to 31 — this won't run in months with fewer than 31 days");
  }
  if (parsed && parsed.fields.month.some((m) => ![1, 3, 5, 7, 8, 10, 12].includes(m)) &&
      parsed.fields.dayOfMonth.some((d) => d === 31)) {
    warnings.push("Combination may skip execution in some months");
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateField(field: string, min: number, max: number): { valid: boolean; error?: string } {
  try {
    const result = parseField(field, min, max);
    if (!result) return { valid: false, error: `Invalid format: "${field}"` };
    return { valid: true };
  } catch {
    return { valid: false, error: `Parse error: "${field}"` };
  }
}

// --- Next/Previous Run Time Calculation ---

/** Get the next N run times after a given date */
export function getNextRuns(
  expression: string,
  fromDate = new Date(),
  count = 5,
): Date[] {
  const parsed = parseCron(expression);
  if (!parsed) return [];

  const runs: Date[] = [];
  let current = new Date(fromDate);

  // Move to next second to avoid matching current moment
  current.setSeconds(current.getSeconds() + 1);

  const maxIterations = 366 * 24 * 60 * 60; // Safety limit: 1 year in seconds
  let iterations = 0;

  while (runs.length < count && iterations < maxIterations) {
    iterations++;

    if (matchesCron(parsed, current)) {
      runs.push(new Date(current));
    }

    // Advance by smallest field granularity
    if (parsed.seconds) {
      current.setSeconds(current.getSeconds() + 1);
    } else {
      current.setMinutes(current.getMinutes() + 1);
    }

    // If we've gone too far without matches, stop
    if (iterations > maxIterations / 2 && runs.length === 0) break;
  }

  return runs;
}

/** Get the previous N run times before a given date */
export function getPreviousRuns(
  expression: string,
  beforeDate = new Date(),
  count = 5,
): Date[] {
  const parsed = parseCron(expression);
  if (!parsed) return [];

  const runs: Date[] = [];
  let current = new Date(beforeDate);

  // Go back one unit so we don't match the exact current time
  if (parsed.seconds) {
    current.setSeconds(current.getSeconds() - 1);
  } else {
    current.setMinutes(current.getMinutes() - 1);
  }

  const maxIterations = 366 * 24 * 60;
  let iterations = 0;

  while (runs.length < count && iterations < maxIterations) {
    iterations++;

    if (matchesCron(parsed, current)) {
      runs.push(new Date(current));
    }

    if (parsed.seconds) {
      current.setSeconds(current.getSeconds() - 1);
    } else {
      current.setMinutes(current.getMinutes() - 1);
    }

    if (iterations > maxIterations / 2 && runs.length === 0) break;
  }

  return runs.reverse();
}

/** Check if a date matches a cron expression */
export function matchesCron(cron: CronExpression, date: Date): boolean {
  const { fields } = cron;

  // Check each field
  if (cron.seconds && !cron.seconds.includes(date.getSeconds())) return false;
  if (!fields.minute.includes(date.getMinutes())) return false;
  if (!fields.hour.includes(date.getHours())) return false;
  if (!fields.month.includes(date.getMonth() + 1)) return false;

  // Day of month OR day of week (special cron logic: either can match)
  const domMatch = fields.dayOfMonth.includes(date.getDate());
  const dowMatch = fields.dayOfWeek.includes(date.getDay());

  // In cron, if both are restricted (not *), either can match
  const domRestricted = fields.dayOfMonth.length < 31;
  const dowRestricted = fields.dayOfWeek.length < 7;

  if (domRestricted && dowRestricted) {
    // Either day-of-month OR day-of-week must match
    if (!domMatch && !dowMatch) return false;
  } else if (domRestricted && !domMatch) {
    return false;
  } else if (dowRestricted && !dowMatch) {
    return false;
  }

  return true;
}

// --- Human-Readable Description ---

/** Generate a human-readable description of a cron expression */
export function describeCron(expression: string): string {
  const parsed = parseCron(expression);
  if (!parsed) return "Invalid cron expression";

  const { fields } = parsed;
  const descParts: string[] = [];

  // Minute description
  descParts.push(describeField(fields.minute, "minute"));

  // Hour description
  descParts.push(describeField(fields.hour, "hour", true));

  // Day of month
  if (fields.dayOfMonth.length < 31) {
    desc.push(`on the ${describeList(fields.dayOfMonth.map((d) => ordinal(d)))} of the month`);
  }

  // Month
  if (fields.month.length < 12) {
    const months = fields.month.map((m) => MONTH_NAMES[m - 1]);
    descParts.push(`in ${describeList(months)}`);
  }

  // Day of week
  if (fields.dayOfWeek.length < 7) {
    const days = fields.dayOfWeek.map((d) => DAY_NAMES[d]);
    descParts.push(`on ${describeList(days)}`);
  }

  // Build final sentence
  let result = "Runs ";

  if (isEveryMinute(fields)) {
    result = "Every minute";
  } else if (isEveryHour(fields)) {
    result = `Every hour at minute ${describeList(fields.minute.map(String))}`;
  } else if (isDaily(fields)) {
    const times = getTimesFromFields(fields);
    result = `Daily at ${describeList(times)}`;
  } else if (isWeekly(fields)) {
    const days = fields.dayOfWeek.map((d) => DAY_NAMES[d]).sort();
    const times = getTimesFromFields(fields);
    result = `${describeList(days)} at ${describeList(times)}`;
  } else if (isMonthly(fields)) {
    const dom = describeList(fields.dayOfMonth.map((d) => ordinal(d)));
    const times = getTimesFromFields(fields);
    result = `Monthly on the ${dom} at ${describeList(times)}`;
  } else if (isYearly(fields)) {
    const months = fields.month.map((m) => MONTH_NAMES[m - 1]);
    const dom = describeList(fields.dayOfMonth.map((d) => ordinal(d)));
    const times = getTimesFromFields(fields);
    result = `Yearly in ${describeList(months)} on the ${dom} at ${describeList(times)}`;
  } else {
    // Generic fallback
    result = descParts.join(" ");
  }

  return capitalize(result);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describeField(values: number[], name: string, useOrdinal = false): string {
  if (values.length === 0) return "";
  if (values.length >= getMax(name)) return ""; // Don't mention "every" fields

  if (values.length === 1) {
    return useOrdinal ? ordinal(values[0]!) : String(values[0]);
  }

  // Check for pattern like [0, 15, 30, 45]
  if (isEvenlySpaced(values)) {
    const interval = values[1]! - values[0]!;
    return `every ${interval} ${name}${interval !== 1 ? "s" : ""}`;
  }

  return describeList(values.map((v) => useOrdinal ? ordinal(v) : String(v)));
}

function getMax(field: string): number {
  switch (field) {
    case "minute": return 60;
    case "hour": return 24;
    case "day": return 31;
    case "month": return 12;
    case "dayOfWeek": return 7;
    default: return Infinity;
  }
}

function isEvenlySpaced(arr: number[]): boolean {
  if (arr.length < 2) return true;
  const diff = arr[1]! - arr[0]!;
  if (diff <= 0) return false;
  for (let i = 2; i < arr.length; i++) {
    if (arr[i]! - arr[i - 1]! !== diff) return false;
  }
  return true;
}

function describeList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Pattern Detection Helpers ---

function isEveryMinute(f: CronFields): boolean {
  return f.minute.length === 60 && f.hour.length === 24 &&
    f.dayOfMonth.length === 31 && f.month.length === 12 && f.dayOfWeek.length === 7;
}

function isEveryHour(f: CronFields): boolean {
  return f.minute.length < 60 && f.hour.length === 24 &&
    f.dayOfMonth.length === 31 && f.month.length === 12 && f.dayOfWeek.length === 7;
}

function isDaily(f: CronFields): boolean {
  return f.dayOfMonth.length === 31 && f.month.length === 12 && f.dayOfWeek.length === 7;
}

function isWeekly(f: CronFields): boolean {
  return f.dayOfMonth.length === 31 && f.month.length === 12 && f.dayOfWeek.length < 7;
}

function isMonthly(f: CronFields): boolean {
  return f.dayOfMonth.length < 31 && f.month.length === 12 && f.dayOfWeek.length === 7;
}

function isYearly(f: CronFields): boolean {
  return f.month.length < 12;
}

function getTimesFromFields(f: CronFields): string[] {
  const times: string[] = [];
  for (const h of f.hour.slice(0, 6)) { // Limit display
    for (const m of f.minute.slice(0, 4)) {
      times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  if (times.length === 0) times.push("00:00");
  return times;
}

// --- Common Expressions ---

export const COMMON_CRON_EXPRESSIONS: Array<{ expression: string; name: string; description: string }> = [
  { expression: "* * * * *", name: "Every Minute", description: "Runs every minute" },
  { expression: "0 * * * *", name: "Every Hour", description: "Runs at the top of every hour" },
  { expression: "0 0 * * *", name: "Every Day at Midnight", description: "Runs daily at 00:00" },
  { expression: "0 9 * * *", name: "Daily at 9 AM", description: "Runs daily at 09:00" },
  { expression: "0 9 * * 1-5", name: "Weekdays at 9 AM", description: "Runs Monday-Friday at 09:00" },
  { expression: "0 0 * * 0", name: "Weekly Sunday Midnight", description: "Runs every Sunday at midnight" },
  { expression: "0 0 1 * *", name: "Monthly 1st", description: "Runs on the 1st of every month" },
  { expression: "0 0 1 1 *", name: "Annually Jan 1st", description: "Runs once per year on January 1st" },
  { expression: "*/15 * * * *", name: "Every 15 Minutes", description: "Runs every 15 minutes" },
  { expression: "0 */2 * * *", name: "Every 2 Hours", description: "Runs every 2 hours" },
  { expression: "30 9 1,15 * *", name: "Twice Monthly", description: "Runs on the 1st and 15th at 9:30" },
  { expression: "0 0 1 3,6,9,12 *", name: "Quarterly", description: "Runs quarterly on the 1st of Mar/Jun/Sep/Dec" },
  { expression: "0 9-17 * * 1-5", name: "Business Hours", description: "Runs hourly from 9AM-5PM on weekdays" },
  { expression: "*/5 8-18 * * 1-5", name: "Work Hours Frequent", description: "Every 5 mins during business hours on weekdays" },
];

// --- Utility ---

/** Full parse with description and sample runs */
export function analyzeCron(expression: string, baseDate = new Date()): ParsedCron {
  const parsed = parseCron(expression);
  const validation = validateCron(expression);

  if (!parsed || !validation.valid) {
    return {
      expression: { raw: expression, fields: { minute: [], hour: [], dayOfMonth: [], month: [], dayOfWeek: [] } },
      description: "Invalid cron expression",
      nextRuns: [],
      previousRuns: [],
      isValid: false,
      errors: validation.errors,
    };
  }

  return {
    expression: parsed,
    description: describeCron(expression),
    nextRuns: getNextRuns(expression, baseDate, 5),
    previousRuns: getPreviousRuns(expression, baseDate, 5),
    isValid: true,
  };
}
