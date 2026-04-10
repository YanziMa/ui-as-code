/**
 * Input OTP: One-time password / verification code input component.
 * Supports configurable length, auto-focus, paste support, countdown timer,
 * resend handler, keyboard navigation, accessibility, and multiple variants.
 */

// --- Types ---

export type OtpInputVariant = "default" | "rounded" | "underlined" | "filled";
export type OtpSize = "sm" | "md" | "lg";

export interface OtpInputOptions {
  /** Number of digits (default: 6) */
  length?: number;
  /** Input variant style */
  variant?: OtpInputVariant;
  /** Input size */
  size?: OtpSize;
  /** Placeholder character (default: "\u25CF") */
  placeholder?: string;
  /** Whether to mask input (default: false for default/rounded, true for filled) */
  masked?: boolean;
  /** Auto-focus first input on mount (default: true) */
  autoFocus?: boolean;
  /** Allow paste from clipboard (default: true) */
  allowPaste?: boolean;
  /** Callback when all digits are entered (returns the complete string) */
  onComplete?: (value: string) => void;
  /** Callback on each change (partial or complete) */
  onChange?: (value: string) => void;
  /** Countdown timer in seconds for resend (0 = no timer) */
  countdownSeconds?: number;
  /** Resend callback */
  onResend?: () => void | Promise<void>;
  /** Custom validation regex per digit (default: /[0-9]/) */
  pattern?: RegExp;
  /** Error state */
  error?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Input mode hint ("numeric", "text", "tel") */
  inputMode?: string;
  /** Custom CSS class for container */
  className?: string;
  /** Custom styles for inputs */
  inputStyle?: Partial<CSSStyleDeclaration>;
}

export interface OtpInputInstance {
  /** Container element */
  element: HTMLDivElement;
  /** Get current value */
  getValue(): string;
  /** Set value programmatically */
  setValue(value: string): void;
  /** Focus first empty input, or last if full */
  focus(): void;
  /** Clear all inputs */
  clear(): void;
  /** Blur all inputs */
  blur(): void;
  /** Check if complete (all digits filled) */
  isComplete(): boolean;
  /** Get remaining countdown seconds (-1 if not active) */
  getCountdown(): number;
  /** Start/resend countdown timer */
  startCountdown(seconds?: number): void;
  /** Stop countdown */
  stopCountdown(): void;
  /** Set error state */
  setError(error: boolean): void;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Destroy cleanup */
  destroy(): void;
}

// --- Size Config ---

const SIZE_MAP: Record<OtpSize, { width: string; height: string; fontSize: string; gap: string }> = {
  sm:  { width: "36px", height: "40px", fontSize: "14px", gap: "6px" },
  md:  { width: "48px", height: "56px", fontSize: "18px", gap: "8px" },
  lg:  { width: "56px", height: "64px", fontSize: "22px", gap: "10px" },
};

// --- Main Factory ---

export function createOtpInput(options: OtpInputOptions = {}): OtpInputInstance {
  const opts = {
    length: options.length ?? 6,
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    placeholder: options.placeholder ?? "\u25CF",
    masked: options.masked ?? (options.variant === "filled"),
    autoFocus: options.autoFocus ?? true,
    allowPaste: options.allowPaste ?? true,
    pattern: options.pattern ?? /[0-9]/,
    error: options.error ?? false,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    inputMode: options.inputMode ?? "numeric",
    countdownSeconds: options.countdownSeconds ?? 0,
    ...options,
  };

  const sz = SIZE_MAP[opts.size];
  const inputs: HTMLInputElement[] = [];
  let destroyed = false;

  // Container
  const container = document.createElement("div");
  container.className = `otp-input-container ${opts.className ?? ""}`;
  container.setAttribute("data-otp-length", String(opts.length));

  // Create input cells
  for (let i = 0; i < opts.length; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "otp-input-cell-wrapper";
    wrapper.style.cssText = `position:relative;display:inline-block;`;

    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = opts.inputMode as any;
    input.maxLength = 1;
    input.autocomplete = "one-time-code";
    input.dataset.index = String(i);
    input.disabled = opts.disabled;
    input.readOnly = opts.readOnly;

    applyInputStyle(input, i);
    wrapper.appendChild(input);
    container.appendChild(wrapper);
    inputs.push(input);
  }

  // Resend area
  let resendEl: HTMLElement | null = null;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let remainingSeconds = -1;

  if (opts.countdownSeconds > 0 || opts.onResend) {
    resendEl = document.createElement("div");
    resendEl.className = "otp-resend";
    resendEl.style.cssText = `
      margin-top:12px;text-align:center;font-size:13px;color:#6b7280;
      display:flex;align-items:center;justify-content:center;gap:4px;
    `;
    updateResendUI();
    container.appendChild(resendEl);
  }

  // --- Style Application ---

  function applyInputStyle(input: HTMLInputElement, _index: number): void {
    const baseStyles: Record<OtpInputVariant, string> = {
      default: `
        width:${sz.width};height:${sz.height};
        border:2px solid ${opts.error ? "#dc2626" : "#d1d5db"};
        border-radius:8px;font-size:${sz.fontSize};font-weight:600;
        text-align:center;outline:none;transition:border-color 0.2s,box-shadow 0.2s;
        background:#fff;color:#111827;
        font-family:-apple-system,sans-serif;
        -webkit-appearance:none;-moz-appearance:none;
      `,
      rounded: `
        width:${sz.width};height:${sz.height};
        border:2px solid ${opts.error ? "#dc2626" : "#d1d5db"};
        border-radius:50%;font-size:${sz.fontSize};font-weight:600;
        text-align:center;outline:none;transition:border-color 0.2s,box-shadow 0.2s;
        background:#fff;color:#111827;
        font-family:-apple-system,sans-serif;
        -webkit-appearance:none;-moz-appearance:none;
      `,
      underlined: `
        width:${sz.width};height:${sz.height};
        border:none;border-bottom:2px solid ${opts.error ? "#dc2626" : "#d1d5db"};
        border-radius:0;font-size:${sz.fontSize};font-weight:600;
        text-align:center;outline:none;transition:border-color 0.2s;
        background:transparent;color:#111827;
        font-family:-apple-system,sans-serif;
        -webkit-appearance:none;-moz-appearance:none;
      `,
      filled: `
        width:${sz.width};height:${sz.height};
        border:2px solid transparent;border-radius:8px;
        font-size:${sz.fontSize};font-weight:600;
        text-align:center;outline:none;transition:background 0.2s,border-color 0.2s;
        background:${opts.error ? "#fef2f2" : "#f3f4f6"};color:#111827;
        font-family:-apple-system,sans-serif;
        -webkit-appearance:none;-moz-appearance:none;
      `,
    };

    input.style.cssText = baseStyles[opts.variant];

    // Apply custom overrides
    if (opts.inputStyle) {
      Object.assign(input.style, opts.inputStyle);
    }

    // Masked display via CSS
    if (opts.masked && opts.variant !== "filled") {
      input.style.webkitTextSecurity = "disc";
      input.style.textSecurity = "disc";
    }
  }

  // --- Event Handlers ---

  function handleInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    const idx = parseInt(target.dataset.index ?? "0", 10);
    const val = target.value;

    // Validate single character
    if (val.length > 1) {
      target.value = val.slice(-1);
    }

    // Validate against pattern
    if (val && !opts.pattern.test(val)) {
      target.value = "";
      return;
    }

    // Move to next input
    if (val && idx < opts.length - 1) {
      inputs[idx + 1].focus();
      inputs[idx + 1].select();
    }

    notifyChange();

    // Check completion
    if (isComplete()) {
      opts.onComplete?.(getValue());
    }
  }

  function handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLInputElement;
    const idx = parseInt(target.dataset.index ?? "0", 10);

    switch (e.key) {
      case "Backspace":
        if (!target.value && idx > 0) {
          inputs[idx - 1].focus();
          inputs[idx - 1].select();
        }
        break;

      case "ArrowLeft":
        if (idx > 0) inputs[idx - 1].focus();
        break;

      case "ArrowRight":
        if (idx < opts.length - 1) inputs[idx + 1].focus();
        break;

      case "Home":
        inputs[0].focus();
        break;

      case "End":
        inputs[opts.length - 1].focus();
        break;

      case "Delete":
        if (idx < opts.length - 1) {
          // Shift values left
          for (let i = idx; i < opts.length - 1; i++) {
            inputs[i].value = inputs[i + 1].value;
          }
          inputs[opts.length - 1].value = "";
          inputs[Math.min(idx + 1, opts.length - 1)].focus();
          notifyChange();
        }
        break;

      case "a":
      case "A":
        if ((e.ctrlKey || e.metaKey)) {
          // Select all
          e.preventDefault();
          inputs.forEach((inp) => inp.select());
        }
        break;
    }
  }

  function handlePaste(e: ClipboardEvent): void {
    if (!opts.allowPaste) return;
    e.preventDefault();

    const pasted = e.clipboardData?.getData("text") ?? "";
    const chars = pasted.replace(/\D/g, "").slice(0, opts.length);

    if (!chars) return;

    for (let i = 0; i < chars.length; i++) {
      if (i < opts.length && opts.pattern.test(chars[i])) {
        inputs[i].value = chars[i];
      }
    }

    // Focus next empty or last
    const nextEmpty = inputs.findIndex((inp) => !inp.value);
    const focusIdx = nextEmpty >= 0 ? nextEmpty : opts.length - 1;
    inputs[focusIdx].focus();

    notifyChange();

    if (isComplete()) {
      opts.onComplete?.(getValue());
    }
  }

  function handleFocus(_e: FocusEvent): void {
    const target = _e.target as HTMLInputElement;
    target.select();
    highlightActive(target);
  }

  function handleBlur(_e: FocusEvent): void {
    unhighlightActive(_e.target as HTMLInputElement);
  }

  function highlightActive(input: HTMLInputElement): void {
    if (opts.variant === "underlined") {
      input.style.borderBottomColor = opts.error ? "#dc2626" : "#3b82f6";
    } else {
      input.style.borderColor = opts.error ? "#dc2626" : "#3b82f6";
      input.style.boxShadow = `0 0 0 3px rgba(59,130,246,0.15)`;
    }
  }

  function unhighlightActive(input: HTMLInputElement): void {
    if (opts.variant === "underlined") {
      input.style.borderBottomColor = opts.error ? "#dc2626" : "#d1d5db";
    } else {
      input.style.borderColor = opts.error ? "#dc2626" : "#d1d5db";
      input.style.boxShadow = "";
    }
  }

  // --- Change Notification ---

  function notifyChange(): void {
    opts.onChange?.(getValue());
  }

  // --- Resend / Countdown ---

  function updateResendUI(): void {
    if (!resendEl) return;

    if (remainingSeconds > 0) {
      resendEl.innerHTML = `<span style="color:#9ca3af">Resend code in <strong>${remainingSeconds}s</strong></span>`;
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Resend code";
      btn.style.cssText = `
        background:none;border:none;color:#3b82f6;cursor:pointer;
        font-size:13px;font-weight:500;padding:0;text-decoration:underline;
        transition:color 0.15s;
      `;
      btn.addEventListener("click", () => handleResend());
      btn.addEventListener("mouseenter", () => { btn.style.color = "#2563eb"; });
      btn.addEventListener("mouseleave", () => { btn.style.color = "#3b82f6"; });
      resendEl.innerHTML = "";
      resendEl.appendChild(btn);
    }
  }

  async function handleResend(): Promise<void> {
    if (remainingSeconds > 0 || !opts.onResend) return;
    await opts.onResend();
    startCountdown(opts.countdownSeconds);
  }

  // --- Public API ---

  function getValue(): string {
    return inputs.map((inp) => inp.value).join("");
  }

  function setValue(value: string): void {
    const chars = value.split("").slice(0, opts.length);
    for (let i = 0; i < opts.length; i++) {
      inputs[i].value = chars[i] ?? "";
    }
    notifyChange();
    if (isComplete()) opts.onComplete?.(getValue());
  }

  function focus(): void {
    const emptyIdx = inputs.findIndex((inp) => !inp.value);
    (emptyIdx >= 0 ? inputs[emptyIdx] : inputs[opts.length - 1]).focus();
  }

  function clear(): void {
    inputs.forEach((inp) => { inp.value = ""; });
    notifyChange();
  }

  function blur(): void {
    inputs.forEach((inp) => inp.blur());
  }

  function isCompleteFn(): boolean {
    return inputs.every((inp) => inp.value.length === 1);
  }

  function getCountdownFn(): number { return remainingSeconds; }

  function startCountdownFn(seconds?: number): void {
    stopCountdownFn();
    remainingSeconds = seconds ?? opts.countdownSeconds;
    if (remainingSeconds <= 0) return;

    updateResendUI();
    countdownInterval = setInterval(() => {
      remainingSeconds--;
      updateResendUI();
      if (remainingSeconds <= 0) {
        stopCountdownFn();
      }
    }, 1000);
  }

  function stopCountdownFn(): void {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    remainingSeconds = -1;
    updateResendUI();
  }

  function setErrorFn(error: boolean): void {
    opts.error = error;
    inputs.forEach((inp, _i) => applyInputStyle(inp, _i));
  }

  function setDisabledFn(disabled: boolean): void {
    opts.disabled = disabled;
    inputs.forEach((inp) => { inp.disabled = disabled; });
  }

  function destroyFn(): void {
    if (destroyed) return;
    destroyed = true;
    stopCountdownFn();
    inputs.forEach((inp) => {
      inp.removeEventListener("input", handleInput);
      inp.removeEventListener("keydown", handleKeyDown);
      inp.removeEventListener("paste", handlePaste);
      inp.removeEventListener("focus", handleFocus);
      inp.removeEventListener("blur", handleBlur);
    });
    container.remove();
  }

  // --- Bind Events ---

  for (const input of inputs) {
    input.addEventListener("input", handleInput);
    input.addEventListener("keydown", handleKeyDown);
    input.addEventListener("paste", handlePaste);
    input.addEventListener("focus", handleFocus);
    input.addEventListener("blur", handleBlur);
  }

  // Auto-focus
  if (opts.autoFocus) {
    requestAnimationFrame(() => { inputs[0].focus(); });
  }

  // Auto-start countdown
  if (opts.countdownSeconds > 0) {
    startCountdownFn(opts.countdownSeconds);
  }

  const instance: OtpInputInstance = {
    element: container,
    getValue,
    setValue,
    focus,
    clear,
    blur,
    isComplete: isCompleteFn,
    getCountdown: getCountdownFn,
    startCountdown: startCountdownFn,
    stopCountdown: stopCountdownFn,
    setError: setErrorFn,
    setDisabled: setDisabledFn,
    destroy: destroyFn,
  };

  return instance;
}
