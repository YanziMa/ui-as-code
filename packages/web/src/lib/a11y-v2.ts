/**
 * Advanced accessibility utilities v2: Focus management, ARIA, keyboard navigation,
 * screen reader support, WCAG contrast, accessible components.
 */

// --- Focus Management ---

/** Trap focus within an element (for modals, dialogs) */
export function createFocusTrap(element: HTMLElement): { activate: () => void; deactivate: () => void } {
  let previouslyFocused: HTMLElement | null = null;
  let active = false;

  const focusableSelectors = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
  ].join(", ");

  function getFocusableElements(): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>(focusableSelectors))
      .filter((el) => el.offsetParent !== null || el.tagName === "INPUT");
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (!active || e.key !== "Tab") return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  return {
    activate() {
      active = true;
      previouslyFocused = document.activeElement as HTMLElement;
      element.addEventListener("keydown", handleKeyDown);
      const focusable = getFocusableElements();
      if (focusable.length > 0) focusable[0]!.focus();
    },
    deactivate() {
      active = false;
      element.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused) previouslyFocused.focus();
    },
  };
}

/** Manage focus visible state */
export function setupFocusVisible(): () => void {
  const handler = (_e: Event) => document.body.classList.add("focus-visible-active");
  const mouseHandler = () => document.body.classList.remove("focus-visible-active");
  document.addEventListener("keydown", handler);
  document.addEventListener("mousedown", mouseHandler);
  return () => { document.removeEventListener("keydown", handler); document.removeEventListener("mousedown", mouseHandler); };
}

/** Move focus to an element with scroll into view */
export function focusElement(el: HTMLElement | null, options?: ScrollIntoViewOptions): boolean {
  if (!el) return false;
  el.focus({ preventScroll: true });
  el.scrollIntoView?.({ behavior: "smooth", block: "center", ...options });
  return true;
}

// --- ARIA Utilities ---

/** Set multiple ARIA attributes at once */
export function setAria(el: Element, attrs: Record<string, string | boolean | null>): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) { el.removeAttribute(`aria-${key}`); }
    else if (typeof value === "boolean") { el.setAttribute(`aria-${key}`, String(value)); }
    else { el.setAttribute(`aria-${key}`, String(value)); }
  }
}

/** Create accessible announcement for screen readers */
export function announce(message: string, priority: "polite" | "assertive" = "polite"): void {
  const region = document.querySelector(`[role="status"][aria-live="${priority}"]`)
    ?? document.querySelector(`[role="log"][aria-live="${priority}"]`);
  if (region) { region.textContent = message; return; }

  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", priority);
  el.setAttribute("aria-atomic", "true");
  el.className = "sr-only";
  el.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

/** Create a persistent live region for announcements */
export function createLiveRegion(options?: { polite?: boolean }): HTMLDivElement {
  const region = document.createElement("div");
  region.setAttribute("role", options?.polite !== false ? "status" : "alert");
  region.setAttribute("aria-live", options?.polite !== false ? "polite" : "assertive");
  region.setAttribute("aria-atomic", "true");
  region.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);";
  document.body.appendChild(region);
  return region;
}

// --- Reduced Motion ---

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => callback(mq.matches);
  mq.addEventListener("change", handler);
  handler();
  return () => mq.removeEventListener("change", handler);
}

export function getSafeDuration(normalMs: number, reducedMs = 0): string {
  return prefersReducedMotion() ? `${reducedMs}ms` : `${normalMs}ms`;
}

// --- Color Contrast (WCAG 2.1) ---

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : null;
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = parseHex(hexA), b = parseHex(hexB);
  if (!a || !b) return 1;
  const la = relativeLuminance(a.r, a.g, a.b), lb = relativeLuminance(b.r, b.g, b.b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function wcagCompliance(fg: string, bg: string): {
  aaNormal: boolean; aaLarge: boolean; aaaNormal: boolean; aaaLarge: boolean; ratio: number;
} {
  const ratio = contrastRatio(fg, bg);
  return { ratio: parseFloat(ratio.toFixed(2)), aaNormal: ratio >= 4.5, aaLarge: ratio >= 3, aaaNormal: ratio >= 7, aaaLarge: ratio >= 4.5 };
}

// --- Keyboard Navigation ---

export interface RovingIndexOptions { loop?: boolean; vertical?: boolean; triggerOnType?: boolean }

/** Create roving tabindex pattern for keyboard navigation within a container */
export function createRovingTabIndex(
  container: HTMLElement,
  options: RovingIndexOptions = {},
): { destroy: () => void; getCurrentIndex: () => number; setCurrentIndex: (i: number) => void } {
  const { loop = true, vertical = true, triggerOnType = true } = options;
  const items = (): HTMLElement[] => Array.from(container.querySelectorAll<HTMLElement>('[data-roving-index]'));
  let currentIndex = -1;
  let typeBuffer = "";
  let typeTimer: ReturnType<typeof setTimeout> | null = null;

  function setActive(index: number): void {
    const allItems = items();
    if (allItems.length === 0) return;
    if (loop) index = ((index % allItems.length) + allItems.length) % allItems.length;
    else index = Math.max(0, Math.min(index, allItems.length - 1));
    for (let i = 0; i < allItems.length; i++) allItems[i]!.setAttribute("tabindex", i === index ? "0" : "-1");
    if (currentIndex !== index && index >= 0) allItems[index]?.focus();
    currentIndex = index;
  }

  function handleKeyDown(e: KeyboardEvent): void {
    const allItems = items();
    if (allItems.length === 0) return;
    const prevKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    if (e.key === prevKey) { e.preventDefault(); setActive(currentIndex - 1); }
    else if (e.key === nextKey) { e.preventDefault(); setActive(currentIndex + 1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(allItems.length - 1); }
    else if (triggerOnType && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typeBuffer += e.key.toLowerCase();
      if (typeTimer) clearTimeout(typeTimer);
      typeTimer = setTimeout(() => { typeBuffer = ""; }, 500);
      const matchIdx = allItems.findIndex((item, i) => i !== currentIndex && item.textContent?.toLowerCase().startsWith(typeBuffer));
      if (matchIdx >= 0) setActive(matchIdx);
    }
  }

  container.addEventListener("keydown", handleKeyDown);
  setActive(0);

  return {
    destroy() { container.removeEventListener("keydown", handleKeyDown); if (typeTimer) clearTimeout(typeTimer); },
    getCurrentIndex: () => currentIndex,
    setCurrentIndex: setActive,
  };
}

// --- Skip Links ---

export function createSkipLink(targetSelector: string, text = "Skip to main content"): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = `#${targetSelector.replace("#", "")}`;
  link.textContent = text;
  link.className = "skip-link";
  link.style.cssText = `position:absolute;top:-40px;left:0;background:#000;color:white;padding:8px 16px;z-index:9999;text-decoration:none;font-weight:600;transition:top 0.2s;`;
  link.onfocus = () => { link.style.top = "0"; };
  link.onblur = () => { link.style.top = "-40px"; };
  document.body.prepend(link);
  return link;
}

// --- Accessible Dialog ---

export interface DialogOptions { title?: string; role?: "dialog" | "alertdialog"; closeOnEscape?: boolean; closeOnClickOutside?: boolean }

export function createAccessibleDialog(
  content: HTMLElement | string,
  options: DialogOptions = {},
): { open: () => void; close: () => void; isOpen: () => boolean; destroy: () => void } {
  const { title, role = "dialog", closeOnEscape = true, closeOnClickOutside = true } = options;
  let openState = false;

  const overlay = document.createElement("div");
  overlay.setAttribute("role", "presentation");
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:none;align-items:center;justify-content:center;`;

  const dialog = document.createElement("div");
  dialog.setAttribute("role", role);
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", title ? "dialog-title" : "");
  dialog.style.cssText = `background:var(--color-bg,white);border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);`;

  if (title) {
    const h = document.createElement("h2"); h.id = "dialog-title"; h.textContent = title;
    h.style.cssText = "margin:0 0 16px;font-size:1.25rem;font-weight:600;";
    dialog.appendChild(h);
  }

  dialog.appendChild(typeof content === "string" ? Object.assign(document.createElement("div"), { innerHTML: content }) : content);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const trap = createFocusTrap(dialog);

  function open(): void {
    openState = true; overlay.style.display = "flex"; dialog.setAttribute("aria-expanded", "true");
    trap.activate(); document.body.style.overflow = "hidden"; announce(`${title || "Dialog"} opened`);
  }
  function close(): void {
    openState = false; overlay.style.display = "none"; dialog.setAttribute("aria-expanded", "false");
    trap.deactivate(); document.body.style.overflow = ""; announce(`${title || "Dialog"} closed`);
  }

  if (closeOnEscape) overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  if (closeOnClickOutside) overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  return { open, close, isOpen: () => openState, destroy: () => { overlay.remove(); trap.deactivate(); } };
}
