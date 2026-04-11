/**
 * Tour Utilities: Step-by-step onboarding tours with spotlight highlighting,
 * keyboard navigation, progress indicators, tooltips, step persistence,
 * and custom positioning.
 */

// --- Types ---

export interface TourStep {
  /** Unique identifier */
  id: string;
  /** Target element selector or element reference */
  target: string | HTMLElement;
  /** Step title */
  title: string;
  /** Step description / content */
  content: string;
  /** Optional HTML content (overrides content) */
  htmlContent?: string;
  /** Position of tooltip relative to target */
  placement?: "top" | "bottom" | "left" | "right" | "center";
  /** Spotlight padding around target in px */
  spotlightPadding?: number;
  /** Show arrow/pointer on tooltip */
  showArrow?: boolean;
  /** Custom class for this step's tooltip */
  className?: string;
  /** Action button text (default "Next") */
  actionText?: string;
  /** Skip this step? */
  skip?: boolean;
  /** Called before this step is shown (return false to skip) */
  beforeShow?: () => boolean | Promise<boolean>;
  /** Called after this step is shown */
  afterShow?: () => void;
}

export interface TourOptions {
  /** Array of tour steps */
  steps: TourStep[];
  /** Start at a specific step index */
  startAt?: number;
  /** Show progress indicator (e.g., "2/5") */
  showProgress?: boolean;
  /** Show "Skip" button */
  showSkip?: boolean;
  /** Show "Prev" button */
  showPrev?: boolean;
  /** Show "Done" text on last step instead of "Next" */
  doneText?: string;
  /** Skip button text */
  skipText?: string;
  /** Next button text */
  nextText?: string;
  /** Prev button text */
  prevText?: string;
  /** Spotlight overlay opacity */
  spotlightOpacity?: number;
  /** Animation duration (ms) */
  duration?: number;
  /** Keyboard navigation enabled */
  keyboardNav?: boolean;
  /** Allow clicking outside to advance */
  clickOutsideAdvance?: boolean;
  /** Disable body scroll during tour */
  lockScroll?: boolean;
  /** Custom container for tooltip */
  container?: HTMLElement;
  /** Z-index for overlays */
  zIndex?: number;
  /** Called when tour starts */
  onStart?: () => void;
  /** Called when tour ends (completed or skipped) */
  onEnd?: (completed: boolean, lastStepIndex: number) => void;
  /** Called when step changes */
  onStepChange?: (step: TourStep, index: number) => void;
  /** Persist step index in localStorage under this key */
  storageKey?: string;
}

export interface TourInstance {
  /** The root overlay element */
  el: HTMLElement;
  /** Start the tour */
  start: () => void;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  prev: () => void;
  /** Go to specific step */
  goTo: (index: number) => void;
  /** End the tour */
  end: (completed?: boolean) => void;
  /** Check if tour is active */
  isActive: () => boolean;
  /** Get current step index */
  getCurrentStep: () => number;
  /** Get total steps count */
  getTotalSteps: () => number;
  /** Update steps dynamically */
  updateSteps: (steps: TourStep[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create an interactive step-by-step tour/onboarding guide.
 *
 * @example
 * ```ts
 * const tour = createTour({
 *   steps: [
 *     { id: "welcome", target: "#header", title: "Welcome", content: "This is your dashboard" },
 *     { id: "sidebar", target: ".sidebar", title: "Navigation", content: "Use this to navigate" },
 *   ],
 *   showProgress: true,
 *   showSkip: true,
 * });
 * tour.start();
 * ```
 */
export function createTour(options: TourOptions): TourInstance {
  const {
    steps,
    startAt = 0,
    showProgress = true,
    showSkip = true,
    showPrev = true,
    doneText = "Done",
    skipText = "Skip",
    nextText = "Next",
    prevText = "Back",
    spotlightOpacity = 0.4,
    duration = 250,
    keyboardNav = true,
    clickOutsideAdvance = false,
    lockScroll = true,
    container = document.body,
    zIndex = 9999,
    onStart,
    onEnd,
    onStepChange,
    storageKey,
  } = options;

  let _active = false;
  let _currentStep = Math.min(startAt, steps.length - 1);
  let _steps = [...steps];
  let _tooltipEl: HTMLElement | null = null;
  let _spotlightRect: DOMRect | null = null;

  // Scroll lock ref
  let unlockScrollFn: (() => void) | null = null;

  // Overlay layer
  const overlay = document.createElement("div");
  overlay.className = "tour-overlay";
  overlay.style.cssText =
    `position:fixed;inset:0;z-index:${zIndex};display:none;` +
    `pointer-events:none;`;

  // Canvas for spotlight cutout effect
  const canvas = document.createElement("canvas");
  canvas.className = "tour-spotlight-canvas";
  canvas.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  overlay.appendChild(canvas);

  // Tooltip container
  const tooltipContainer = document.createElement("div");
  tooltipContainer.className = "tour-tooltip-container";
  tooltipContainer.style.cssText =
    "position:absolute;z-index:1;display:none;";
  overlay.appendChild(tooltipContainer);

  container.appendChild(overlay);

  // --- Internal Helpers ---

  function getTargetElement(step: TourStep): HTMLElement | null {
    if (typeof step.target === "string") {
      return document.querySelector(step.target);
    }
    return step.target;
  }

  function drawSpotlight(targetRect: DOMRect | null): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fill dark overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${spotlightOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!targetRect) return;

    // Cut out spotlight area (clear)
    const pad = _steps[_currentStep]?.spotlightPadding ?? 8;
    const x = targetRect.left - pad;
    const y = targetRect.top - pad;
    const w = targetRect.width + pad * 2;
    const h = targetRect.height + pad * 2;

    ctx.globalCompositeOperation = "destination-out";

    // Rounded rectangle cutout
    const r = 8;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";

    // Draw subtle border around spotlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function buildTooltip(step: TourStep, index: number): HTMLElement {
    const el = document.createElement("div");
    el.className = `tour-tooltip ${step.className ?? ""}`.trim();

    const placement = step.placement ?? "bottom";
    const isLast = index === _steps.length - 1;
    const isFirst = index === 0;

    el.style.cssText =
      "background:#fff;border-radius:10px;padding:16px 20px;" +
      "box-shadow:0 8px 32px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.08);" +
      "max-width:340px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" +
      "font-size:14px;line-height:1.5;color:#374151;position:relative;";

    // Arrow
    if (step.showArrow !== false) {
      const arrow = document.createElement("div");
      arrow.className = "tour-arrow";
      const arrowSize = 8;
      const arrowColor = "#fff";
      const arrowStyleMap: Record<string, string> = {
        top: `bottom:-${arrowSize}px;left:50%;transform:translateX(-50%);border-left:${arrowSize}px solid transparent;border-right:${arrowSize}px solid transparent;border-top:${arrowSize}px solid ${arrowColor};`,
        bottom: `top:-${arrowSize}px;left:50%;transform:translateX(-50%);border-left:${arrowSize}px solid transparent;border-right:${arrowSize}px solid transparent;border-bottom:${arrowSize}px solid ${arrowColor};`,
        left: `right:-${arrowSize}px;top:50%;transform:translateY(-50%);border-top:${arrowSize}px solid transparent;border-bottom:${arrowSize}px solid transparent;border-left:${arrowSize}px solid ${arrowColor};`,
        right: `left:-${arrowSize}px;top:50%;transform:translateY(-50%);border-top:${arrowSize}px solid transparent;border-bottom:${arrowSize}px solid transparent;border-right:${arrowSize}px solid ${arrowColor};`,
      };
      arrow.style.cssText = "position:absolute;width:0;height:0;" + (arrowStyleMap[placement] ?? arrowStyleMap.bottom);
      el.appendChild(arrow);
    }

    // Header row: title + progress
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;";

    const title = document.createElement("h3");
    title.textContent = step.title;
    title.style.cssText = "margin:0;font-size:15px;font-weight:600;color:#111827;";
    headerRow.appendChild(title);

    if (showProgress) {
      const progress = document.createElement("span");
      progress.textContent = `${index + 1}/${_steps.length}`;
      progress.style.cssText = "font-size:12px;color:#9ca3af;font-weight:500;";
      headerRow.appendChild(progress);
    }

    el.appendChild(headerRow);

    // Content
    const body = document.createElement("div");
    body.className = "tour-tooltip-body";
    if (step.htmlContent) {
      body.innerHTML = step.htmlContent;
    } else {
      body.textContent = step.content;
    }
    body.style.cssText = "margin-bottom:16px;color:#4b5563;";
    el.appendChild(body);

    // Buttons row
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:8px;";

    if (showSkip && !isLast) {
      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.textContent = skipText;
      skipBtn.style.cssText =
        "background:none;border:none;color:#9ca3af;cursor:pointer;" +
        "padding:6px 12px;font-size:13px;border-radius:6px;transition:color 0.12s;";
      skipBtn.addEventListener("mouseenter", () => { skipBtn.style.color = "#6b7280"; });
      skipBtn.addEventListener("mouseleave", () => { skipBtn.style.color = ""; });
      skipBtn.addEventListener("click", () => end(false));
      btnRow.appendChild(skipBtn);
    }

    // Spacer
    const spacer = document.createElement("span");
    spacer.style.flex = "1";
    btnRow.appendChild(spacer);

    if (showPrev && !isFirst) {
      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.textContent = prevText;
      prevBtn.style.cssText =
        "background:#f3f4f6;border:none;color:#374151;cursor:pointer;" +
        "padding:7px 14px;font-size:13px;border-radius:6px;font-weight:500;" +
        "transition:background 0.12s;";
      prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "#e5e7eb"; });
      prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = ""; });
      prevBtn.addEventListener("click", () => prev());
      btnRow.appendChild(prevBtn);
    }

    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.textContent = isLast ? doneText : (step.actionText ?? nextText);
    actionBtn.style.cssText =
      "background:#3b82f6;border:none;color:#fff;cursor:pointer;" +
      "padding:7px 18px;font-size:13px;border-radius:6px;font-weight:500;" +
      "transition:background 0.12s;";
    actionBtn.addEventListener("mouseenter", () => { actionBtn.style.background = "#2563eb"; });
    actionBtn.addEventListener("mouseleave", () => { actionBtn.style.background = ""; });
    actionBtn.addEventListener("click", () => { isLast ? end(true) : next(); });
    btnRow.appendChild(actionBtn);

    el.appendChild(btnRow);

    return el;
  }

  function positionTooltip(tooltip: HTMLElement, targetRect: DOMRect, placement: string): void {
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const gap = 12;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "top":
        top = targetRect.top - tooltipRect.height - gap;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case "bottom":
        top = targetRect.bottom + gap;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case "left":
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - gap;
        break;
      case "right":
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + gap;
        break;
      case "center":
        top = (viewH - tooltipRect.height) / 2;
        left = (viewW - tooltipRect.width) / 2;
        break;
    }

    // Boundary clamping
    left = Math.max(8, Math.min(left, viewW - tooltipRect.width - 8));
    top = Math.max(8, Math.min(top, viewH - tooltipRect.height - 8));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function scrollToTarget(el: HTMLElement): void {
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }

  function persistStep(index: number): void {
    if (storageKey) {
      try { localStorage.setItem(storageKey, String(index)); } catch { /* noop */ }
    }
  }

  function restoreStep(): number {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved !== null) {
          const idx = parseInt(saved, 10);
          if (!isNaN(idx) && idx >= 0 && idx < _steps.length) return idx;
        }
      } catch { /* noop */ }
    }
    return startAt;
  }

  // --- Methods ---

  async function start(): Promise<void> {
    if (_active) return;
    _active = true;

    _currentStep = restoreStep();

    overlay.style.display = "block";
    overlay.style.pointerEvents = "";

    if (lockScroll) unlockScrollFn = _lockBodyScroll();

    // Resize handler for canvas
    const onResize = () => {
      const step = _steps[_currentStep];
      if (step) {
        const target = getTargetElement(step);
        _spotlightRect = target?.getBoundingClientRect() ?? null;
        drawSpotlight(_spotlightRect);
      }
    };
    window.addEventListener("resize", onResize);

    // Keyboard handler
    let keyHandler: ((e: KeyboardEvent) => void) | null = null;
    if (keyboardNav) {
      keyHandler = (e: KeyboardEvent) => {
        switch (e.key) {
          case "ArrowRight":
          case "Enter":
          case " ": e.preventDefault(); next(); break;
          case "ArrowLeft": e.preventDefault(); prev(); break;
          case "Escape": e.preventDefault(); end(false); break;
        }
      };
      document.addEventListener("keydown", keyHandler);
    }

    // Click outside handler
    let clickHandler: ((e: MouseEvent) => void) | null = null;
    if (clickOutsideAdvance) {
      clickHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest(".tour-tooltip")) {
          next();
        }
      };
      overlay.addEventListener("click", clickHandler);
    }

    // Store cleanup
    (_cleanupFns as Array<() => void>).push(
      () => window.removeEventListener("resize", onResize),
      ...(keyHandler ? [() => document.removeEventListener("keydown", keyHandler)] : []),
      ...(clickHandler ? [() => overlay.removeEventListener("click", clickHandler)] : []),
    );

    await showStep(_currentStep);
    onStart?.();
  }

  async function showStep(index: number): Promise<void> {
    if (index < 0 || index >= _steps.length) return;

    const step = _steps[index]!;
    if (step.skip) {
      if (index < _steps.length - 1) {
        await showStep(index + 1);
        return;
      }
    }

    // BeforeShow guard
    if (step.beforeShow) {
      const canShow = await step.beforeShow();
      if (!canShow) {
        if (index < _steps.length - 1) {
          await showStep(index + 1);
        } else {
          end(true);
        }
        return;
      }
    }

    _currentStep = index;
    persistStep(index);

    // Get target element
    const target = getTargetElement(step);
    _spotlightRect = target?.getBoundingClientRect() ?? null;

    // Scroll target into view
    if (target) scrollToTarget(target);

    // Wait for scroll
    await new Promise((r) => setTimeout(r, duration > 150 ? duration - 100 : 100));

    // Update spotlight rect after scroll
    _spotlightRect = target?.getBoundingClientRect() ?? null;

    // Draw spotlight
    drawSpotlight(_spotlightRect);

    // Remove old tooltip
    if (_tooltipEl) {
      _tooltipEl.remove();
      _tooltipEl = null;
    }

    // Build new tooltip
    _tooltipEl = buildTooltip(step, index);
    tooltipContainer.appendChild(_tooltipEl);

    // Position tooltip
    const placement = step.placement ?? "bottom";
    if (_spotlightRect && placement !== "center") {
      positionTooltip(_tooltipEl, _spotlightRect, placement);
    } else {
      positionTooltip(_tooltipEl, _spotlightRect ?? new DOMRect(
        window.innerWidth / 2, window.innerHeight / 2, 0, 0
      ), "center");
    }

    // Animate in
    tooltipContainer.style.display = "";
    _tooltipEl.style.opacity = "0";
    _tooltipEl.style.transform = "translateY(8px)";
    _tooltipEl.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _tooltipEl!.style.opacity = "1";
        _tooltipEl!.style.transform = "translateY(0)";
      });
    });

    onStepChange?.(step, index);
    step.afterShow?.();
  }

  function next(): void {
    if (_currentStep < _steps.length - 1) {
      showStep(_currentStep + 1);
    } else {
      end(true);
    }
  }

  function prev(): void {
    if (_currentStep > 0) {
      showStep(_currentStep - 1);
    }
  }

  function goTo(index: number): void {
    if (index >= 0 && index < _steps.length) {
      showStep(index);
    }
  }

  function end(completed = false): void {
    if (!_active) return;
    _active = false;

    // Animate out
    if (_tooltipEl) {
      _tooltipEl.style.opacity = "0";
      _tooltipEl.style.transform = "translateY(-8px)";
    }

    setTimeout(() => {
      if (_tooltipEl) { _tooltipEl.remove(); _tooltipEl = null; }
      overlay.style.display = "none";
      overlay.style.pointerEvents = "none";

      // Cleanup all listeners
      for (const fn of _cleanupFns) fn();
      _cleanupFns = [];

      unlockScrollFn?.();
      unlockScrollFn = null;

      // Clear canvas
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

      onEnd?.(completed, _currentStep);
    }, duration);
  }

  function isActive(): boolean { return _active; }
  function getCurrentStep(): number { return _currentStep; }
  function getTotalSteps(): number { return _steps.length; }

  function updateSteps(newSteps: TourStep[]): void {
    _steps = [...newSteps];
    if (_active) showStep(Math.min(_currentStep, _steps.length - 1));
  }

  function destroy(): void {
    end(false);
    overlay.remove();
  }

  // Cleanup array
  const _cleanupFns: Array<() => void> = [];

  return { el: overlay, start, next, prev, goTo, end, isActive, getCurrentStep, getTotalSteps, updateSteps, destroy };
}

/** Simple body scroll lock for tour */
function _lockBodyScroll(): () => void {
  const body = document.body;
  const originalOverflow = body.style.overflow;
  const originalPR = body.style.paddingRight;
  const sbWidth = window.innerWidth - document.documentElement.clientWidth;

  body.style.overflow = "hidden";
  if (sbWidth > 0) {
    const currentPR = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${currentPR + sbWidth}px`;
  }

  return () => {
    body.style.overflow = originalOverflow;
    body.style.paddingRight = originalPR;
  };
}
