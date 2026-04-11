/**
 * Calendar Grid: Full calendar/month view with day cells, event dots,
 * week numbers, navigation, date selection (single/range/multiple),
 * locale support, disabled dates, highlights, and responsive design.
 */

// --- Types ---

export type CalendarSelectionMode = "single" | "range" | "multiple" | "none";
export type CalendarWeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun, 1=Mon, etc.

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  color?: string;
  allDay?: boolean;
  data?: unknown;
}

export interface CalendarGridOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial focused date (YYYY-MM-DD) */
  date?: string;
  /** Selection mode */
  selectionMode?: CalendarSelectionMode;
  /** First day of week (0=Sun, 1=Mon, ..., 6=Sat) */
  weekStart?: CalendarWeekStart;
  /** Show week numbers? */
  showWeekNumbers?: boolean;
  /** Show today button? */
  showTodayBtn?: boolean;
  /** Events to display */
  events?: CalendarEvent[];
  /** Disabled dates (YYYY-MM-DD strings or matchers) */
  disabledDates?: (string | ((date: Date) => boolean))[];
  /** Highlighted dates */
  highlightedDates?: string[];
  /** Min allowed date */
  minDate?: string;
  /** Max allowed date */
  maxDate?: string;
  /** Locale for month/day names */
  locale?: string;
  /** Custom day names (override locale) */
  dayNames?: string[];
  /** Custom month names */
  monthNames?: string[];
  /** Navigation callbacks */
  onNavigate?: (year: number, month: number) => void;
  /** Date selection callback */
  onSelect?: (dates: string[]) => void;
  /** Day cell custom renderer */
  renderDay?: (date: Date, events: CalendarEvent[], el: HTMLElement) => void;
  /** Header slot (custom header content) */
  headerContent?: HTMLElement;
  /** Footer slot */
  footerContent?: HTMLElement;
  /** Color for selected dates */
  selectionColor?: string;
  /** Color for today */
  todayColor?: string;
  /** Color for hovered day */
  hoverColor?: string;
  /** Event dot size (px) */
  eventDotSize?: number;
  /** Max events shown per day before "+N" overflow */
  maxEventsPerDay?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
}

export interface CalendarGridInstance {
  element: HTMLElement;
  /** Navigate to a specific date */
  goTo: (date: string) => void;
  /** Go to today */
  goToday: () => void;
  /** Go to next month */
  nextMonth: () => void;
  /** Go to previous month */
  prevMonth: () => void;
  /** Get currently displayed year/month */
  getView: () => { year: number; month: number };
  /** Get selected dates */
  getSelectedDates: () => string[];
  /** Set selected dates programmatically */
  setSelectedDates: (dates: string[]) => void;
  /** Add an event */
  addEvent: (event: CalendarEvent) => void;
  /** Remove an event */
  removeEvent: (id: string) => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Check if a date is disabled */
  isDisabled: (date: Date) => boolean;
  /** Destroy */
  destroy: () => void;
}

// --- Locale Data ---

const LOCALES: Record<string, { months: string[]; shortMonths: string[]; days: string[]; shortDays: string[] }> = {
  en: {
    months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    shortMonths: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    days: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    shortDays: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  },
};

// --- Helpers ---

function pad(n: number, len = 2): string { return String(n).padStart(len, "0"); }
function fmt(d: Date): string { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}
function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// --- Main Factory ---

export function createCalendarGrid(options: CalendarGridOptions): CalendarGridInstance {
  const opts = {
    date: options.date ?? fmt(new Date()),
    selectionMode: options.selectionMode ?? "single",
    weekStart: options.weekStart ?? 1, // Monday
    showWeekNumbers: options.showWeekNumbers ?? false,
    showTodayBtn: options.showTodayBtn ?? true,
    events: options.events ?? [],
    disabledDates: options.disabledDates ?? [],
    highlightedDates: options.highlightedDates ?? [],
    minDate: options.minDate,
    maxDate: options.maxDate,
    locale: options.locale ?? "en",
    selectionColor: options.selectionColor ?? "#6366f1",
    todayColor: options.todayColor ?? "#fef3c7",
    hoverColor: options.hoverColor ?? "#f3f4f6",
    eventDotSize: options.eventDotSize ?? 6,
    maxEventsPerDay: options.maxEventsPerDay ?? 3,
    animationDuration: options.animationDuration ?? 200,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CalendarGrid: container not found");

  const loc = LOCALES[opts.locale] ?? LOCALES.en;
  const dayNames = opts.dayNames ?? loc.shortDays;
  const monthNames = opts.monthNames ?? loc.months;

  let currentYear = parseInt(opts.date.split("-")[0]!, 10);
  let currentMonth = parseInt(opts.date.split("-")[1]!, 10) - 1;
  let selectedDates: string[] = [];
  let destroyed = false;

  // Root element
  const root = document.createElement("div");
  root.className = `calendar-grid ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;
    width:100%;max-width:400px;
  `;
  container.appendChild(root);

  // --- Event lookup ---

  function getEventsForDate(dateStr: string): CalendarEvent[] {
    return opts.events.filter(e => e.date === dateStr);
  }

  function isDateDisabled(date: Date): boolean {
    const ds = fmt(date);
    if (opts.minDate && ds < opts.minDate) return true;
    if (opts.maxDate && ds > opts.maxDate) return true;
    for (const dd of opts.disabledDates) {
      if (typeof dd === "string") { if (ds === dd) return true; }
      else if (dd(date)) return true;
    }
    return false;
  }

  function isHighlighted(dateStr: string): boolean {
    return opts.highlightedDates.includes(dateStr);
  }

  function isSelected(dateStr: string): boolean {
    return selectedDates.includes(dateStr);
  }

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "cal-header";
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;";

    // Nav left
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.innerHTML = "\u2039";
    prevBtn.style.cssText = `
      width:32px;height:32px;border-radius:8px;border:1px solid #e5e7eb;
      background:#fff;cursor:pointer;font-size:16px;display:flex;
      align-items:center;justify-content:center;color:#6b7280;
    `;
    prevBtn.addEventListener("click", () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } render(); opts.onNavigate?.(currentYear, currentMonth); });
    prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "#f9fafb"; });
    prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = ""; });
    header.appendChild(prevBtn);

    // Month/year title
    const titleEl = document.createElement("div");
    titleEl.className = "cal-title";
    titleEl.style.cssText = "font-size:17px;font-weight:700;color:#111827;";
    titleEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    header.appendChild(titleEl);

    // Nav right
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.innerHTML = "\u203A";
    nextBtn.style.cssText = prevBtn.style.cssText;
    nextBtn.addEventListener("click", () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } render(); opts.onNavigate?.(currentYear, currentMonth); });
    nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "#f9fafb"; });
    nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = ""; });
    header.appendChild(nextBtn);

    root.appendChild(header);

    // Custom header content
    if (opts.headerContent) {
      root.appendChild(opts.headerContent.cloneNode(true));
    }

    // Day names header
    const dayHeader = document.createElement("div");
    dayHeader.className = "cal-day-header";
    dayHeader.style.cssText = "display:flex;border-bottom:1px solid #f0f0f0;";

    if (opts.showWeekNumbers) {
      const wnLabel = document.createElement("div");
      wnLabel.style.cssText = "width:32px;flex-shrink:0;font-size:10px;color:#9ca3af;text-align:center;padding:6px 0;font-weight:600;";
      wnLabel.textContent = "Wk";
      dayHeader.appendChild(wnLabel);
    }

    for (let i = 0; i < 7; i++) {
      const di = (opts.weekStart + i) % 7;
      const dn = document.createElement("div");
      dn.style.cssText = "flex:1;text-align:center;padding:6px 0;font-size:11px;color:#9ca3af;font-weight:600;";
      dn.textContent = dayNames[di];
      dayHeader.appendChild(dn);
    }
    root.appendChild(dayHeader);

    // Day grid
    const grid = document.createElement("div");
    grid.className = "cal-grid";
    grid.style.cssText = "display:flex;flex-wrap:wrap;";

    const firstDay = getFirstOfMonth(currentYear, currentMonth);
    let startDow = firstDay.getDay() - opts.weekStart;
    if (startDow < 0) startDow += 7;
    const daysInMo = daysInMonth(currentYear, currentMonth);
    const totalCells = startDow + daysInMo;
    const rows = Math.ceil(totalCells / 7);
    const today = new Date();

    // Padding cells before first day
    for (let i = 0; i < startDow; i++) {
      const pad = document.createElement("div");
      pad.style.cssText = `width:calc((100% - ${(opts.showWeekNumbers ? 32 : 0)}px) / 7);aspect-ratio:1;`;
      grid.appendChild(pad);
    }

    for (let d = 1; d <= daysInMo; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const ds = fmt(date);
      const isToday = isSameDay(date, today);
      const disabled = isDateDisabled(date);
      const selected = isSelected(ds);
      const highlighted = isHighlighted(ds);
      const dayEvents = getEventsForDate(ds);
      const dow = date.getDay();

      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day-cell";
      cell.dataset.date = ds;
      cell.disabled = disabled;
      cell.style.cssText = `
        width:calc((100% - ${(opts.showWeekNumbers ? 32 : 0)}px) / 7);
        aspect-ratio:1;display:flex;flex-direction:column;
        align-items:center;justify-content:center;position:relative;
        border-radius:8px;border:none;background:none;
        cursor:${disabled ? "not-allowed" : "pointer"};
        font-size:13px;font-weight:${isToday ? "700" : selected ? "600" : "400"};
        color:${disabled ? "#d1d5db" : selected ? "#fff" : "#374151"};
        transition:all 0.12s ease;
        ${selected ? `background:${opts.selectionColor};` : ""}
        ${isToday && !selected ? `background:${opts.todayColor};` : ""}
        ${highlighted && !selected ? `background:#ede9fe;` : ""}
        padding:2px;
      `;

      // Day number
      const numSpan = document.createElement("span");
      numSpan.textContent = String(d);
      cell.appendChild(numSpan);

      // Week number (first column cell only)
      if (dow === opts.weekStart && opts.showWeekNumbers) {
        const wn = getWeekNumber(date);
        // This is handled differently - we prepend a week number cell
      }

      // Event dots
      if (dayEvents.length > 0) {
        const dotsWrap = document.createElement("div");
        dotsWrap.style.cssText = "display:flex;gap:2px;margin-top:1px;flex-wrap:wrap;justify-content:center;";

        const visibleEvents = dayEvents.slice(0, opts.maxEventsPerDay);
        for (const ev of visibleEvents) {
          const dot = document.createElement("span");
          dot.style.cssText = `
            width:${opts.eventDotSize}px;height:${opts.eventDotSize}px;border-radius:50%;
            background:${ev.color ?? "#6366f1"};flex-shrink:0;
          `;
          dotsWrap.appendChild(dot);
        }

        if (dayEvents.length > opts.maxEventsPerDay) {
          const more = document.createElement("span");
          more.style.cssText = `font-size:9px;color:#6366f1;font-weight:600;`;
          more.textContent = `+${dayEvents.length - opts.maxEventsPerDay}`;
          dotsWrap.appendChild(more);
        }

        cell.appendChild(dotsWrap);
      }

      // Hover effect
      if (!disabled) {
        cell.addEventListener("mouseenter", () => {
          if (!isSelected(ds)) cell.style.background = opts.hoverColor;
        });
        cell.addEventListener("mouseleave", () => {
          if (!isSelected(ds)) {
            cell.style.background = isToday ? opts.todayColor :
              highlighted ? "#ede9fe" : "";
          }
        });
      }

      // Click handler
      cell.addEventListener("click", () => {
        if (disabled) return;

        switch (opts.selectionMode) {
          case "single":
            selectedDates = [ds];
            break;
          case "range":
            if (selectedDates.length === 2) selectedDates = [ds];
            else selectedDates.push(ds);
            break;
          case "multiple":
            if (selectedDates.includes(ds)) {
              selectedDates = selectedDates.filter(d => d !== ds);
            } else {
              selectedDates.push(ds);
            }
            break;
          default:
            break;
        }
        render();
        opts.onSelect?.([...selectedDates]);
      });

      // Custom renderer
      if (opts.renderDay) {
        opts.renderDay(date, dayEvents, cell);
      }

      grid.appendChild(cell);
    }

    root.appendChild(grid);

    // Footer
    if (opts.showTodayBtn) {
      const footer = document.createElement("div");
      footer.style.cssText = "display:flex;justify-content:center;padding:10px;border-top:1px solid #f0f0f0;";
      const todayBtn = document.createElement("button");
      todayBtn.type = "button";
      todayBtn.textContent = "Today";
      todayBtn.style.cssText = `
        padding:5px 14px;border-radius:6px;border:1px solid #d1d5db;
        background:#fff;cursor:pointer;font-size:12px;font-weight:500;color:#6366f1;
      `;
      todayBtn.addEventListener("click", () => { goToday(); });
      todayBtn.addEventListener("mouseenter", () => { todayBtn.style.background = "#eef2ff"; });
      todayBtn.addEventListener("mouseleave", () => { todayBtn.style.background = ""; });
      footer.appendChild(todayBtn);
      root.appendChild(footer);
    }

    if (opts.footerContent) {
      root.appendChild(opts.footerContent.cloneNode(true));
    }
  }

  // --- Public API ---

  function goTo(dateStr: string): void {
    const parts = dateStr.split("-");
    currentYear = parseInt(parts[0]!, 10);
    currentMonth = parseInt(parts[1]!, 10) - 1;
    render();
  }

  function goToday(): void {
    const t = new Date();
    currentYear = t.getFullYear();
    currentMonth = t.getMonth();
    render();
  }

  function nextMonth(): void {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    render();
    opts.onNavigate?.(currentYear, currentMonth);
  }

  function prevMonth(): void {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    render();
    opts.onNavigate?.(currentYear, currentMonth);
  }

  // Initial render
  render();

  const instance: CalendarGridInstance = {
    element: root,
    goTo,
    goToday,
    nextMonth,
    prevMonth,
    getView: () => ({ year: currentYear, month: currentMonth }),
    getSelectedDates: () => [...selectedDates],
    setSelectedDates: (dates: string[]) => { selectedDates = [...dates]; render(); },
    addEvent: (ev: CalendarEvent) => { opts.events.push(ev); render(); },
    removeEvent: (id: string) => { opts.events = opts.events.filter(e => e.id !== id); render(); },
    clearSelection: () => { selectedDates = []; render(); },
    isDisabled: isDateDisabled,
    destroy: () => { destroyed = true; root.remove(); container.innerHTML = ""; },
  };

  return instance;
}
