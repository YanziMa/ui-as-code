/**
 * Timeline Component: Vertical/horizontal timeline with items, icons, alternating layout,
 * connectors, timestamps, status colors, animations, and responsive design.
 */

// --- Types ---

export type TimelineItemStatus = "default" | "success" | "warning" | "error" | "info" | "pending";

export interface TimelineItem {
  /** Unique ID */
  id: string;
  /** Title */
  title: string;
  /** Description/content */
  content?: string;
  /** Timestamp or date string */
  timestamp?: string;
  /** Status */
  status?: TimelineItemStatus;
  /** Icon (emoji, SVG string, or icon name) */
  icon?: string;
  /** Color override for dot/icon */
  color?: string;
  /** Additional metadata */
  data?: unknown;
}

export interface TimelineOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Timeline items */
  items: TimelineItem[];
  /** Orientation */
  orientation?: "vertical" | "horizontal";
  /** Layout mode for vertical */
  layout?: "left" | "right" | "alternating" | "center";
  /** Show connector lines between items */
  showConnectors?: boolean;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Show icons/dots */
  showIcons?: boolean;
  /** Animate items on scroll/load */
  animate?: boolean;
  /** Reverse order (newest first) */
  reverse?: boolean;
  /** Click callback */
  onItemClick?: (item: TimelineItem, index: number) => void;
  /** Custom renderer for item content */
  renderItem?: (item: TimelineItem, index: number, el: HTMLElement) => void;
  /** Status color map (override defaults) */
  statusColors?: Partial<Record<TimelineItemStatus, string>>;
  /** Custom CSS class */
  className?: string;
}

export interface TimelineInstance {
  element: HTMLElement;
  getItems: () => TimelineItem[];
  addItem: (item: TimelineItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<TimelineItem>) => void;
  clear: () => void;
  destroy: () => void;
}

// --- Default Colors ---

const DEFAULT_STATUS_COLORS: Record<TimelineItemStatus, string> = {
  default: "#6b7280",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  pending: "#9ca3af",
};

// --- Main Class ---

export class TimelineManager {
  create(options: TimelineOptions): TimelineInstance {
    const opts = {
      orientation: options.orientation ?? "vertical",
      layout: options.layout ?? "left",
      showConnectors: options.showConnectors ?? true,
      showTimestamps: options.showTimestamps ?? true,
      showIcons: options.showIcons ?? true,
      animate: options.animate ?? true,
      reverse: options.reverse ?? false,
      statusColors: { ...DEFAULT_STATUS_COLORS, ...options.statusColors },
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Timeline: container element not found");

    container.className = `timeline timeline-${opts.orientation} ${opts.className ?? ""}`;
    let items: TimelineItem[] = opts.reverse
      ? [...options.items].reverse()
      : [...options.items];
    let destroyed = false;

    function getStatusColor(item: TimelineItem): string {
      if (item.color) return item.color;
      return opts.statusColors[item.status ?? "default"] ?? DEFAULT_STATUS_COLORS.default;
    }

    function render(): void {
      container.innerHTML = "";

      const isHorizontal = opts.orientation === "horizontal";
      container.style.cssText = isHorizontal
        ? "display:flex;align-items:flex-start;overflow-x:auto;padding:20px 0;gap:0;"
        : "display:flex;flex-direction:column;padding:20px 0;";

      if (isHorizontal) {
        // Horizontal timeline
        renderHorizontal();
      } else {
        // Vertical timeline
        renderVertical();
      }
    }

    function renderVertical(): void {
      const isAlternating = opts.layout === "alternating";
      const isCenter = opts.layout === "center";
      const isRight = opts.layout === "right";

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const color = getStatusColor(item);
        const isLeft = isAlternating ? i % 2 === 0 : !isRight;

        const row = document.createElement("div");
        row.className = "timeline-item";
        row.dataset.id = item.id;
        row.style.cssText = `
          display:flex;position:relative;${isCenter ? "justify-content:center;" : isLeft ? "" : "flex-direction:row-reverse;"}
          padding-bottom:${i < items.length - 1 ? "24px" : "0"};
          opacity:${opts.animate ? "0" : "1"};transform:${opts.animate ? "translateY(16px)" : "none"};
          transition:opacity 0.4s ease,transform 0.4s ease;
        `;

        // Content side
        const contentSide = document.createElement("div");
        contentSide.className = "timeline-content-side";
        contentSide.style.cssText = `
          flex:1;max-width:calc(50% - 30px);padding-${isCenter ? "0" : isLeft ? "right" : "left"}:20px;
        `;

        const card = createItemCard(item, i, color);
        contentSide.appendChild(card);
        row.appendChild(contentSide);

        // Center line + dot
        const centerCol = document.createElement("div");
        centerCol.className = "timeline-center";
        centerCol.style.cssText = `
          display:flex;flex-direction:column;align-items:center;width:40px;flex-shrink:0;position:relative;
        `;

        // Connector line above
        if (opts.showConnectors && i > 0) {
          const lineAbove = document.createElement("div");
          lineAbove.style.cssText = `position:absolute;top:-24px;width:2px;height:24px;background:#e5e7eb;`;
          centerCol.appendChild(lineAbove);
        }

        // Dot/Icon
        if (opts.showIcons) {
          const dot = createDot(item, color);
          centerCol.appendChild(dot);
        } else {
          const plainDot = document.createElement("div");
          plainDot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;z-index:1;`;
          centerCol.appendChild(plainDot);
        }

        // Connector line below
        if (opts.showConnectors && i < items.length - 1) {
          const lineBelow = document.createElement("div");
          lineBelow.style.cssText = `position:absolute;top:100%;width:2px;height:24px;background:#e5e7eb;`;
          centerCol.appendChild(lineBelow);
        }

        row.appendChild(centerCol);

        // Empty opposite side (for alternating/center)
        if (isCenter || isAlternating || isRight) {
          const emptySide = document.createElement("div");
          emptySide.style.cssText = "flex:1;max-width:calc(50% - 30px);";
          row.appendChild(emptySide);
        }

        // Click handler
        row.style.cursor = opts.onItemClick ? "pointer" : "default";
        if (opts.onItemClick) {
          row.addEventListener("click", () => opts.onItemClick!(item, i));
        }

        container.appendChild(row);

        // Trigger animation
        if (opts.animate) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              row.style.opacity = "1";
              row.style.transform = "none";
            });
          });
        }
      }
    }

    function renderHorizontal(): void {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const color = getStatusColor(item);

        const col = document.createElement("div");
        col.className = "timeline-column";
        col.dataset.id = item.id;
        col.style.cssText = `
          display:flex;flex-direction:column;align-items:center;min-width:160px;flex:1;
          position:relative;opacity:${opts.animate ? "0" : "1"};
          transform:${opts.animate ? "translateY(16px)" : "none"};
          transition:opacity 0.4s ease,transform 0.4s ease;
        `;

        // Dot/Icon
        if (opts.showIcons) {
          const dot = createDot(item, color);
          col.appendChild(dot);
        }

        // Connector line (to the right)
        if (opts.showConnectors && i < items.length - 1) {
          const hLine = document.createElement("div");
          hLine.style.cssText = `
            position:absolute;top:10px;left:calc(50% + 12px);width:calc(100% - 24px);height:2px;
            background:#e5e7eb;
          `;
          col.appendChild(hLine);
        }

        // Card below
        const card = createItemCard(item, i, color);
        card.style.marginTop = "12px";
        col.appendChild(card);

        if (opts.onItemClick) {
          col.style.cursor = "pointer";
          col.addEventListener("click", () => opts.onItemClick!(item, i));
        }

        container.appendChild(col);

        if (opts.animate) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              col.style.opacity = "1";
              col.style.transform = "none";
            });
          });
        }
      }
    }

    function createDot(item: TimelineItem, color: string): HTMLElement {
      const dot = document.createElement("div");
      dot.className = "timeline-dot";
      dot.style.cssText = `
        width:24px;height:24px;border-radius:50%;
        background:${color};display:flex;align-items:center;justify-content:center;
        flex-shrink:0;z-index:1;box-shadow:0 0 0 3px #fff;
      `;

      if (item.icon) {
        // Check if it's an emoji (single unicode char or common emoji pattern)
        if (/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(item.icon)) {
          dot.textContent = item.icon;
          dot.style.fontSize = "12px";
          dot.style.background = "transparent";
          dot.style.boxShadow = "none";
        } else {
          dot.innerHTML = item.icon;
          dot.style.color = "#fff";
          dot.style.fontSize = "11px";
        }
      } else {
        // Default status icon
        const statusIcon = getStatusIcon(item.status ?? "default");
        if (statusIcon) {
          dot.innerHTML = statusIcon;
          dot.style.color = "#fff";
          dot.style.fontSize = "11px";
        }
      }

      return dot;
    }

    function getStatusIcon(status: TimelineItemStatus): string {
      switch (status) {
        case "success":
          return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
        case "error":
          return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
        case "warning":
          return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v5M6 9v1" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
        case "info":
          return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="5.5" r="0.75" fill="#fff"/><path d="M6 7.5v3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>';
        default:
          return "";
      }
    }

    function createItemCard(item: TimelineItem, index: number, color: string): HTMLDivElement {
      const card = document.createElement("div");
      card.className = "timeline-card";
      card.style.cssText = `
        background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;
        box-shadow:0 1px 3px rgba(0,0,0,0.04);transition:transform 0.2s,box-shadow 0.2s;
        position:relative;
      `;

      // Left color accent
      const accent = document.createElement("div");
      accent.style.cssText = `position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 2px 2px 0;background:${color};`;
      card.appendChild(accent);

      // Title
      const title = document.createElement("div");
      title.className = "timeline-title";
      title.style.cssText = "font-weight:600;font-size:13px;color:#111827;margin-bottom:4px;";
      title.textContent = item.title;
      card.appendChild(title);

      // Timestamp
      if (item.timestamp && opts.showTimestamps) {
        const ts = document.createElement("div");
        ts.className = "timeline-timestamp";
        ts.style.cssText = "font-size:11px;color:#9ca3af;margin-bottom:4px;";
        ts.textContent = item.timestamp;
        card.appendChild(ts);
      }

      // Content
      if (item.content) {
        const content = document.createElement("div");
        content.className = "timeline-body";
        content.style.cssText = "font-size:12px;color:#4b5563;line-height:1.5;";
        content.textContent = item.content;
        card.appendChild(content);
      }

      // Status badge
      if (item.status && item.status !== "default") {
        const badge = document.createElement("span");
        badge.style.cssText = `
          display:inline-block;font-size:10px;font-weight:500;padding:1px 6px;border-radius:3px;
          background:${color}15;color:${color};text-transform:capitalize;margin-top:4px;
        `;
        badge.textContent = item.status;
        card.appendChild(badge);
      }

      // Hover effect
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-2px)";
        card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.style.boxShadow = "";
      });

      // Custom renderer
      if (opts.renderItem) {
        opts.renderItem(item, index, card);
      }

      return card;
    }

    // Initial render
    render();

    const instance: TimelineInstance = {
      element: container,

      getItems() { return [...items]; },

      addItem(newItem: TimelineItem) {
        if (opts.reverse) {
          items.unshift(newItem);
        } else {
          items.push(newItem);
        }
        render();
      },

      removeItem(id: string) {
        items = items.filter((item) => item.id !== id);
        render();
      },

      updateItem(id: string, updates: Partial<TimelineItem>) {
        const idx = items.findIndex((item) => item.id === id);
        if (idx >= 0) {
          items[idx] = { ...items[idx]!, ...updates };
          render();
        }
      },

      clear() {
        items = [];
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a timeline */
export function createTimeline(options: TimelineOptions): TimelineInstance {
  return new TimelineManager().create(options);
}
