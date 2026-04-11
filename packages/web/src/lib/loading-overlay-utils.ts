/**
 * Loading Overlay Utilities: Full-screen or container loading overlay with
 * spinner, progress bar, text message, backdrop blur, cancel button,
 * and programmatic control.
 */

// --- Types ---

export type OverlayVariant = "default" | "blur" | "dark" | "light";
export type SpinnerType = "ring" | "dots" | "pulse" | "bars";

export interface LoadingOverlayOptions {
  /** Target element (null = full screen) */
  target?: HTMLElement | null;
  /** Message text below spinner */
  message?: string;
  /** Subtitle/description text */
  subtitle?: string;
  /** Spinner type */
  spinner?: SpinnerType;
  /** Spinner size in px */
  spinnerSize?: number;
  /** Spinner color */
  spinnerColor?: string;
  /** Show progress bar? */
  showProgress?: boolean;
  /** Initial progress (0-100) */
  progress?: number;
  /** Visual variant */
  variant?: OverlayVariant;
  /** Backdrop opacity (0-1) */
  opacity?: number;
  /** Show cancel button? */
  cancellable?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
  /** Cancel button text */
  cancelText?: string;
  /** Custom class name */
  className?: string;
  /** Z-index override */
  zIndex?: number;
}

export interface LoadingOverlayInstance {
  /** The overlay element */
  el: HTMLElement;
  /** Show the overlay */
  show(): void;
  /** Hide the overlay */
  hide(): void;
  /** Check if visible */
  isVisible(): boolean;
  /** Update message text */
  setMessage(msg: string): void;
  /** Update progress value */
  setProgress(value: number): void;
  /** Set spinner color */
  setSpinnerColor(color: string): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create a loading overlay.
 *
 * @example
 * ```ts
 * // Full-screen
 * const loader = createLoadingOverlay({ message: "Loading...", cancellable: true });
 * loader.show();
 *
 * // Container-bound
 * const cardLoader = createLoadingOverlay({
 *   target: cardElement,
 *   message: "Saving...",
 *   variant: "blur",
 *   showProgress: true,
 *   progress: 0,
 * });
 * ```
 */
export function createLoadingOverlay(options: LoadingOverlayOptions = {}): LoadingOverlayInstance {
  const {
    target,
    message,
    subtitle,
    spinner = "ring",
    spinnerSize = 40,
    spinnerColor = "#3b82f6",
    showProgress = false,
    progress = 0,
    variant = "default",
    opacity = 0.5,
    cancellable = false,
    onCancel,
    cancelText = "Cancel",
    className,
    zIndex = 9999,
  } = options;

  let _visible = false;

  // Root overlay
  const el = document.createElement("div");
  el.className = `loading-overlay ${variant} ${className ?? ""}`.trim();
  el.style.cssText =
    "position:absolute;inset:0;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;z-index:" + zIndex + ";" +
    "opacity:0;visibility:hidden;transition:opacity 0.2s ease;" +
    getVariantStyle(variant, opacity);

  if (!target) {
    el.style.position = "fixed";
    document.body.appendChild(el);
  }

  // Content wrapper
  const content = document.createElement("div");
  content.className = "overlay-content";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.alignItems = "center";
  content.style.gap = "12px";
  content.style.padding = "24px";

  // Spinner
  const spinnerEl = createSpinnerElement(spinner, spinnerSize, spinnerColor);
  content.appendChild(spinnerEl);

  // Message
  let msgEl: HTMLElement | null = null;
  if (message) {
    msgEl = document.createElement("div");
    msgEl.className = "overlay-message";
    msgEl.textContent = message;
    msgEl.style.cssText =
      "font-size:15px;font-weight:500;color:#374151;text-align:center;";
    content.appendChild(msgEl);
  }

  // Subtitle
  let subEl: HTMLElement | null = null;
  if (subtitle) {
    subEl = document.createElement("div");
    subEl.className = "overlay-subtitle";
    subEl.textContent = subtitle;
    subEl.style.cssText = "font-size:13px;color:#9ca3af;text-align:center;";
    content.appendChild(subEl);
  }

  // Progress bar
  let progressBar: HTMLElement | null = null;
  let progressFill: HTMLElement | null = null;

  if (showProgress) {
    progressBar = document.createElement("div");
    progressBar.className = "overlay-progress-track";
    progressBar.style.cssText =
      `width:${Math.min(280, (target?.clientWidth ?? window.innerWidth) - 80)}px;height:4px;` +
      "background:#e5e7eb;border-radius:2px;overflow:hidden;";

    progressFill = document.createElement("div");
    progressFill.className = "overlay-progress-fill";
    progressFill.style.cssText =
      `height:100%;background:${spinnerColor};border-radius:2px;transition:width 0.3s ease;width:${Math.max(0, Math.min(100, progress))}%;`;
    progressBar.appendChild(progressFill);

    const progressLabel = document.createElement("span");
    progressLabel.className = "overlay-progress-label";
    progressLabel.textContent = `${Math.round(progress)}%`;
    progressLabel.style.cssText = "font-size:11px;color:#9ca3af;margin-top:4px;";

    content.appendChild(progressBar);
    content.appendChild(progressLabel);
  }

  // Cancel button
  if (cancellable) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = cancelText;
    cancelBtn.style.cssText =
      "margin-top:12px;padding:6px 18px;border:1px solid #d1d5db;border-radius:8px;" +
      "background:#fff;color:#6b7280;font-size:13px;font-weight:500;cursor:pointer;" +
      "transition:border-color 0.12s,color 0.12s;";
    cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.borderColor = "#93c5fd"; cancelBtn.style.color = "#374151"; });
    cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.borderColor = "#d1d5db"; cancelBtn.style.color = "#6b7280"; });
    cancelBtn.addEventListener("click", () => { onCancel?.(); hide(); });
    content.appendChild(cancelBtn);
  }

  el.appendChild(content);

  if (target) {
    target.style.position = "relative";
    target.appendChild(el);
  }

  // --- Methods ---

  function show(): void {
    _visible = true;
    el.style.visibility = "visible";
    requestAnimationFrame(() => { el.style.opacity = String(opacity); });
  }

  function hide(): void {
    _visible = false;
    el.style.opacity = "0";
    setTimeout(() => { el.style.visibility = "hidden"; }, 200);
  }

  function isVisible(): boolean { return _visible; }

  function setMessage(msg: string): void {
    if (!msgEl && msg) {
      msgEl = document.createElement("div");
      msgEl.className = "overlay-message";
      msgEl.style.cssText =
        "font-size:15px;font-weight:500;color:#374151;text-align:center;";
      // Insert after spinner
      spinnerEl.after(msgEl);
    }
    if (msgEl) msgEl.textContent = msg;
  }

  function setProgress(value: number): void {
    if (progressFill) {
      progressFill.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }
    const label = el.querySelector(".overlay-progress-label") as HTMLElement | null;
    if (label) label.textContent = `${Math.round(value)}%`;
  }

  function setSpinnerColor(color: string): void {
    updateSpinnerColor(spinnerEl, spinner, color);
    if (progressFill) progressFill.style.background = color;
  }

  return {
    el, show, hide, isVisible, setMessage, setProgress, setSpinnerColor, destroy: () => { el.remove(); },
  };
}

// --- Internal Helpers ---

function getVariantStyle(v: OverlayVariant, opacity: number): string {
  switch (v) {
    case "blur":
      return `backdrop-filter:blur(4px);background:rgba(255,255,255,${opacity * 0.8});`;
    case "dark":
      return `background:rgba(17,24,39,${opacity});`;
    case "light":
      return `background:rgba(255,255,255,${opacity});`;
    default:
      return `background:rgba(255,255,255,${opacity});`;
  }
}

function createSpinnerElement(type: SpinnerType, size: number, color: string): HTMLElement {
  const container = document.createElement("div");
  container.className = "overlay-spinner";
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;

  switch (type) {
    case "ring": {
      container.innerHTML = `<svg viewBox="0 0 50 50" style="width:100%;height:100%;animation:spin 0.8s linear infinite;"><circle cx="25" cy="25" r="20" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-dasharray="80,200" stroke-dashoffset="60"/></svg>`;
      break;
    }
    case "dots": {
      container.style.display = "flex";
      container.style.gap = "4px";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        dot.style.cssText =
          `width:${size / 4}px;height:${size / 4}px;border-radius:50%;` +
          `background:${color};animation:bounce 1s ease-in-out ${i * 0.16}s infinite;`;
        container.appendChild(dot);
      }
      break;
    }
    case "pulse": {
      container.innerHTML = `<div style="width:100%;height:100%;border-radius:50%;background:${color};opacity:0.3;animation:pulse-scale 1.2s ease-in-out infinite;"></div>`;
      break;
    }
    case "bars": {
      container.style.display = "flex";
      container.style.gap = "3px";
      container.style.alignItems = "end";
      for (let i = 0; i < 4; i++) {
        const bar = document.createElement("div");
        bar.style.cssText =
          `width:${size / 8}px;background:${color};border-radius:2px;` +
          `animation:bar-rise 1s ease-in-out ${i * 0.15}s infinite;`;
        bar.style.height = `${size * (0.4 + i * 0.2)}px`;
        container.appendChild(bar);
      }
      break;
    }
  }

  injectSpinnerKeyframes();
  return container;
}

function updateSpinnerColor(el: HTMLElement, type: SpinnerType, color: string): void {
  if (type === "ring") {
    const circle = el.querySelector("circle");
    if (circle) circle.setAttribute("stroke", color);
  } else if (type === "dots") {
    el.querySelectorAll("span").forEach((dot) => { (dot as HTMLElement).style.background = color; });
  } else if (type === "pulse") {
    const inner = el.querySelector("div");
    if (inner) (inner as HTMLElement).style.background = color;
  } else if (type === "bars") {
    el.querySelectorAll("[style*='background']").forEach((bar) => { (bar as HTMLElement).style.background = color; });
  }
}

function injectSpinnerKeyframes(): void {
  if (document.getElementById("spinner-keyframes")) return;

  const style = document.createElement("style");
  style.id = "spinner-keyframes";
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    @keyframes pulse-scale {
      0%, 100% { transform: scale(0.9); opacity: 0.3; }
      50% { transform: scale(1.05); opacity: 0.6; }
    }
    @keyframes bar-rise {
      0%, 100% { height: 30%; }
      50% { height: 80%; }
    }
  `;
  document.head.appendChild(style);
}
