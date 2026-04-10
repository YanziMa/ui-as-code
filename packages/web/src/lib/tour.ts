/**
 * Tour/Guide: Step-by-step feature introduction with highlighted elements,
 * tooltips, keyboard navigation, progress indicator, and step customization.
 */

// --- Types ---

export interface TourStep {
  /** Step identifier */
  key: string;
  /** Title */
  title: string;
  /** Description text */
  description?: string;
  /** Target element selector (null for centered/standalone step) */
  target?: string | null;
  /** Position relative to target */
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Custom icon/emoji before title */
  icon?: string;
  /** Show "skip" button */
  allowSkip?: boolean;
  /** Action button text */
  actionText?: string;
  /** Callback when this step is shown */
  onEnter?: () => void;
  /** Callback when leaving this step */
  onLeave?: () => void;
  /** Before proceeding validation */
  beforeNext?: () => Promise<boolean> | boolean;
}

export interface TourOptions {
  /** Tour steps */
  steps: TourStep[];
  /** Start immediately on creation */
  startImmediately?: boolean;
  /** Show step counter (e.g., "3/5") */
  showProgress?: boolean;
  /** Show dots indicator */
  showDots?: boolean;
  /** Mask/overlay background (dim everything except target) */
  mask?: boolean;
  /** Mask color */
  maskColor?: string;
  /** Allow clicking overlay to dismiss */
  clickOverlayToClose?: boolean;
  /** Keyboard navigation enabled */
  keyboardNav?: boolean;
  /** Animation duration ms */
  animationDuration?: number;
  /** Z-index */
  zIndex?: number;
  /** Callback on tour complete */
  onComplete?: () => void;
  /** Callback on tour skip */
  onSkip?: () => void;
  /** Callback on step change */
  onStepChange?: (step: TourStep, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface TourInstance {
  element: HTMLDivElement;
  currentStep: number;
  start: () => void;
  next: () => Promise<void>;
  prev: () => void;
  goTo: (index: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  destroy: () => void;
}

// --- Main ---

export function createTour(options: TourOptions): TourInstance {
  const opts = {
    startImmediately: options.startImmediately ?? false,
    showProgress: options.showProgress ?? true,
    showDots: options.showDots ?? true,
    mask: options.mask ?? true,
    maskColor: options.maskColor ?? "rgba(0,0,0,0.55)",
    clickOverlayToClose: options.clickOverlayToClose ?? false,
    keyboardNav: options.keyboardNav ?? true,
    animationDuration: options.animationDuration ?? 300,
    zIndex: options.zIndex ?? 10000,
    className: options.className ?? "",
    ...options,
  };

  // Overlay
  const overlay = document.createElement("div");
  overlay.className = `tour-overlay ${opts.className}`;
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;z-index:${opts.zIndex};
    display:none;align-items:center;justify-content:center;
  `;
  document.body.appendChild(overlay);

  // Tooltip card
  const tooltip = document.createElement("div");
  tooltip.className = "tour-tooltip";
  tooltip.style.cssText = `
    position:relative;background:#fff;border-radius:12px;
    box-shadow:0 20px 60px rgba(0,0,0,0.2),0 4px 12px rgba(0,0,0,0.1);
    max-width:380px;width:90%;padding:20px 24px;
    font-family:-apple-system,sans-serif;z-index:${opts.zIndex + 1};
    transform:scale(0.95);opacity:0;transition:all ${opts.animationDuration}ms ease;
  `;
  overlay.appendChild(tooltip);

  // State
  let currentStepIdx = -1;
  let isActive = false;
  let isPaused = false;
  let destroyed = false;
  let highlightedEl: HTMLElement | null = null;
  let spotlightRect: DOMRect | null = null;

  function showStep(index: number): void {
    if (index < 0 || index >= opts.steps.length) return;

    const step = opts.steps[index]!;

    // Leave previous step
    if (currentStepIdx >= 0 && opts.steps[currentStepIdx]?.onLeave) {
      opts.steps[currentStepIdx]!.onLeave!();
    }

    currentStepIdx = index;

    // Clear previous highlight
    clearHighlight();

    // Find target element
    if (step.target) {
      const el = document.querySelector<HTMLElement>(step.target);
      if (el) {
        highlightElement(el);
      }
    } else {
      spotlightRect = null;
    }

    // Position tooltip
    positionTooltip(step);

    // Render content
    renderTooltipContent(step);

    // Show with animation
    overlay.style.display = "flex";
    requestAnimationFrame(() => {
      tooltip.style.transform = "scale(1)";
      tooltip.style.opacity = "1";
    });

    // Draw mask
    if (opts.mask) drawMask();

    step.onEnter?.();
    opts.onStepChange?.(step, index);
  }

  function highlightElement(el: HTMLElement): void {
    highlightedEl = el;
    spotlightRect = el.getBoundingClientRect();

    // Scroll into view if needed
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function clearHighlight(): void {
    highlightedEl = null;
    spotlightRect = null;
  }

  function positionTooltip(step: TourStep): void {
    const placement = step.placement ?? (step.target ? "bottom" : "center");

    if (placement === "center") {
      tooltip.style.position = "relative";
      tooltip.style.top = "";
      tooltip.style.left = "";
      tooltip.style.transformOrigin = "center center";
      return;
    }

    tooltip.style.position = "absolute";
    tooltip.style.transformOrigin =
      placement === "top" ? "center bottom" :
      placement === "bottom" ? "center top" :
      placement === "left" ? "right center" : "left center";

    if (spotlightRect) {
      const offsets: Record<string, { top: number; left: number }> = {
        top: { top: spotlightRect.top - tooltip.offsetHeight - 12, left: spotlightRect.left + spotlightRect.width / 2 },
        bottom: { top: spotlightRect.bottom + 12, left: spotlightRect.left + spotlightRect.width / 2 },
        left: { top: spotlightRect.top + spotlightRect.height / 2, left: spotlightRect.left - tooltip.offsetWidth - 12 },
        right: { top: spotlightRect.top + spotlightRect.height / 2, left: spotlightRect.right + 12 },
      };
      const off = offsets[placement]!;
      tooltip.style.top = `${off.top}px`;
      tooltip.style.left = `${off.left}px`;
      tooltip.style.transform = "translate(-50%, -50%) scale(0.95)";
    }
  }

  function renderTooltipContent(step: TourStep): void {
    tooltip.innerHTML = "";

    // Header area
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;";

    if (step.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.textContent = step.icon;
      iconSpan.style.fontSize = "22px";
      header.appendChild(iconSpan);
    }

    const title = document.createElement("h3");
    title.textContent = step.title;
    title.style.cssText = "margin:0;font-size:17px;font-weight:700;color:#111827;";
    header.appendChild(title);

    // Progress
    if (opts.showProgress) {
      const progress = document.createElement("span");
      progress.style.cssText = "margin-left:auto;font-size:12px;color:#9ca3af;font-weight:500;";
      progress.textContent = `${currentStepIdx + 1}/${opts.steps.length}`;
      header.appendChild(progress);
    }

    tooltip.appendChild(header);

    // Description
    if (step.description) {
      const desc = document.createElement("p");
      desc.textContent = step.description;
      desc.style.cssText = "margin:0 0 18px;font-size:14px;line-height:1.6;color:#4b5563;";
      tooltip.appendChild(desc);
    }

    // Dots
    if (opts.showDots && opts.steps.length > 1) {
      const dots = document.createElement("div");
      dots.style.cssText = "display:flex;gap:6px;margin-bottom:16px;";
      for (let i = 0; i < opts.steps.length; i++) {
        const dot = document.createElement("span");
        dot.style.cssText = `
          width:8px;height:8px;border-radius:50%;background:${i === currentStepIdx ? "#4338ca" : "#d1d5db"};
          transition:background 0.2s;cursor:pointer;flex-shrink:0;
        `;
        dot.addEventListener("click", () => goTo(i));
        dots.appendChild(dot);
      }
      tooltip.appendChild(dots);
    }

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";

    // Skip button
    if (step.allowSkip !== false && currentStepIdx < opts.steps.length - 1) {
      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.textContent = "Skip";
      skipBtn.style.cssText = `
        padding:7px 14px;border-radius:6px;border:1px solid #d1d5db;background:#fff;
        cursor:pointer;font-size:13px;color:#6b7280;transition:all 0.15s;
      `;
      skipBtn.addEventListener("click", () => stop());
      btnRow.appendChild(skipBtn);
    }

    // Back button
    if (currentStepIdx > 0) {
      const backBtn = document.createElement("button");
      backBtn.type = "button";
      backBtn.textContent = "Back";
      backBtn.style.cssText = `
        padding:7px 14px;border-radius:6px;border:1px solid #d1d5db;background:#fff;
        cursor:pointer;font-size:13px;color:#374151;transition:all 0.15s;
      `;
      backBtn.addEventListener("click", () => prev());
      btnRow.appendChild(backBtn);
    }

    // Next/Finish button
    const isLast = currentStepIdx >= opts.steps.length - 1;
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = isLast ? (step.actionText ?? "Done") : (step.actionText ?? "Next");
    nextBtn.style.cssText = `
      padding:7px 18px;border-radius:6px;border:none;background:#4338ca;
      cursor:pointer;font-size:13px;color:#fff;font-weight:500;
      transition:all 0.15s;
    `;
    nextBtn.addEventListener("click", () => { if (isLast) complete(); else next(); });
    nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "#3730a3"; });
    nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = "#4338ca"; });
    btnRow.appendChild(nextBtn);

    tooltip.appendChild(btnRow);
  }

  function drawMask(): void {
    // Use CSS approach: semi-transparent background + clip-path for spotlight
    if (spotlightRect) {
      const pad = 6;
      overlay.style.background = opts.maskColor;
      // Create a "hole" effect using radial gradient at spotlight position
      overlay.style.setProperty(
        "--spotlight",
        `radial-gradient(circle at ${spotlightRect.left + spotlightRect.width / 2}px ${spotlightRect.top + spotlightRect.height / 2}px, transparent ${Math.max(spotlightRect.width, spotlightRect.height) / 2 + pad}px, ${opts.maskColor} ${Math.max(spotlightRect.width, spotlightRect.height) / 2 + pad + 20}px)`
      );
      overlay.style.background = `var(--spotlight), ${opts.maskColor}`;
    } else {
      overlay.style.background = opts.maskColor;
    }
  }

  async function next(): Promise<void> {
    if (isPaused || currentStepIdx >= opts.steps.length - 1) return;
    const step = opts.steps[currentStepIdx]!;
    if (step.beforeNext) {
      const canProceed = await step.beforeNext();
      if (!canProceed) return;
    }
    showStep(currentStepIdx + 1);
  }

  function prev(): void {
    if (isPaused || currentStepIdx <= 0) return;
    showStep(currentStepIdx - 1);
  }

  function goTo(index: number): void {
    if (index < 0 || index >= opts.steps.length || isPaused) return;
    showStep(index);
  }

  function complete(): void {
    isActive = false;
    hideAnimation();
    clearHighlight();
    opts.onComplete?.();
  }

  function stop(): void {
    isActive = false;
    isPaused = false;
    hideAnimation();
    clearHighlight();
    opts.onSkip?.();
  }

  function hideAnimation(): void {
    tooltip.style.transform = "scale(0.95)";
    tooltip.style.opacity = "0";
    setTimeout(() => {
      overlay.style.display = "none";
    }, opts.animationDuration);
  }

  // Keyboard navigation
  if (opts.keyboardNav) {
    document.addEventListener("keydown", handleKeyDown);
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (!isActive || isPaused) return;
    switch (e.key) {
      case "ArrowRight":
      case "Enter":
      case " ":
        e.preventDefault();
        if (currentStepIdx >= opts.steps.length - 1) complete(); else next();
        break;
      case "ArrowLeft":
        e.preventDefault();
        prev();
        break;
      case "Escape":
        e.preventDefault();
        stop();
        break;
    }
  }

  // Click overlay to close
  if (opts.clickOverlayToClose) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) stop();
    });
  }

  // Auto-start
  if (opts.startImmediately) {
    start();
  }

  const instance: TourInstance = {
    element: overlay,
    get currentStep() { return currentStepIdx; },

    start() {
      if (isActive) return;
      isActive = true;
      isPaused = false;
      showStep(0);
    },

    next,
    prev,
    goTo,

    pause() { isPaused = true; },
    resume() { isPaused = false; },

    stop,

    destroy() {
      destroyed = true;
      document.removeEventListener("keydown", handleKeyDown);
      clearHighlight();
      overlay.remove();
    },
  };

  return instance;
}
