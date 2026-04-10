/**
 * CSS-in-JS / style injection utilities: dynamic stylesheet management,
 * CSS custom properties (variables), media query helpers, animation keyframe builder,
 * responsive breakpoint detection, dark mode toggle, CSS class manipulation.
 */

// --- Dynamic Stylesheet Management ---

/** Create and inject a <style> element */
export function injectStyle(cssText: string, options?: { id?: string; media?: string; disabled?: boolean }): HTMLStyleElement {
  const style = document.createElement("style");
  style.type = "text/css";
  if (options?.id) style.id = options.id;
  if (options?.media) style.media = options.media;
  if (options?.disabled) style.disabled = true;
  style.textContent = cssText;
  document.head.appendChild(style);
  return style;
}

/** Remove injected style by ID or element reference */
export function removeStyle(styleOrId: string | HTMLStyleElement): void {
  const el = typeof styleOrId === "string"
    ? document.getElementById(styleOrId)
    : styleOrId;
  el?.remove();
}

/** Update existing injected style content */
export function updateStyle(id: string, cssText: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = cssText;
}

// --- CSS Custom Properties (Variables) ---

/** Set a CSS custom property on an element */
export function setCssVar(el: Element, name: string, value: string): void {
  el.style.setProperty(`--${name}`, value);
}

/** Get a CSS custom property computed value */
export function getCssVar(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(`--${name}`).trim();
}

/** Set multiple CSS variables at once */
export function setCssVars(el: Element, vars: Record<string, string>): void {
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(`--${name}`, value);
  }
}

/** Get root (document.documentElement) CSS variable */
export function getRootVar(name: string): string {
  return getCssVar(document.documentElement, name);
}

/** Set root CSS variable */
export function setRootVar(name: string, value: string): void {
  setCssVar(document.documentElement, name, value);
}

// --- Responsive Breakpoint Helpers ---

export interface Breakpoints {
  xs: number;  // 0
  sm: number;  // 576
  md: number;  // 768
  lg: number;  // 992
  xl: number; // 1280
  xxl: number; // 1536
}

const DEFAULT_BREAKPOINTS: Breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1280,
  xxl: 1536,
};

/** Get current breakpoint name based on window width */
export function getCurrentBreakpoint(bps = DEFAULT_BREAKPOINTS): keyof Breakpoints {
  const w = window.innerWidth;
  if (w >= bps.xxl) return "xxl";
  if (w >= bps.xl) return "xl";
  if (w >= bps.lg) return "lg";
  if (w >= bps.md) return "md";
  if (w >= bps.sm) return "sm";
  return "xs";
}

/** Check if viewport is at least as wide as given breakpoint */
export function isMinWidth(breakpoint: keyof Breakpoints, bps = DEFAULT_BREAKPOINTS): boolean {
  return window.innerWidth >= bps[breakpoint];
}

/** Check if viewport is narrower than given breakpoint */
export function isMaxWidth(breakpoint: keyof Breakpoints, bps = DEFAULT_BREAKPOINTS): boolean {
  return window.innerWidth < bps[breakpoint];
}

/** Subscribe to breakpoint changes */
export function onBreakpointChange(callback: (bp: keyof Breakpoints) => void): () => void {
  const handler = () => callback(getCurrentBreakpoint());
  window.addEventListener("resize", handler);
  handler(); // Initial call
  return () => window.removeEventListener("resize", handler);
}

/** Check if device is mobile (touch + small screen) */
export function isMobile(): boolean {
  return "ontouchstart" in window && window.innerWidth < 768;
}

/** Check if device is tablet */
export function isTablet(): boolean {
  return "ontouchstart" in window && window.innerWidth >= 768 && window.innerWidth < 1024;
}

/** Check if device is desktop */
export function isDesktop(): boolean {
  return !isMobile() && !isTablet();
}

/** Get device pixel ratio */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio ?? 1;
}

/** Check if display is retina/HiDPI */
export function isRetina(): boolean { return getDevicePixelRatio() >= 2; }

// --- Media Query Helpers ---

/** Create a media query string */
export function mq(...conditions: string[]): string {
  return conditions.join(" and ");
}

/** Common media queries */
export const mediaQueries = {
  minW: (w: number) => `(min-width: ${w}px)`,
  maxW: (w: number) => `(max-width: ${w}px)`,
  minH: (h: number) => `(min-height: ${h}px)`,
  maxH: (h: number) => `(max-height: ${h}px)`,
  orientation: (o: "portrait" | "landscape") => `(orientation: ${o})`,
  hover: "(hover: hover) and (pointer: fine)",
  touch: "(pointer: coarse)",
  retina: `(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)`,
  prefersDark: "(prefers-color-scheme: dark)",
  prefersLight: "(prefers-color-scheme: light)",
  prefersReducedMotion: "(prefers-reduced-motion: reduce)",
  contrastMore: "(prefers-contrast: more)",
  contrastLess: "(prefers-contrast: less)",
  colorGamut: (g: "srgb" | "p3") => `(color-gamut: ${g})`,
} as const;

/** Test if a media query matches */
export function matchesMedia(query: string): boolean {
  return window.matchMedia(query).matches;
}

/** Subscribe to media query changes */
export function subscribeMedia(
  query: string,
  callback: (matches: boolean, mql: MediaQueryList) => void,
): () => void {
  const mql = window.matchMedia(query);
  const handler = (e: MediaQueryListEvent) => callback(e.matches, mql);

  mql.addEventListener("change", handler);
  callback(mql.matches, mql); // Initial

  return () => mql.removeEventListener("change", handler);
}

// --- Dark Mode ---

/** Check if user prefers dark mode */
export function isDarkMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Check if user prefers light mode */
export function isLightMode(): boolean {
  return !isDarkMode();
}

/** Toggle dark mode on document */
export function toggleDarkMode(force?: boolean): void {
  const isDark = force ?? !isDarkMode();
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-color-mode", isDark ? "dark" : "light");
}

/** Set dark mode explicitly */
export function setDarkMode(enabled: boolean): void { toggleDarkMode(enabled); }

/** Subscribe to dark mode preference changes */
export function onDarkModeChange(callback: (isDark: boolean) => void): () => void {
  return subscribeMedia("(prefers-color-scheme: dark)", (m) => callback(m));
}

// --- Animation Keyframe Builder ---

interface KeyframeRule {
  offset: string;
  properties: Record<string, string>;
}

/** Build @keyframes CSS rule from keyframe definitions */
export function buildKeyframes(
  name: string,
  keyframes: KeyframeRule[],
): string {
  const steps = keyframes.map((kf) => {
    const props = Object.entries(kf.properties)
      .map(([prop, val]) => `${prop}: ${val}`)
      .join("; ");
    return `${kf.offset} { ${props} }`;
  }).join("\n");

  return `@keyframes ${name} {\n${steps}\n}`;
}

/** Inject keyframes into document */
export function registerKeyframes(
  name: string,
  keyframes: KeyframeRule[],
): HTMLStyleElement {
  return injectStyle(buildKeyframes(name, keyframes), { id: `kf-${name}` });
}

/** Prebuilt common animations */
export const animations = {
  fadeIn: () => buildKeyframes("fadeIn", [
    { offset: "0%", properties: { opacity: "0" } },
    { offset: "100%", properties: { opacity: "1" } },
  ]),
  fadeOut: () => buildKeyframes("fadeOut", [
    { offset: "0%", properties: { opacity: "1" } },
    { offset: "100%", properties: { opacity: "0" } },
  ]),
  slideInUp: (distance = "20px") => buildKeyframes("slideInUp", [
    { offset: "0%", properties: { transform: `translateY(${distance})`, opacity: "0" } },
    { offset: "100%", properties: { transform: "translateY(0)", opacity: "1" } },
  ]),
  slideInDown: (distance = "20px") => buildKeyframes("slideInDown", [
    { offset: "0%", properties: { transform: `translateY(-${distance})`, opacity: "0" } },
    { offset: "100%", properties: { transform: "translateY(0)", opacity: "1" } },
  ]),
  slideInLeft: (distance = "20px") => buildKeyframes("slideInLeft", [
    { offset: "0%", properties: { transform: `translateX(${distance})`, opacity: "0" } },
    { offset: "100%", properties: { transform: "translateX(0)", opacity: "1" } },
  ]),
  slideInRight: (distance = "20px") => buildKeyframes("slideInRight", [
    { offset: "0%", properties: { transform: `translateX(-${distance})`, opacity: "0" } },
    { offset: "100%", properties: { transform: "translateX(0)", opacity: "1" } },
  ]),
  scaleIn: (from = "0.8") => buildKeyframes("scaleIn", [
    { offset: "0%", properties: { transform: `scale(${from})`, opacity: "0" } },
    { offset: "100%", properties: { transform: "scale(1)", opacity: "1" } },
  ]),
  bounceIn: () => buildKeyframes("bounceIn", [
    { offset: "0%", properties: { transform: "scale(0.5)", opacity: "0" } },
    { offset: "60%", properties: { transform: "scale(1.1)", opacity: "1" } },
    { offset: "80%", properties: { transform: "scale(0.95)" } },
    { offset: "100%", properties: { transform: "scale(1)" } },
  ]),
  spin: () => buildKeyframes("spin", [
    { offset: "0%", properties: { transform: "rotate(0deg)" } },
    { offset: "100%", properties: { transform: "rotate(360deg)" } },
  ]),
  pulse: () => buildKeyframes("pulse", [
    { offset: "0%", properties: { transform: "scale(1)" } },
    { offset: "50%", properties: { transform: "scale(1.05)" } },
    { offset: "100%", properties: { transform: "scale(1)" } },
  ]),
  shake: () => buildKeyframes("shake", [
    { offset: "0%", properties: { transform: "translateX(0)" } },
    { offset: "10%", properties: { transform: "translateX(-4px)" } },
    { offset: "20%", properties: { transform: "translateX(4px)" } },
    { offset: "30%", properties: { transform: "translateX(-4px)" } },
    { offset: "40%", properties: { transform: "translateX(4px)" } },
    { offset: "50%", properties: { transform: "translateX(0)" } },
    { offset: "60%", properties: { transform: "translateX(-4px)" } },
    { offset: "70%", properties: { transform: "translateX(4px)" } },
    { offset: "80%", properties: { transform: "translateX(-4px)" } },
    { offset: "90%", properties: { transform: "translateX(4px)" } },
    { offset: "100%", properties: { transform: "translateX(0)" } },
  ]),
};

/** Apply a prebuilt animation to an element */
export function animate(
  el: HTMLElement,
  animationName: string,
  duration = "0.3s",
  timing = "ease-out",
  fillMode = "forwards",
): Promise<void> {
  return new Promise((resolve) => {
    el.style.animation = `${animationName} ${duration} ${timing} ${fillMode}`;
    el.addEventListener("animationend", () => {
      el.style.animation = "";
      resolve();
    }, { once: true });
  });
}

// --- Class Manipulation ---

/** Toggle one or more classes */
export function toggleClass(el: Element, ...classes: (string | undefined | null | false)[]): void {
  for (const cls of classes) {
    if (!cls) continue;
    if (cls === false || cls === null) {
      el.className = "";
    } else if (cls.startsWith("!")) {
      el.classList.toggle(cls.slice(1));
    } else {
      el.classList.toggle(cls);
    }
  }
}

/** Add class only if condition is met */
export function classIf(el: Element, className: string, condition: boolean): void {
  if (condition) el.classList.add(className);
  else el.classList.remove(className);
}

/** Replace all classes with new ones */
export function setClasses(el: Element, classes: string): void {
  el.className = classes;
}

/** Check if element has any of the given classes */
export function hasAnyClass(el: Element, ...classes: string[]): boolean {
  return classes.some((c) => el.classList.contains(c));
}

// --- Z-Index Layering ---

/** Bring element to front (highest z-index) */
export function bringToFront(el: HTMLElement): void {
  let highest = 0;
  const siblings = el.parentElement?.children;
  if (siblings) {
    for (const sib of Array.from(siblings)) {
      const z = parseInt(getComputedStyle(sib as HTMLElement).zIndex) || 0;
      if (z > highest) highest = z;
    }
  }
  el.style.zIndex = String(highest + 1);
}

/** Send element to back (lowest z-index among siblings) */
export function sendToBack(el: HTMLElement): void {
  let lowest = Infinity;
  const siblings = el.parentElement?.children;
  if (siblings) {
    for (const sib of Array.from(siblings)) {
      const z = parseInt(getComputedStyle(sib as HTMLElement).zIndex) || 0;
      if (z < lowest) lowest = z;
    }
  }
  el.style.zIndex = String(Math.max(0, lowest - 1));
}
