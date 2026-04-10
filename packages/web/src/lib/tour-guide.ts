/**
 * Tour Guide / Product Tour: Step-by-step interactive tour with highlights,
 * tooltips, progress indicators, keyboard navigation, step conditions,
 * storage for completion state, and responsive positioning.
 */

// --- Types ---

export interface TourStep {
  /** Unique ID */
  id: string;
  /** Title shown in tooltip */
  title: string;
  /** Description/content */
  content: string;
  /** Target element selector or element */
  target: string | HTMLElement;
  /** Position of tooltip relative to target */
  position?: "top" | "bottom" | "left" | "right" | "center";
  /** Optional icon/emoji */
  icon?: string;
  /** Custom CSS class */
  className?: string;
  /** Show arrow? (default: true) */
  showArrow?: boolean;
  /** Allow skip this step? (default: true) */
  skippable?: boolean;
  /** Action button text */
  actionText?: string;
  /** Callback for action button */
  onAction?: () => void | Promise<void>;
  /** Condition to show this step (return false to skip) */
  condition?: () => boolean;
  /** Before entering this step */
  onBeforeEnter?: () => void | Promise<void>;
  /** After leaving this step */
  onAfterLeave?: () => void | Promise<void>;
  /** Highlight options */
  highlight?: {
    padding?: number;
    color?: string;
    borderRadius?: number;
    scrollIntoView?: boolean;
  };
}

export interface TourOptions {
  container?: HTMLElement | string; // root container for overlay
  steps: TourStep[];
  /** Start at specific step index */
  startStep?: number;
  /** Show progress indicator? */
  showProgress?: boolean;
  /** Show step numbers? */
  showStepNumbers?: true;
  /** Show navigation arrows? */
  showArrows?: true;
  /** Show "Skip tour" button? */
  showSkip?: true;
  /** Show "Next"/"Done" buttons? */
  showButtons?: true;
  /** Keyboard navigation enabled? */
  keyboardNav?: true;
  /** Dismiss on click outside? */
  dismissOnOverlayClick?: boolean;
  /** Animation duration (ms, default: 250) */
  animationDuration?: number;
  /** Z-index for overlay */
  zIndex?: number;
  /** Overlay background color */
  overlayColor?: string;
  /** Tooltip theme */
  theme?: "light" | "dark";
  /** Callback when tour starts */
  onStart?: () => void;
  /** Callback when tour ends (completed or skipped) */
  onEnd?: (completed: boolean) => void;
  /** Callback on step change */
  onStepChange?: (step: TourStep, index: number) => void;
  /** Persist completion in localStorage? */
  persistKey?: string;
  /** Custom CSS class */
  className?: string;
}

export interface TourInstance {
  start: (stepIndex?: number) => void;
  next: () => void;
  prev: () => void;
  goTo: (stepIndex: number) => void;
  getCurrentStep: () => number;
  getStep: (index: number) => TourStep;
  isActive: () => boolean;
  complete: () => void;
  skip: () => void;
  destroy: () => void;
}

// --- Positioning ---

function getElement(target: string | HTMLElement): HTMLElement | null {
  return typeof target === "string"
    ? document.querySelector<HTMLElement>(target)
    : target;
}

function getPositionedRect(
  targetEl: HTMLElement,
  tooltipEl: HTMLElement,
  position: string,
): { x: number; y: number } {
  const rect = targetEl.getBoundingClientRect();
  const tRect = tooltipEl.getBoundingClientRect();

  let x: number, y: number;

  switch (position) {
    case "top":
      x = rect.left + rect.width / 2 - tRect.width / 2;
      y = rect.top - tRect.height - 8;
      break;
    case "bottom":
      x = rect.left + rect.width / 2 - tRect.width / 2;
      y = rect.bottom + 8;
      break;
    case "left":
      x = rect.left - tRect.width - 8;
      y = rect.top + rect.height / 2 - tRect.height / 2;
      break;
    case "right":
      x = rect.right + 8;
      y = rect.top + rect.height / 2 - tRect.height / 2;
      break;
    default: // center
      x = rect.left + rect.width / 2 - tRect.width / 2;
      y = rect.top + rect.height / 2 - tRect.height / 2;
      break;
  }

  // Keep within viewport
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  x = Math.max(8, Math.min(x, vpW - tRect.width - 8));
  y = Math.max(8, Math.min(y, vpH - tRect.height - 8));

  return { x, y };
}

// --- Main Class ---

export class TourManager {
  create(options: TourOptions): TourInstance {
    const opts = {
      startStep: options.startStep ?? 0,
      showProgress: options.showProgress ?? true,
      showArrows: options.showArrows ?? true,
      showSkip: options.showSkip ?? true,
      showButtons: options.showButtons ?? true,
      keyboardNav: options.keyboardNav ?? true,
      dismissOnOverlayClick: options.dismissOnOverlayClick ?? false,
      animationDuration: options.animationDuration ?? 250,
      zIndex: options.zIndex ?? 10000,
      overlayColor: options.overlayColor ?? "rgba(0,0,0,0.5)",
      theme: options.theme ?? "dark",
      ...options,
    };

    let currentStepIdx = opts.startStep;
    let isActive = false;
    let destroyed = false;

    // DOM elements
    let overlay: HTMLDivElement | null = null;
    let tooltip: HTMLDivElement | null = null;
    let highlightEl: HTMLDivElement | null = null;
    let progressEl: HTMLElement | null = null;

    function build(): void {
      cleanup();

      // Overlay
      overlay = document.createElement("div");
      overlay.className = `tour-overlay ${opts.className ?? ""}`;
      overlay.style.cssText = `
        position:fixed;inset:0;background:${opts.overlayColor};
        z-index:${opts.zIndex};display:none;align-items:center;justify-content:center;
      `;
      document.body.appendChild(overlay);

      // Progress bar
      if (opts.showProgress && opts.steps.length > 1) {
        progressEl = document.createElement("div");
        progressEl.style.cssText = `
          position:absolute;top:16px;left:50%;transform:translateX(-50%);
          display:flex;gap:4px;background:rgba(255,255,255,0.15);padding:4px 12px;border-radius:20px;z-index:${opts.zIndex + 1};
        `;
        for (let i = 0; i < opts.steps.length; i++) {
          const dot = document.createElement("div");
          dot.style.cssText = `
            width:8px;height:8px;border-radius:50%;background:${i <= currentStepIdx ? "#fff" : "rgba(255,255,255,0.3)"};
            transition:background ${opts.animationDuration}ms ease;
          `;
          progressEl.appendChild(dot);
        }
        overlay.appendChild(progressEl);
      }

      // Tooltip
      tooltip = document.createElement("div");
      tooltip.className = "tour-tooltip";
      tooltip.style.cssText = `
        position:absolute;z-index:${opts.zIndex + 2};
        max-width:360px;padding:16px 20px;border-radius:12px;
        font-family:-apple-system,sans-serif;font-size:13px;line-height:1.5;
        box-shadow:0 12px 40px rgba(0,0,0,0.25),0 0 1px rgba(0,0,0,0.1);
        opacity:0;pointer-events:auto;display:none;
        ${opts.theme === "dark"
          ? "background:#1f2937;color:#e5e7eb;"
          : "background:#fff;color:#374151;border:1px solid #e5e7eb;"}
      `;
      document.body.appendChild(tooltip);

      // Events
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay && opts.dismissOnOverlayClick) instance.skip();
      });
    }

    function renderTooltip(): void {
      if (!tooltip || !isActive) return;

      const step = opts.steps[currentStepIdx];
      if (!step) return;

      const targetEl = getElement(step.target);
      if (!targetEl) return;

      // Build tooltip content
      tooltip.innerHTML = "";

      // Arrow
      if (step.showArrow !== false) {
        const arrow = document.createElement("div");
        arrow.style.cssText = `
          position:absolute;width:10px;height:10px;background:inherit;
          transform:rotate(45deg);${getArrowStyle(step.position ?? "bottom")}
        `;
        tooltip.appendChild(arrow);
      }

      // Header
      const header = document.createElement("div");
      header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";
      if (step.icon) {
        const icon = document.createElement("span");
        icon.textContent = step.icon;
        icon.style.fontSize = "18px";
        header.appendChild(icon);
      }
      const title = document.createElement("span");
      title.textContent = step.title;
      title.style.fontWeight = "600";
      title.style.fontSize = "14px";
      header.appendChild(title);

      // Step counter
      if (opts.showStepNumbers !== false) {
        const counter = document.createElement("span");
        counter.style.cssText = "margin-left:auto;font-size:11px;color:#9ca3af;";
        counter.textContent = `${currentStepIdx + 1}/${opts.steps.length}`;
        header.appendChild(counter);
      }

      tooltip.appendChild(header);

      // Content
      const body = document.createElement("div");
      body.innerHTML = step.content;
      body.style.color = opts.theme === "dark" ? "#cbd5e1" : "#4b5563";
      tooltip.appendChild(body);

      // Buttons area
      const buttons = document.createElement("div");
      buttons.style.cssText = "display:flex;justify-content:space-between;gap:8px;margin-top:14px;";

      // Prev button
      if (currentStepIdx > 0 && opts.showArrows) {
        const prevBtn = createBtn("Prev", () => instance.prev());
        buttons.appendChild(prevBtn);
      } else {
        const spacer = document.createElement("span");
        spacer.style.flex = "1";
        buttons.appendChild(spacer);
      }

      // Skip button
      if (opts.showSkip && step.skippable !== false) {
        const skipBtn = createBtn("Skip", () => instance.skip(), true);
        buttons.appendChild(skipBtn);
      }

      // Next/Done button
      const isLast = currentStepIdx >= opts.steps.length - 1;
      if (isLast) {
        const doneBtn = createBtn("Done", () => instance.complete(), true);
        buttons.appendChild(doneBtn);
      } else {
        const nextBtn = createBtn("Next", () => instance.next());
        buttons.appendChild(nextBtn);
      }

      // Action button
      if (step.actionText && step.onAction) {
        const actionBtn = createBtn(step.actionText!, async () => {
          await step.onAction!();
          renderTooltip();
        }, false, true);
        actionBtn.style.order = "-1";
        buttons.insertBefore(actionBtn, buttons.lastChild.nextSibling);
      }

      tooltip.appendChild(buttons);

      // Position and show
      const pos = getPositionedRect(targetEl, tooltip, step.position ?? "bottom");
      tooltip.style.left = `${pos.x}px`;
      tooltip.style.top = `${pos.y}px`;
      tooltip.style.display = "block";

      requestAnimationFrame(() => {
        tooltip.style.opacity = "1";
        tooltip.style.transform = "translateY(0)";
      });

      // Highlight target
      renderHighlight(targetEl, step);
    }

    function getArrowStyle(position: string): string {
      switch (position) {
        case "top": return "bottom: -5px;left: 50%;margin-left: -5px;border-color: transparent transparent inherit transparent;";
        case "bottom": return "top: -5px;left: 50%;margin-left: -5px;border-color: transparent transparent transparent transparent;";
        case "left": return "right: -5px;top: 50%;margin-top: -5px;border-color: transparent transparent transparent inherit;";
        case "right": return "left: -5px;top: 50%;margin-top: -5px;border-color: transparent inherit transparent transparent;";
        default: return "top: -5px;left: 50%;margin-left: -5px;border-color: transparent transparent transparent transparent;";
      }
    }

    function renderHighlight(targetEl: HTMLElement, step: TourStep): void {
      removeHighlight();

      if (!step.highlight) return;

      const cfg = step.highlight;
      const rect = targetEl.getBoundingClientRect();
      highlightEl = document.createElement("div");
      highlightEl.className = "tour-highlight";
      highlightEl.style.cssText = `
        position:fixed;z-index:${opts.zIndex - 1};pointer-events:none;
        border:2px solid ${cfg.color ?? "#4338ca"};border-radius:${cfg.borderRadius ?? 6}px;
        top:${rect.top - (cfg.padding ?? 4)}px;left:${rect.left - (cfg.padding ?? 4)}px;
        width:${rect.width + (cfg.padding ?? 4) * 2}px;height:${rect.height + (cfg.padding ?? 4) * 2}px;
        transition: all ${opts.animationDuration}ms ease;
      `;
      document.body.appendChild(highlightEl);

      if (cfg.scrollIntoView !== false) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function removeHighlight(): void {
      if (highlightEl) { highlightEl.remove(); highlightEl = null; }
    }

    function createBtn(label: string, onClick: () => void, subtle = false, primary = false): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText = `
        padding:6px 16px;border-radius:6px;font-size:12px;font-weight:500;
        cursor:pointer;font-family:inherit;border:1px solid;
        ${primary
          ? "background:#4338ca;color:#fff;border-color:#4338ca;"
          : subtle
            ? "background:transparent;color:#9ca3af;border-color:transparent;"
            : "background:${opts.theme === "dark" ? "#374151" : "#fff"};color:${opts.theme === "dark" ? "#e5e7eb" : "#374151"};border-color:${opts.theme === "dark" ? "#4b5563" : "#d1d5db"};"}
        transition:all 0.15s;
      `;
      btn.addEventListener("click", onClick);
      btn.addEventListener("mouseenter", () => {
        if (!primary) btn.style.background = opts.theme === "dark" ? "#37415120" : "#f3f4f6";
      });
      btn.addEventListener("mouseleave", () => {
        if (!primary) btn.style.background = subtle ? "transparent" : (opts.theme === "dark" ? "#1f2937" : "#fff");
      });
      return btn;
    }

    function cleanup(): void {
      overlay?.remove();
      tooltip?.remove();
      removeHighlight();
      overlay = null;
      tooltip = null;
    }

    // Keyboard navigation
    function handleKeydown(e: KeyboardEvent): void {
      if (!isActive) return;
      switch (e.key) {
        case "ArrowRight":
        case "Enter":
        case " ": e.preventDefault(); instance.next(); break;
        case "ArrowLeft": e.preventDefault(); instance.prev(); break;
        case "Escape": e.preventDefault(); instance.skip(); break;
      }
    }

    const instance: TourInstance = {
      start(stepIndex) {
        if (destroyed) return;
        currentStepIdx = stepIndex ?? opts.startStep;
        isActive = true;
        build();
        overlay!.style.display = "flex";

        requestAnimationFrame(() => {
          overlay!.style.opacity = "1";
          renderTooltip();
        });

        document.addEventListener("keydown", handleKeydown);
        if (opts.keyboardNav) document.addEventListener("keydown", handleKeydown);
        opts.onStart?.();
        opts.onStepChange?.(opts.steps[currentStepIdx]!, currentStepIdx);
      },

      next() {
        if (!isActive || destroyed) return;
        if (currentStepIdx >= opts.steps.length - 1) { instance.complete(); return; }

        const current = opts.steps[currentStepIdx];
        current?.onAfterLeave?.();

        // Find next non-skipped step
        let nextIdx = currentStepIdx + 1;
        while (nextIdx < opts.steps.length) {
          const s = opts.steps[nextIdx];
          if (s?.condition?.() !== false) break;
          nextIdx++;
        }

        if (nextIdx >= opts.steps.length) { instance.complete(); return; }

        currentStepIdx = nextIdx;
        const step = opts.steps[currentStepIdx];
        step?.onBeforeEnter?.();
        renderTooltip();
        opts.onStepChange?.(step, currentStepIdx);
      },

      prev() {
        if (!isActive || destroyed || currentStepIdx <= 0) return;

        opts.steps[currentStepIdx]?.onAfterLeave?.();
        currentStepIdx--;
        const step = opts.steps[currentStepIdx];
        step?.onBeforeEnter?.();
        renderTooltip();
        opts.onStepChange?.(step, currentStepIdx);
      },

      goTo(index) {
        if (!isActive || destroyed || index < 0 || index >= opts.steps.length) return;
        opts.steps[currentStepIdx]?.onAfterLeave?.();
        currentStepIdx = index;
        const step = opts.steps[currentStepIdx];
        step?.onBeforeEnter?.();
        renderTooltip();
        opts.onStepChange?.(step, currentStepIdx);
      },

      getCurrentStep() { return currentStepIdx; },
      getStep(index) { return opts.steps[index]; },
      isActive() { return isActive; },

      complete() {
        if (!isActive) return;
        if (opts.persistKey) {
          try { localStorage.setItem(opts.persistKey, "completed"); } catch {}
        }
        endTour(true);
      },

      skip() {
        if (!isActive) return;
        endTour(false);
      },

      destroy() {
        destroyed = true;
        cleanup();
        document.removeEventListener("keydown", handleKeydown);
      },
    };

    function endTour(completed: boolean): void {
      isActive = false;
      if (tooltip) {
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(4px)";
        setTimeout(cleanup, opts.animationDuration);
      } else {
        cleanup();
      }
      if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay!.style.display = "none";
          overlay!.remove();
        }, opts.animationDuration);
      }
      removeHighlight();
      opts.onEnd?.(completed);
    }

    return instance;
  }
}

/** Convenience: create a tour guide */
export function createTour(options: TourOptions): TourInstance {
  return new TourManager().create(options);
}
