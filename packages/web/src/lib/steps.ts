/**
 * Steps / Stepper: Multi-step wizard/progress indicator with vertical/horizontal layout,
 * step descriptions, status tracking (pending/active/completed/error), navigation,
 * keyboard support, accessibility, and animated transitions.
 */

// --- Types ---

export type StepStatus = "pending" | "active" | "completed" | "error" | "skipped";

export interface StepItem {
  /** Unique key */
  key: string;
  /** Title/label */
  title: string;
  /** Description text (optional) */
  description?: string;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Optional content to show when active */
  content?: string | HTMLElement;
  /** Status override */
  status?: StepStatus;
  /** Disabled? */
  disabled?: boolean;
  /** Error message for error status */
  errorMessage?: string;
}

export type StepsOrientation = "horizontal" | "vertical";
export type StepsVariant = "default" | "line" | "dot" | "arrow";

export interface StepsOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Step items */
  items: StepItem[];
  /** Orientation */
  orientation?: StepsOrientation;
  /** Visual variant */
  variant?: StepsVariant;
  /** Initial active step key */
  currentStep?: string;
  /** Show descriptions under each step? */
  showDescriptions?: boolean;
  /** Show step numbers in circles? */
  showNumbers?: boolean;
  /** Show icons if provided? */
  showIcons?: boolean;
  /** Clickable steps (navigate on click)? */
  clickable?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Callback on step change */
  onChange?: (stepKey: string, index: number) => void;
  /** Callback before change (return false to prevent) */
  beforeChange?: (fromKey: string, toKey: string) => boolean | void;
  /** Label for the "next" button (auto-generated nav) */
  nextLabel?: string;
  /** Label for the "prev" button */
  prevLabel?: string;
  /** Show auto-generated prev/next buttons? */
  showNavigation?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface StepsInstance {
  element: HTMLElement;
  getCurrentStep: () => string;
  getStepIndex: () => number;
  setCurrentStep: (key: string) => void;
  next: () => void;
  prev: () => void;
  setStepStatus: (key: string, status: StepStatus) => void;
  getStepStatus: (key: string) => StepStatus;
  addStep: (item: StepItem, index?: number) => void;
  removeStep: (key: string) => void;
  destroy: () => void;
}

// --- Status Colors & Icons ---

const STATUS_CONFIG: Record<StepStatus, { color: string; bg: string; icon: string }> = {
  pending:   { color: "#9ca3af", bg: "#f3f4f6", icon: "" },
  active:    { color: "#4338ca", bg: "#eef2ff", icon: "" },
  completed: { color: "#22c55e", bg: "#f0fdf4", icon: "&#10003;" },
  error:     { color: "#ef4444", bg: "#fef2f2", icon: "!" },
  skipped:   { color: "#d1d5db", bg: "#f9fafb", icon: "-" },
};

const SIZE_STYLES: Record<string, { circleSize: number; fontSize: number; descFontSize: number; gap: number }> = {
  sm: { circleSize: 24, fontSize: 12, descFontSize: 11, gap: 16 },
  md: { circleSize: 32, fontSize: 14, descFontSize: 12, gap: 24 },
  lg: { circleSize: 40, fontSize: 15, descFontSize: 13, gap: 32 },
};

// --- Main Class ---

export class StepsManager {
  create(options: StepsOptions): StepsInstance {
    const opts = {
      orientation: options.orientation ?? "horizontal",
      variant: options.variant ?? "default",
      showDescriptions: options.showDescriptions ?? true,
      showNumbers: options.showNumbers ?? true,
      showIcons: options.showIcons ?? true,
      clickable: options.clickable ?? true,
      animationDuration: options.animationDuration ?? 300,
      size: options.size ?? "md",
      showNavigation: options.showNavigation ?? false,
      nextLabel: options.nextLabel ?? "Next",
      prevLabel: options.prevLabel ?? "Back",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Steps: container not found");

    container.className = `steps steps-${opts.orientation} steps-${opts.variant} ${opts.className ?? ""}`;

    let items = [...options.items];
    let currentKey = opts.currentStep ?? (items[0]?.key ?? "");
    let destroyed = false;

    // Ensure first item is active if no status set
    if (items[0] && !items[0].status) items[0].status = "active";

    const sz = SIZE_STYLES[opts.size];

    function render(): void {
      container.innerHTML = "";

      const isHorizontal = opts.orientation === "horizontal";

      // Steps track
      const track = document.createElement("div");
      track.className = "steps-track";
      track.style.cssText = isHorizontal
        ? `display:flex;align-items:center;width:100%;position:relative;`
        : `display:flex;flex-direction:column;width:100%;position:relative;`;

      // Progress line (background)
      if (opts.variant !== "dot") {
        const progressBg = document.createElement("div");
        progressBg.className = "steps-progress-bg";
        progressBg.style.cssText = isHorizontal
          ? `position:absolute;top:${sz.circleSize / 2}px;left:${sz.circleSize / 2}px;right:${sz.circleSize / 2}px;height:2px;background:#e5e7eb;z-index:0;`
          : `position:absolute;top:${sz.circleSize / 2}px;left:${sz.circleSize / 2}px;bottom:${sz.circleSize / 2}px;width:2px;background:#e5e7eb;z-index:0;`;
        track.appendChild(progressBg);

        // Progress fill
        const activeIdx = items.findIndex((i) => i.key === currentKey);
        const progressFill = document.createElement("div");
        progressFill.className = "steps-progress-fill";
        progressFill.style.cssText = isHorizontal
          ? `position:absolute;top:${sz.circleSize / 2}px;left:${sz.circleSize / 2}px;height:2px;background:#22c55e;z-index:1;transition:width ${opts.animationDuration}ms ease;width:${Math.max(0, (activeIdx / Math.max(1, items.length - 1)) * 100)}%;`
          : `position:absolute;top:${sz.circleSize / 2}px;left:${sz.circleSize / 2}px;width:2px;background:#22c55e;z-index:1;transition:height ${opts.animationDuration}ms ease;height:${Math.max(0, (activeIdx / Math.max(1, items.length - 1)) * 100)}%;`;
        track.appendChild(progressFill);
      }

      // Render each step
      items.forEach((item, index) => {
        const isActive = item.key === currentKey;
        const status = item.status ?? (index < items.findIndex((i) => i.key === currentKey) ? "completed" : index === items.findIndex((i) => i.key === currentKey) ? "active" : "pending");
        const sc = STATUS_CONFIG[status];

        const stepEl = document.createElement("div");
        stepEl.className = `steps-item steps-item-${status}`;
        stepEl.dataset.key = item.key;
        stepEl.style.cssText = isHorizontal
          ? `display:flex;flex-direction:column;align-items:center;flex:1;position:relative;z-index:1;${index > 0 ? "" : ""}`
          : `display:flex;align-items:flex-start;gap:12px;position:relative;z-index:1;padding:8px 0;`;

        // Circle / indicator
        let indicator: HTMLElement;

        switch (opts.variant) {
          case "dot": {
            indicator = document.createElement("div");
            indicator.style.cssText = `
              width:${status === "active" ? 12 : 8}px;height:${status === "active" ? 12 : 8}px;border-radius:50%;
              background:${sc.color};transition:all ${opts.animationDuration}ms ease;
              ${isActive ? `box-shadow:0 0 0 4px ${sc.bg};` : ""}
              flex-shrink:0;margin-top:4px;
            `;
            break;
          }
          case "arrow": {
            indicator = document.createElement("div");
            indicator.style.cssText = `
              width:${sz.circleSize + 16}px;height:${sz.circleSize}px;display:flex;align-items:center;justify-content:center;
              background:${isActive ? sc.color : sc.bg};color:${isActive ? "#fff" : sc.color};
              clip-path:polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%);
              font-size:${sz.fontSize - 2}px;font-weight:600;flex-shrink:0;
              transition:all ${opts.animationDuration}ms ease;
            `;
            if (status === "completed") indicator.textContent = sc.icon;
            else if (opts.showNumbers && !item.icon) indicator.textContent = String(index + 1);
            break;
          }
          case "line":
          default: {
            indicator = document.createElement("div");
            indicator.style.cssText = `
              width:${sz.circleSize}px;height:${sz.circleSize}px;border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              background:${status === "active" || status === "completed" ? sc.color : sc.bg};
              border:2px solid ${sc.color};color:${(status === "active" || status === "completed") ? "#fff" : sc.color};
              font-size:${sz.fontSize - 2}px;font-weight:600;flex-shrink:0;
              transition:all ${opts.animationDuration}ms ease;
              position:relative;z-index:2;
            `;
            if (status === "completed") indicator.innerHTML = `<span style="font-size:${sz.fontSize - 4}px;">&#10003;</span>`;
            else if (status === "error") indicator.innerHTML = `<span style="font-weight:700;">!</span>`;
            else if (opts.showNumbers && !item.icon && status !== "completed") indicator.textContent = String(index + 1);
            break;
          }
        }

        if (isHorizontal) stepEl.appendChild(indicator);
        else {
          const indWrap = document.createElement("div");
          indWrap.style.cssText = "flex-shrink:0;";
          indWrap.appendChild(indicator);
          stepEl.appendChild(indWrap);
        }

        // Icon overlay (if provided)
        if (item.icon && opts.showIcons && opts.variant !== "arrow") {
          const iconEl = document.createElement("span");
          iconEl.textContent = item.icon;
          iconEl.style.cssText = `
            font-size:${sz.fontSize + 2}px;line-height:1;
            ${status === "active" || status === "completed" ? "" : "opacity:0.5;"}
          `;
          if (indicator.tagName.toLowerCase() === "div" && indicator.children.length > 0) {
            // Replace number with icon for active/completed
            const existing = indicator.querySelector(":scope > span");
            if (existing) existing.replaceWith(iconEl);
          } else if (indicator.childNodes.length === 0 || (indicator.childNodes.length === 3 && typeof indicator.textContent === "string")) {
            indicator.textContent = "";
            indicator.appendChild(iconEl);
          }
        }

        // Label area
        const labelArea = document.createElement("div");
        labelArea.className = "steps-label-area";
        labelArea.style.cssText = isHorizontal
          ? `margin-top:8px;text-align:center;max-width:120px;`
          : `flex:1;min-width:0;`;

        // Title
        const titleEl = document.createElement("div");
        titleEl.className = "steps-title";
        titleEl.style.cssText = `
          font-size:${sz.fontSize}px;font-weight:${isActive ? 600 : 400};
          color:${isActive ? "#111827" : status === "completed" ? "#22c55e" : sc.color};
          transition:color ${opts.animationDuration}ms ease;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        `;
        titleEl.textContent = item.title;
        labelArea.appendChild(titleEl);

        // Description
        if (item.description && opts.showDescriptions) {
          const descEl = document.createElement("div");
          descEl.className = "steps-description";
          descEl.style.cssText = `font-size:${sz.descFontSize}px;color:#9ca3af;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
          descEl.textContent = item.description;
          labelArea.appendChild(descEl);
        }

        // Error message
        if (status === "error" && item.errorMessage) {
          const errEl = document.createElement("div");
          errEl.className = "steps-error-msg";
          errEl.style.cssText = `font-size:${sz.descFontSize}px;color:#ef4444;margin-top:2px;`;
          errEl.textContent = item.errorMessage;
          labelArea.appendChild(errEl);
        }

        stepEl.appendChild(labelArea);

        // Click handler
        if (opts.clickable && !item.disabled) {
          stepEl.style.cursor = "pointer";
          stepEl.addEventListener("click", () => goTo(item.key));
          stepEl.addEventListener("mouseenter", () => {
            if (!isActive) stepEl.style.opacity = "0.8";
          });
          stepEl.addEventListener("mouseleave", () => {
            stepEl.style.opacity = "";
          });
        }

        if (item.disabled) {
          stepEl.style.opacity = "0.45";
          stepEl.style.cursor = "not-allowed";
        }

        track.appendChild(stepEl);
      });

      container.appendChild(track);

      // Content panel (for active step)
      const activeItem = items.find((i) => i.key === currentKey);
      if (activeItem?.content) {
        const contentPanel = document.createElement("div");
        contentPanel.className = "steps-content-panel";
        contentPanel.style.cssText = `margin-top:${sz.gap}px;padding:16px 0;`;
        if (typeof activeItem.content === "string") {
          contentPanel.innerHTML = activeItem.content;
        } else {
          contentPanel.appendChild(activeItem.content);
        }
        container.appendChild(contentPanel);
      }

      // Navigation buttons
      if (opts.showNavigation) {
        const navRow = document.createElement("div");
        navRow.className = "steps-navigation";
        navRow.style.cssText = `display:flex;justify-content:space-between;margin-top:${sz.gap}px;`;

        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.textContent = opts.prevLabel;
        const canPrev = getStepIndex() > 0;
        prevBtn.disabled = !canPrev;
        prevBtn.style.cssText = `
          padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;
          background:${canPrev ? "#fff" : "#f3f4f6"};color:${canPrev ? "#374151" : "#9ca3af"};
          border:1px solid ${canPrev ? "#d1d5db" : "#e5e7eb"};cursor:${canPrev ? "pointer" : "not-allowed"};
          transition:all 0.15s;
        `;
        prevBtn.addEventListener("click", () => instance.prev());
        navRow.appendChild(prevBtn);

        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.textContent = opts.nextLabel;
        const canNext = getStepIndex() < items.length - 1;
        nextBtn.disabled = !canNext;
        nextBtn.style.cssText = `
          padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;
          background:${canNext ? "#4338ca" : "#e5e7eb"};color:${canNext ? "#fff" : "#9ca3af"};
          border:none;cursor:${canNext ? "pointer" : "not-allowed"};transition:all 0.15s;
        `;
        nextBtn.addEventListener("click", () => instance.next());
        navRow.appendChild(nextBtn);

        container.appendChild(navRow);
      }
    }

    function goTo(key: string): void {
      if (key === currentKey) return;
      if (opts.beforeChange?.(currentKey, key) === false) return;

      const idx = items.findIndex((i) => i.key === key);
      if (idx < 0 || items[idx]?.disabled) return;

      // Update statuses
      items.forEach((item, i) => {
        if (i < idx) item.status = item.status === "error" ? "error" : "completed";
        else if (i === idx) item.status = "active";
        else if (!item.status || item.status === "active") item.status = "pending";
      });

      currentKey = key;
      render();
      opts.onChange?.(currentKey, idx);
    }

    function getStepIndex(): number {
      return items.findIndex((i) => i.key === currentKey);
    }

    // Keyboard navigation
    container.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const idx = getStepIndex();
        if (idx < items.length - 1) goTo(items[idx + 1]!.key);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = getStepIndex();
        if (idx > 0) goTo(items[idx - 1]!.key);
      }
    });

    // Initial render
    render();

    const instance: StepsInstance = {
      element: container,

      getCurrentStep() { return currentKey; },

      getStepIndex() { return getStepIndex(); },

      setCurrentStep(key: string) { goTo(key); },

      next() {
        const idx = getStepIndex();
        if (idx < items.length - 1) goTo(items[idx + 1]!.key);
      },

      prev() {
        const idx = getStepIndex();
        if (idx > 0) goTo(items[idx - 1]!.key);
      },

      setStepStatus(key: string, status: StepStatus) {
        const item = items.find((i) => i.key === key);
        if (item) item.status = status;
        render();
      },

      getStepStatus(key: string): StepStatus {
        const item = items.find((i) => i.key === key);
        return item?.status ?? "pending";
      },

      addStep(newItem: StepItem, index?: number) {
        if (index !== undefined) items.splice(index, 0, newItem);
        else items.push(newItem);
        render();
      },

      removeStep(key: string) {
        items = items.filter((i) => i.key !== key);
        if (currentKey === key) currentKey = items[0]?.key ?? "";
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a steps component */
export function createSteps(options: StepsOptions): StepsInstance {
  return new StepsManager().create(options);
}
