/**
 * Typing Indicator Utilities: Animated typing dots, progress indicators,
 * and text reveal animations for chat/messaging UIs.
 */

// --- Types ---

export type TypingStyle = "dots" | "pulse" | "wave" | "bounce" | "elastic" | "minimal";
export type TypingSize = "sm" | "md" | "lg";

export interface TypingIndicatorOptions {
  /** Visual style */
  style?: TypingStyle;
  /** Size variant */
  size?: TypingSize;
  /** Dot color */
  color?: string;
  /** Dot count (for dots/wave styles) */
  dotCount?: number;
  /** Animation speed multiplier (1 = normal) */
  speed?: number;
  /** Label text shown beside dots (e.g., "typing...") */
  label?: string;
  /** Show label */
  showLabel?: boolean;
  /** Layout direction */
  horizontal?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface TextRevealOptions {
  /** Full text to reveal */
  text: string;
  /** Characters per second */
  speed?: number;
  /** Start delay before typing begins (ms) */
  startDelay?: number;
  /** Cursor character */
  cursor?: string;
  /** Show blinking cursor */
  showCursor?: boolean;
  /** Cursor blink interval (ms) */
  cursorBlinkInterval?: number;
  /** Callback when a character is typed */
  onChar?: (char: string, index: number) => void;
  /** Callback when complete */
  onComplete?: () => void;
  /** HTML mode — renders HTML tags as-is */
  htmlMode?: boolean;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface TextRevealInstance {
  /** The root element */
  el: HTMLElement;
  /** Start the reveal animation */
  start: () => void;
  /** Pause the animation */
  pause: () => void;
  /** Resume after pause */
  resume: () => void;
  /** Jump to end (show full text immediately) */
  complete: () => void;
  /** Reset and restart */
  reset: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const DOT_SIZE_MAP: Record<TypingSize, { dotSize: string; gap: string }> = {
  sm: { dotSize: "5px", gap: "3px" },
  md: { dotSize: "8px", gap: "5px" },
  lg: { dotSize: "12px", gap: "7px" },
};

// --- CSS Keyframe Injection ---

const TYPING_KEYFRAMES = `
@keyframes typingDotBounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-8px); }
}
@keyframes typingDotPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 1; }
}
@keyframes typingDotWave {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-6px); }
  75% { transform: translateY(3px); }
}
@keyframes typingDotElastic {
  0%, 100% { transform: scaleY(1); }
  30% { transform: scaleY(1.8); }
  60% { transform: scaleY(0.6); }
}
@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
`;

let typingStylesInjected = false;

function _injectTypingStyles(): void {
  if (typingStylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "typing-indicator-styles";
  style.textContent = TYPING_KEYFRAMES;
  document.head.appendChild(style);
  typingStylesInjected = true;
}

// --- Core Factory: Typing Indicator ---

/**
 * Create an animated typing indicator (dots).
 *
 * @example
 * ```ts
 * const indicator = createTypingIndicator({
 *   style: "bounce",
 *   label: "Someone is typing...",
 *   showLabel: true,
 * });
 * ```
 */
export function createTypingIndicator(options: TypingIndicatorOptions = {}): HTMLElement {
  _injectTypingStyles();

  const {
    style = "dots",
    size = "md",
    color = "#6b7280",
    dotCount = 3,
    speed = 1,
    label = "",
    showLabel = false,
    horizontal = true,
    className,
    container,
  } = options;

  const ds = DOT_SIZE_MAP[size];
  const root = document.createElement("div");
  root.className = `typing-indicator ${style} ${size} ${className ?? ""}`.trim();

  // Dots container
  const dotsContainer = document.createElement("span");
  dotsContainer.className = "typing-dots";
  dotsContainer.style.cssText =
    `display:inline-flex;gap:${ds.gap};align-items:center;` +
    (!horizontal ? "flex-direction:column;" : "");

  for (let i = 0; i < dotCount; i++) {
    const dot = document.createElement("span");
    dot.className = "typing-dot";
    dot.style.cssText =
      `display:inline-block;width:${ds.dotSize};height:${ds.dotSize};` +
      `border-radius:50%;background:${color};`;

    // Apply animation based on style
    const delay = `${i * 0.15}s`;
    const dur = `${1 / speed}s`;

    switch (style) {
      case "dots":
      case "bounce":
        dot.style.animation = `typingDotBounce ${dur} infinite ${delay}`;
        break;
      case "pulse":
        dot.style.animation = `typingDotPulse ${dur} infinite ${delay}`;
        break;
      case "wave":
        dot.style.animation = `typingDotWave ${dur} infinite ${delay}`;
        break;
      case "elastic":
        dot.style.animation = `typingDotElastic ${dur} infinite ${delay}`;
        break;
      case "minimal":
        dot.style.animation = `typingDotPulse ${dur * 2} infinite ${delay}`;
        dot.style.opacity = "0.4";
        break;
    }

    dotsContainer.appendChild(dot);
  }

  root.appendChild(dotsContainer);

  // Label
  if (showLabel && label) {
    const labelEl = document.createElement("span");
    labelEl.className = "typing-label";
    labelEl.textContent = label;
    labelEl.style.cssText =
      `margin-left:8px;font-size:13px;color:#9ca3af;font-style:italic;`;
    root.appendChild(labelEl);
  }

  root.style.cssText =
    `display:inline-flex;align-items:center;${horizontal ? "" : "flex-direction:column;"}` +
    "padding:8px 12px;";

  (container ?? document.body).appendChild(root);
  return root;
}

// --- Core Factory: Text Reveal ---

/**
 * Create a text reveal (typewriter) effect.
 *
 * @example
 * ```ts
 * const typer = createTextReveal({
 *   text: "Hello, World!",
 *   speed: 50,
 *   showCursor: true,
 *   onComplete: () => console.log("Done"),
 * });
 * typer.start();
 * ```
 */
export function createTextReveal(options: TextRevealOptions): TextRevealInstance {
  _injectTypingStyles();

  const {
    text,
    speed = 50,
    startDelay = 0,
    cursor = "|",
    showCursor = true,
    cursorBlinkInterval = 500,
    onChar,
    onComplete,
    htmlMode = false,
    className,
    container,
  } = options;

  let currentIndex = 0;
  let paused = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cursorTimer: ReturnType<typeof setInterval> | null = null;
  let cursorVisible = true;

  const root = document.createElement("span");
  root.className = `text-reveal ${className ?? ""}`.trim();
  root.style.cssText =
    "font-family:inherit;font-size:inherit;color:inherit;";

  const textEl = document.createElement("span");
  textEl.className = "text-reveal-content";
  textEl.style.cssText = "";
  root.appendChild(textEl);

  const cursorEl = document.createElement("span");
  cursorEl.className = "text-reveal-cursor";
  cursorEl.textContent = cursor;
  cursorEl.style.cssText =
    `animation:cursorBlink ${cursorBlinkInterval}ms step-end infinite;` +
    "color:inherit;font-weight:normal;";
  if (showCursor) root.appendChild(cursorEl);

  (container ?? document.body).appendChild(root);

  function _typeNext(): void {
    if (paused) return;
    if (currentIndex >= text.length) {
      // Done
      if (showCursor) {
        // Keep cursor blinking
      } else {
        cursorEl.remove();
      }
      onComplete?.();
      return;
    }

    const char = text[currentIndex]!;
    onChar?.(char, currentIndex);

    if (htmlMode) {
      // In HTML mode, we need to handle tags properly
      // For simplicity, append char by char but render as innerHTML
      currentIndex++;
      textEl.innerHTML = text.slice(0, currentIndex);
    } else {
      textEl.textContent = text.slice(0, currentIndex + 1);
      currentIndex++;
    }

    timer = setTimeout(_typeNext, speed);
  }

  function start(): void {
    if (timer !== null) return; // Already started or completed
    timer = setTimeout(_typeNext, startDelay);
  }

  function pause(): void {
    paused = true;
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }

  function resume(): void {
    if (!paused) return;
    paused = false;
    timer = setTimeout(_typeNext, 0);
  }

  function complete(): void {
    pause();
    if (htmlMode) {
      textEl.innerHTML = text;
    } else {
      textEl.textContent = text;
    }
    currentIndex = text.length;
    onComplete?.();
  }

  function reset(): void {
    pause();
    currentIndex = 0;
    textEl.textContent = "";
    if (!root.contains(cursorEl) && showCursor) {
      root.appendChild(cursorEl);
    }
  }

  function destroy(): void {
    pause();
    if (cursorTimer !== null) { clearInterval(cursorTimer); cursorTimer = null; }
    root.remove();
  }

  return { el: root, start, pause, resume, complete, reset, destroy };
}
