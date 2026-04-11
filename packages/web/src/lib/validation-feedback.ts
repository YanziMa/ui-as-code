/**
 * Validation Feedback system for real-time form validation display with inline
 * messages, tooltip-style errors, summary lists, animated transitions, and
 * accessibility-compliant announcements.
 */

// --- Types ---

export type ValidationSeverity = "error" | "warning" | "info" | "success";

export interface ValidationResult {
  /** Whether valid */
  valid: boolean;
  /** Severity level */
  severity: ValidationSeverity;
  /** Human-readable message */
  message: string;
  /** Field/control this applies to */
  field?: string | HTMLElement;
  /** Additional context data */
  data?: Record<string, unknown>;
}

export interface ValidationFeedbackOptions {
  /** Show inline messages next to fields (default: true) */
  inlineMessages?: boolean;
  /** Show validation summary at top of form (default: false) */
  showSummary?: boolean;
  /** Summary container element or selector */
  summaryContainer?: HTMLElement | string;
  /** Animate message appearance (default: true) */
  animate?: boolean;
  /** Animation duration in ms (default: 300) */
  animationDuration?: number;
  /** Auto-dismiss success messages after ms (0 = no dismiss) */
  autoDismissSuccessMs?: number;
  /** Auto-dismiss info messages after ms (0 = no dismiss) */
  autoDismissInfoMs?: number;
  /** CSS class prefix for feedback elements (default: "vf-") */
  classPrefix?: string;
  /** Announce errors to screen readers (default: true) */
  announceToScreenReader?: boolean;
  /** Called when validation state changes for any field */
  onChange?: (field: HTMLElement | undefined, result: ValidationResult) => void;
  /** Custom renderer for inline messages */
  renderInlineMessage?: (result: ValidationResult) => HTMLElement;
  /** Scroll to first error on validate (default: true) */
  scrollToError?: boolean;
}

export interface ValidationFeedbackInstance {
  /** Show a validation result for a specific field */
  show: (result: ValidationResult) => void;
  /** Clear validation feedback for a field */
  clear: (field: HTMLElement | string) => void;
  /** Clear all validation feedback */
  clearAll: () => void;
  /** Validate and show results for multiple fields */
  showMany: (results: ValidationResult[]) => void;
  /** Update the validation summary */
  updateSummary: (results: ValidationResult[]) => void;
  /** Get current visible feedback count */
  get feedbackCount(): number;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

const SEVERITY_ICONS: Record<ValidationSeverity, string> = {
  error: "&#10060;",
  warning: "&#9888;",
  info: "&#8505;",
  success: "&#9989;",
};

const SEVERITY_CLASSES: Record<ValidationSeverity, string> = {
  error: "vf-error",
  warning: "vf-warning",
  info: "vf-info",
  success: "vf-success",
};

function getFieldElement(field: string | HTMLElement | undefined): HTMLElement | null {
  if (!field) return null;
  if (typeof field === "string") {
    return document.querySelector<HTMLElement>(field) ?? document.getElementById(field);
  }
  return field;
}

function announce(message: string, priority: "assertive" | "polite" = "assertive"): void {
  const region = document.createElement("div");
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", priority);
  region.className = "sr-only";
  region.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;";
  region.textContent = message;
  document.body.appendChild(region);
  setTimeout(() => region.remove(), 5000);
}

// --- Main ---

export function createValidationFeedback(options: ValidationFeedbackOptions = {}): ValidationFeedbackInstance {
  const {
    inlineMessages = true,
    showSummary = false,
    summaryContainer,
    animate = true,
    animationDuration = 300,
    autoDismissSuccessMs = 3000,
    autoDismissInfoMs = 5000,
    classPrefix = "vf-",
    announceToScreenReader = true,
    onChange,
    renderInlineMessage,
    scrollToError = true,
  } = options;

  let destroyed = false;
  const activeFeedback = new Map<string, HTMLElement>();
  const summaryEl: HTMLElement | null =
    typeof summaryContainer === "string"
      ? document.querySelector(summaryContainer)
      : summaryContainer ?? null;

  function buildInlineMessage(result: ValidationResult): HTMLElement {
    if (renderInlineMessage) return renderInlineMessage(result);

    const el = document.createElement("div");
    el.className = `${classPrefix}message ${SEVERITY_CLASSES[result.severity]}`;
    el.setAttribute("role", result.severity === "error" ? "alert" : "status");
    el.innerHTML = `<span class="${classPrefix}icon">${SEVERITY_ICONS[result.severity]}</span> ${result.message}`;

    if (animate) {
      el.style.cssText += `opacity:0;transform:translateY(-4px);transition:all ${animationDuration}ms ease-out;`;
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
    }

    return el;
  }

  function getKey(field: string | HTMLElement | undefined): string {
    if (!field) return "__global__";
    if (typeof field === "string") return field;
    return field.id ?? field.className ?? `__el_${Date.now()}__`;
  }

  function doShow(result: ValidationResult): void {
    if (destroyed) return;

    const key = getKey(result.field);
    const fieldEl = getFieldElement(result.field);

    // Clear previous for same field
    if (activeFeedback.has(key)) {
      activeFeedback.get(key)?.remove();
      activeFeedback.delete(key);
    }

    // Inline message
    if (inlineMessages && fieldEl) {
      const msgEl = buildInlineMessage(result);
      fieldEl.after(msgEl);
      activeFeedback.set(key, msgEl);

      // Set aria-invalid for errors/warnings
      if (result.severity === "error" || result.severity === "warning") {
        fieldEl.setAttribute("aria-invalid", "true");
      } else {
        fieldEl.removeAttribute("aria-invalid");
      }
    }

    // Screen reader announcement
    if (announceToScreenReader && result.severity !== "success") {
      announce(`${result.severity}: ${result.message}`);
    }

    // Auto-dismiss
    if (result.severity === "success" && autoDismissSuccessMs > 0) {
      setTimeout(() => doClear(result.field), autoDismissSuccessMs);
    }
    if (result.severity === "info" && autoDismissInfoMs > 0) {
      setTimeout(() => doClear(result.field), autoDismissInfoMs);
    }

    onChange?.(fieldEl, result);
  }

  function doClear(field: HTMLElement | string): void {
    if (destroyed) return;
    const key = getKey(field);
    const el = activeFeedback.get(key);
    if (el) {
      if (animate) {
        el.style.transition = `opacity ${animationDuration}ms ease-in`;
        el.style.opacity = "0";
        setTimeout(() => el.remove(), animationDuration);
      } else {
        el.remove();
      }
      activeFeedback.delete(key);
    }

    const fieldEl = getFieldElement(field);
    if (fieldEl) fieldEl.removeAttribute("aria-invalid");
  }

  function doClearAll(): void {
    for (const [, el] of activeFeedback) el.remove();
    activeFeedback.clear();
  }

  function doShowMany(results: ValidationResult[]): void {
    doClearAll();

    for (const result of results) {
      doShow(result);
    }

    // Update summary
    if (showSummary) {
      updateSummary(results);
    }

    // Scroll to first error
    if (scrollToError) {
      const firstError = results.find((r) => r.severity === "error");
      if (firstError?.field) {
        const el = getFieldElement(firstError.field);
        if (el) {
          el.scrollIntoView({ behavior: animate ? "smooth" : "instant", block: "center" });
          el.focus({ preventScroll: true });
        }
      }
    }
  }

  function doUpdateSummary(results: ValidationResult[]): void {
    if (!summaryEl) return;

    const errors = results.filter((r) => r.severity === "error");
    const warnings = results.filter((r) => r.severity === "warning");

    if (errors.length === 0 && warnings.length === 0) {
      summaryEl.innerHTML = "";
      summaryEl.style.display = "none";
      return;
    }

    const items: string[] = [];
    if (errors.length > 0) {
      items.push(`<li class="${classPrefix}summary-errors"><strong>${errors.length} error(s)</strong>: ${errors.map((e) => e.message).join("; ")}</li>`);
    }
    if (warnings.length > 0) {
      items.push(`<li class="${classPrefix}summary-warnings">${warnings.length} warning(s): ${warnings.map((w) => w.message).join("; ")}</li>`);
    }

    summaryEl.innerHTML = `<ul>${items.join("")}</ul>`;
    summaryEl.style.display = "";
  }

  const instance: ValidationFeedbackInstance = {
    show: doShow,
    clear: doClear,
    clearAll: doClearAll,
    showMany: doShowMany,
    updateSummary: doUpdateSummary,

    get feedbackCount() { return activeFeedback.size; },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      doClearAll();
      if (summaryEl) { summaryEl.innerHTML = ""; summaryEl.style.display = "none"; }
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick one-shot: show an inline error message */
export function showError(field: HTMLElement | string, message: string): void {
  const vf = createValidationFeedback();
  vf.show({ valid: false, severity: "error", message, field });
}

/** Quick one-shot: show a success message */
export function showSuccess(field: HTMLElement | string, message: string): void {
  const vf = createValidationFeedback();
  vf.show({ valid: true, severity: "success", message, field });
}
