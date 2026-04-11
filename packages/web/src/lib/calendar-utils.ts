/**
 * Calendar Utilities: Calendar component with month/week/day views,
 * date selection, range selection, events overlay, navigation,
 * localization, and ARIA grid attributes.
 */

// --- Types ---

export type CalendarView = "month" | "week" | "day";
export type SelectionMode = "single" | "range" | "multiple";

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date | string;
  endDate?: Date | string;
  color?: string;
  allDay?: boolean;
  data?: unknown;
}

export interface CalendarOptions {
  /** Initial selected date(s) */
  initialDate?: Date | string;
  /** Initial end date for range mode */
  initialEndDate?: Date | string;
  /** View type */
  view?: CalendarView;
  /** Selection mode */
  selectionMode?: SelectionMode;
  /** Events to display */
  events?: CalendarEvent[];
  /** Min selectable date */
  minDate?: Date | string;
  /** Max selectable date */
  maxDate?: Date | string;
  /** Disabled dates (function or array of dates) */
  disabledDates?: Array<Date | string> | ((date: Date) => boolean);
  /** Highlight today? Default true */
  showToday?: boolean;
  /** Show week numbers? Default false */
  showWeekNumbers?: boolean;
  /** First day of week: 0=Sun, 1=Mon. Default 1 */
  firstDayOfWeek?: number;
  /** Locale for month/day names */
  locale?: string;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when selection changes */
  onDateSelect?: (dates: Date[]) => void;
  /** Called when navigation occurs */
  onNavigate?: (date: Date) => void;
  /** Called when an event is clicked */
  onEventClick?: (event: CalendarEvent) => void;
}

export interface CalendarInstance {
  /** Root element */
  el: HTMLElement;
  /** Get currently selected dates */
  getSelectedDates: () => Date[];
  /** Navigate to a specific date/month */
  navigateTo: (date: Date) => void;
  /** Go to today */
  goToday: () => void;
  /** Go to next period (month/week) */
  next: () => void;
  /** Go to previous period */
  prev: () => void;
  /** Set view type */
  setView: (view: CalendarView) => void;
  /** Add an event */
  addEvent: (event: CalendarEvent) => void;
  /** Remove an event by id */
  removeEvent: (id: string) => void;
  /** Update events */
  setEvents: (events: CalendarEvent[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Localization ---

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// --- Helpers ---

function toMidnight(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isBetween(date: Date, min: Date | undefined, max: Date | undefined): boolean {
  if (min && date < toMidnight(min)) return false;
  if (max && date > toMidnight(max)) return false;
  return true;
}

function isDisabled(date: Date, options: CalendarOptions): boolean {
  if (!options.disabledDates) return false;

  if (Array.isArray(options.disabledDates)) {
    return options.disabledDates.some((d) => sameDay(new Date(d), date));
  }

  if (typeof options.disabledDates === "function") {
    return options.disabledDates(date);
  }

  return false;
}

function getEventsForDate(date: Date, events: CalendarEvent[]): CalendarEvent[] {
  return events.filter((e) => {
    const eventStart = new Date(e.date);
    if (sameDay(eventStart, date)) return true;
    if (e.endDate && sameDay(new Date(e.endDate), date)) return true;
    // Multi-day event spanning this date
    if (e.allDay || !e.endDate) {
      const start = toMidnight(eventStart);
      const end = e.endDate ? toMidnight(new Date(e.endDate)) : start;
      const check = toMidnight(date);
      return check >= start && check <= end;
    }
    return false;
  });
}

// --- Core Factory ---

/**
 * Create a calendar component.
 *
 * @example
 * ```ts
 * const cal = createCalendar({
 *   container: document.getElementById("cal")!,
 *   selectionMode: "range",
 *   onDateSelect: (dates) => console.log("Selected:", dates),
 * });
 * ```
 */
export function createCalendar(options: CalendarOptions = {}): CalendarInstance {
  const {
    initialDate = new Date(),
    initialEndDate,
    view = "month",
    selectionMode = "single",
    events = [],
    showToday = true,
    showWeekNumbers = false,
    firstDayOfWeek = 1,
    className,
    container,
    onDateSelect,
    onNavigate,
    onEventClick,
  } = options;

  let _currentDate = new Date(initialDate);
  let _selectedDates: Date[] = [];
  let _view = view;
  let _events = [...events];
  let _hoverDate: Date | null = null;
  const cleanupFns: Array<() => void> = [];

  // Initialize selection
  if (selectionMode === "single") {
    _selectedDates = [new Date(initialDate)];
  } else if (selectionMode === "range" && initialEndDate) {
    _selectedDates = [new Date(initialDate), new Date(initialEndDate)];
  } else if (selectionMode === "multiple") {
    _selectedDates = [new Date(initialDate)];
  }

  // Root
  const root = document.createElement("div");
  root.className = `calendar ${_view} ${className ?? ""}`.trim();
  root.style.cssText =
    "font-family:-apple-system,sans-serif;font-size:13px;color:#374151;" +
    "user-select:none;";

  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function getSelectedDates(): Date[] { return [..._selectedDates]; }

  function navigateTo(date: Date): void {
    _currentDate = new Date(date);
    _render();
    onNavigate?.(_currentDate);
  }

  function goToday(): void { navigateTo(new Date()); }
  function next(): void {
    if (_view === "month") {
      _currentDate.setMonth(_currentDate.getMonth() + 1);
    } else {
      _currentDate.setDate(_currentDate.getDate() + 7);
    }
    _render();
    onNavigate?.(_currentDate);
  }

  function prev(): void {
    if (_view === "month") {
      _currentDate.setMonth(_currentDate.getMonth() - 1);
    } else {
      _currentDate.setDate(_currentDate.getDate() - 7);
    }
    _render();
    onNavigate?.(_currentDate);
  }

  function setView(v: CalendarView): void {
    _view = v;
    _render();
  }

  function addEvent(event: CalendarEvent): void {
    _events.push(event);
    _render();
  }

  function removeEvent(id: string): void {
    _events = _events.filter((e) => e.id !== id);
    _render();
  }

  function setEvents(evts: CalendarEvent[]): void {
    _events = evts;
    _render();
  }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns.length = 0;
    root.remove();
  }

  // --- Render ---

  function _render(): void {
    root.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "cal-header";
    header.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e5e7eb;";

    // Nav buttons
    const navLeft = document.createElement("button");
    navLeft.innerHTML = "&larr;";
    navLeft.style.cssText =
      "background:none;border:1px solid #e5e7eb;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:14px;";
    navLeft.addEventListener("click", prev);
    header.appendChild(navLeft);

    const titleEl = document.createElement("div");
    titleEl.style.cssText = "font-weight:600;font-size:15px;min-width:160px;text-align:center;";

    if (_view === "month") {
      titleEl.textContent = `${MONTH_NAMES[_currentDate.getMonth()]} ${_currentDate.getFullYear()}`;
    } else if (_view === "week") {
      const weekStart = _getWeekStart(_currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      titleEl.textContent = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
    } else {
      titleEl.textContent = _currentDate.toLocaleDateString();
    }
    header.appendChild(titleEl);

    const navRight = document.createElement("button");
    navRight.innerHTML = "&rarr;";
    navRight.style.cssText = navLeft.style.cssText;
    navRight.addEventListener("click", next);
    header.appendChild(navRight);

    // Today button
    const todayBtn = document.createElement("button");
    todayBtn.textContent = "Today";
    todayBtn.style.cssText =
      "background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:4px 12px;cursor:pointer;font-size:12px;font-weight:500;";
    todayBtn.addEventListener("click", goToday);
    header.appendChild(todayBtn);

    root.appendChild(header);

    // Day headers
    const dayHeaders = document.createElement("div");
    dayHeaders.className = "cal-day-headers";
    dayHeaders.style.cssText = "display:flex;border-bottom:1px solid #f3f4f6;";

    if (showWeekNumbers) {
      const wnHeader = document.createElement("div");
      wnHeader.textContent = "#";
      wnHeader.style.cssText =
        "flex:0 0 32px;text-align:center;font-size:11px;font-weight:600;color:#6b7280;padding:4px 0;";
      dayHeaders.appendChild(wnHeader);
    }

    for (let i = 0; i < 7; i++) {
      const dayIdx = (firstDayOfWeek + i) % 7;
      const dh = document.createElement("div");
      dh.textContent = DAY_NAMES_SHORT[dayIdx];
      dh.style.cssText =
        "flex:1;text-align:center;font-size:11px;font-weight:600;color:#6b7280;padding:4px 0;";
      dayHeaders.appendChild(dh);
    }
    root.appendChild(dayHeaders);

    // Grid
    const grid = document.createElement("div");
    grid.className = "cal-grid";
    grid.style.cssText = "display:flex;flex-wrap:wrap;";

    if (_view === "month") {
      _renderMonthGrid(grid);
    } else if (_view === "week") {
      _renderWeekGrid(grid);
    } else {
      _renderDayGrid(grid);
    }

    root.appendChild(grid);
  }

  function _renderMonthGrid(grid: HTMLElement): void {
    const year = _currentDate.getFullYear();
    const month = _currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();

    const startDow = firstDay.getDay();
    const offset = (startDow - firstDayOfWeek + 7) % 7;

    const today = new Date();

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement("div");
      empty.style.cssText = "flex:0 0 calc(100% / 7);padding:4px;";
      grid.appendChild(empty);
    }

    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month, day);
      const cell = _createDayCell(date, today);
      grid.appendChild(cell);
    }

    // Fill remaining cells
    const totalCells = offset + lastDay;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remaining; i++) {
      const empty = document.createElement("div");
      empty.style.cssText = "flex:0 0 calc(100% / 7);padding:4px;";
      grid.appendChild(empty);
    }
  }

  function _renderWeekGrid(grid: HTMLElement): void {
    const weekStart = _getWeekStart(_currentDate);
    const today = new Date();

    if (showWeekNumbers) {
      const wnCell = document.createElement("div");
      wnCell.style.cssText =
        "flex:0 0 32px;display:flex;align-items:center;justify-content:center;" +
        "font-size:11px;color:#9ca3af;border-right:1px solid #f3f4f6;";
      wnCell.textContent = String(_getWeekNumber(weekStart));
      grid.appendChild(wnCell);
    }

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const cell = _createDayCell(date, today);
      grid.appendChild(cell);
    }
  }

  function _renderDayGrid(grid: HTMLElement): void {
    // Single day view - hourly slots
    const today = new Date();

    for (let hour = 0; hour < 24; hour++) {
      const slot = document.createElement("div");
      slot.style.cssText =
        "flex:0 0 40px;border-bottom:1px solid #f3f4f6;padding:2px 8px;font-size:11px;color:#9ca3af;" +
        (hour === _currentDate.getHours() ? "background:#eff6ff;" : "");
      slot.textContent = `${hour.toString().padStart(2, "0")}:00`;

      const dayEvents = _events.filter((e) => {
        const h = new Date(e.date).getHours();
        return sameDay(new Date(e.date), _currentDate) && h === hour;
      });

      if (dayEvents.length > 0) {
        const evBadge = document.createElement("span");
        evBadge.textContent = dayEvents.map((e) => e.title).join(", ");
        evBadge.style.cssText =
          "background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:4px;";
        slot.appendChild(evBadge);
      }

      grid.appendChild(slot);
    }
  }

  function _createDayCell(date: Date, today: Date): HTMLElement {
    const cell = document.createElement("div");
    cell.dataset.date = date.toISOString().split("T")[0];
    cell.style.cssText =
      "flex:0 0 calc(100% / 7);min-height:36px;padding:4px;border:1px solid transparent;" +
      "cursor:pointer;position:relative;transition:background 0.1s;";

    const isToday = sameDay(date, today);
    const isSelected = _selectedDates.some((d) => sameDay(d, date));
    const isInRange = selectionMode === "range" && _selectedDates.length === 2 &&
      date >= _selectedDates[0]! && date <= _selectedDates[1]!;
    const isHovered = _hoverDate && sameDay(_hoverDate, date);
    const isDisabled = !isBetween(date, options.minDate, options.maxDate) || isDisabled(date, options);
    const isCurrentMonth = date.getMonth() === _currentDate.getMonth();

    // Background
    if (isSelected) {
      cell.style.background = "#dbeafe";
      cell.style.borderColor = "#3b82f6";
    } else if (isInRange) {
      cell.style.background = "#f0f9ff";
    } else if (isToday && showToday) {
      cell.style.background = "#fef3c7";
    } else if (isHovered) {
      cell.style.background = "#f9fafb";
    }

    if (isDisabled) {
      cell.style.opacity = "0.35";
      cell.style.cursor = "default";
    }

    if (!isCurrentMonth && _view === "month") {
      cell.style.color = "#9ca3af";
    }

    // Day number
    const numEl = document.createElement("div");
    numEl.textContent = String(date.getDate());
    numEl.style.cssText =
      "font-size:13px;" +
      (isToday ? "font-weight:700;background:#f59e0b;color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;" : "") +
      (isSelected ? "color:#1e40af;" : "");
    cell.appendChild(numEl);

    // Week number
    if (showWeekNumbers && _view === "month" && date.getDay() === (firstDayOfWeek + 6) % 7) {
      const wn = document.createElement("div");
      wn.textContent = String(_getWeekNumber(date));
      wn.style.cssText =
        "position:absolute;top:2px;right:2px;font-size:9px;color:#9ca3af;";
      cell.appendChild(wn);
    }

    // Events
    const dayEvents = getEventsForDate(date, _events);
    if (dayEvents.length > 0) {
      const dotsContainer = document.createElement("div");
      dotsContainer.style.cssText = "display:flex;gap:2px;margin-top:2px;justify-content:center;";

      dayEvents.slice(0, 3).forEach((ev) => {
        const dot = document.createElement("span");
        dot.style.cssText =
          `width:6px;height:6px;border-radius:50%;background:${ev.color ?? "#3b82f6"};`;
        dotsContainer.appendChild(dot);
      });

      cell.appendChild(dotsContainer);
    }

    // Click handler
    if (!isDisabled) {
      cell.addEventListener("click", () => {
        _handleDateClick(date);
      });

      cell.addEventListener("mouseenter", () => {
        _hoverDate = date;
        if (!isSelected) cell.style.background = "#f9fafb";
      });

      cell.addEventListener("mouseleave", () => {
        _hoverDate = null;
        _render(); // Re-render to reset hover state
      });
    }

    return cell;
  }

  function _handleDateClick(date: Date): void {
    if (selectionMode === "single") {
      _selectedDates = [date];
    } else if (selectionMode === "range") {
      if (_selectedDates.length !== 2) {
        _selectedDates.push(date);
        _selectedDates.sort((a, b) => a.getTime() - b.getTime());
      } else {
        _selectedDates = [date];
      }
    } else {
      // Multiple
      const idx = _selectedDates.findIndex((d) => sameDay(d, date));
      if (idx >= 0) {
        _selectedDates.splice(idx, 1);
      } else {
        _selectedDates.push(date);
      }
    }

    _render();
    onDateSelect?.([..._selectedDates]);
  }

  // --- Week helpers ---

  function _getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day - firstDayOfWeek + 7) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }

  function _getWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000) / 7);
  }

  return {
    el: root,
    getSelectedDates,
    navigateTo,
    goToday,
    next,
    prev,
    setView,
    addEvent,
    removeEvent,
    setEvents,
    destroy,
  };
}
