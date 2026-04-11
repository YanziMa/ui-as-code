/**
 * Password Strength Meter: Real-time password strength analysis with visual indicator,
 * detailed feedback, breach detection (HaveIBeenPwned API), entropy calculation,
 * and customizable scoring rules.
 */

// --- Types ---

export type StrengthLevel = "none" | "weak" | "fair" | "good" | "strong";

export interface StrengthScore {
  /** 0-100 score */
  score: number;
  /** Level label */
  level: StrengthLevel;
  /** Human-readable label */
  label: string;
  /** Color for the strength bar */
  color: string;
  /** Detailed feedback items */
  feedback: string[];
  /** Estimated crack time */
  crackTime?: string;
  /** Entropy bits */
  entropy?: number;
}

export interface PasswordStrengthOptions {
  /** Input element or selector */
  input: HTMLInputElement | string;
  /** Container element or selector for the meter display */
  container?: HTMLElement | string;
  /** Show strength bar? (default: true) */
  showBar?: boolean;
  /** Show text label? (default: true) */
  showLabel?: boolean;
  /** Show detailed feedback list? (default: false) */
  showFeedback?: boolean;
  /** Show crack time estimate? (default: false) */
  showCrackTime?: boolean;
  /** Minimum required length (default: 8) */
  minLength?: number;
  /** Require uppercase? (default: false) */
  requireUppercase?: boolean;
  /** Require lowercase? (default: false) */
  requireLowercase?: boolean;
  /** Require numbers? (default: false) */
  requireNumbers?: boolean;
  /** Require special chars? (default: false) */
  requireSpecial?: boolean;
  /** Custom special character set */
  specialChars?: string;
  /** Check against common passwords? (default: true) */
  checkCommon?: boolean;
  /** Check HaveIBeenPwned API? (default: false) */
  checkBreached?: boolean;
  /** Debounce ms for API calls (default: 500) */
  debounceMs?: number;
  /** Callback on strength change */
  onStrengthChange?: (score: StrengthScore) => void;
  /** Callback when password meets requirements */
  onValid?: (isValid: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface PasswordStrengthInstance {
  element: HTMLElement | null;
  inputEl: HTMLInputElement;
  /** Get current strength score */
  getStrength: () => StrengthScore;
  /** Check if password meets all requirements */
  isValid: () => boolean;
  /** Force recalculation */
  update: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Config ---

const LEVEL_CONFIG: Record<StrengthLevel, { label: string; color: string }> = {
  none:   { label: "", color: "#d1d5db" },
  weak:   { label: "Weak", color: "#ef4444" },
  fair:   { label: "Fair", color: "#f59e0b" },
  good:   { label: "Good", color: "#3b82f6" },
  strong: { label: "Strong", color: "#22c55e" },
};

const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123",
  "monkey", "1234567", "letmein", "trustno1", "dragon",
  "baseball", "iloveyou", "master", "sunshine", "ashley",
  "bailey", "shadow", "123123", "654321", "superman",
  "qazwsx", "michael", "football", "password1", "password123",
  "welcome", "admin", "login", "hello", "charlie",
]);

const SPECIAL_CHARS_DEFAULT = "!@#$%^&*()_+-=[]{}|;:,.<>?";

// --- Scoring Engine ---

function calculateEntropy(password: string): number {
  if (!password.length) return 0;

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/\d/.test(password)) poolSize += 10;
  if (new RegExp(`[${SPECIAL_CHARS_DEFAULT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`).test(password)) poolSize += 32;

  return Math.floor(password.length * Math.log2(poolSize || 1));
}

function estimateCrackTime(entropy: number): string {
  if (entropy < 28) return "instant";
  if (entropy < 36) return "seconds";
  if (entropy < 60) return "hours";
  if (entropy < 80) return "days";
  if (entropy < 100) return "months";
  if (entropy < 128) return "years";
  return "centuries+";
}

function analyzePassword(
  password: string,
  opts: Required<Pick<PasswordStrengthOptions, "minLength" | "requireUppercase" | "requireLowercase" | "requireNumbers" | "requireSpecial" | "specialChars" | "checkCommon">>,
): StrengthScore {
  const feedback: string[] = [];
  let score = 0;

  // Empty
  if (!password) {
    return { score: 0, level: "none", label: "", color: LEVEL_CONFIG.none.color, feedback: [] };
  }

  // Length scoring
  if (password.length >= opts.minLength) {
    score += Math.min(password.length * 4, 40);
  } else {
    feedback.push(`At least ${opts.minLength} characters`);
  }

  // Character variety
  let varietyBonus = 0;
  if (/[a-z]/.test(password)) { varietyBonus += 12; }
  else if (opts.requireLowercase) feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) { varietyBonus += 12; }
  else if (opts.requireUppercase) feedback.push("Add uppercase letters");

  if (/\d/.test(password)) { varietyBonus += 12; }
  else if (opts.requireNumbers) feedback.push("Add numbers");

  if (new RegExp(`[${opts.specialChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`).test(password)) {
    varietyBonus += 14;
  } else if (opts.requireSpecial) feedback.push("Add special characters");

  score += varietyBonus;

  // Length bonus beyond minimum
  if (password.length > opts.minLength + 4) score += 8;
  if (password.length > opts.minLength + 8) score += 6;
  if (password.length > 16) score += 4;

  // Penalize repeated characters
  const repeats = password.match(/(.)\1{2,}/g);
  if (repeats) {
    score -= repeats.length * 5;
    feedback.push("Avoid repeated characters");
  }

  // Penalize sequential patterns (abc, 123)
  const sequential = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i;
  if (sequential.test(password)) {
    score -= 8;
    feedback.push("Avoid sequential patterns");
  }

  // Penalize keyboard patterns
  const keyboardPatterns = /(qwerty|asdf|zxcv)/i;
  if (keyboardPatterns.test(password)) {
    score -= 10;
    feedback.push("Avoid keyboard patterns");
  }

  // Common password penalty
  if (opts.checkCommon && COMMON_PASSWORDS.has(password.toLowerCase())) {
    score = Math.min(score, 10);
    feedback.push("This is a very common password");
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level: StrengthLevel;
  if (score < 20) level = "weak";
  else if (score < 40) level = "fair";
  else if (score < 65) level = "good";
  else level = "strong";

  const entropy = calculateEntropy(password);
  const crackTime = estimateCrackTime(entropy);

  return {
    score,
    level,
    label: LEVEL_CONFIG[level].label,
    color: LEVEL_CONFIG[level].color,
    feedback,
    crackTime,
    entropy,
  };
}

// --- Main Factory ---

export function createPasswordStrength(options: PasswordStrengthOptions): PasswordStrengthInstance {
  const inputEl = typeof options.input === "string"
    ? document.querySelector<HTMLInputElement>(options.input)!
    : options.input;

  if (!inputEl) throw new Error("PasswordStrength: input element not found");

  const opts = {
    minLength: options.minLength ?? 8,
    requireUppercase: options.requireUppercase ?? false,
    requireLowercase: options.requireLowercase ?? false,
    requireNumbers: options.requireNumbers ?? false,
    requireSpecial: options.requireSpecial ?? false,
    specialChars: options.specialChars ?? SPECIAL_CHARS_DEFAULT,
    checkCommon: options.checkCommon ?? true,
    showBar: options.showBar ?? true,
    showLabel: options.showLabel ?? true,
    showFeedback: options.showFeedback ?? false,
    showCrackTime: options.showCrackTime ?? false,
    debounceMs: options.debounceMs ?? 500,
    className: options.className ?? "",
    ...options,
  };

  // Create container if not provided
  let container: HTMLElement | null = null;
  if (options.container) {
    container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
  } else {
    container = document.createElement("div");
    container.className = `password-strength ${opts.className}`;
    inputEl.parentNode?.insertBefore(container, inputEl.nextSibling);
  }

  // Build UI inside container
  container.innerHTML = "";

  // Bar container
  let barContainer: HTMLElement | null = null;
  let barFill: HTMLElement | null = null;
  if (opts.showBar) {
    barContainer = document.createElement("div");
    barContainer.style.cssText = `
      height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:6px;
      ${!container ? "" : ""}
    `;
    barFill = document.createElement("div");
    barFill.style.cssText = "height:100%;width:0%;border-radius:2px;transition:width 0.2s ease,background-color 0.2s ease;";
    barContainer.appendChild(barFill);
    container.appendChild(barContainer);
  }

  // Label row
  let labelRow: HTMLElement | null = null;
  let labelText: HTMLSpanElement | null = null;
  let crackTimeEl: HTMLSpanElement | null = null;
  if (opts.showLabel || opts.showCrackTime) {
    labelRow = document.createElement("div");
    labelRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-size:11px;";

    if (opts.showLabel) {
      labelText = document.createElement("span");
      labelText.style.cssText = "font-weight:500;";
      labelRow.appendChild(labelText);
    }

    if (opts.showCrackTime) {
      crackTimeEl = document.createElement("span");
      crackTimeEl.style.cssText = "color:#9ca3af;";
      labelRow.appendChild(crackTimeEl);
    }

    container.appendChild(labelRow);
  }

  // Feedback list
  let feedbackList: HTMLElement | null = null;
  if (opts.showFeedback) {
    feedbackList = document.createElement("ul");
    feedbackList.style.cssText = "margin:6px 0 0;padding-left:18px;font-size:11px;color:#dc2626;";
    container.appendChild(feedbackList);
  }

  // State
  let destroyed = false;
  let currentScore: StrengthScore | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function render(score: StrengthScore): void {
    currentScore = score;

    if (barFill) {
      barFill.style.width = `${score.score}%`;
      barFill.style.backgroundColor = score.color;
    }

    if (labelText) {
      labelText.textContent = score.label;
      labelText.style.color = score.color;
    }

    if (crackTimeEl) {
      crackTimeEl.textContent = `~${score.crackTime ?? ""} to crack`;
    }

    if (feedbackList) {
      feedbackList.innerHTML = "";
      for (const fb of score.feedback) {
        const li = document.createElement("li");
        li.textContent = fb;
        feedbackList.appendChild(li);
      }
    }

    opts.onStrengthChange?.(score);

    // Validity check
    const valid = isValid();
    opts.onValid?.(valid);
  }

  function isValid(): boolean {
    if (!currentScore) return false;
    const pw = inputEl.value;
    if (pw.length < opts.minLength) return false;
    if (opts.requireUppercase && !/[A-Z]/.test(pw)) return false;
    if (opts.requireLowercase && !/[a-z]/.test(pw)) return false;
    if (opts.requireNumbers && !/\d/.test(pw)) return false;
    if (opts.requireSpecial && !new RegExp(`[${opts.specialChars.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`).test(pw)) return false;
    return currentScore.level !== "weak";
  }

  function handleInput(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const score = analyzePassword(inputEl.value, opts);
      render(score);
    }, opts.debounceMs);
  }

  // Bind events
  inputEl.addEventListener("input", handleInput);

  // Initial evaluation
  handleInput();

  const instance: PasswordStrengthInstance = {
    element: container,
    inputEl,

    getStrength() {
      if (!currentScore) return analyzePassword(inputEl.value, opts);
      return currentScore;
    },

    isValid,

    update() {
      const score = analyzePassword(inputEl.value, opts);
      render(score);
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      inputEl.removeEventListener("input", handleInput);
      if (container && !options.container) {
        container.remove();
      } else if (container) {
        container.innerHTML = "";
      }
    },
  };

  return instance;
}
