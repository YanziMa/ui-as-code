/**
 * Duration class — immutable, chainable time duration with
 * parsing, formatting, arithmetic, and humanization.
 */

// --- Types ---

export interface DurationInput {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

export interface HumanizeOptions {
  /** Maximum number of units to display (default: 2) */
  maxUnits?: number;
  /** Use short form (e.g., "2h 30m" vs "2 hours 30 minutes") */
  short?: boolean;
  /** Show "and" before last unit */
  conjunction?: string;
  /** Round to nearest unit? */
  round?: boolean;
  /** Delimiter between units */
  delimiter?: string;
}

// --- Constants ---

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MS_PER_MONTH_APPROX = 30.44 * MS_PER_DAY; // Average month
const MS_PER_YEAR_APPROX = 365.25 * MS_PER_DAY; // Average year

// --- Duration Class ---

/**
 * Immutable duration representation.
 * All arithmetic methods return new instances.
 */
export class Duration {
  readonly milliseconds: number;

  constructor(ms: number) {
    this.milliseconds = ms;
  }

  // --- Static Factories ---

  /** Create from milliseconds */
  static fromMilliseconds(ms: number): Duration {
    return new Duration(ms);
  }

  /** Create from seconds */
  static fromSeconds(s: number): Duration {
    return new Duration(s * MS_PER_SECOND);
  }

  /** Create from minutes */
  static fromMinutes(m: number): Duration {
    return new Duration(m * MS_PER_MINUTE);
  }

  /** Create from hours */
  static fromHours(h: number): Duration {
    return new Duration(h * MS_PER_HOUR);
  }

  /** Create from days */
  static fromDays(d: number): Duration {
    return new Duration(d * MS_PER_DAY);
  }

  /** Create from weeks */
  static fromWeeks(w: number): Duration {
    return new Duration(w * MS_PER_WEEK);
  }

  /** Create from a DurationInput object */
  static fromObject(input: DurationInput): Duration {
    let ms = input.milliseconds ?? 0;
    if (input.seconds) ms += input.seconds * MS_PER_SECOND;
    if (input.minutes) ms += input.minutes * MS_PER_MINUTE;
    if (input.hours) ms += input.hours * MS_PER_HOUR;
    if (input.days) ms += input.days * MS_PER_DAY;
    if (input.weeks) ms += input.weeks * MS_PER_WEEK;
    if (input.months) ms += input.months * MS_PER_MONTH_APPROX;
    if (input.years) ms += input.years * MS_PER_YEAR_APPROX;
    return new Duration(ms);
  }

  /**
   * Parse a duration string like "2h 30m", "1d 4h", "500ms", "PT1H30M" (ISO 8601).
   */
  static parse(str: string): Duration {
    str = str.trim();
    if (!str) return new Duration(0);

    // ISO 8601 format: PnYnMnDTnHnMnS
    const isoMatch = str.match(
      /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
    );
    if (isoMatch && (isoMatch[1] || isoMatch[2] || isoMatch[3] || isoMatch[4] || isoMatch[5] || isoMatch[6] || isoMatch[7])) {
      let ms = 0;
      if (isoMatch[1]) ms += parseFloat(isoMatch[1]) * MS_PER_YEAR_APPROX;
      if (isoMatch[2]) ms += parseFloat(isoMatch[2]) * MS_PER_MONTH_APPROX;
      if (isoMatch[3]) ms += parseFloat(isoMatch[3]) * MS_PER_WEEK;
      if (isoMatch[4]) ms += parseFloat(isoMatch[4]) * MS_PER_DAY;
      if (isoMatch[5]) ms += parseFloat(isoMatch[5]) * MS_PER_HOUR;
      if (isoMatch[6]) ms += parseFloat(isoMatch[6]) * MS_PER_MINUTE;
      if (isoMatch[7]) ms += parseFloat(isoMatch[7]) * MS_PER_SECOND;
      return new Duration(Math.round(ms));
    }

    // Human-readable format: "2h 30m", "1 day 4 hours"
    const patterns: Array<[RegExp, number]> = [
      [/(\d+(?:\.\d+)?)\s*years?\s*/i, MS_PER_YEAR_APPROX],
      [/(\d+(?:\.\d+)?)\s*months?\s*/i, MS_PER_MONTH_APPROX],
      [/(\d+(?:\.\d+)?)\s*weeks?\s*/i, MS_PER_WEEK],
      [/(\d+(?:\.\d+)?)\s*days?\s*/i, MS_PER_DAY],
      [/(\d+(?:\.\d+)?)\s*hours?\s*/i, MS_PER_HOUR],
      [/(\d+(?:\.\d+)?)\s*minutes?\s*(?:mins?)?\s*/i, MS_PER_MINUTE],
      [/(\d+(?:\.\d+)?)\s*seconds?\s*(?:secs?)?\s*/i, MS_PER_SECOND],
      [/(\d+(?:\.\d+)?)\s*milliseconds?\s*(?:ms)?\s*/i, 1],
    ];

    let total = 0;
    for (const [pattern, multiplier] of patterns) {
      const match = str.match(pattern);
      if (match) total += parseFloat(match[1]) * multiplier;
    }

    // If nothing matched, try plain number
    if (total === 0) {
      const num = parseFloat(str);
      if (!isNaN(num)) total = num;
    }

    return new Duration(Math.round(total));
  }

  /** Create from the difference between two dates */
  static between(start: Date | number, end: Date | number): Duration {
    const s = typeof start === "number" ? start : start.getTime();
    const e = typeof end === "number" ? end : end.getTime();
    return new Duration(e - s);
  }

  /** Zero duration */
  static get zero(): Duration { return new Duration(0); }

  // --- Getters ---

  get isNegative(): boolean { return this.milliseconds < 0; }
  get isZero(): boolean { return this.milliseconds === 0; }
  get abs(): Duration { return new Duration(Math.abs(this.milliseconds)); }

  get totalMilliseconds(): number { return this.milliseconds; }
  get totalSeconds(): number { return this.milliseconds / MS_PER_SECOND; }
  get totalMinutes(): number { return this.milliseconds / MS_PER_MINUTE; }
  get totalHours(): number { return this.milliseconds / MS_PER_HOUR; }
  get totalDays(): number { return this.milliseconds / MS_PER_DAY; }
  get totalWeeks(): number { return this.milliseconds / MS_PER_WEEK; }

  /** Break down into component units */
  get components(): DurationInput {
    let remaining = Math.abs(this.milliseconds);

    const years = Math.floor(remaining / MS_PER_YEAR_APPROX);
    remaining -= years * MS_PER_YEAR_APPROX;

    const months = Math.floor(remaining / MS_PER_MONTH_APPROX);
    remaining -= months * MS_PER_MONTH_APPROX;

    const weeks = Math.floor(remaining / MS_PER_WEEK);
    remaining -= weeks * MS_PER_WEEK;

    const days = Math.floor(remaining / MS_PER_DAY);
    remaining -= days * MS_PER_DAY;

    const hours = Math.floor(remaining / MS_PER_HOUR);
    remaining -= hours * MS_PER_HOUR;

    const minutes = Math.floor(remaining / MS_PER_MINUTE);
    remaining -= minutes * MS_PER_MINUTE;

    const seconds = Math.floor(remaining / MS_PER_SECOND);
    remaining -= seconds * MS_PER_SECOND;

    const milliseconds = Math.round(remaining);

    const result: DurationInput = {};
    if (years > 0) result.years = years;
    if (months > 0) result.months = months;
    if (weeks > 0) result.weeks = weeks;
    if (days > 0) result.days = days;
    if (hours > 0) result.hours = hours;
    if (minutes > 0) result.minutes = minutes;
    if (seconds > 0) result.seconds = seconds;
    if (milliseconds > 0) result.milliseconds = milliseconds;

    return result;
  }

  // --- Arithmetic (all return new instances) ---

  add(other: Duration | number): Duration {
    const ms = other instanceof Duration ? other.milliseconds : other;
    return new Duration(this.milliseconds + ms);
  }

  subtract(other: Duration | number): Duration {
    const ms = other instanceof Duration ? other.milliseconds : other;
    return new Duration(this.milliseconds - ms);
  }

  multiply(factor: number): Duration {
    return new Duration(Math.round(this.milliseconds * factor));
  }

  divide(divisor: number): Duration {
    return new Duration(Math.round(this.milliseconds / divisor));
  }

  negate(): Duration {
    return new Duration(-this.milliseconds);
  }

  /** Get absolute difference with another duration */
  diff(other: Duration): Duration {
    return new Duration(Math.abs(this.milliseconds - other.milliseconds));
  }

  // --- Comparison ---

  equals(other: Duration): boolean {
    return this.milliseconds === other.milliseconds;
  }

  lessThan(other: Duration): boolean {
    return this.milliseconds < other.milliseconds;
  }

  lessThanOrEqual(other: Duration): boolean {
    return this.milliseconds <= other.milliseconds;
  }

  greaterThan(other: Duration): boolean {
    return this.milliseconds > other.milliseconds;
  }

  greaterThanOrEqual(other: Duration): boolean {
    return this.milliseconds >= other.milliseconds;
  }

  /** Clamp between min and max durations */
  clamp(min: Duration, max: Duration): Duration {
    const ms = Math.max(min.milliseconds, Math.min(this.milliseconds, max.milliseconds));
    return new Duration(ms);
  }

  // --- Formatting ---

  /** Format as ISO 8601 duration string (e.g., "P1DT2H30M") */
  toISO(): string {
    if (this.isZero) return "PT0S";

    const c = this.components;
    const parts: string[] = [];

    if (c.years) parts.push(`${c.years}Y`);
    if (c.months) parts.push(`${c.months}M`);
    if (c.weeks) parts.push(`${c.weeks}W`);
    if (c.days) parts.push(`${c.days}D`);

    const timeParts: string[] = [];
    if (c.hours) timeParts.push(`${c.hours}H`);
    if (c.minutes) timeParts.push(`${c.minutes}M`);
    if (c.seconds || c.milliseconds) {
      const s = c.seconds ?? 0;
      const ms = c.milliseconds ?? 0;
      timeParts.push(ms > 0 ? `${s}.${ms.toString().padStart(3, "0")}S` : `${s}S`);
    }

    let result = "P" + parts.join("");
    if (timeParts.length > 0) result += "T" + timeParts.join("");

    return result || "PT0S";
  }

  /** Format as compact time string (e.g., "2:30:15") */
  toClock(options?: { showMs?: boolean }): string {
    const totalSecs = Math.abs(Math.floor(this.totalSeconds));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;

    let result = h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    if (options?.showMs) {
      const ms = Math.abs(this.milliseconds % 1000);
      result += `.${String(ms).padStart(3, "0")}`;
    }

    return this.isNegative ? `-${result}` : result;
  }

  /** Human-readable format (e.g., "2 hours and 30 minutes", "1d 4h") */
  humanize(options: HumanizeOptions = {}): string {
    const {
      maxUnits = 2,
      short = false,
      conjunction = short ? "" : " and ",
      delimiter = short ? " " : ", ",
      round = false,
    } = options;

    let c = this.components;

    if (round && c.milliseconds && c.milliseconds >= 500) {
      c = { ...c, seconds: (c.seconds ?? 0) + 1, milliseconds: 0 };
    }

    const unitLabels: Array<[keyof DurationInput, string, string]> = [
      ["years", "year", "y"],
      ["months", "month", "mo"],
      ["weeks", "week", "w"],
      ["days", "day", "d"],
      ["hours", "hour", "h"],
      ["minutes", "minute", "m"],
      ["seconds", "second", "s"],
      ["milliseconds", "ms", "ms"],
    ];

    const parts: string[] = [];

    for (const [key, longLabel, shortLabel] of unitLabels) {
      const value = c[key];
      if (value !== undefined && value > 0 && parts.length < maxUnits) {
        if (short) {
          parts.push(`${value}${shortLabel}`);
        } else {
          parts.push(`${value} ${longLabel}${value !== 1 ? "s" : ""}`);
        }
      }
    }

    if (parts.length === 0) return short ? "0ms" : "0 milliseconds";

    if (parts.length <= 2 && conjunction) {
      return parts.join(conjunction);
    }

    const last = parts.pop()!;
    return parts.join(delimiter) + conjunction + last;
  }

  /** Format as a simple description */
  toString(): string {
    return this.humanize({ maxUnits: 3 });
  }

  toJSON(): number {
    return this.milliseconds;
  }

  // --- Date Operations ---

  /** Add this duration to a date, returning a new Date */
  addTo(date: Date): Date {
    return new Date(date.getTime() + this.milliseconds);
  }

  /** Subtract this duration from a date, returning a new Date */
  subtractFrom(date: Date): Date {
    return new Date(date.getTime() - this.milliseconds);
  }

  // --- Utility ---

  /** Check if this duration falls within a range */
  isWithin(min: Duration, max: Duration): boolean {
    const abs = Math.abs(this.milliseconds);
    return abs >= Math.abs(min.milliseconds) && abs <= Math.abs(max.milliseconds);
  }

  /** Map this duration's value from one range to another (for progress bars etc.) */
  toProgress(total: Duration): number {
    if (total.milliseconds === 0) return 0;
    return Math.min(1, Math.max(0, Math.abs(this.milliseconds) / Math.abs(total.milliseconds)));
  }

  /** Split into N equal durations */
  split(n: number): Duration[] {
    if (n <= 0) return [];
    const each = Math.round(this.milliseconds / n);
    const remainder = this.milliseconds - each * n;
    const results: Duration[] = [];
    for (let i = 0; i < n; i++) {
      results.push(new Duration(each + (i === n - 1 ? remainder : 0)));
    }
    return results;
  }
}
