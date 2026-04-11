/**
 * CSS Reset: Normalize/reset stylesheets, modern CSS reset,
 * customizable reset variants, print styles, and utility classes.
 */

// --- Types ---

export type ResetVariant = "normalize" | "modern" | "minimal" | "tailwind" | "none";

export interface ResetOptions {
  /** Which reset variant to use */
  variant?: ResetVariant;
  /** Target container (default: document.head) */
  target?: HTMLElement;
  /** Include box-sizing: border-box globally? (default: true) */
  borderBox?: boolean;
  /** Base font family */
  fontFamily?: string;
  /** Base font size (default: 16px) */
  fontSize?: string;
  /** Base line height */
  lineHeight?: string;
  /** Text rendering optimization */
  textRendering?: string;
  /** Custom CSS to append after reset */
  extraCSS?: string;
  /** Include focus-visible polyfill styles? */
  focusVisible?: boolean;
  /** Include selection color styles? */
  selectionStyles?: boolean;
  /** Include reduced motion media query? */
  reducedMotion?: boolean;
  /** Include print-specific resets? */
  printStyles?: boolean;
  /** Unique ID for the style element */
  id?: string;
}

export interface ResetInstance {
  element: HTMLStyleElement;
  /** Get the generated CSS text */
  getCSS: () => string;
  /** Remove the reset from DOM */
  remove: () => void;
}

// --- Built-in Resets ---

const RESETS: Record<ResetVariant, string> = {
  normalize: `/*! normalize.css v8.0.1 | MIT License | github.com/necolas/normalize.css */
html{line-height:1.15;-webkit-text-size-adjust:100%;-moz-tab-size:4;tab-size:4}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"}
hr{height:0;color:inherit}
abbr[title]{text-decoration:underline dotted}
b,strong{font-weight:bolder}
code,kbd,samp,pre{font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;font-size:1em}
small{font-size:80%}
sub,sup{font-size:75%;line-height 0;position:relative;vertical-align:baseline}sub{bottom:-0.25em}sup{top:-0.5em}
table{text-indent:0;border-color:inherit}
button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;line-height:1.15;margin:0}
button,select{text-transform:none}[role="button"],[type="button"]{cursor:pointer}
button,[type="button"],[type="reset"],[type="submit"]{-webkit-appearance:button}
progress{vertical-align:baseline}
::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}
summary{display:list-item}`,

  modern: `/* Modern CSS Reset — Josh Comeau */
*,*::before,*::after{box-sizing:border-box}*::before,*::after{margin:0;padding:0}:root{-moz-tab-size:4;tab-size:4;font:16px/1.5 sans-serif;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}html{scroll-behavior:smooth}@media(prefers-reduced-motion){*,:*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}body{min-height:100vh;line-height:1.5}img,picture,video,canvas,svg{display:block;max-width:100%}input,button,textarea,select{font:inherit}p,h1,h2,h3,h4,h5,h6{overflow-wrap:break-word}p{text-wrap:balance}#{$root,a{color:oklch(0.7 0.2 250)}a:not([class]){color:light-dark(oklch(0.7 0.2 250),oklch(0.6 0.2 30)))}}`,

  minimal: `/* Minimal Reset */*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}:root{font-size:16px;line-height:1.5}body{font-family:system-ui,-apple-system,sans-serif;min-height:100vh}img{max-width:100%;display:block}button,input,select,textarea{font:inherit}`,

  tailwind: `/* Tailwind CSS Preflight - https://tailwindcss.com/preflight */*,::before::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}::before,::after{@media(prefers-color-scheme:dark){border-color:#374151}}html{line-height:1.5;-webkit-text-size-adjust:100%;tab-size:4}body{margin:0;line-height:inherit;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji";tab-size:4}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",Menlo,monospace;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;text-indent:0;border-color:inherit}button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;line-height:1.15;margin:0}button,[role="button"]{cursor:pointer}:disabled{cursor:default}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}`,
};

// --- Utility Add-ons ---

const FOCUS_VISIBLE = `/* Focus-visible polyfill */:focus-visible{outline:2px solid #6366f1;outline-offset:2px}:focus:not(:focus-visible){outline:none}`;

const SELECTION_STYLES = `::selection{background:#6366f1;color:#fff}::-moz-selection{background:#6366f1;color:#fff}`;

const REDUCED_MOTION = `@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;scroll-behavior:auto!important}}`;

const PRINT_STYLES = `@media print{body{background:#fff;color:#000}img{max-width:100%!important}a,a:visited{text-decoration:underline}a[href]::after{content:"(" attr(href)")"}a[href^="#"]::after,a[href^="javascript:"]::after{content:""}pre{white-space:pre-wrap!important}thead{display:table-header-group}tr,img{page-break-inside:avoid}p,h2,h3{orphans:3;widows:3}h2,h3{page-break-after:avoid}}`;

// --- Main Function ---

/**
 * Inject a CSS reset into the document.
 */
export function injectReset(options: ResetOptions = {}): ResetInstance {
  const opts = {
    variant: options.variant ?? "modern",
    borderBox: options.borderBox ?? true,
    fontSize: options.fontSize ?? "16px",
    lineHeight: options.lineHeight ?? "1.5",
    fontFamily: options.fontFamily ?? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textRendering: options.textRendering ?? "optimizeLegibility",
    focusVisible: options.focusVisible ?? false,
    selectionStyles: options.selectionStyles ?? true,
    reducedMotion: options.reducedMotion ?? true,
    printStyles: options.printStyles ?? false,
    ...options,
  };

  const target = opts.target ?? document.head;

  // Build the complete CSS
  let css = "";

  // Main reset
  if (opts.variant !== "none") {
    css += RESETS[opts.variant];
  }

  // Box-sizing
  if (opts.borderBox && opts.variant !== "modern" && opts.variant !== "minimal" && opts.variant !== "tailwind") {
    css += `*,*::before,*::after{box-sizing:border-box}`;
  }

  // Root-level overrides
  css += `:root{font-size:${opts.fontSize};line-height:${opts.lineHeight};font-family:${opts.fontFamily};text-rendering:${opts.textRendering};}`;

  // Body
  css += `body{font-family:${opts.fontFamily};line-height:${opts.lineHeight};}`;

  // Focus visible
  if (opts.focusVisible) css += FOCUS_VISIBLE;

  // Selection
  if (opts.selectionStyles) css += SELECTION_STYLES;

  // Reduced motion
  if (opts.reducedMotion) css += REDUCED_MOTION;

  // Print
  if (opts.printStyles) css += PRINT_STYLES;

  // Extra custom CSS
  if (opts.extraCSS) css += opts.extraCSS;

  // Create and inject <style> element
  const el = document.createElement("style");
  el.setAttribute("data-css-reset", opts.variant);
  if (opts.id) el.id = opts.id;
  el.textContent = css;
  target.appendChild(el);

  return {
    element: el,
    getCSS: () => css,
    remove: () => el.remove(),
  };
}

/** Get the raw CSS for a reset variant without injecting it */
export function getResetCSS(variant: ResetVariant = "modern"): string {
  return RESETS[variant];
}

/** Generate a customized reset CSS string */
export function generateReset(options: ResetOptions = {}): string {
  const instance = injectReset({ ...options, target: document.createElement("head") });
  const css = instance.getCSS();
  instance.remove();
  return css;
}
