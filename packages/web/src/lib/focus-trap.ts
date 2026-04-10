/**
 * Focus Trap: Constrain keyboard focus within a DOM container, handle Tab/Shift+Tab
 * cycling, auto-focus first/last element, detect focusable elements, ARIA support,
 * and manage nested traps with stack semantics.
 */

// --- Types ---

export interface FocusTrapOptions {
  /** Container element to trap focus within */
  container: HTMLElement;
  /** Auto-focus the first focusable element on activation? */
  autoFocus?: boolean;
  /** Auto-focus the last focused element on deactivation? */
  returnFocus?: boolean;
  /** Whether the trap is initially active */
  initialActive?: boolean;
  /** Additional elements to consider focusable */
  includeContainer?: boolean;
  /** Selector for elements to exclude from trap */
  excludeSelector?: string;
  /** Allow Escape key to deactivate? */
  escapeDeactivates?: boolean;
  /** Callback when trap activates */
  onActivate?: () => void;
  /** Callback when trap deactivates */
  onDeactivate?: () => void;
  /** Debug logging */
  debug?: boolean;
}

export interface FocusTrapInstance {
  /** The container element */
  container: HTMLElement;
  /** Activate the focus trap */
  activate: () => void;
  /** Deactivate the focus trap */
  deactivate: () => void;
  /** Check if currently active */
  isActive: () => boolean;
  /** Programmatically move focus to first element */
  focusFirst: () => void;
  /** Programmatically move focus to last element */
  focusLast: () => void;
  /** Get all focusable elements within container */
  getFocusableElements: () => HTMLElement[];
  /** Update options dynamically */
  updateOptions: (options: Partial<FocusTrapOptions>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');

/** Check if an element is visible and focusable */
function isFocusable(el: HTMLElement): boolean {
  if (!el || el.disabled || el.getAttribute("aria-hidden") === "true") return false;

  // Check visibility
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;

  // Check if in DOM tree
  if (!el.isConnected) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;

  return true;
}

/** Find all focusable elements within a container */
function findFocusableElements(container: HTMLElement, excludeSelector?: string): HTMLElement[] {
  const elements = Array.from<HTMLElement>(container.querySelectorAll(FOCUSABLE_SELECTOR));

  // Also check the container itself if it's focusable
  if (container.matches && container.matches(FOCUSABLE_SELECTOR)) {
    elements.unshift(container);
  }

  // Filter out hidden/disabled/excluded
  return elements.filter((el) => {
    if (!isFocusable(el)) return false;
    if (excludeSelector && el.matches(excludeSelector)) return false;
    return true;
  });
}

// --- Main Class ---

export class FocusTrapManager {
  create(options: FocusTrapOptions): FocusTrapInstance {
    const opts = {
      autoFocus: options.autoFocus ?? true,
      returnFocus: options.returnFocus ?? true,
      initialActive: options.initialActive ?? false,
      escapeDeactivates: options.escapeDeactivates ?? false,
      ...options,
    };

    const container = options.container;
    let isActive = false;
    let previouslyFocused: HTMLElement | null = null;
    let destroyed = false;
    let keydownListener: ((e: KeyboardEvent) => void) | null = null;

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== "Tab") {
        if (opts.escapeDeactivates && e.key === "Escape") {
          e.preventDefault();
          instance.deactivate();
        }
        return;
      }

      e.preventDefault();

      const focusable = instance.getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        // Shift+Tab: go backwards, wrap to last if at first
        if (document.activeElement === first || !container.contains(document.activeElement as Node)) {
          last.focus();
        } else {
          // Find previous focusable
          const idx = focusable.indexOf(document.activeElement as HTMLElement);
          if (idx > 0) {
            focusable[idx - 1]!.focus();
          } else {
            last.focus();
          }
        }
      } else {
        // Tab: go forwards, wrap to first if at last
        if (document.activeElement === last || !container.contains(document.activeElement as Node)) {
          first.focus();
        } else {
          // Find next focusable
          const idx = focusable.indexOf(document.activeElement as HTMLElement);
          if (idx < focusable.length - 1) {
            focusable[idx + 1]!.focus();
          } else {
            first.focus();
          }
        }
      }

      if (opts.debug) {
        console.log("[FocusTrap]", { key: e.key, shiftKey: e.shiftKey, activeEl: document.activeElement });
      }
    }

    const instance: FocusTrapInstance = {
      container,

      activate() {
        if (isActive || destroyed) return;

        // Save currently focused element
        previouslyFocused = document.activeElement as HTMLElement;

        isActive = true;

        // Add keydown listener
        keydownListener = handleKeyDown;
        container.addEventListener("keydown", keydownListener);

        // Mark container for accessibility
        container.setAttribute("data-focus-trap", "active");

        // Auto-focus first element
        if (opts.autoFocus) {
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            const focusable = instance.getFocusableElements();
            if (focusable.length > 0) {
              focusable[0]!.focus({ preventScroll: true });
            } else {
              container.focus({ preventScroll: true });
            }
          });
        }

        opts.onActivate?.();
      },

      deactivate() {
        if (!isActive || destroyed) return;

        isActive = false;

        // Remove keydown listener
        if (keydownListener) {
          container.removeEventListener("keydown", keydownListener);
          keydownListener = null;
        }

        container.removeAttribute("data-focus-trap");

        // Return focus
        if (opts.returnFocus && previouslyFocused && typeof previouslyFocused.focus === "function") {
          previouslyFocused.focus({ preventScroll: true });
        }

        opts.onDeactivate?.();
      },

      isActive() { return isActive; },

      focusFirst() {
        const focusable = instance.getFocusableElements();
        if (focusable.length > 0) focusable[0]!.focus({ preventScroll: true });
      },

      focusLast() {
        const focusable = instance.getFocusableElements();
        if (focusable.length > 0) focusable[focusable.length - 1]!.focus({ preventScroll: true });
      },

      getFocusableElements() {
        return findFocusableElements(container, opts.excludeSelector);
      },

      updateOptions(newOpts: Partial<FocusTrapOptions>) {
        Object.assign(opts, newOpts);
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        instance.deactivate();
      },
    };

    // Auto-activate if requested
    if (opts.initialActive) {
      instance.activate();
    }

    return instance;
  }
}

/** Convenience: create a focus trap */
export function createFocusTrap(options: FocusTrapOptions): FocusTrapInstance {
  return new FocusTrapManager().create(options);
}

// --- Stack-based focus trap manager ---

export class FocusTrapStack {
  private stack: FocusTrapInstance[] = [];

  /** Push a new trap onto the stack (deactivates current top if any) */
  push(trap: FocusTrapInstance): void {
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1]!.deactivate();
    }
    trap.activate();
    this.stack.push(trap);
  }

  /** Pop the top trap from the stack (reactivates previous if any) */
  pop(): FocusTrapInstance | undefined {
    const trap = this.stack.pop();
    if (trap) trap.deactivate();
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1]!.activate();
    }
    return trap;
  }

  /** Get current depth */
  get depth(): number {
    return this.stack.length;
  }

  /** Clear all traps */
  clear(): void {
    while (this.stack.length > 0) {
      this.pop();
    }
  }
}
