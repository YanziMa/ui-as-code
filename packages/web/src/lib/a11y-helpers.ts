/**
 * Accessibility (a11y) helpers: screen reader announcements, focus management,
 * ARIA attribute helpers, keyboard navigation patterns, live regions,
 * skip links, reduced motion detection, color contrast utilities,
 * roving tabindex, and accessible modal/dialog patterns.
 */

// --- Screen Reader Announcements ---

/** Create or reuse a visually hidden live region for announcements */
export function createAnnouncer(options?: { polite?: boolean; assertive?: string }): HTMLElement {
  const existing = document.getElementById("a11y-announcer");
  if (existing) return existing;

  const announcer = document.createElement("div");
  announcer.id = "a11y-announcer";
  announcer.setAttribute("role", "status");
  announcer.setAttribute("aria-live", options?.assertive ? "assertive" : (options?.polite ? "polite" : "polite"));
  announcer.setAttribute("aria-atomic", "true");
  Object.assign(announcer.style, {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: "0",
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: "0",
  });
  document.body.appendChild(announcer);
  return announcer;
}

/** Announce a message to screen readers */
export function announce(message: string, options?: { priority?: "polite" | "assertive"; clear?: boolean }): void {
  const announcer = createAnnouncer({ assertive: options?.priority === "assertive" });

  // Update aria-live role for priority
  if (options?.priority === "assertive") {
    announcer.setAttribute("aria-live", "assertive");
  } else {
    announcer.setAttribute("aria-live", "polite");
  }

  // Clear previous content first to ensure re-announcement
  if (options?.clear !== false) {
    announcer.textContent = "";
  }
  // Small delay to ensure the DOM update is detected
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

/** Announce an error message (assertive priority) */
export function announceError(message: string): void {
  announce(message, { priority: "assertive" });
}

/** Announce a status message (polite priority) */
export function announceStatus(message: string): void {
  announce(message, { priority: "polite" });
}

// --- Focus Management ---

/** Save current focus position, returns restore function */
export function captureFocus(): () => void {
  const activeEl = document.activeElement as HTMLElement | null;
  return () => activeEl?.focus();
}

/** Move focus into a container (focuses first focusable element) */
export function focusFirst(container: HTMLElement): HTMLElement | null {
  const el = getFirstFocusable(container);
  if (el) { el.focus(); return el; }
  return null;
}

/** Move focus to last focusable element in container */
export function focusLast(container: HTMLElement): HTMLElement | null {
  const el = getLastFocusable(container);
  if (el) { el.focus(); return el; }
  return null;
}

/** Get first focusable element within container */
export function getFirstFocusable(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
}

/** Get last focusable element within container */
export function getLastFocusable(root: ParentNode = document): HTMLElement | null {
  const all = root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  return all.length > 0 ? all[all.length - 1]! : null;
}

/** Get all focusable elements in order */
export function getFocusableElements(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ));
}

/** Check if an element is focusable */
export function isFocusable(el: Element): boolean {
  if (el.hasAttribute("disabled") || el.getAttribute("tabindex") === "-1") return false;
  const tag = el.tagName.toLowerCase();
  const focusableTags = ["a", "button", "input", "select", "textarea"];
  if (focusableTags.includes(tag)) {
    if (tag === "a") return (el as HTMLAnchorElement).href !== "";
    return true;
  }
  return el.hasAttribute("tabindex");
}

// --- Roving Tabindex (Arrow Key Navigation) ---

/**
 * Set up roving tabindex pattern for arrow key navigation.
 * Used for tab lists, menus, toolbars, etc.
 */
export function setupRovingTabindex(
  container: HTMLElement,
  options?: {
    orientation?: "horizontal" | "vertical" | "both";
    loop?: boolean;
    /** Called when focused item changes */
    onFocusChange?: (element: HTMLElement, index: number) => void;
    /** Filter which elements are included */
    selector?: string;
  },
): () => void {
  const {
    orientation = "horizontal",
    loop = true,
    onFocusChange,
    selector = '[role="tab"], [role="menuitem"], [role="option"], [data-roving]',
  } = options ?? {};

  const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
  if (items.length === 0) return () => {};

  let currentIndex = items.findIndex((el) => el === document.activeElement);
  if (currentIndex < 0) currentIndex = 0;

  function setFocus(index: number): void {
    const clampedIndex = loop
      ? ((index % items.length) + items.length) % items.length
      : Math.max(0, Math.min(items.length - 1, index));

    items[clampedIndex]?.setAttribute("tabindex", "0");
    items[clampedIndex]?.focus();

    // Remove tabindex from others
    items.forEach((item, i) => {
      if (i !== clampedIndex) item.setAttribute("tabindex", "-1");
    });

    currentIndex = clampedIndex;
    onFocusChange?.(items[clampedIndex]!, clampedIndex);
  }

  // Initialize: set first item as tabbable
  items.forEach((item, i) => {
    item.setAttribute("tabindex", i === currentIndex ? "0" : "-1");
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowRight":
        if (orientation === "horizontal" || orientation === "both") newIndex++;
        break;
      case "ArrowLeft":
        if (orientation === "horizontal" || orientation === "both") newIndex--;
        break;
      case "ArrowDown":
        if (orientation === "vertical" || orientation === "both") newIndex++;
        break;
      case "ArrowUp":
        if (orientation === "vertical" || orientation === "both") newIndex--;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = items.length - 1;
        break;
      default:
        return; // Don't prevent default for unhandled keys
    }

    e.preventDefault();
    setFocus(newIndex);
  };

  container.addEventListener("keydown", handleKeyDown);

  return () => {
    container.removeEventListener("keydown", handleKeyDown);
    items.forEach((item) => item.removeAttribute("tabindex"));
  };
}

// --- Skip Links ---

/** Create and insert a skip link for accessibility */
export function createSkipLink(
  targetId: string,
  text = "Skip to main content",
  options?: { className?: string; id?: string },
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = `#${targetId}`;
  link.textContent = text;
  link.className = options?.className ?? "skip-link";
  if (options?.id) link.id = options.id;

  Object.assign(link.style, {
    position: "absolute",
    top: "-40px",
    left: "0",
    background: "#000",
    color: "#fff",
    padding: "8px 16px",
    textDecoration: "none",
    zIndex: "100",
    transition: "top 0.2s",
  });

  // Show on focus
  link.addEventListener("focus", () => { link.style.top = "0"; });
  link.addEventListener("blur", () => { link.style.top = "-40px"; });

  document.body.prepend(link);
  return link;
}

// --- ARIA Attribute Helpers ---

/** Set multiple ARIA attributes at once */
export function setAria(element: HTMLElement, attrs: Record<string, string>): void {
  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(`aria-${key}`, value);
  }
}

/** Remove ARIA attributes */
export function removeAria(element: HTMLElement, ...attrs: string[]): void {
  for (const attr of attrs) {
    element.removeAttribute(`aria-${attr}`);
  }
}

/** Mark an element as busy/loading */
export function setBusy(element: HTMLElement, busy = true): void {
  element.setAttribute("aria-busy", String(busy));
}

/** Set expanded state (for accordions, disclosures) */
export function setExpanded(element: HTMLElement, expanded: boolean): void {
  element.setAttribute("aria-expanded", String(expanded));
}

/** Toggle expanded state */
export function toggleExpanded(element: HTMLElement): boolean {
  const isExpanded = element.getAttribute("aria-expanded") === "true";
  setExpanded(element, !isExpanded);
  return !isExpanded;
}

/** Set selected state */
export function setSelected(element: HTMLElement, selected: boolean): void {
  element.setAttribute("aria-selected", String(selected));
}

/** Set pressed state (for toggle buttons) */
export function setPressed(element: HTMLElement, pressed: boolean): void {
  element.setAttribute("aria-pressed", String(pressed));
}

/** Set disabled state with proper ARIA */
export function setDisabled(element: HTMLElement, disabled: boolean): void {
  element.disabled = disabled;
  element.setAttribute("aria-disabled", String(disabled));
  if (disabled) element.setAttribute("tabindex", "-1");
  else element.removeAttribute("tabindex");
}

/** Hide an element accessibly (visually hidden but still in DOM) */
export function hideVisually(element: HTMLElement): void {
  element.setAttribute("aria-hidden", "true");
  element.setAttribute("inert", "");
}

/** Show a previously hidden element */
export function showVisually(element: HTMLElement): void {
  element.removeAttribute("aria-hidden");
  element.removeAttribute("inert");
}

/** Create a visually-hidden class style (inject once) */
let srStylesInjected = false;
export function injectScreenReaderOnlyStyles(): void {
  if (srStylesInjected || typeof document === "undefined") return;
  srStylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .sr-only { position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0; }
    .sr-only-focusable:focus { position:static;width:auto;height:auto;padding:0;margin:0;overflow:visible;clip:auto;white-space:normal; }
  `;
  document.head.appendChild(style);
}

// --- Reduced Motion ---

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Subscribe to reduced motion preference changes */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mql.addEventListener("change", handler);
  callback(mql.matches); // Initial call
  return () => mql.removeEventListener("change", handler);
}

/** Get animation duration respecting reduced motion preference */
export function getSafeDuration(normalDuration: number, reducedDuration = 0): number {
  return prefersReducedMotion() ? reducedDuration : normalDuration;
}

// --- Accessible Modal/Dialog Pattern ---

/**
 * Set up accessible dialog with focus trap.
 * Returns cleanup function.
 */
export function setupDialog(
  dialog: HTMLElement,
  triggerButton: HTMLElement,
  options?: {
    onClose?: () => void;
    dismissOnEscape?: boolean;
    dismissOnBackdrop?: boolean;
    initialFocus?: HTMLElement | "first" | "none";
  },
): () => void {
  const {
    onClose,
    dismissOnEscape = true,
    dismissOnBackdrop = true,
    initialFocus = "first",
  } = options ?? {};

  let previouslyFocused: HTMLElement | null = null;

  function open(): void {
    previouslyFocused = document.activeElement as HTMLElement;
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("role", "dialog");
    dialog.removeAttribute("hidden");

    if (initialFocus === "first") focusFirst(dialog);
    else if (initialFocus !== "none") (initialFocus as HTMLElement)?.focus();

    // Trap focus
    setupFocusTrap(dialog);

    // Escape key closes
    if (dismissOnEscape) {
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };
      dialog.addEventListener("keydown", escHandler);
      // Store for cleanup
      (dialog as any).__escHandler = escHandler;
    }
  }

  function close(): void {
    dialog.setAttribute("hidden", "");
    dialog.removeAttribute("aria-modal");
    onClose?.();
    previouslyFocused?.focus();
    const escHandler = (dialog as any).__escHandler;
    if (escHandler) {
      dialog.removeEventListener("keydown", escHandler);
      delete (dialog as any).__escHandler;
    }
  }

  // Trigger button opens dialog
  triggerButton.addEventListener("click", open);
  triggerButton.setAttribute("aria-haspopup", "dialog");
  triggerButton.setAttribute("aria-expanded", "false");

  // Backdrop click dismisses
  if (dismissOnBackdrop) {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) close();
    });
  }

  // Store methods on dialog for external use
  (dialog as any).dialogOpen = open;
  (dialog as any).dialogClose = close;

  return () => {
    triggerButton.removeEventListener("click", open);
    close();
  };
}

function setupFocusTrap(container: HTMLElement): () => void {
  const focusableSelector = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  const handler = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusable = container.querySelectorAll<HTMLElement>(focusableSelector);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

  container.addEventListener("keydown", handler);
  return () => container.removeEventListener("keydown", handler);
}

// --- Label Association ---

/** Ensure form inputs have associated labels */
export function ensureLabel(input: HTMLElement, label?: string): void {
  if (input.getAttribute("aria-label") || input.getAttribute("aria-labelledby")) return;
  if (input.closest("label")) return;
  if ((input as HTMLInputElement).id && document.querySelector(`label[for="${(input as HTMLInputElement).id}"]`)) return;

  if (label) {
    input.setAttribute("aria-label", label);
  }
}

/** Auto-generate labels for form fields without them */
export function autoLabelForm(form: HTMLFormElement): void {
  const inputs = form.querySelectorAll<HTMLElement>(
    'input:not([aria-label]):not([aria-labelledby]), select:not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby])',
  );

  for (const input of inputs) {
    const placeholder = (input as HTMLInputElement).placeholder;
    if (placeholder) {
      input.setAttribute("aria-label", placeholder);
    }
  }
}
