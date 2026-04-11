/**
 * Floating Label: Animated floating label for form inputs, textareas, and selects.
 * The label floats up when the input has focus or content, with smooth transitions,
 * multiple animation styles, validation state integration, and accessibility.
 */

// --- Types ---

export type FloatingLabelVariant = "standard" | "outlined" | "filled";
export type FloatingLabelSize = "sm" | "md" | "lg";
export type AnimationStyle = "slide" | "scale" | "fade" | "elastic";

export interface FloatingLabelOptions {
  /** Input element or selector */
  input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | string;
  /** Label text */
  label: string;
  /** Visual variant */
  variant?: FloatingLabelVariant;
  /** Size */
  size?: FloatingLabelSize;
  /** Animation style when label floats */
  animation?: AnimationStyle;
  /** Custom label color when floating */
  activeColor?: string;
  /** Custom label color when idle */
  idleColor?: string;
  /** Error state color */
  errorColor?: string;
  /** Font size of floating label (px) */
  floatFontSize?: number;
  /** Font size of resting label (px) */
  restFontSize?: number;
  /** Required indicator */
  required?: boolean;
  /** Container element or auto-wrap */
  container?: HTMLElement | string;
  /** Additional CSS class */
  className?: string;
  /** Called on focus */
  onFocus?: () => void;
  /** Called on blur */
  onBlur?: () => void;
}

export interface FloatingLabelInstance {
  /** Root wrapper element */
  wrapper: HTMLElement;
  /** Label element */
  labelEl: HTMLElement;
  /** Set error state */
  setError: (hasError: boolean) => void;
  /** Set custom message below input */
  setHelperText: (text: string) => void;
  /** Get current value */
  getValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Focus the input */
  focus: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_CONFIG: Record<FloatingLabelSize, {
  inputHeight: string;
  inputPadding: string;
  fontSize: { rest: number; float: number };
  labelOffset: { x: string; y: string };
}> = {
  sm: {
    inputHeight: "36px",
    inputPadding: "8px 10px",
    fontSize: { rest: 13, float: 10 },
    labelOffset: { x: "10px", y: "22px" },
  },
  md: {
    inputHeight: "44px",
    inputPadding: "12px 14px",
    fontSize: { rest: 15, float: 11 },
    labelOffset: { x: "14px", y: "27px" },
  },
  lg: {
    inputHeight: "54px",
    inputPadding: "16px 18px",
    fontSize: { rest: 17, float: 12 },
    labelOffset: { x: "18px", y: "33px" },
  },
};

// --- Main Factory ---

/**
 * Create a floating label around an existing input element.
 *
 * @example
 * ```ts
 * const fl = createFloatingLabel({
 *   input: document.getElementById("email")!,
 *   label: "Email address",
 *   variant: "outlined",
 *   required: true,
 * });
 * ```
 */
export function createFloatingLabel(options: FloatingLabelOptions): FloatingLabelInstance {
  const {
    label,
    variant = "standard",
    size = "md",
    animation = "slide",
    activeColor = "#4f46e5",
    idleColor = "#6b7280",
    errorColor = "#ef4444",
    required = false,
    className,
    onFocus,
    onBlur,
  } = options;

  const cfg = SIZE_CONFIG[size];
  const floatFontSize = options.floatFontSize ?? cfg.fontSize.float;
  const restFontSize = options.floatFontSize ?? cfg.fontSize.rest;

  // Resolve input
  let inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (typeof options.input === "string") {
    inputEl = document.querySelector(options.input)!;
  } else {
    inputEl = options.input;
  }
  if (!inputEl) throw new Error("FloatingLabel: input element not found");

  // Resolve/create container
  let container: HTMLElement;
  if (options.container) {
    container = typeof options.container === "string"
      ? document.querySelector(options.container)!
      : options.container;
  } else {
    // Auto-wrap: create a relative-positioned div around the input
    container = document.createElement("div");
    container.className = `floating-label-wrapper ${variant} ${size} ${className ?? ""}`.trim();
    inputEl.parentNode!.insertBefore(container, inputEl);
    container.appendChild(inputEl);
  }

  // Create label element
  const labelEl = document.createElement("label");
  labelEl.className = "floating-label-text";
  labelEl.htmlFor = inputEl.id || undefined;
  labelEl.textContent = label + (required ? " *" : "");
  container.appendChild(labelEl);

  // Helper text element
  let helperEl: HTMLElement | null = null;

  // State
  let isFloated = false;
  let hasError = false;

  // Apply base styles to container
  _applyContainerStyles();

  // Apply initial styles to input
  _applyInputStyles();

  // Apply initial label position
  _updateLabelPosition(false);

  // Event listeners
  inputEl.addEventListener("focus", handleFocus);
  inputEl.addEventListener("blur", handleBlur);
  inputEl.addEventListener("input", handleInput);

  // Check initial state
  if (inputEl.value.length > 0) {
    isFloated = true;
    _updateLabelPosition(true);
  }

  function handleFocus(): void {
    if (!isFloated) {
      isFloated = true;
      _updateLabelPosition(true);
    }
    onFocus?.();
  }

  function handleBlur(): void {
    if (!inputEl.value) {
      isFloated = false;
      _updateLabelPosition(false);
    }
    onBlur?.();
  }

  function handleInput(): void {
    if (!isFloated && inputEl.value.length > 0) {
      isFloated = true;
      _updateLabelPosition(true);
    }
  }

  function _applyContainerStyles(): void {
    container.style.cssText += `
      position:relative;display:inline-block;width:${inputEl.style.width || "100%"};
    `;
  }

  function _applyInputStyles(): void {
    const baseInputStyle =
      `width:100%;height:${cfg.inputHeight};padding:${cfg.inputPadding};` +
      `font-size:${restFontSize}px;border-radius:6px;outline:none;` +
      `transition:border-color 0.2s,box-shadow 0.2s;background:transparent;`;

    switch (variant) {
      case "outlined":
        inputEl.style.cssText = baseInputStyle +
          `border:1.5px solid ${hasError ? errorColor : "#d1d5db"};` +
          (isFloated ? `padding-top:${floatFontSize + 14}px;` : "");
        break;

      case "filled":
        inputEl.style.cssText = baseInputStyle +
          `border:none;border-bottom:2px solid ${hasError ? errorColor : "#d1d5db"};` +
          `border-radius:6px 6px 0 0;background:#f3f4f6;` +
          (isFloated ? `padding-top:${floatFontSize + 12}px;` : "");
        break;

      default: // standard
        inputEl.style.cssText = baseInputStyle +
          `border:none;border-bottom:1.5px solid ${hasError ? errorColor : "#d1d5db"};` +
          (isFloated ? `padding-top:${floatFontSize + 4}px;` : "");
        break;
    }
  }

  function _updateLabelPosition(floating: boolean): void {
    const color = hasError ? errorColor : (floating ? activeColor : idleColor);

    switch (animation) {
      case "scale":
        labelEl.style.cssText = `
          position:absolute;left:${cfg.labelOffset.x};pointer-events:none;
          font-size:${floating ? floatFontSize : restFontSize}px;font-weight:${floating ? "500" : "400"};
          color:${color};transform-origin:left top;
          transition:all 0.2s cubic-bezier(0.25,0.1,0.25,1);
          transform:${floating
            ? `translateY(-${cfg.labelOffset.y}) scale(${floatFontSize / restFontSize})`
            : "translateY(0) scale(1)"};
          white-space:nowrap;z-index:1;
        `;
        break;

      case "fade":
        labelEl.style.cssText = `
          position:absolute;left:${cfg.labelOffset.x};top:${floating ? "4px" : cfg.labelOffset.y};
          font-size:${floating ? floatFontSize : restFontSize}px;font-weight:${floating ? "500" : "400"};
          color:${color};opacity:${floating ? 1 : 0.5};
          transition:all 0.2s ease;white-space:nowrap;z-index:1;
        `;
        break;

      case "elastic":
        labelEl.style.cssText = `
          position:absolute;left:${cfg.labelOffset.x};pointer-events:none;
          font-size:${floating ? floatFontSize : restFontSize}px;font-weight:${floating ? "500" : "400"};
          color:${color};
          transition:all 0.35s cubic-bezier(0.68,-0.55,0.265,1.55);
          transform:${floating
            ? `translateY(-${cfg.labelOffset.y})`
            : "translateY(0)"};
          white-space:nowrap;z-index:1;
        `;
        break;

      default: // slide
        labelEl.style.cssText = `
          position:absolute;left:${cfg.labelOffset.x};pointer-events:none;
          font-size:${floating ? floatFontSize : restFontSize}px;font-weight:${floating ? "500" : "400"};
          color:${color};
          transition:all 0.2s cubic-bezier(0.25,0.1,0.25,1);
          transform:${floating
            ? `translateY(-${cfg.labelOffset.y})`
            : "translateY(0)"};
          white-space:nowrap;z-index:1;
        `;
        break;
    }
  }

  function setError(error: boolean): void {
    hasError = error;
    _applyInputStyles();
    _updateLabelPosition(isFloated);
  }

  function setHelperText(text: string): void {
    if (!helperEl) {
      helperEl = document.createElement("div");
      helperEl.className = "fl-helper-text";
      helperEl.style.cssText =
        `font-size:11px;margin-top:4px;color:${hasError ? errorColor : "#6b7280"};` +
        "transition:color 0.2s;";
      container.appendChild(helperEl);
    }
    helperEl.textContent = text;
    helperEl.style.color = hasError ? errorColor : "#6b7280";
  }

  function getValue(): string { return inputEl.value; }
  function setValue(value: string): void {
    inputEl.value = value;
    if (value && !isFloated) { isFloated = true; _updateLabelPosition(true); }
    else if (!value && isFloated) { isFloated = false; _updateLabelPosition(false); }
  }
  function focus(): void { inputEl.focus(); }

  function destroy(): void {
    inputEl.removeEventListener("focus", handleFocus);
    inputEl.removeEventListener("blur", handleBlur);
    inputEl.removeEventListener("input", handleInput);
    labelEl.remove();
    if (helperEl) helperEl.remove();
    // If we created the wrapper, unwrap the input
    if (!options.container) {
      container.parentNode!.insertBefore(inputEl, container);
      container.remove();
    }
  }

  return { wrapper: container, labelEl, setError, setHelperText, getValue, setValue, focus, destroy };
}

// --- Batch Creation ---

/** Create floating labels for multiple inputs at once */
export function createFloatingLabels(
  configs: Array<FloatingLabelOptions>,
): FloatingLabelInstance[] {
  return configs.map(createFloatingLabel);
}
