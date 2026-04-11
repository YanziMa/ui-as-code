/**
 * Lightweight Steps / Stepper: Horizontal/vertical step indicator with 4 variants
 * (default/line/dot/arrow), step statuses (pending/active/completed/error/skipped),
 * progress line fill, content panel, navigation buttons.
 */

// --- Types ---

export type StepsVariant = "default" | "line" | "dot" | "arrow";
export type StepStatus = "pending" | "active" | "completed" | "error" | "skipped";
export type StepsDirection = "horizontal" | "vertical";

export interface StepItem {
  /** Title */
  title: string;
  /** Optional description */
  description?: string;
  /** Status */
  status?: StepStatus;
  /** Icon (emoji or HTML) */
  icon?: string | HTMLElement;
}

export interface StepsOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Step items */
  steps: StepItem[];
  /** Current active step index (0-based) */
  current?: number;
  /** Visual variant */
  variant?: StepsVariant;
  /** Direction */
  direction?: StepsDirection;
  /** Show labels? (always shown for default/arrow, optional for line/dot) */
  showLabels?: boolean;
  /** Show descriptions under active step? */
  showDescription?: boolean;
  /** Show navigation buttons (prev/next)? */
  showNav?: boolean;
  /** Callback on step change */
  onChange?: (index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface StepsInstance {
  element: HTMLElement;
  getCurrentStep: () => number;
  setCurrentStep: (index: number) => void;
  next: () => void;
  prev: () => void;
  getSteps: () => StepItem[];
  setSteps: (steps: StepItem[]) => void;
  destroy: () => void;
}

// --- Config ---

const STATUS_COLORS: Record<StepStatus, { bg: string; color: string; border: string }> = {
  pending:   { bg: "#f3f4f6", color: "#9ca3af", border: "#e5e7eb" },
  active:   { bg: "#4f46e5", color: "#fff",   border: "#4338ca" },
  completed: { bg: "#22c55e", color: "#fff",   border: "#16a34a" },
  error:    { bg: "#ef4444", color: "#fff",   border: "#dc2626" },
  skipped:  { bg: "#e5e7eb", color: "#6b7280", border: "#d1d5db" },
};

const SIZE_CONFIG = {
  horizontal: { dotSize: 32, labelSize: 13, gap: 0 },
  vertical:   { dotSize: 28, labelSize: 12, gap: 16 },
};

// --- Main Factory ---

export function createSteps(options: StepsOptions): StepsInstance {
  const opts = {
    current: options.current ?? 0,
    variant: options.variant ?? "default",
    direction: options.direction ?? "horizontal",
    showLabels: options.showLabels ?? true,
    showDescription: options.showDescription ?? true,
    showNav: options.showNav ?? false,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Steps: container not found");

  let steps = [...options.steps];
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `steps steps-${opts.direction} ${opts.className}`;
  root.style.cssText = "font-family:-apple-system,sans-serif;color:#374151;";
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";

    const isH = opts.direction === "horizontal";
    const sz = SIZE_CONFIG[opts.direction];

    // Steps header
    const header = document.createElement("div");
    header.className = "steps-header";
    header.style.cssText = isH
      ? "display:flex;align-items:center;"
      : "display:flex;flex-direction:column;gap:0;";

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const isActive = i === opts.current;
      const status = step.status ?? (isActive ? "active" : opts.current > i ? "completed" : "pending");
      const sc = STATUS_COLORS[status];
      const isCompleted = status === "completed";

      // Step item wrapper
      const stepEl = document.createElement("div");
      stepEl.className = "step-item";
      stepEl.dataset.index = String(i);
      stepEl.style.cssText = isH
        ? "display:flex;align-items:center;flex:1;position:relative;"
        : "display:flex;align-items:center;gap:12px;padding:8px 0;";

      if (!isH && i > 0) {
        // Connector line above
        const connector = document.createElement("div");
        connector.style.cssText = `
          position:absolute;left:${sz.dotSize / 2 + 2}px;top:-8px;width:2px;height:16px;
          background:${isCompleted ? sc.border : "#e5e7eb"};
        `;
        stepEl.appendChild(connector);
      }

      // Dot / circle
      const dotWrap = document.createElement("div");
      dotWrap.style.cssText = `
        flex-shrink:0;display:flex;align-items:center;justify-content:center;
        width:${sz.dotSize}px;height:${sz.dotSize}px;border-radius:50%;
        background:${sc.bg};border:2px solid ${sc.border};
        color:${sc.color};font-size:${isH ? sz.dotSize * 0.35 : sz.dotSize * 0.3}px;font-weight:600;
        transition:all 0.25s ease;z-index:1;
        ${status === "error" ? "animation:step-pulse 1.5s infinite;" : ""}
        cursor:${!destroyed && !step.description ? "pointer" : "default"};
      `;

      // Icon or number
      if (step.icon) {
        if (typeof step.icon === "string") {
          dotWrap.textContent = step.icon;
        } else {
          dotWrap.innerHTML = "";
          dotWrap.appendChild(step.icon);
        }
      } else {
        switch (opts.variant) {
          case "dot":
            dotWrap.textContent = "";
            break;
          case "arrow":
            dotWrap.innerHTML = i < steps.length - 1 ? "&#9654;" : "&#10003;";
            break;
          default:
            dotWrap.textContent = String(i + 1);
            break;
        }
      }

      if (!destroyed) {
        dotWrap.addEventListener("click", () => {
          instance.setCurrentStep(i);
        });
      }

      stepEl.appendChild(dotWrap);

      // Label
      if (opts.showLabels || opts.variant === "default" || opts.variant === "arrow") {
        const label = document.createElement("span");
        label.className = "step-label";
        label.textContent = step.title;
        label.style.cssText = `
          font-size:${sz.labelSize}px;font-weight:${isActive ? "600" : "400"};
          color:${isActive ? "#111827" : "#6b7280"};
          margin-left:${isH ? "8px" : "0"};white-space:nowrap;line-height:1.3;
          transition:color 0.25s;
        `;
        stepEl.appendChild(label);
      }

      header.appendChild(stepEl);

      // Connector line (horizontal)
      if (isH && i < steps.length - 1) {
        const line = document.createElement("div");
        line.className = "step-connector";
        line.style.cssText = `
          flex:1;height:2px;margin:0 8px;background:${isCompleted ? sc.color : "#e5e7eb"};
          border-radius:1px;transition:background 0.3s;margin-top:${(sz.dotSize - 2) / 2}px;
        `;
        header.appendChild(line);
      }
    }

    root.appendChild(header);

    // Content panel (description of current step)
    if (opts.showDescription) {
      const currentStep = steps[opts.current];
      if (currentStep?.description) {
        const panel = document.createElement("div");
        panel.className = "steps-content";
        panel.style.cssText = `
          margin-top:16px;padding:14px;background:#f9fafb;border-radius:8px;
          font-size:13px;color:#4b5563;line-height:1.6;
        `;
        panel.textContent = currentStep.description;
        root.appendChild(panel);
      }
    }

    // Navigation buttons
    if (opts.showNav) {
      const nav = document.createElement("div");
      nav.style.cssText = "display:flex;justify-content:space-between;margin-top:20px;";

      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.innerHTML = "&larr; Previous";
      prevBtn.disabled = opts.current <= 0;
      prevBtn.style.cssText = `
        padding:8px 18px;border:1px solid #d1d5db;border-radius:6px;
        background:#fff;color:#374151;font-size:13px;font-weight:500;cursor:pointer;
        ${prevBtn.disabled ? "opacity:0.4;cursor:not-allowed;" : ""};
      prevBtn.addEventListener("click", () => instance.prev());
      nav.appendChild(prevBtn);

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.innerHTML = "Next &rarr;";
      nextBtn.disabled = opts.current >= steps.length - 1;
      nextBtn.style.cssText = `
        padding:8px 18px;border:none;border-radius:6px;
        background:#4f46e5;color:#fff;font-size:13px;font-weight:500;cursor:pointer;
        ${nextBtn.disabled ? "opacity:0.4;cursor:not-allowed;" : ""};
      nextBtn.addEventListener("click", () => instance.next());
      nav.appendChild(nextBtn);

      root.appendChild(nav);
    }

    // Inject pulse animation
    if (!document.getElementById("steps-pulse-style")) {
      const s = document.createElement("style");
      s.id = "steps-pulse-style";
      s.textContent = "@keyframes step-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.15);}}";
      document.head.appendChild(s);
    }
  }

  render();

  const instance: StepsInstance = {
    element: root,

    getCurrentStep() { return opts.current; },

    setCurrentStep(index: number) {
      if (index >= 0 && index < steps.length && index !== opts.current) {
        opts.current = index;
        render();
        opts.onChange?.(index);
      }
    },

    next() {
      if (opts.current < steps.length - 1) {
        opts.current++;
        render();
        opts.onChange?.(opts.current);
      }
    },

    prev() {
      if (opts.current > 0) {
        opts.current--;
        render();
        opts.onChange?.(opts.current);
      }
    },

    getSteps() { return [...steps]; },

    setSteps(newSteps: StepItem[]) {
      steps = newSteps;
      if (opts.current >= steps.length) opts.current = Math.max(0, steps.length - 1);
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
