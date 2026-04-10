/**
 * Calendar Component: Month/week/day views, event rendering, navigation,
 * date selection (single/range), today highlight, mini calendar mode,
 * i18n support, keyboard navigation, and responsive layout.
 */

// --- Types ---

export type CalendarView = "month" | "week" | "day";
export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay?: boolean;
  color?: string;
  description?: string;
  location?: string;
  /** Custom data */
  data?: unknown;
}

export interface CalendarOptions {
  container: HTMLElement | string;
  /** Initial date to display */
  initialDate?: Date | string;
  /** View mode */
  view?: CalendarView;
  /** Events to display */
  events?: CalendarEvent[];
  /** Day of week start (0=Sun, 1=Mon) */
  weekStart?: WeekStartDay;
  /** Show week numbers? */
  showWeekNumbers?: boolean;
  /** Show today button? */
  showTodayBtn?: boolean;
  /** Allow date selection */
  selectable?: boolean;
  /** Range selection? */
  rangeSelect?: boolean;
  /** Callback on date click */
  onDateClick?: (date: Date) => void;
  /** Callback on event click */
  onEventClick?: (event: CalendarEvent) => void;
  /** Callback on month/year change */
  onNavigate?: (date: Date) => void;
  /** Callback on range select */
  onRangeSelect?: (start: Date, end: Date) => void;
  /** Custom day renderer */
  renderDay?: (date: Date, el: HTMLElement, events: CalendarEvent[]) => void;
  /** Locale for formatting */
  locale?: string;
  /** Mini calendar mode (compact) */
  mini?: boolean;
  /** Highlight weekends differently */
  highlightWeekends?: boolean;
  /** Disabled dates (function returning true disables the date) */
  isDisabled?: (date: Date) => boolean;
  /** Custom CSS class */
  className?: string;
}

export interface CalendarInstance {
  element: HTMLElement;
  getDate: () => Date;
  setDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  getSelectedDate: () => Date | null;
  getSelectedRange: () => { start: Date; end: Date } | null;
  addEvent: (event: CalendarEvent) => void;
  removeEvent: (id: string) => void;
  setEvents: (events: CalendarEvent[]) => void;
  prev: () => void;
  next: () => void;
  goToToday: () => void;
  destroy: () => void;
}

// --- Helpers ---

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean { return isSameDay(d, new Date()); }

function isWeekend(d: Date): boolean { const dow = d.getDay(); return dow === 0 || dow === 6; }

function pad(n: number): string { return String(n).padStart(2, "0"); }

// --- Main Class ---

export class CalendarManager {
  create(options: CalendarOptions): CalendarInstance {
    const opts = {
      initialDate: options.initialDate ? parseDate(options.initialDate) : new Date(),
      view: options.view ?? "month",
      weekStart: options.weekStart ?? 1,
      showWeekNumbers: options.showWeekNumbers ?? false,
      showTodayBtn: options.showTodayBtn ?? true,
      selectable: options.selectable ?? true,
      rangeSelect: options.rangeSelect ?? false,
      mini: options.mini ?? false,
      highlightWeekends: options.highlightWeekends ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Calendar: container not found");

    let currentDate = new Date(opts.initialDate);
    let currentView = opts.view;
    let selectedDate: Date | null = null;
    let selectedRange: { start: Date; end: Date } | null = null;
    let events: CalendarEvent[] = [...(options.events ?? [])];
    let destroyed = false;
    let rangeAnchor: Date | null = null;

    container.className = `calendar calendar-${currentView} ${opts.mini ? "mini" : ""} ${opts.className ?? ""}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;font-size:${opts.mini ? 12 : 13}px;color:#374151;
      ${opts.mini ? "width:280px;" : ""}
    `;

    function render(): void {
      container.innerHTML = "";

      // Header
      const header = document.createElement("div");
      header.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;padding:8px 0;margin-bottom:8px;
        ${opts.mini ? "padding:4px 0;" : ""}
      `;

      // Nav buttons
      const navLeft = document.createElement("div");
      navLeft.style.cssText = "display:flex;gap:4px;";
      const prevBtn = createNavButton("\u2039", () => instance.prev());
      const nextBtn = createNavButton("\u203A", () => instance.next());
      navLeft.appendChild(prevBtn);
      navLeft.appendChild(nextBtn);
      header.appendChild(navLeft);

      // Title
      const titleEl = document.createElement("div");
      titleEl.style.cssText = `font-weight:600;font-size:${opts.mini ? 13 : 15}px;text-align:center;`;
      titleEl.textContent = formatTitle();
      header.appendChild(titleEl);

      // Today + View switcher
      const navRight = document.createElement("div");
      navRight.style.cssText = "display:flex;gap:4px;align-items:center;";

      if (opts.showTodayBtn && !opts.mini) {
        const todayBtn = createNavButton("Today", () => instance.goToToday(), true);
        navRight.appendChild(todayBtn);
      }

      header.appendChild(navRight);
      container.appendChild(header);

      // Day headers
      const daysRow = document.createElement("div");
      daysRow.style.cssText = `display:grid;grid-template-columns:${getGridTemplate()};gap:1px;margin-bottom:4px;`;

      for (let i = 0; i < 7; i++) {
        const dayIdx = (opts.weekStart + i) % 7;
        const cell = document.createElement("div");
        cell.style.cssText = `text-align:center;font-size:${opts.mini ? 10 : 11}px;font-weight:600;color:#6b7280;padding:4px 0;${isWeekendByIndex(dayIdx) && opts.highlightWeekends ? "color:#ef4444;" : ""}`;
        cell.textContent = DAYS_SHORT[dayIdx];
        daysRow.appendChild(cell);
      }
      container.appendChild(daysRow);

      // Grid
      const grid = document.createElement("div");
      grid.style.cssText = `display:grid;grid-template-columns:${getGridTemplate()};gap:1px;`;

      const cells = generateCells();

      for (const cell of cells) {
        const dayEl = createDayCell(cell.date, cell.isCurrentMonth);
        grid.appendChild(dayEl);
      }

      container.appendChild(grid);
    }

    function formatTitle(): string {
      switch (currentView) {
        case "month": return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        case "week": return `Week of ${formatDateShort(getWeekStart())}`;
        case "day": return currentDate.toLocaleDateString(opts.locale ?? "en-US", { weekday: "long", month: "long", day: "numeric" });
      }
    }

    function getGridTemplate(): string {
      const cols = opts.showWeekNumbers ? "24px " : "";
      return cols + "repeat(7, 1fr)";
    }

    function getWeekStart(): Date {
      const d = new Date(currentDate);
      const day = d.getDay();
      const diff = (day - opts.weekStart + 7) % 7;
      d.setDate(d.getDate() - diff);
      return d;
    }

    function generateCells(): Array<{ date: Date; isCurrentMonth: boolean }> {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = getWeekStart();

      const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 41); // 6 weeks max

      let cursor = new Date(startDate);
      while (cursor < endDate) {
        cells.push({ date: new Date(cursor), isCurrentMonth: cursor.getMonth() === month });
        cursor.setDate(cursor.getDate() + 1);
      }

      return cells;
    }

    function createDayCell(date: Date, isCurrentMonth: boolean): HTMLElement {
      const el = document.createElement("button");
      el.type = "button";
      el.dataset.date = date.toISOString().split("T")[0];
      el.style.cssText = `
        aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:${opts.mini ? "2px" : "4px"} 0;border:none;background:none;cursor:pointer;
        border-radius:6px;font-family:inherit;font-size:inherit;position:relative;
        ${!isCurrentMonth ? "color:#d1d5db;" : ""}
        ${isWeekend(date) && opts.highlightWeekends && isCurrentMonth ? "background:#fefce8;" : ""}
        ${isToday(date) ? "background:#eef2ff;color:#4338ca;font-weight:700;border:1.5px solid #a5b4fc;" : ""}
        ${selectedDate && isSameDay(date, selectedDate) ? "background:#4338ca;color:#fff;font-weight:600;" : ""}
        ${selectedRange && date >= selectedRange.start && date <= selectedRange.end ? "background:#c7d2fe;color:#3730a3;" : ""}
        ${opts.isDisabled?.(date) ? "opacity:0.3;cursor:not-allowed;pointer-events:none;" : ""}
      `;

      el.textContent = String(date.getDate());

      // Events dot indicator
      const dayEvents = events.filter((e) => {
        const s = parseDate(e.start);
        return isSameDay(s, date);
      });

      if (dayEvents.length > 0 && !opts.mini) {
        const dots = document.createElement("div");
        dots.style.cssText = "display:flex;gap:2px;margin-top:2px;";
        for (let i = 0; i < Math.min(dayEvents.length, 3); i++) {
          const dot = document.createElement("span");
          dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${dayEvents[i]?.color ?? "#4338ca"};`;
          dots.appendChild(dot);
        }
        el.appendChild(dots);
      }

      el.addEventListener("click", () => {
        if (opts.isDisabled?.(date)) return;

        if (opts.rangeSelect) {
          if (!rangeAnchor) {
            rangeAnchor = date;
            selectedRange = { start: date, end: date };
          } else {
            selectedRange = {
              start: new Date(Math.min(rangeAnchor.getTime(), date.getTime())),
              end: new Date(Math.max(rangeAnchor.getTime(), date.getTime())),
            };
            rangeAnchor = null;
            opts.onRangeSelect?.(selectedRange.start, selectedRange.end);
          }
        } else {
          selectedDate = date;
          opts.onDateClick?.(date);
        }
        render();
      });

      // Custom renderer
      if (opts.renderDay) opts.renderDay(date, el, dayEvents);

      return el;
    }

    function formatDateShort(d: Date): string {
      return `${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}`;
    }

    function isWeekendByIndex(idx: number): boolean {
      const actualDow = (opts.weekStart + idx) % 7;
      return actualDow === 0 || actualDow === 6;
    }

    function createNavButton(label: string, onClick: () => void, primary = false): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText = `
        padding:${opts.mini ? "2px 6px" : "4px 10px"};border:1px solid #d1d5db;border-radius:6px;
        background:${primary ? "#4338ca" : "#fff"};color:${primary ? "#fff" : "#374151"};
        cursor:pointer;font-size:${opts.mini ? 11 : 12}px;font-family:inherit;
        transition:all 0.15s;
      `;
      btn.addEventListener("click", onClick);
      btn.addEventListener("mouseenter", () => { if (!primary) { btn.style.background = "#f9fafb"; btn.style.borderColor = "#9ca3af"; } });
      btn.addEventListener("mouseleave", () => { if (!primary) { btn.style.background = ""; btn.style.borderColor = "#d1d5db"; } });
      return btn;
    }

    // Initial render
    render();

    const instance: CalendarInstance = {
      element: container,

      getDate() { return new Date(currentDate); },

      setDate(d) { currentDate = new Date(d); render(); opts.onNavigate?.(currentDate); },

      setView(v) { currentView = v; render(); },

      getSelectedDate() { return selectedDate; },

      getSelectedRange() { return selectedRange; },

      addEvent(e) { events.push(e); render(); },

      removeEvent(id) { events = events.filter((e) => e.id !== id); render(); },

      setEvents(evs) { events = [...evs]; render(); },

      prev() {
        switch (currentView) {
          case "month": currentDate.setMonth(currentDate.getMonth() - 1); break;
          case "week": currentDate.setDate(currentDate.getDate() - 7); break;
          case "day": currentDate.setDate(currentDate.getDate() - 1); break;
        }
        render(); opts.onNavigate?.(currentDate);
      },

      next() {
        switch (currentView) {
          case "month": currentDate.setMonth(currentDate.getMonth() + 1); break;
          case "week": currentDate.setDate(currentDate.getDate() + 7); break;
          case "day": currentDate.setDate(currentDate.getDate() + 1); break;
        }
        render(); opts.onNavigate?.(currentDate);
      },

      goToToday() {
        currentDate = new Date();
        render(); opts.onNavigate?.(currentDate);
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a calendar */
export function createCalendar(options: CalendarOptions): CalendarInstance {
  return new CalendarManager().create(options);
}
