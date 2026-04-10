/**
 * Focus Manager: Track active element, manage focus history,
 * provide focusable element queries, handle roving/focus rings,
 * and enforce focus containment within scopes.
 */

// --- Types ---

export interface FocusEntry {
  /** Element that received focus */
  element: HTMLElement;
  /** Timestamp of focus event */
  timestamp: number;
  /** Related data */
  data?: unknown;
}

export interface FocusHistoryOptions {
  /** Max entries to keep (default: 50) */
  maxSize?: number;
}

export interface FocusRingOptions {
  /** Elements to include in the ring */
  elements?: HTMLElement[];
  /** Ring offset in px (default: 2) */
  offset?: number;
  /** Ring color (default: #4f46e5) */
  color?: string;
  /** Ring width in px (default: 2) */
  width?: number;
  /** Border radius (default: match element) */
  radius?: string | number;
  /** Show ring on keyboard focus only? (default: true) */
  showOnKeyboardOnly?: boolean;
  /** Also show on mouse click? */
  showOnClick?: boolean;
  /** Animation duration ms (default: 100) */
  duration?: number;
  /** Inset distance for outline-offset (default: -2px) */
  inset?: string;
}

export interface FocusScopeOptions {
  /** Container element */
  container: HTMLElement;
  /** Auto-focus first element when scope activates? */
  autoFocus?: boolean;
  /** Return focus to previous element on deactivate? */
  restoreFocus?: boolean;
  /** Trap focus within scope? */
  trap?: boolean;
  /** On escape key handler */
  onEscape?: () => void;
}

export interface FocusManagerConfig {
  /** Enable focus history tracking? (default: true) */
  trackHistory?: boolean;
  /** Default focus ring options */
  defaultRingOptions?: Partial<FocusRingOptions>;
  /** Log focus changes to console? */
  debug?: boolean;
}

// --- State ---

let currentFocus: HTMLElement | null = null;
let focusHistory: FocusEntry[] = [];
const config: Required<FocusManagerConfig> = {
  trackHistory: true,
  debug: false,
  defaultRingOptions: {
    offset: 2,
    color: "#4f46e5",
    width: 2,
    showOnKeyboardOnly: true,
    showOnClick: false,
    duration: 100,
    inset: "-2px",
  },
};

// --- Focus History ---

/** Get the focus history (most recent last) */
export function getFocusHistory(): FocusEntry[] {
  return [...focusHistory].reverse();
}

/** Clear focus history */
export function clearFocusHistory(): void {
  focusHistory = [];
}

/** Record a focus event into history */
function recordFocus(el: HTMLElement, data?: unknown): void {
  if (!config.trackHistory) return;

  const entry: FocusEntry = { element: el, timestamp: Date.now(), data };
  focusHistory.push(entry);

  // Trim to max size
  const maxSize = 50;
  if (focusHistory.length > maxSize) {
    focusHistory = focusHistory.slice(-maxSize);
  }

  if (config.debug) {
    console.log(
      `[Focus] ${el.tagName}${el.id ? `#${el.id}` : ""} "${el.className?.slice(0, 40)}"`,
      entry,
    );
  }
}

// --- Focus Tracking ---

/**
 * Start tracking focus changes globally.
 * Returns cleanup function.
 */
export function startFocusTracking(cleanup?: FocusManagerConfig): () => void {
  if (cleanup) Object.assign(config, cleanup);

  document.addEventListener("focusin", handleFocusIn as EventListener, true);
  document.addEventListener("focusout", handleFocusOut as EventListener, true);

  return () => {
    document.removeEventListener("focusin", handleFocusIn as EventListener, true);
    document.removeEventListener("focusout", handleFocusOut as EventListener, true);
  };
}

function handleFocusIn(e: FocusEvent): void {
  const target = e.target as HTMLElement;
  if (target === document.body || target === document.documentElement) return;

  currentFocus = target;
  recordFocus(target);
}

function handleFocusOut(e: FocusEvent): void {
  if (e.target === currentFocus && e.relatedTarget !== null) {
    currentFocus = null;
  }
}

/** Get currently focused element */
export function getFocusedElement(): HTMLElement | null {
  return currentFocus || document.activeElement as HTMLElement;
}

// --- Focus Ring (Outline) ---

/**
 * Apply a visible focus ring/outline to one or more elements.
 * Returns cleanup function to remove the ring.
 */
export function applyFocusRing(options: FocusRingOptions): () => void {
  const {
    elements = [],
    offset = 2,
    color = "#4f46e5",
    width = 2,
    radius = "inherit",
    showOnKeyboardOnly = true,
    showOnClick = false,
    duration = 100,
    inset = "-2px",
  } = { ...config.defaultRingOptions, ...options };

  const cleanupFns: Array<() => void> = [];

  for (const el of elements) {
    el.style.outlineOffset = `${offset}px`;
    el.style.outlineColor = color;
    el.style.outlineWidth = `${width}px`;
    el.style.outlineStyle = "solid";
    el.style.borderRadius = typeof radius === "number" ? `${radius}px` : radius;
    el.style.transition = `outline-color ${duration}ms ease, outline-offset ${duration}ms ease`;

    const remove = () => {
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.outlineColor = "";
      el.style.outlineWidth = "";
      el.style.outlineStyle = "";
      el.style.borderRadius = "";
      el.style.transition = "";
    };

    cleanupFns.push(remove);
  }

  return () => {
    for (const fn of cleanupFns) fn();
  };
}

// --- Focus Scope ---

/**
 * Create a focus scope that traps focus within a container.
 * Useful for modals, dialogs, and popovers.
 */
export function createFocusScope(options: FocusScopeOptions): {
  const {
    container,
    autoFocus = true,
    restoreFocus = true,
    trap = true,
    onEscape,
  } = options;

  let previouslyFocused: HTMLElement | null = null;
  let active = false;
  let destroyed = false;
  const scopeElements = new Set<HTMLElement>();

  function collectFocusable(): HTMLElement[] {
    const selector = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]:not([disabled])',
    ].join(", ");

    return Array.from(container.querySelectorAll<HTMLElement>(selector))
      .filter((el) => !scopeElements.has(el));
  }

  function activate(): void {
    if (active || destroyed) return;
    active = true;

    previouslyFocused = document.activeElement as HTMLElement;

    // Collect all focusable elements
    scopeElements.clear();
    collectFocusable();

    if (autoAutoFocus) {
      const first = collectFocusable()[0];
      if (first) first.focus();
    }

    // Keydown handler for Tab trapping
    document.addEventListener("keydown", handleKeyDown);

    // Mark all interactive children with data attribute
    for (const el of collectFocusable()) {
      el.dataset.focusScope = "true";
      scopeElements.add(el);
    }
  }

  function deactivate(): void {
    if (!active || destroyed) return;
    active = false;

    document.removeEventListener("keydown", handleKeyDown);

    // Remove markers
    for (const el of scopeElements) {
      delete el.dataset.focusScope;
    }
    scopeElements.clear();

    if (restoreFocus && previouslyFocused && previouslyFocused.isConnected) {
      previouslyFocused.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (!trap || !active) return;
    if (e.key !== "Tab") return;
    e.preventDefault();

    const focusable = collectFocusable();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last?.focus();
      }
    } else {
      if (document.activeElement === last || !focusable.includes(document.activeElement)) {
        first?.focus();
      }
    }
  }

  // Escape handling
  if (onEscape) {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", escHandler);
  }

  return {
    activate,
    deactivate,
    destroy() {
      destroyed = true;
      deactivate();
      document.removeEventListener("keydown", handleKeyDown);
      if (onEscape) {
        document.removeEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Escape") onEscape();
        });
      }
    },
    isActive: () => active,
  };
}

// --- Tab Index Utilities ---

/**
 * Make an element focusable via tabindex.
 * Returns cleanup to restore original state.
 */
export function makeFocusable(
  element: HTMLElement,
  options?: { tabIndex?: number; trap?: boolean },
): () => void {
  const prevTabIndex = element.hasAttribute("tabindex")
    ? element.getAttribute("tabindex")
    : null;

  element.setAttribute("tabindex", String(options?.tabIndex ?? 0));

  return () => {
    if (prevTabIndex === null) {
      element.removeAttribute("tabindex");
    } else {
      element.setAttribute("tabindex", prevTabIndex);
    }
  };
}

/**
 * Find next focusable element after (or before) a given element.
 */
export function findNextFocusable(
  from: HTMLElement,
  direction: "next" | "prev" | "first" | "last",
  container?: HTMLElement,
): HTMLElement | null {
  const root = container ?? document.body;
  const selector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(", ");

  const all = Array.from(root.querySelectorAll<HTMLElement>(selector))
    .filter((el) => el.offsetParent !== null);

  const idx = all.indexOf(from);
  if (idx < 0) return all[0] ?? null;

  switch (direction) {
    case "next": return all[idx + 1] ?? null;
    case "prev": return all[idx - 1] ?? null;
    case "first": return all[0] ?? null;
    case "last": return all[all.length - 1] ?? null;
  }
}
