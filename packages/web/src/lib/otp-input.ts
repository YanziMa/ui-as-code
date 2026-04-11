/**
 * OTP Input: One-time password / verification code input with auto-focus between
 * fields, paste support, countdown timer, error shake animation, accessibility,
 * and configurable length/types (numeric, alphanumeric, custom pattern).
 */

// --- Types ---

export type OtpType = "numeric" | "alpha" | "alphanumeric" | "custom";
export type OtpMode = "input" | "display" | "countdown";

export interface OtpInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Number of digits/slots (default: 6) */
  length?: number;
  /** Input type (default: "numeric") */
  type?: OtpType;
  /** Custom regex pattern when type="custom" */
  pattern?: string;
  /** Mode: input, display-only, or countdown timer */
  mode?: OtpMode;
  /** Initial value */
  value?: string;
  /** Placeholder character (default: "") */
  placeholder?: string;
  /** Size variant ("sm" | "md" | "lg") */
  size?: "sm" | "md" | "lg";
  /** Show separator every N digits? (e.g., 3 for XXX-XXX) */
  separator?: string;
  /** Separator position (every N digits) */
  separatorEvery?: number;
  /** Auto-submit on complete */
  autoSubmit?: boolean;
  /** Callback on complete OTP entry */
  onComplete?: (value: string) => void;
  /** Callback on each change */
  onChange?: (value: string) => void;
  /** Callback on error (invalid char) */
  onError?: () => void;
  /** Countdown seconds (for countdown mode) */
  countdownSeconds?: number;
  /** Callback when countdown reaches zero */
  onCountdownEnd?: () => void;
  /** Callback to request new code */
  onRequestCode?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface OtpInputInstance {
  element: HTMLElement;
  /** Get current OTP value */
  getValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Clear all inputs */
  clear: () => void;
  /** Focus first input */
  focus: () => void;
  /** Check if complete */
  isComplete: () => boolean;
  /** Start countdown (countdown mode) */
  startCountdown: (seconds?: number) => void;
  /** Stop countdown */
  stopCountdown: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Constants ---

const SIZE_STYLES: Record<string, { width: number; height: number; fontSize: number; gap: number }> = {
  sm: { width: 36, height: 44, fontSize: 16, gap: 6 },
  md: { width: 48, height: 56, fontSize: 22, gap: 8 },
  lg: { width: 56, height: 64, fontSize: 28, gap: 10 },
};

const TYPE_PATTERNS: Record<OtpType, RegExp> = {
  numeric:      /^[0-9]$/,
  alpha:        /^[a-zA-Z]$/,
  alphanumeric: /^[a-zA-Z0-9]$/,
  custom:       /^.$/,
};

// --- Main Factory ---

export function createOtpInput(options: OtpInputOptions): OtpInputInstance {
  const opts = {
    length: options.length ?? 6,
    type: options.type ?? "numeric",
    mode: options.mode ?? "input",
    value: options.value ?? "",
    placeholder: options.placeholder ?? "",
    size: options.size ?? "md",
    separator: options.separator ?? "",
    separatorEvery: options.separatorEvery ?? 0,
    autoSubmit: options.autoSubmit ?? false,
    countdownSeconds: options.countdownSeconds ?? 60,
    disabled: options.disabled ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("OtpInput: container not found");

  const sz = SIZE_STYLES[opts.size];
  const pattern = opts.type === "custom" && opts.pattern
    ? new RegExp(opts.pattern)
    : TYPE_PATTERNS[opts.type];

  container.className = `otp-input ${opts.className ?? ""}`;
  container.style.cssText = `
    display:inline-flex;align-items:center;gap:${sz.gap}px;font-family:-apple-system,sans-serif;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;

  // State
  let values: string[] = Array.from({ length: opts.length }, () => "");
  let destroyed = false;
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let remainingSeconds = opts.countdownSeconds;

  // Initialize from value
  if (opts.value) {
    for (let i = 0; i < Math.min(opts.value.length, opts.length); i++) {
      values[i] = opts.value[i]!;
    }
  }

  // Build DOM based on mode
  if (opts.mode === "countdown") {
    return buildCountdownMode();
  }

  return buildInputMode();

  // --- Input Mode ---

  function buildInputMode(): OtpInputInstance {
    const inputs: HTMLInputElement[] = [];

    for (let i = 0; i < opts.length; i++) {
      // Separator element
      if (opts.separatorEvery > 0 && i > 0 && i % opts.separatorEvery === 0) {
        const sepEl = document.createElement("span");
        sepEl.textContent = opts.separator;
        sepEl.style.cssText = `font-size:${sz.fontSize}px;color:#9ca3af;font-weight:600;`;
        container.appendChild(sepEl);
      }

      const input = document.createElement("input");
      input.type = opts.type === "numeric" ? "tel" : "text";
      input.inputMode = opts.type === "numeric" ? "numeric" : "text";
      input.autocomplete = "one-time-code";
      input.maxLength = 1;
      input.dataset.index = String(i);
      input.value = values[i]!;
      input.setAttribute("aria-label", `Digit ${i + 1}`);
      input.style.cssText = `
        width:${sz.width}px;height:${sz.height}px;text-align:center;
        font-size:${sz.fontSize}px;font-weight:600;border:2px solid #d1d5db;
        border-radius:10px;outline:none;transition:border-color 0.15s,box-shadow 0.15s;
        color:#111827;background:#fff;-moz-appearance:textfield;
        ${opts.disabled ? "cursor:not-allowed;" : ""}
      `;
      input.addEventListener("focus", () => {
        input.style.borderColor = "#6366f1";
        input.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
        input.select();
      });
      input.addEventListener("blur", () => {
        input.style.borderColor = "#d1d5db";
        input.style.boxShadow = "";
      });

      inputs.push(input);
      container.appendChild(input);
    }

    // Event handlers
    function handleInput(e: Event): void {
      const target = e.target as HTMLInputElement;
      const idx = parseInt(target.dataset.index!);
      const val = target.value;

      if (!pattern.test(val)) {
        target.value = "";
        opts.onError?.();
        shakeElement(target);
        return;
      }

      values[idx] = val;
      opts.onChange?.(values.join(""));

      // Move to next
      if (idx < inputs.length - 1) {
        inputs[idx + 1]!.focus();
      }

      // Check completion
      if (values.every((v) => v !== "")) {
        opts.onComplete?.(values.join(""));
        if (opts.autoSubmit) inputs[idx]?.blur();
      }
    }

    function handleKeydown(e: KeyboardEvent): void {
      const target = e.target as HTMLInputElement;
      const idx = parseInt(target.dataset.index!);

      switch (e.key) {
        case "Backspace":
          if (!target.value && idx > 0) {
            values[idx] = "";
            inputs[idx - 1]!.value = "";
            inputs[idx - 1]!.focus();
            e.preventDefault();
          } else if (target.value) {
            target.value = "";
            values[idx] = "";
            opts.onChange?.(values.join(""));
          }
          break;

        case "ArrowLeft":
          if (idx > 0) { inputs[idx - 1]!.focus(); e.preventDefault(); }
          break;

        case "ArrowRight":
          if (idx < inputs.length - 1) { inputs[idx + 1]!.focus(); e.preventDefault(); }
          break;

        case "Home":
          inputs[0]!.focus();
          e.preventDefault();
          break;

        case "End":
          inputs[inputs.length - 1]!.focus();
          e.preventDefault();
          break;
      }
    }

    function handlePaste(e: ClipboardEvent): void {
      e.preventDefault();
      const pasted = e.clipboardData?.getData("text").replace(/\D/g, "").slice(0, opts.length) ?? "";

      for (let i = 0; i < pasted.length; i++) {
        if (i < inputs.length && pattern.test(pasted[i]!)) {
          inputs[i]!.value = pasted[i]!;
          values[i] = pasted[i]!;
        }
      }

      opts.onChange?.(values.join(""));

      // Focus last filled or next empty
      const lastFilled = Math.min(pasted.length, inputs.length - 1);
      inputs[lastFilled]!.focus();

      if (values.every((v) => v !== "")) {
        opts.onComplete?.(values.join(""));
      }
    }

    // Bind events
    for (const input of inputs) {
      input.addEventListener("input", handleInput);
      input.addEventListener("keydown", handleKeydown);
      input.addEventListener("paste", handlePaste);
    }

    // Public API
    return {
      element: container,

      getValue() { return values.join(""); },

      setValue(val: string) {
        for (let i = 0; i < opts.length; i++) {
          const ch = i < val.length ? val[i]! : "";
          values[i] = ch;
          inputs[i]!.value = ch;
        }
        opts.onChange?.(values.join(""));
      },

      clear() {
        values.fill("");
        for (const inp of inputs) inp.value = "";
        inputs[0]?.focus();
        opts.onChange?.("");
      },

      focus() { inputs[0]?.focus(); },

      isComplete() { return values.every((v) => v !== ""); },

      startCountdown() {}, // No-op in input mode
      stopCountdown() {},

      destroy() {
        destroyed = true;
        for (const input of inputs) {
          input.removeEventListener("input", handleInput);
          input.removeEventListener("keydown", handleKeydown);
          input.removeEventListener("paste", handlePaste);
        }
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };
  }

  // --- Countdown Mode ---

  function buildCountdownMode(): OtpInputInstance {
    const display = document.createElement("div");
    display.className = "otp-countdown-display";
    display.style.cssText = `
      display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px;
    `;

    const timerEl = document.createElement("span");
    timerEl.style.cssText = `font-size:${sz.fontSize * 1.8}px;font-weight:700;color:#374151;font-variant-numeric:tabular-nums;`;
    display.appendChild(timerEl);

    const labelEl = document.createElement("span");
    labelEl.textContent = "Resend code in";
    labelEl.style.cssText = "font-size:13px;color:#6b7280;";
    display.insertBefore(labelEl, timerEl);

    const resendBtn = document.createElement("button");
    resendBtn.type = "button";
    resendBtn.textContent = "Resend Code";
    resendBtn.style.cssText = `
      padding:8px 20px;border-radius:8px;border:1px solid #d1d5db;background:#fff;
      cursor:pointer;font-size:13px;font-weight:500;color:#4f46e5;display:none;
      transition:all 0.15s;
    `;
    resendBtn.addEventListener("click", () => {
      opts.onRequestCode?.();
      startCountdown(opts.countdownSeconds);
    });
    resendBtn.addEventListener("mouseenter", () => { resendBtn.style.background = "#eef2ff"; });
    resendBtn.addEventListener("mouseleave", () => { resendBtn.style.background = ""; });
    display.appendChild(resendBtn);

    container.appendChild(display);

    function formatTime(secs: number): string {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    }

    function startCountdown(seconds?: number): void {
      remainingSeconds = seconds ?? opts.countdownSeconds;
      resendBtn.style.display = "none";
      labelEl.style.display = "";
      timerEl.style.display = "";

      if (countdownTimer) clearInterval(countdownTimer);

      renderTime();
      countdownTimer = setInterval(() => {
        remainingSeconds--;
        renderTime();
        if (remainingSeconds <= 0) {
          stopCountdown();
          opts.onCountdownEnd?.();
        }
      }, 1000);
    }

    function renderTime(): void {
      timerEl.textContent = formatTime(remainingSeconds);
    }

    function stopCountdownFn(): void {
      if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
      labelEl.style.display = "none";
      timerEl.style.display = "none";
      resendBtn.style.display = "";
    }

    // Auto-start
    startCountdown();

    return {
      element: container,

      getValue() { return ""; },
      setValue() {},
      clear() {},
      focus() {},
      isComplete() { return false; },
      startCountdown,
      stopCountdown: stopCountdownFn,

      destroy() {
        destroyed = true;
        stopCountdownFn();
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };
  }
}

// --- Helper ---

function shakeElement(el: HTMLElement): void {
  el.animate([
    { transform: "translateX(0)" },
    { transform: "translateX(-6px)" },
    { transform: "translateX(6px)" },
    { transform: "translateX(-4px)" },
    { transform: "translateX(4px)" },
    { transform: "translateX(0)" },
  ], { duration: 350, easing: "ease-in-out" });
}
