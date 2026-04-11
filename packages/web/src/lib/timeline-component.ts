/**
 * Timeline Component: Visual timeline with events, alternating sides,
 * icons, connectors, date grouping, status colors, and responsive layout.
 */

// --- Types ---

export interface TimelineEvent {
  id: string;
  /** Event title */
  title: string;
  /** Description or body content (HTML string or HTMLElement) */
  content?: string | HTMLElement;
  /** Timestamp (ISO string or Date) */
  timestamp: string | Date;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Color dot/accent for the event line */
  color?: string;
  /** Status: default, success, warning, error, info */
  status?: "default" | "success" | "warning" | "error" | "info";
  /** Custom data */
  data?: Record<string, unknown>;
}

export type TimelineMode = "left" | "alternating" | "right";
export type TimelineVariant = "dots" | "line" | "card";

export interface TimelineOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Timeline events */
  events: TimelineEvent[];
  /** Layout mode */
  mode?: TimelineMode;
  /** Visual variant */
  variant?: TimelineVariant;
  /** Show date headers between events? */
  showDateHeaders?: boolean;
  /** Icon size in px (default: 24) */
  iconSize?: number;
  /** Line color (default: #e5e7eb) */
  lineColor?: string;
  /** Card background for card variant */
  cardBg?: string;
  /** Click callback on event */
  onEventClick?: (event: TimelineEvent, index: number) => void;
  /** Format timestamp function */
  formatTimestamp?: (timestamp: string | Date) => string;
  /** Group events by day? */
  groupByDay?: boolean;
  /** Reverse order (newest first)? */
  reverse?: boolean;
  /** Compact mode (smaller spacing) */
  compact?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface TimelineInstance {
  element: HTMLElement;
  getEvents: () => TimelineEvent[];
  setEvents: (events: TimelineEvent[]) => void;
  addEvent: (event: TimelineEvent) => void;
  removeEvent: (id: string) => void;
  destroy: () => void;
}

// --- Status Colors ---

const STATUS_COLORS: Record<string, { dot: string; bg: string; border: string; iconBg: string }> = {
  default: { dot: "#d1d5db", bg: "transparent", border: "#e5e7eb", iconBg: "#f3f4f6" },
  success: { dot: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", iconBg: "#dcfce7" },
  warning: { dot: "#f59e0b", bg: "#fffbeb", border: "#fef3c7", iconBg: "#fef3c7" },
  error:   { dot: "#ef4444", bg: "#fef2f2", border: "#fecaca", iconBg: "#fee2e2" },
  info:    { dot: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", iconBg: "#dbeafe" },
};

const DEFAULT_ICONS: Record<string, string> = {
  default: "\u25CB",
  success: "\u2713",
  warning: "\u26A0",
  error:   "\u2715",
  info:    "\u2139",
};

// --- Helpers ---

function tsToDate(ts: string | Date): Date {
  return typeof ts === "string" ? new Date(ts) : ts;
}

function formatDate(ts: string | Date): string {
  const d = tsToDate(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(ts: string | Date): string {
  const d = tsToDate(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function escapeHtml(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// --- Main Factory ---

export function createTimeline(options: TimelineOptions): TimelineInstance {
  const opts = {
    mode: options.mode ?? "left",
    variant: options.variant ?? "dots",
    showDateHeaders: options.showDateHeaders ?? true,
    iconSize: options.iconSize ?? 24,
    lineColor: options.lineColor ?? "#e5e7eb",
    cardBg: options.cardBg ?? "#fff",
    formatTimestamp: options.formatTimestamp ?? ((ts: string | Date) => `${formatDate(ts)} ${formatTime(ts)}`),
    groupByDay: options.groupByDay ?? false,
    reverse: options.reverse ?? false,
    compact: options.compact ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Timeline: container not found");

  let events = [...options.events];
  let destroyed = false;

  container.className = `timeline timeline-${opts.mode} timeline-${opts.variant} ${opts.className ?? ""}`;
  container.style.cssText = `
    position:relative;font-family:-apple-system,sans-serif;color:#374151;
    ${opts.compact ? "" : "padding:16px 0;"}
  `;

  // Inject connector line styles
  if (!document.getElementById("timeline-styles")) {
    const style = document.createElement("style");
    style.id = "timeline-styles";
    style.textContent = `
      .timeline{position:relative;}.timeline::before{
        content:'';position:absolute;left:${opts.mode === "right" ? "auto" : opts.iconSize / 2}px};
        top:0;bottom:0;width:2px;background:${opts.lineColor};z-index:0;
      }
      .timeline-right::before{left:auto;right:${opts.iconSize / 2}px;}
      .tl-event{position:relative;margin-bottom:${opts.compact ? "16px" : "28px"};}
      .tl-dot{position:absolute;width:12px;height:12px;border-radius:50%;
        z-index:1;top:${(opts.iconSize - 12) / 2}px;
        ${opts.mode === "left" ? `left:-${(opts.iconSize + 12) / 2}px;` : `right:-${(opts.iconSize + 12) / 2}px;`}
      }
      .tl-card{background:${opts.cardBg};border:1px solid #e5e7eb;border-radius:10px;
        padding:14px 18px;margin-left:${opts.mode === "left" ? "20px" : "auto"};
        margin-right:${opts.mode === "right" ? "20px" : "auto"};box-shadow:0 1px 3px rgba(0,0,0,0.04);
        transition:transform 0.2s,box-shadow 0.2s,max-height:300px;overflow:hidden;
      }
      .tl-card:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.08);}
      .tl-time{font-size:11px;color:#9ca3af;margin-bottom:4px;}
      .tl-title{font-size:14px;font-weight:600;color:#111827;margin-bottom:4px;}
      .tl-body{font-size:13px;color:#6b7280;line-height:1.5;}
      .tl-date-header{font-size:12px;font-weight:600;color:#6b7280;
        margin:${opts.compact ? "12px 0" : "20px 0"};padding:8px 0;
        border-bottom:1px solid #f0f0f0;text-transform:uppercase;letter-spacing:0.05em;}
    `;
    document.head.appendChild(style);
  }

  function render(): void {
    container.innerHTML = "";

    let sorted = [...events];
    if (opts.reverse) sorted.reverse();

    // Optionally group by day
    if (opts.groupByDay) {
      const groups = new Map<string, TimelineEvent[]>();
      for (const ev of sorted) {
        const key = formatDate(ev.timestamp);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(ev);
      }

      for (const [dateStr, group] of groups) {
        const header = document.createElement("div");
        header.className = "tl-date-header";
        header.textContent = dateStr;
        container.appendChild(header);

        for (const ev of group) {
          renderEvent(ev);
        }
      }
    } else {
      for (const ev of sorted) {
        renderEvent(ev);
      }
    }
  }

  function renderEvent(event: TimelineEvent): void {
    const wrapper = document.createElement("div");
    wrapper.className = "tl-event";
    wrapper.dataset.eventId = event.id;

    const status = event.status ?? "default";
    const colors = STATUS_COLORS[status] ?? STATUS_COLORS.default;

    // Dot indicator
    const dot = document.createElement("div");
    dot.className = "tl-dot";
    dot.style.background = event.color ?? colors.dot;
    wrapper.appendChild(dot);

    // Content area
    if (opts.variant === "card") {
      const card = document.createElement("div");
      card.className = "tl-card";
      card.style.cursor = opts.onEventClick ? "pointer" : "default";

      // Time
      const timeEl = document.createElement("div");
      timeEl.className = "tl-time";
      timeEl.textContent = opts.formatTimestamp(event.timestamp);
      card.appendChild(timeEl);

      // Title
      const titleEl = document.createElement("div");
      titleEl.className = "tl-title";
      titleEl.textContent = event.title;
      card.appendChild(titleEl);

      // Body
      if (event.content) {
        const bodyEl = document.createElement("div");
        bodyEl.className = "tl-body";
        if (typeof event.content === "string") {
          bodyEl.innerHTML = escapeHtml(event.content);
        } else {
          bodyEl.appendChild(event.content);
        }
        card.appendChild(bodyEl);
      }

      if (opts.onEventClick) {
        card.addEventListener("click", () => {
          const idx = events.findIndex((e) => e.id === event.id);
          opts.onEventClick(event, idx >= 0 ? idx : 0);
        });
      }

      wrapper.appendChild(card);
    } else {
      // Non-card mode: inline layout
      const content = document.createElement("div");
      content.style.cssText = `
        margin-${opts.mode === "left" ? "left" : "right"}:20px;
        flex:1;min-width:0;
      `;

      // Time
      const timeEl = document.createElement("div");
      timeEl.className = "tl-time";
      timeEl.textContent = opts.formatTimestamp(event.timestamp);
      content.appendChild(timeEl);

      // Icon + Title row
      const titleRow = document.createElement("div");
      titleRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:4px;";

      const iconEl = document.createElement("span");
      iconEl.style.cssText = `
        width:${opts.iconSize}px;height:${opts.iconSize}px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:${opts.iconSize * 0.55}px;background:${colors.iconBg};
        color:${colors.dot};flex-shrink:0;
      `;
      iconEl.textContent = event.icon ?? DEFAULT_ICONS[status] ?? DEFAULT_ICONS.default;
      titleRow.appendChild(iconEl);

      const titleEl = document.createElement("span");
      titleEl.className = "tl-title";
      titleEl.textContent = event.title;
      titleRow.appendChild(titleEl);
      content.appendChild(titleRow);

      // Body
      if (event.content) {
        const bodyEl = document.createElement("div");
        bodyEl.className = "tl-body";
        if (typeof event.content === "string") {
          bodyEl.innerHTML = escapeHtml(event.content).replace(/\n/g, "<br>");
        } else {
          bodyEl.appendChild(event.content);
        }
        content.appendChild(bodyEl);
      }

      wrapper.appendChild(content);
    }

    container.appendChild(wrapper);
  }

  // Initial render
  render();

  const instance: TimelineInstance = {
    element: container,

    getEvents() { return [...events]; },

    setEvents(newEvents: TimelineEvent[]) {
      events = newEvents;
      render();
    },

    addEvent(newEvent: TimelineEvent) {
      events.push(newEvent);
      render();
    },

    removeEvent(id: string) {
      events = events.filter((e) => e.id !== id);
      render();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
