/**
 * Accordion Manager: Collapsible panel system with single/multiple mode,
 * smooth animations, keyboard navigation, nested accordions, lazy content,
 * header icons, disabled panels, and ARIA accessibility.
 */

// --- Types ---

export type AccordionMode = "single" | "multiple";
export type ExpandDirection = "vertical" | "horizontal";

export interface AccordionPanel {
  /** Unique identifier */
  id: string;
  /** Panel title/header text or element */
  header: string | HTMLElement;
  /** Panel body content (string, HTML, or element) */
  body: string | HTMLElement;
  /** Initially expanded? */
  defaultOpen?: boolean;
  /** Disabled? */
  disabled?: boolean;
  /** Custom icon for collapsed state */
  iconCollapsed?: string;
  /** Custom icon for expanded state */
  iconExpanded?: string;
  /** Extra CSS class */
  className?: string;
  /** Lazy load body content? */
  lazy?: (() => string | HTMLElement) | Promise<string | HTMLElement>;
}

export interface AccordionOptions {
  /** Single (only one open) or multiple (any number open) */
  mode?: AccordionMode;
  /** Animation duration in ms (default: 250) */
  animationDuration?: number;
  /** Easing function (default: ease) */
  easing?: string;
  /** Allow all to close? In single mode, one stays open if false (default: true) */
  allowToggleAll?: boolean;
  /** Expand direction (default: vertical) */
  direction?: ExpandDirection;
  /** Show chevron/arrow icons (default: true) */
  showIcons?: boolean;
  /** Icon position: left or right (default: right) */
  iconPosition?: "left" | "right";
  /** Container element or selector */
  container?: HTMLElement | string;
  /** Callback when a panel opens */
  onOpen?: (panelId: string) => void;
  /** Callback when a panel closes */
  onClose?: (panelId: string) => void;
  /** Callback before toggle (return false to prevent) */
  onBeforeToggle?: (panelId: string, opening: boolean) => boolean;
  /** Custom CSS class for the accordion root */
  className?: string;
  /** Border between panels? (default: true) */
  bordered?: boolean;
  /** Rounded corners? (default: true) */
  rounded?: boolean;
  /** Compact density? (default: false) */
  compact?: boolean;
}

export interface AccordionInstance {
  element: HTMLElement;
  /** Open a panel by ID */
  open: (panelId: string) => void;
  /** Close a panel by ID */
  close: (panelId: string) => void;
  /** Toggle a panel by ID */
  toggle: (panelId: string) => void;
  /** Open all panels */
  openAll: () => void;
  /** Close all panels */
  closeAll: () => void;
  /** Check if a panel is open */
  isOpen: (panelId: string) => boolean;
  /** Get IDs of currently open panels */
  getOpenPanels: () => string[];
  /** Add a panel dynamically */
  addPanel: (panel: AccordionPanel) => void;
  /** Remove a panel by ID */
  removePanel: (panelId: string) => void;
  /** Enable/disable a panel */
  setDisabled: (panelId: string, disabled: boolean) => void;
  /** Update panel content */
  updatePanel: (panelId: string, updates: Partial<Pick<AccordionPanel, "header" | "body">>) => void;
  /** Destroy the accordion */
  destroy: () => void;
}

// --- Main Factory ---

export function createAccordion(panels: AccordionPanel[], options: AccordionOptions = {}): AccordionInstance {
  const opts = {
    mode: options.mode ?? "single",
    animationDuration: options.animationDuration ?? 250,
    easing: options.easing ?? "ease",
    allowToggleAll: options.allowToggleAll ?? true,
    direction: options.direction ?? "vertical",
    showIcons: options.showIcons ?? true,
    iconPosition: options.iconPosition ?? "right",
    className: options.className ?? "",
    bordered: options.bordered ?? true,
    rounded: options.rounded ?? true,
    compact: options.compact ?? false,
    ...options,
  };

  // Container
  let container: HTMLElement;
  if (options.container) {
    container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
  } else {
    container = document.createElement("div");
    document.body.appendChild(container);
  }

  const root = document.createElement("div");
  root.className = `accordion acc-${opts.mode} ${opts.className}`;
  root.setAttribute("role", opts.mode === "single" ? "tablist" : "region");
  root.style.cssText = `
    display:flex;flex-direction:${opts.direction === "vertical" ? "column" : "row"};
    width:100%;font-family:-apple-system,sans-serif;
    ${opts.bordered ? "border:1px solid #e5e7eb;" : ""}
    ${opts.rounded ? "border-radius:10px;overflow:hidden;" : ""}
    ${opts.compact ? "--acc-padding:8px 12px;" : "--acc-padding:14px 18px;"}
  `;

  // State
  const panelMap = new Map<string, {
    panel: AccordionPanel;
    headerEl: HTMLElement;
    bodyEl: HTMLElement;
    bodyInner: HTMLElement;
    contentLoaded: boolean;
    isOpen: boolean;
  }>();
  const openPanels = new Set<string>();
  let destroyed = false;

  // Build panels
  for (const panel of panels) {
    buildPanel(panel);
  }

  container.appendChild(root);

  function buildPanel(p: AccordionPanel): void {
    const wrapper = document.createElement("div");
    wrapper.className = `accordion-panel${p.disabled ? " acc-disabled" : ""}${p.className ? ` ${p.className}` : ""}`;
    wrapper.dataset.panelId = p.id;
    wrapper.style.cssText = `
      overflow:hidden;border-${opts.direction === "vertical" ? "bottom" : "right"}:1px solid #e5e7eb;
      &:last-child{border-color:transparent;}
      ${p.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    // Header button
    const headerBtn = document.createElement("button");
    headerBtn.type = "button";
    headerBtn.setAttribute("role", opts.mode === "single" ? "tab" : "button");
    headerBtn.setAttribute("aria-expanded", String(p.defaultOpen ?? false));
    headerBtn.setAttribute("aria-controls", `${p.id}-body`);
    headerBtn.id = `${p.id}-header`;
    headerBtn.style.cssText = `
      display:flex;align-items:center;width:100%;padding:var(--acc-padding,14px 18px);
      background:none;border:none;cursor:pointer;font-size:14px;font-weight:500;
      color:#1f2937;text-align:left;gap:10px;transition:background 0.15s;
      font-family:inherit;line-height:1.4;
    `;
    headerBtn.addEventListener("mouseenter", () => { if (!p.disabled) headerBtn.style.background = "#f9fafb"; });
    headerBtn.addEventListener("mouseleave", () => { headerBtn.style.background = ""; });

    // Icon
    if (opts.showIcons) {
      const icon = document.createElement("span");
      icon.className = "acc-icon";
      icon.style.cssText = `
        display:inline-flex;align-items:center;justify-content:center;
        flex-shrink:0;width:18px;height:18px;transition:transform ${opts.animationDuration}ms ${opts.easing};
        font-size:12px;color:#6b7280;
        ${opts.iconPosition === "left" ? "order:-1;" : ""}
      `;
      icon.innerHTML = p.defaultOpen
        ? (p.iconExpanded ?? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4.5l3 3 3-3"/></svg>')
        : (p.iconCollapsed ?? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 3l3 3-3 3"/></svg>');
      headerBtn.appendChild(icon);
    }

    // Title
    const titleSpan = document.createElement("span");
    titleSpan.className = "acc-title";
    titleSpan.style.cssText = "flex:1;";
    if (typeof p.header === "string") {
      titleSpan.textContent = p.header;
    } else {
      titleSpan.appendChild(p.header);
    }
    headerBtn.appendChild(titleSpan);

    wrapper.appendChild(headerBtn);

    // Body
    const bodyEl = document.createElement("div");
    bodyEl.id = `${p.id}-body`;
    bodyEl.setAttribute("role", opts.mode === "single" ? "tabpanel" : "region");
    bodyEl.setAttribute("aria-labelledby", `${p.id}-header`);
    bodyEl.style.cssText = `
      overflow:hidden;
      ${opts.direction === "vertical"
        ? `max-height:0;transition:max-height ${opts.animationDuration}ms ${opts.easing};`
        : `max-width:0;transition:max-width ${opts.animationDuration}ms ${opts.easing};white-space:nowrap;`}
    `;

    const bodyInner = document.createElement("div");
    bodyInner.className = "acc-body-inner";
    bodyInner.style.cssText = `padding:var(--acc-padding,14px 18px);font-size:14px;color:#4b5563;line-height:1.6;`;
    setContent(bodyInner, p.body, !p.lazy);

    bodyEl.appendChild(bodyInner);
    wrapper.appendChild(bodyEl);

    root.appendChild(wrapper);

    // Store reference
    const entry = { panel: p, headerEl: headerBtn, bodyEl, bodyInner, contentLoaded: !p.lazy, isOpen: p.defaultOpen ?? false };
    panelMap.set(p.id, entry);

    if (entry.isOpen) {
      openPanels.add(p.id);
      requestAnimationFrame(() => {
        if (opts.direction === "vertical") {
          bodyEl.style.maxHeight = bodyInner.scrollHeight + "px";
        } else {
          bodyEl.style.maxWidth = bodyInner.scrollWidth + "px";
        }
        icon?.style.setProperty("transform", "rotate(180deg)");
      });
    }

    // Click handler
    headerBtn.addEventListener("click", () => {
      if (p.disabled || destroyed) return;
      toggleInternal(p.id);
    });

    // Keyboard navigation
    headerBtn.addEventListener("keydown", (e: KeyboardEvent) => {
      if (destroyed) return;
      const panelEntries = Array.from(panelMap.values());
      const idx = panelEntries.findIndex((pe) => pe.panel.id === p.id);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (idx < panelEntries.length - 1) panelEntries[idx + 1]!.headerEl.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          if (idx > 0) panelEntries[idx - 1]!.headerEl.focus();
          break;
        case "Home":
          e.preventDefault();
          panelEntries[0]?.headerEl.focus();
          break;
        case "End":
          e.preventDefault();
          panelEntries[panelEntries.length - 1]?.headerEl.focus();
          break;
      }
    });

    function setContent(el: HTMLElement, content: string | HTMLElement, immediate: boolean): void {
      el.innerHTML = "";
      if (typeof content === "string") {
        el.innerHTML = content;
      } else {
        el.appendChild(content);
      }
      if (!immediate) {
        el.style.display = "none";
      }
    }
  }

  function toggleInternal(panelId: string): void {
    const entry = panelMap.get(panelId);
    if (!entry || entry.panel.disabled || destroyed) return;

    const opening = !entry.isOpen;

    // Before toggle hook
    if (opts.onBeforeToggle?.(panelId, opening) === false) return;

    // Single mode: close others
    if (opts.mode === "single" && opening) {
      for (const [id, otherEntry] of panelMap) {
        if (id !== panelId && otherEntry.isOpen) {
          closeInternal(id, false);
        }
      }
    }

    if (opening) {
      openInternal(panelId);
    } else {
      // In single mode without allowToggleAll, don't close last
      if (opts.mode === "single" && !opts.allowToggleAll && openPanels.size <= 1) return;
      closeInternal(panelId);
    }
  }

  async function openInternal(panelId: string): void {
    const entry = panelMap.get(panelId);
    if (!entry || entry.isOpen || destroyed) return;

    // Lazy load
    if (!entry.contentLoaded && entry.panel.lazy) {
      const content = await entry.panel.lazy();
      entry.bodyInner.innerHTML = "";
      if (typeof content === "string") {
        entry.bodyInner.innerHTML = content;
      } else {
        entry.bodyInner.appendChild(content);
      }
      entry.bodyInner.style.display = "";
      entry.contentLoaded = true;
    }

    entry.isOpen = true;
    openPanels.add(panelId);
    entry.headerEl.setAttribute("aria-expanded", "true");

    // Animate
    requestAnimationFrame(() => {
      if (opts.direction === "vertical") {
        entry.bodyEl.style.maxHeight = entry.bodyInner.scrollHeight + "px";
      } else {
        entry.bodyEl.style.maxWidth = entry.bodyInner.scrollWidth + "px";
      }

      // Rotate icon
      const icon = entry.headerEl.querySelector(".acc-icon") as HTMLElement | null;
      if (icon) icon.style.transform = "rotate(180deg)";
    });

    opts.onOpen?.(panelId);
  }

  function closeInternal(panelId: string, animate = true): void {
    const entry = panelMap.get(panelId);
    if (!entry || !entry.isOpen || destroyed) return;

    entry.isOpen = false;
    openPanels.delete(panelId);
    entry.headerEl.setAttribute("aria-expanded", "false");

    if (animate) {
      if (opts.direction === "vertical") {
        entry.bodyEl.style.maxHeight = "0";
      } else {
        entry.bodyEl.style.maxWidth = "0";
      }

      const icon = entry.headerEl.querySelector(".acc-icon") as HTMLElement | null;
      if (icon) icon.style.transform = "";

      setTimeout(() => {
        if (!entry.isOpen) {
          // Keep at 0 after transition
        }
      }, opts.animationDuration);
    } else {
      if (opts.direction === "vertical") {
        entry.bodyEl.style.maxHeight = "0";
      } else {
        entry.bodyEl.style.maxWidth = "0";
      }
    }

    opts.onClose?.(panelId);
  }

  const instance: AccordionInstance = {
    element: root,

    open(panelId: string) { openInternal(panelId); },
    close(panelId: string) { closeInternal(panelId); },
    toggle(panelId: string) { toggleInternal(panelId); },

    openAll() {
      for (const [id] of panelMap) {
        if (opts.mode === "multiple") openInternal(id);
      }
    },

    closeAll() {
      for (const [id] of panelMap) {
        closeInternal(id);
      }
    },

    isOpen(panelId: string) { return panelMap.get(panelId)?.isOpen ?? false; },
    getOpenPanels() { return Array.from(openPanels); },

    addPanel(panel: AccordionPanel) {
      buildPanel(panel);
    },

    removePanel(panelId: string) {
      const entry = panelMap.get(panelId);
      if (entry) {
        entry.headerEl.parentElement?.remove();
        panelMap.delete(panelId);
        openPanels.delete(panelId);
      }
    },

    setDisabled(panelId: string, disabled: boolean) {
      const entry = panelMap.get(panelId);
      if (entry) {
        entry.panel.disabled = disabled;
        entry.headerEl.parentElement?.classList.toggle("acc-disabled", disabled);
        entry.headerEl.parentElement!.style.opacity = disabled ? "0.5" : "";
        entry.headerEl.parentElement!.style.pointerEvents = disabled ? "none" : "";
      }
    },

    updatePanel(panelId: string, updates: Partial<Pick<AccordionPanel, "header" | "body">>) {
      const entry = panelMap.get(panelId);
      if (!entry) return;
      if (updates.header !== undefined) {
        const titleSpan = entry.headerEl.querySelector(".acc-title")!;
        if (typeof updates.header === "string") {
          titleSpan.textContent = updates.header;
        } else {
          titleSpan.innerHTML = "";
          titleSpan.appendChild(updates.header);
        }
      }
      if (updates.body !== undefined) {
        entry.bodyInner.innerHTML = "";
        if (typeof updates.body === "string") {
          entry.bodyInner.innerHTML = updates.body;
        } else {
          entry.bodyInner.appendChild(updates.body);
        }
        entry.contentLoaded = true;
        // If currently open, re-measure
        if (entry.isOpen) {
          if (opts.direction === "vertical") {
            entry.bodyEl.style.maxHeight = entry.bodyInner.scrollHeight + "px";
          } else {
            entry.bodyEl.style.maxWidth = entry.bodyInner.scrollWidth + "px";
          }
        }
      }
    },

    destroy() {
      destroyed = true;
      root.remove();
      panelMap.clear();
      openPanels.clear();
    },
  };

  return instance;
}
