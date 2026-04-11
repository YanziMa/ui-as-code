/**
 * Lightweight Timeline: Vertical/horizontal timeline with 4 layouts (left/right/alternating/center),
 * status colors (default/success/warning/error/info/pending), SVG status icons,
 * connector lines, timestamps, animations, and custom renderItem.
 */

// --- Types ---

export type TimelineLayout = "left" | "right" | "alternating" | "center";
export type TimelineItemStatus = "default" | "success" | "warning" | "error" | "info" | "pending";

export interface TimelineItem {
  /** Unique key */
  id: string;
  /** Title text */
  title: string;
  /** Description/subtitle */
  description?: string;
  /** Timestamp label */
  time?: string;
  /** Status variant */
  status?: TimelineItemStatus;
  /** Icon (emoji or HTML string) overrides default */
  icon?: string | HTMLElement;
  /** Custom content renderer */
  render?: (item: TimelineItem) => HTMLElement | null;
}

export interface TimelineOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Items to display */
  items: TimelineItem[];
  /** Layout mode */
  layout?: TimelineLayout;
  /** Show connecting lines? */
  showLines?: boolean;
  /** Line color */
  lineColor?: string;
  /** Show timestamps? */
  showTime?: boolean;
  /** Alternate side for alternating layout */
  alternateStart?: "left" | "right";
  /** Compact mode (smaller padding) */
  compact?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface TimelineInstance {
  element: HTMLElement;
  getItems: () => TimelineItem[];
  setItems: (items: TimelineItem[]) => void;
  addItem: (item: TimelineItem) => void;
  removeItem: (id: string) => void;
  destroy: () => void;
}

// --- Config ---

const STATUS_CONFIG: Record<TimelineItemStatus, { color: string; bg: string; svgPath: string }> = {
  default:  { color: "#9ca3af", bg: "#f3f4f6", svgPath: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  success:  { color: "#22c55e", bg: "#f0fdf4", svgPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  warning:  { color: "#f59e0b", bg: "#fffbeb", svgPath: "M12 9v2m0 4h.01M12 3L8.5 6.5" },
  error:    { color: "#ef4444", bg: "#fef2f2", svgPath: "M10 14l2-2m0 0l2-2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
  info:     { color: "#3b82f6", bg: "#eff6ff", svgPath: "M13 16h-1v-4h-1m1-4h.01M12 3L8.5 6.5" },
  pending:   { color: "#d1d5db", bg: "#fafafa", svgPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
};

// --- Main Factory ---

export function createTimeline(options: TimelineOptions): TimelineInstance {
  const opts = {
    layout: options.layout ?? "left",
    showLines: options.showLines ?? true,
    lineColor: options.lineColor ?? "#e5e7eb",
    showTime: options.showTime ?? true,
    alternateStart: options.alternateStart ?? "left",
    compact: options.compact ?? false,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Timeline: container not found");

  let items = [...options.items];
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `timeline timeline-${opts.layout} ${opts.className}`;
  root.style.cssText = `
    position:relative;font-family:-apple-system,sans-serif;color:#374151;
    ${opts.layout === "horizontal"
      ? "display:flex;align-items:flex-start;gap:0;overflow-x:auto;padding:20px 0;"
      : "padding:8px 0;"}
  `;
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";

    if (items.length === 0) return;

    if (opts.layout === "horizontal") {
      renderHorizontal();
    } else {
      renderVertical();
    }
  }

  function renderVertical(): void {
    const pad = opts.compact ? "12px" : "24px";

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const sc = STATUS_CONFIG[item.status ?? "default"];
      const isAlt = opts.layout === "alternating" && i % 2 === 1;
      const isRight = opts.layout === "right" || (isAlt && opts.alternateStart === "right");
      const isCenter = opts.layout === "center";

      const row = document.createElement("div");
      row.className = "timeline-item";
      row.dataset.id = item.id;
      row.style.cssText = `
        display:flex;position:relative;gap:${pad};
        padding:${opts.compact ? "8px 0" : "16px 0"};
        ${isCenter ? "justify-content:center;" : isRight ? "flex-direction:row-reverse;" : ""}
        animation:tl-slide-in 0.35s ease-out both;
        animation-delay:${i * 0.08}s;opacity:0;
      `;

      // Dot + line column
      const dotCol = document.createElement("div");
      dotCol.style.cssText = `
        display:flex;flex-direction:column;align-items:center;
        flex-shrink:0;width:30px;${isCenter ? "" : ""}
      `;

      // Connector line
      if (i > 0 && opts.showLines && !isCenter) {
        const line = document.createElement("div");
        line.style.cssText = `width:2px;flex:1;background:${opts.lineColor};min-height:20px;margin-bottom:-4px;`;
        dotCol.appendChild(line);
      } else if (!isCenter && i < items.length - 1 && opts.showLines) {
        // Placeholder for spacing
        const spacer = document.createElement("div");
        spacer.style.cssText = "width:30px;";
        if (!isRight) dotCol.appendChild(spacer);
      }

      // Status dot
      const dot = document.createElement("div");
      dot.style.cssText = `
        width:14px;height:14px;border-radius:50%;
        background:${sc.bg};border:2px solid #fff;
        box-shadow:0 0 0 2px ${sc.color};z-index:1;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;
      `;

      if (item.icon) {
        if (typeof item.icon === "string") {
          dot.textContent = item.icon;
          dot.style.fontSize = "8px";
        } else {
          dot.innerHTML = "";
          dot.appendChild(item.icon);
        }
      } else {
        // Default SVG icon
        const svgSize = 12;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("width", String(svgSize));
        svg.setAttribute("height", String(svgSize));
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", sc.color);
        svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", sc.svgPath);
        svg.appendChild(path);
        dot.appendChild(svg);
      }
      dotCol.appendChild(dot);

      if (!isRight) row.appendChild(dotCol);

      // Content
      let contentEl: HTMLElement;
      if (item.render) {
        contentEl = item.render(item) ?? createDefaultContent(item, sc);
      } else {
        contentEl = createDefaultContent(item, sc);
      }
      contentEl.style.flex = "1";
      contentEl.style.minWidth = "0";
      row.appendChild(contentEl);

      root.appendChild(row);
    }

    // Inject animation style
    if (!document.getElementById("tl-fade-style")) {
      const s = document.createElement("style");
      s.id = "tl-fade-style";
      s.textContent = "@keyframes tl-slide-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}";
      document.head.appendChild(s);
    }
  }

  function renderHorizontal(): void {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const sc = STATUS_CONFIG[item.status ?? "default"];

      const col = document.createElement("div");
      col.className = "timeline-item-h";
      col.dataset.id = item.id;
      col.style.cssText = `
        display:flex;flex-direction:column;align-items:center;min-width:120px;
        gap:8px;padding:0 16px;animation:tl-slide-in 0.35s ease-out both;
        animation-delay:${i * 0.08}s;opacity:0;
      `;

      // Dot
      const dot = document.createElement("div");
      dot.style.cssText = `
        width:12px;height:12px;border-radius:50%;
        background:${sc.bg};border:2px solid #fff;
        box-shadow:0 0 0 2px ${sc.color};flex-shrink:0;
      `;
      col.appendChild(dot);

      // Time / title below
      if (opts.showTime && item.time) {
        const t = document.createElement("span");
        t.textContent = item.time;
        t.style.cssText = "font-size:11px;color:#9ca3af;white-space:nowrap;";
        col.appendChild(t);
      }

      const title = document.createElement("span");
      title.textContent = item.title;
      title.style.cssText = "font-size:13px;font-weight:500;text-align:center;white-space:nowrap;";
      col.appendChild(title);

      // Connector line
      if (i < items.length - 1 && opts.showLines) {
        const line = document.createElement("div");
        line.style.cssText = `width:40px;height:2px;background:${opts.lineColor};flex-shrink:0;`;
        col.appendChild(line);
      }

      root.appendChild(col);
    }
  }

  function createDefaultContent(item: TimelineItem, sc: typeof STATUS_CONFIG[TimelineItemStatus]): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText = "min-width:0;";

    const titleRow = document.createElement("div");
    titleRow.style.cssText = "font-weight:500;font-size:14px;color:#111827;line-height:1.4;";
    titleRow.textContent = item.title;
    el.appendChild(titleRow);

    if (item.description) {
      const desc = document.createElement("div");
      desc.style.cssText = "font-size:13px;color:#6b7280;margin-top:2px;line-height:1.5;";
      desc.textContent = item.description;
      el.appendChild(desc);
    }

    if (opts.showTime && item.time && opts.layout !== "horizontal") {
      const time = document.createElement("div");
      time.style.cssText = "font-size:11px;color:#9ca3af;margin-top:4px;";
      time.textContent = item.time;
      el.appendChild(time);
    }

    return el;
  }

  render();

  const instance: TimelineInstance = {
    element: root,

    getItems() { return [...items]; },

    setItems(newItems: TimelineItem[]) {
      items = newItems;
      render();
    },

    addItem(newItem: TimelineItem) {
      items.push(newItem);
      render();
    },

    removeItem(id: string) {
      items = items.filter((it) => it.id !== id);
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
