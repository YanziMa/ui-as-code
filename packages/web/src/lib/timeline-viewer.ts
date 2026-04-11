/**
 * Timeline Viewer: Horizontal timeline component for displaying events,
 * milestones, periods, and ranges with zoom, scroll, grouping,
 * custom markers, tooltips, and responsive layout.
 */

// --- Types ---

export interface TimelineEvent {
  id: string;
  /** Display label */
  title: string;
  /** Date/time position (ISO string) */
  date: string;
  /** Optional end date for ranged events */
  endDate?: string;
  /** Description / tooltip content */
  description?: string;
  /** Color */
  color?: string;
  /** Icon or emoji */
  icon?: string;
  /** Event type: dot, bar, milestone, range */
  type?: "dot" | "bar" | "milestone" | "range";
  /** Group/category ID */
  group?: string;
  /** Custom CSS class */
  className?: string;
  /** Link URL */
  url?: string;
  /** Metadata */
  meta?: Record<string, unknown>;
}

export interface TimelineGroup {
  id: string;
  label: string;
  color?: string;
}

export interface TimelineOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Events to display */
  events: TimelineEvent[];
  /** Groups for lane-based layout */
  groups?: TimelineGroup[];
  /** Start of visible range (ISO) */
  start?: string;
  /** End of visible range (ISO) */
  end?: string;
  /** Height in px (default: auto) */
  height?: number;
  /** Lane height in px when grouped (default: 48) */
  laneHeight?: number;
  /** Show time axis? */
  showAxis?: boolean;
  /** Show grid lines? */
  showGrid?: boolean;
  /** Show tooltips on hover? */
  showTooltip?: boolean;
  /** Zoom level: 'hour', 'day', 'week', 'month', 'year' */
  zoom?: "hour" | "day" | "week" | "month" | "year";
  /** Orientation: horizontal or vertical */
  orientation?: "horizontal" | "vertical";
  /** Allow clicking events */
  interactive?: boolean;
  /** Callback on event click */
  onEventClick?: (event: TimelineEvent) => void;
  /** Callback on date click (empty area) */
  onDateClick?: (date: Date) => void;
  /** Callback on zoom change */
  onZoomChange?: (zoom: string) => void;
  /** Custom render function for events */
  renderEvent?: (event: TimelineEvent) => HTMLElement | string;
  /** Custom CSS class */
  className?: string;
}

export interface TimelineInstance {
  element: HTMLElement;
  getEvents: () => TimelineEvent[];
  addEvent: (event: TimelineEvent) => void;
  removeEvent: (id: string) => void;
  updateEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  setRange: (start: string, end: string) => void;
  setZoom: (zoom: "hour" | "day" | "week" | "month" | "year") => void;
  goToEvent: (eventId: string) => void;
  goToNow: () => void;
  destroy: () => void;
}

// --- Helpers ---

function parseDate(s: string): Date { return new Date(s); }

function formatAxisLabel(d: Date, zoom: string): string {
  switch (zoom) {
    case "hour": return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    case "day": return `${d.getMonth() + 1}/${d.getDate()}`;
    case "week": return `W${getWeekNumber(d)}`;
    case "month": return d.toLocaleDateString("en-US", { month: "short" });
    case "year": return String(d.getFullYear());
    default: return d.toLocaleDateString();
  }
}

function getWeekNumber(d: Date): number {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 3600000;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const COLORS = [
  "#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6",
];

function getEventColor(index: number, custom?: string): string {
  return custom ?? COLORS[index % COLORS.length];
}

// --- Main Factory ---

export function createTimeline(options: TimelineOptions): TimelineInstance {
  const opts = {
    events: [...options.events],
    groups: options.groups ?? [],
    height: options.height,
    laneHeight: options.laneHeight ?? 48,
    showAxis: options.showAxis ?? true,
    showGrid: options.showGrid ?? true,
    showTooltip: options.showTooltip ?? true,
    zoom: options.zoom ?? "day",
    orientation: options.orientation ?? "horizontal",
    interactive: options.interactive ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Timeline: container not found");

  let allEvents = [...opts.events];
  let destroyed = false;

  // Compute view range from data if not specified
  const now = new Date();
  let viewStart: Date = options.start ? parseDate(options.start)
    : allEvents.length > 0 ? new Date(Math.min(...allEvents.map((e) => parseDate(e.date).getTime())))
    : new Date(now.getTime() - 7 * 86400000);

  let viewEnd: Date = options.end ? parseDate(options.end)
    : allEvents.length > 0 ? new Date(Math.max(...allEvents.map((e) => parseDate(e.endDate ?? e.date).getTime())))
    : new Date(now.getTime() + 7 * 86400000);

  // Root
  const root = document.createElement("div");
  root.className = `timeline ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;
    font-family:-apple-system,sans-serif;font-size:12px;color:#374151;
    background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;
    ${opts.height ? `height:${opts.height}px;` : ""}
  `;
  container.appendChild(root);

  // Axis area
  let axisEl: HTMLElement | null = null;
  if (opts.showAxis && opts.orientation === "horizontal") {
    axisEl = document.createElement("div");
    axisEl.className = "tl-axis";
    axisEl.style.cssText = `
      flex-shrink:0;height:32px;border-bottom:1px solid #e5e7eb;background:#fafafa;display:flex;align-items:flex-end;overflow:hidden;position:relative;
    `;
    root.appendChild(axisEl);
  }

  // Content area (scrollable)
  const contentArea = document.createElement("div");
  contentArea.className = "tl-content";
  contentArea.style.cssText = "flex:1;overflow:auto;position:relative;";
  root.appendChild(contentArea);

  // Tooltip
  let tooltipEl: HTMLDivElement | null = null;
  if (opts.showTooltip) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "tl-tooltip";
    tooltipEl.style.cssText = `
      position:absolute;display:none;padding:8px 12px;border-radius:6px;
      font-size:11px;color:#111827;background:#fff;border:1px solid #e5e7eb;
      box-shadow:0 4px 12px rgba(0,0,0,0.12);pointer-events:none;z-index:100;
      max-width:260px;line-height:1.5;
    `;
    root.appendChild(tooltipEl);
  }

  // --- Layout Calculations ---

  function getViewDuration(): number {
    switch (opts.zoom) {
      case "hour": return hoursBetween(viewStart, viewEnd);
      default: return daysBetween(viewStart, viewEnd);
    }
  }

  function pxPerUnit(): number {
    const areaWidth = contentArea.clientWidth || 600;
    switch (opts.zoom) {
      case "hour": return areaWidth / Math.max(getViewDuration(), 24);
      case "day": return areaWidth / Math.max(getViewDuration(), 7);
      case "week": return areaWidth / Math.max(getViewDuration() / 7, 2);
      case "month": return areaWidth / Math.max(getViewDuration() / 30, 1);
      case "year": return areaWidth / Math.max(getViewDuration() / 365, 0.5);
      default: return areaWidth / Math.max(getViewDuration(), 7);
    }
  }

  function dateToPx(date: Date): number {
    const ppd = pxPerUnit();
    switch (opts.zoom) {
      case "hour": return hoursBetween(viewStart, date) * ppd;
      default: return daysBetween(viewStart, date) * ppd;
    }
  }

  function pxToDate(px: number): Date {
    const ppd = pxPerUnit();
    switch (opts.zoom) {
      case "hour": return new Date(viewStart.getTime() + (px / ppd) * 3600000);
      default: return new Date(viewStart.getTime() + (px / ppd) * 86400000);
    }
  }

  function getTotalWidth(): number {
    return pxPerUnit() * getViewDuration();
  }

  // --- Rendering ---

  function render(): void {
    contentArea.innerHTML = "";
    if (axisEl) axisEl.innerHTML = "";

    const totalW = getTotalWidth();
    const hasGroups = opts.groups.length > 0;
    const groupCount = hasGroups ? opts.groups.length : 1;
    const totalH = hasGroups ? groupCount * opts.laneHeight! : Math.max(allEvents.length * opts.laneHeight!, 120);

    // Canvas
    const canvas = document.createElement("div");
    canvas.style.cssText = `position:relative;width:${totalW}px;min-height:${totalH}px;`;
    contentArea.appendChild(canvas);

    // Grid lines
    if (opts.showGrid) {
      renderGrid(canvas, totalW, totalH);
    }

    // Now line
    renderNowLine(canvas, totalH);

    // Groups / lanes
    if (hasGroups) {
      renderGroupedEvents(canvas, totalW);
    } else {
      renderFlatEvents(canvas, totalW, totalH);
    }

    // Axis labels
    if (axisEl) {
      renderAxis(totalW);
    }
  }

  function renderGrid(canvas: HTMLElement, totalW: number, totalH: number): void {
    let stepDays: number, stepLabel: string;
    switch (opts.zoom) {
      case "hour": stepDays = 1 / 24; break;
      case "day": stepDays = 1; break;
      case "week": stepDays = 7; break;
      case "month": stepDays = 30; break;
      case "year": stepDays = 365; break;
      default: stepDays = 1;
    }

    const ppd = pxPerUnit();
    const gridContainer = document.createElement("div");
    gridContainer.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;";

    const steps = Math.min(Math.ceil(getViewDuration() / stepDays), 200);
    for (let i = 0; i <= steps; i++) {
      const x = i * stepDays * ppd;
      if (x < 0 || x > totalW) continue;
      const line = document.createElement("div");
      line.style.cssText = `position:absolute;left:${x}px;top:0;bottom:0;width:1px;background:${i === 0 ? "#d1d5db" : "#f0f0f0"};`;
      gridContainer.appendChild(line);
    }

    canvas.appendChild(gridContainer);
  }

  function renderNowLine(canvas: HTMLElement, totalH: number): void {
    const nowPx = dateToPx(now);
    if (nowPx < 0 || nowPx > getTotalWidth()) return;

    const line = document.createElement("div");
    line.className = "tl-now-line";
    line.style.cssText = `
      position:absolute;left:${nowPx.toFixed(1)}px;top:0;bottom:0;width:2px;
      background:#ef4444;z-index:5;pointer-events:none;
    `;
    canvas.appendChild(line);
  }

  function renderFlatEvents(canvas: HTMLElement, _totalW: number, totalH: number): void {
    const sorted = [...allEvents].sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

    for (let i = 0; i < sorted.length; i++) {
      const evt = sorted[i]!;
      const el = createEventElement(evt, i, totalH / Math.max(sorted.length, 1));
      canvas.appendChild(el);
    }
  }

  function renderGroupedEvents(canvas: HTMLElement, _totalW: number): void {
    for (let gi = 0; gi < opts.groups.length; gi++) {
      const group = opts.groups[gi]!;
      const groupEvents = allEvents.filter((e) => e.group === group.id);

      // Lane background
      const laneBg = document.createElement("div");
      laneBg.style.cssText = `
        position:absolute;left:0;right:0;top:${gi * opts.laneHeight!}px;height:${opts.laneHeight}px;
        background:${gi % 2 === 0 ? "#fff" : "#fafbfc"};border-bottom:1px solid #f0f0f0;
      `;
      canvas.appendChild(laneBg);

      // Group label
      const label = document.createElement("div");
      label.style.cssText = `
        position:absolute;left:0;top:${gi * opts.laneHeight! + 4}px;font-size:10px;
        color:#9ca3af;padding:0 8px;font-weight:500;z-index:2;pointer-events:none;
        background:${group.color ?? "transparent"};
      `;
      label.textContent = group.label;
      canvas.appendChild(label);

      // Events in this lane
      for (let ei = 0; ei < groupEvents.length; ei++) {
        const evt = groupEvents[ei]!;
        const el = createEventElement(evt, ei, opts.laneHeight!, gi * opts.laneHeight!);
        canvas.appendChild(el);
      }
    }
  }

  function createEventElement(event: TimelineEvent, index: number, laneH: number, laneTop?: number): HTMLElement {
    const startDate = parseDate(event.date);
    const endDate = event.endDate ? parseDate(event.endDate) : startDate;
    const left = dateToPx(startDate);
    const width = event.type === "range" || event.endDate
      ? Math.max(dateToPx(endDate) - left, 4)
      : event.type === "milestone" ? 14 : 10;
    const top = laneTop ?? index * laneH;

    const el = document.createElement("div");
    el.className = `tl-event ${event.className ?? ""}`;
    el.dataset.eventId = event.id;
    el.style.cssText = `
      position:absolute;left:${left}px;top:${top + 6}px;
      ${event.type === "milestone" || event.type === "dot" ? "" : `width:${width}px;`}
      z-index:10;cursor:${opts.interactive ? "pointer" : "default"};
    `;

    const color = getEventColor(allEvents.indexOf(event), event.color);

    switch (event.type) {
      case "milestone":
        el.style.cssText += `
          width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;
          border-bottom:14px solid ${color};filter:drop-shadow(0 1px 2px rgba(0,0,0,0.15));
        `;
        break;

      case "bar":
      case "range":
        el.style.cssText += `
          height:${laneH - 12}px;border-radius:4px;background:${color};
          display:flex;align-items:center;padding:0 8px;overflow:hidden;
          box-shadow:0 1px 3px rgba(0,0,0,0.1);transition:box-shadow 0.15s;
        `;
        if (width > 40) {
          const lbl = document.createElement("span");
          lbl.style.cssText = "font-size:11px;color:#fff;white-space:nowrap;overflow:hidden;text-ellipsis;pointer-events:none;";
          lbl.textContent = event.title;
          el.appendChild(lbl);
        }
        break;

      case "dot":
      default:
        el.style.cssText += `
          width:10px;height:10px;border-radius:50%;background:${color};
          border:2px solid #fff;box-shadow:0 0 0 2px ${color};transform:translateY(${(laneH - 20) / 2}px);
        `;
        break;
    }

    // Title label next to dot/milestone
    if ((event.type === "dot" || event.type === "milestone") && event.title) {
      const titleEl = document.createElement("span");
      titleEl.style.cssText = `
        position:absolute;left:${left + (event.type === "milestone" ? 16 : 14)}px;top:${top + 4}px;
        font-size:11px;color:#374151;white-space:nowrap;z-index:10;
        pointer-events:none;
      `;
      titleEl.textContent = event.title;
      // Append to canvas instead
      el._titleLabel = titleEl as any;
    }

    // Events
    if (opts.interactive) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        opts.onEventClick?.(event);
        if (event.url) window.open(event.url, "_blank");
      });

      el.addEventListener("mouseenter", () => {
        if (event.type !== "dot") el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
        showTooltip(event, e);
      });

      el.addEventListener("mouseleave", () => {
        if (event.type !== "dot") el.style.boxShadow = "";
        hideTooltip();
      });
    }

    el.title = event.description ?? event.title;

    return el;
  }

  function showTooltip(event: TimelineEvent, mouseEvent: MouseEvent): void {
    if (!tooltipEl) return;
    const rect = root.getBoundingClientRect();
    const content = `
      <div style="font-weight:600;margin-bottom:4px;">${event.title}</div>
      ${event.description ? `<div style="color:#6b7280;">${event.description}</div>` : ""}
      <div style="margin-top:4px;font-size:10px;color:#9ca3af;">
        ${parseDate(event.date).toLocaleDateString()}${event.endDate ? " – " + parseDate(event.endDate).toLocaleDateString() : ""}
      </div>
    `;
    tooltipEl.innerHTML = content;
    tooltipEl.style.display = "block";

    let tx = mouseEvent.clientX - rect.left;
    let ty = mouseEvent.clientY - rect.top + 12;
    const ttRect = tooltipEl.getBoundingClientRect();
    if (tx + ttRect.width > rect.width) tx = rect.width - ttRect.width - 8;
    if (ty + ttRect.height > rect.height) ty = mouseEvent.clientY - rect.top - ttRect.height - 8;

    tooltipEl.style.left = `${tx}px`;
    tooltipEl.style.top = `${ty}px`;
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.display = "none";
  }

  function renderAxis(totalW: number): void {
    if (!axisEl) return;
    const ruler = document.createElement("div");
    ruler.style.cssText = `display:flex;width:${totalW}px;`;

    let stepMs: number;
    switch (opts.zoom) {
      case "hour": stepMs = 3600000; break;
      case "day": stepMs = 86400000; break;
      case "week": stepMs = 604800000; break;
      case "month": stepMs = 2592000000; break;
      case "year": stepMs = 31536000000; break;
      default: stepMs = 86400000;
    }

    const duration = viewEnd.getTime() - viewStart.getTime();
    const steps = Math.min(Math.ceil(duration / stepMs), 100);

    for (let i = 0; i <= steps; i++) {
      const d = new Date(viewStart.getTime() + i * stepMs);
      if (d > viewEnd) break;
      const cell = document.createElement("div");
      const w = i < steps ? (stepMs / duration) * totalW : totalW - (i * (stepMs / duration) * totalW);
      cell.style.cssText = `text-align:center;min-width:${Math.max(w, 30)}px;font-size:10px;color:#9ca3af;padding-bottom:4px;border-right:1px solid #f0f0f0;flex-shrink:0;`;
      cell.textContent = formatAxisLabel(d, opts.zoom);
      ruler.appendChild(cell);
    }

    axisEl.appendChild(ruler);
  }

  // Click on empty area → date click callback
  contentArea.addEventListener("click", (e) => {
    if ((e.target as Element).closest(".tl-event")) return;
    const rect = contentArea.getBoundingClientRect();
    const px = e.clientX - rect.left + contentArea.scrollLeft;
    opts.onDateClick?.(pxToDate(px));
  });

  // Initial render
  render();

  // Responsive
  const resizeObserver = new ResizeObserver(() => { if (!destroyed) render(); });
  resizeObserver.observe(root);

  const instance: TimelineInstance = {
    element: root,

    getEvents() { return [...allEvents]; },

    addEvent(event: TimelineEvent) {
      allEvents.push(event);
      render();
    },

    removeEvent(id: string) {
      allEvents = allEvents.filter((e) => e.id !== id);
      render();
    },

    updateEvent(id: string, updates: Partial<TimelineEvent>) {
      const idx = allEvents.findIndex((e) => e.id === id);
      if (idx >= 0) { allEvents[idx] = { ...allEvents[idx]!, ...updates }; render(); }
    },

    setRange(start: string, end: string) {
      viewStart = parseDate(start);
      viewEnd = parseDate(end);
      render();
    },

    setZoom(zoom) {
      opts.zoom = zoom;
      render();
      opts.onZoomChange?.(zoom);
    },

    goToEvent(eventId: string) {
      const el = contentArea.querySelector(`[data-event-id="${eventId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    },

    goToNow() {
      const mid = (viewEnd.getTime() - viewStart.getTime()) / 2;
      viewStart = new Date(now.getTime() - mid);
      viewEnd = new Date(now.getTime() + mid);
      render();
    },

    destroy() {
      destroyed = true;
      resizeObserver.disconnect();
      root.remove();
    },
  };

  return instance;
}
