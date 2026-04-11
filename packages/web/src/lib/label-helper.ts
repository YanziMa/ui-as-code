/**
 * Label Helper utilities for accessible form labeling, including dynamic label
 * creation, floating labels, character counters, hint text toggles, and
 * screen-reader-only labels.
 */

// --- Types ---

export interface LabelConfig {
  /** Text content for the label */
  text: string;
  /** Position relative to control: "before" | "after" | "above" | "below" (default: "before") */
  position?: "before" | "after" | "above" | "below";
  /** Whether this is a required field indicator */
  required?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Screen reader only (visually hidden but announced) */
  srOnly?: boolean;
  /** HTML content instead of plain text */
  html?: string;
  /** Clicking label focuses the control (default: true) */
  clickable?: boolean;
}

export interface FloatingLabelOptions {
  /** Float up when control has value or focus (default: true) */
  floatOnValue?: boolean;
  /** Float up when focused (default: true) */
  floatOnFocus?: boolean;
  /** Animation duration in ms (default: 200) */
  animationDuration?: number;
  /** Additional CSS class for floated state */
  floatedClass?: string;
  /** Label text */
  labelText?: string;
}

export interface CharacterCounterOptions {
  /** Maximum characters allowed (0 = no max) */
  maxLength: number;
  /** Show count as "current/max" format (default: true) */
  showFormat?: "count" | "remaining" | "both";
  /** Warning threshold (e.g., show warning when remaining < 20) */
  warnThreshold?: number;
  /** CSS class for warning state */
  warnClass?: string;
  /** CSS class for exceeded state */
  exceedClass?: string;
  /** Position: "after" | "inline" | "custom" */
  position?: "after" | "inline" | "custom";
  /** Custom container element for counter */
  customContainer?: HTMLElement;
}

// --- Standalone functions ---

/** Create and attach a label to a form control */
export function createLabel(control: HTMLElement, config: LabelConfig): HTMLLabelElement {
  const {
    text,
    position = "before",
    required = false,
    className = "",
    srOnly = false,
    html,
    clickable = true,
  } = config;

  const label = document.createElement("label");
  label.className = [`form-label`, className, srOnly ? "sr-only" : ""].filter(Boolean).join(" ");

  if (html) {
    label.innerHTML = html;
  } else {
    label.textContent = text;
    if (required) {
      const asterisk = document.createElement("span");
      asterisk.className = "required-indicator";
      asterisk.setAttribute("aria-hidden", "true");
      asterisk.textContent = "*";
      asterisk.style.color = "#ef4444";
      label.appendChild(document.createTextNode(" "));
      label.appendChild(asterisk);
    }
  }

  // Link via htmlFor
  if (!control.id) {
    control.id = `input-${Date.now().toString(36)}`;
  }
  label.htmlFor = control.id;

  // Position
  if (position === "before" || position === "above") {
    control.parentElement?.insertBefore(label, control);
  } else {
    control.parentElement?.insertAfter?.(label, control)
      ?? control.after(label);
  }

  // Style for above/below
  if (position === "above" || position === "below") {
    label.style.display = "block";
  }

  if (!clickable) {
    label.addEventListener("click", (e) => e.preventDefault());
  }

  return label;
}

/** Create a floating label that animates when control is focused/filled */
export function createFloatingLabel(
  control: HTMLElement,
  options: FloatingLabelOptions = {},
): { label: HTMLLabelElement; wrapper: HTMLElement; destroy: () => void } {
  const {
    floatOnValue = true,
    floatOnFocus = true,
    animationDuration = 200,
    floatedClass = "floated",
    labelText,
  } = options;

  const wrapper = document.createElement("div");
  wrapper.className = "floating-label-wrapper";

  // Create label
  const label = document.createElement("label");
  label.className = "floating-label";
  label.textContent = labelText ?? (control.getAttribute("placeholder") ?? "");
  label.htmlFor = control.id || `fl-${Date.now().toString(36)}`;
  if (!control.id) control.id = label.htmlFor;

  // Move control into wrapper
  control.parentNode?.insertBefore(wrapper, control);
  wrapper.appendChild(label);
  wrapper.appendChild(control);

  // Remove placeholder (floating label replaces it)
  const originalPlaceholder = control.getAttribute("placeholder");
  if (originalPlaceholder && !labelText) {
    control.removeAttribute("placeholder");
  }

  function checkFloat(): void {
    const hasValue = floatOnValue && (
      (control instanceof HTMLInputElement && control.value.length > 0) ||
      (control instanceof HTMLTextAreaElement && control.value.length > 0) ||
      (control.textContent?.length ?? 0) > 0
    );
    const isFocused = document.activeElement === control;

    if ((hasValue && floatOnValue) || (isFocused && floatOnFocus)) {
      label.classList.add(floatedClass);
    } else {
      label.classList.remove(floatedClass);
    }
  }

  control.addEventListener("focus", checkFloat);
  control.addEventListener("blur", checkFloat);
  control.addEventListener("input", checkFloat);

  // Initial check
  checkFloat();

  return {
    label,
    wrapper,
    destroy() {
      control.removeEventListener("focus", checkFloat);
      control.removeEventListener("blur", checkFloat);
      control.removeEventListener("input", checkFloat);
      // Restore placeholder
      if (originalPlaceholder) control.setAttribute("placeholder", originalPlaceholder);
      // Unwrap
      wrapper.replaceWith(control);
      wrapper.insertBefore(label, control);
    },
  };
}

/** Create a character counter for input/textarea */
export function createCharacterCounter(
  control: HTMLInputElement | HTMLTextAreaElement,
  options: CharacterCounterOptions,
): { counter: HTMLElement; destroy: () => void } {
  const {
    maxLength,
    showFormat = "count",
    warnThreshold = 20,
    warnClass = "char-warn",
    exceedClass = "char-exceed",
    position = "after",
    customContainer,
  } = options;

  const counter = document.createElement("span");
  counter.className = "character-counter";
  counter.setAttribute("aria-live", "polite");

  function update(): void {
    const len = control.value.length;
    const remaining = maxLength - len;

    let text: string;
    switch (showFormat) {
      case "remaining":
        text = `${remaining} remaining`;
        break;
      case "both":
        text = `${len}/${maxLength} (${remaining} left)`;
        break;
      default:
        text = `${len}/${maxLength}`;
    }

    counter.textContent = text;

    // States
    counter.classList.remove(warnClass, exceedClass);
    if (len > maxLength) {
      counter.classList.add(exceedClass);
    } else if (remaining <= warnThreshold) {
      counter.classList.add(warnClass);
    }
  }

  // Place counter
  if (customContainer) {
    customContainer.appendChild(counter);
  } else if (position === "inline") {
    control.parentElement?.appendChild(counter);
  } else {
    control.after(counter);
  }

  control.addEventListener("input", update);
  update();

  return {
    counter,
    destroy() {
      control.removeEventListener("input", update);
      counter.remove();
    },
  };
}

/** Create a visually hidden (screen reader only) label */
export function createSrOnlyLabel(text: string, htmlFor?: string): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = text;
  label.className = "sr-only";
  label.style.cssText = `
    position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
    clip:rect(0,0,0,0);white-space:nowrap;border:0;
  `;
  if (htmlFor) label.htmlFor = htmlFor;
  return label;
}
