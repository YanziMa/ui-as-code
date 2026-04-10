/**
 * Context Panel: Slide-out side panel with sections, breadcrumbs,
 * action toolbar, responsive sizing, and overlay backdrop.
 */

// --- Types ---

export type PanelSide = "right" | "left";
export type PanelSize = "sm" | "md" | "lg" | "xl" | number;

export interface PanelSection {
  /** Unique ID */
  id: string;
  /** Section title */
  title: string;
  /** Icon/emoji */
  icon?: string;
  /** Content (HTML or element) */
  content: string | HTMLElement;
  /** Collapsible? */
  collapsible?: boolean;
  /** Default collapsed? */
  defaultCollapsed?: boolean;
  /** Badge/count */
  badge?: string | number;
}

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface ContextPanelOptions {
  /** Container to render into (default: document.body) */
  container?: HTMLElement;
  /** Which side slides from */
  side?: PanelSide;
  /** Size variant or pixel width */
  size?: PanelSize;
  /** Title for the panel header */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Show close button? */
  closable?: boolean;
  /** Show header? */
  showHeader?: boolean;
  /** Show breadcrumbs? */
  breadcrumbs?: BreadcrumbItem[];
  /** Sections content */
  sections?: PanelSection[];
  /** Header actions (buttons rendered in header bar) */
  actions?: Array<{ label: string; icon?: string; onClick: () => void; primary?: boolean }>;
  /** Footer content */
  footer?: string | HTMLElement;
  /** Backdrop color */
  backdropColor?: string;
  /** Z-index */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Lock body scroll when open? */
  lockScroll?: boolean;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ContextPanelInstance {
  element: HTMLDivElement;
  isOpen: () => boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setTitle: (title: string) => void;
  setSections: (sections: PanelSection[]) => void;
  setFooter: (content: string | HTMLElement) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_MAP: Record<string, { value: string }> = {
  sm: "320px", md: "400px", lg: "560px", xl: "720px",
};

// --- Main Factory ---

export function createContextPanel(options: ContextPanelOptions): ContextPanelInstance {
  const opts = {
    container: options.container ?? document.body,
    side: options.side ?? "right",
    size: options.size ?? "md",
    closable: options.closable ?? true,
    showHeader: options.showHeader ?? true,
    backdropColor: options.backdropColor ?? "rgba(0,0,0,0.3)",
    zIndex: options.zIndex ?? 10000,
    animationDuration: options.animationDuration ?? 250,
    lockScroll: options.lockScroll ?? true,
    className: options.className ?? "",
    ...options,
  };

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "cp-backdrop";
  backdrop.style.cssText = `
    position:fixed;inset:0;background:${opts.backdropColor};
    z-index:${opts.zIndex};display:none;opacity:0;
    transition:opacity ${opts.animationDuration}ms ease;
  `;

  // Panel
  const panel = document.createElement("div");
  panel.className = `context-panel cp-${opts.side} ${opts.className}`;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.style.cssText = `
    position:fixed;z-index:${opts.zIndex + 1};
    background:#fff;display:flex;flex-direction:column;
    height:100vh;font-family:-apple-system,sans-serif;color:#374151;
    transition:transform ${opts.animationDuration}ms cubic-bezier(0.4,0,0.2,1);
    box-shadow:${opts.side === "left" ? "-8px 0 30px rgba(0,0,0,0.12)" : "8px 0 30px rgba(0,0,0,0.12)"};
    width:${typeof opts.size === "number" ? opts.size + "px" : SIZE_MAP[opts.size as string] ?? SIZE_MAP.md.value};
  `;

  // Apply initial off-screen position
  if (opts.side === "left") {
    panel.style.left = `-${typeof opts.size === "number" ? opts.size : parseInt(SIZE_MAP[opts.size as string] ?? SIZE_MAP.md.value)}px`;
  } else {
    panel.style.right = `-${typeof opts.size === "number" ? opts.size : parseInt(SIZE_MAP[opts.size as string] ?? SIZE_MAP.md.value)}px`;
  }
  panel.style.top = "0";

  let isOpenState = false;
  let destroyed = false;
  let previousFocus: HTMLElement | null = null;
  const collapsedSections = new Set(
    (options.sections ?? []).filter((s) => s.defaultCollapsed).map((s) => s.id)
  );

  function render(): void {
    panel.innerHTML = "";

    // Header
    if (opts.showHeader) {
      const header = document.createElement("div");
      header.className = "cp-header";
      header.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;
        padding:14px 20px;border-bottom:1px solid #f0f0f0;flex-shrink:0;min-height:56px;
      `;

      const left = document.createElement("div");
      left.style.cssText = "display:flex;align-items:center;gap:10px;min-width:0;";

      // Breadcrumbs
      if (opts.breadcrumbs && opts.breadcrumbs.length > 0) {
        const bcWrap = document.createElement("nav");
        bcWrap.className = "cp-breadcrumbs";
        bcWrap.style.cssText = "display:flex;align-items:center;gap:4px;font-size:12px;color:#6b7280;";
        for (let i = 0; i < opts.breadcrumbs.length; i++) {
          const bc = opts.breadcrumbs[i]!;
          if (i > 0) {
            const sep = document.createElement("span");
            sep.innerHTML = "&rsaquo;";
            sep.style.cssText = "color:#d1d5db;";
            bcWrap.appendChild(sep);
          }
          const link = document.createElement("button");
          link.type = "button";
          link.textContent = bc.label;
          link.style.cssText = "background:none;border:none;color:#6366f1;cursor:pointer;padding:0;font-size:12px;font-weight:500;text-decoration:none;";
          link.addEventListener("mouseenter", () => { link.style.textDecoration = "underline"; });
          link.addEventListener("mouseleave", () => { link.style.textDecoration = ""; });
          link.addEventListener("click", (e) => { e.stopPropagation(); bc.onClick?.(); });
          bcWrap.appendChild(link);
        }
        left.appendChild(bcWrap);
      }

      // Title + subtitle
      if (opts.title) {
        const tWrap = document.createElement("div");
        const titleEl = document.createElement("h2");
        titleEl.style.cssText = "font-size:16px;font-weight:600;color:#111827;margin:0;line-height:1.3;";
        titleEl.textContent = opts.title;
        tWrap.appendChild(titleEl);

        if (opts.subtitle) {
          const sub = document.createElement("p");
          sub.style.cssText = "font-size:12px;color:#9ca3af;margin:2px 0 0;";
          sub.textContent = opts.subtitle;
          tWrap.appendChild(sub);
        }
        left.appendChild(tWrap);
      }
      header.appendChild(left);

      // Right side: actions + close
      const right = document.createElement("div");
      right.style.cssText = "display:flex;align-items:center;gap:8px;flex-shrink:0;";

      // Action buttons
      if (opts.actions) {
        for (const action of opts.actions) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = action.label;
          btn.style.cssText = `
            padding:6px 14px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;
            border:1px solid ${action.primary ? "#4338ca" : "#e5e7eb"};
            background:${action.primary ? "#4338ca" : "#fff"};
            color:${action.primary ? "#fff" : "#374151"};
            transition:all 0.15s;
          `;
          btn.addEventListener("click", (e) => { e.stopPropagation(); action.onClick(); });
          right.appendChild(btn);
        }
      }

      // Close button
      if (opts.closable) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.innerHTML = "&times;";
        closeBtn.title = "Close";
        closeBtn.style.cssText = `
          background:none;border:none;cursor:pointer;font-size:20px;line-height:1;
          color:#9ca3af;padding:4px 6px;border-radius:6px;transition:all 0.15s;
        `;
        closeBtn.addEventListener("click", () => instance.close());
        closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#f3f4f6"; closeBtn.style.color = "#374151"; });
        closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#9ca3af"; });
        right.appendChild(closeBtn);
      }

      header.appendChild(right);
      panel.appendChild(header);
    }

    // Body (sections)
    const body = document.createElement("div");
    body.className = "cp-body";
    body.style.cssText = "flex:1;overflow-y:auto;padding:16px 20px;";

    if (opts.sections && opts.sections.length > 0) {
      for (const section of opts.sections) {
        body.appendChild(renderSection(section));
      }
    }

    panel.appendChild(body);

    // Footer
    if (opts.footer !== undefined) {
      const footer = document.createElement("div");
      footer.className = "cp-footer";
      footer.style.cssText = `
        display:flex;align-items:center;justify-content:flex-end;gap:8px;
        padding:14px 20px;border-top:1px solid #f0f0f0;flex-shrink:0;
      `;
      if (typeof opts.footer === "string") {
        footer.innerHTML = opts.footer;
      } else {
        footer.appendChild(opts.footer);
      }
      panel.appendChild(footer);
    }
  }

  function renderSection(section: PanelSection): HTMLElement {
    const el = document.createElement("section");
    el.dataset.sectionId = section.id;
    el.style.cssText = "margin-bottom:20px;";

    const isCollapsed = collapsedSections.has(section.id);

    // Section header
    const secHeader = document.createElement("div");
    secHeader.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;";
    secHeader.addEventListener("click", () => {
      if (section.collapsible) toggleSection(section.id);
    });

    if (section.collible) {
      const arrow = document.createElement("span");
      arrow.style.cssText = `transition:transform ${opts.animationDuration}ms ease;color:#9ca3af;font-size:12px;`;
      arrow.innerHTML = isCollapsed ? "&#9654;" : "&#9660;";
      arrow.style.transform = isCollapsed ? "" : "rotate(180deg)";
      secHeader.appendChild(arrow);
    }

    if (section.icon) {
      const icon = document.createElement("span");
      icon.textContent = section.icon;
      icon.style.cssText = "font-size:15px;";
      secHeader.appendChild(icon);
    }

    const title = document.createElement("h3");
    title.style.cssText = "font-size:14px;font-weight:600;color:#111827;margin:0;flex:1;";
    title.textContent = section.title;
    secHeader.appendChild(title);

    if (section.badge !== undefined) {
      const badge = document.createElement("span");
      badge.style.cssText = "font-size:11px;background:#eef2ff;color:#4338ca;padding:1px 7px;border-radius:99px;font-weight:600;";
      badge.textContent = String(section.badge);
      secHeader.appendChild(badge);
    }

    el.appendChild(secHeader);

    // Section body
    if (!isCollapsed || !section.collapsible) {
      const body = document.createElement("div");
      body.style.cssText = "color:#6b7280;font-size:13px;line-height:1.6;";
      if (typeof section.content === "string") {
        body.innerHTML = section.content;
      } else {
        body.appendChild(section.content);
      }
      body.style.display = isCollapsed ? "none" : "";
      el.appendChild(body);
    }

    return el;
  }

  function toggleSection(id: string): void {
    if (collapsedSections.has(id)) {
      collapsedSections.delete(id);
    } else {
      collapsedSections.add(id);
    }
    render();
  }

  // Event handlers
  backdrop.addEventListener("click", () => instance.close());

  // Escape key
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpenState) instance.close();
  };
  document.addEventListener("keydown", escHandler);
  (backdrop as any)._escHandler = escHandler;

  opts.container.appendChild(backdrop);
  opts.container.appendChild(panel);

  render();

  const instance: ContextPanelInstance = {
    element: panel,

    isOpen() { return isOpenState; },

    open() {
      if (isOpenState) return;
      isOpenState = true;
      previousFocus = document.activeElement as HTMLElement;

      backdrop.style.display = "block";
      void backdrop.offsetHeight;
      backdrop.style.opacity = "1";

      if (opts.side === "left") {
        panel.style.left = "0";
      } else {
        panel.style.right = "0";
      }

      if (opts.lockScroll) document.body.style.overflow = "hidden";
      opts.onOpen?.();
    },

    close() {
      if (!isOpenState) return;
      isOpenState = false;

      backdrop.style.opacity = "0";
      if (opts.side === "left") {
        panel.style.left = `-${typeof opts.size === "number" ? opts.size : parseInt(SIZE_MAP[opts.size as string] ?? SIZE_MAP.md.value)}px`;
      } else {
        panel.style.right = `-${typeof opts.size === "number" ? opts.size : parseInt(SIZE_MAP[opts.size as string] ?? SIZE_MAP.md.value)}px`;
      }

      setTimeout(() => { backdrop.style.display = "none"; }, opts.animationDuration);
      if (opts.lockScroll) document.body.style.overflow = "";
      if (previousFocus) previousFocus.focus();
      opts.onClose?.();
    },

    toggle() { isOpenState ? instance.close() : instance.open(); },

    setTitle(title: string) { opts.title = title; render(); },

    setSections(sections: PanelSection[]) { opts.sections = sections; render(); },

    setFooter(content: string | HTMLElement) { opts.footer = content; render(); },

    destroy() {
      destroyed = true;
      if (isOpenState && opts.lockScroll) document.body.style.overflow = "";
      document.removeEventListener("keydown", escHandler);
      backdrop.remove();
      panel.remove();
    },
  };

  return instance;
}
