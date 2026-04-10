/**
 * Accessibility Engine: Comprehensive ARIA management, screen reader announcements,
 * focus trapping, skip navigation, reduced-motion detection, high-contrast mode,
 * keyboard navigation utilities, live region management, and WCAG compliance helpers.
 */

// --- Types ---

export type AriaRole =
  | "alert" | "alertdialog" | "application" | "article" | "banner" | "button"
  | "cell" | "checkbox" | "columnheader" | "combobox" | "command" | "complementary"
  | "composite" | "contentinfo" | "definition" | "dialog" | "directory" | "document"
  | "feed" | "figure" | "form" | "grid" | "gridcell" | "group" | "heading" | "img"
  | "link" | "list" | "listbox" | "listitem" | "log" | "main" | "marquee" | "math"
  | "menu" | "menubar" | "menuitem" | "menuitemcheckbox" | "menuitemradio" | "navigation"
  | "none" | "note" | "option" | "presentation" | "progressbar" | "radio" | "radiogroup"
  | "region" | "row" | "rowgroup" | "rowheader" | "scrollbar" | "search" | "searchbox"
  | "separator" | "slider" | "spinbutton" | "status" | "switch" | "tab" | "table"
  | "tablist" | "tabpanel" | "term" | "textbox" | "toolbar" | "tooltip" | "tree"
  | "treegrid" | "treeitem";

export type AriaProperty =
  | "aria-activedescendant" | "aria-atomic" | "aria-autocomplete" | "aria-busy"
  | "aria-checked" | "aria-colcount" | "aria-colindex" | "aria-colspan"
  | "aria-controls" | "aria-current" | "aria-describedby" | "aria-details"
  | "aria-disabled" | "aria-dropeffect" | "aria-errormessage" | "aria-expanded"
  | "aria-flowto" | "aria-haspopup" | "aria-hidden" | "aria-invalid" | "aria-keyshortcuts"
  | "aria-label" | "aria-labelledby" | "aria-level" | "aria-live" | "aria-modal"
  | "aria-multiline" | "aria-multiselectable" | "aria-orientation" | "aria-owns"
  | "aria-placeholder" | "aria-posinset" | "aria-pressed" | "aria-readonly"
  | "aria-relevant" | "aria-required" | "aria-roledescription" | "aria-rowcount"
  | "aria-rowindex" | "aria-rowspan" | "aria-selected" | "aria-setsize" | "aria-sort"
  | "aria-valuemax" | "aria-valuemin" | "aria-valuenow" | "aria-valuetext";

export type LiveRegionPoliteness = "off" | "polite" | "assertive";

export interface A11yConfig {
  /** Default politeness for announcements (default: "polite") */
  defaultPoliteness?: LiveRegionPoliteness;
  /** Enable focus trap debugging visuals (default: false) */
  debugFocusTrap?: boolean;
  /** Custom announcement element (creates one if not provided) */
  announcerElement?: HTMLElement;
  /** Announce duration before clearing (ms, default: 1000) */
  announceClearDelay?: number;
  /** Skip link target selector (default: "main") */
  skipLinkTarget?: string;
  /** Focus outline style for keyboard users */
  focusOutlineStyle?: string;
}

export interface FocusTrapConfig {
  /** Element to trap focus within */
  container: HTMLElement;
  /** Include the container itself in tab order */
  includeContainer?: boolean;
  /** Initial element to focus (default: first focusable) */
  initialFocus?: HTMLElement | null;
  /** Element to focus on deactivate (default: previously focused) */
  returnFocus?: HTMLElement | null;
  /** Allow Escape key to deactivate */
  escapeDeactivates?: boolean;
  /** Delay before activating trap (ms) */
  delay?: number;
  /** Additional keys that deactivate */
  additionalDeactivators?: string[];
  /** Called when trap activates */
  onActivate?: () => void;
  /** Called when trap deactivates */
  onDeactivate?: () => void;
}

export interface FocusableElement {
  element: HTMLElement;
  index: number;
  tabIndex: number;
}

// --- Environment Detection ---

/** Detect if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Detect if user prefers high contrast */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-contrast: more)").matches ||
         window.matchMedia("(forced-colors: active)").matches;
}

/** Detect if user prefers dark color scheme */
export function prefersDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Detect if device has touch capability */
export function hasTouchCapability(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/** Detect if user is using a screen reader (heuristic) */
export function detectScreenReader(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  // Common heuristics
  return !!(navigator as unknown as Record<string, unknown>).maxTouchPoints === false &&
    (window.speechSynthesis !== undefined ||
     /NVDA|JAWS|VoiceOver|Dragon|Window-Eyes|Kurzweil/i.test(navigator.userAgent));
}

/** Subscribe to a media query change */
export function watchMediaQuery(query: string, callback: (matches: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(query);
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mql.addEventListener("change", handler);
  callback(mql.matches); // Initial value
  return () => mql.removeEventListener("change", handler);
}

// --- Focus Management ---

/** Find all focusable elements within a container */
export function getFocusableElements(container: HTMLElement): FocusableElement[] {
  const selector = [
    'a[href]',
    'area[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    'summary',
    'iframe',
  ].join(", ");

  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
  const result: FocusableElement[] = [];

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    // Skip hidden elements
    if (rect.width === 0 && rect.height === 0) continue;
    if (getComputedStyle(el).visibility === "hidden") continue;
    if (getComputedStyle(el).display === "none") continue;

    result.push({
      element: el,
      index: result.length,
      tabIndex: el.tabIndex ?? 0,
    });
  }

  // Sort by natural DOM order (tabindex ascending, then DOM order)
  result.sort((a, b) => {
    if (a.tabIndex !== b.tabIndex) return a.tabIndex - b.tabIndex;
    return a.index - b.index;
  });

  return result;
}

/** Move focus to an element safely */
export function focusElement(el: HTMLElement | null, options?: ScrollIntoViewOptions): boolean {
  if (!el) return false;
  try {
    el.focus({ preventScroll: true });
    if (options) el.scrollIntoView(options);
    return true;
  } catch {
    // Some elements can't be focused
    return false;
  }
}

/** Save and restore focus position */
export function saveFocus(): () => void {
  const active = document.activeElement as HTMLElement | null;
  return () => {
    if (active && typeof active.focus === "function") {
      active.focus({ preventScroll: true });
    }
  };
}

/** Trap Tab key within a container */
export class FocusTrap {
  private config: Required<FocusTrapConfig>;
  private active = false;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private previousFocus: HTMLElement | null = null;

  constructor(config: FocusTrapConfig) {
    this.config = {
      container: config.container,
      includeContainer: config.includeContainer ?? false,
      initialFocus: config.initialFocus ?? null,
      returnFocus: config.returnFocus ?? null,
      escapeDeactivates: config.escapeDeactivates ?? true,
      delay: config.delay ?? 0,
      additionalDeactivators: config.additionalDeactivators ?? [],
      onActivate: config.onActivate ?? (() => {}),
      onDeactivate: config.onDeactivate ?? (() => {}),
    };
  }

  /** Activate the focus trap */
  activate(): void {
    if (this.active) return;

    this.previousFocus = document.activeElement as HTMLElement | null;

    this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    document.addEventListener("keydown", this.boundKeyDown!);

    if (this.config.delay > 0) {
      setTimeout(() => this.doActivate(), this.config.delay);
    } else {
      this.doActivate();
    }
  }

  private doActivate(): void {
    this.active = true;

    const target = this.config.initialFocus ??
      getFocusableElements(this.config.container)[0]?.element ?? null;
    focusElement(target);
    this.config.onActivate();
  }

  /** Deactivate the focus trap */
  deactivate(): void {
    if (!this.active) return;

    this.active = false;

    if (this.boundKeyDown) {
      document.removeEventListener("keydown", this.boundKeyDown);
      this.boundKeyDown = null;
    }

    const returnEl = this.config.returnFocus ?? this.previousFocus;
    focusElement(returnEl);

    this.config.onDeactivate();
  }

  /** Check if trap is active */
  isActive(): boolean { return this.active; }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Tab") {
      e.preventDefault();
      this.handleTab(e.shiftKey);
    } else if (e.key === "Escape" && this.config.escapeDeactivates) {
      this.deactivate();
    } else if (this.config.additionalDeactivators.includes(e.key)) {
      this.deactivate();
    }
  }

  private handleTab(reverse: boolean): void {
    const focusables = getFocusableElements(this.config.container);
    if (focusables.length === 0) return;

    const currentIdx = focusables.findIndex(
      (f) => f.element === document.activeElement,
    );

    let nextIdx: number;
    if (currentIdx === -1) {
      nextIdx = reverse ? focusables.length - 1 : 0;
    } else {
      nextIdx = reverse
        ? (currentIdx - 1 + focusables.length) % focusables.length
        : (currentIdx + 1) % focusables.length;
    }

    focusElement(focusables[nextIdx]!.element);
  }
}

// --- Skip Navigation ---

/** Create a "Skip to content" link */
export function createSkipLink(targetSelector?: string, text?: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = `#${targetSelector ?? "main-content"}`;
  link.textContent = text ?? "Skip to main content";
  Object.assign(link.style, {
    position: "absolute",
    left: "-9999px",
    top: "0",
    zIndex: "999",
    padding: "8px 16px",
    background: "#000",
    color: "#fff",
    textDecoration: "none",
    fontSize: "14px",
  });

  // Show on focus
  link.addEventListener("focus", () => {
    link.style.left = "10px";
  });
  link.addEventListener("blur", () => {
    link.style.left = "-9999px";
  });

  return link;
}

// --- Live Regions / Announcements ---

export class AccessibilityAnnouncer {
  private element: HTMLElement;
  private config: Required<A11yConfig>;
  private clearTimer: ReturnType<typeof setTimeout> | null = null;
  private queue: Array<{ message: string; politeness: LiveRegionPoliteness }> = [];

  constructor(config: A11yConfig = {}) {
    this.config = {
      defaultPoliteness: config.defaultPoliteness ?? "polite",
      debugFocusTrap: config.debugFocusTrap ?? false,
      announceClearDelay: config.announceClearDelay ?? 1000,
      skipLinkTarget: config.skipLinkTarget ?? "main",
      focusOutlineStyle: config.focusOutlineStyle ?? "",
    };

    // Create or use provided announcer element
    this.element = config.announcerElement ?? this.createAnnouncerElement();
  }

  private createAnnouncerElement(): HTMLElement {
    const el = document.createElement("div");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    Object.assign(el.style, {
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
    document.body.appendChild(el);
    return el;
  }

  /** Announce a message to screen readers */
  announce(message: string, politeness?: LiveRegionPoliteness): void {
    const p = politeness ?? this.config.defaultPoliteness;

    // Queue if already announcing
    if (this.element.textContent) {
      this.queue.push({ message, politeness: p });
      return;
    }

    this.doAnnounce(message, p);
  }

  private doAnnounce(message: string, politeness: LiveRegionPoliteness): void {
    this.element.setAttribute("aria-live", politeness);
    this.element.textContent = "";

    // Small delay to ensure SR picks up the change
    requestAnimationFrame(() => {
      this.element.textContent = message;
    });

    // Clear after delay
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => {
      this.element.textContent = "";
      // Process queue
      const next = this.queue.shift();
      if (next) this.doAnnounce(next.message, next.politeness);
    }, this.config.announceClearDelay);
  }

  /** Announce assertively (interrupts current speech) */
  assertive(message: string): void {
    this.announce(message, "assertive");
  }

  /** Politely announce (waits for current speech to finish) */
  polite(message: string): void {
    this.announce(message, "polite");
  }

  /** Clean up DOM element */
  destroy(): void {
    if (this.clearTimer) clearTimeout(this.clearTimer);
    this.element.remove();
  }
}

// --- ARIA Attribute Helpers ---

/** Set ARIA attributes on an element */
export function setAria(element: HTMLElement, attributes: Partial<Record<AriaProperty, string | boolean | number>>): void {
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) {
      element.removeAttribute(key);
    } else if (typeof value === "boolean") {
      element.setAttribute(key, String(value));
    } else {
      element.setAttribute(key, String(value));
    }
  }
}

/** Get all ARIA attributes from an element */
export function getAria(element: HTMLElement): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of element.attributes) {
    if (attr.name.startsWith("aria-")) {
      result[attr.name] = attr.value;
    }
  }
  return result;
}

/** Generate ARIA attributes object for common patterns */
export function ariaPatterns: Record<string, Partial<Record<AriaProperty, string | boolean>>> = {
  button: { role: "button", "aria-pressed": false },
  dialog: { role: "dialog", "aria-modal": true, "aria-labelledby": "" },
  menu: { role: "menu" },
  menuItem: { role: "menuitem" },
  menubar: { role: "menubar" },
  combobox: { role: "combobox", "aria-expanded": false, "aria-haspopup": "listbox" },
  listbox: { role: "listbox" },
  option: { role: "option", "aria-selected": false },
  tablist: { role: "tablist" },
  tab: { role: "tab", "aria-selected": false },
  tabpanel: { role: "tabpanel" },
  tooltip: { role: "tooltip" },
  alert: { role: "alert", "aria-live": "assertive" },
  status: { role: "status", "aria-live": "polite" },
  progressbar: { role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": 0 },
  slider: { role: "slider", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": 0 },
  searchbox: { role: "searchbox" },
  tree: { role: "tree" },
  treeItem: { role: "treeitem", "aria-expanded": false, "aria-selected": false },
  grid: { role: "grid" },
  gridCell: { role: "gridcell" },
  switch: { role: "switch", "aria-checked": false },
  checkbox: { role: "checkbox", "aria-checked": false },
  radio: { role: "radio", "aria-checked": false },
};

// --- Keyboard Navigation Patterns ---

/** Roving tabindex pattern for lists/grids */
export class RovingTabIndex {
  private items: HTMLElement[] = [];
  private activeIndex = -1;
  private orientation: "horizontal" | "vertical" | "grid" = "vertical";
  private wrap = true;
  private listeners = new Set<(index: number, item: HTMLElement) => void>();
  private boundHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(
    container: HTMLElement,
    options?: {
      orientation?: "horizontal" | "vertical" | "grid";
      wrap?: boolean;
      itemSelector?: string;
    },
  ) {
    this.orientation = options?.orientation ?? "vertical";
    this.wrap = options?.wrap ?? true;

    const selector = options?.itemSelector ?? "[role=option], [role=tab], [role=treeitem], [role=listbox] [role=option], [data-roving]";
    this.items = Array.from(container.querySelectorAll<HTMLElement>(selector));

    this.setupItems();
    this.boundHandler = (e: KeyboardEvent) => this.handleKey(e);
    container.addEventListener("keydown", this.boundHandler);
  }

  private setupItems(): void {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]!;
      item.tabIndex = i === 0 ? 0 : -1;
      item.dataset.rovingIndex = String(i);
    }
  }

  /** Activate an item by index */
  activate(index: number): void {
    if (index < 0 || index >= this.items.length) return;

    // Deactivate current
    if (this.activeIndex >= 0 && this.activeIndex < this.items.length) {
      this.items[this.activeIndex]!.tabIndex = -1;
      this.items[this.activeIndex]!.setAttribute("aria-selected", "false");
    }

    this.activeIndex = index;
    const item = this.items[index]!;
    item.tabIndex = 0;
    item.setAttribute("aria-selected", "true");
    item.focus({ preventScroll: true });

    for (const l of this.listeners) l(index, item);
  }

  /** Get currently active index */
  getActiveIndex(): number { return this.activeIndex; }

  /** Get all managed items */
  getItems(): ReadonlyArray<HTMLElement> { return this.items; }

  /** Refresh items (call after DOM changes) */
  refresh(items?: HTMLElement[]): void {
    if (items) this.items = items;
    else {
      const container = this.items[0]?.parentElement;
      if (container) {
        const selector = "[role=option], [role=tab], [role=treeitem], [data-roving]";
        this.items = Array.from(container.querySelectorAll<HTMLElement>(selector));
      }
    }
    this.setupItems();
    this.activeIndex = -1;
  }

  /** Subscribe to activation changes */
  onChange(listener: (index: number, item: HTMLElement) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Clean up event listeners */
  destroy(): void {
    if (this.boundHandler) {
      const container = this.items[0]?.parentElement;
      if (container) container.removeEventListener("keydown", this.boundHandler);
    }
  }

  private handleKey(e: KeyboardEvent): void {
    let newIndex: number;

    switch (e.key) {
      case "ArrowDown":
        if (this.orientation === "horizontal") return;
        e.preventDefault();
        newIndex = this.wrap
          ? (this.activeIndex + 1) % this.items.length
          : Math.min(this.activeIndex + 1, this.items.length - 1);
        break;
      case "ArrowUp":
        if (this.orientation === "horizontal") return;
        e.preventDefault();
        newIndex = this.wrap
          ? (this.activeIndex - 1 + this.items.length) % this.items.length
          : Math.max(this.activeIndex - 1, 0);
        break;
      case "ArrowRight":
        if (this.orientation === "vertical") return;
        e.preventDefault();
        newIndex = this.wrap
          ? (this.activeIndex + 1) % this.items.length
          : Math.min(this.activeIndex + 1, this.items.length - 1);
        break;
      case "ArrowLeft":
        if (this.orientation === "vertical") return;
        e.preventDefault();
        newIndex = this.wrap
          ? (this.activeIndex - 1 + this.items.length) % this.items.length
          : Math.max(this.activeIndex - 1, 0);
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = this.items.length - 1;
        break;
      default:
        return;
    }

    this.activate(newIndex);
  }
}

// --- Color Contrast Checker ---

/** Calculate relative luminance per WCAG 2.x */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Parse hex color to RGB */
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    const r = parseInt(clean[0]! + clean[0]!, 16);
    const g = parseInt(clean[1]! + clean[1]!, 16);
    const b = parseInt(clean[2]! + clean[2]!, 16);
    return [r, g, b];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

/** Calculate contrast ratio between two colors */
export function contrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 1;

  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/** Check WCAG compliance level */
export function wcagLevel(foreground: string, background: string): {
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  ratio: number;
} {
  const ratio = contrastRatio(foreground, background);
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
    ratio,
  };
}

/** Suggest accessible foreground color given a background */
export function suggestAccessibleColor(background: string, preferredLight = true): string {
  const bg = hexToRgb(background);
  if (!bg) return preferredLight ? "#000000" : "#ffffff";

  const bgLum = relativeLuminance(...bg);

  // If background is light, prefer dark text
  if (preferredLight) {
    return bgLum > 0.5 ? "#000000" : "#ffffff";
  }
  return bgLum > 0.179 ? "#000000" : "#ffffff";
}

// --- Heading Structure Validator ---

export interface HeadingIssue {
  level: number;
  text: string;
  issue: "skipped-level" | "out-of-order" | "empty-heading" | "multiple-h1";
  suggestion: string;
}

/** Validate heading hierarchy in a document/container */
export function validateHeadingStructure(root: HTMLElement = document.body): HeadingIssue[] {
  const issues: HeadingIssue[] = [];
  const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h1, h2, h3, h4, h5, h6"));
  let h1Count = 0;
  let prevLevel = 0;

  for (const heading of headings) {
    const level = parseInt(heading.tagName[1]!, 10);
    const text = heading.textContent?.trim() ?? "";

    if (level === 1) h1Count++;
    if (h1Count > 1) {
      issues.push({ level, text, issue: "multiple-h1", suggestion: "Use only one H1 per page" });
    }

    if (text.length === 0) {
      issues.push({ level, text, issue: "empty-heading", suggestion: "Add descriptive text to heading" });
    }

    if (prevLevel > 0 && level > prevLevel + 1) {
      issues.push({
        level, text,
        issue: "skipped-level",
        suggestion: `Heading level ${level} skips level ${prevLevel + 1}. Consider using H${prevLevel + 1}.`,
      });
    }

    prevLevel = level;
  }

  return issues;
}
