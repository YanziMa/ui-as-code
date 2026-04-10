/**
 * Accessibility (a11y) Utilities: ARIA management, focus trap, roving tabindex,
 * screen reader announcements, color contrast checking, keyboard navigation,
 * heading hierarchy validation, landmark identification, reduced motion detection,
 * accessible modal/dialog patterns.
 */

// --- Types ---

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
}

export interface FocusableElement {
  element: HTMLElement;
  index: number;
  tabIndex: number;
}

export interface HeadingInfo {
  level: number;
  text: string;
  element: Element;
}

export interface LandmarkInfo {
  role: string;
  label: string | null;
  element: Element;
}

// --- ARIA Management ---

/** Set ARIA attributes on an element */
export function setAria(element: HTMLElement, attrs: Record<string, string>): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) {
      element.removeAttribute(`aria-${key}`);
    } else {
      element.setAttribute(`aria-${key}`, value);
    }
  }
}

/** Get all ARIA attributes from an element */
export function getAria(element: HTMLElement): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of Array.from(element.attributes)) {
    if (attr.name.startsWith("aria-")) {
      result[attr.name.slice(5)] = attr.value;
    }
  }
  return result;
}

/** Set role on an element */
export function setRole(element: HTMLElement, role: string): void {
  element.setAttribute("role", role);
}

/** Set accessible name */
export function setAccessibleName(element: HTMLElement, name: string): void {
  setAria(element, { label: name });
  if (!element.getAttribute("aria-label")) {
    element.setAttribute("aria-label", name);
  }
}

/** Mark an element as hidden from assistive technology */
export function hideFromScreenReader(element: HTMLElement): void {
  element.setAttribute("aria-hidden", "true");
}

/** Show element to screen readers again */
export function showToScreenReader(element: HTMLElement): void {
  element.removeAttribute("aria-hidden");
}

// --- Focus Management ---

/**
 * Get all focusable elements within a container in tab order.
 * Includes elements with tabindex >= 0, excluding disabled/hidden elements.
 */
export function getFocusableElements(container: HTMLElement | Document = document): FocusableElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
    'audio[controls]',
    'video[controls]',
    'summary',
    '[tabindex="0"]',
  ].join(", ");

  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));

  // Filter out visually hidden and disabled
  return elements
    .filter((el) => {
      const style = getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null ||
        // Allow focusable elements that are positioned off-screen but not display:none
        (style.display !== "none" && style.visibility !== "hidden");
    })
    .map((el, index) => ({
      element: el,
      index,
      tabIndex: el.tabIndex >= 0 ? el.tabIndex : 0,
    }))
    .sort((a, b) => a.tabIndex - b.tabIndex || a.index - b.index);
}

/** Move focus to the first focusable element in a container */
export function focusFirst(container: HTMLElement): boolean {
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return false;
  focusable[0]!.element.focus();
  return true;
}

/** Move focus to the last focusable element in a container */
export function focusLast(container: HTMLElement): boolean {
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return false;
  focusable[focusable.length - 1]!.element.focus();
  return true;
}

/** Check if an element can receive focus */
export function isFocusable(element: HTMLElement): boolean {
  const focusable = getFocusableElements(element.ownerDocument as unknown as HTMLElement ?? document.body);
  return focusable.some((f) => f.element === element);
}

// --- Focus Trap ---

/**
 * Create a focus trap within a container. Tab/Shift+Tab cycles through
 * focusable children instead of leaving the container.
 *
 * Returns a cleanup function to disable the trap.
 */
export function createFocusTrap(container: HTMLElement, options?: {
  initialFocus?: HTMLElement;
  returnFocus?: HTMLElement;
  escapeDeactivates?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
}): () => void {
  const {
    initialFocus,
    returnFocus,
    escapeDeactivates = false,
    onActivate,
    onDeactivate,
  } = options ?? {};

  let previouslyFocused: HTMLElement | null = null;
  let active = false;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) { e.preventDefault(); return; }

    const first = focusable[0]!.element;
    const last = focusable[focusable.length - 1]!.element;

    if (e.shiftKey) {
      // Shift+Tab: go backwards
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: go forwards
      if (document.activeElement === last || !container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }

    // Escape to deactivate
    if (e.key === "Escape" && escapeDeactivates) deactivate();
  };

  const activate = () => {
    if (active) return;
    active = true;
    previouslyFocused = document.activeElement as HTMLElement;
    document.addEventListener("keydown", handleKeyDown);
    onActivate?.();

    if (initialFocus) initialFocus.focus();
    else focusFirst(container);
  };

  const deactivate = () => {
    if (!active) return;
    active = false;
    document.removeEventListener("keydown", handleKeyDown);
    onDeactivate?.();

    if (returnFocus) returnFocus.focus();
    else if (previouslyFocused) previouslyFocused.focus();
  };

  activate();

  return deactivate;
}

// --- Roving Tabindex (Arrow Key Navigation) ---

/**
 * Set up arrow key navigation (roving tabindex) for a group of items.
 * Arrow keys cycle focus between items; Home/End jump to first/last.
 */
export function setupRovingTabindex(
  container: HTMLElement,
  options?: { orientation?: "horizontal" | "vertical"; loop?: boolean; onSelect?: (el: HTMLElement) => void },
): () => void {
  const { orientation = "horizontal", loop = true, onSelect } = options ?? {};
  const prevKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
  const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";

  const items = Array.from(container.querySelectorAll<HTMLElement>("[data-roving-item]"));
  if (items.length === 0) return () => {};

  // Set initial tabindex
  items.forEach((item, i) => item.tabIndex = i === 0 ? 0 : -1);

  const handler = (e: KeyboardEvent) => {
    const currentIdx = items.indexOf(document.activeElement as HTMLElement);
    if (currentIdx < 0) return;

    let nextIdx: number;

    if (e.key === nextKey) {
      e.preventDefault();
      nextIdx = currentIdx < items.length - 1 ? currentIdx + 1 : (loop ? 0 : currentIdx);
    } else if (e.key === prevKey) {
      e.preventDefault();
      nextIdx = currentIdx > 0 ? currentIdx - 1 : (loop ? items.length - 1 : 0);
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = items.length - 1;
    } else return;

    items[currentIdx]!.tabIndex = -1;
    items[nextIdx]!.tabIndex = 0;
    items[nextIdx]!.focus();
    onSelect?.(items[nextIdx]!);
  };

  container.addEventListener("keydown", handler);

  return () => container.removeEventListener("keydown", handler);
}

// --- Screen Reader Announcements ---

/** Create or reuse a live region for announcements */
function getLiveRegion(): HTMLDivElement {
  let region = document.getElementById("sr-live-region") as HTMLDivElement | null;
  if (!region) {
    region = document.createElement("div");
    region.id = "sr-live-region";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    region.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
    document.body.appendChild(region);
  }
  return region;
}

/** Announce a message to screen readers */
export function announce(message: string, priority: "polite" | "assertive" = "polite"): void {
  const region = getLiveRegion();
  region.setAttribute("aria-live", priority);

  // Clear and re-set to ensure re-announcement even for same message
  region.textContent = "";
  // Force reflow
  // eslint-disable-next-line no-void
  void region.offsetHeight;
  region.textContent = message;
}

/** Announce assertively (interrupts current speech) */
export function announceAssertive(message: string): void {
  announce(message, "assertive");
}

// --- Color Contrast (WCAG) ---

/** Calculate relative luminance of a color */
function relativeLuminance(r: number, g: number, b: number): number {
  const sRGB = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0]! + 0.7152 * sRGB[1]! + 0.0722 * sRGB[2]!;
}

/** Calculate contrast ratio between two colors */
export function contrastRatio(color1: string, color2: string): number {
  const c1 = parseColorForContrast(color1);
  const c2 = parseColorForContrast(color2);
  if (!c1 || !c2) return 1;

  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/** Parse color for contrast calculation */
function parseColorForContrast(color: string): { r: number; g: number; b: number } | null {
  // Hex
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (hexMatch) return { r: parseInt(hexMatch[1]!, 16), g: parseInt(hexMatch[2]!, 16), b: parseInt(hexMatch[3]!, 16) };

  // RGB
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) return { r: parseInt(rgbMatch[1]!, 10), g: parseInt(rgbMatch[2]!, 10), b: parseInt(rgbMatch[3]!, 10) };

  return null;
}

/** Full WCAG contrast check */
export function checkContrast(foreground: string, background: string): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
    passesAALarge: ratio >= 3,
    passesAAALarge: ratio >= 4.5,
  };
}

/** Suggest text color (black or white) for maximum contrast against background */
export function suggestTextColor(bgColor: string): "#000000" | "#FFFFFF" {
  const bg = parseColorForContrast(bgColor);
  if (!bg) return "#000000";
  const luminance = relativeLuminance(bg.r, bg.g, bg.b);
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
}

// --- Heading Hierarchy ---

/** Extract heading structure from a container */
export function getHeadingHierarchy(root: HTMLElement | Document = document): HeadingInfo[] {
  const headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
  return Array.from(headings).map((h) => ({
    level: parseInt(h.tagName[1]!, 10),
    text: h.textContent?.trim() ?? "",
    element: h,
  }));
}

/** Validate heading hierarchy (no skipped levels) */
export function validateHeadingHierarchy(headings: HeadingInfo[]): {
  valid: boolean;
  errors: Array<{ level: number; text: string; message: string }>;
} {
  const errors: Array<{ level: number; text: string; message: string }> = [];
  let maxLevel = 0;

  for (const h of headings) {
    if (h.level > maxLevel + 1) {
      errors.push({
        level: h.level,
        text: h.text,
        message: `Heading level ${h.level} follows level ${maxLevel} (skipped intermediate level)`,
      });
    }
    maxLevel = Math.max(maxLevel, h.level);
  }

  // Check for multiple H1s
  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count > 1) {
    errors.push({ level: 1, text: "", message: `Multiple H1 tags found (${h1Count})` });
  }

  return { valid: errors.length === 0, errors };
}

// --- Landmark Regions ---

/** Find all ARIA landmarks in the document */
export function findLandmarks(root: HTMLElement | Document = document): LandmarkInfo[] {
  const landmarkRoles = ["banner", "navigation", "main", "complementary", "contentinfo", "form", "search", "region"];
  const landmarks: LandmarkInfo[] = [];

  for (const role of landmarkRoles) {
    const elements = root.querySelectorAll(`[role="${role}"], ${role === "banner" ? "header" : ""}${role === "navigation" ? "nav" : ""}${role === "main" ? "main" : ""}${role === "complementary" ? "aside" : ""}${role === "contentinfo" ? "footer" : ""}`);

    for (const el of Array.from(elements)) {
      landmarks.push({
        role,
        label: el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || null,
        element: el as Element,
      });
    }
  }

  return landmarks;
}

/** Check if page has proper landmark structure */
export function hasProperLandmarks(): boolean {
  const landmarks = findLandmarks();
  return landmarks.some((l) => l.role === "main");
}

// --- Reduced Motion / User Preferences ---

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Check if user prefers high contrast */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-contrast: more)").matches;
}

/** Check if user prefers dark mode */
export function prefersDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Check if user prefers light mode */
export function prefersLightMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

/** Subscribe to preference changes */
export function onPreferenceChange(
  preference: "reduced-motion" | "contrast" | "color-scheme",
  callback: (matches: boolean) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const mediaMap: Record<string, string> = {
    "reduced-motion": "(prefers-reduced-motion: reduce)",
    "contrast": "(prefers-contrast: more)",
    "color-scheme": "(prefers-color-scheme: dark)",
  };

  const mql = window.matchMedia(mediaMap[preference]);
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mql.addEventListener("change", handler);
  callback(mql.matches);

  return () => mql.removeEventListener("change", handler);
}

// --- Skip Link ---

/** Create and insert a skip navigation link */
export function createSkipLink(
  targetSelector = "#main-content",
  text = "Skip to main content",
): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = targetSelector;
  link.textContent = text;
  link.className = "skip-link";
  link.style.cssText =
    "position:absolute;left:-9999px;top:auto;z-index:999;padding:8px 16px;background:#000;color:#fff;text-decoration:none;font-size:14px;";
  link.style.cssText += "border-radius:4px;transition:left 0.2s;";

  link.addEventListener("focus", () => { link.style.left = "16px"; });
  link.addEventListener("blur", () => { link.style.left = "-9999px"; });

  document.body.prepend(link);
  return link;
}

// --- Accessible Modal Helpers ---

/** Trap focus in a modal dialog and manage Escape key */
export function openAccessibleModal(
  modalEl: HTMLElement,
  options?: { onClose?: () => void; focusTrap?: boolean },
): () => void {
  const { onClose, focusTrap: shouldTrapFocus = true } = options ?? {};

  // Show modal
  modalEl.removeAttribute("hidden");
  modalEl.setAttribute("role", "dialog");
  modalEl.setAttribute("aria-modal", "true");

  let cleanupFocus: (() => void) | null = null;
  if (shouldTrapFocus) cleanupFocus = createFocusTrap(modalEl, { escapeDeactivates: true, onDeactivate: close });

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", handleEscape);

  // Prevent body scroll
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  function close() {
    modalEl.setAttribute("hidden", "");
    modalEl.removeAttribute("aria-modal");
    document.body.style.overflow = previousOverflow;
    document.removeEventListener("keydown", handleEscape);
    cleanupFocus?.();
    onClose?.();
  }

  return close;
}
