/**
 * Collapse Utilities: Lightweight single collapsible section with
 * height animation, toggle button, ARIA attributes, and programmatic API.
 */

// --- Types ---

export interface CollapseOptions {
  /** Target element to collapse/expand */
  target: HTMLElement;
  /** Trigger element (button) — if not provided, one is created */
  trigger?: HTMLElement;
  /** Label for collapsed state */
  collapsedLabel?: string;
  /** Label for expanded state */
  expandedLabel?: string;
  /** Initially expanded? */
  defaultExpanded?: boolean;
  /** Animation duration (ms) */
  duration?: number;
  /** Easing function */
  easing?: string;
  /** Whether to animate height (vs instant show/hide) */
  animated?: boolean;
  /** Called on expand */
  onExpand?: () => void;
  /** Called on collapse */
  onCollapse?: () => void;
}

export interface CollapseInstance {
  /** The wrapper element (or original target if no wrapper needed) */
  el: HTMLElement;
  /** The trigger button element */
  trigger: HTMLElement;
  /** Expand the content */
  expand: () => void;
  /** Collapse the content */
  collapse: () => void;
  /** Toggle state */
  toggle: () => void;
  /** Check if expanded */
  isExpanded: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a collapsible section around an element.
 *
 * @example
 * ```ts
 * const collapse = createCollapse({
 *   target: contentEl,
 *   trigger: toggleButton,
 *   defaultExpanded: true,
 * });
 * ```
 */
export function createCollapse(options: CollapseOptions): CollapseInstance {
  const {
    target,
    trigger: existingTrigger,
    collapsedLabel = "Show more",
    expandedLabel = "Show less",
    defaultExpanded = false,
    duration = 250,
    easing = "ease-in-out",
    animated = true,
    onExpand,
    onCollapse,
  } = options;

  let _expanded = defaultExpanded;

  // Wrap target in a container for height animation
  const wrapper = document.createElement("div");
  wrapper.className = "collapse-wrapper";
  wrapper.style.cssText =
    "overflow:hidden;transition:none;";
  target.parentNode?.insertBefore(wrapper, target);
  wrapper.appendChild(target);

  // Set initial state
  if (!_expanded && animated) {
    wrapper.style.height = "0px";
    target.style.display = "none";
  }

  // Create or use trigger
  let triggerEl: HTMLElement;

  if (existingTrigger) {
    triggerEl = existingTrigger;
  } else {
    triggerEl = document.createElement("button");
    triggerEl.type = "button";
    triggerEl.className = "collapse-trigger";
    triggerEl.textContent = _expanded ? expandedLabel : collapsedLabel;
    triggerEl.style.cssText =
      "display:inline-flex;align-items:center;gap:4px;padding:4px 12px;" +
      "border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;" +
      "font-size:13px;color:#3b82f6;transition:background 0.15s;color 0.15s;" +
      "user-select:none;";

    // Insert before wrapper
    wrapper.parentNode?.insertBefore(triggerEl, wrapper);

    // Chevron icon
    const chevron = document.createElement("span");
    chevron.innerHTML = "&#9660;";
    chevron.style.cssText =
      `font-size:10px;transition:transform ${duration}ms ${easing};` +
      (_expanded ? "transform:rotate(180deg);" : "");
    triggerEl.prepend(chevron);

    // Hover effect
    triggerEl.addEventListener("mouseenter", () => { triggerEl.style.background = "#f9fafb"; });
    triggerEl.addEventListener("mouseleave", () => { triggerEl.style.background = ""; });
  }

  // Set ARIA attributes
  triggerEl.setAttribute("aria-expanded", String(_expanded));
  triggerEl.setAttribute("aria-controls", target.id || `collapse-${Math.random().toString(36).slice(2)}`);

  // Click handler
  triggerEl.addEventListener("click", toggle);

  // --- Methods ---

  function expand(): void {
    if (_expanded) return;
    _setExpanded(true);
  }

  function collapse(): void {
    if (!_expanded) return;
    _setExpanded(false);
  }

  function toggle(): void { _expanded ? collapse() : expand(); }
  function isExpanded(): boolean { return _expanded; }

  function destroy(): void {
    triggerEl.removeEventListener("click", toggle);

    // Unwrap target
    if (wrapper.parentNode) {
      wrapper.parentNode.insertBefore(target, wrapper);
      wrapper.remove();
    }

    // Remove auto-created trigger
    if (!existingTrigger && triggerEl.parentNode) {
      triggerEl.remove();
    }
  }

  // --- Internal ---

  function _setExpanded(expanding: boolean): void {
    _expanded = expanding;

    // Update ARIA
    triggerEl.setAttribute("aria-expanded", String(expanding));

    // Update label if auto-created
    if (!existingTrigger) {
      triggerEl.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent = expanding ? expandedLabel : collapsedLabel;
        }
      });
      // Update chevron
      const chevron = triggerEl.querySelector("span");
      if (chevron) chevron.style.transform = expanding ? "rotate(180deg)" : "";
    }

    if (animated) {
      if (expanding) {
        target.style.display = "";
        wrapper.style.height = "0px";
        wrapper.style.overflow = "hidden";
        wrapper.style.transition = `height ${duration}ms ${easing}`;

        // Measure full height
        const fullHeight = target.offsetHeight + "px";

        // Animate
        requestAnimationFrame(() => {
          wrapper.style.height = fullHeight;
        });

        setTimeout(() => {
          wrapper.style.height = "";
          wrapper.style.overflow = "";
          wrapper.style.transition = "";
          onExpand?.();
        }, duration);
      } else {
        wrapper.style.height = target.offsetHeight + "px";
        wrapper.style.overflow = "hidden";
        wrapper.style.transition = `height ${duration}ms ${easing}`;

        requestAnimationFrame(() => {
          wrapper.style.height = "0px";
        });

        setTimeout(() => {
          target.style.display = "none";
          wrapper.style.height = "";
          wrapper.style.overflow = "";
          wrapper.style.transition = "";
          onCollapse?.();
        }, duration);
      }
    } else {
      target.style.display = expanding ? "" : "none";
      if (expanding) onExpand?.(); else onCollapse?.();
    }
  }

  return { el: wrapper, trigger: triggerEl, expand, collapse, toggle, isExpanded, destroy };
}
