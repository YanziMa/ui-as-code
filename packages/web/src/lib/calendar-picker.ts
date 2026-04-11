/**
 * Calendar Date Picker: Full calendar grid with date selection, range selection,
 * multi-date selection, month/year navigation, disabled dates, highlighted dates,
 * min/max constraints, week start day, i18n, keyboard navigation, and accessibility.
 */

// --- Types ---

export type CalendarMode = "single" | "range" | "multi";
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, ...

export interface CalendarDay {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Is current month? */
  isCurrentMonth: boolean;
  /** Is today? */
  isToday: boolean;
  /** Is selected? */
  isSelected: boolean;
  /** Is in selected range? */
  isInRange: boolean;
  /** Is range start? */
  isRangeStart: boolean;
  /** Is range end? */
  isRangeEnd: boolean;
  /** Disabled? */
  isDisabled: boolean;
  /** Highlighted (e.g., has events)? */
  isHighlighted?: boolean;
  /** Custom label/tooltip */
  label?: string;
}

export interface CalendarPickerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Selection mode */
  mode?: CalendarMode;
  /** Initial selected date(s) */
  value?: string | [string, string] | string[];
  /** Initially visible month (YYYY-MM) */
  viewMonth?: string;
  /** Minimum selectable date (YYYY-MM-DD) */
  minDate?: string;
  /** Maximum selectable date (YYYY-MM-DD) */
  maxDate?: string;
  /** Disabled dates (array of YYYY-MM-DD strings or matcher function) */
  disabledDates?: string[] | ((date: string) => boolean);
  /** Highlighted dates (array of YYYY-MM-DD strings) */
  highlightedDates?: string[];
  /** Day of week to start (0=Sun, 1=Mon, ...) */
  weekStart?: WeekStart;
  /** Show week numbers? */
  showWeekNumbers?: boolean;
  /** Show today button? */
  showTodayBtn?: boolean;
  /** Show month/year navigation? */
  showNav?: boolean;
  /** Custom labels */
  labels?: {
    today?: string;
    prevMonth?: string;
    nextMonth?: string;
    prevYear?: string;
    nextYear?: string;
    selectRange?: string;
    clear?: string;
  };
  /** Month names (12 items) */
  monthNames?: string[];
  /** Weekday names (7 items, short) */
  weekdayNamesShort?: string[];
  /** Weekday names (7 items, long) */
  weekdayNamesLong?: string[];
  /** Callback on value change */
  onChange?: (value: string | [string, string] | string[]) => void;
  /** Callback on day click */
  onDayClick?: (day: CalendarDay) => void;
  /** Callback on month change */
  onMonthChange?: (year: number, month: number) => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface CalendarPickerInstance {
  element: HTMLElement;
  getValue: () => string | [string, string] | string[];
  setValue: (value: string | [string, string] | string[]) => void;
  getViewMonth: () => { year: number; month: number };
  setViewMonth: (year: number, month: number) => void;
  goToday: () => void;
  clearSelection: () => void;
  setDisabledDates: (dates: string[] | ((date: string) => boolean)) => void;
  setHighlightedDates: (dates: string[]) => void;
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DEFAULT_WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DEFAULT_WEEKDAY_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

// --- Helpers ---

function parseISO(s: string): Date {
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? new Date() : d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function clampDate(d: Date, min?: Date, max?: Date): Date {
  if (min && d < min) return new Date(min);
  if (max && d > max) return new Date(max);
  return d;
}

// --- Main Class ---

export class CalendarPickerManager {
  create(options: CalendarPickerOptions): CalendarPickerInstance {
    const opts = {
      mode: options.mode ?? "single",
      weekStart: options.weekStart ?? 0,
      showWeekNumbers: options.showWeekNumbers ?? false,
      showTodayBtn: options.showTodayBtn ?? true,
      showNav: options.showNav ?? true,
      disabled: options.disabled ?? false,
      labels: {
        today: "Today",
        prevMonth: "\u2039",
        nextMonth: "\u203A",
        prevYear: "\u00AB",
        nextYear: "\u00BB",
        selectRange: "Select range",
        clear: "Clear",
        ...options.labels,
      },
      monthNames: options.monthNames ?? DEFAULT_MONTH_NAMES,
      weekdayNamesShort: options.weekdayNamesShort ?? DEFAULT_WEEKDAY_SHORT,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("CalendarPicker: container not found");

    container.className = `calendar-picker ${opts.className ?? ""}`;
    container.style.cssText = `
      display:inline-block;font-family:-apple-system,sans-serif;
      background:#fff;border:1px solid #e5e7eb;border-radius:10px;
      box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;
      width:300px;${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    // State
    let viewYear: number;
    let viewMonth: number;
    let selectedValue: string | [string, string] | string[];

    // Initialize view month
    if (opts.viewMonth) {
      const parts = opts.viewMonth.split("-");
      viewYear = parseInt(parts[0]!, 10);
      viewMonth = parseInt(parts[1]!, 10) - 1;
    } else {
      const now = new Date();
      viewYear = now.getFullYear();
      viewMonth = now.getMonth();
    }

    // Initialize value
    const todayStr = toISO(new Date());
    if (opts.value) {
      selectedValue = opts.value;
    } else if (opts.mode === "range") {
      selectedValue = ["", ""];
    } else if (opts.mode === "multi") {
      selectedValue = [];
    } else {
      selectedValue = "";
    }

    // Parse min/max
    const minD = opts.minDate ? parseISO(opts.minDate) : undefined;
    const maxD = opts.maxDate ? parseISO(opts.maxDate) : undefined;

    // Build DOM
    const headerEl = document.createElement("div");
    headerEl.className = "cal-header";
    headerEl.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 14px;border-bottom:1px solid #f0f0f0;
    `;
    container.appendChild(headerEl);

    const weekdaysEl = document.createElement("div");
    weekdaysEl.className = "cal-weekdays";
    weekdaysEl.style.cssText = `
      display:flex;padding:6px 8px 2px;background:#fafafa;border-bottom:1px solid #f5f5f5;
    `;
    container.appendChild(weekdaysEl);

    const gridEl = document.createElement("div");
    gridEl.className = "cal-grid";
    gridEl.style.cssText = "display:flex;flex-direction:column;";
    container.appendChild(gridEl);

    const footerEl = document.createElement("div");
    footerEl.className = "cal-footer";
    footerEl.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:8px 14px;border-top:1px solid #f0f0f0;
    `;
    container.appendChild(footerEl);

    function render(): void {
      renderHeader();
      renderWeekdays();
      renderGrid();
      renderFooter();
    }

    function renderHeader(): void {
      headerEl.innerHTML = "";

      // Nav left
      const navLeft = document.createElement("div");
      navLeft.style.cssText = "display:flex;gap:4px;";

      const prevYearBtn = createNavButton(opts.labels.prevYear!, () => { viewYear--; render(); opts.onMonthChange?.(viewYear, viewMonth); });
      const prevMonthBtn = createNavButton(opts.labels.prevMonth!, () => {
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        render(); opts.onMonthChange?.(viewYear, viewMonth);
      });

      if (opts.showNav) {
        navLeft.appendChild(prevYearBtn);
        navLeft.appendChild(prevMonthBtn);
      }
      headerEl.appendChild(navLeft);

      // Title
      const title = document.createElement("span");
      title.textContent = `${opts.monthNames[viewMonth]} ${viewYear}`;
      title.style.cssText = "font-weight:600;font-size:14px;color:#111827;";
      headerEl.appendChild(title);

      // Nav right
      const navRight = document.createElement("div");
      navRight.style.cssText = "display:flex;gap:4px;";

      const nextMonthBtn = createNavButton(opts.labels.nextMonth!, () => {
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        render(); opts.onMonthChange?.(viewYear, viewMonth);
      });
      const nextYearBtn = createNavButton(opts.labels.nextYear!, () => { viewYear++; render(); opts.onMonthChange?.(viewYear, viewMonth); });

      if (opts.showNav) {
        navRight.appendChild(nextMonthBtn);
        navRight.appendChild(nextYearBtn);
      }
      headerEl.appendChild(navRight);
    }

    function createNavButton(label: string, onClick: () => void): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText = `
        width:26px;height:26px;display:flex;align-items:center;justify-content:center;
        border:none;background:none;border-radius:4px;color:#6b7280;cursor:pointer;
        font-size:14px;font-weight:bold;
      `;
      btn.addEventListener("click", onClick);
      btn.addEventListener("mouseenter", () => { btn.style.background = "#f3f4f6"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
      return btn;
    }

    function renderWeekdays(): void {
      weekdaysEl.innerHTML = "";

      if (opts.showWeekNumbers) {
        const wnLabel = document.createElement("span");
        wnLabel.textContent = "#";
        wnLabel.style.cssText = "width:28px;text-align:center;font-size:11px;color:#9ca3af;font-weight:500;";
        weekdaysEl.appendChild(wnLabel);
      }

      for (let i = 0; i < 7; i++) {
        const idx = (i + opts.weekStart) % 7;
        const el = document.createElement("span");
        el.textContent = opts.weekdayNamesShort[idx];
        el.style.cssText = `
          flex:1;text-align:center;font-size:11px;color:#9ca3af;font-weight:500;
          padding:2px 0;
        `;
        weekdaysEl.appendChild(el);
      }
    }

    function renderGrid(): void {
      gridEl.innerHTML = "";

      const totalDays = daysInMonth(viewYear, viewMonth);
      const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
      // Adjust for week start
      const startOffset = (firstDay - opts.weekStart + 7) % 7;
      const prevMonthDays = daysInMonth(viewYear, viewMonth - 1);

      // Total rows needed (6 weeks max)
      const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;
      const rowCount = totalCells / 7;

      for (let row = 0; row < rowCount; row++) {
        const rowEl = document.createElement("div");
        rowEl.style.cssText = "display:flex;";

        // Week number
        if (opts.showWeekNumbers) {
          const firstDateOfRow = getDateForCell(row * 7);
          const wn = getWeekNumber(firstDateOfRow);
          const wnEl = document.createElement("span");
          wnEl.textContent = String(wn);
          wnEl.style.cssText = "width:28px;text-align:center;font-size:10px;color:#c4c8cf;line-height:36px;";
          rowEl.appendChild(wnEl);
        }

        for (let col = 0; col < 7; col++) {
          const cellIdx = row * 7 + col;
          let dayNum: number;
          let isCurrent = true;
          let dateObj: Date;

          if (cellIdx < startOffset) {
            dayNum = prevMonthDays - startOffset + cellIdx + 1;
            isCurrent = false;
            dateObj = new Date(viewYear, viewMonth - 1, dayNum);
          } else if (cellIdx >= startOffset + totalDays) {
            dayNum = cellIdx - startOffset - totalDays + 1;
            isCurrent = false;
            dateObj = new Date(viewYear, viewMonth + 1, dayNum);
          } else {
            dayNum = cellIdx - startOffset + 1;
            isCurrent = true;
            dateObj = new Date(viewYear, viewMonth, dayNum);
          }

          const dateStr = toISO(dateObj);
          const dayInfo = buildDayInfo(dateStr, isCurrent, dateObj);
          const cell = createDayCell(dayInfo);
          rowEl.appendChild(cell);
        }

        gridEl.appendChild(rowEl);
      }
    }

    function getDateForCell(cellIdx: number, offset = 0): Date {
      const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
      const startOffset = (firstDay - opts.weekStart + 7) % 7;
      const dayNum = cellIdx - startOffset + 1 + offset;
      return new Date(viewYear, viewMonth, dayNum);
    }

    function getWeekNumber(d: Date): number {
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const days = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
      return Math.ceil((days + jan1.getDay() + 1) / 7);
    }

    function buildDayInfo(dateStr: string, isCurrentMonth: boolean, dateObj: Date): CalendarDay {
      const today = new Date();
      const isToday = isSameDay(dateObj, today);

      // Check disabled
      let isDisabled = !isCurrentMonth || !!opts.disabled;
      if (!isDisabled && minD && dateObj < minD) isDisabled = true;
      if (!isDisabled && maxD && dateObj > maxD) isDisabled = true;
      if (!isDisabled && opts.disabledDates) {
        if (Array.isArray(opts.disabledDates)) {
          isDisabled = opts.disabledDates.includes(dateStr);
        } else {
          isDisabled = opts.disabledDates(dateStr);
        }
      }

      // Check selected
      let isSelected = false;
      let isInRange = false;
      let isRangeStart = false;
      let isRangeEnd = false;

      if (opts.mode === "single") {
        isSelected = selectedValue === dateStr;
      } else if (opts.mode === "range") {
        const range = selectedValue as [string, string];
        isSelected = range[0] === dateStr || range[1] === dateStr;
        isRangeStart = range[0] === dateStr;
        isRangeEnd = range[1] === dateStr;
        if (range[0] && range[1]) {
          isInRange = dateStr > range[0] && dateStr < range[1];
        }
      } else if (opts.mode === "multi") {
        isSelected = (selectedValue as string[]).includes(dateStr);
      }

      // Highlighted
      const isHighlighted = opts.highlightedDates?.includes(dateStr) ?? false;

      return {
        date: dateStr,
        isCurrentMonth,
        isToday,
        isSelected,
        isInRange,
        isRangeStart,
        isRangeEnd,
        isDisabled,
        isHighlighted,
      };
    }

    function createDayCell(day: CalendarDay): HTMLDivElement {
      const cell = document.createElement("div");
      cell.dataset.date = day.date;
      cell.style.cssText = `
        flex:1;height:36px;display:flex;align-items:center;justify-content:center;
        cursor:${day.isDisabled ? "default" : "pointer"};position:relative;
        font-size:13px;border-radius:50%;margin:1px 0;transition:all 0.15s;
        color:${!day.isCurrentMonth ? "#d1d5db" : day.isDisabled ? "#e5e7eb" : "#374151"};
      `;

      // Range fill
      if (day.isInRange) {
        cell.style.background = "#eef2ff";
        cell.style.borderRadius = "0";
      }

      // Range start/end rounded edges
      if (day.isRangeStart) {
        cell.style.borderRadius = "8px 0 0 8px";
      }
      if (day.isRangeEnd) {
        cell.style.borderRadius = "0 8px 8px 0";
      }
      if (day.isSelected && !day.isInRange) {
        cell.style.background = "#4338ca";
        cell.style.color = "#fff";
        cell.style.fontWeight = "600";
      }

      // Today indicator
      if (day.isToday && !day.isSelected) {
        cell.style.fontWeight = "700";
        cell.style.color = "#4338ca";
        cell.style.border = "2px solid #c7d2fe";
      }

      // Highlighted dot
      if (day.isHighlighted && !day.isSelected) {
        const dot = document.createElement("span");
        dot.style.cssText = `
          position:absolute;bottom:3px;width:4px;height:4px;border-radius:50%;
          background:#f59e0b;
        `;
        cell.appendChild(dot);
      }

      const numEl = document.createElement("span");
      numEl.textContent = String(parseInt(day.date.slice(8), 10));
      cell.appendChild(numEl);

      if (!day.isDisabled) {
        cell.addEventListener("mouseenter", () => {
          if (!day.isSelected && !day.isInRange) {
            cell.style.background = "#f3f4f6";
          }
        });
        cell.addEventListener("mouseleave", () => {
          if (!day.isSelected && !day.isInRange) {
            cell.style.background = "";
          }
        });
        cell.addEventListener("click", () => handleDayClick(day));
      }

      return cell;
    }

    function handleDayClick(day: CalendarDay): void {
      if (day.isDisabled || opts.disabled) return;

      if (opts.mode === "single") {
        selectedValue = day.date;
      } else if (opts.mode === "range") {
        const range = selectedValue as [string, string];
        if (!range[0] || (range[0] && range[1])) {
          // Start new range
          selectedValue = [day.date, ""];
        } else {
          // Set end of range (ensure order)
          if (day.date < range[0]) {
            selectedValue = [day.date, range[0]];
          } else {
            selectedValue = [range[0], day.date];
          }
        }
      } else if (opts.mode === "multi") {
        const arr = selectedValue as string[];
        const idx = arr.indexOf(day.date);
        if (idx >= 0) {
          arr.splice(idx, 1);
        } else {
          arr.push(day.date);
        }
        selectedValue = arr;
      }

      render();
      opts.onChange?.(selectedValue);
      opts.onDayClick?.(day);
    }

    function renderFooter(): void {
      footerEl.innerHTML = "";

      // Mode hint
      if (opts.mode === "range") {
        const range = selectedValue as [string, string];
        const hint = document.createElement("span");
        hint.style.cssText = "font-size:11px;color:#9ca3af;";
        if (range[0] && !range[1]) {
          hint.textContent = `${opts.labels.selectRange}... (${range[0]})`;
        } else if (range[0] && range[1]) {
          hint.textContent = `${range[0]} \u2014 ${range[1]}`;
        } else {
          hint.textContent = opts.labels.selectRange!;
        }
        footerEl.appendChild(hint);
      }

      // Buttons
      const btnGroup = document.createElement("div");
      btnGroup.style.cssText = "display:flex;gap:6px;";

      if (opts.showTodayBtn) {
        const todayBtn = document.createElement("button");
        todayBtn.type = "button";
        todayBtn.textContent = opts.labels.today!;
        todayBtn.style.cssText = `
          padding:4px 12px;font-size:11px;border-radius:4px;background:none;
          border:1px solid #d1d5db;color:#6b7280;cursor:pointer;
        `;
        todayBtn.addEventListener("click", () => instance.goToday());
        todayBtn.addEventListener("mouseenter", () => { todayBtn.style.borderColor = "#6366f1"; todayBtn.style.color = "#4338ca"; });
        todayBtn.addEventListener("mouseleave", () => { todayBtn.style.borderColor = "#d1d5db"; todayBtn.style.color = "#6b7280"; });
        btnGroup.appendChild(todayBtn);
      }

      // Clear button
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.textContent = opts.labels.clear!;
      clearBtn.style.cssText = `
        padding:4px 12px;font-size:11px;border-radius:4px;background:none;
        border:1px solid #d1d5db;color:#6b7280;cursor:pointer;
      `;
      clearBtn.addEventListener("click", () => { instance.clearSelection(); });
      clearBtn.addEventListener("mouseenter", () => { clearBtn.style.borderColor = "#ef4444"; clearBtn.style.color = "#dc2626"; });
      clearBtn.addEventListener("mouseleave", () => { clearBtn.style.borderColor = "#d1d5db"; clearBtn.style.color = "#6b7280"; });
      btnGroup.appendChild(clearBtn);

      footerEl.appendChild(btnGroup);
    }

    // Initial render
    render();

    const instance: CalendarPickerInstance = {
      element: container,

      getValue() { return selectedValue; },

      setValue(value: string | [string, string] | string[]) {
        selectedValue = value;
        render();
      },

      getViewMonth() { return { year: viewYear, month: viewMonth }; },

      setViewMonth(year: number, month: number) {
        viewYear = year;
        viewMonth = Math.max(0, Math.min(11, month));
        render();
      },

      goToday() {
        const now = new Date();
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();
        render();
      },

      clearSelection() {
        if (opts.mode === "range") selectedValue = ["", ""];
        else if (opts.mode === "multi") selectedValue = [];
        else selectedValue = "";
        render();
        opts.onChange?.(selectedValue);
      },

      setDisabledDates(dates: string[] | ((date: string) => boolean)) {
        opts.disabledDates = dates;
        render();
      },

      setHighlightedDates(dates: string[]) {
        opts.highlightedDates = dates;
        render();
      },

      destroy() { container.innerHTML = ""; },
    };

    return instance;
  }
}

/** Convenience: create a calendar picker */
export function createCalendarPicker(options: CalendarPickerOptions): CalendarPickerInstance {
  return new CalendarPickerManager().create(options);
}
