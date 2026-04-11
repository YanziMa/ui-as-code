/**
 * Timeline V2: Enhanced vertical/horizontal timeline with events, milestones,
 * alternating layout, icons, connectors, animations, grouping, and responsive design.
 */

// --- Types ---

export type TimelineOrientation = "vertical" | "horizontal";
export type TimelineVariant = "default" | "dots" | "numbered" | "bordered";
export type TimelineAlign = "left" | "right" | "alternate";

export interface TimelineEvent {
  /** Unique ID */
  id: string;
  /** Event title */
  title: string;
  /** Description text or HTML */
  description?: string;
  /** Timestamp or label */
  time?: string;
  /** Icon (emoji, SVG string, or HTML element) */
  icon?: string | HTMLElement;
  /** Color accent for this event's dot/icon */
  color?: string;
  /** Is this a milestone? (larger marker) */
  milestone?: boolean;
  /** Group ID for visual grouping */
  group?: string;
  /** Custom data payload */
  data?: unknown;
  /** Disabled/grayed out? */
  disabled?: boolean;
}

export interface TimelineV2Options {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Timeline events */
  events: TimelineEvent[];
  /** Orientation */
  orientation?: TimelineOrientation;
  /** Visual variant */
  variant?: TimelineVariant;
  /** Alignment (for vertical mode) */
  align?: TimelineAlign;
  /** Show connecting lines between events */
  showLines?: boolean;
  /** Line style: solid, dashed, dotted */
  lineStyle?: "solid" | "dashed" | "dotted";
  /** Line color */
  lineColor?: string;
  /** Show time labels on each event */
  showTime?: boolean;
  /** Show descriptions */
  showDescriptions?: boolean;
  /** Animation on mount? */
  animate?: boolean;
  /** Animation delay between items (ms) */
  animationDelay?: number;
  /** Click callback */
  onClick?: (event: TimelineEvent, index: number) => void;
  /** Custom render function for each event */
  renderEvent?: (event: TimelineEvent, index: number, isLast: boolean) => HTMLElement;
  /** Custom CSS class */
  className?: string;
}

export interface TimelineV2Instance {
  element: HTMLElement;
  getEvents: () => TimelineEvent[];
  setEvents: (events: TimelineEvent[]) => void;
  addEvent: (event: TimelineEvent) => void;
  removeEvent: (id: string) => void;
  updateEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  destroy: () => void;
}

// --- Default Icons ---

const DEFAULT_ICONS: Record<string, string> = {
  default: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>`,
  milestone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="7"/></svg>`,
};

const ACCENT_COLORS = ["#4338ca", "#0891b2", "#059669", "#d97706", "#c2410c", "#7c3aed"];

// --- Main Factory ---

export function createTimelineV2(options: TimelineV2Options): TimelineV2Instance {
  const opts = {
    orientation: options.orientation ?? "vertical",
    variant: options.variant ?? "default",
    align: options.align ?? "left",
    showLines: options.showLines ?? true,
    lineStyle: options.lineStyle ?? "solid",
    lineColor: options.lineColor ?? "#e5e7eb",
    showTime: options.showTime ?? true,
    showDescriptions: options.showDescriptions ?? true,
    animate: options.animate ?? true,
    animationDelay: options.animationDelay ?? 100,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TimelineV2: container not found");

  let events = [...options.events];
  let destroyed = false;

  container.className = `timeline-v2 tl-${opts.orientation} ${opts.className}`;
  container.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;position:relative;
    ${opts.orientation === "horizontal"
      ? "display:flex;align-items:flex-start;gap:0;padding:20px 0;"
      : "padding:20px 0;"}
  `;

  // Inject keyframes
  if (!document.getElementById("timeline-v2-styles")) {
    const s = document.createElement("style");
    s.id = "timeline-v2-styles";
    s.textContent = `
      @keyframes tl-fade-in{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
      @keyframes tl-slide-in{from{opacity:0;transform:translateX(-16px);}to{opacity:1;transform:translateX(0);}}
    `;
    document.head.appendChild(s);
  }

  // Build
  function render(): void {
    container.innerHTML = "";

    // Group events by group ID
    const groups = new Map<string, TimelineEvent[]>();
    for (const ev of events) {
      const g = ev.group ?? "__ungrouped__";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(ev);
    }

    let globalIdx = 0;

    for (const [groupId, groupEvents] of groups) {
      // Group header
      if (groupId !== "__ungrouped__") {
        const groupHeader = document.createElement("div");
        groupHeader.className = "tl-group-header";
        groupHeader.style.cssText = `
          font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;
          color:#9ca3af;margin:${opts.orientation === "horizontal" ? "0 8px 4px" : "8px 0 16px"};
          padding:${opts.orientation === "horizontal" ? "4px 12px" : "12px 16px"};
          border-bottom:1px solid #f0f0f0;
        `;
        groupHeader.textContent = groupId;
        container.appendChild(groupHeader);
      }

      // Events in this group
      for (let i = 0; i < groupEvents.length; i++) {
        const ev = groupEvents[i]!;
        const isLast = i === groupEvents.length - 1 && groupId === Array.from(groups.keys())[groups.size - 1];

        const el = opts.renderEvent
          ? opts.renderEvent(ev, globalIdx, isLast)
          : createDefaultEvent(ev, globalIdx, isLast);

        el.style.animationDelay = `${globalIdx * opts.animationDelay}ms`;
        if (opts.animate) {
          el.style.animation = `${opts.orientation === "horizontal" ? "tl-slide-in" : "tl-fade-in"} 0.4s ease both`;
        }

        container.appendChild(el);
        globalIdx++;
      }
    }
  }

  function createDefaultEvent(event: TimelineEvent, index: number, isLast: boolean): HTMLElement {
    const isHoriz = opts.orientation === "horizontal";
    const item = document.createElement("div");
    item.className = `tl-event ${event.milestone ? "tl-milestone" : ""} ${event.disabled ? "tl-disabled" : ""}`;
    item.dataset.eventId = event.id;

    const accentColor = event.color ?? ACCENT_COLORS[index % ACCENT_COLORS.length];
    const isMilestone = event.milestone ?? false;
    const iconSize = isMilestone ? 28 : 18;

    item.style.cssText = `
      position:relative;display:${isHoriz ? "inline-flex;flex-direction:column;" : "flex;"}
      ${isHoriz ? "" : "align-items:flex-start;"}
      gap:10px;padding:${isMilestone ? "4px 0" : "0"};min-width:0;
      opacity:${event.disabled ? "0.5" : "1"};
    `;

    // Connector line (before the dot)
    if (index > 0 && opts.showLines && !isLast) {
      const connector = document.createElement("div");
      connector.className = "tl-connector";
      connector.style.cssText = `
        ${isHoriz
          ? `position:absolute;left:-20px;top:50%;width:16px;height:2px;`
          : `position:absolute;left:${opts.align === "right" ? "auto" : "-20px"};top:${iconSize / 2}px;width:2px;height:calc(100% + 20px);`}
        background:${opts.lineColor};
        ${opts.lineStyle === "dashed" ? "background:repeating-linear-gradient(to ${isHoriz ? "bottom" : "right"},${accentColor} 0,transparent 0,${accentColor} 4px)" : ""}
        ${opts.lineStyle === "dotted" ? "background:repeating-linear-gradient(to ${isHoriz ? "bottom" : "right"},${accentColor} 0,transparent 0,${accentColor} 2px)" : ""}
      `;
      item.appendChild(connector);
    }

    // Dot/Icon marker
    const marker = document.createElement("div");
    marker.className = "tl-marker";
    marker.style.cssText = `
      flex-shrink:0;${isHoriz ? "order:-1;" : ""}
      width:${iconSize}px;height:${iconSize}px;border-radius:${isMilestone ? "50%" : "50%"};
      display:flex;align-items:center;justify-content:center;
      background:${isMilestone ? accentColor + "18" : "#fff"};border:2px solid ${accentColor};
      color:${isMilestone ? "#fff" : accentColor};
      z-index:1;
    `;
    if (typeof event.icon === "string") {
      marker.innerHTML = event.icon;
    } else if (event.icon instanceof HTMLElement) {
      marker.appendChild(event.icon);
    } else {
      marker.innerHTML = isMilestone ? DEFAULT_ICONS.milestone : DEFAULT_ICONS.default;
    }
    item.appendChild(marker);

    // Content area
    const content = document.createElement("div");
    content.className = "tl-content";
    content.style.cssText = `
      flex:1;min-width:0;${isHoriz ? "order:0;" : ""}
    `;

    // Time label
    if (opts.showTime && event.time) {
      const timeEl = document.createElement("div");
      timeEl.className = "tl-time";
      timeEl.style.cssText = `
        font-size:11px;color:#9ca3af;font-weight:500;white-space:nowrap;
        margin-bottom:2px;
      `;
      timeEl.textContent = event.time;
      content.appendChild(timeEl);
    }

    // Title
    const titleEl = document.createElement("div");
    titleEl.className = "tl-title";
    titleEl.style.cssText = `
      font-size:14px;font-weight:600;color:#111827;line-height:1.3;
    `;
    titleEl.textContent = event.title;
    content.appendChild(titleEl);

    // Description
    if (opts.showDescriptions && event.description) {
      const descEl = document.createElement("div");
      descEl.className = "tl-desc";
      descEl.style.cssText = `font-size:12px;color:#6b7280;line-height:1.5;margin-top:3px;`;
      descEl.innerHTML = typeof event.description === "string" ? event.description : "";
      content.appendChild(descEl);
    }

    item.appendChild(content);

    // Click handler
    if (!event.disabled && opts.onClick) {
      item.style.cursor = "pointer";
      item.addEventListener("click", () => opts.onClick(event, index));
      item.addEventListener("mouseenter", () => { item.style.background = "#f9fafb"; });
      item.addEventListener("mouseleave", () => { item.style.background = ""; });
    }

    return item;
  }

  // Initial render
  render();

  const instance: TimelineV2Instance = {
    element: container,

    getEvents() { return [...events]; },

    setItems(newEvents: TimelineEvent[]) { events = newEvents; render(); },
    setEvents(newEvents: TimelineEvent[]) { events = newEvents; render(); },

    addEvent(newEvent: TimelineEvent) { events.push(newEvent); render(); },

    removeEvent(id: string) {
      events = events.filter((e) => e.id !== id);
      render();
    },

    updateEvent(id: string, updates: Partial<TimelineEvent>) {
      const idx = events.findIndex((e) => e.id === id);
      if (idx >= 0) { events[idx] = { ...events[idx]!, ...updates }; }
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
