/**
 * Odometer: Animated rolling digit counter with configurable digit count,
 * easing animations, prefix/suffix formatting, comma separators,
 * and smooth number transitions.
 */

// --- Types ---

export type OdometerEasing = "easeOutCubic" | "easeOutExpo" | "easeOutElastic" | "linear" | "spring";

export interface OdometerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial value */
  value?: number;
  /** Number of digits to display (auto-calculated if not set) */
  digits?: number;
  /** Number of decimal places */
  decimals?: number;
  /** Digit height (px) per character cell */
  digitHeight?: number;
  /** Font size (px) */
  fontSize?: number;
  /** Digit gap (px) between columns */
  digitGap?: number;
  /** Text color */
  color?: string;
  /** Background color for each digit cell */
  background?: string;
  /** Border radius for cells */
  borderRadius?: number;
  /** Easing type for roll animation */
  easing?: OdometerEasing;
  /** Animation duration (ms) per digit transition */
  duration?: number;
  /** Show comma separators every 3 digits? */
  showCommas?: boolean;
  /** Prefix text (e.g., "$") */
  prefix?: string;
  /** Suffix text (e.g., "%") */
  suffix?: string;
  /** Format negative numbers differently? */
  formatNegative?: boolean;
  /** Custom format function (overrides built-in formatting) */
  format?: (value: number) => string;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface OdometerInstance {
  element: HTMLElement;
  /** Get current displayed value */
  getValue: () => number;
  /** Set value with animation */
  setValue: (value: number) => void;
  /** Set value instantly without animation */
  setValueInstant: (value: number) => void;
  /** Increment by amount */
  increment: (amount?: number) => void;
  /** Decrement by amount */
  decrement: (amount?: number) => void;
  /** Update options dynamically */
  updateOptions: (updates: Partial<OdometerOptions>) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Easing Functions ---

const EASING_FNS: Record<OdometerEasing, (t: number) => number> = {
  easeOutCubic:   (t) => 1 - Math.pow(1 - t, 3),
  easeOutExpo:    (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
  },
  linear:         (t) => t,
  spring:         (t) => 1 - Math.cos(t * Math.PI * 3) * Math.exp(-t * 5),
};

// --- Main Factory ---

export function createOdometer(options: OdometerOptions): OdometerInstance {
  const opts = {
    value: options.value ?? 0,
    digits: options.digits,
    decimals: options.decimals ?? 0,
    digitHeight: options.digitHeight ?? 40,
    fontSize: options.fontSize ?? 28,
    digitGap: options.digitGap ?? 3,
    color: options.color ?? "#111827",
    background: options.background ?? "transparent",
    borderRadius: options.borderRadius ?? 6,
    easing: options.easing ?? "easeOutExpo",
    duration: options.duration ?? 800,
    showCommas: options.showCommas ?? true,
    prefix: options.prefix ?? "",
    suffix: options.suffix ?? "",
    formatNegative: options.formatNegative ?? true,
    format: options.format,
    onAnimationComplete: options.onAnimationComplete,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Odometer: container not found");

  let currentValue = opts.value;
  let destroyed = false;
  let activeAnimations = 0;

  // Root element
  const root = document.createElement("div");
  root.className = `odometer ${opts.className}`;
  root.style.cssText = `
    display:inline-flex;align-items:flex-end;gap:${opts.digitGap}px;
    font-family:'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size:${opts.fontSize}px;font-weight:700;line-height:1;
    color:${opts.color};overflow:hidden;
  `;
  container.appendChild(root);

  // Map: column index -> digit element
  const columns: HTMLElement[] = [];

  // --- Formatting ---

  function formatValue(val: number): string {
    if (opts.format) return opts.format(val);
    const absVal = Math.abs(val);
    let formatted = absVal.toFixed(opts.decimals).replace(/\.0+$/, "");
    if (opts.showCommas) {
      const parts = formatted.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      formatted = parts.join(".");
    }
    if (val < 0 && opts.formatNegative) {
      formatted = "-" + formatted;
    }
    return formatted;
  }

  function parseFormatted(formatted: string): string[] {
    // Split into characters, treating commas as separate display items
    const chars: string[] = [];
    for (const ch of formatted) {
      chars.push(ch);
    }
    return chars;
  }

  // --- Column Management ---

  function createColumn(char: string, isDigit: boolean): HTMLElement {
    const col = document.createElement("div");
    col.className = "odo-col";
    col.dataset.char = char;
    col.style.cssText = `
      display:inline-flex;flex-direction:column;align-items:center;
      justify-content:flex-end;height:${opts.digitHeight}px;overflow:hidden;
      position:relative;background:${isDigit ? opts.background : "transparent"};
      border-radius:${opts.borderRadius}px;min-width:${opts.fontSize * 0.6}px;
    `;

    const inner = document.createElement("div");
    inner.className = "odo-inner";
    inner.style.cssText = `
      transition:transform ${opts.duration}ms ${opts.easing};
      will-change:transform;
    `;

    // For digits: show 0-9 strip for rolling animation
    if (isDigit && /^\d$/.test(char)) {
      const num = parseInt(char, 10);
      inner.innerHTML = "0<br>1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9".split("<br>").map(d =>
        `<span style="display:block;height:${opts.digitHeight}px;line-height:${opts.digitHeight}px;text-align:center;">${d}</span>`
      ).join("");
      inner.style.transform = `translateY(-${num * opts.digitHeight}px)`;
    } else {
      // Non-digit: just static display
      inner.innerHTML = `<span style="display:block;height:${opts.digitHeight}px;line-height:${opts.digitHeight}px;text-align:center;">${char}</span>`;
    }

    col.appendChild(inner);
    return col;
  }

  function renderColumns(formatted: string): void {
    root.innerHTML = "";
    columns.length = 0;

    // Prefix
    if (opts.prefix) {
      const prefixCol = document.createElement("span");
      prefixCol.className = "odo-prefix";
      prefixCol.textContent = opts.prefix;
      prefixCol.style.cssText = `line-height:${opts.digitHeight}px;opacity:0.6;`;
      root.appendChild(prefixCol);
    }

    const chars = parseFormatted(formatted);
    for (const ch of chars) {
      const isDigit = /^\d$/.test(ch);
      const col = createColumn(ch, isDigit);
      columns.push(col);
      root.appendChild(col);
    }

    // Suffix
    if (opts.suffix) {
      const suffixCol = document.createElement("span");
      suffixCol.className = "odo-suffix";
      suffixCol.textContent = opts.suffix;
      suffixCol.style.cssText = `line-height:${opts.digitHeight}px;opacity:0.6;margin-left:2px;`;
      root.appendChild(suffixCol);
    }
  }

  function animateToValue(target: number): void {
    const targetStr = formatValue(target);
    const currentStr = formatValue(currentValue);
    const targetChars = parseFormatted(targetStr);
    const currentChars = parseFormatted(currentStr);

    // Quick path: same string
    if (targetStr === currentStr) return;

    // Re-render columns if length changed
    if (targetChars.length !== currentChars.length || root.children.length === 0) {
      renderColumns(targetStr);
      currentValue = target;
      return;
    }

    // Animate each digit column
    activeAnimations++;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!;
      const inner = col.querySelector(".odo-inner") as HTMLElement;
      if (!inner) continue;

      const newChar = targetChars[i] ?? "0";
      const oldChar = currentChars[i] ?? "0";
      const isNewDigit = /^\d$/.test(newChar);
      const isOldDigit = /^\d$/.test(oldChar);

      if (isNewDigit && isOldDigit) {
        // Both digits: animate the roll
        const oldNum = parseInt(oldChar, 10);
        const newNum = parseInt(newChar, 10);
        const diff = newNum - oldNum;
        // Handle wrap-around (e.g., 9->0 should go forward)
        const effectiveDiff = diff >= 0 ? diff : diff + 10;
        inner.style.transform = `translateY(-${(oldNum + effectiveDiff) * opts.digitHeight}px)`;

        // After animation, snap to correct position
        setTimeout(() => {
          inner.style.transition = "none";
          inner.style.transform = `translateY(-${newNum * opts.digitHeight}px)`;
          // Force reflow
          void inner.offsetHeight;
          inner.style.transition = `transform ${opts.duration}ms ${opts.easing}`;
        }, opts.duration + 50);
      } else if (isNewDigit !== isOldDigit) {
        // Type changed (digit <-> non-digit): recreate column
        const newCol = createColumn(newChar, isNewDigit);
        col.replaceWith(newCol);
        columns[i] = newCol;
      } else {
        // Both non-digit: just update text
        const span = inner.querySelector("span");
        if (span) span.textContent = newChar;
      }
    }

    setTimeout(() => {
      activeAnimations--;
      if (activeAnimations <= 0) {
        activeAnimations = 0;
        opts.onAnimationComplete?.();
      }
    }, opts.duration + 100);

    currentValue = target;
  }

  // Initial render
  renderColumns(formatValue(currentValue));

  // --- Instance ---

  const instance: OdometerInstance = {
    element: root,

    getValue() { return currentValue; },

    setValue(value: number) {
      animateToValue(value);
    },

    setValueInstant(value: number) {
      currentValue = value;
      renderColumns(formatValue(value));
    },

    increment(amount = 1) {
      animateToValue(currentValue + amount);
    },

    decrement(amount = 1) {
      animateToValue(currentValue - amount);
    },

    updateOptions(updates: Partial<OdometerOptions>) {
      Object.assign(opts, updates);
      root.style.cssText = `
        display:inline-flex;align-items:flex-end;gap:${opts.digitGap}px;
        font-family:'SF Mono', 'Fira Code', 'Consolas', monospace;
        font-size:${opts.fontSize}px;font-weight:700;line-height:1;
        color:${opts.color};overflow:hidden;
      `;
      renderColumns(formatValue(currentValue));
    },

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
