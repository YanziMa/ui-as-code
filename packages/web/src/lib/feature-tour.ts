/**
 * Feature Tour / Onboarding: Step-by-step guided tour with
 * highlighted elements, tooltip positioning, progress indicators,
 * keyboard navigation, skip/resume/end callbacks, and localStorage persistence.
 */

// --- Types ---

export interface TourStep {
  /** Unique identifier */
  id: string;
  /** Target element or selector to highlight */
  target: HTMLElement | string;
  /** Tooltip title */
  title?: string;
  /** Tooltip content (HTML supported) */
  content: string;
  /** Placement relative to target */
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Optional icon/emoji */
  icon?: string;
  /** Action button text */
  actionText?: string;
  /** Action callback */
  onAction?: () => void;
  /** Show this step? (for conditional logic) */
  condition?: () => boolean;
  /** Order/priority */
  order?: number;
}

export interface TourOptions {
  /** Tour steps in order */
  steps: TourStep[];
  /** Tour identifier (for persistence) */
  tourId?: string;
  /** Start immediately on create? */
  autoStart?: boolean;
  /** Show step counter? */
  showCounter?: boolean;
  /** Show navigation arrows? */
  showNavigation?: boolean;
  /** Show skip button? */
  showSkip?: boolean;
  /** Show progress bar? */
  showProgress?: boolean;
  /** Overlay color */
  overlayColor?: string;
  /** Highlight padding around target (px) */
  highlightPadding?: number;
  /** Highlight border radius */
  highlightRadius?: number;
  /** Z-index of overlay */
  zIndex?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Keyboard shortcuts enabled? */
  keyboardNav?: boolean;
  /** Persist progress in localStorage? */
  persistProgress?: boolean;
  /** Callback when tour starts */
  onStart?: () => void;
  /** Callback when tour ends (completed or skipped) */
  onEnd?: (completed: boolean, currentStep: number) => void;
  /** Callback on step change */
  onStepChange?: (step: TourStep, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface TourInstance {
  /** Current step index (0-based) */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Start the tour */
  start: (stepIndex?: number) => void;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  prev: () => void;
  /** Go to specific step */
  goTo: (index: number) => void;
  /** Skip/end the tour */
  skip: () => void;
  /** Pause the tour */
  pause: () => void;
  /** Resume the tour */
  resume: () => void;
  /** Check if tour is active */
  isActive: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Class ---

export class FeatureTourManager {
  create(options: TourOptions): TourInstance {
    const opts = {
      autoStart: options.autoStart ?? false,
      showCounter: options.showCounter ?? true,
      showNavigation: options.showNavigation ?? true,
      showSkip: options.showSkip ?? true,
      showProgress: options.showProgress ?? true,
      overlayColor: options.overlayColor ?? "rgba(0,0,0,0.6)",
      highlightPadding: options.highlightPadding ?? 4,
      highlightRadius: options.highlightRadius ?? 8,
      zIndex: options.zIndex ?? 10001,
      animationDuration: options.animationDuration ?? 200,
      keyboardNav: options.keyboardNav ?? true,
      persistProgress: options.persistProgress ?? true,
      className: options.className ?? "",
      ...options,
    };

    // Sort steps by order
    const steps = [...options.steps].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = `tour-overlay ${opts.className}`;
    overlay.style.cssText = `
      position:fixed;inset:0;background:${opts.overlayColor};
      z-index:${opts.zIndex};display:none;align-items:center;justify-content:center;
      transition:opacity ${opts.animationDuration}ms ease;
    `;
    document.body.appendChild(overlay);

    // Tooltip container
    const tooltip = document.createElement("div");
    tooltip.className = "tour-tooltip";
    tooltip.style.cssText = `
      position:absolute;background:#fff;border-radius:10px;padding:16px 20px;
      box-shadow:0 12px 40px rgba(0,0,0,0.25),0 4px 12px rgba(0,0,0,0.1);
      max-width:380px;z-index:${opts.zIndex + 1};
      font-family:-apple-system,sans-serif;font-size:14px;color:#374151;
      opacity:0;transform:scale(0.9) translateY(8px);
      transition:all ${opts.animationDuration}ms ease;
      pointer-events:auto;
    `;
    overlay.appendChild(tooltip);

    // Navigation controls
    const nav = document.createElement("div");
    nav.className = "tour-nav";
    nav.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      background:#fff;border-radius:10px;padding:10px 16px;margin-bottom:20px;
      box-shadow:0 4px 16px rgba(0,0,0,0.1);min-width:300px;
    `;

    // Counter
    if (opts.showCounter) {
      const counter = document.createElement("span");
      counter.className = "tour-counter";
      counter.style.cssText = "font-size:12px;color:#888;font-weight:500;";
      nav.appendChild(counter);
    }

    const navBtns = document.createElement("div");
    navBtns.style.cssText = "display:flex;gap:6px;";

    // Prev button
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.innerHTML = "&larr; Prev";
    prevBtn.style.cssText = "padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;font-weight:500;";
    prevBtn.addEventListener("click", () => instance.prev());
    navBtns.appendChild(prevBtn);

    // Next/Skip button
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.style.cssText = "padding:5px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#4338ca;color:#fff;cursor:pointer;font-size:12px;font-weight:500;";
    nextBtn.addEventListener("click", () => instance.next());
    navBtns.appendChild(nextBtn);

    // Skip button
    if (opts.showSkip) {
      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.innerHTML = "Skip";
      skipBtn.style.cssText = "padding:5px 12px;border:none;background:none;cursor:pointer;font-size:12px;color:#888;text-decoration:underline;";
      skipBtn.addEventListener("click", () => instance.skip());
      navBtns.appendChild(skipBtn);
    }

    nav.appendChild(navBtns);
    overlay.insertBefore(nav, tooltip);

    // Progress bar
    let progressBar: HTMLDivElement | null = null;
    if (opts.showProgress) {
      progressBar = document.createElement("div");
      progressBar.className = "tour-progress";
      progressBar.style.cssText = `
        width:100%;height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:12px;
      `;
      const fill = document.createElement("div");
      fill.className = "tour-progress-fill";
      fill.style.cssText = "height:100%;background:#4338ca;border-radius:2px;transition:width 200ms ease;width:0%;";
      progressBar.appendChild(fill);
      nav.appendChild(progressBar);
    }

    // State
    let currentIndex = 0;
    let isActive = false;
    let destroyed = false;
    let highlightEl: HTMLDivElement | null = null;

    // Restore persisted progress
    if (opts.persistProgress && opts.tourId) {
      try {
        const saved = localStorage.getItem(`tour-${opts.tourId}`);
        if (saved) currentIndex = Math.min(parseInt(saved, 10) || 0, steps.length - 1);
      } catch {}
    }

    function resolveTarget(step: TourStep): HTMLElement | null {
      return typeof step.target === "string"
        ? document.querySelector<HTMLElement>(step.target)
        : step.target;
    }

    function showStep(index: number): void {
      if (index < 0 || index >= steps.length || destroyed) return;
      currentIndex = index;
      const step = steps[index]!;

      // Check condition
      if (step.condition && !step.condition()) {
        if (index < steps.length - 1) {
          showStep(index + 1);
          return;
        } else {
          instance.skip();
          return;
        }
      }

      // Remove old highlight
      if (highlightEl) { highlightEl.remove(); highlightEl = null; }

      // Add highlight
      const targetEl = resolveTarget(step);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        highlightEl = document.createElement("div");
        highlightEl.className = "tour-highlight";
        highlightEl.style.cssText = `
          position:absolute;left:${rect.left - opts.highlightPadding}px;top:${rect.top - opts.highlightPadding}px;
          width:${rect.width + opts.highlightPadding * 2}px;height:${rect.height + opts.highlightPadding * 2}px;
          border:2px solid #4338ca;border-radius:${opts.highlightRadius}px;
          pointer-events:none;box-shadow:0 0 0 4px rgba(67,56,202,0.2);
          z-index:${opts.zIndex};
        document.body.appendChild(highlightEl);

        // Scroll target into view
        targetEl.scrollIntoView({ block: "center", behavior: "smooth" });
      }

      // Position tooltip
      positionTooltip(step, targetEl);

      // Update UI
      updateUI();

      opts.onStepChange?.(step, index);

      // Save progress
      if (opts.persistProgress && opts.tourId) {
        try { localStorage.setItem(`tour-${opts.tourId}`, String(index)); } catch {}
      }
    }

    function positionTooltip(step: TourStep, targetEl: HTMLElement | null): void {
      const placement = step.placement ?? "bottom";

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const positions: Record<string, { x: number; y: number }> = {
          top:     { x: rect.left + rect.width / 2, y: rect.top - 10 },
          bottom:  { x: rect.left + rect.width / 2, y: rect.bottom + 10 },
          left:    { x: rect.left - 10, y: rect.top + rect.height / 2 },
          right:   { x: rect.right + 10, y: rect.top + rect.height / 2 },
          center:  { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        };
        const pos = positions[placement] ?? positions.bottom;
        tooltip.style.left = `${pos.x}px`;
        tooltip.style.top = `${pos.y}px`;
        tooltip.style.transform = "translateX(-50%) translateY(0)";
      } else {
        tooltip.style.left = "50%";
        tooltip.style.top = "50%";
        tooltip.style.transform = "translateX(-50%) translateY(-50%)";
      }

      // Build tooltip content
      let html = "";
      if (step.icon) html += `<span style="font-size:20px;display:block;text-align:center;margin-bottom:6px;">${step.icon}</span>`;
      if (step.title) html += `<div style="font-weight:600;font-size:15px;color:#111827;margin-bottom:4px;">${step.title}</div>`;
      html += `<div style="color:#555;line-height:1.5;">${step.content}</div>`;

      if (step.actionText) {
        html += `<button class="tour-action-btn" style="
          margin-top:12px;padding:7px 18px;border:none;border-radius:6px;
          background:#4338ca;color:#fff;cursor:pointer;font-size:13px;font-weight:500;
        ">${step.actionText}</button>`;
        tooltip.querySelector(".tour-action-btn")?.addEventListener("click", (e) => {
          e.stopPropagation();
          step.onAction?.();
        });
      }

      // Step counter
      if (opts.showCounter) {
        const counterEl = nav.querySelector(".tour-counter");
        if (counterEl) counterEl.textContent = `${currentIndex + 1} / ${steps.length}`;
      }

      // Next button text
      const isLast = currentIndex >= steps.length - 1;
      nextBtn.textContent = isLast ? "Finish" : "Next &rarr;";
      nextBtn.style.display = isLast ? "" : "";
      nextBtn.onclick = () => isLast ? completeTour(true) : instance.next();
    }

    function updateUI(): void {
      tooltip.style.opacity = "1";
      tooltip.style.transform = "translateX(-50%) translateY(0)";

      if (progressBar) {
        const pct = ((currentIndex + 1) / steps.length) * 100;
        (progressBar.querySelector(".tour-progress-fill")!).style.width = `${pct}%`;
      }

      prevBtn.style.opacity = currentIndex <= 0 ? "0.4" : "1";
      prevBtn.style.pointerEvents = currentIndex <= 0 ? "none" : "auto";
    }

    function completeTour(completed: boolean): void {
      isActive = false;
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.style.display = "none";
        if (highlightEl) { highlightEl.remove(); highlightEl = null; }
      }, opts.animationDuration);

      if (opts.persistProgress && opts.tourId) {
        try { localStorage.removeItem(`tour-${opts.tourId}`); } catch {}
      }

      opts.onEnd?.(completed, currentIndex);
    }

    // Keyboard nav
    if (opts.keyboardNav) {
      document.addEventListener("keydown", handleKey);
    }

    function handleKey(e: KeyboardEvent): void {
      if (!isActive) return;
      switch (e.key) {
        case "ArrowRight": case "ArrowDown": e.preventDefault(); instance.next(); break;
        case "ArrowLeft": case "ArrowUp": e.preventDefault(); instance.prev(); break;
        case "Escape": e.preventDefault(); instance.skip(); break;
      }
    }

    const instance: TourInstance = {
      get currentStep() { return currentIndex; },
      get totalSteps() { return steps.length; },

      start(stepIndex?: number) {
        if (destroyed) return;
        isActive = true;
        overlay.style.display = "flex";
        setTimeout(() => { overlay.style.opacity = "1"; }, 10);
        showStep(stepIndex ?? 0);
        opts.onStart?.();
      },

      next() { showStep(currentIndex + 1); },
      prev() { showStep(currentIndex - 1); },
      goTo(index: number) { showStep(index); },

      skip() { completeTour(false); },
      pause() { /* TODO */ },
      resume() { /* TODO */ },
      isActive: () => isActive,

      destroy() {
        destroyed = true;
        isActive = false;
        document.removeEventListener("keydown", handleKey);
        overlay.remove();
        if (highlightEl) highlightEl.remove();
      },
    };

    if (opts.autoStart) {
      setTimeout(() => instance.start(), 500);
    }

    return instance;
  }
}

/** Convenience: create a feature tour */
export function createFeatureTour(options: TourOptions): TourInstance {
  return new FeatureTourManager().create(options);
}
