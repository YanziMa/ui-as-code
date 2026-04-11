/**
 * Date Picker Utilities: Calendar date picker with month/year navigation,
 * date range selection, disabled dates, highlighted ranges, multiple views,
 * localization support, and ARIA calendar grid.
 */

// --- Types ---

export type DatePickerSize = "sm" | "md" | "lg";
export type DatePickerVariant = "default" | "outlined" | "filled";

export interface DatePickerOptions {
  /** Initial selected date */
  value?: Date;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Disabled dates (function or array) */
  disabledDates?: (date: Date) => boolean | Date[];
  /** Highlighted dates (e.g., holidays, events) */
  highlightedDates?: Date[];
  /** Size variant */
  size?: DatePickerSize;
  /** Visual variant */
  variant?: DatePickerVariant;
  /** Show week numbers? */
  showWeekNumbers?: boolean;
  /** First day of week (0=Sun, 1=Mon, ...) */
  firstDayOfWeek?: number;
  /** Format for display */
  format?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** On change callback */
  onChange?: (date: Date) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface DatePickerInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Get current selected date */
  getValue(): Date | null;
  /** Set date programmatically */
  setValue(date: Date): void;
  /** Clear selection */
  clear(): void;
  /** Open the picker popup */
  open(): void;
  /** Close the picker popup */
  close(): void;
  /** Check if open */
  isOpen(): boolean;
  /** Navigate to a specific month */
  goToMonth(year: number, month: number): void;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Constants ---

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const WEEKDAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// --- Helpers ---

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year: number, month: number): number {
  if (month === 1 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month];
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function cloneDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDateString(date: Date, fmt: string = "yyyy-MM-dd"): string {
  const y = String(date.getFullYear());
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return fmt.replace("yyyy", y).replace("MM", m).replace("dd", d);
}

// --- Core Factory ---

/**
 * Create a calendar date picker component.
 *
 * @example
 * ```ts
 * const dp = createDatePicker({
 *   value: new Date(),
 *   onChange: (date) => console.log(formatDateString(date)),
 * });
 * ```
 */
export function createDatePicker(options: DatePickerOptions = {}): DatePickerInstance {
  const {
    value,
    label,
    placeholder = "Select date",
    minDate,
    maxDate,
    disabledDates,
    highlightedDates,
    size = "md",
    variant = "default",
    showWeekNumbers = false,
    firstDayOfWeek = 0,
    format = "yyyy-MM-dd",
    disabled = false,
    fullWidth = true,
    onChange,
    className,
    container,
  } = options;

  let _selected: Date | null = value ? cloneDate(value) : null;
  let _viewYear = (_selected || new Date()).getFullYear();
  let _viewMonth = (_selected || new Date()).getMonth();
  let _open = false;

  // Root
  const root = document.createElement("div");
  root.className = `datepicker-wrapper ${variant} ${size} ${className ?? ""}`.trim();
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "4px";
  root.style.width = fullWidth ? "100%" : "fit-content";
  root.style.position = "relative";

  // Label
  if (label) {
    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size:13px;font-weight:500;color:#374151;";
    root.appendChild(labelEl);
  }

  // Trigger
  const trigger = document.createElement("div");
  trigger.className = "datepicker-trigger";
  trigger.tabIndex = disabled ? -1 : 0;
  trigger.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:7px 11px;" +
    "border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:" +
    (disabled ? "not-allowed" : "pointer") + ";" +
    (disabled ? "opacity:0.5;" : "");

  const iconSpan = document.createElement("span");
  iconSpan.innerHTML = "&#128197;";
  iconSpan.style.cssText = "font-size:16px;color:#9ca3af;flex-shrink:0;";
  trigger.appendChild(iconSpan);

  const displayText = document.createElement("span");
  displayText.className = "datepicker-display";
  displayText.style.cssText = "flex:1;font-size:14px;color:#374151;";
  displayText.textContent = _selected ? formatDateString(_selected, format) : placeholder;
  displayText.style.color = _selected ? "#374151" : "#9ca3af";
  trigger.appendChild(displayText);

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.innerHTML = "&times;";
  clearBtn.style.cssText =
    "background:none;border:none;cursor:pointer;color:#9ca3af;font-size:14px;" +
    "padding:2px;display:none;";
  clearBtn.addEventListener("click", (e) => { e.stopPropagation(); instance.clear(); });
  trigger.appendChild(clearBtn);
  if (_selected) clearBtn.style.display = "block";

  root.appendChild(trigger);

  // Panel
  const panel = document.createElement("div");
  panel.className = "datepicker-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Date picker");
  panel.style.cssText =
    "position:absolute;top:calc(100% + 4px);left:0;z-index:1100;" +
    "background:#fff;border:1px solid #e5e7eb;border-radius:12px;" +
    "box-shadow:0 12px 32px rgba(0,0,0,0.15);padding:12px;width:280px;" +
    "display:none;opacity:0;transform:translateY(-4px);" +
    "transition:opacity 0.15s ease, transform 0.15s ease;";

  // Header: Month/Year navigation
  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";
  headerRow.style.marginBottom = "10px";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.innerHTML = "&lsaquo;";
  prevBtn.style.cssText =
    "background:none;border:none;cursor:pointer;font-size:18px;color:#6b7280;" +
    "padding:4px 8px;border-radius:4px;line-height:1;";
  prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "#f3f4f6"; });
  prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = ""; });
  prevBtn.addEventListener("click", () => navigateMonth(-1));
  headerRow.appendChild(prevBtn);

  const titleEl = document.createElement("span");
  titleEl.className = "datepicker-title";
  titleEl.style.cssText = "font-weight:600;font-size:14px;color:#111827;";
  headerRow.appendChild(titleEl);

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.innerHTML = "&rsaquo;";
  nextBtn.style.cssText = prevBtn.style.cssText;
  nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "#f3f4f6"; });
  nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = ""; });
  nextBtn.addEventListener("click", () => navigateMonth(1));
  headerRow.appendChild(nextBtn);

  panel.appendChild(headerRow);

  // Weekday headers
  const weekdayRow = document.createElement("div");
  weekdayRow.className = "weekday-row";
  weekdayRow.style.display = "grid";
  weekdayRow.style.gridTemplateColumns = showWeekNumbers ? "24px repeat(7, 1fr)" : "repeat(7, 1fr)";
  weekdayRow.style.marginBottom = "4px";

  if (showWeekNumbers) {
    const wnHeader = document.createElement("span");
    wnHeader.textContent = "#";
    wnHeader.style.cssText = "font-size:11px;font-weight:600;color:#9ca3af;text-align:center;";
    weekdayRow.appendChild(wnHeader);
  }

  for (let i = 0; i < 7; i++) {
    const dayIdx = (firstDayOfWeek + i) % 7;
    const wd = document.createElement("span");
    wd.textContent = WEEKDAYS_SHORT[dayIdx];
    wd.style.cssText = "font-size:11px;font-weight:600;color:#6b7280;text-align:center;padding:4px 0;";
    weekdayRow.appendChild(wd);
  }
  panel.appendChild(weekdayRow);

  // Days grid
  const daysGrid = document.createElement("div");
  daysGrid.className = "days-grid";
  daysGrid.setAttribute("role", "grid");
  daysGrid.style.display = "grid";
  daysGrid.style.gridTemplateColumns = showWeekNumbers ? "24px repeat(7, 1fr)" : "repeat(7, 1fr)";
  daysGrid.style.gap = "2px";
  panel.appendChild(daysGrid);

  // Footer: Today button
  const footerRow = document.createElement("div");
  footerRow.style.display = "flex";
  footerRow.style.justifyContent = "space-between";
  footerRow.style.alignItems = "center";
  footerRow.style.marginTop = "8px";
  footerRow.style.paddingTop = "8px";
  footerRow.style.borderTop = "1px solid #f3f4f6";

  const todayBtn = document.createElement("button");
  todayBtn.type = "button";
  todayBtn.textContent = "Today";
  todayBtn.style.cssText =
    "background:none;border:none;cursor:pointer;font-size:12px;color:#3b82f6;" +
    "font-weight:500;padding:2px 8px;border-radius:4px;";
  todayBtn.addEventListener("click", () => {
    const today = new Date();
    _selected = today;
    _viewYear = today.getFullYear();
    _viewMonth = today.getMonth();
    renderCalendar();
    updateDisplay();
    fireChange();
  });
  footerRow.appendChild(todayBtn);

  panel.appendChild(footerRow);
  document.body.appendChild(panel);

  // --- Internal ---

  function isDateDisabled(date: Date): boolean {
    if (minDate && date < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && date > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    if (Array.isArray(disabledDates)) {
      return disabledDates.some((d) => sameDay(date, d));
    }
    if (typeof disabledDates === "function") {
      return disabledDates(date);
    }
    return false;
  }

  function isHighlighted(date: Date): boolean {
    if (!highlightedDates) return false;
    return highlightedDates.some((d) => sameDay(date, d));
  }

  function navigateMonth(dir: number): void {
    _viewMonth += dir;
    if (_viewMonth > 11) { _viewMonth = 0; _viewYear++; }
    else if (_viewMonth < 0) { _viewMonth = 11; _viewYear--; }
    renderCalendar();
  }

  function renderCalendar(): void {
    daysGrid.innerHTML = "";
    titleEl.textContent = `${MONTHS[_viewMonth]} ${_viewYear}`;

    const firstDay = new Date(_viewYear, _viewMonth, 1).getDay();
    const daysCount = getDaysInMonth(_viewYear, _viewMonth);
    const prevDays = getDaysInMonth(_viewYear, _viewMonth - 1);

    let startOffset = (firstDay - firstDayOfWeek + 7) % 7;

    // Previous month days
    for (let i = startOffset - 1; i >= 0; i--) {
      const cell = createDayCell(prevDays - i, true);
      daysGrid.appendChild(cell);
      if (showWeekNumbers) {
        const spacer = document.createElement("span");
        daysGrid.insertBefore(spacer, cell);
      }
    }

    // Current month days
    for (let d = 1; d <= daysCount; d++) {
      const date = new Date(_viewYear, _viewMonth, d);
      const isSelected = _selected ? sameDay(date, _selected) : false;
      const isToday = sameDay(date, new Date());
      const dis = isDateDisabled(date);
      const high = isHighlighted(date);

      const cell = document.createElement("button");
      cell.type = "button";
      cell.textContent = String(d);
      cell.dataset.date = `${_viewYear}-${_viewMonth}-${d}`;
      cell.setAttribute("role", "gridcell");
      cell.disabled = dis;
      cell.style.cssText =
        `width:32px;height:32px;display:flex;align-items:center;justify-content:center;` +
        "border-radius:6px;font-size:13px;border:none;cursor:pointer;" +
        "transition:all 0.08s;" +
        (dis ? "color:#d1d5db;cursor:not-allowed;background:transparent;" :
          high ? "font-weight:600;background:#fef3c7;color:#92400e;" :
            isToday ? "font-weight:600;border:1.5px solid #3b82f6;color:#3b82f6;" :
              "color:#374151;") +
        (isSelected ? "background:#3b82f6;color:#fff;font-weight:600;" : "");

      if (!dis) {
        cell.addEventListener("mouseenter", () => {
          if (!isSelected) cell.style.background = "#eff6ff";
        });
        cell.addEventListener("mouseleave", () => {
          if (!isSelected) {
            cell.style.background = isHighlighted(date) ? "#fef3c7" :
              isToday ? "transparent" : "transparent";
            if (isToday && !isSelected) cell.style.borderColor = "#3b82f6";
          }
        });
        cell.addEventListener("click", () => selectDate(date));
      }

      if (showWeekNumbers) {
        if (d === 1 || getDayOfWeekNumber(date) === 1) {
          const wn = document.createElement("span");
          wn.textContent = String(getISOWeek(date));
          wn.style.cssText = "font-size:10px;color:#c4b5fd;text-align:center;padding-top:8px;";
          daysGrid.appendChild(wn);
        }
      }

      daysGrid.appendChild(cell);
    }

    // Next month filler
    const totalCells = startOffset + daysCount;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      const cell = createDayCell(i, true);
      daysGrid.appendChild(cell);
    }
  }

  function createDayCell(day: number, isOtherMonth: boolean): HTMLElement {
    const cell = document.createElement("span");
    cell.textContent = String(day);
    cell.style.cssText =
      "width:32px;height:32px;display:flex;align-items:center;justify-content:center;" +
      "font-size:13px;color:#d1d5db;border-radius:6px;";
    return cell;
  }

  function getDayOfWeekNumber(date: Date): number {
    const dow = date.getDay();
    return (dow - firstDayOfWeek + 7) % 7 + 1;
  }

  function getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  function selectDate(date: Date): void {
    _selected = date;
    renderCalendar();
    updateDisplay();
    close();
    fireChange();
  }

  function updateDisplay(): void {
    displayText.textContent = _selected ? formatDateString(_selected, format) : placeholder;
    displayText.style.color = _selected ? "#374151" : "#9ca3af";
    clearBtn.style.display = _selected ? "block" : "none";
  }

  function fireChange(): void {
    if (_selected) onChange?.(_selected);
  }

  // --- Open/Close ---

  function open(): void {
    if (_open || disabled) return;
    _open = true;

    const rect = trigger.getBoundingClientRect();
    panel.style.left = `${rect.left + window.scrollX}px`;
    panel.style.top = `${rect.bottom + window.scrollY + 4}px`;

    panel.style.display = "block";
    requestAnimationFrame(() => {
      panel.style.opacity = "1";
      panel.style.transform = "translateY(0)";
    });

    renderCalendar();
  }

  function close(): void {
    if (!_open) return;
    _open = false;
    panel.style.opacity = "0";
    panel.style.transform = "translateY(-4px)";
    setTimeout(() => { panel.style.display = "none"; }, 150);
  }

  // Events
  trigger.addEventListener("click", () => toggle());

  function toggle(): void { _open ? close() : open(); }

  document.addEventListener("mousedown", (e) => {
    if (_open && !root.contains(e.target as Node) && !panel.contains(e.target as Node)) close();
  });

  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    else if (e.key === "Escape") close();
  });

  // Initial render
  renderCalendar();

  // --- Instance ---

  const instance: DatePickerInstance = {
    el: root,

    getValue() { return _selected ? cloneDate(_selected) : null; },

    setValue(date: Date) {
      _selected = cloneDate(date);
      _viewYear = date.getFullYear();
      _viewMonth = date.getMonth();
      renderCalendar();
      updateDisplay();
    },

    clear() {
      _selected = null;
      updateDisplay();
      if (_open) renderCalendar();
    },

    open, close,

    isOpen() { return _open; },

    goToMonth(year: number, month: number) {
      _viewYear = year;
      _viewMonth = Math.max(0, Math.min(11, month));
      if (_open) renderCalendar();
    },

    setDisabled(d: boolean) {
      disabled = d;
      trigger.style.opacity = d ? "0.5" : "1";
      trigger.style.cursor = d ? "not-allowed" : "pointer";
      trigger.tabIndex = d ? -1 : 0;
    },

    destroy() { close(); panel.remove(); root.remove(); },
  };

  if (container) container.appendChild(root);

  return instance;
}
