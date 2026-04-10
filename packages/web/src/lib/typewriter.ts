/**
 * Typewriter Effect: Animated text reveal with configurable speed, cursor blink,
 * pause at punctuation, loop support, random character scramble, callback per character,
 * and HTML support.
 */

// --- Types ---

export interface TypewriterOptions {
  /** Target element or selector */
  target: HTMLElement | string;
  /** Text to type out */
  text: string;
  /** Speed in ms per character (default: 50) */
  speed?: number;
  /** Delay before start (ms) */
  startDelay?: number;
  /** Delay after complete (ms) */
  completeDelay?: number;
  /** Cursor character (default: "|") */
  cursor?: string;
  /** Show cursor? (default: true) */
  showCursor?: boolean;
  /** Cursor blink speed in ms (default: 530) */
  cursorBlinkSpeed?: number;
  /** Pause at these characters (ms extra) */
  pauseChars?: Record<string, number>;
  /** Loop the animation? (default: false) */
  loop?: boolean;
  /** Loop delay between iterations (ms) */
  loopDelay?: number;
  /** Scramble effect duration per char (ms, default: 0 = off) */
  scrambleDuration?: number;
  /** Characters to use for scrambling */
  scrambleChars?: string;
  /** Callback when a character is typed */
  onChar?: (char: string, index: number, fullText: string) => void;
  /** Callback when typing completes */
  onComplete?: (fullText: string) => void;
  /** Callback when loop restarts */
  onLoop?: () => void;
  /** Preserve existing HTML content? */
  preserveContent?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface TypewriterInstance {
  element: HTMLElement;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  destroy: () => void;
}

// --- Main Class ---

export class TypewriterManager {
  create(options: TypewriterOptions): TypewriterInstance {
    const opts = {
      speed: options.speed ?? 50,
      startDelay: options.startDelay ?? 0,
      completeDelay: options.completeDelay ?? 0,
      cursor: options.cursor ?? "|",
      showCursor: options.showCursor ?? true,
      cursorBlinkSpeed: options.cursorBlinkSpeed ?? 530,
      pauseChars: { ".": 150, ",": 100, "!": 120, "?": 120, ";": 50, "-": 30 },
      loop: options.loop ?? false,
      loopDelay: options.loopDelay ?? 2000,
      scrambleDuration: options.scrambleDuration ?? 0,
      scrambleChars: options.scrambleChars ?? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()",
      preserveContent: options.preserveContent ?? false,
      ...options,
    };

    const el = typeof options.target === "string"
      ? document.querySelector<HTMLElement>(options.target)!
      : options.target;

    if (!el) throw new Error("Typewriter: target not found");

    let currentIndex = 0;
    let isPaused = false;
    let destroyed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cursorEl: HTMLSpanElement | null = null;
    let blinkInterval: ReturnType<typeof setInterval> | null = null;
    let originalContent = "";

    // Save original content
    if (opts.preserveContent) {
      originalContent = el.innerHTML;
    }

    function createCursor(): HTMLSpanElement {
      const span = document.createElement("span");
      span.className = "tw-cursor";
      span.textContent = opts.cursor;
      span.style.cssText = `
        display:inline-block;animation:tw-blink ${opts.cursorBlinkSpeed}ms step-end infinite;
        color:inherit;font-weight:normal;vertical-align:text-bottom;margin-left:1px;
      `;
      return span;
    }

    // Inject blink keyframe if not present
    if (!document.getElementById("typewriter-styles")) {
      const style = document.createElement("style");
      style.id = "typewriter-styles";
      style.textContent = `@keyframes tw-blink{0%,100%{opacity:1;}50%{opacity:0;}}`;
      document.head.appendChild(style);
    }

    function typeNextChar(): void {
      if (destroyed || isPaused || currentIndex >= opts.text.length) {
        // Complete
        if (currentIndex >= opts.text.length && !destroyed) {
          if (opts.showCursor && !cursorEl) {
            cursorEl = createCursor();
            el.appendChild(cursorEl);
            startBlink();
          }
          opts.onComplete?.(opts.text);

          if (opts.loop) {
            timeoutId = setTimeout(() => {
              opts.onLoop?.();
              reset();
              start();
            }, opts.loopDelay);
          } else {
            timeoutId = setTimeout(() => {
              if (cursorEl) { cursorEl.remove(); cursorEl = null; stopBlink(); }
            }, opts.completeDelay);
          }
        }
        return;
      }

      const char = opts.text[currentIndex];

      // Scramble effect
      if (opts.scrambleDuration > 0 && currentIndex < opts.text.length - 1) {
        const scrambleLen = Math.min(
          Math.max(2, Math.floor(opts.scrambleDuration / opts.speed)),
          8
        );
        let scrambleCount = 0;
        const scrambleInterval = setInterval(() => {
          if (scrambleCount >= scrambleLen || destroyed) {
            clearInterval(scrambleInterval);
            commitChar(char);
            return;
          }
          // Show random chars
          const randomStr = Array.from({ length: Math.max(1, char.length) }, () =>
            opts.scrambleChars[Math.floor(Math.random() * opts.scrambleChars.length)]
          ).join("");
          el.textContent = el.textContent.slice(0, currentIndex) + randomStr;
          if (cursorEl) el.appendChild(cursorEl);
          scrambleCount++;
        }, opts.speed / 2);
      } else {
        commitChar(char);
      }

      opts.onChar?.(char, currentIndex, opts.text);
      currentIndex++;

      // Calculate delay for next char
      let delay = opts.speed;
      for (const [ch, extraDelay] of Object.entries(opts.pauseChars)) {
        if (char === ch) { delay += extraDelay; break; }
      }

      timeoutId = setTimeout(typeNextChar, delay);
    }

    function commitChar(char: string): void {
      el.textContent += char;
      if (opts.showCursor) {
        if (cursorEl) cursorEl.remove();
        cursorEl = createCursor();
        el.appendChild(cursorEl);
      }
    }

    function startBlink(): void {
      if (blinkInterval) return;
      // Blink is handled by CSS animation, but we can add JS fallback logic here if needed
    }

    function stopBlink(): void {
      if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
      }
    }

    function start(): void {
      if (destroyed) return;
      cleanup();

      el.textContent = "";
      if (opts.preserveContent) el.innerHTML = originalContent;
      currentIndex = 0;
      isPaused = false;

      if (opts.startDelay > 0) {
        timeoutId = setTimeout(typeNextChar, opts.startDelay);
      } else {
        typeNextChar();
      }
    }

    function pause(): void {
      isPaused = true;
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    }

    function resume(): void {
      if (!isPaused || destroyed) return;
      isPaused = false;
      typeNextChar();
    }

    function reset(): void {
      cleanup();
      el.textContent = "";
      if (opts.preserveContent) el.innerHTML = originalContent;
      currentIndex = 0;
      cursorEl?.remove();
      cursorEl = null;
      stopBlink();
    }

    function cleanup(): void {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      stopBlink();
      cursorEl?.remove();
      cursorEl = null;
    }

    const instance: TypewriterInstance = {
      element: el,
      start,
      pause,
      resume,
      reset,
      destroy() {
        destroyed = true;
        cleanup();
        if (opts.preserveContent) el.innerHTML = originalContent;
        else el.textContent = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a typewriter effect */
export function createTypewriter(options: TypewriterOptions): TypewriterInstance {
  return new TypewriterManager().create(options);
}
