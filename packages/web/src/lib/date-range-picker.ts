/**
 * Date Range Picker: Calendar-based date range selection with presets,
 * min/max constraints, disabled dates, custom formatting, and responsive layout.
 */

// --- Types ---

export type DateRangePreset = {
  label: string;
  value: [Date, Date];
};

export interface DateRangePickerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial start date */
  startDate?: Date | string;
  /** Initial end date */
  endDate?: Date | string;
  /** Minimum selectable date */
  minDate?: Date | string;
  /** Maximum selectable date */
  maxDate?: Date | string;
  /** Disabled dates (function or array) */
  disabledDates?: ((date: Date) => boolean) | Array<Date | string>;
  /** Preset ranges */
  presets?: DateRangePreset[];
  /** Show preset buttons? */
  showPresets?: boolean;
  /** Show time selection? */
  showTime?: boolean;
  /** Date format for display */
  format?: string;
  /** First day of week (0=Sun, 1=Mon) */
  firstDayOfWeek?: number;
  /** Locale for month/day names */
  locale?: "en" | "zh" | "ja" | "ko";
  /** Disabled state */
  disabled?: boolean;
  /** Callback on range change */
  onChange?: (start: Date | null, end: Date | null) => void;
  /** Callback on apply (if using apply button) */
  onApply?: (start: Date | null, end: Date | null) => void;
  /** Custom CSS class */
  className?: string;
}

export interface DateRangePickerInstance {
  element: HTMLElement;
  getStartDate: () => Date | null;
  getEndDate: () => Date | null;
  setRange: (start: Date | null, end: Date | null) => void;
  clear: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Locale Data ---

const LOCALES: Record<string, { months: string[]; shortMonths: string[]; days: string[]; shortDays: string[]; today: string; clear: string; apply: string }> = {
  en: {
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    shortDays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    today: "Today",
    clear: "Clear",
    apply: "Apply",
  },
  zh: {
    months: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
    shortMonths: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    days: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
    shortDays: ["日", "一", "二", "三", "四", "五", "六"],
    today: "今天",
    clear: "清除",
    apply: "确定",
  },
  ja: {
    months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    shortMonths: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    days: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
    shortDays: ["日", "月", "火", "水", "木", "金", "土"],
    today: "今日",
    clear: "クリア",
    apply: "適用",
  },
  ko: {
    months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
    shortMonths: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
    days: ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"],
    shortDays: ["일", "월", "화", "수", "목", "금", "토"],
    today: "오늘",
    clear: "지우기",
    적용: "적용",
  } as any,
};

// Fix ko locale
(LOCALES.ko as any).apply = "적용";

// --- Helpers ---

function parseDate(d: Date | string | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function toMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const d = toMidnight(date);
  return d >= toMidnight(start) && d <= toMidnight(end);
}

function pad2(n: number): string { return String(n).padStart(2, "0"); }

function formatDateDisplay(d: Date, fmt: string = "yyyy-MM-dd"): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return fmt.replace("yyyy", String(y)).replace("MM", m).replace("dd", day);
}

const DEFAULT_PRESETS: DateRangePreset[] = [
  { label: "Today", value: [new Date(), new Date()] },
  { label: "Yesterday", value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [new Date(d), new Date(d)]; })() },
  { label: "Last 7 days", value: (() => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 6); return [s, e]; })() },
  { label: "Last 30 days", value: (() => { const e = new Date(); const s = new Date(); s.setDate(s.getDate() - 29); return [s, e]; })() },
  { label: "This month", value: (() => { const e = new Date(); const s = new Date(e.getFullYear(), e.getMonth(), 1); return [s, e]; })() },
  { label: "Last month", value: (() => { const e = new Date(new Date().getFullYear(), new Date().getDate(), 0); const s = new Date(e.getFullYear(), e.getMonth(), 1); return [s, e]; })() },
];

// --- Main Factory ---

export function createDateRangePicker(options: DateRangePickerOptions): DateRangePickerInstance {
  const opts = {
    firstDayOfWeek: options.firstDayOfWeek ?? 0,
    locale: options.locale ?? "en",
    format: options.format ?? "yyyy-MM-dd",
    showPresets: options.showPresets ?? true,
    showTime: options.showTime ?? false,
    disabled: options.disabled ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DateRangePicker: container not found");

  const loc = LOCALES[opts.locale] ?? LOCALES.en;

  let startDate = parseDate(options.startDate);
  let endDate = parseDate(options.endDate);
  let viewMonth = (startDate ?? new Date()).getMonth();
  let viewYear = (startDate ?? new Date()).getFullYear();
  let hoverDate: Date | null = null;
  let destroyed = false;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `date-range-picker ${opts.className}`;
  wrapper.style.cssText = `
    display:inline-block;font-family:-apple-system,sans-serif;color:#374151;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;
  container.appendChild(wrapper);

  // Input display
  const inputRow = document.createElement("div");
  inputRow.className = "drp-input-row";
  inputRow.style.cssText = `
    display:flex;align-items:center;gap:8px;border:1px solid #d1d5db;border-radius:8px;
    padding:8px 12px;background:#fff;cursor:pointer;min-width:280px;
    transition:border-color 0.15s;
  `;
  inputRow.addEventListener("click", () => toggleDropdown());

  const startInput = document.createElement("input");
  startInput.type = "text";
  startInput.readOnly = true;
  startInput.placeholder = loc.today;
  startInput.value = startDate ? formatDateDisplay(startDate, opts.format) : "";
  startInput.style.cssText = `
    flex:1;border:none;outline:none;font-size:13px;background:transparent;
    color:#111827;cursor:pointer;text-align:center;
  `;

  const separator = document.createElement("span");
  separator.textContent = "\u2014";
  separator.style.cssText = "color:#9ca3af;font-size:14px;";

  const endInput = document.createElement("input");
  endInput.type = "text";
  endInput.readOnly = true;
  endInput.placeholder = loc.today;
  endInput.value = endDate ? formatDateDisplay(endDate, opts.format) : "";
  endInput.style.cssText = `
    flex:1;border:none;outline:none;font-size:13px;background:transparent;
    color:#111827;cursor:pointer;text-align:center;
  `;

  const arrowIcon = document.createElement("span");
  arrowIcon.innerHTML = "&#9662;";
  arrowIcon.style.cssText = "font-size:10px;color:#9ca3af;margin-left:4px;";

  inputRow.append(startInput, separator, endInput, arrowIcon);
  wrapper.appendChild(inputRow);

  // Dropdown panel
  const dropdown = document.createElement("div");
  dropdown.className = "drp-dropdown";
  dropdown.style.cssText = `
    position:absolute;z-index:1000;display:none;
    background:#fff;border:1px solid #e5e7eb;border-radius:10px;
    box-shadow:0 10px 40px rgba(0,0,0,0.12);padding:16px;min-width:340px;
    margin-top:4px;
  `;
  // Position relative to input
  wrapper.style.position = "relative";
  wrapper.appendChild(dropdown);

  function toggleDropdown(): void {
    if (dropdown.style.display === "block") closeDropdown();
    else openDropdown();
  }

  function openDropdown(): void {
    dropdown.style.display = "block";
    renderCalendar();
    document.addEventListener("click", outsideClick);
  }

  function closeDropdown(): void {
    dropdown.style.display = "none";
    document.removeEventListener("click", outsideClick);
  }

  function outsideClick(e: Event): void {
    if (!wrapper.contains(e.target as Node)) closeDropdown();
  }

  function renderCalendar(): void {
    dropdown.innerHTML = "";

    // Presets row
    if (opts.showPresets && opts.presets?.length) {
      const presetRow = document.createElement("div");
      presetRow.className = "drp-presets";
      presetRow.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;";
      for (const preset of (opts.presets ?? DEFAULT_PRESETS)) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = preset.label;
        btn.style.cssText = `
          padding:5px 12px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;
          cursor:pointer;font-size:12px;color:#374151;transition:all 0.15s;
        `;
        btn.addEventListener("click", () => {
          setRange(preset.value[0], preset.value[1]);
        });
        btn.addEventListener("mouseenter", () => { btn.style.background = "#f9fafb"; });
        btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
        presetRow.appendChild(btn);
      }
      dropdown.appendChild(presetRow);
    }

    // Calendar header (month nav)
    const calHeader = document.createElement("div");
    calHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.innerHTML = "&lsaquo;";
    prevBtn.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:18px;padding:4px 8px;
      border-radius:4px;color:#6b7280;
    `;
    prevBtn.addEventListener("click", () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } renderCalendar(); });
    prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "#f3f4f6"; });
    prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = ""; });

    const titleEl = document.createElement("span");
    titleEl.style.cssText = "font-weight:600;font-size:14px;color:#111827;";
    titleEl.textContent = `${loc.months[viewMonth]} ${viewYear}`;

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.innerHTML = "&rsaquo;";
    nextBtn.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:18px;padding:4px 8px;
      border-radius:4px;color:#6b7280;
    `;
    nextBtn.addEventListener("click", () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } renderCalendar(); });
    nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "#f3f4f6"; });
    nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = ""; });

    calHeader.append(prevBtn, titleEl, nextBtn);
    dropdown.appendChild(calHeader);

    // Day headers
    const dayHeaders = document.createElement("div");
    dayHeaders.style.cssText = "display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:4px;";
    for (let i = 0; i < 7; i++) {
      const idx = (i + opts.firstDayOfWeek) % 7;
      const th = document.createElement("span");
      th.textContent = loc.shortDays[idx];
      th.style.cssText = "font-size:11px;font-weight:600;color:#9ca3af;padding:6px 0;";
      dayHeaders.appendChild(th);
    }
    dropdown.appendChild(dayHeaders);

    // Day grid
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(7,1fr);gap:2px;";

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startOffset = (firstDay - opts.firstDayOfWeek + 7) % 7;

    // Empty cells before first day
    for (let i = 0; i < startOffset; i++) {
      const cell = document.createElement("div");
      cell.style.cssText = "padding:8px 0;text-align:center;";
      grid.appendChild(cell);
    }

    const minD = parseDate(opts.minDate);
    const maxD = parseDate(opts.maxDate);

    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(viewYear, viewMonth, day);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.textContent = String(day);
      cell.style.cssText = `
        padding:7px 0;text-align:center;border:none;border-radius:6px;
        cursor:pointer;font-size:13px;background:none;color:#374151;
        transition:background 0.1s;
      `;

      const isDisabled = (minD && cellDate < toMidnight(minD)) ||
        (maxD && cellDate > toMidnight(maxD)) ||
        (Array.isArray(opts.disabledDates) && opts.disabledDates.some(d => isSameDay(cellDate, parseDate(d)!))) ||
        (typeof opts.disabledDates === "function" && opts.disabledDates(cellDate));

      if (isDisabled) {
        cell.style.color = "#d1d5db";
        cell.style.cursor = "not-allowed";
        cell.disabled = true;
      } else {
        const isSelectedStart = startDate && isSameDay(cellDate, startDate);
        const isSelectedEnd = endDate && isSameDay(cellDate, endDate);
        const inRange = isBetween(cellDate, startDate, endDate);
        const isHovered = hoverDate && startDate && !endDate &&
          ((cellDate >= startDate && cellDate <= hoverDate) || (cellDate <= startDate && cellDate >= hoverDate));

        if (isSelectedStart || isSelectedEnd) {
          cell.style.background = "#4338ca";
          cell.style.color = "#fff";
          cell.style.fontWeight = "600";
        } else if (inRange || isHovered) {
          cell.style.background = "#eef2ff";
          cell.style.color = "#4338ca";
        }

        cell.addEventListener("click", () => handleDayClick(cellDate));
        cell.addEventListener("mouseenter", () => {
          if (!isDisabled) {
            hoverDate = cellDate;
            if (startDate && !endDate) renderCalendar();
          }
        });
        cell.addEventListener("mouseleave", () => {
          hoverDate = null;
          if (startDate && !endDate) renderCalendar();
        });

        cell.addEventListener("mouseenter", () => {
          if (!isDisabled && !(isSelectedStart || isSelectedEnd)) {
            cell.style.background = "#f3f4f6";
          }
        });
        cell.addEventListener("mouseleave", () => {
          if (!(isSelectedStart || isSelectedEnd) && !inRange && !isHovered) {
            cell.style.background = "";
          }
        });
      }

      grid.appendChild(cell);
    }

    dropdown.appendChild(grid);

    // Footer actions
    const footer = document.createElement("div");
    footer.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid #f0f0f0;";

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.textContent = loc.clear;
    clearBtn.style.cssText = `
      padding:6px 14px;border-radius:6px;border:1px solid #d1d5db;background:#fff;
      cursor:pointer;font-size:12px;color:#6b7280;
    `;
    clearBtn.addEventListener("click", () => { instance.clear(); });
    clearBtn.addEventListener("mouseenter", () => { clearBtn.style.background = "#f9fafb"; });
    clearBtn.addEventListener("mouseleave", () => { clearBtn.style.background = ""; });

    const todayBtn = document.createElement("button");
    todayBtn.type = "button";
    todayBtn.textContent = loc.today;
    todayBtn.style.cssText = `
      padding:6px 14px;border-radius:6px;border:1px solid #d1d5db;background:#fff;
      cursor:pointer;font-size:12px;color:#374151;
    `;
    todayBtn.addEventListener("click", () => { setRange(new Date(), new Date()); });
    todayBtn.addEventListener("mouseenter", () => { todayBtn.style.background = "#f9fafb"; });
    todayBtn.addEventListener("mouseleave", () => { todayBtn.style.background = ""; });

    footer.append(clearBtn, todayBtn);
    dropdown.appendChild(footer);
  }

  function handleDayClick(date: Date): void {
    if (!startDate || endDate) {
      // Start new selection
      startDate = date;
      endDate = null;
      hoverDate = null;
    } else {
      // Complete range
      if (date >= startDate) {
        endDate = date;
      } else {
        endDate = startDate;
        startDate = date;
      }
      hoverDate = null;
    }
    updateInputs();
    opts.onChange?.(startDate, endDate);
    renderCalendar();

    if (startDate && endDate) {
      opts.onApply?.(startDate, endDate);
    }
  }

  function setRange(start: Date, end: Date): void {
    startDate = start;
    endDate = end;
    hoverDate = null;
    updateInputs();
    opts.onChange?.(startDate, endDate);
    opts.onApply?.(startDate, endDate);
    renderCalendar();
  }

  function updateInputs(): void {
    startInput.value = startDate ? formatDateDisplay(startDate, opts.format) : "";
    endInput.value = endDate ? formatDateDisplay(endDate, opts.format) : "";
  }

  const instance: DateRangePickerInstance = {
    element: wrapper,

    getStartDate() { return startDate; },
    getEndDate() { return endDate; },

    setRange(start: Date | null, end: Date | null) {
      startDate = start;
      endDate = end;
      updateInputs();
      opts.onChange?.(startDate, endDate);
    },

    clear() {
      startDate = null;
      endDate = null;
      hoverDate = null;
      updateInputs();
      opts.onChange?.(null, null);
      if (dropdown.style.display === "block") renderCalendar();
    },

    disable() {
      opts.disabled = true;
      wrapper.style.opacity = "0.5";
      wrapper.style.pointerEvents = "none";
    },

    enable() {
      opts.disabled = false;
      wrapper.style.opacity = "";
      wrapper.style.pointerEvents = "";
    },

    destroy() {
      destroyed = true;
      document.removeEventListener("click", outsideClick);
      wrapper.remove();
    },
  };

  return instance;
}
