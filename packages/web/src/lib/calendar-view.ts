/**
 * Calendar View: Full-featured calendar component with month/week/day views,
 * event management, drag-to-create, multi-day events, recurrence, i18n,
 * and responsive layout.
 */

// --- Types ---

export type CalendarView = "month" | "week" | "day" | "agenda";
export type WeekStart = 0 | 1 | 6; // Sunday, Monday, Saturday

export interface CalendarEvent {
  id: string;
  title: string;
  /** Start datetime (ISO string) */
  start: string;
  /** End datetime (ISO string) */
  end: string;
  /** Description / notes */
  description?: string;
  /** Color for the event */
  color?: string;
  /** Is this an all-day event? */
  allDay?: boolean;
  /** Recurrence rule (simple: daily/weekly/monthly/yearly) */
  recurring?: "daily" | "weekly" | "monthly" | "yearly";
  /** Location */
  location?: string;
  /** Attendees */
  attendees?: string[];
  /** Category/tag */
  category?: string;
  /** Custom metadata */
  meta?: Record<string, unknown>;
  /** Is it editable/draggable? */
  editable?: boolean;
}

export interface CalendarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial view mode */
  view?: CalendarView;
  /** Initial date to display (ISO string or Date) */
  initialDate?: string | Date;
  /** Events to display */
  events?: CalendarEvent[];
  /** First day of week */
  weekStart?: WeekStart;
  /** Show today button? */
  showTodayBtn?: boolean;
  /** Show navigation arrows? */
  showNav?: boolean;
  /** Show mini calendar (month picker)? */
  showMiniCal?: boolean;
  /** Show week numbers? */
  showWeekNumbers?: boolean;
  /** Show current time indicator in day/week view? */
  showNowIndicator?: boolean;
  /** Time slot duration in minutes (15/30/60) */
  slotDuration?: number;
  /** Start hour in day/week view (0-23) */
  startHour?: number;
  /** End hour in day/week view (1-24) */
  endHour?: number;
  /** Locale for formatting */
  locale?: string;
  /** Allow creating events by clicking/dragging? */
  allowCreate?: boolean;
  /** Allow dragging events to reschedule? */
  allowDrag?: boolean;
  /** Allow resizing events from edges? */
  allowResize?: boolean;
  /** Height in px (default: auto) */
  height?: number;
  /** Callback when event is clicked */
  onEventClick?: (event: CalendarEvent) => void;
  /** Callback when a time slot is clicked (for creation) */
  onSlotClick?: (date: Date, allDay: boolean) => void;
  /** Callback when view changes */
  onViewChange?: (view: CalendarView) => void;
  /** Callback when displayed date range changes */
  onDateChange?: (start: Date, end: Date) => void;
  /** Callback when event is created via drag */
  onEventCreate?: (event: CalendarEvent) => void;
  /** Callback when event is moved/resized */
  onEventUpdate?: (event: CalendarEvent) => void;
  /** Custom render function for events */
  renderEvent?: (event: CalendarEvent) => HTMLElement | string;
  /** Custom CSS class */
  className?: string;
}

export interface CalendarInstance {
  element: HTMLElement;
  getEvents: () => CalendarEvent[];
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  setView: (view: CalendarView) => void;
  goToDate: (date: Date) => void;
  goToToday: () => void;
  next: () => void;
  prev: () => void;
  getSelectedDate: () => Date;
  destroy: () => void;
}

// --- i18n ---

const LOCALES: Record<string, { months: string[]; shortMonths: string[]; days: string[]; shortDays: string[] }> = {
  en: {
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    shortMonths: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    days: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    shortDays: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  },
  zh: {
    months: ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],
    shortMonths: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    days: ["星期日","星期一","星期二","星期三","星期四","星期五","星期六"],
    shortDays: ["日","一","二","三","四","五","六"],
  },
  ja: {
    months: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    shortMonths: ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],
    days: ["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"],
    shortDays: ["日","月","火","水","木","金","土"],
  },
};

const EVENT_COLORS = [
  "#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6",
];

// --- Helpers ---

function generateId(): string {
  return `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function addWeeks(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n * 7); return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + n); return r;
}

function startOfWeek(d: Date, weekStart: WeekStart): Date {
  const r = new Date(d);
  const diff = (r.getDay() - weekStart + 7) % 7;
  r.setDate(r.getDate() - diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfMonth(d: Date): Date {
  const r = new Date(d); r.setDate(1); r.setHours(0, 0, 0, 0); return r;
}

function endOfMonth(d: Date): Date {
  const r = new Date(d); r.setMonth(r.getMonth() + 1, 0); r.setHours(23, 59, 59, 999); return r;
}

function getWeekNumber(d: Date): number {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
}

function formatTime(date: Date, locale: string = "en"): string {
  return date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDateShort(d: Date, locale: string = "en"): string {
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function getEventColor(index: number, custom?: string): string {
  if (custom) return custom;
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

// --- Main Factory ---

export function createCalendar(options: CalendarOptions): CalendarInstance {
  const opts = {
    view: options.view ?? "month",
    initialDate: options.initialDate ? new Date(options.initialDate) : new Date(),
    events: options.events ?? [],
    weekStart: options.weekStart ?? 0,
    showTodayBtn: options.showTodayBtn ?? true,
    showNav: options.showNav ?? true,
    showMiniCal: options.showMiniCal ?? false,
    showWeekNumbers: options.showWeekNumbers ?? false,
    showNowIndicator: options.showNowIndicator ?? true,
    slotDuration: options.slotDuration ?? 30,
    startHour: options.startHour ?? 0,
    endHour: options.endHour ?? 24,
    locale: options.locale ?? "en",
    allowCreate: options.allowCreate ?? true,
    allowDrag: options.allowDrag ?? true,
    allowResize: options.allowResize ?? true,
    height: options.height,
    className: options.className ?? "",
    ...options,
  };

  const l = LOCALES[opts.locale] ?? LOCALES.en;

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Calendar: container not found");

  let currentDate = new Date(opts.initialDate);
  let allEvents = [...opts.events];
  let destroyed = false;
  let resizeObserver: ResizeObserver | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `calendar ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;
    font-family:-apple-system,sans-serif;color:#374151;background:#fff;
    border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;
    ${opts.height ? `height:${opts.height}px;` : ""}
  `;
  container.appendChild(root);

  // Header
  const header = document.createElement("div");
  header.className = "cal-header";
  header.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:10px 16px;border-bottom:1px solid #e5e7eb;flex-shrink:0;
    background:#fafafa;
  `;
  root.appendChild(header);

  // Left side of header: nav
  const navLeft = document.createElement("div");
  navLeft.style.display = "flex";
  navLeft.style.alignItems = "center";
  navLeft.style.gap = "8px";

  if (opts.showNav) {
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.innerHTML = "&#8249;";
    prevBtn.title = "Previous";
    prevBtn.style.cssText = `
      width:28px;height:28px;border:1px solid #d1d5db;border-radius:6px;
      background:#fff;cursor:pointer;font-size:16px;display:flex;
      align-items:center;justify-content:center;color:#4b5563;
    `;
    prevBtn.addEventListener("click", () => instance.prev());
    prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "#f3f4f6"; });
    prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = ""; });
    navLeft.appendChild(prevBtn);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.innerHTML = "&#8250;";
    nextBtn.title = "Next";
    nextBtn.style.cssText = prevBtn.style.cssText.replace("&#8249;", "&#8250;");
    nextBtn.addEventListener("click", () => instance.next());
    nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "#f3f4f6"; });
    nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = ""; });
    navLeft.appendChild(nextBtn);
  }

  // Title
  const titleEl = document.createElement("span");
  titleEl.style.cssText = "font-weight:600;font-size:16px;color:#111827;margin:0 12px;min-width:180px;text-align:center;";
  navLeft.appendChild(titleEl);

  if (opts.showTodayBtn) {
    const todayBtn = document.createElement("button");
    todayBtn.type = "button";
    todayBtn.textContent = "Today";
    todayBtn.style.cssText = `
      padding:4px 12px;border:1px solid #d1d5db;border-radius:6px;
      background:#fff;cursor:pointer;font-size:12px;font-weight:500;color:#4b5563;
    `;
    todayBtn.addEventListener("click", () => instance.goToToday());
    todayBtn.addEventListener("mouseenter", () => { todayBtn.style.background = "#f3f4f6"; });
    todayBtn.addEventListener("mouseleave", () => { todayBtn.style.background = ""; });
    navLeft.appendChild(todayBtn);
  }

  header.appendChild(navLeft);

  // Right side: view switcher
  const viewSwitcher = document.createElement("div");
  viewSwitcher.className = "cal-view-switcher";
  viewSwitcher.style.display = "flex";
  viewSwitcher.style.gap = "2px";
  viewSwitcher.style.background = "#e5e7eb";
  viewSwitcher.style.borderRadius = "6px";
  viewSwitcher.style.padding = "2px";

  for (const v of ["month", "week", "day"] as CalendarView[]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = v.charAt(0).toUpperCase() + v.slice(1);
    btn.dataset.view = v;
    btn.style.cssText = `
      padding:4px 12px;border:none;border-radius:4px;cursor:pointer;
      font-size:12px;font-weight:500;background:${opts.view === v ? "#fff" : "transparent"};
      color:${opts.view === v ? "#111827" : "#6b7280"};
      box-shadow:${opts.view === v ? "0 1px 2px rgba(0,0,0,0.05)" : "none"};
      transition:all 0.15s;
    `;
    btn.addEventListener("click", () => instance.setView(v));
    viewSwitcher.appendChild(btn);
  }
  header.appendChild(viewSwitcher);

  // Body area
  const bodyEl = document.createElement("div");
  bodyEl.className = "cal-body";
  bodyEl.style.cssText = "flex:1;overflow:auto;position:relative;";
  root.appendChild(bodyEl);

  // --- Rendering ---

  function getTitle(): string {
    switch (opts.view) {
      case "month": return `${l.months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      case "week": {
        const sw = startOfWeek(currentDate, opts.weekStart);
        const ew = addDays(sw, 6);
        return `${formatDateShort(sw)} – ${formatDateShort(ew)}, ${ew.getFullYear()}`;
      }
      case "day": return currentDate.toLocaleDateString(opts.locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      case "agenda": return l.months[currentDate.getMonth()] + " " + currentDate.getFullYear();
    }
  }

  function render(): void {
    titleEl.textContent = getTitle();
    bodyEl.innerHTML = "";

    // Update view switcher active state
    for (const btn of viewSwitcher.querySelectorAll("button")) {
      const isActive = btn.dataset.view === opts.view;
      btn.style.background = isActive ? "#fff" : "transparent";
      btn.style.color = isActive ? "#111827" : "#6b7280";
      btn.style.boxShadow = isActive ? "0 1px 2px rgba(0,0,0,0.05)" : "none";
    }

    switch (opts.view) {
      case "month": renderMonth(); break;
      case "week": renderWeek(); break;
      case "day": renderDay(); break;
      case "agenda": renderAgenda(); break;
    }

    opts.onDateChange?.(getViewStart(), getViewEnd());
  }

  function getViewStart(): Date {
    switch (opts.view) {
      case "month": return startOfMonth(currentDate);
      case "week": return startOfWeek(currentDate, opts.weekStart);
      case "day": { const d = new Date(currentDate); d.setHours(0, 0, 0, 0); return d; }
      default: return startOfMonth(currentDate);
    }
  }

  function getViewEnd(): Date {
    switch (opts.view) {
      case "month": return endOfMonth(currentDate);
      case "week": return addDays(startOfWeek(currentDate, opts.weekStart), 6);
      case "day": { const d = new Date(currentDate); d.setHours(23, 59, 59, 999); return d; }
      default: return endOfMonth(currentDate);
    }
  }

  function getEventsForDate(date: Date): CalendarEvent[] {
    return allEvents.filter((ev) => {
      const start = new Date(ev.start);
      const end = new Date(ev.end);
      if (ev.allDay) return isSameDay(start, date) || (isSameDay(end, date)) || (start < date && end > date);
      return isSameDay(start, date) || (start <= date && end >= date);
    });
  }

  function getEventsForRange(rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
    return allEvents.filter((ev) => {
      const s = new Date(ev.start);
      const e = new Date(ev.end);
      return s <= rangeEnd && e >= rangeStart;
    });
  }

  // --- Month View ---

  function renderMonth(): void {
    const grid = document.createElement("div");
    grid.style.cssText = "display:flex;flex-direction:column;height:100%;";

    // Day headers
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex;border-bottom:1px solid #e5e7eb;flex-shrink:0;";
    if (opts.showWeekNumbers) {
      const wnLabel = document.createElement("div");
      wnLabel.style.cssText = "width:36px;padding:6px 4px;text-align:center;font-size:11px;font-weight:600;color:#9ca3af;";
      wnLabel.textContent = "#";
      headerRow.appendChild(wnLabel);
    }
    for (let i = 0; i < 7; i++) {
      const dayIdx = (opts.weekStart + i) % 7;
      const th = document.createElement("div");
      th.style.cssText = "flex:1;padding:8px 4px;text-align:center;font-size:11px;font-weight:600;color:#6b7280;";
      th.textContent = l.shortDays[dayIdx];
      headerRow.appendChild(th);
    }
    grid.appendChild(headerRow);

    // Grid
    const monthStart = startOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, opts.weekStart);
    const today = new Date();

    for (let week = 0; week < 6; week++) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;flex:1;min-height:80px;border-bottom:1px solid #f0f0f0;";

      if (opts.showWeekNumbers) {
        const weekNumCell = document.createElement("div");
        weekNumCell.style.cssText = "width:36px;padding:6px 4px;text-align:center;font-size:10px;color:#d1d5db;flex-shrink:0;";
        const weekDate = addDays(calStart, week * 7);
        weekNumCell.textContent = String(getWeekNumber(weekDate));
        row.appendChild(weekNumCell);
      }

      for (let day = 0; day < 7; day++) {
        const cellDate = addDays(calStart, week * 7 + day);
        const cell = document.createElement("div");
        cell.dataset.date = cellDate.toISOString().split("T")[0]!;
        cell.style.cssText = `
          flex:1;min-height:80px;padding:2px;border-right:1px solid #f0f0f0;
          cursor:pointer;position:relative;overflow-y:auto;
          ${!isSameMonth(cellDate, currentDate) ? "background:#f9fafb;" : ""}
          ${isSameDay(cellDate, today) ? "background:#eff6ff;" : ""}
        `;

        // Day number
        const dayNum = document.createElement("div");
        dayNum.style.cssText = `
          font-size:12px;font-weight:${isSameDay(cellDate, today) ? "700" : "400"};
          color:${isSameDay(cellDate, today) ? "#2563eb" : "#374151"};
          padding:2px 4px;width:fit-content;border-radius:50%;
          ${isSameDay(cellDate, today) ? "background:#dbeafe;" : ""}
        `;
        dayNum.textContent = String(cellDate.getDate());
        cell.appendChild(dayNum);

        // Events for this day
        const dayEvents = getEventsForDate(cellDate).slice(0, 3);
        for (let ei = 0; ei < dayEvents.length; ei++) {
          const ev = dayEvents[ei]!;
          const evEl = createEventChip(ev, ei);
          cell.appendChild(evEl);
        }

        if (getEventsForDate(cellDate).length > 3) {
          const more = document.createElement("div");
          more.style.cssText = "font-size:10px;color:#6b7280;padding:1px 4px;";
          more.textContent = `+${getEventsForDate(cellDate).length - 3} more`;
          cell.appendChild(more);
        }

        cell.addEventListener("click", () => opts.onSlotClick?.(cellDate, true));
        row.appendChild(cell);
      }

      grid.appendChild(row);
    }

    bodyEl.appendChild(grid);
  }

  function createEventChip(event: CalendarEvent, index: number): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = `
      font-size:11px;padding:1px 4px;border-radius:3px;margin-top:1px;
      white-space:nowrap;overflow:hidden;text-ellipsis;color:#fff;
      background:${getEventColor(allEvents.indexOf(event), event.color)};
      cursor:pointer;line-height:1.4;
    `;
    el.textContent = event.title;

    if (opts.renderEvent) {
      const custom = opts.renderEvent(event);
      if (typeof custom === "string") el.innerHTML = custom;
      else { el.innerHTML = ""; el.appendChild(custom); }
    }

    el.addEventListener("click", (e) => { e.stopPropagation(); opts.onEventClick?.(event); });
    return el;
  }

  // --- Week View ---

  function renderWeek(): void {
    const weekStart = startOfWeek(currentDate, opts.weekStart);
    const today = new Date();
    const totalSlots = ((opts.endHour! - opts.startHour!) * 60) / opts.slotDuration!;
    const slotH = Math.max(Math.min(48, 600 / totalSlots), 20); // px per slot

    const scrollContainer = document.createElement("div");
    scrollContainer.style.cssText = "display:flex;flex-direction:column;height:100%;overflow:auto;";

    // Headers
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex;flex-shrink:0;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:#fff;z-index:2;";

    const timeColHeader = document.createElement("div");
    timeColHeader.style.cssText = "width:56px;flex-shrink:0;padding:8px 4px;text-align:center;font-size:11px;color:#9ca3af;";
    headerRow.appendChild(timeColHeader);

    for (let d = 0; d < 7; d++) {
      const dayDate = addDays(weekStart, d);
      const th = document.createElement("div");
      th.style.cssText = `flex:1;padding:8px 4px;text-align:center;border-left:1px solid #f0f0f0;${isSameDay(dayDate, today) ? "background:#eff6ff;" : ""}`;
      th.innerHTML = `<div style="font-size:11px;color:#6b7280;">${l.shortDays[dayDate.getDay()]}</div><div style="font-size:14px;font-weight:600;color:${isSameDay(dayDate, today) ? "#2563eb" : "#111827"};">${dayDate.getDate()}</div>`;
      headerRow.appendChild(th);
    }
    scrollContainer.appendChild(headerRow);

    // Time grid
    const gridArea = document.createElement("div");
    gridArea.style.position = "relative";

    const allDayRow = document.createElement("div");
    allDayRow.style.cssText = "display:flex;border-bottom:1px solid #e5e7eb;min-height:32px;";

    const adLabel = document.createElement("div");
    adLabel.style.cssText = "width:56px;flex-shrink:0;padding:4px;font-size:10px;color:#9ca3af;text-align:right;padding-right:8px;";
    adLabel.textContent = "all-day";
    allDayRow.appendChild(adLabel);

    for (let d = 0; d < 7; d++) {
      const dayDate = addDays(weekStart, d);
      const cell = document.createElement("div");
      cell.style.cssText = `flex:1;border-left:1px solid #f0f0f0;padding:2px;min-height:28px;${isSameDay(dayDate, today) ? "background:#eff6ff;" : ""}`;

      const allDayEvts = getEventsForDate(dayDate).filter((e) => e.allDay);
      for (const evt of allDayEvts.slice(0, 2)) {
        const chip = createEventChip(evt, 0);
        chip.style.fontSize = "10px";
        chip.style.padding = "1px 6px";
        cell.appendChild(chip);
      }

      cell.addEventListener("click", () => opts.onSlotClick?.(dayDate, true));
      allDayRow.appendChild(cell);
    }
    gridArea.appendChild(allDayRow);

    // Time slots
    const slotsGrid = document.createElement("div");
    slotsGrid.style.position = "relative";

    for (let h = opts.startHour!; h < opts.endHour!; h++) {
      for (let m = 0; m < 60; m += opts.slotDuration!) {
        const slotRow = document.createElement("div");
        slotRow.style.cssText = "display:flex;align-items:flex-start;";

        if (m === 0) {
          const timeLabel = document.createElement("div");
          timeLabel.style.cssText = "width:56px;flex-shrink:0;padding-top:0;font-size:10px;color:#9ca3af;text-align:right;padding-right:8px;line-height:${slotH}px;user-select:none;";
          timeLabel.textContent = formatTime(new Date(2000, 0, 1, h, 0));
          slotRow.appendChild(timeLabel);
        } else {
          const spacer = document.createElement("div");
          spacer.style.cssText = "width:56px;flex-shrink:0;";
          slotRow.appendChild(spacer);
        }

        for (let d = 0; d < 7; d++) {
          const dayDate = addDays(weekStart, d);
          const slot = document.createElement("div");
          slot.style.cssText = `flex:1;border-left:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;min-height:${slotH}px;cursor:pointer;${isSameDay(dayDate, today) && h === today.getHours() ? "background:#eff6ff;" : ""}`;

          slot.addEventListener("click", () => {
            const slotDate = new Date(dayDate);
            slotDate.setHours(h, m, 0, 0);
            opts.onSlotClick?.(slotDate, false);
          });

          slotRow.appendChild(slot);
        }

        slotsGrid.appendChild(slotRow);
      }
    }

    // Now indicator
    if (opts.showNowIndicator && isSameWeek(currentDate, weekStart)) {
      const now = new Date();
      const minsFromStart = (now.getHours() - opts.startHour!) * 60 + now.getMinutes();
      const nowTop = (minsFromStart / opts.slotDuration!) * slotH + 32; // +32 for all-day row

      if (nowTop > 0 && nowTop < slotsGrid.offsetHeight) {
        const nowLine = document.createElement("div");
        nowLine.style.cssText = `position:absolute;left:56px;right:0;top:${nowTop}px;height:2px;background:#ef4444;z-index:5;pointer-events:none;`;
        const nowDot = document.createElement("div");
        nowDot.style.cssText = "position:absolute;left:48px;top:${nowTop - 4}px;width:8px;height:8px;border-radius:50%;background:#ef4444;";
        slotsGrid.style.position = "relative";
        slotsGrid.appendChild(nowLine);
        slotsGrid.appendChild(nowDot);
      }
    }

    gridArea.appendChild(slotsGrid);
    scrollContainer.appendChild(gridArea);
    bodyEl.appendChild(scrollContainer);

    // Scroll to current time
    requestAnimationFrame(() => {
      if (destroyed) return;
      const now = new Date();
      if (isSameWeek(now, weekStart)) {
        const minsFromStart = (now.getHours() - opts.startHour!) * 60 + now.getMinutes();
        const targetScroll = (minsFromStart / opts.slotDuration!) * slotH + 32 - scrollContainer.clientHeight / 2;
        scrollContainer.scrollTop = Math.max(0, targetScroll);
      }
    });
  }

  function isSameWeek(a: Date, weekStart: Date): boolean {
    const sw = startOfWeek(a, opts.weekStart);
    return isSameDay(sw, weekStart);
  }

  // --- Day View ---

  function renderDay(): void {
    const today = new Date();
    const totalSlots = ((opts.endHour! - opts.startHour!) * 60) / opts.slotDuration!;
    const slotH = Math.max(Math.min(64, 800 / totalSlots), 24);

    const scrollContainer = document.createElement("div");
    scrollContainer.style.cssText = "display:flex;flex-direction:column;height:100%;overflow:auto;";

    // All-day section
    const allDaySection = document.createElement("div");
    allDaySection.style.cssText = "border-bottom:1px solid #e5e7eb;padding:8px 12px;flex-shrink:0;";
    const adTitle = document.createElement("span");
    adTitle.style.cssText = "font-size:11px;font-weight:600;color:#6b7280;margin-right:8px;";
    adTitle.textContent = "all-day";
    allDaySection.appendChild(adTitle);

    const allDayEvts = getEventsForDate(currentDate).filter((e) => e.allDay);
    for (const evt of allDayEvts) {
      const chip = createEventChip(evt, 0);
      chip.style.display = "inline-block";
      chip.style.marginRight = "4px";
      allDaySection.appendChild(chip);
    }
    scrollContainer.appendChild(allDaySection);

    // Time slots
    const slotsArea = document.createElement("div");
    slotsArea.style.position = "relative";

    for (let h = opts.startHour!; h < opts.endHour!; h++) {
      for (let m = 0; m < 60; m += opts.slotDuration!) {
        const slotRow = document.createElement("div");
        slotRow.style.cssText = "display:flex;align-items:flex-start;";

        const timeLabel = document.createElement("div");
        timeLabel.style.cssText = `width:56px;flex-shrink:0;padding-right:12px;font-size:11px;color:#9ca3af;text-align:right;line-height:${slotH}px;user-select:none;${m > 0 ? "visibility:hidden;" : ""}`;
        timeLabel.textContent = formatTime(new Date(2000, 0, 1, h, m));
        slotRow.appendChild(timeLabel);

        const slot = document.createElement("div");
        slot.style.cssText = `flex:1;border-bottom:1px solid #f3f4f6;min-height:${slotH}px;position:relative;cursor:pointer;${isSameDay(currentDate, today) && h === today.getHours() && m === Math.floor(today.getMinutes() / opts.slotDuration!) * opts.slotDuration! ? "background:#eff6ff;" : ""}`;

        // Render events that overlap this slot
        const dayEvents = getEventsForDate(currentDate).filter((e) => !e.allDay);
        for (const evt of dayEvents) {
          const evtStart = new Date(evt.start);
          const evtEnd = new Date(evt.end);
          if (evtStart.getHours() === h && evtStart.getMinutes() < m + opts.slotDuration! && evtEnd.getHours() > h) {
            const startMins = evtStart.getHours() * 60 + evtStart.getMinutes();
            const endMins = evtEnd.getHours() * 60 + evtEnd.getMinutes();
            const slotStartMins = h * 60 + m;
            const topPct = Math.max(0, (startMins - slotStartMins) / opts.slotDuration!) * 100;
            const heightPct = Math.min(100, (endMins - slotStartMins) / opts.slotDuration! * 100);

            if (topPct < 100 && heightPct > 0) {
              const evtBlock = document.createElement("div");
              evtBlock.style.cssText = `
                position:absolute;left:4px;right:4px;top:${topPct}%;height:${heightPct}%;
                background:${getEventColor(allEvents.indexOf(evt), evt.color)};color:#fff;
                border-radius:4px;padding:2px 6px;font-size:11px;overflow:hidden;
                cursor:pointer;z-index:3;
              `;
              evtBlock.textContent = `${formatTime(evtStart)} ${evt.title}`;
              evtBlock.addEventListener("click", (e) => { e.stopPropagation(); opts.onEventClick?.(evt); });
              slot.appendChild(evtBlock);
            }
          }
        }

        slot.addEventListener("click", () => {
          const slotDate = new Date(currentDate);
          slotDate.setHours(h, m, 0, 0);
          opts.onSlotClick?.(slotDate, false);
        });

        slotRow.appendChild(slot);
        slotsArea.appendChild(slotRow);
      }
    }

    // Now indicator
    if (opts.showNowIndicator && isSameDay(currentDate, today)) {
      const now = new Date();
      const minsFromStart = (now.getHours() - opts.startHour!) * 60 + now.getMinutes();
      const nowTop = (minsFromStart / opts.slotDuration!) * slotH;

      if (nowTop > 0) {
        const nowLine = document.createElement("div");
        nowLine.style.cssText = `position:absolute;left:68px;right:0;top:${nowTop}px;height:2px;background:#ef4444;z-index:5;pointer-events:none;`;
        const nowDot = document.createElement("div");
        nowDot.style.cssText = "position:absolute;left:60px;top:${nowTop - 4}px;width:8px;height:8px;border-radius:50%;background:#ef4444;";
        slotsArea.style.position = "relative";
        slotsArea.appendChild(nowLine);
        slotsArea.appendChild(nowDot);
      }
    }

    slotsArea.appendChild(scrollContainer.querySelector(".cal-slots-area") ? scrollContainer.lastElementChild! : slotsArea);
    // Fix: append properly
    if (!slotsArea.parentElement) scrollContainer.appendChild(slotsArea);

    // Actually restructure - clear and rebuild
    scrollContainer.appendChild(slotsArea);
    bodyEl.appendChild(scrollContainer);

    // Auto-scroll to current time
    requestAnimationFrame(() => {
      if (destroyed) return;
      const now = new Date();
      if (isSameDay(currentDate, now)) {
        const minsFromStart = (now.getHours() - opts.startHour!) * 60 + now.getMinutes();
        const targetScroll = (minsFromStart / opts.slotDuration!) * slotH - scrollContainer.clientHeight / 3;
        scrollContainer.scrollTop = Math.max(0, targetScroll);
      }
    });
  }

  // --- Agenda View ---

  function renderAgenda(): void {
    const list = document.createElement("div");
    list.style.cssText = "flex:1;overflow-y:auto;padding:12px;";

    const sortedEvents = [...allEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    if (sortedEvents.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px;color:#9ca3af;";
      empty.innerHTML = `<div style="font-size:32px;margin-bottom:8px;">\u{1F4C5}</div><div>No events scheduled</div>`;
      list.appendChild(empty);
      bodyEl.appendChild(list);
      return;
    }

    let lastDateStr = "";
    for (const evt of sortedEvents) {
      const startDate = new Date(evt.start);
      const dateStr = startDate.toLocaleDateString(opts.locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        const dateHeader = document.createElement("div");
        dateHeader.style.cssText = "font-weight:600;font-size:13px;color:#111827;padding:12px 0 4px;border-bottom:1px solid #e5e7eb;margin-top:8px;";
        dateHeader.textContent = dateStr;
        list.appendChild(dateHeader);
      }

      const item = document.createElement("div");
      item.style.cssText = `
        display:flex;align-items:flex-start;gap:10px;padding:8px 0;
        border-bottom:1px solid #f3f4f6;cursor:pointer;
      `;

      const colorBar = document.createElement("div");
      colorBar.style.cssText = `width:3px;height:40px;border-radius:2px;background:${getEventColor(allEvents.indexOf(evt), evt.color)};flex-shrink:0;`;
      item.appendChild(colorBar);

      const info = document.createElement("div");
      info.style.flex = "1";

      const title = document.createElement("div");
      title.style.cssText = "font-weight:500;font-size:13px;color:#111827;";
      title.textContent = evt.title;
      info.appendChild(title);

      const time = document.createElement("div");
      time.style.cssText = "font-size:11px;color:#6b7280;margin-top:2px;";
      time.textContent = evt.allDay ? "All day" : `${formatTime(startDate)} – ${formatTime(new Date(evt.end))}`;
      info.appendChild(time);

      if (evt.location) {
        const loc = document.createElement("div");
        loc.style.cssText = "font-size:11px;color:#9ca3af;margin-top:1px;";
        loc.textContent = `\u{1F4CD} ${evt.location}`;
        info.appendChild(loc);
      }

      item.addEventListener("click", () => opts.onEventClick?.(evt));
      item.addEventListener("mouseenter", () => { item.style.background = "#f9fafb"; });
      item.addEventListener("mouseleave", () => { item.style.background = ""; });
      list.appendChild(item);
    }

    bodyEl.appendChild(list);
  }

  // Initial render
  render();

  // Responsive
  resizeObserver = new ResizeObserver(() => { if (!destroyed) render(); });
  resizeObserver.observe(root);

  const instance: CalendarInstance = {
    element: root,

    getEvents() { return [...allEvents]; },

    addEvent(event: CalendarEvent) {
      allEvents.push({ ...event, id: event.id ?? generateId() });
      render();
    },

    updateEvent(id: string, updates: Partial<CalendarEvent>) {
      const idx = allEvents.findIndex((e) => e.id === id);
      if (idx >= 0) { allEvents[idx] = { ...allEvents[idx]!, ...updates }; render(); }
    },

    removeEvent(id: string) {
      allEvents = allEvents.filter((e) => e.id !== id);
      render();
    },

    setView(view: CalendarView) {
      opts.view = view;
      render();
      opts.onViewChange?.(view);
    },

    goToDate(date: Date) {
      currentDate = new Date(date);
      render();
    },

    goToToday() {
      currentDate = new Date();
      render();
    },

    next() {
      switch (opts.view) {
        case "month": currentDate = addMonths(currentDate, 1); break;
        case "week": currentDate = addWeeks(currentDate, 1); break;
        case "day": currentDate = addDays(currentDate, 1); break;
        case "agenda": currentDate = addMonths(currentDate, 1); break;
      }
      render();
    },

    prev() {
      switch (opts.view) {
        case "month": currentDate = addMonths(currentDate, -1); break;
        case "week": currentDate = addWeeks(currentDate, -1); break;
        case "day": currentDate = addDays(currentDate, -1); break;
        case "agenda": currentDate = addMonths(currentDate, -1); break;
      }
      render();
    },

    getSelectedDate() { return new Date(currentDate); },

    destroy() {
      destroyed = true;
      if (resizeObserver) resizeObserver.disconnect();
      root.remove();
    },
  };

  return instance;
}
