/**
 * Onboarding Tour: Step-by-step guided tour with spotlight highlighting,
 * tooltips, keyboard navigation, progress indicator, localStorage persistence,
 * and accessibility support.
 */

// --- Types ---

export interface TourStep {
  /** Unique key */
  id: string;
  /** Target element selector or element */
  target: string | HTMLElement;
  /** Title for the tooltip */
  title: string;
  /** Description/content */
  content: string;
  /** Position of tooltip relative to target */
  position?: "top" | "bottom" | "left" | "right" | "center";
  /** Optional image/illustration (HTML string) */
  illustration?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action callback */
  onAction?: () => void;
  /** Skip this step? */
  skippable?: boolean;
  /** Custom order (auto if not set) */
  order?: number;
  /** Highlight style */
  highlightStyle?: "ring" | "outline" | "dim" | "none";
}

export interface TourOptions {
  /** Steps in the tour */
  steps: TourStep[];
  /** Start tour immediately? */
  startImmediately?: boolean;
  /** Show progress indicator */
  showProgress?: boolean;
  /** Show step counter (e.g., "3 of 8") */
  showCounter?: boolean;
  /** Allow keyboard navigation (arrows, Escape) */
  keyboardNav?: boolean;
  /** Allow clicking outside to dismiss */
  dismissOnClickOutside?: boolean;
  /** Storage key for persistence (default: "tour-completed") */
  storageKey?: string;
  /** Callback when tour starts */
  onStart?: () => void;
  /** Callback when tour completes */
  onComplete?: () => void;
  /** Callback when tour is skipped */
  onSkip?: () => void;
  /** Callback on step change */
  onStepChange?: (step: TourStep, index: number) => void;
  /** Root container for overlay (default: document.body) */
  root?: HTMLElement;
  /** Z-index for overlay */
  zIndex?: number;
  /** Tooltip z-index (above overlay) */
  tooltipZIndex?: number;
  /** Overlay background color */
  overlayColor?: string;
  /** Spotlight padding in px */
  spotlightPadding?: number;
  /** Animation duration ms */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
}

export interface TourInstance {
  /** Current step index (0-based) */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Start the tour */
  start: () => void;
  /** Go to a specific step */
  goTo: (index: number) => void;
  /** Next step */
  next: () => void;
  /** Previous step */
  prev: () => void;
  /** Skip to end */
  skip: () => void;
  /** Pause/resume */
  pause: () => void;
  resume: () => void;
  /** Check if active */
  isActive: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
  /** Mark tour as completed (persists) */
  markCompleted: () => void;
  /** Check if tour was previously completed */
  isCompleted: () => boolean;
  /** Reset completion state */
  resetCompletion: () => void;
}

// --- Main Class ---

export class TourManager {
  create(options: TourOptions): TourInstance {
    const opts = {
      startImmediately: options.startImmediately ?? false,
      showProgress: options.showProgress ?? true,
      showCounter: options.showCounter ?? true,
      keyboardNav: options.keyboardNav ?? true,
      dismissOnClickOutside: options.dismissOnClickOutside ?? false,
      storageKey: options.storageKey ?? "tour-completed",
      root: options.root ?? document.body,
      zIndex: options.zIndex ?? 10001,
      tooltipZIndex: options.tooltipZIndex ?? 10002,
      overlayColor: options.overlayColor ?? "rgba(0,0,0,0.5)",
      spotlightPadding: options.spotlightPadding ?? 6,
      animationDuration: options.animationDuration ?? 250,
      ...options,
    };

    // Sort steps by order
    const sortedSteps = [...options.steps].sort((a, b) =>
      (a.order ?? 999) - (b.order ?? 999)
    );

    let currentIndex = 0;
    let isActive = false;
    let destroyed = false;

    // DOM elements
    const overlay = document.createElement("div");
    overlay.className = `tour-overlay ${opts.className ?? ""}`;
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:${opts.zIndex};background:${opts.overlayColor};
      display:none;pointer-events:none;transition:opacity ${opts.animationDuration}ms ease;
    `;

    const tooltip = document.createElement("div");
    tooltip.className = "tour-tooltip";
    tooltip.style.cssText = `
      position:absolute;z-index:${opts.tooltipZIndex};display:none;background:#fff;border-radius:10px;
      box-shadow:0 8px 30px rgba(0,0,0,0.2);padding:16px 20px;max-width:340px;
      font-family:-apple-system,sans-serif;font-size:14px;color:#333;line-height:1.5;
      pointer-events:auto;transition:all ${opts.animationDuration}ms ease;
    `;

    // Progress bar
    const progressBar = document.createElement("div");
    progressBar.className = "tour-progress";
    progressBar.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      display:flex;align-items:center;gap:8px;padding:8px 16px;
      background:#fff;border-radius:9999px;box-shadow:0 4px 12px rgba(0,0,0,0.15);
      z-index:${opts.tooltipZIndex + 1};font-size:13px;font-weight:500;
    `;

    const progressFill = document.createElement("div");
    progressFill.style.cssText = `height:4px;background:#4338ca;border-radius:2px;min-width:60px;transition:width ${opts.animationDuration}ms ease;`;
    progressBar.appendChild(progressFill);

    const progressText = document.createElement("span");
    progressText.style.cssText = "color:#666;";
    progressBar.appendChild(progressText);

    const navButtons = document.createElement("div");
    navButtons.style.cssText = "display:flex;gap:6px;margin-left:8px;";
    const prevBtn = createNavBtn("\u2039", "Previous");
    const nextBtn = createNavuBtn("\u203A", "Next");
    const skipBtn = createNavButton("Skip", "background:#f0f0f0;color:#666;");
    navButtons.append(prevBtn, nextBtn, skipBtn);

    progressBar.appendChild(navButtons);
    opts.root.appendChild(overlay);
    opts.root.appendChild(tooltip);
    opts.root.appendChild(progressBar);

    // Spotlight element
    let spotlightEl: HTMLDivElement | null = null;

    function createNavBtn(label: string, extraStyle = ""): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText = `
        padding:4px 14px;border:none;border-radius:6px;font-size:12px;font-weight:500;
        cursor:pointer;background:#4338ca;color:#fff;transition:opacity 0.15s;
        ${extraStyle}
      `;
      btn.addEventListener("mouseenter", () => { btn.style.opacity = "0.85"; });
      btn.addEventListener("mouseleave", () => { btn.style.opacity = ""; });
      return btn;
    }

    function getStep(): TourStep { return sortedSteps[currentIndex]!; }

    function showSpotlight(): void {
      if (spotlightEl) { spotlightEl.remove(); spotlightEl = null; }
      const step = getStep();
      const targetEl = typeof step.target === "string"
        ? document.querySelector(step.target)
        : step.target;

      if (!targetEl || step.highlightStyle === "none") return;

      const rect = targetEl.getBoundingClientRect();
      const pad = opts.spotlightPadding;

      spotlightEl = document.createElement("div");
      spotlightEl.className = "tour-spotlight";

      switch (step.highlightStyle ?? "ring") {
        case "ring":
          spotlightEl.style.cssText = `
            position:absolute;left:${rect.left - pad}px;top:${rect.top - pad}px;
            width:${rect.width + pad * 2}px;height:${rect.height + pad * 2}px;
            border:3px solid #6366f1;border-radius:12px;
            pointer-events:none;box-shadow:0 0 0 9999px rgba(99,102,241,0.25);
            transition:all ${opts.animationDuration}ms ease;
          `;
          break;
        case "outline":
          spotlightEl.style.cssText = `
            position:absolute;left:${rect.left - 2}px;top:${rect.top - 2}px;
            width:${rect.width + 4}px;height:${rect.height + 4}px;
            border:2px dashed #6366f1;border-radius:8px;
            pointer-events:none;transition:all ${opts.animationDuration}ms ease;
          `;
          break;
        case "dim":
          spotlightEl.style.cssText = `
            position:absolute;inset:0;background:rgba(0,0,0,0.35);
            pointer-events:none;transition:opacity ${opts.animationDuration}ms ease;
          `;
          break;
      }

      overlay.appendChild(spotlightEl);
    }

    function positionTooltip(): void {
      const step = getStep();
      const targetEl = typeof step.target === "string"
        ? document.querySelector(step.target)
        : step.target;

      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      const pos = step.position ?? "bottom";

      const positions: Record<string, { top: number; left: number }> = {
        top:    { top: rect.top - 280, left: rect.left + rect.width / 2 - 170 },
        bottom: { top: rect.bottom + 12, left: rect.left + rect.width / 2 - 170 },
        left:   { top: rect.top, left: rect.left - 360 },
        right:  { top: rect.top, left: rect.right + 12 },
        center: { top: rect.top + rect.height / 2 - 100, left: rect.left + rect.width / 2 - 170 },
      };

      const p = positions[pos] ?? positions.bottom;
      tooltip.style.top = `${Math.max(8, p.top)}px`;
      tooltip.style.left = `${Math.max(8, p.left)}px`;

      // Arrow
      const arrowDir = pos === "top" ? "bottom" : "top";
      tooltip.style.setProperty(`margin-${arrowDir}`, "8px", "");
    }

    function renderTooltip(): void {
      const step = getStep();

      let html = `<strong style="font-size:15px;display:block;margin-bottom:6px;">${escapeHtml(step.title)}</strong>`;
      html += `<div style="color:#555;font-size:13px;">${escapeHtml(step.content)}</div>`;

      if (step.illustration) {
        html += `<div style="margin-top:10px;text-align:center;">${step.illustration}</div>`;
      }

      if (step.actionLabel && step.onAction) {
        html += `<button data-tour-action="true" style="
          margin-top:14px;padding:8px 20px;width:100%;border:none;border-radius:6px;
          background:#4338ca;color:#fff;font-size:13px;font-weight:500;cursor:pointer;
        ">${escapeHtml(step.actionLabel)}</button>`;
      }

      // Step counter
      if (opts.showCounter) {
        html += `<div style="margin-top:12px;text-align:center;font-size:11px;color:#aaa;">
          ${currentIndex + 1} / ${sortedSteps.length}
        </div>`;
      }

      tooltip.innerHTML = html;

      // Bind action button
      const actionBtn = tooltip.querySelector('[data-tour-action="true"]');
      if (actionBtn) {
        actionBtn.addEventListener("click", () => {
          step.onAction?.();
          if (!step.skippable) instance.next();
        });
      }
    }

    function updateProgress(): void {
      if (sortedSteps.length <= 1) {
        progressBar.style.display = "none";
      } else {
        progressBar.style.display = "";
        const pct = ((currentIndex + 1) / sortedSteps.length * 100;
        progressFill.style.width = `${pct}%`;
        progressText.textContent = opts.showCounter
          ? `${currentIndex + 1} / ${sortedSteps.length}`
          : `${Math.round(pct)}%`;
      }

      prevBtn.disabled = currentIndex <= 0;
      nextBtn.disabled = currentIndex >= sortedSteps.length - 1;
    }

    function goToStep(index: number): void {
      if (index < 0 || index >= sortedSteps.length || index === currentIndex) return;
      currentIndex = index;
      showSpotlight();
      positionTooltip();
      renderTooltip();
      updateProgress();
      opts.onStepChange?.(getStep(), currentIndex);
    }

    const instance: TourInstance = {
      get currentStep() { return currentIndex; },
      get totalSteps() { return sortedSteps.length; },

      start() {
        if (destroyed || isActive) return;
        if (instance.isCompleted()) {
          instance.resetCompletion();
        }
        isActive = true;
        currentIndex = 0;
        overlay.style.display = "block";
        requestAnimationFrame(() => { overlay.style.opacity = "1"; });
        progressBar.style.display = "flex";
        showSpotlight();
        positionTooltip();
        tooltip.style.display = "block";
        requestAnimationFrame(() => { tooltip.style.opacity = "1"; transform = "scale(1)"; });
        renderTooltip();
        updateProgress();
        opts.onStart?.();
      },

      goTo(index: number) { goToStep(index); },
      next() { if (currentIndex < sortedSteps.length - 1) goToStep(currentIndex + 1); },
      prev() { if (currentIndex > 0) goToStep(currentIndex - 1); },

      skip() {
        currentIndex = sortedSteps.length - 1;
        updateProgress();
        overlay.style.display = "none";
        tooltip.style.display = "none";
        if (spotlightEl) spotlightEl.remove();
        isActive = false;
        opts.onSkip?.();
        opts.onComplete?.();
      },

      pause() {
        overlay.style.pointerEvents = "none";
        tooltip.style.pointerEvents = "none";
      },

      resume() {
        overlay.style.pointerEvents = "auto";
        tooltip.style.pointerEvents = "auto";
      },

      isActive: () => isActive,

      destroy() {
        destroyed = true;
        isActive = false;
        overlay.remove();
        tooltip.remove();
        progressBar.remove();
      },

      markCompleted() {
        try { localStorage.setItem(opts.storageKey, "true"); } catch {}
      },

      isCompleted() {
        try { return localStorage.getItem(opts.storageKey) === "true"; } catch { return false; }
      },

      resetCompletion() {
        try { localStorage.removeItem(opts.storageKey); } catch {}
      },
    };

    // Keyboard navigation
    if (opts.keyboardNav) {
      const keyHandler = (e: KeyboardEvent) => {
        if (!isActive) return;
        switch (e.key) {
          case "ArrowRight": case "ArrowDown": e.preventDefault(); instance.next(); break;
          case "ArrowLeft": case "ArrowUp": e.preventDefault(); instance.prev(); break;
          case "Escape": e.preventDefault(); instance.skip(); break;
        }
      };
      document.addEventListener("keydown", keyHandler);
      (instance as any)._keyHandler = keyHandler;
    }

    // Button events
    prevBtn.addEventListener("click", () => instance.prev());
    nextBtn.addEventListener("click", () => instance.next());
    skipBtn.addEventListener("click", () => instance.skip());

    // Click outside to dismiss
    if (opts.dismissOnClickOutside) {
      overlay.addEventListener("click", () => { if (isActive) instance.skip(); });
    }

    // Auto-start
    if (opts.startImmediately) {
      setTimeout(() => instance.start(), 300);
    }

    return instance;
  }
}

/** Convenience: create a tour */
export function createTour(options: TourOptions): TourInstance {
  return new TourManager().create(options);
}

// --- Utilities ---

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
