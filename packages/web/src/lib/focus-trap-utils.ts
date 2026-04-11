/**
 * Focus Trap Utilities: Advanced focus trapping for modals, dialogs, drawers,
 * popovers, and any overlay UI. Supports nested traps, tab order management,
 * focus restoration, auto-focus strategies, and escape key handling.
 */

// --- Types ---

export type AutoFocusStrategy = "first" | "last" | "container" | "none" | "selector";

export interface FocusTrapConfig {
  /** Element to trap focus within */
  container: HTMLElement;
  /** Where to focus on activation */
  autoFocus?: AutoFocusStrategy;
  /** CSS selector for auto-focus target (when strategy is "selector") */
  autoFocusSelector?: string;
  /** Whether Escape deactivates the trap */
  escapeDeactivates?: boolean;
  /** Whether clicking outside deactivates */
  clickOutsideDeactivates?: boolean;
  /** Element to return focus to on deactivate */
  returnFocus?: HTMLElement | null;
  /** Additional elements to consider focusable (beyond standard selectors) */
  additionalFocusable?: string[];
  /** Elements to exclude from the trap */
  excludeSelector?: string;
  /** Delay before initial focus (ms) */
  initialFocusDelay?: number;
  /** Called when trap activates */
  onActivate?: () => void;
  /** Called when trap deactivates */
  onDeactivate?: () => void;
  /** Called when focus attempts to leave the trap */
  onEscape?: (e: KeyboardEvent) => void;
  /** Pause the trap temporarily (allow Tab to escape) */
  initiallyPaused?: boolean;
}

export interface FocusTrapState {
  isActive: boolean;
  isPaused: boolean;
  focusedElement: HTMLElement | null;
  previousActiveElement: HTMLElement | null;
}

export interface FocusableInfo {
  element: HTMLElement;
  tabIndex: number;
  orderIndex: number;
}

// --- Focusable Selectors ---

const DEFAULT_FOCUSABLE_SELECTORS = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]:not([tabindex="-1"])',
  'audio[controls]:not([tabindex="-1"])',
  'video[controls]:not([tabindex="-1"])',
  'summary:not([tabindex="-1"])',
].join(", ");

/** Check if an element is visible and focusable */
function isElementVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (style.opacity === "0" && style.pointerEvents === "none") return false;

  // Check if element or any ancestor has inert
  let current: Element | null = el;
  while (current) {
    if (current.hasAttribute("inert")) return false;
    current = current.parentElement;
  }

  return true;
}

/** Get all focusable elements inside a container in tab order */
export function getTabbableElements(
  container: HTMLElement,
  options?: { additionalSelectors?: string[]; excludeSelector?: string },
): FocusableInfo[] {
  const additional = options?.additionalSelectors ?? [];
  const exclude = options?.excludeSelector;
  const selector = [DEFAULT_FOCUSABLE_SELECTORS, ...additional].join(", ");

  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));

  // Include the container itself if it's focusable
  if (container.matches && container.matches(selector)) {
    elements.unshift(container);
  }

  return elements
    .filter((el) => isElementVisible(el))
    .filter((el) => !exclude || !el.matches(exclude))
    .map((el, index) => ({
      element: el,
      tabIndex: el.tabIndex >= 0 ? el.tabIndex : 0,
      orderIndex: index,
    }))
    .sort((a, b) => a.tabIndex - b.tabIndex || a.orderIndex - b.orderIndex);
}

// --- Core Focus Trap Class ---

/**
 * FocusTrap - advanced focus containment for modal/overlay patterns.
 *
 * @example
 * ```ts
 * const trap = new FocusTrap({
 *   container: modalEl,
 *   escapeDeactivates: true,
 *   returnFocus: triggerButton,
 * });
 * trap.activate();
 * // ... user interacts with modal ...
 * trap.deactivate();
 * ```
 */
export class FocusTrap {
  private config: Required<FocusTrapConfig> & { returnFocus: HTMLElement | null };
  private _state: FocusTrapState;
  private _keyHandler: ((e:KeyboardEvent) => void) | null = null;
  private _clickHandler: ((e:MouseEvent) => void) | null = null;
  private _focusInHandler: ((e:FocusEvent) => void) | null = null;
  private _previouslyFocused: HTMLElement | null = null;

  constructor(config: FocusTrapConfig) {
    this.config = {
      autoFocus: config.autoFocus ?? "first",
      autoFocusSelector: config.autoFocusSelector ?? "",
      escapeDeactivates: config.escapeDeactivates ?? true,
      clickOutsideDeactivates: config.clickOutsideDeactivates ?? false,
      returnFocus: config.returnFocus ?? null,
      additionalFocusable: config.additionalFocusable ?? [],
      excludeSelector: config.excludeSelector ?? "",
      initialFocusDelay: config.initialFocusDelay ?? 0,
      onActivate: config.onActivate ?? null!,
      onDeactivate: config.onDeactivate ?? null!,
      onEscape: config.onEscape ?? null!,
      initiallyPaused: config.initiallyPaused ?? false,
      container: config.container,
    };

    this._state = {
      isActive: false,
      isPaused: this.config.initiallyPaused,
      focusedElement: null,
      previousActiveElement: null,
    };
  }

  /** Get current state */
  getState(): FocusTrapState { return { ...this._state }; }

  /** Check if trap is active */
  isActive(): boolean { return this._state.isActive; }

  /** Check if trap is paused */
  isPaused(): boolean { return this._state.isPaused; }

  /**
   * Activate the focus trap.
   * Saves the currently focused element, sets up event listeners,
   * and moves focus to the configured target.
   */
  activate(): void {
    if (this._state.isActive) return;

    this._previouslyFocused = document.activeElement as HTMLElement;
    this._state.isActive = true;
    this._state.previousActiveElement = this._previouslyFocused;

    // Set up keyboard handler
    this._keyHandler = (e: KeyboardEvent) => this._handleKeyDown(e);
    document.addEventListener("keydown", this._keyHandler);

    // Set up click-outside handler
    if (this.config.clickOutsideDeactivates) {
      this._clickHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!this.config.container.contains(target)) {
          this.deactivate();
        }
      };
      document.addEventListener("mousedown", this._clickHandler);
    }

    // Set up focus-in handler to catch programmatic focus escaping
    this._focusInHandler = (e: FocusEvent) => {
      if (!this._state.isActive || this._state.isPaused) return;
      const target = e.target as HTMLElement;
      if (!this.config.container.contains(target)) {
        // Focus escaped — redirect back into trap
        e.preventDefault();
        e.stopPropagation();
        this._focusFirst();
      }
    };
    document.addEventListener("focusin", this._focusInHandler!);

    // Auto-focus
    const delay = this.config.initialFocusDelay;
    if (delay > 0) {
      setTimeout(() => this._applyAutoFocus(), delay);
    } else {
      this._applyAutoFocus();
    }

    this.config.onActivate?.();
  }

  /**
   * Deactivate the focus trap.
   * Removes event listeners and restores focus.
   */
  deactivate(): void {
    if (!this._state.isActive) return;

    this._state.isActive = false;

    // Remove listeners
    if (this._keyHandler) {
      document.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }
    if (this._clickHandler) {
      document.removeEventListener("mousedown", this._clickHandler);
      this._clickHandler = null;
    }
    if (this._focusInHandler) {
      document.removeEventListener("focusin", this._focusInHandler);
      this._focusInHandler = null;
    }

    // Restore focus
    const restoreTarget = this.config.returnFocus ?? this._previouslyFocused;
    if (restoreTarget && typeof restoreTarget.focus === "function") {
      restoreTarget.focus({ preventScroll: true });
    }

    this._state.focusedElement = null;
    this.config.onDeactivate?.();
  }

  /** Temporarily pause the trap (allows focus to leave) */
  pause(): void {
    this._state.isPaused = true;
  }

  /** Resume a paused trap */
  resume(): void {
    this._state.isPaused = false;
  }

  /** Update the container (useful for dynamic content) */
  updateContainer(newContainer: HTMLElement): void {
    this.config.container = newContainer;
  }

  /** Programmatically move focus to first element in trap */
  focusFirst(): boolean {
    if (!this._state.isActive) return false;
    return this._focusFirst();
  }

  /** Programmatically move focus to last element in trap */
  focusLast(): boolean {
    if (!this._state.isActive) return false;
    return this._focusLast();
  }

  // --- Private ---

  private _getFocusable(): FocusableInfo[] {
    return getTabbableElements(this.config.container, {
      additionalSelectors: this.config.additionalFocusable,
      excludeSelector: this.config.excludeSelector,
    });
  }

  private _focusFirst(): boolean {
    const focusable = this._getFocusable();
    if (focusable.length === 0) return false;
    focusable[0]!.element.focus();
    this._state.focusedElement = focusable[0]!.element;
    return true;
  }

  private _focusLast(): boolean {
    const focusable = this._getFocusable();
    if (focusable.length === 0) return false;
    const last = focusable[focusable.length - 1]!;
    last.element.focus();
    this._state.focusedElement = last.element;
    return true;
  }

  private _applyAutoFocus(): void {
    switch (this.config.autoFocus) {
      case "first":
        this._focusFirst();
        break;
      case "last":
        this._focusLast();
        break;
      case "container":
        this.config.container.focus({ preventScroll: true });
        this._state.focusedElement = this.config.container;
        break;
      case "selector": {
        if (this.config.autoFocusSelector) {
          const target = this.config.container.querySelector<HTMLElement>(this.config.autoFocusSelector);
          if (target) {
            target.focus();
            this._state.focusedElement = target;
          } else {
            this._focusFirst();
          }
        } else {
          this._focusFirst();
        }
        break;
      }
      case "none":
        // Don't move focus
        break;
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape" && this.config.escapeDeactivates) {
      this.config.onEscape?.(e);
      // Only deactivate if onEscape didn't call preventDefault
      if (!e.defaultPrevented) {
        this.deactivate();
      }
      return;
    }

    if (e.key !== "Tab" || this._state.isPaused) return;

    const focusable = this._getFocusable();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0]!.element;
    const last = focusable[focusable.length - 1]!.element;

    if (e.shiftKey) {
      // Shift+Tab — wrap from first to last
      if (document.activeElement === first ||
          !this.config.container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
        this._state.focusedElement = last;
      }
    } else {
      // Tab — wrap from last to first
      if (document.activeElement === last ||
          !this.config.container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        this._state.focusedElement = first;
      }
    }
  }
}

// --- Stack Manager for Nested Traps ---

/**
 * Manages a stack of active focus traps. When a new trap is activated,
 * the previous one is automatically paused. On deactivation, the previous
 * trap resumes.
 *
 * Useful for nested modals (modal → confirmation dialog → etc.)
 */
export class FocusTrapStack {
  private stack: FocusTrap[] = [];
  private _onEmpty?: () => void;

  constructor(options?: { onStackEmpty?: () => void }) {
    this._onEmpty = options?.onStackEmpty;
  }

  /** Push a new trap onto the stack (pauses previous) */
  push(trap: FocusTrap): void {
    // Pause current top trap
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1]!.pause();
    }
    this.stack.push(trap);
    trap.activate();
  }

  /** Pop and deactivate the top trap (resumes previous) */
  pop(): FocusTrap | undefined {
    const trap = this.stack.pop();
    if (!trap) return undefined;

    trap.deactivate();

    // Resume previous trap
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1]!.resume();
    } else {
      this._onEmpty?.();
    }

    return trap;
  }

  /** Get the currently active trap */
  peek(): FocusTrap | undefined {
    return this.stack[this.stack.length - 1];
  }

  /** Get stack depth */
  get depth(): number { return this.stack.length; }

  /** Clear and deactivate all traps */
  clear(): void {
    while (this.stack.length > 0) {
      const trap = this.stack.pop()!;
      trap.deactivate();
    }
  }
}

// --- Convenience Factory ---

/**
 * Create a focus trap with a simple API. Returns the deactivate function.
 *
 * @example
 * ```ts
 * const close = createFocusTrap(modalEl, { escapeDeactivates: true });
 * // later:
 * close();
 * ```
 */
export function createFocusTrap(
  container: HTMLElement,
  options?: Omit<FocusTrapConfig, "container">,
): () => void {
  const trap = new FocusTrap({ container, ...options });
  trap.activate();
  return () => trap.deactivate();
}
