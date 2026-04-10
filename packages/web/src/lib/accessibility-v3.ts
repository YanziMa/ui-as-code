/**
 * Accessibility v3: WCAG 2.2 compliance toolkit, ARIA attribute management,
 * focus trap/navigate, screen reader announcements, color contrast checking,
 * reduced motion detection, keyboard navigation patterns, skip links,
 * live region management, accessible modal/dialog system, form error linking.
 */

// --- ARIA Attribute Management ---

export interface AriaAttrs {
  role?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-live"?: "off" | "polite" | "assertive";
  "aria-atomic"?: boolean;
  "aria-relevant"?: string;
  "aria-busy"?: boolean;
  "aria-expanded"?: boolean;
  "aria-selected"?: boolean;
  "aria-checked"?: boolean | "mixed";
  "aria-pressed"?: boolean;
  "aria-disabled"?: boolean;
  "aria-hidden"?: boolean;
  "aria-current"?: string;
  "aria-haspopup"?: boolean | string;
  "aria-controls"?: string;
  "aria-owns"?: string;
  "aria-flowto"?: string;
  "aria-keyshortcuts"?: string;
  "aria-roledescription"?: string;
  "aria-braillelabel"?: string;
  "aria-brailleroledescription"?: string;
  // Widget attributes
  "aria-autocomplete"?: "inline" | "list" | "both" | "none";
  "aria-multiline"?: boolean;
  "aria-readonly"?: boolean;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean | "grammar" | "spelling";
  "aria-placeholder"?: string;
  // Range
  "aria-valuemin"?: number;
  "aria-valuemax"?: number;
  "aria-valuenow"?: number;
  "aria-valuetext"?: string;
  // Structure
  "aria-level"?: number;
  "aria-setsize"?: number;
  "aria-posinset"?: number;
  "aria-colcount"?: number;
  "aria-colindex"?: number;
  "aria-rowcount"?: number;
  "aria-rowindex"?: number;
}

/** Set multiple ARIA attributes on an element */
export function setAria(el: Element, attrs: Partial<AriaAttrs>): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) {
      el.removeAttribute(key);
    } else if (typeof value === "boolean") {
      el.setAttribute(key, String(value));
    } else if (value === false && key.startsWith("aria-")) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

/** Get all ARIA attributes from an element */
export function getAria(el: Element): AriaAttrs {
  const attrs: AriaAttrs = {};
  for (const attr of el.attributes) {
    if (attr.name.startsWith("aria-") || attr.name === "role") {
      (attrs as Record<string, unknown>)[attr.name] = attr.value;
    }
  }
  return attrs;
}

// --- Focus Management ---

/** Trap focus within a container element (for modals, dialogs) */
export function createFocusTrap(container: HTMLElement): { activate: () => void; deactivate: () => void; updateContainer: (el: HTMLElement) => void } {
  let active = false;
  let previouslyFocused: HTMLElement | null = null;

  const getFocusableElements = (): HTMLElement[] => {
    const selector = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
    ].join(", ");
    return Array.from(container.querySelectorAll<HTMLElement>(selector))
      .filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const focusedIndex = focusable.indexOf(document.activeElement as HTMLElement);
    let nextIndex: number;

    if (e.shiftKey) {
      nextIndex = focusedIndex <= 0 ? focusable.length - 1 : focusedIndex - 1;
    } else {
      nextIndex = focusedIndex >= focusable.length - 1 ? 0 : focusedIndex + 1;
    }

    focusable[nextIndex]?.focus();
  };

  return {
    activate() {
      if (active) return;
      active = true;
      previouslyFocused = document.activeElement as HTMLElement;
      container.addEventListener("keydown", handleKeyDown);
      // Focus first focusable element
      const focusable = getFocusableElements();
      focusable[0]?.focus();
    },
    deactivate() {
      if (!active) return;
      active = false;
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
      previouslyFocused = null;
    },
    updateContainer(newContainer: HTMLElement) {
      container.removeEventListener("keydown", handleKeyDown);
      container = newContainer;
      if (active) container.addEventListener("keydown", handleKeyDown);
    },
  };
}

/** Move focus to next/previous focusable element in tab order */
export function navigateFocus(direction: "next" | "previous", root: Element = document.body): HTMLElement | null {
  const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';
  const elements = Array.from(root.querySelectorAll<HTMLElement>(selector));
  const currentIndex = elements.indexOf(document.activeElement as HTMLElement);

  let targetIndex: number;
  if (direction === "next") {
    targetIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0;
  } else {
    targetIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1;
  }

  const target = elements[targetIndex];
  target?.focus({ preventScroll: true });
  return target ?? null;
}

/** Focus an element with scroll into view option */
export function focusElement(el: HTMLElement, options?: { scrollIntoView?: boolean; preventScroll?: boolean }): void {
  el.focus(options);
}

// --- Screen Reader Announcements ---

let announcerEl: HTMLDivElement | null = null;

function getAnnouncer(): HTMLDivElement {
  if (!announcerEl) {
    announcerEl = document.createElement("div");
    announcerEl.setAttribute("aria-live", "polite");
    announcerEl.setAttribute("aria-atomic", "true");
    announcerEl.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
    document.body.appendChild(announcerEl);
  }
  return announcerEl;
}

/** Announce message to screen readers */
export function announce(message: string, priority: "polite" | "assertive" = "polite"): void {
  const el = getAnnouncer();
  el.setAttribute("aria-live", priority);
  // Clear and set to force re-read
  el.textContent = "";
  requestAnimationFrame(() => { el.textContent = message; });
}

/** Announce assertively (for important messages) */
export function announceAssertive(message: string): void { announce(message, "assertive"); }

/** Create a dedicated live region for a specific component */
export function createLiveRegion(options?: { polite?: boolean; atomic?: boolean; relevant?: string }): { announce: (msg: string) => void; destroy: () => void } {
  const region = document.createElement("div");
  region.setAttribute("aria-live", options?.polite !== false ? "polite" : "assertive");
  region.setAttribute("aria-atomic", String(options?.atomic !== false));
  if (options?.relevant) region.setAttribute("aria-relevant", options.relevant);
  region.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
  document.body.appendChild(region);

  return {
    announce(msg: string) { region.textContent = ""; requestAnimationFrame(() => { region.textContent = msg; }); },
    destroy() { region.remove(); },
  };
}

// --- Color Contrast Checking ---

interface RgbColor { r: number; g: number; b: number }

/** Parse hex color to RGB */
function parseHex(hex: string): RgbColor {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/** Calculate relative luminance per WCAG 2.x */
function relativeLuminance(rgb: RgbColor): number {
  const sRGB = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * sRGB(rgb.r) + 0.7152 * sRGB(rgb.g) + 0.0722 * sRGB(rgb.b);
}

/** Calculate contrast ratio between two colors */
export function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(parseHex(foreground));
  const bg = relativeLuminance(parseHex(background));
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Check WCAG AA compliance level */
export interface ContrastResult {
  ratio: number;
  passesAA: boolean;       // Normal text (4.5:1)
  passesAALarge: boolean;  // Large text (3:1)
  passesAAA: boolean;      // Normal text (7:1)
  passesAAALarge: boolean; // Large text (4.5:1)
  level: "Fail" | "AA" | "AAA";
  recommendation: string;
}

export function checkContrast(fg: string, bg: string, isLargeText = false): ContrastResult {
  const ratio = contrastRatio(fg, bg);
  const passesAA = ratio >= 4.5;
  const passesAALarge = ratio >= 3;
  const passesAAA = ratio >= 7;
  const passesAAALarge = ratio >= 4.5;

  let level: "Fail" | "AA" | "AAA" = "Fail";
  if ((isLargeText ? passesAAALarge : passesAAA)) level = "AAA";
  else if ((isLargeText ? passesAALarge : passesAA)) level = "AA";

  const recommendation = ratio < 3
    ? "Contrast too low. Consider using significantly different colors."
    : ratio < 4.5
    ? "Below AA threshold. Increase contrast between foreground and background."
    : ratio < 7
    ? "Meets AA standard. For AAA compliance, further increase contrast."
    : "Excellent contrast! Meets AAA standard.";

  return { ratio, passesAA, passesAALarge, passesAAA, passesAAALarge, level, recommendation };
}

// --- Skip Links ---

/** Create skip navigation link(s) for keyboard users */
export function createSkipLinks(targets: Array<{ id: string; label: string }>): HTMLElement {
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Skip navigation");
  nav.className = "skip-links";

  const style = document.createElement("style");
  style.textContent = `
    .skip-links { position: fixed; top: -100px; left: 0; z-index: 99999; display: flex; gap: 8px; padding: 8px; background: #000; border-radius: 0 0 8px 0; transition: top 0.2s; }
    .skip-links:focus-within { top: 0; }
    .skip-link { color: #fff; text-decoration: none; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: 600; }
    .skip-link:hover, .skip-link:focus { background: #333; outline: 2px solid #fff; outline-offset: 2px; }
  `;
  nav.appendChild(style);

  for (const target of targets) {
    const link = document.createElement("a");
    link.href = `#${target.id}`;
    link.className = "skip-link";
    link.textContent = target.label;
    nav.appendChild(link);
  }

  document.body.prepend(nav);
  return nav;
}

// --- Accessible Modal/Dialog System ---

export interface ModalOptions {
  title: string;
  content: HTMLElement | string;
  onClose?: () => void;
  size?: "sm" | "md" | "lg" | "full";
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  focusTrap?: boolean;
  labelledBy?: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
}

export class AccessibleModal {
  private overlay: HTMLDivElement;
  private dialog: HTMLDivElement;
  private focusTrap: ReturnType<typeof createFocusTrap> | null = null;
  private previousActive: HTMLElement | null = null;
  private _open = false;

  constructor(private options: ModalOptions) {
    this.overlay = document.createElement("div");
    this.overlay.className = "a11y-modal-overlay";
    this.overlay.setAttribute("role", "presentation");

    this.dialog = document.createElement("div");
    this.dialog.setAttribute("role", options.role ?? "dialog");
    this.dialog.setAttribute("aria-modal", "true");
    this.dialog.setAttribute("aria-labelledby", `modal-title-${Date.now()}`);
    if (options.describedBy) this.dialog.setAttribute("aria-describedby", options.describedBy);

    const sizeClass = options.size === "sm" ? "a11y-modal-sm" : options.size === "lg" ? "a11y-modal-lg" : options.size === "full" ? "a11y-modal-full" : "a11y-modal-md";
    this.dialog.className = `a11y-dialog ${sizeClass}`;

    // Build content
    const header = document.createElement("header");
    header.className = "a11y-modal-header";

    const title = document.createElement("h2");
    title.id = this.dialog.getAttribute("aria-labelledby")!;
    title.textContent = options.title;
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close dialog");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => this.close());
    header.appendChild(closeBtn);

    this.dialog.appendChild(header);

    const body = document.createElement("div");
    body.className = "a11y-modal-body";
    if (typeof options.content === "string") body.innerHTML = options.content;
    else body.appendChild(options.content);
    this.dialog.appendChild(body);

    this.overlay.appendChild(this.dialog);

    // Styles
    const style = document.createElement("style");
    style.textContent = `
      .a11y-modal-overlay { position: fixed; inset: 0; z-index: 10000; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }
      .a11y-modal-overlay[aria-hidden="false"] { display: flex; }
      .a11y-dialog { background: var(--bg, #fff); color: var(--fg, #1a1a1a); border-radius: 12px; box-shadow: 0 25px 50px rgba(0,0,0,0.25); max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
      .a11y-modal-sm { width: 400px; } .a11y-modal-md { width: 560px; } .a11y-modal-lg { width: 800px; } .a11y-modal-full { width: 95vw; height: 95vh; }
      .a11y-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #eee; }
      .a11y-modal-header h2 { margin: 0; font-size: 18px; font-weight: 600; }
      .a11y-modal-header button { background: none; border: none; font-size: 24px; cursor: pointer; padding: 4px 8px; border-radius: 4px; color: #666; }
      .a11y-modal-header button:hover { background: #f0f0f0; }
      .a11y-modal-body { padding: 20px; overflow-y: auto; flex: 1; }
    `;
    this.overlay.appendChild(style);

    // Event handlers
    if (options.closeOnEscape !== false) {
      this.overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") this.close(); });
    }
    if (options.closeOnBackdrop !== false) {
      this.overlay.addEventListener("click", (e) => { if (e.target === this.overlay) this.close(); });
    }
  }

  get open(): boolean { return this._open; }

  open(): void {
    if (this._open) return;
    this.previousActive = document.activeElement as HTMLElement;
    document.body.appendChild(this.overlay);
    this.overlay.setAttribute("aria-hidden", "false");
    this.overlay.style.display = "flex";
    document.body.style.overflow = "hidden";

    if (this.options.focusTrap !== false) {
      this.focusTrap = createFocusTrap(this.dialog);
      this.focusTrap.activate();
    }

    this._open = true;
    announce(`Dialog opened: ${this.options.title}`);
  }

  close(): void {
    if (!this._open) return;
    this.focusTrap?.deactivate();
    this.overlay.setAttribute("aria-hidden", "true");
    this.overlay.style.display = "none";
    document.body.style.overflow = "";
    this.previousActive?.focus();
    this._open = false;
    this.options.onClose?.();
  }

  destroy(): void { this.close(); this.overlay.remove(); }

  /** Update modal content dynamically */
  updateContent(content: HTMLElement | string): void {
    const body = this.dialog.querySelector(".a11y-modal-body");
    if (body) { body.innerHTML = ""; if (typeof content === "string") body.innerHTML = content; else body.appendChild(content); }
  }
}

// --- Form Accessibility Helpers ---

/** Link form field errors to their inputs via aria-describedby */
export function linkErrorToInput(input: HTMLElement, errorEl: HTMLElement): void {
  const errorId = `error-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  errorEl.id = errorId;
  errorEl.setAttribute("role", "alert");
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", errorId);
  input.setAttribute("aria-errormessage", errorId);
}

/** Clear error state from input */
export function clearInputError(input: HTMLElement): void {
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");
  input.removeAttribute("aria-errormessage");
}

/** Create accessible fieldset with legend */
export function createFieldSet(legend: string, children: HTMLElement[]): HTMLFieldSetElement {
  const fs = document.createElement("fieldset");
  fs.innerHTML = `<legend>${legend}</legend>`;
  for (const child of children) fs.appendChild(child);
  return fs;
}

/** Mark required fields with asterisk and aria-required */
export function markRequired(input: HTMLElement, label?: HTMLElement): void {
  input.setAttribute("aria-required", "true");
  if (label) {
    const requiredMark = document.createElement("span");
    requiredMark.setAttribute("aria-hidden", "true");
    requiredMark.textContent = " *";
    requiredMark.style.color = "#d00";
    label.appendChild(requiredMark);
  }
}

// --- Reduced Motion & User Preferences ---

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Get animation duration respecting reduced motion preference */
export function safeDuration(ms: number, fallbackMs = 0): number {
  return prefersReducedMotion() ? fallbackMs : ms;
}

/** Apply or skip CSS transition based on preference */
export function applyMotion(el: HTMLElement, transition: string): void {
  if (!prefersReducedMotion()) el.style.transition = transition;
}

/** Detect high contrast mode */
export function prefersHighContrast(): boolean {
  return window.matchMedia("(prefers-contrast: more)").matches;
}

/** Detect forced colors mode (Windows High Contrast) */
export function forcedColorsActive(): boolean {
  return window.matchMedia("(forced-colors: active)").matches;
}

// --- Keyboard Navigation Patterns ---

/** Roving tabindex pattern for list/grid navigation */
export function createRoveList(container: HTMLElement, options?: { orientation?: "horizontal" | "vertical" | "grid"; loop?: boolean; onSelect?: (el: HTMLElement, index: number) => void }): { destroy: () => void; setCurrent: (index: number) => void } {
  const items = Array.from(container.querySelectorAll<HTMLElement>("[data-rove-item]"));
  if (items.length === 0) return { destroy: () => {}, setCurrent: () => {} };

  let currentIndex = 0;
  const orient = options?.orientation ?? "vertical";
  const shouldLoop = options?.loop ?? true;

  // Set initial tabindex
  items.forEach((item, i) => item.setAttribute("tabindex", i === 0 ? "0" : "-1"));

  const handleKeydown = (e: KeyboardEvent): void => {
    let nextIndex = currentIndex;
    const prevKeys = orient === "horizontal" ? ["ArrowLeft"] : ["ArrowUp"];
    const nextKeys = orient === "horizontal" ? ["ArrowRight"] : ["ArrowDown"];

    if (prevKeys.includes(e.key)) {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : (shouldLoop ? items.length - 1 : currentIndex);
    } else if (nextKeys.includes(e.key)) {
      e.preventDefault();
      nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : (shouldLoop ? 0 : currentIndex);
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = items.length - 1;
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      options?.onSelect?.(items[currentIndex]!, currentIndex);
      return;
    } else {
      return;
    }

    items[currentIndex].setAttribute("tabindex", "-1");
    currentIndex = nextIndex;
    items[currentIndex].setAttribute("tabindex", "0");
    items[currentIndex].focus({ preventScroll: true });
  };

  container.addEventListener("keydown", handleKeydown);

  return {
    destroy() { container.removeEventListener("keydown", handleKeydown); items.forEach((item) => item.removeAttribute("tabindex")); },
    setCurrent(index: number) {
      if (index >= 0 && index < items.length) {
        items[currentIndex].setAttribute("tabindex", "-1");
        currentIndex = index;
        items[currentIndex].setAttribute("tabindex", "0");
        items[currentIndex].focus({ preventScroll: true });
      }
    },
  };
}
