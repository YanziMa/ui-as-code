/**
 * Tooltip Group: Coordinated tooltip management for multiple elements within a container.
 * Ensures only one tooltip is visible at a time, shared positioning logic,
 * staggered show/hide animations, and global configuration.
 */

// --- Types ---

export interface TooltipGroupOptions {
  /** Delay before showing (ms, default: 200) */
  showDelay?: number;
  /** Delay before hiding (ms, default: 100) */
  hideDelay?: number;
  /** Default position (default: 'top') */
  defaultPosition?: "top" | "bottom" | "left" | "right";
  /** Default offset from trigger (px, default: 8) */
  offset?: number;
  /** Max width (px, default: 280) */
  maxWidth?: number;
  /** Animation duration (ms, default: 150) */
  animationDuration?: number;
  /** Arrow size (px, default: 8) */
  arrowSize?: number;
  /** Z-index (default: 10000) */
  zIndex?: number;
  /** Theme (default: 'dark') */
  theme?: "dark" | "light";
  /** Show on focus as well as hover */
  showOnFocus?: boolean;
  /** Container element for tooltips */
  container?: HTMLElement;
}

export interface TooltipItemOptions {
  /** Trigger element */
  trigger: HTMLElement;
  /** Tooltip content (string or HTML) */
  content: string | HTMLElement;
  /** Position override */
  position?: "top" | "bottom" | "left" | "right";
  /** HTML content flag */
  html?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Disable this tooltip */
  disabled?: boolean;
  /** Custom offset override */
  offset?: number;
}

export interface TooltipGroupInstance {
  /** Root container element */
  element: HTMLDivElement;
  /** Add a tooltip to an element */
  add: (options: TooltipItemOptions) => () => void;
  /** Remove a tooltip by trigger element */
  remove: (trigger: HTMLElement) => void;
  /** Update tooltip content */
  updateContent: (trigger: HTMLElement, content: string | HTMLElement) => void;
  /** Show a specific tooltip manually */
  show: (trigger: HTMLElement) => void;
  /** Hide current tooltip */
  hide: () => void;
  /** Destroy all tooltips and cleanup */
  destroy: () => void;
}

// --- Main Class ---

export class TooltipGroupManager {
  create(options: TooltipGroupOptions = {}): TooltipGroupInstance {
    const opts = {
      showDelay: options.showDelay ?? 200,
      hideDelay: options.hideDelay ?? 100,
      defaultPosition: options.defaultPosition ?? "top",
      offset: options.offset ?? 8,
      maxWidth: options.maxWidth ?? 280,
      animationDuration: options.animationDuration ?? 150,
      arrowSize: options.arrowSize ?? 8,
      zIndex: options.zIndex ?? 10000,
      theme: options.theme ?? "dark",
      showOnFocus: options.showOnFocus ?? true,
      container: options.container ?? document.body,
    };

    const tooltips = new Map<HTMLElement, {
      el: HTMLDivElement;
      options: TooltipItemOptions;
      showTimer: ReturnType<typeof setTimeout> | null;
      hideTimer: ReturnType<typeof setTimeout> | null;
    }>();

    let activeTrigger: HTMLElement | null = null;
    let tooltipEl: HTMLDivElement | null = null;
    let destroyed = false;

    // Shared tooltip element (reused for all items)
    const root = document.createElement("div");
    root.className = "tooltip-group-container";
    root.style.cssText = `
      position:fixed;top:0;left:0;pointer-events:none;z-index:${opts.zIndex};
    `;
    opts.container.appendChild(root);

    function createTooltipEl(): HTMLDivElement {
      const el = document.createElement("div");
      el.className = `tooltip-group-item ${opts.theme}`;
      el.setAttribute("role", "tooltip");
      el.style.cssText = `
        position:absolute;opacity:0;visibility:hidden;
        max-width:${opts.maxWidth}px;padding:6px 12px;border-radius:6px;
        font-size:13px;line-height:1.4;white-space:normal;word-break:break-word;
        transition:opacity ${opts.animationDuration}ms ease,
          visibility ${opts.animationDuration}ms ease,
          transform ${opts.animationDuration}ms ease;
        pointer-events:none;z-index:${opts.zIndex};
        ${opts.theme === "dark"
          ? "background:#1f2937;color:#f9fafb;border:1px solid #374151;"
          : "background:#fff;color:#1f2937;border:1px solid #e5e7eb;box-shadow:0 4px 12px rgba(0,0,0,0.15);"}
        transform-origin:center center;
      `;
      return el;
    }

    function positionTooltip(trigger: HTMLElement, pos: string, customOffset?: number): void {
      if (!tooltipEl || !root.parentElement) return;

      const offset = customOffset ?? opts.offset;
      const arrowSize = opts.arrowSize;
      const triggerRect = trigger.getBoundingClientRect();
      const containerRect = root.parentElement.getBoundingClientRect();

      // Clear existing arrow
      const existingArrow = tooltipEl.querySelector(".tg-arrow");
      if (existingArrow) existingArrow.remove();

      // Create arrow
      const arrow = document.createElement("div");
      arrow.className = "tg-arrow";
      arrow.style.cssText = `
        position:absolute;width:${arrowSize * 2}px;height:${arrowSize * 2}px;
        transform:rotate(45deg);
        ${opts.theme === "dark"
          ? "background:#1f2937;border-top:1px solid #374151;border-left:1px solid #374151;"
          : "background:#fff;border-top:1px solid #e5e7eb;border-left:1px solid #e5e7eb;"}
      `;
      tooltipEl.appendChild(arrow);

      // Measure tooltip
      const tw = tooltipEl.offsetWidth;
      const th = tooltipEl.offsetHeight;

      let left: number;
      let top: number;

      switch (pos) {
        case "top":
          left = triggerRect.left + (triggerRect.width - tw) / 2 - containerRect.left;
          top = triggerRect.top - th - offset + arrowSize / 2 - containerRect.top;
          arrow.style.left = `${tw / 2 - arrowSize}px`;
          arrow.style.bottom = `-${arrowSize}px`;
          break;
        case "bottom":
          left = triggerRect.left + (triggerRect.width - tw) / 2 - containerRect.left;
          top = triggerRect.bottom + offset - arrowSize / 2 - containerRect.top;
          arrow.style.left = `${tw / 2 - arrowSize}px`;
          arrow.style.top = `-${arrowSize}px`;
          break;
        case "left":
          left = triggerRect.left - tw - offset + arrowSize / 2 - containerRect.left;
          top = triggerRect.top + (triggerRect.height - th) / 2 - containerRect.top;
          arrow.style.right = `-${arrowSize}px`;
          arrow.style.top = `${th / 2 - arrowSize}px`;
          break;
        case "right":
        default:
          left = triggerRect.right + offset - arrowSize / 2 - containerRect.left;
          top = triggerRect.top + (triggerRect.height - th) / 2 - containerRect.top;
          arrow.style.left = `-${arrowSize}px`;
          arrow.style.top = `${th / 2 - arrowSize}px`;
          break;
      }

      // Clamp to viewport
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      left = Math.max(4, Math.min(left, vpW - tw - 4));
      top = Math.max(4, Math.min(top, vpH - th - 4));

      // Adjust arrow position after clamping
      if (pos === "top" || pos === "bottom") {
        const newCenter = left + tw / 2;
        const triggerCenter = triggerRect.left + triggerRect.width / 2;
        arrow.style.left = `${Math.max(arrowSize, Math.min(tw / 2 - arrowSize + (triggerCenter - newCenter), tw - arrowSize * 3))}px`;
      }

      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
    }

    function showTooltip(trigger: HTMLElement): void {
      if (destroyed) return;

      const entry = tooltips.get(trigger);
      if (!entry || entry.options.disabled) return;

      // Hide any currently active tooltip
      if (activeTrigger && activeTrigger !== trigger) {
        hideImmediate(activeTrigger);
      }

      activeTrigger = trigger;

      // Clear pending timers
      if (entry.showTimer) { clearTimeout(entry.showTimer); entry.showTimer = null; }
      if (entry.hideTimer) { clearTimeout(entry.hideTimer); entry.hideTimer = null; }

      entry.showTimer = setTimeout(() => {
        if (destroyed) return;

        // Create or reuse tooltip element
        if (!tooltipEl) {
          tooltipEl = createTooltipEl();
          root.appendChild(tooltipEl);
        }

        // Set content
        if (typeof entry.options.content === "string") {
          tooltipEl.innerHTML = entry.options.content;
        } else {
          tooltipEl.innerHTML = "";
          tooltipEl.appendChild(entry.options.content);
        }

        // Apply custom class
        if (entry.options.className) {
          tooltipEl.className = `tooltip-group-item ${opts.theme} ${entry.options.className}`;
        }

        const pos = entry.options.position ?? opts.defaultPosition;
        positionTooltip(trigger, pos, entry.options.offset);

        // Show with slight upward motion
        requestAnimationFrame(() => {
          if (!tooltipEl) return;
          tooltipEl.style.opacity = "1";
          tooltipEl.style.visibility = "visible";
          tooltipEl.style.transform = pos === "top" || pos === "bottom"
            ? "translateY(0)"
            : "translateX(0)";
        });
      }, opts.showDelay);
    }

    function hideTooltip(trigger: HTMLElement): void {
      const entry = tooltips.get(trigger);
      if (!entry) return;

      if (entry.showTimer) { clearTimeout(entry.showTimer); entry.showTimer = null; }

      entry.hideTimer = setTimeout(() => {
        if (activeTrigger !== trigger) return;
        hideImmediate(trigger);
      }, opts.hideDelay);
    }

    function hideImmediate(trigger: HTMLElement): void {
      if (activeTrigger !== trigger) return;

      if (tooltipEl) {
        tooltipEl.style.opacity = "0";
        tooltipEl.style.visibility = "hidden";

        setTimeout(() => {
          if (tooltipEl && tooltipEl.style.opacity === "0") {
            tooltipEl.remove();
            tooltipEl = null;
          }
        }, opts.animationDuration);
      }

      activeTrigger = null;
    }

    function bindEvents(trigger: HTMLElement, entry: NonNullable<ReturnType<typeof tooltips.get>>): void {
      trigger.addEventListener("mouseenter", () => showTooltip(trigger));
      trigger.addEventListener("mouseleave", () => hideTooltip(trigger));
      trigger.addEventListener("focus", () => { if (opts.showOnFocus) showTooltip(trigger); });
      trigger.addEventListener("blur", () => { if (opts.showOnFocus) hideTooltip(trigger); });

      // Touch support
      trigger.addEventListener("touchstart", (e) => {
        if (activeTrigger === trigger) {
          hideTooltip(trigger);
        } else {
          showTooltip(trigger);
        }
      }, { passive: true });
    }

    function unbindEvents(trigger: HTMLElement): void {
      // Clone and replace to remove all listeners
      const clone = trigger.cloneNode(true) as HTMLElement;
      trigger.parentNode?.replaceChild(clone, trigger);

      // Update map reference
      const entry = tooltips.get(trigger);
      if (entry) {
        tooltips.delete(trigger);
        tooltips.set(clone, entry);
        entry.options.trigger = clone;
      }

      if (activeTrigger === trigger) {
        activeTrigger = clone;
      }
    }

    const instance: TooltipGroupInstance = {
      element: root,

      add(itemOpts: TooltipItemOptions): () => void {
        if (destroyed) return () => {};

        const entry = {
          el: createTooltipEl(),
          options: itemOpts,
          showTimer: null as ReturnType<typeof setTimeout> | null,
          hideTimer: null as ReturnType<typeof setTimeout> | null,
        };

        tooltips.set(itemOpts.trigger, entry);
        bindEvents(itemOpts.trigger, entry);

        // Return unsubscribe function
        return () => {
          unbindEvents(itemOpts.trigger);
          tooltips.delete(itemOpts.trigger);
          if (activeTrigger === itemOpts.trigger) {
            hideImmediate(itemOpts.trigger);
          }
        };
      },

      remove(trigger: HTMLElement): void {
        unbindEvents(trigger);
        tooltips.delete(trigger);
        if (activeTrigger === trigger) {
          hideImmediate(trigger);
        }
      },

      updateContent(trigger: HTMLElement, content: string | HTMLElement): void {
        const entry = tooltips.get(trigger);
        if (entry) {
          entry.options.content = content;
          if (activeTrigger === trigger && tooltipEl) {
            if (typeof content === "string") {
              tooltipEl.innerHTML = content;
            } else {
              tooltipEl.innerHTML = "";
              tooltipEl.appendChild(content);
            }
          }
        }
      },

      show(trigger: HTMLElement): void {
        showTooltip(trigger);
      },

      hide(): void {
        if (activeTrigger) {
          hideImmediate(activeTrigger);
        }
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;

        for (const [trigger] of tooltips) {
          unbindEvents(trigger);
        }
        tooltips.clear();

        if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
        root.remove();
        activeTrigger = null;
      },
    };

    return instance;
  }
}

/** Convenience: create a tooltip group */
export function createTooltipGroup(options?: TooltipGroupOptions): TooltipGroupInstance {
  return new TooltipGroupManager().create(options);
}
