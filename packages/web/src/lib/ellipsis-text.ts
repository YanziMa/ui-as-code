/**
 * Ellipsis Text: Smart text truncation with "..." ellipsis, expand/collapse toggle,
 * line-clamp support, tooltip on hover, configurable max lines, custom
 * ellipsis character, and responsive behavior.
 */

// --- Types ---

export type EllipsisPosition = "end" | "middle" | "start";

export interface EllipsisTextOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Text content */
  text: string;
  /** Max lines before truncating (default: 1) */
  maxLines?: number;
  /** Show full text tooltip on hover? */
  showTooltip?: boolean;
  /** Expandable? (shows "more"/"less" link) */
  expandable?: boolean;
  /** Expand label (default: "more") */
  expandLabel?: string;
  /** Collapse label (default: "less") */
  collapseLabel?: string;
  /** Position of ellipsis */
  position?: EllipsisPosition;
  /** Custom ellipsis string (default: "...") */
  ellipsisString?: string;
  /** Tooltip position */
  tooltipPosition?: "top" | "bottom";
  /** Callback when expanded state changes */
  onToggle?: (expanded: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface EllipsisTextInstance {
  element: HTMLElement;
  getText: () => string;
  setText: (text: string) => void;
  isExpanded: () => boolean;
  setExpanded: (expanded: boolean) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createEllipsisText(options: EllipsisTextOptions): EllipsisTextInstance {
  const opts = {
    maxLines: options.maxLines ?? 1,
    showTooltip: options.showTooltip ?? true,
    expandable: options.expandable ?? false,
    expandLabel: options.expandLabel ?? "more",
    collapseLabel: options.collapseLabel ?? "less",
    position: options.position ?? "end",
    ellipsisString: options.ellipsisString ?? "\u2026", // …
    tooltipPosition: options.tooltipPosition ?? "top",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("EllipsisText: container not found");

  container.className = `ellipsis-text ${opts.className}`;
  container.style.cssText = `
    display:inline;position:relative;font-family:-apple-system,sans-serif;
    font-size:14px;line-height:1.5;color:#374151;word-break:break-word;
    max-width:100%;
  `;

  let isExpanded = false;
  let destroyed = false;

  // Content wrapper
  const contentEl = document.createElement("span");
  contentEl.className = "et-content";
  contentEl.style.cssText = "display:inline;";
  container.appendChild(contentEl);

  // Toggle link
  let toggleLink: HTMLAnchorElement | null = null;
  if (opts.expandable) {
    toggleLink = document.createElement("a");
    toggleLink.href = "#";
    toggleLink.className = "et-toggle";
    toggleLink.textContent = opts.expandLabel;
    toggleLink.style.cssText = `
      color:#6366f1;text-decoration:none;font-size:13px;font-weight:500;
      cursor:pointer;margin-left:4px;white-space:nowrap;display:inline;
      user-select:none;
    `;
    toggleLink.addEventListener("click", (e) => {
      e.preventDefault();
      instance.setExpanded(!isExpanded);
    });
    container.appendChild(toggleLink);
  }

  // Tooltip element
  let tooltipEl: HTMLDivElement | null = null;
  if (opts.showTooltip) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "et-tooltip";
    tooltipEl.style.cssText = `
      position:absolute;display:none;z-index:100;padding:6px 10px;background:#1e1b4b;
      color:#fff;border-radius:6px;font-size:12px;font-weight:400;
      white-space:normal;max-width:300px;pointer-events:none;
      box-shadow:0 4px 12px rgba(0,0,0,0.2);line-height:1.4;
    `;
    container.style.position = "relative";
    container.appendChild(tooltipEl);
  }

  function render(): void {
    const needsTruncation = !isExpanded && opts.maxLines > 0 && opts.text.length > 0;

    if (!needsTruncation || opts.maxLines < 1) {
      contentEl.textContent = opts.text;
      contentEl.style.display = "";
      contentEl.style.overflow = "";
      contentEl.style.textOverflow = "";
      contentEl.style.whiteSpace = "";
      return;
    }

    // Use CSS line-clamp approach
    contentEl.textContent = opts.text;
    contentEl.style.display = "-webkit-box";
    contentEl.style.overflow = "hidden";
    contentEl.style.textOverflow = opts.position === "start"
      ? "ellipsis"
      : opts.position === "middle"
        ? ""
        : "ellipsis";
    contentEl.style.webkitBoxOrient = "vertical";
    contentEl.style.webkitLineClamp = String(opts.maxLines);
    contentEl.style.whiteSpace = opts.position === "middle" ? "" : "normal";

    // For non-webkit browsers, also set standard properties
    (contentEl as any).style.lineClamp = String(opts.maxLines);
  }

  function positionTooltip(): void {
    if (!tooltipEl) return;
    const rect = container.getBoundingClientRect();
    tooltipEl.textContent = opts.text;

    if (opts.tooltipPosition === "top") {
      tooltipEl.style.bottom = `${rect.height + 6}px`;
      tooltipEl.style.left = "50%";
      tooltipEl.style.transform = "translateX(-50%)";
    } else {
      tooltipEl.style.top = `${rect.height + 6}px`;
      tooltipEl.style.left = "50%";
      tooltipEl.style.transform = "translateX(-50%)";
    }
  }

  // Hover for tooltip
  if (opts.showTooltip && tooltipEl) {
    container.addEventListener("mouseenter", () => {
      if (!isExpanded && opts.text !== contentEl.textContent) {
        tooltipEl.style.display = "block";
        positionTooltip();
      }
    });
    container.addEventListener("mouseleave", () => {
      tooltipEl.style.display = "none";
    });
  }

  // Initial render
  render();

  const instance: EllipsisTextInstance = {
    element: container,

    getText() { return opts.text; },

    setText(text: string) {
      opts.text = text;
      render();
    },

    isExpanded() { return isExpanded; },

    setExpanded(expanded: boolean) {
      isExpanded = expanded;
      render();
      if (toggleLink) {
        toggleLink.textContent = expanded ? opts.collapseLabel : opts.expandLabel;
      }
      opts.onToggle?.(expanded);
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };

  return instance;
}
