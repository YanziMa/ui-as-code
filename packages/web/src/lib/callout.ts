/**
 * Callout: GitHub-style callout blocks with emoji/icon, title, content area,
 * variants (note/tip/important/warning/caution), collapsible mode,
 * copy button for code content, and markdown-like rendering.
 */

// --- Types ---

export type CalloutVariant = "note" | "tip" | "important" | "warning" | "caution" | "info" | "success" | "error";

export interface CalloutOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Visual variant */
  variant?: CalloutVariant;
  /** Title text */
  title?: string;
  /** Body content (string, HTML, or element) */
  content?: string | HTMLElement;
  /** Emoji icon (overrides default) */
  icon?: string;
  /** Collapsible? */
  collapsible?: boolean;
  /** Initially collapsed? */
  collapsed?: boolean;
  /** Show copy button for code content */
  showCopy?: boolean;
  /** Custom border color */
  borderColor?: string;
  /** Custom background color */
  backgroundColor?: string;
  /** Custom CSS class */
  className?: string;
  /** Callback on collapse toggle */
  onToggle?: (collapsed: boolean) => void;
}

export interface CalloutInstance {
  element: HTMLElement;
  setTitle: (title: string) => void;
  setContent: (content: string | HTMLElement) => void;
  setVariant: (variant: CalloutVariant) => void;
  setCollapsed: (collapsed: boolean) => void;
  isCollapsed: () => boolean;
  destroy: () => void;
}

// --- Variant Config ---

const VARIANT_CONFIG: Record<CalloutVariant, {
  emoji: string;
  bg: string;
  borderLeft: string;
  textColor: string;
  titleColor: string;
  iconBg: string;
}> = {
  note:      { emoji: "\u2139\uFE0F", bg: "#f0f7ff", borderLeft: "#3b82f6", textColor: "#1e40af", titleColor: "#1d4ed8", iconBg: "#dbeafe" },
  tip:       { emoji: "\uD83D\uDCA1", bg: "#f0fdf4", borderLeft: "#22c55e", textColor: "#166534", titleColor: "#15803d", iconBg: "#dcfce7" },
  important: { emoji: "\u2757\uFE0F", bg: "#fef3c7", borderLeft: "#f59e0b", textColor: "#92400e", titleColor: "#d97706", iconBg: "#fef3c7" },
  warning:   { emoji: "\u26A0\uFE0F", bg: "#fffbeb", borderLeft: "#f59e0b", textColor: "#92400e", titleColor: "#d97706", iconBg: "#fef3c7" },
  caution:   { emoji: "\u{1F6AB}", bg: "#fef2f2", borderLeft: "#ef4444", textColor: "#991b1b", titleColor: "#dc2626", iconBg: "#fee2e2" },
  info:      { emoji: "\u2139\uFE0F", bg: "#eff6ff", borderLeft: "#3b82f6", textColor: "#1e40af", titleColor: "#2563eb", iconBg: "#dbeafe" },
  success:   { emoji: "\u2705",   bg: "#f0fdf4", borderLeft: "#22c55e", textColor: "#166534", titleColor: "#16a34a", iconBg: "#dcfce7" },
  error:     { emoji: "\u274C",    bg: "#fef2f2", borderLeft: "#ef4444", textColor: "#991b1b", titleColor: "#dc2626", iconBg: "#fee2e2" },
};

const DEFAULT_TITLES: Record<CalloutVariant, string> = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
  info: "Info",
  success: "Success",
  error: "Error",
};

// --- Main Factory ---

export function createCallout(options: CalloutOptions): CalloutInstance {
  const opts = {
    variant: options.variant ?? "note",
    collapsible: options.collapsible ?? false,
    collapsed: options.collapsed ?? false,
    showCopy: options.showCopy ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Callout: container not found");

  const cfg = VARIANT_CONFIG[opts.variant];
  let isCollapsed = opts.collapsed;

  // Root element
  const el = document.createElement("div");
  el.className = `callout callout-${opts.variant} ${opts.className}`;
  el.style.cssText = `
    background:${opts.backgroundColor ?? cfg.bg};
    border-left:4px solid ${opts.borderColor ?? cfg.borderLeft};
    border-radius:6px;padding:14px 16px;margin:8px 0;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    font-size:14px;color:${cfg.textColor};line-height:1.6;
    position:relative;overflow:hidden;
  `;

  // Header row
  const header = document.createElement("div");
  header.className = "callout-header";
  header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:8px;";

  // Icon
  const iconEl = document.createElement("span");
  iconEl.className = "callout-icon";
  iconEl.textContent = opts.icon ?? cfg.emoji;
  iconEl.style.cssText = `font-size:18px;line-height:1;flex-shrink:0;`;

  // Title
  const titleEl = document.createElement("strong");
  titleEl.className = "callout-title";
  titleEl.textContent = options.title ?? DEFAULT_TITLES[opts.variant];
  titleEl.style.cssText = `color:${cfg.titleColor};font-size:14px;font-weight:600;`;

  header.appendChild(iconEl);
  header.appendChild(titleEl);

  // Collapse toggle
  let toggleBtn: HTMLButtonElement | null = null;
  if (opts.collapsible) {
    toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "callout-toggle";
    toggleBtn.setAttribute("aria-expanded", String(!isCollapsed));
    toggleBtn.innerHTML = isCollapsed ? "&#9654;" : "&#9660;";
    toggleBtn.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:10px;
      color:${cfg.textColor};padding:2px 4px;margin-left:auto;
      transition:transform 0.15s;
    `;
    toggleBtn.addEventListener("click", () => {
      isCollapsed = !isCollapsed;
      renderCollapse();
      opts.onToggle?.(isCollapsed);
    });
    header.appendChild(toggleBtn);
  }

  el.appendChild(header);

  // Content body
  const body = document.createElement("div");
  body.className = "callout-body";
  body.style.cssText = "overflow:hidden;transition:max-height 0.25s ease, opacity 0.2s ease;";

  if (typeof options.content === "string") {
    body.textContent = options.content;
  } else if (options.content instanceof HTMLElement) {
    body.appendChild(options.content);
  }

  el.appendChild(body);

  // Copy button
  let copyBtn: HTMLButtonElement | null = null;
  if (opts.showCopy) {
    copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "callout-copy";
    copyBtn.textContent = "Copy";
    copyBtn.style.cssText = `
      position:absolute;top:8px;right:8px;padding:3px 10px;
      border:1px solid ${cfg.borderLeft}40;border-radius:4px;
      background:${cfg.bg};color:${cfg.textColor};
      font-size:11px;cursor:pointer;opacity:0;
      transition:opacity 0.15s;
    `;
    copyBtn.addEventListener("click", async () => {
      const text = body.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn!.textContent = "Copy"; }, 1500);
      } catch {
        /* fallback: do nothing */
      }
    });
    el.addEventListener("mouseenter", () => { copyBtn!.style.opacity = "1"; });
    el.addEventListener("mouseleave", () => { copyBtn!.style.opacity = "0"; });
    el.appendChild(copyBtn);
  }

  // Collapse rendering
  function renderCollapse(): void {
    if (!body || !toggleBtn) return;

    if (isCollapsed) {
      body.style.maxHeight = "0";
      body.style.opacity = "0";
      body.style.paddingTop = "0";
      body.style.paddingBottom = "0";
      body.style.marginBottom = "0";
      toggleBtn.innerHTML = "&#9654;";
      toggleBtn.setAttribute("aria-expanded", "false");
    } else {
      body.style.maxHeight = "1000px";
      body.style.opacity = "1";
      body.style.paddingTop = "";
      body.style.paddingBottom = "";
      body.style.marginBottom = "";
      toggleBtn.innerHTML = "&#9660;";
      toggleBtn.setAttribute("aria-expanded", "true");
    }
  }

  // Apply initial collapse state
  if (isCollapsed) {
    body.style.maxHeight = "0";
    body.style.opacity = "0";
    body.style.overflow = "hidden";
  }

  const instance: CalloutInstance = {
    element: el,

    setTitle(title: string) {
      titleEl.textContent = title;
    },

    setContent(content: string | HTMLElement) {
      body.innerHTML = "";
      if (typeof content === "string") {
        body.textContent = content;
      } else {
        body.appendChild(content);
      }
    },

    setVariant(variant: CalloutVariant) {
      opts.variant = variant;
      const nc = VARIANT_CONFIG[variant];
      el.style.background = nc.bg;
      el.style.borderLeftColor = nc.borderLeft;
      el.style.color = nc.textColor;
      iconEl.textContent = opts.icon ?? nc.emoji;
      titleEl.style.color = nc.titleColor;
    },

    setCollapsed(collapsed: boolean) {
      isCollapsed = collapsed;
      renderCollapse();
      opts.onToggle?.(isCollapsed);
    },

    isCollapsed() { return isCollapsed; },

    destroy() { el.remove(); },
  };

  return instance;
}
