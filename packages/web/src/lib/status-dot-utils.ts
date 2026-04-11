/**
 * Status Dot Utilities: Status indicators (dots/pulses), online/offline states,
 * connection quality indicators, progress phases, and grouped status lists
 * with customizable colors, animations, labels, and tooltips.
 */

// --- Types ---

export type StatusDotVariant =
  | "online"
  | "offline"
  | "away"
  | "busy"
  | "dnd"
  | "invisible"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "pending"
  | "processing"
  | "neutral"
  | "custom";

export type StatusDotSize = "xs" | "sm" | "md" | "lg";
export type StatusDotShape = "circle" | "ring" | "dot" | "pulse" | "ripple";
export type StatusDotPosition = "inline" | "avatar-corner" | "standalone";

export interface StatusDotOptions {
  /** Status variant */
  variant: StatusDotVariant;
  /** Size */
  size?: StatusDotSize;
  /** Shape/style */
  shape?: StatusDotShape;
  /** Custom color (overrides variant) */
  color?: string;
  /** Label text beside the dot */
  label?: string;
  /** Label position: left/right */
  labelSide?: "left" | "right";
  /** Tooltip on hover */
  tooltip?: string;
  /** Pulse animation (for active states) */
  pulse?: boolean;
  /** Ring around dot */
  ring?: boolean;
  /** Position relative to avatar */
  position?: StatusDotPosition;
  /** Offset from corner (for avatar-corner) */
  offset?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface StatusDotInstance {
  /** The root element */
  el: HTMLElement;
  /** Change status variant */
  setVariant: (variant: StatusDotVariant) => void;
  /** Set custom color */
  setColor: (color: string) => void;
  /** Set label text */
  setLabel: (label: string) => void;
  /** Set tooltip */
  setTooltip: (tooltip: string) => void;
  /** Start pulsing */
  startPulse: () => void;
  /** Stop pulsing */
  stopPulse: () => void;
  /** Destroy */
  destroy: () => void;
}

export interface StatusListItem {
  /** Unique key */
  key: string;
  /** Status variant */
  status: StatusDotVariant;
  /** Primary label */
  label: string;
  /** Secondary description */
  description?: string;
  /** Timestamp */
  timestamp?: string;
  /** Icon (HTML string) */
  icon?: string;
  /** Click handler */
  onClick?: () => void;
}

export interface StatusListOptions {
  /** List items */
  items: StatusListItem[];
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Group by status */
  groupByStatus?: boolean;
  /** Max visible items (rest collapsed) */
  maxVisible?: number;
  /** Collapsed label (e.g., "+3 more") */
  collapsedLabel?: string;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when an item is clicked */
  onItemClick?: (item: StatusListItem) => void;
  /** Custom renderer for each item */
  renderItem?: (item: StatusListItem, el: HTMLElement) => void;
}

export interface StatusListInstance {
  /** Root element */
  el: HTMLElement;
  /** Add item */
  addItem: (item: StatusListItem) => void;
  /** Remove item by key */
  removeItem: (key: string) => void;
  /** Update item by key */
  updateItem: (key: string, updates: Partial<StatusListItem>) => void;
  /** Get all items */
  getItems: () => StatusListItem[];
  /** Destroy */
  destroy: () => void;
}

// --- Color Map ---

const STATUS_COLORS: Record<StatusDotVariant, string> = {
  online: "#22c55e",
  offline: "#9ca3af",
  away: "#f59e0b",
  busy: "#ef4444",
  dnd: "#ef4444",
  invisible: "#d1d5db",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  pending: "#f59e0b",
  processing: "#3b82f6",
  neutral: "#9ca3af",
  custom: "#6b7280",
};

const STATUS_LABELS: Record<StatusDotVariant, string> = {
  online: "Online",
  offline: "Offline",
  away: "Away",
  busy: "Busy",
  dnd: "Do Not Disturb",
  invisible: "Invisible",
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
  pending: "Pending",
  processing: "Processing",
  neutral: "Neutral",
  custom: "Custom",
};

// --- Size Map ---

const DOT_SIZES: Record<StatusDotSize, { size: string; ringSize?: string }> = {
  xs: { size: "6px", ringSize: "10px" },
  sm: { size: "8px", ringSize: "12px" },
  md: { size: "10px", ringSize: "16px" },
  lg: { size: "14px", ringSize: "20px" },
};

// --- CSS Keyframes ---

const STATUS_KEYFRAMES = `
@keyframes statusPulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
}
@keyframes statusRipple {
  0% { transform: scale(1); opacity: 0.5; box-shadow: 0 0 0 0 currentColor; }
  70% { transform: scale(2); opacity: 0; box-shadow: 0 0 0 6px transparent; }
  100% { transform: scale(2); opacity: 0; box-shadow: 0 0 0 0 transparent; }
}
@keyframes statusPing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

let statusStylesInjected = false;

function _injectStatusStyles(): void {
  if (statusStylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "status-dot-styles";
  style.textContent = STATUS_KEYFRAMES;
  document.head.appendChild(style);
  statusStylesInjected = true;
}

// --- Core Factory: Status Dot ---

/**
 * Create a status indicator dot.
 *
 * @example
 * ```ts
 * const dot = createStatusDot({
 *   variant: "online",
 *   size: "md",
 *   shape: "pulse",
 *   label: "Active now",
 *   tooltip: "User has been active within the last 5 minutes",
 * });
 * ```
 */
export function createStatusDot(options: StatusDotOptions): StatusDotInstance {
  _injectStatusStyles();

  const {
    variant,
    size = "sm",
    shape = "circle",
    color,
    label,
    labelSide = "right",
    tooltip,
    pulse = false,
    ring = false,
    position = "inline",
    offset = 0,
    className,
    container,
  } = options;

  const ds = DOT_SIZES[size];
  const baseColor = color ?? STATUS_COLORS[variant];

  // Root wrapper
  const root = document.createElement("span");
  root.className = `status-dot-wrapper ${size} ${shape} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:inline-flex;align-items:center;gap:6px;` +
    (position === "avatar-corner" ? "position:relative;" : "") +
    (position === "standalone" ? "display:inline-flex;flex-direction:column;align-items:center;gap:4px;" : "");

  // Dot element
  const dot = document.createElement("span");
  dot.className = "status-dot";
  dot.setAttribute("role", "status");
  dot.setAttribute("aria-label", STATUS_LABELS[variant]);

  // Base dot styles
  let dotStyle =
    `display:block;width:${ds.size};height:${ds.size};` +
    `border-radius:50%;background:${baseColor};` +
    "flex-shrink:0;position:relative;";

  // Shape variants
  switch (shape) {
    case "ring": {
      dotStyle +=
        `border:2px solid ${baseColor};background:transparent;` +
        `box-shadow:inset 0 0 0 3px #fff, 0 0 0 1px ${baseColor};`;
      break;
    }
    case "pulse": {
      dotStyle += `animation:statusPulse 2s ease-in-out infinite;`;
      break;
    }
    case "ripple": {
      dotStyle += `animation:statusRipple 2s ease-out infinite;`;
      dot.style.color = baseColor;
      break;
    }
    case "dot": {
      // Plain dot, no special styling
      break;
    }
    default: // circle
      break;
  }

  // Ring option
  if (ring && shape !== "ring") {
    dotStyle += `box-shadow:0 0 0 2px #fff, 0 0 0 4px ${baseColor};`;
  }

  dot.style.cssText = dotStyle;
  root.appendChild(dot);

  // Avatar corner positioning
  if (position === "avatar-corner") {
    root.style.position = "absolute";
    root.style.bottom = `${-1 + offset}px`;
    root.style.right = `${-1 + offset}px`;
    root.style.zIndex = "5";
  }

  // Label
  let labelEl: HTMLElement | null = null;
  if (label) {
    labelEl = document.createElement("span");
    labelEl.className = "status-label";
    labelEl.textContent = label;
    labelEl.style.cssText =
      "font-size:13px;color:#374151;line-height:1;white-space:nowrap;";
    if (labelSide === "left") {
      root.insertBefore(labelEl, dot);
    } else {
      root.appendChild(labelEl);
    }
  }

  // Tooltip
  if (tooltip) {
    root.title = tooltip;
    root.style.cursor = "help";
  }

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function setVariant(v: StatusDotVariant): void {
    const newColor = STATUS_COLORS[v];
    dot.style.background = shape === "ring" ? "transparent" : newColor;
    if (shape === "ring") {
      dot.style.borderColor = newColor;
      dot.style.boxShadow = `inset 0 0 0 3px #fff, 0 0 0 1px ${newColor}`;
    } else if (ring) {
      dot.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${newColor}`;
    }
    dot.setAttribute("aria-label", STATUS_LABELS[v]);
  }

  function setColor(c: string): void {
    dot.style.background = shape === "ring" ? "transparent" : c;
    if (shape === "ring") {
      dot.style.borderColor = c;
      dot.style.boxShadow = `inset 0 0 0 3px #fff, 0 0 0 1px ${c}`;
    } else if (ring) {
      dot.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${c}`;
    }
  }

  function setLabel(l: string): void {
    if (!labelEl && l) {
      labelEl = document.createElement("span");
      labelEl.className = "status-label";
      labelEl.style.cssText =
        "font-size:13px;color:#374151;line-height:1;white-space:nowrap;";
      if (labelSide === "left") root.insertBefore(labelEl, dot);
      else root.appendChild(labelEl);
    }
    if (labelEl) {
      if (l) {
        labelEl.textContent = l;
        labelEl.style.display = "";
      } else {
        labelEl.style.display = "none";
      }
    }
  }

  function setTooltip(t: string): void {
    root.title = t;
  }

  function startPulse(): void {
    if (shape === "pulse" || shape === "ripple") return; // Already pulsing
    dot.style.animation = "statusPulse 2s ease-in-out infinite";
  }

  function stopPulse(): void {
    if (shape !== "pulse" && shape !== "ripple") {
      dot.style.animation = "";
    }
  }

  function destroy(): void {
    root.remove();
  }

  return { el: root, setVariant, setColor, setLabel, setTooltip, startPulse, stopPulse, destroy };
}

// --- Core Factory: Status List ---

/**
 * Create a status list (e.g., service health dashboard, teammate statuses).
 *
 * @example
 * ```ts
 * const list = createStatusList({
 *   items: [
 *     { key: "api", status: "online", label: "API Server", description: "Response time: 45ms" },
 *     { key: "db", status: "warning", label: "Database", description: "CPU at 85%" },
 *     { key: "cache", status: "error", label: "Redis Cache", description: "Connection refused" },
 *   ],
 *   compact: true,
 * });
 * ```
 */
export function createStatusList(options: StatusListOptions): StatusListInstance {
  _injectStatusStyles();

  const {
    items,
    showTimestamps = false,
    groupByStatus = false,
    maxVisible = Infinity,
    collapsedLabel = "Show more",
    compact = false,
    className,
    container,
    onItemClick,
    renderItem,
  } = options;

  const _items: StatusListItem[] = [...items];

  const root = document.createElement("div");
  root.className = `status-list ${compact ? "compact" : ""} ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-direction:column;gap:2px;width:100%;";

  const itemsContainer = document.createElement("div");
  itemsContainer.className = "status-list-items";
  itemsContainer.style.cssText = "display:flex;flex-direction:column;gap:2px;";
  root.appendChild(itemsContainer);

  let collapseEl: HTMLElement | null = null;

  function _renderItem(item: StatusListItem): HTMLElement {
    const row = document.createElement("div");
    row.className = "status-list-item";
    row.dataset.key = item.key;
    row.style.cssText =
      `display:flex;align-items:center;gap:10px;padding:${compact ? "5px 8px" : "8px 12px"};` +
      "border-radius:8px;cursor:pointer;transition:background 0.15s;";

    row.addEventListener("mouseenter", () => { row.style.background = "#f9fafb"; });
    row.addEventListener("mouseleave", () => { row.style.background = ""; });
    row.addEventListener("click", () => {
      onItemClick?.(item);
      item.onClick?.();
    });

    // Status dot
    const dot = createStatusDot({
      variant: item.status,
      size: compact ? "xs" : "sm",
      shape: "circle",
      ring: !compact,
    });
    row.appendChild(dot.el);

    // Icon
    if (item.icon) {
      const ic = document.createElement("span");
      ic.innerHTML = item.icon;
      ic.style.cssText = "display:inline-flex;align-items:center;opacity:0.6;";
      row.appendChild(ic);
    }

    // Text area
    const textArea = document.createElement("div");
    textArea.className = "item-text-area";
    textArea.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;";

    const labelEl = document.createElement("span");
    labelEl.className = "item-label";
    labelEl.textContent = item.label;
    labelEl.style.cssText =
      `font-size:${compact ? "12px" : "13px"};font-weight:500;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    textArea.appendChild(labelEl);

    if (item.description && !compact) {
      const descEl = document.createElement("span");
      descEl.className = "item-description";
      descEl.textContent = item.description;
      descEl.style.cssText = "font-size:11px;color:#9ca3af;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      textArea.appendChild(descEl);
    }

    row.appendChild(textArea);

    // Timestamp
    if (showTimestamps && item.timestamp) {
      const tsEl = document.createElement("span");
      tsEl.className = "item-timestamp";
      tsEl.textContent = item.timestamp;
      tsEl.style.cssText = "font-size:11px;color:#9ca3af;white-space:nowrap;flex-shrink:0;";
      row.appendChild(tsEl);
    }

    // Custom renderer
    if (renderItem) {
      renderItem(item, row);
    }

    return row;
  }

  function _render(): void {
    itemsContainer.innerHTML = "";
    collapseEl?.remove();
    collapseEl = null;

    let visibleItems = _items;

    if (groupByStatus) {
      // Group items by status
      const groups = new Map<StatusDotVariant, StatusListItem[]>();
      for (const item of _items) {
        const arr = groups.get(item.status) ?? [];
        arr.push(item);
        groups.set(item.status, arr);
      }

      for (const [status, groupItems] of groups) {
        const groupHeader = document.createElement("div");
        groupHeader.className = "status-group-header";
        groupHeader.style.cssText =
          "display:flex;align-items:center;gap:6px;padding:6px 4px;font-size:11px;" +
          "font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;";

        const gDot = createStatusDot({ variant: status, size: "xs" });
        groupHeader.appendChild(gDot.el);

        const gLabel = document.createElement("span");
        gLabel.textContent = STATUS_LABELS[status];
        groupHeader.appendChild(gLabel);

        const count = document.createElement("span");
        count.textContent = `(${groupItems.length})`;
        count.style.cssText = "color:#9ca3af;font-weight:400;";
        groupHeader.appendChild(count);

        itemsContainer.appendChild(groupHeader);

        for (const item of groupItems) {
          itemsContainer.appendChild(_renderItem(item));
        }
      }
    } else {
      const toRender = _items.slice(0, maxVisible);
      for (const item of toRender) {
        itemsContainer.appendChild(_renderItem(item));
      }
    }

    // Collapse toggle
    if (_items.length > maxVisible) {
      collapseEl = document.createElement("button");
      collapseEl.type = "button";
      collapseEl.className = "status-list-collapse";
      collapseEl.textContent = `${collapsedLabel} (${_items.length - maxVisible})`;
      collapseEl.style.cssText =
        "width:100%;padding:6px;border:none;background:none;color:#3b82f6;" +
        "font-size:12px;font-weight:500;cursor:pointer;text-align:left;" +
        "border-radius:6px;margin-top:2px;";
      collapseEl.addEventListener("click", () => {
        // Expand: re-render without limit
        const oldMax = maxVisible;
        // For simplicity, just show all
        _renderExpanded();
      });
      root.appendChild(collapseEl);
    }
  }

  function _renderExpanded(): void {
    itemsContainer.innerHTML = "";
    collapseEl?.remove();
    collapseEl = null;

    for (const item of _items) {
      itemsContainer.appendChild(_renderItem(item));
    }
  }

  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods -----

  function addItem(item: StatusListItem): void {
    _items.push(item);
    _render();
  }

  function removeItem(key: string): void {
    const idx = _items.findIndex((i) => i.key === key);
    if (idx >= 0) {
      _items.splice(idx, 1);
      _render();
    }
  }

  function updateItem(key: string, updates: Partial<StatusListItem>): void {
    const item = _items.find((i) => i.key === key);
    if (item) {
      Object.assign(item, updates);
      _render();
    }
  }

  function getItems(): StatusListItem[] { return [..._items]; }

  function destroy(): void {
    root.remove();
  }

  return { el: root, addItem, removeItem, updateItem, getItems, destroy };
}
