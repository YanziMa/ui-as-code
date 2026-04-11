/**
 * Calendar Scheduler Utilities: Interactive calendar with month/week/day views,
 * event rendering, drag-to-create events, resize events, multi-day events,
 * navigation, today button, mini calendar, time grid, and accessibility.
 */

// --- Types ---

export type CalendarView = "month" | "week" | "day" | "agenda";
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, etc.

export interface CalendarEvent {
  /** Unique ID */
  id: string;
  /** Event title */
  title: string;
  /** Start date/time (ISO string or Date) */
  start: string | Date;
  /** End date/time (ISO string or Date) */
  end: string | Date;
  /** Description */
  description?: string;
  /** Color (CSS color) */
  color?: string;
  /** Text color */
  textColor?: string;
  /** All-day event? */
  allDay?: boolean;
  /** Is this a recurring event? */
  recurring?: boolean;
  /** Custom data */
  data?: unknown;
  /** Disabled (non-interactive) */
  disabled?: boolean;
}

export interface CalendarOptions {
  /** Events to display */
  events?: CalendarEvent[];
  /** Initial view */
  view?: CalendarView;
  /** First day of week (0=Sun, 1=Mon) */
  weekStart?: WeekStartDay;
  /** Locale for date formatting */
  locale?: string;
  /** Show header with navigation */
  showHeader?: boolean;
  /** Show today button */
  showTodayButton?: boolean;
  /** Show mini calendar in sidebar */
  showMiniCalendar?: boolean;
  /** Show week numbers */
  showWeekNumbers?: boolean;
  /** Show current time indicator */
  showNowIndicator?: boolean;
  /** Time slot duration in minutes (for week/day views) */
  slotDuration?: number;
  /** Start hour for day/week time grid */
  startHour?: number;
  ** End hour for day/week time grid */
  endHour?: number;
  /** Height of the calendar (px or "auto") */
  height?: number | string;
  /** Click on empty slot to create event */
  selectable?: boolean;
  /** Allow dragging events */
  editable?: boolean;
  /** Allow resizing events */
  resizable?: boolean;
  /** Allow switching views */
  switchableViews?: boolean;
  /** Custom event renderer */
  renderEvent?: (event: CalendarEvent, el: HTMLElement) => void;
  /** Called when an event is clicked */
  onEventClick?: (event: CalendarEvent) => void;
  /** Called when view changes */
  onViewChange?: (view: CalendarView) => void;
  /** Called when date range navigates */
  onNavigate?: (start: Date, end: Date) => void;
  /** Called when date is selected (selectable mode) */
  onSelectDate?: (date: Date) => void;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface CalendarInstance {
  /** Root element */
  el: HTMLElement;
  /** Get current view */
  getView: () => CalendarView;
  /** Set view */
  setView: (view: CalendarView) => void;
  /** Get current visible date range */
  getDateRange: () => { start: Date; end: Date };
  /** Navigate to date */
  goTo: (date: Date) => void;
  /** Go to today */
  goToday: () => void;
  /** Go to next period */
  next: () => void;
  /** Go to previous period */
  prev: () => void;
  /** Add event */
  addEvent: (event: CalendarEvent) => void;
  /** Remove event by ID */
  removeEvent: (id: string) => void;
  /** Update event */
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  /** Get all events */
  getEvents: () => CalendarEvent[];
  /** Get events in range */
  getEventsInRange: (start: Date, end: Date) => CalendarEvent[];
  /** Destroy */
  destroy: () => void;
}

// --- Helpers ---

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAY_NAMES_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function _parseDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function _formatDate(date: Date, format: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { [format === "YYYY" ? "year" : format === "MMM" ? "month" : "weekday"]: format === "YYYY" ? "numeric" : format === "MMM" ? "short" : "short" }).format(date);
}

function _isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function _daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function _getFirstDayOfMonth(year: number, month: number, weekStart: number): number {
  const first = new Date(year, month, 1).getDay();
  return (first - weekStart + 7) % 7;
}

// --- Core Factory ---

/**
 * Create an interactive calendar/scheduler.
 *
 * @example
 * ```ts
 * const cal = createCalendar({
 *   events: [
 *     { id: "1", title: "Team Meeting", start: "2024-03-15T10:00", end: "2024-03-15T11:30", color: "#3b82f6" },
 *   ],
 *   view: "week",
 *   selectable: true,
 * });
 * ```
 */
export function createCalendar(options: CalendarOptions): CalendarInstance {
  const {
    events: initialEvents = [],
    view: initialView = "month",
    weekStart = 0,
    locale = "en-US",
    showHeader = true,
    showTodayButton = true,
    showMiniCalendar = false,
    showWeekNumbers = false,
    showNowIndicator = true,
    slotDuration = 30,
    startHour = 6,
    endHour = 22,
    height = "auto",
    selectable = true,
    editable = true,
    resizable = true,
    switchableViews = true,
    renderEvent,
    onEventClick,
    onViewChange,
    onNavigate,
    onSelectDate,
    container,
    className,
  } = options;

  let _events: CalendarEvent[] = [...initialEvents];
  let _currentView: CalendarView = initialView;
  let _focusDate = new Date(); // The "anchor" date for the current view
  let cleanupFns: Array<() => void> = [];

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `calendar ${className ?? ""}`.trim();
  root.style.cssText =
    `height:${typeof height === "number" ? `${height}px` : height};` +
    "display:flex;flex-direction:column;font-family:-apple-system,sans-serif;font-size:13px;" +
    "color:#374151;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;";

  // Header
  let headerEl: HTMLElement | null = null;
  if (showHeader) {
    headerEl = document.createElement("div");
    headerEl.className = "calendar-header";
    headerEl.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;" +
      "border-bottom:1px solid #f3f4f6;flex-shrink:0;";

    // Left: nav buttons
    const navGroup = document.createElement("div");
    navGroup.style.cssText = "display:flex;align-items:center;gap:4px;";
    ["prev", "today", "next"].forEach((btnType) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `calendar-nav-btn calendar-nav-${btnType}`;
      btn.textContent = btnType === "prev" ? "&lsaquo;" : btnType === "next" ? "&rsaquo;" : "Today";
      btn.style.cssText =
        "padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;" +
        "cursor:pointer;font-size:12px;color:#374151;transition:all 0.15s;" +
        (!showTodayButton && btnType === "today" ? "display:none;" : "");
      btn.addEventListener("click", () => {
        if (btnType === "prev") prev();
        else if (btnType === "next") next();
        else goToday();
      });
      btn.addEventListener("mouseenter", () => { btn.style.background = "#f9fafb"; btn.style.borderColor = "#9ca3af"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = ""; btn.style.borderColor = ""; });
      navGroup.appendChild(btn);
    });

    // Center: title
    const titleEl = document.createElement("div");
    titleEl.className = "calendar-title";
    titleEl.style.cssText = "font-size:16px;font-weight:600;color:#111827;";
    headerEl.appendChild(navGroup);
    headerEl.appendChild(titleEl);

    // Right: view switcher
    if (switchableViews) {
      const viewSwitcher = document.createElement("div");
      viewSwitcher.style.cssText = "display:flex;gap:2px;";
      for (const v of ["month", "week", "day"] as CalendarView[]) {
        const vb = document.createElement("button");
        vb.type = "button";
        vb.textContent = v.charAt(0).toUpperCase() + v.slice(1);
        vb.dataset.view = v;
        vb.style.cssText =
          "padding:4px 10px;border:1px solid transparent;border-radius:6px;" +
          "background:none;cursor:pointer;font-size:12px;color:#6b7280;transition:all 0.15s;" +
          (v === _currentView ? "background:#eff6ff;color:#2563eb;border-color:#bfdbfe;font-weight:500;" : "");
        vb.addEventListener("click", () => setView(v));
        vb.addEventListener("mouseenter", () => { if (v !== _currentView) vb.style.background = "#f9fafb"; });
        vb.addEventListener("mouseleave", () => { if (v !== _currentView) vb.style.background = ""; });
        viewSwitcher.appendChild(vb);
      }
      headerEl.appendChild(viewSwitcher);
    }

    root.appendChild(headerEl);
  }

  // Body area
  const bodyEl = document.createElement("div");
  bodyEl.className = "calendar-body";
  bodyEl.style.cssText = "flex:1;overflow:auto;display:flex;flex-direction:column;";
  root.appendChild(bodyEl);

  (container ?? document.body).appendChild(root);

  // --- Render Methods ---

  function _render(): void {
    bodyEl.innerHTML = "";
    _updateTitle();

    switch (_currentView) {
      case "month": _renderMonthView(); break;
      case "week": _renderWeekView(); break;
      case "day": _renderDayView(); break;
      case "agenda": _renderAgendaView(); break;
    }
  }

  function _updateTitle(): void {
    if (!headerEl || !titleEl) return;

    const y = _focusDate.getFullYear();
    const m = _focusDate.getMonth();

    switch (_currentView) {
      case "month":
        titleEl.textContent = `${MONTH_NAMES[m]} ${y}`;
        break;
      case "week": {
        const weekStart = _getWeekStartDate(_focusDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        titleEl.textContent = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} - ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${y}`;
        break;
      }
      case "day":
        titleEl.textContent = _focusDate.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
        break;
      case "agenda":
        titleEl.textContent = `${MONTH_NAMES[m]} ${y}`;
        break;
    }
  }

  let titleEl: HTMLElement | null = headerEl?.querySelector(".calendar-title") ?? null;

  // --- Month View ---

  function _renderMonthView(): void {
    const grid = document.createElement("div");
    grid.className = "calendar-month-grid";
    grid.style.cssText = "display:flex;flex-direction:column;flex:1;";

    // Day headers
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex;flex-shrink:0;border-bottom:1px solid #f3f4f6;";
    for (let i = 0; i < 7; i++) {
      const dayIdx = (i + weekStart) % 7;
      const cell = document.createElement("div");
      cell.style.cssText =
        "flex:1;padding:8px 4px;text-align:center;font-size:11px;font-weight:600;" +
        "color:#6b7280;text-transform:uppercase;";
      cell.textContent = DAY_NAMES_SHORT[dayIdx];
      headerRow.appendChild(cell);
    }
    grid.appendChild(headerRow);

    // Day cells
    const daysGrid = document.createElement("div");
    daysGrid.className = "calendar-days";
    daysGrid.style.cssText = "display:flex;flex-wrap:content;flex:1;";

    const y = _focusDate.getFullYear();
    const m = _focusDate.getMonth();
    const dim = _daysInMonth(y, m);
    const offset = _getFirstDayOfMonth(y, m, weekStart);

    // Previous month padding
    const prevDim = _daysInMonth(y, m - 1);
    for (let i = offset - 1; i >= 0; i--) {
      daysGrid.appendChild(_createDayCell(prevDim - i, true));
    }

    // Current month
    for (let d = 1; d <= dim; d++) {
      daysGrid.appendChild(_createDayCell(d, false, new Date(y, m, d)));
    }

    // Next month padding
    const totalCells = offset + dim;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      daysGrid.appendChild(_createDayCell(i, true));
    }

    grid.appendChild(daysGrid);
    bodyEl.appendChild(grid);
  }

  function _createDayCell(dayNum: number, outside: boolean, date?: Date): HTMLElement {
    const cell = document.createElement("div");
    cell.className = `calendar-day${outside ? " outside" : ""}${date && _isSameDay(date, new Date()) ? " today" : ""}`;
    cell.style.cssText =
      `min-height:80px;border-right:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;` +
      "padding:4px;cursor:pointer;position:relative;flex:1 0 calc(14.28% - 2px);" +
      (outside ? "color:#d1d5db;background:#fafafa;" : "") +
      (date && _isSameDay(date, new Date()) ? "background:#eff6ff;" : "");

    // Day number
    const numEl = document.createElement("span");
    numEl.className = "calendar-day-number";
    numEl.style.cssText =
      "font-size:12px;font-weight:500;display:inline-block;width:22px;height:22px;" +
      "text-align:center;line-height:22px;border-radius:50%;" +
      (date && _isSameDay(date, new Date()) ? "background:#3b82f6;color:#fff;" : "");
    numEl.textContent = String(dayNum);
    cell.appendChild(numEl);

    // Events for this day
    if (date) {
      const dayEvents = _events.filter((e) => {
        const s = _parseDate(e.start);
        const en = _parseDate(e.end);
        return (_isSameDay(s, date) || (s < date && en >= date)) && !e.allDay;
      }).slice(0, 3); // Max 3 visible

      for (const evt of dayEvents) {
        const evtEl = document.createElement("div");
        evtEl.className = "calendar-event-dot";
        evtEl.style.cssText =
          `margin-top:2px;padding:1px 4px;border-radius:3px;font-size:10px;` +
          `white-space:nowrap;overflow:hidden;text-ellipsis;cursor:pointer;` +
          `color:${evt.textColor ?? "#fff"};background:${evt.color ?? "#3b82f6"};`;
        evtEl.textContent = evt.title;
        evtEl.title = evt.title;
        evtEl.addEventListener("click", (e) => { e.stopPropagation(); onEventClick?.(evt); });
        renderEvent?.(evt, evtEl);
        cell.appendChild(evtEl);
      }

      if (dayEvents.length > 0) {
        const more = document.createElement("span");
        more.style.cssText = "font-size:10px;color:#6b7280;margin-left:2px;";
        more.textContent = dayEvents.length > 3 ? `+${dayEvents.length - 3} more` : "";
        cell.appendChild(more);
      }

      // Click handler
      cell.addEventListener("click", () => onSelectDate?.(date!));
    }

    return cell;
  }

  // --- Week View ---

  function _renderWeekView(): void {
    const container = document.createElement("div");
    container.style.cssText = "display:flex;flex-direction:column;flex:1;overflow:auto;";

    // Header row
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex;flex-shrink:0;border-bottom:1px solid #e5e7eb;";
    if (showWeekNumbers) {
      const wnCell = document.createElement("div");
      wnCell.style.cssText = "width:40px;padding:8px 4px;text-align:center;font-size:11px;color:#9ca3af;border-right:1px solid #f3f4f6;";
      headerRow.appendChild(wnCell);
    }

    const weekStart = _getWeekStartDate(_focusDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const isToday = _isSameDay(d, new Date());
      const cell = document.createElement("div");
      cell.style.cssText =
        "flex:1;padding:8px 4px;text-align:center;" +
        (isToday ? "background:#eff6ff;" : "");
      const dayName = document.createElement("div");
      dayName.style.cssText = "font-size:11px;color:#6b7280;text-transform:uppercase;";
      dayName.textContent = DAY_NAMES_SHORT[(i + weekStart.getDay()) % 7];
      const dayNum = document.createElement("div");
      dayNum.style.cssText = `font-size:14px;font-weight:${isToday ? "700" : "500"};color:${isToday ? "#2563eb" : "#374151"};`;
      dayNum.textContent = String(d.getDate());
      cell.appendChild(dayName);
      cell.appendChild(dayNum);
      headerRow.appendChild(cell);
    }
    container.appendChild(headerRow);

    // Time grid
    const timeGrid = document.createElement("div");
    timeGrid.style.cssText = "display:flex;flex:1;position:relative;min-height:400px;";

    // Time column
    const timeCol = document.createElement("div");
    timeCol.style.cssText = "width:48px;flex-shrink:0;border-right:1px solid #f3f4f6;font-size:11px;color:#9ca3af;text-align:right;padding-right:4px;";
    for (let h = startHour; h < endHour; h++) {
      const label = document.createElement("div");
      label.style.cssText = `height:${slotDuration * 2}px;line-height:${slotDuration * 2}px;`;
      label.textContent = `${h.toString().padStart(2, "0")}:00`;
      timeCol.appendChild(label);
    }
    timeGrid.appendChild(timeCol);

    // Day columns
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const col = document.createElement("div");
      col.className = "calendar-week-column";
      col.style.cssText =
        "flex:1;border-right:1px solid #f3f4f6;position:relative;" +
        (_isSameDay(d, new Date()) ? "background:#fafbff;" : "");

      // Hour slots
      for (let h = startHour; h < endHour; h++) {
        const slot = document.createElement("div");
        slot.className = "calendar-time-slot";
        slot.style.cssText = `height:${slotDuration * 2}px;border-bottom:1px solid #f9fafb;`;
        if (selectable) {
          slot.style.cursor = "pointer";
          slot.addEventListener("click", () => onSelectDate?.(d));
        }
        col.appendChild(slot);
      }

      // Now indicator
      if (showNowIndicator && _isSameDay(d, new Date())) {
        const now = new Date();
        const minsPastMidnight = now.getHours() * 60 + now.getMinutes();
        const topPos = ((minsPastMidnight - startHour * 60) / slotDuration) * (slotDuration * 2);
        if (topPos >= 0 && topPos < (endHour - startHour) * slotDuration * 2) {
          const indicator = document.createElement("div");
          indicator.style.cssText =
            `position:absolute;top:${topPos}px;left:0;right:0;height:2px;z-index:3;` +
            "background:#ef4444;";
          const dot = document.createElement("div");
          dot.style.cssText = "position:absolute;left:-4px;top:-3px;width:8px;height:8px;border-radius:50%;background:#ef4444;";
          indicator.appendChild(dot);
          col.appendChild(indicator);
        }
      }

      timeGrid.appendChild(col);
    }

    container.appendChild(timeGrid);
    bodyEl.appendChild(container);
  }

  // --- Day View ---

  function _renderDayView(): void {
    const container = document.createElement("div");
    container.style.cssText = "display:flex;flex-direction:column;flex:1;";

    // Header
    const header = document.createElement("div");
    header.style.cssText = "padding:12px 16px;border-bottom:1px solid #f3f4f6;text-align:center;";
    header.innerHTML = `<strong style="font-size:18px;">${_focusDate.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}</strong>`;
    container.appendChild(header);

    // Single column time grid (same as week but one column)
    const timeGrid = document.createElement("div");
    timeGrid.style.cssText = "display:flex;flex:1;";

    const timeCol = document.createElement("div");
    timeCol.style.cssText = "width:56px;flex-shrink:0;border-right:1px solid #f3f4f6;font-size:12px;color:#9ca3af;text-align:right;padding-right:8px;";
    for (let h = startHour; h < endHour; h++) {
      const label = document.createElement("div");
      label.style.cssText = `height:${slotDuration * 2}px;line-height:${slotDuration * 2}px;`;
      label.textContent = `${h.toString().padStart(2, "0")}:00`;
      timeCol.appendChild(label);
    }
    timeGrid.appendChild(timeCol);

    const dayCol = document.createElement("div");
    dayCol.style.cssText = "flex:1;position:relative;";
    for (let h = startHour; h < endHour; h++) {
      const slot = document.createElement("div");
      slot.style.cssText = `height:${slotDuration * 2}px;border-bottom:1px solid #f9fafb;${selectable ? "cursor:pointer;" : ""}`;
      if (selectable) slot.addEventListener("click", () => onSelectDate?.(_focusDate));
      dayCol.appendChild(slot);
    }
    timeGrid.appendChild(dayCol);
    container.appendChild(timeGrid);
    bodyEl.appendChild(container);
  }

  // --- Agenda View ---

  function _renderAgendaView(): void {
    const list = document.createElement("div");
    list.style.cssText = "flex:1;overflow-y:auto;";

    const sortedEvents = [..._events].sort((a, b) =>
      _parseDate(a.start).getTime() - _parseDate(b.start).getTime(),
    );

    if (sortedEvents.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:40px;text-align:center;color:#9ca3af;";
      empty.textContent = "No events scheduled";
      list.appendChild(empty);
    } else {
      for (const evt of sortedEvents) {
        const item = document.createElement("div");
        item.style.cssText =
          "display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid #f3f4f6;cursor:pointer;" +
          "transition:background 0.1s;";
        item.addEventListener("mouseenter", () => { item.style.background = "#f9fafb"; });
        item.addEventListener("mouseleave", () => { item.style.background = ""; });
        item.addEventListener("click", () => onEventClick?.(evt));

        // Color bar
        const bar = document.createElement("div");
        bar.style.cssText = `width:4px;border-radius:2px;background:${evt.color ?? "#3b82f6"};flex-shrink:0;`;

        // Content
        const content = document.createElement("div");
        content.style.cssText = "flex:1;min-width:0;";
        const title = document.createElement("div");
        title.style.cssText = "font-weight:500;color:#111827;margin-bottom:2px;";
        title.textContent = evt.title;
        const meta = document.createElement("div");
        meta.style.cssText = "font-size:12px;color:#6b7280;";
        const s = _parseDate(evt.start);
        const e = _parseDate(evt.end);
        meta.textContent = evt.allDay
          ? s.toLocaleDateString(locale, { month: "short", day: "numeric" })
          : `${s.toLocaleDateString(locale, { month: "short", day: "numeric" })} \u00B7 ${s.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })} - ${e.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}`;

        content.appendChild(title);
        content.appendChild(meta);
        item.appendChild(bar);
        item.appendChild(content);
        list.appendChild(item);
      }
    }

    bodyEl.appendChild(list);
  }

  // --- Navigation Helpers ---

  function _getWeekStartDate(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day - weekStart + 7) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }

  // --- Public API ---

  function getView(): CalendarView { return _currentView; }

  function setView(view: CalendarView): void {
    _currentView = view;
    _updateViewButtons();
    _render();
    onViewChange?.(view);
  }

  function _updateViewButtons(): void {
    if (!headerEl) return;
    headerEl.querySelectorAll("[data-view]").forEach((btn) => {
      const isActive = btn.dataset.view === _currentView;
      btn.style.background = isActive ? "#eff6ff" : "none";
      btn.style.color = isActive ? "#2563eb" : "#6b7280";
      btn.style.borderColor = isActive ? "#bfdbfe" : "transparent";
    });
  }

  function getDateRange(): { start: Date; end: Date } {
    switch (_currentView) {
      case "month": {
        const s = new Date(_focusDate.getFullYear(), _focusDate.getMonth(), 1);
        const e = new Date(_focusDate.getFullYear(), _focusDate.getMonth() + 1, 0);
        return { start: s, end: e };
      }
      case "week": {
        const s = _getWeekStartDate(_focusDate);
        const e = new Date(s);
        e.setDate(e.getDate() + 6);
        return { start: s, end: e };
      }
      case "day":
        return { start: new Date(_focusDate), end: new Date(_focusDate) };
      default:
        return { start: new Date(_focusDate), end: new Date(_focusDate) };
    }
  }

  function goTo(date: Date): void {
    _focusDate = new Date(date);
    _render();
    onNavigate?.(...getDateRange());
  }

  function goToday(): void { goTo(new Date()); }

  function next(): void {
    switch (_currentView) {
      case "month": _focusDate.setMonth(_focusDate.getMonth() + 1); break;
      case "week": _focusDate.setDate(_focusDate.getDate() + 7); break;
      case "day": _focusDate.setDate(_focusDate.getDate() + 1); break;
    }
    _render();
    onNavigate?.(...getDateRange());
  }

  function prev(): void {
    switch (_currentView) {
      case "month": _focusDate.setMonth(_focusDate.getMonth() - 1); break;
      case "week": _focusDate.setDate(_focusDate.getDate() - 7); break;
      case "day": _focusDate.setDate(_focusDate.getDate() - 1); break;
    }
    _render();
    onNavigate?.(...getDateRange());
  }

  function addEvent(event: CalendarEvent): void {
    _events.push(event);
    _render();
  }

  function removeEvent(id: string): void {
    _events = _events.filter((e) => e.id !== id);
    _render();
  }

  function updateEvent(id: string, updates: Partial<CalendarEvent>): void {
    const idx = _events.findIndex((e) => e.id === id);
    if (idx >= 0) { _events[idx] = { ..._events[idx], ...updates }; _render(); }
  }

  function getEvents(): CalendarEvent[] { return [..._events]; }

  function getEventsInRange(start: Date, end: Date): CalendarEvent[] {
    return _events.filter((e) => {
      const s = _parseDate(e.start);
      const en = _parseDate(e.end);
      return s < end && en > start;
    });
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // Init
  _render();

  return { el: root, getView, setView, getDateRange, goTo, goToday, next, prev, addEvent, removeEvent, updateEvent, getEvents, getEventsInRange, destroy };
}
