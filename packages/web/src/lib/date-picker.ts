/**
 * Date Picker: Calendar view, range selection, time picker, localization,
 * disabled dates, min/max constraints, multiple date selection,
 * week numbers, and accessibility.
 */

// --- Types ---

export interface DatePickerOptions {
  /** Initial selected date(s) */
  value?: Date | Date[] | null;
  /** Selection mode */
  mode?: "single" | "range" | "multiple";
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Disabled dates (function or array) */
  disabledDates?: ((date: Date) => boolean) | Date[];
  /** Disabled days of week (0=Sun, 6=Sat) */
  disabledDays?: number[];
  /** Disabled day-of-month pattern */
  disabledDayOfMonth?: number[];
  /** First day of week (0=Sun, 1=Mon, default: locale-dependent) */
  firstDayOfWeek?: number;
  /** Show week numbers */
  showWeekNumbers?: boolean;
  /** Show time picker */
  showTime?: boolean;
  /** Time step in minutes (default: 5) */
  timeStep?: number;
  /** Locale for formatting (default: "en-US") */
  locale?: string;
  /** Format string for display (auto-detected if not set) */
  format?: string;
  /** Number of months to display (default: 1) */
  numberOfMonths?: number;
  /** Callback on selection change */
  onChange?: (value: Date | Date[] | null) => void;
  /** Callback when calendar opens/closes */
  onOpen?: () => void;
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Z-index (default: 10600) */
  zIndex?: number;
  /** Parent element */
  parent?: HTMLElement;
  /** Anchor element for positioning */
  anchor?: HTMLElement;
}

export interface DatePickerInstance {
  /** Calendar DOM element */
  element: HTMLDivElement;
  /** Show the picker */
  show: () => void;
  /** Hide the picker */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Get current value */
  getValue: () => Date | Date[] | null;
  /** Set value programmatically */
  setValue: (value: Date | Date[] | null) => void;
  /** Go to a specific month/year */
  goToMonth: (year: number, month: number) => void;
  /** Go to today */
  goToToday: () => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

interface DayInfo {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  isDisabled: boolean;
  isWeekend: boolean;
  weekNumber?: number;
}

// --- Constants ---

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAYS_MIN = ["S", "M", "T", "W", "T", "F", "S"];

// --- Helpers ---

function cloneDate(d: Date): Date {
  return new Date(d.getTime());
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isBetween(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function pad2(n: number): string { return String(n).padStart(2, "0"); }

function formatDate(d: Date, locale: string, includeTime = false): string {
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric", month: "short", day: "numeric",
  };
  if (includeTime) {
    opts.hour = "2-digit";
    opts.minute = "2-digit";
  }
  return d.toLocaleDateString(locale, opts);
}

// --- Main Class ---

export class DatePickerManager {
  create(options: DatePickerOptions): DatePickerInstance {
    const opts = {
      mode: "single" as const,
      firstDayOfWeek: this.detectFirstDay(options.locale),
      showWeekNumbers: false,
      showTime: false,
      timeStep: 5,
      locale: options.locale ?? "en-US",
      zIndex: 10600,
      numberOfMonths: 1,
      ...options,
    };

    const parent = opts.parent ?? document.body;

    // State
    let visible = false;
    let currentValue: Date | Date[] | null = options.value ?? null;
    let viewYear = currentValue
      ? (Array.isArray(currentValue) ? currentValue[0] : currentValue)!.getFullYear()
      : new Date().getFullYear();
    let viewMonth = currentValue
      ? (Array.isArray(currentValue) ? currentValue[0] : currentValue)!.getMonth()
      : new Date().getMonth();
    let hoverDate: Date | null = null;

    // Create DOM
    const el = document.createElement("div");
    el.className = `dp-calendar ${opts.className ?? ""}`;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Date picker");
    el.style.cssText = `
      position: absolute; z-index: ${opts.zIndex};
      background: #fff; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,0.15);
      padding: 16px; font-family: -apple-system, sans-serif; font-size: 13px;
      color: #333; opacity: 0; pointer-events: none; transition: opacity 150ms ease;
      min-width: 300px;
    `;
    parent.appendChild(el);

    // Build UI
    function build(): void {
      el.innerHTML = "";

      for (let m = 0; m < opts.numberOfMonths; m++) {
        const offsetMonth = (viewMonth + m) % 12;
        const offsetYear = viewYear + Math.floor((viewMonth + m) / 12);

        const monthEl = buildMonth(offsetYear, offsetMonth, m > 0);
        el.appendChild(monthEl);

        if (m < opts.numberOfMonths - 1) {
          const sep = document.createElement("div");
          sep.style.cssText = "width:1px;background:#f0f0f0;margin:0 8px;";
          el.appendChild(sep);
        }
      }

      // Time picker
      if (opts.showTime) {
        buildTimePicker(el);
      }

      // Footer buttons
      buildFooter(el);
    }

    function buildMonth(year: number, month: number, compact: boolean): HTMLElement {
      const container = document.createElement("div");
      container.className = "dp-month";
      container.style.cssText = compact ? "min-width:260px;" : "min-width:300px;";

      // Header: prev / title / next
      const header = document.createElement("div");
      header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;";

      const prevBtn = document.createElement("button");
      prevBtn.innerHTML = "&lsaquo;";
      prevBtn.style.cssText = "background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:4px;color:#666;";
      prevBtn.addEventListener("click", () => {
        if (month === 0) { viewYear--; viewMonth = 11; } else { viewMonth--; }
        build();
      });

      const title = document.createElement("span");
      title.textContent = `${MONTHS[month]} ${year}`;
      title.style.cssText = "font-weight:600;font-size:14px;";

      const nextBtn = document.createElement("button");
      nextBtn.innerHTML = "&rsaquo;";
      nextBtn.style.cssText = "background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:4px;color:#666;";
      nextBtn.addEventListener("click", () => {
        if (month === 11) { viewYear++; viewMonth = 0; } else { viewMonth++; }
        build();
      });

      header.append(prevBtn, title, nextBtn);
      container.appendChild(header);

      // Weekday headers
      const weekdaysRow = document.createElement("div");
      weekdaysRow.style.cssText = "display:flex;gap:0;";

      if (opts.showWeekNumbers) {
        const wnHeader = document.createElement("span");
        wnHeader.textContent = "W";
        wnHeader.style.cssText = "width:28px;text-align:center;font-size:11px;color:#999;font-weight:500;";
        weekdaysRow.appendChild(wnHeader);
      }

      for (let i = 0; i < 7; i++) {
        const dayIdx = (opts.firstDayOfWeek! + i) % 7;
        const wd = document.createElement("span");
        wd.textContent = WEEKDAYS_MIN[dayIdx];
        wd.style.cssText = "flex:1;text-align:center;font-size:11px;color:#999;font-weight:500;padding:4px 0;";
        weekdaysRow.appendChild(wd);
      }
      container.appendChild(weekdaysRow);

      // Days grid
      const grid = document.createElement("div");
      grid.style.cssText = "display:flex;flex-wrap:wrap;";

      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      const prevMonthDays = getDaysInMonth(year, month - 1 < 0 ? 11 : month - 1);

      // Calculate offset for first day of week
      let startOffset = firstDay - opts.firstDayOfWeek!;
      if (startOffset < 0) startOffset += 7;

      // Previous month days
      for (let i = startOffset - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const cell = buildDayCell(new Date(year, month - 1, day), true);
        grid.appendChild(cell);
      }

      // Current month days
      const today = new Date();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const cell = buildDayCell(date, false);
        grid.appendChild(cell);
      }

      // Next month days (fill row)
      const totalCells = startOffset + daysInMonth;
      const remaining = (7 - (totalCells % 7)) % 7;
      for (let i = 1; i <= remaining; i++) {
        const cell = buildDayCell(new Date(year, month + 1, i), true);
        grid.appendChild(cell);
      }

      container.appendChild(grid);
      return container;
    }

    function buildDayCell(date: Date, outsideMonth: boolean): HTMLElement {
      const info = getDayInfo(date, outsideMonth);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.textContent = String(date.getDate());
      cell.dataset.date = date.toISOString();

      cell.style.cssText = `
        width: ${opts.showWeekNumbers ? 32 : 36}px; height: 32px;
        display:inline-flex;align-items:center;justify-content:center;
        border:none;border-radius:50%;cursor:pointer;font-size:13px;
        margin:1px;transition:all 0.15s;
        ${info.isCurrentMonth ? "" : "color:#bbb;"}
        ${info.isDisabled ? "opacity:0.3;cursor:not-allowed;" : ""}
        ${info.isToday ? "font-weight:700;color:#007aff;" : ""}
        ${info.isSelected ? "background:#007aff;color:#fff;" : ""}
        ${info.isStart ? "border-radius:8px 2px 2px 8px;" : ""}
        ${info.isEnd ? "border-radius:2px 8px 8px 2px;" : ""}
        ${info.isInRange && !info.isSelected ? "background:#e8f0fe;" : ""}
        ${info.isWeekend && !info.isSelected ? "color:#c00;" : ""}
      `;

      if (!info.isDisabled) {
        cell.addEventListener("click", () => handleSelect(date));
        cell.addEventListener("mouseenter", () => { hoverDate = date; build(); });
        cell.addEventListener("mouseleave", () => { hoverDate = null; build(); });
      }

      return cell;
    }

    function getDayInfo(date: Date, outsideMonth: boolean): DayInfo {
      const today = new Date();
      const isSelected = isDateSelected(date);
      const [isStart, isEnd] = getRangeEndpoints(date);
      const inRange = isDateInRange(date);

      return {
        date,
        isCurrentMonth: !outsideMonth,
        isToday: sameDay(date, today),
        isSelected,
        isStart,
        isEnd,
        isInRange: inRange,
        isDisabled: isDateDisabled(date),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      };
    }

    function isDateSelected(date: Date): boolean {
      if (!currentValue) return false;
      if (Array.isArray(currentValue)) {
        return currentValue.some((d) => sameDay(d, date));
      }
      return sameDay(currentValue, date);
    }

    function getRangeEndpoints(date: Date): [boolean, boolean] {
      if (!Array.isArray(currentValue) || currentValue.length !== 2 || opts.mode !== "range") return [false, false];
      return [sameDay(currentValue[0]!, date), sameDay(currentValue[1]!, date)];
    }

    function isDateInRange(date: Date): boolean {
      if (opts.mode !== "range" || !Array.isArray(currentValue) || currentValue.length !== 2) return false;
      if (!hoverDate) return isBetween(date, currentValue[0]!, currentValue[1]!);
      return isBetween(date, currentValue[0]!, hoverDate);
    }

    function isDateDisabled(date: Date): boolean {
      if (opts.minDate && date < new Date(opts.minDate.getFullYear(), opts.minDate.getMonth(), opts.minDate.getDate())) return true;
      if (opts.maxDate && date > new Date(opts.maxDate.getFullYear(), opts.maxDate.getMonth(), opts.maxDate.getDate())) return true;
      if (opts.disabledDays?.includes(date.getDay())) return true;
      if (opts.disabledDayOfMonth?.includes(date.getDate())) return true;

      if (Array.isArray(opts.disabledDates)) {
        if (opts.disabledDates.some((d) => sameDay(d, date))) return true;
      } else if (typeof opts.disabledDates === "function") {
        if (opts.disabledDates(date)) return true;
      }

      return false;
    }

    function handleSelect(date: Date): void {
      switch (opts.mode) {
        case "single":
          currentValue = date;
          break;
        case "range":
          if (!Array.isArray(currentValue) || currentValue.length !== 2) {
            currentValue = [date, date];
          } else {
            const [start, end] = currentValue;
            if (sameDay(start!, date) || sameDay(end!, date)) {
              currentValue = [date, date];
            } else if (date < start!) {
              currentValue = [date, end!];
            } else {
              currentValue = [start!, date];
            }
          }
          break;
        case "multiple":
          if (!Array.isArray(currentValue)) {
            currentValue = [date];
          } else {
            const idx = currentValue.findIndex((d) => sameDay(d, date));
            if (idx >= 0) currentValue.splice(idx, 1);
            else currentValue.push(date);
          }
          break;
      }

      opts.onChange?.(currentValue);
      build();
    }

    function buildTimePicker(container: HTMLElement): void {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "border-top:1px solid #eee;margin-top:12px;padding-top:12px;display:flex;gap:12px;align-items:center;";

      const baseDate = Array.isArray(currentValue) ? currentValue[0] ?? new Date() : currentValue ?? new Date();

      const hours = document.createElement("select");
      for (let h = 0; h < 24; h++) {
        const opt = document.createElement("option");
        opt.value = String(h);
        opt.textContent = pad2(h);
        if (h === baseDate.getHours()) opt.selected = true;
        hours.appendChild(opt);
      }
      hours.style.cssText = "padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;";

      const colon = document.createElement("span");
      colon.textContent = ":";

      const mins = document.createElement("select");
      for (let m = 0; m < 60; m += opts.timeStep!) {
        const opt = document.createElement("option");
        opt.value = String(m);
        opt.textContent = pad2(m);
        if (m === Math.round(baseDate.getMinutes() / opts.timeStep!) * opts.timeStep!) opt.selected = true;
        mins.appendChild(opt);
      }
      mins.style.cssText = "padding:4px 8px;border:1px solid #ddd;border-radius:6px;font-size:13px;";

      const updateTime = () => {
        if (currentValue) {
          const target = Array.isArray(currentValue) ? currentValue[0] : currentValue;
          if (target) {
            target.setHours(parseInt(hours.value));
            target.setMinutes(parseInt(mins.value));
          }
        }
      };

      hours.addEventListener("change", updateTime);
      mins.addEventListener("change", updateTime);

      wrapper.append(hours, colon, mins);
      container.appendChild(wrapper);
    }

    function buildFooter(container: HTMLElement): void {
      const footer = document.createElement("div");
      footer.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid #f0f0f0;";

      const todayBtn = document.createElement("button");
      todayBtn.textContent = "Today";
      todayBtn.style.cssText = "padding:5px 12px;border:1px solid #ddd;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#666;";
      todayBtn.addEventListener("click", () => instance.goToToday());

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "Close";
      closeBtn.style.cssText = "padding:5px 14px;border:none;border-radius:6px;background:#007aff;color:#fff;cursor:pointer;font-size:12px;";
      closeBtn.addEventListener("click", () => instance.hide());

      footer.append(todayBtn, closeBtn);
      container.appendChild(footer);
    }

    // Positioning
    function position(): void {
      if (!opts.anchor) return;
      const rect = opts.anchor.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      let top = rect.bottom - parentRect.top + 4;
      let left = rect.left - parentRect.left;

      // Flip up if not enough space below
      const elHeight = el.offsetHeight || 350;
      if (top + elHeight > window.innerHeight - 20) {
        top = rect.top - parentRect.top - elHeight - 4;
      }

      // Clamp horizontally
      const elWidth = el.offsetWidth || 320;
      if (left + elWidth > window.innerWidth - 10) {
        left = window.innerWidth - elWidth - 10;
      }
      if (left < 10) left = 10;

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }

    // Instance
    const instance: DatePickerInstance = {
      element: el,

      show() {
        visible = true;
        build();
        position();
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.pointerEvents = "auto";
        });
        opts.onOpen?.();
      },

      hide() {
        visible = false;
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        opts.onClose?.();
      },

      toggle() { if (visible) this.hide(); else this.show(); },

      getValue() { return currentValue; },

      setValue(value: Date | Date[] | null) {
        currentValue = value;
        if (value && !Array.isArray(value)) {
          viewYear = value.getFullYear();
          viewMonth = value.getMonth();
        } else if (Array.isArray(value) && value.length > 0) {
          viewYear = value[0]!.getFullYear();
          viewMonth = value[0]!.getMonth();
        }
        if (visible) build();
      },

      goToMonth(y: number, m: number) {
        viewYear = y;
        viewMonth = m;
        build();
      },

      goToToday() {
        const now = new Date();
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();
        build();
      },

      isVisible: () => visible,

      destroy() {
        el.remove();
      },
    };

    // Click outside to close
    const clickOutside = (e: MouseEvent) => {
      if (visible && !el.contains(e.target as Node) && e.target !== opts.anchor) {
        instance.hide();
      }
    };
    document.addEventListener("mousedown", clickOutside);

    // Store ref for cleanup
    (instance as any)._cleanup = () => document.removeEventListener("mousedown", clickOutside);

    return instance;
  }

  private detectFirstDay(locale?: string): number {
    try {
      const formatter = new Intl.DateTimeFormat(locale ?? "en-US", { weekday: "short" });
      const year = 2024; // Monday-start year
      const monday = new Date(year, 0, 1); // Jan 1, 2024 is Monday
      const parts = formatter.formatToParts(monday);
      const monIdx = parts.findIndex((p) => p.type === "weekday");
      // If Monday formats as index 0 or 1 depending on locale...
      const testLocale = new Intl.Locale(locale ?? "en-US");
      // Simple heuristic: most European locales start on Monday
      const region = (testLocale as any).region ?? "";
      if (["GB", "DE", "FR", "ES", "IT", "RU", "CN", "JP", "KR"].includes(region)) return 1;
    } catch {}
    return 0; // Sunday default
  }
}

/** Convenience: create a date picker */
export function createDatePicker(options: DatePickerOptions): DatePickerInstance {
  return new DatePickerManager().create(options);
}
