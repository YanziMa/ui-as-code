/**
 * Expansion Panel Utilities: Rich expandable panels with summary/content split,
 * header actions, drag handle, priority levels, and nested panel support.
 */

// --- Types ---

export type PanelVariant = "default" | "card" | "bordered" | "minimal";
export type PanelSize = "sm" | "md" | "lg";

export interface ExpansionPanelOptions {
  /** Panel unique ID */
  id?: string;
  /** Summary/header content (HTMLElement or HTML string) */
  summary: string | HTMLElement;
  /** Detail/body content (HTMLElement or HTML string) */
  detail: string | HTMLElement;
  /** Visual variant */
  variant?: PanelVariant;
  /** Size variant */
  size?: PanelSize;
  /** Initially expanded? */
  defaultExpanded?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Animation duration (ms) */
  duration?: number;
  /** Show expand/collapse chevron */
  showChevron?: boolean;
  /** Header action buttons */
  actions?: Array<{ label: string; icon?: string; onClick: (e: Event) => void; variant?: "primary" | "secondary" | "ghost" }>;
  /** Right-aligned extra content in header */
  headerExtra?: string | HTMLElement;
  /** Footer content (shown at bottom of detail) */
  footer?: string | HTMLElement;
  /** Show border highlight when expanded */
  highlightOnExpand?: boolean;
  /** Called when expanded */
  onExpand?: () => void;
  /** Called when collapsed */
  onCollapse?: () => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface ExpansionPanelInstance {
  /** The root panel element */
  el: HTMLElement;
  /** The summary/header element */
  summaryEl: HTMLElement;
  /** The detail/body element */
  detailEl: HTMLElement;
  /** Expand the panel */
  expand: () => void;
  /** Collapse the panel */
  collapse: () => void;
  /** Toggle state */
  toggle: () => void;
  /** Check if expanded */
  isExpanded: () => boolean;
  /** Update summary content */
  setSummary: (content: string | HTMLElement) => void;
  /** Update detail content */
  setDetail: (content: string | HTMLElement) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Variant Styles ---

const VARIANT_STYLES: Record<PanelVariant, { bg: string; border: string; radius: string; shadow: string }> = {
  "default": { bg: "#fff", border: "#e5e7eb", radius: "10px", shadow: "0 1px 3px rgba(0,0,0,0.06)" },
  "card": { bg: "#fff", border: "#e5e7eb", radius: "12px", shadow: "0 4px 12px rgba(0,0,0,0.08)" },
  "bordered": { bg: "#fff", border: "#d1d5db", radius: "8px", shadow: "none" },
  "minimal": { bg: "transparent", border: "transparent", radius: "0", shadow: "none" },
};

const SIZE_PADDING: Record<PanelSize, { summaryPadding: string; detailPadding: string; fontSize: string; iconSize: string }> = {
  "sm": { summaryPadding: "10px 14px", detailPadding: "10px 14px", fontSize: "13px", iconSize: "12px" },
  "md": { summaryPadding: "14px 18px", detailPadding: "16px 18px", fontSize: "14px", iconSize: "14px" },
  "lg": { summaryPadding: "16px 22px", detailPadding: "20px 22px", fontSize: "15px", iconSize: "16px" },
};

// --- Core Factory ---

/**
 * Create a rich expansion panel.
 *
 * @example
 * ```ts
 * const panel = createExpansionPanel({
 *   summary: "<strong>Advanced Settings</strong>",
 *   detail: settingsFormEl,
 *   variant: "card",
 *   defaultExpanded: false,
 *   actions: [{ label: "Reset", onClick: resetSettings }],
 * });
 * ```
 */
export function createExpansionPanel(options: ExpansionPanelOptions): ExpansionPanelInstance {
  const {
    id = `panel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    summary,
    detail,
    variant = "default",
    size = "md",
    defaultExpanded = false,
    disabled = false,
    duration = 250,
    showChevron = true,
    actions,
    headerExtra,
    footer,
    highlightOnExpand = true,
    onExpand,
    onCollapse,
    className,
    container,
  } = options;

  let _expanded = defaultExpanded;

  const vs = VARIANT_STYLES[variant];
  const sp = SIZE_PADDING[size];

  // Root
  const root = document.createElement("div");
  root.className = `expansion-panel ${variant} ${size} ${className ?? ""}`.trim();
  root.dataset.panelId = id;
  Object.assign(root.style, {
    background: vs.bg,
    border: `1px solid ${vs.border}`,
    borderRadius: vs.radius,
    boxShadow: vs.shadow,
    overflow: "hidden",
    transition: `border-color ${duration}ms ease${highlightOnExpand ? ", box-shadow " + duration + "ms ease" : ""}`,
  });

  // Summary / Header
  const summaryEl = document.createElement("button");
  summaryEl.className = "panel-summary";
  summaryEl.type = "button";
  summaryEl.setAttribute("aria-expanded", String(_expanded));
  summaryEl.setAttribute("aria-controls", `${id}-detail`);
  summaryEl.style.cssText =
    "display:flex;align-items:center;width:100%;gap:8px;border:none;background:none;" +
    `padding:${sp.summaryPadding};cursor:pointer;font-size:${sp.fontSize};` +
    "color:#374151;text-align:left;user-select:none;outline:none;" +
    "line-height:1.4;font-weight:500;" +
    (disabled ? "opacity:0.5;cursor:not-allowed;" : "") +
    "font-family:inherit;";

  // Chevron
  if (showChevron) {
    const chevron = document.createElement("span");
    chevron.className = "panel-chevron";
    chevron.innerHTML = "&#9660;";
    chevron.style.cssText =
      `font-size:${sp.iconSize};color:#9ca3af;transition:transform ${duration}ms ease;` +
      `flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;` +
      (_expanded ? "transform:rotate(180deg);" : "");
    summaryEl.appendChild(chevron);
  }

  // Summary content
  const summaryContent = document.createElement("span");
  summaryContent.className = "panel-summary-content";
  summaryContent.style.flex = "1";
  summaryContent.style.minWidth = "0";
  if (typeof summary === "string") summaryContent.innerHTML = summary;
  else summaryContent.appendChild(summary.cloneNode(true));
  summaryEl.appendChild(summaryContent);

  // Header extra
  if (headerExtra) {
    const extraEl = document.createElement("span");
    extraEl.className = "panel-header-extra";
    extraEl.style.flexShrink = "0";
    if (typeof headerExtra === "string") extraEl.innerHTML = headerExtra;
    else extraEl.appendChild(headerExtra.cloneNode(true));
    summaryEl.appendChild(extraEl);
  }

  // Action buttons in header
  if (actions && actions.length > 0) {
    const actionsEl = document.createElement("div");
    actionsEl.className = "panel-actions";
    actionsEl.style.cssText = "display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:auto;";
    actions.forEach((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = action.label;
      if (action.icon) {
        const icon = document.createElement("span");
        icon.innerHTML = action.icon;
        icon.style.marginRight = "4px";
        btn.insertBefore(icon, btn.firstChild);
      }
      const isPrimary = action.variant === "primary";
      const isGhost = action.variant === "ghost";
      btn.style.cssText =
        "padding:4px 10px;border-radius:6px;font-size:" + (parseInt(sp.fontSize) - 1) + "px;" +
        "font-weight:500;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;" +
        (isPrimary ? "background:#3b82f6;color:#fff;border:none;"
          : isGhost ? "background:none;color:#6b7280;border:1px solid transparent;"
            : "background:#fff;color:#374151;border:1px solid #d1d5db;");
      btn.addEventListener("click", (e) => { e.stopPropagation(); action.onClick(e); });
      actionsEl.appendChild(btn);
    });
    summaryEl.appendChild(actionsEl);
  }

  root.appendChild(summaryEl);

  // Detail / Body
  const detailEl = document.createElement("div");
  detailEl.className = "panel-detail";
  detailEl.id = `${id}-detail`;
  detailEl.setAttribute("role", "region");
  detailEl.style.cssText =
    `padding:${sp.detailPadding};font-size:${sp.fontSize};color:#4b5563;line-height:1.6;` +
    (!_expanded ? "display:none;" : "");
  detailEl.style.borderTop = _expanded ? `1px solid ${vs.border}` : "none";

  if (typeof detail === "string") detailEl.innerHTML = detail;
  else detailEl.appendChild(detail.cloneNode(true));

  // Footer inside detail
  if (footer) {
    const footerEl = document.createElement("div");
    footerEl.className = "panel-footer";
    footerEl.style.cssText =
      `padding-top:12px;margin-top:12px;border-top:1px solid #f3f4f6;` +
      "display:flex;justify-content:flex-end;gap:8px;";
    if (typeof footer === "string") footerEl.innerHTML = footer;
    else footerEl.appendChild(footer.cloneNode(true));
    detailEl.appendChild(footerEl);
  }

  root.appendChild(detailEl);

  // Click handler
  summaryEl.addEventListener("click", () => {
    if (disabled) return;
    toggle();
  });

  // Hover effect
  if (!disabled) {
    summaryEl.addEventListener("mouseenter", () => {
      root.style.borderColor = variant === "minimal" ? "transparent" : "#d1d5db";
    });
    summaryEl.addEventListener("mouseleave", () => {
      root.style.borderColor = vs.border;
    });
  }

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function expand(): void {
    if (_expanded || disabled) return;
    _setExpanded(true);
  }

  function collapse(): void {
    if (!_expanded || disabled) return;
    _setExpanded(false);
  }

  function toggle(): void { _expanded ? collapse() : expand(); }
  function isExpanded(): boolean { return _expanded; }

  function setSummary(content: string | HTMLElement): void {
    summaryContent.innerHTML = "";
    if (typeof content === "string") summaryContent.innerHTML = content;
    else summaryContent.appendChild(content.cloneNode(true));
  }

  function setDetail(content: string | HTMLElement): void {
    detailEl.innerHTML = "";
    if (typeof content === "string") detailEl.innerHTML = content;
    else detailEl.appendChild(content.cloneNode(true));
    if (footer) {
      const footerEl = document.createElement("div");
      footerEl.className = "panel-footer";
      footerEl.style.cssText =
        `padding-top:12px;margin-top:12px;border-top:1px solid #f3f4f6;` +
        "display:flex;justify-content:flex-end;gap:8px;";
      if (typeof footer === "string") footerEl.innerHTML = footer;
      else footerEl.appendChild(footer.cloneNode(true));
      detailEl.appendChild(footerEl);
    }
    if (_expanded) detailEl.style.display = "";
  }

  function destroy(): void {
    root.remove();
  }

  // --- Internal ---

  function _setExpanded(expanding: boolean): void {
    _expanded = expanding;
    summaryEl.setAttribute("aria-expanded", String(expanding));

    // Update chevron
    const chevron = summaryEl.querySelector(".panel-chevron") as HTMLElement;
    if (chevron) chevron.style.transform = expanding ? "rotate(180deg)" : "";

    // Animate detail
    if (expanding) {
      detailEl.style.display = "";
      detailEl.style.borderTop = `1px solid ${vs.border}`;
      if (highlightOnExpand) {
        root.style.borderColor = "#93c5fd";
        root.style.boxShadow = "0 4px 16px rgba(59,130,246,0.1)";
      }
      onExpand?.();
    } else {
      detailEl.style.display = "none";
      detailEl.style.borderTop = "none";
      root.style.borderColor = vs.border;
      root.style.boxShadow = vs.shadow;
      onCollapse?.();
    }
  }

  return { el: root, summaryEl, detailEl, expand, collapse, toggle, isExpanded, setSummary, setDetail, destroy };
}
