/**
 * Robot / Automation: Browser automation helpers, keyboard/mouse
 * simulation sequences, form auto-fill, accessibility tree walking,
 * screenshot comparison utilities, and test automation primitives.
 */

// --- Types ---

export interface RobotOptions {
  /** Root element to operate within (default: document.body) */
  root?: HTMLElement;
  /** Delay between actions in ms */
  defaultDelay?: number;
  /** Log each action? */
  verbose?: boolean;
}

export interface StepResult {
  /** Name of the step that ran */
  step: string;
  /** Success or failure */
  success: boolean;
  /** Duration in ms */
  durationMs: number;
  /** Error message if failed */
  error?: string;
}

// --- Keyboard Simulation ---

/** Press a key combination */
export function pressKey(
  key: string,
  options?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean; delay?: number },
): Promise<void> {
  const el = document.activeElement ?? document.body;

  const keyEventInit: KeyboardEventInit = {
    key,
    code: keyCodeToCode(key),
    bubbles: true,
    cancelable: true,
    ctrlKey: options?.ctrl ?? false,
    shiftKey: options?.shift ?? false,
    altKey: options?.alt ?? false,
    metaKey: options?.meta ?? false,
  };

  el.dispatchEvent(new KeyboardEvent("keydown", keyEventInit));
  el.dispatchEvent(new KeyboardEvent("keypress", keyEventInit));
  el.dispatchEvent(new KeyboardEvent("keyup", keyEventInit));

  if (options?.delay) await sleep(options.delay);
}

/** Type text into the currently focused element character by character */
export async function typeText(
  text: string,
  options?: { delayPerChar?: number; clearFirst?: boolean },
): Promise<void> {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | HTMLElement | null;
  if (!el) return;

  const delay = options?.delayPerChar ?? 30;

  if (options?.clearFirst && ("value" in el)) {
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  for (const char of text) {
    // Handle special keys
    if (char === "\n") {
      await pressKey("Enter", { delay: 0 });
    } else if (char === "\t") {
      await pressKey("Tab", { delay: 0 });
    } else {
      const inputEv = new InputEvent("beforeinput", {
        data: char,
        inputType: "insertText",
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(inputEv);

      if ("value" in el) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, "value",
        )?.set ?? Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, "value",
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, el.value + char);
        } else {
          (el as HTMLInputElement).value += char;
        }
        el.dispatchEvent(new InputEvent("input", { data: char, bubbles: true }));
      }
    }

    if (delay > 0) await sleep(delay);
  }

  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function keyCodeToCode(key: string): string {
  const map: Record<string, string> = {
    "Enter": "Enter", "Tab": "Tab", "Escape": "Escape", " ": "Space",
    "ArrowUp": "ArrowUp", "ArrowDown": "ArrowDown", "ArrowLeft": "ArrowLeft", "ArrowRight": "ArrowRight",
    "Backspace": "Backspace", "Delete": "Delete",
    "a": "KeyA", "b": "KeyB", "c": "KeyC", "d": "KeyD", "e": "KeyE", "f": "KeyF", "g": "KeyG",
    "h": "KeyH", "i": "KeyI", "j": "KeyJ", "k": "KeyK", "l": "KeyL", "m": "KeyM", "n": "KeyN",
    "o": "KeyO", "p": "KeyP", "q": "KeyQ", "r": "KeyR", "s": "KeyS", "t": "KeyT", "u": "KeyU",
    "v": "KeyV", "w": "KeyW", "x": "KeyX", "y": "KeyY", "z": "KeyZ",
    "0": "Digit0", "1": "Digit1", "2": "Digit2", "3": "Digit3", "4": "Digit4",
    "5": "Digit5", "6": "Digit6", "7": "Digit7", "8": "Digit8", "9": "Digit9",
  };
 return map[key] ?? key;
}

// --- Mouse Simulation ---

/** Click an element with optional position offset */
export async function click(
  selectorOrEl: string | HTMLElement,
  options?: { x?: number; y?: number; button?: "left" | "middle" | "right"; doubleClick?: boolean; delay?: number },
): Promise<void> {
  const el = typeof selectorOrEl === "string"
    ? document.querySelector<HTMLElement>(selectorOrEl)!
    : selectorOrEl;

  if (!el) throw new Error(`Robot.click: element not found: ${selectorOrEl}`);

  el.focus();
  el.scrollIntoView({ block: "center" });

  const rect = el.getBoundingClientRect();
  const x = (options?.x ?? rect.width / 2) + rect.left;
  const y = (options?.y ?? rect.height / 2) + rect.top;
  const button = options?.button === "middle" ? 1 : options?.button === "right" ? 2 : 0;

  el.dispatchEvent(new MouseEvent("mousedown", { clientX: x, clientY: y, button, bubbles: true, cancelable: true }));

  if (options?.doubleClick) {
    el.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, button, detail: 2, bubbles: true }));
    el.dispatchEvent(new MouseEvent("dblclick", { clientX: x, clientY: y, button, bubbles: true }));
  } else {
    el.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, button, detail: 1, bubbles: true }));
  }

  el.dispatchEvent(new MouseEvent("mouseup", { clientX: x, clientY: y, button, bubbles: true }));

  if (options?.delay) await sleep(options.delay);
}

/** Hover over an element */
export async function hover(selectorOrEl: string | HTMLElement, options?: { delay?: number }): Promise<void> {
  const el = typeof selectorOrEl === "string"
    ? document.querySelector<HTMLElement>(selectorOrEl)!
    : selectorOrEl;

  if (!el) return;

  const rect = el.getBoundingClientRect();
  const x = rect.width / 2 + rect.left;
  const y = rect.height / 2 + rect.top;

  el.dispatchEvent(new MouseEvent("mouseenter", { clientX: x, clientY: y, bubbles: true }));
  el.dispatchEvent(new MouseEvent("mouseover", { clientX: x, clientY: y, bubbles: true }));

  if (options?.delay) await sleep(options.delay);
}

/** Drag from one element to another */
export async function drag(
  fromSelector: string | HTMLElement,
  toSelector: string | HTMLElement,
  options?: { steps?: number; stepDelay?: number },
): Promise<void> {
  const fromEl = typeof fromSelector === "string"
    ? document.querySelector<HTMLElement>(fromSelector)!
    : fromSelector;
  const toEl = typeof toSelector === "string"
    ? document.querySelector<HTMLElement>(toSelector)!
    : toSelector;

  if (!fromEl || !toEl) throw new Error("Robot.drag: source or target not found");

  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  const startX = fromRect.width / 2 + fromRect.left;
  const startY = fromRect.height / 2 + fromRect.top;
  const endX = toRect.width / 2 + toRect.left;
  const endY = toRect.height / 2 + toRect.top;

  const steps = options?.steps ?? 10;
  const stepDelay = options?.stepDelay ?? 16;

  fromEl.dispatchEvent(new MouseEvent("mousedown", { clientX: startX, clientY: startY, bubbles: true }));

  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const x = startX + (endX - startX) * progress;
    const y = startY + (endY - startY) * progress;
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true }));
    await sleep(stepDelay);
  }

  document.dispatchEvent(new MouseEvent("mouseup", { clientX: endX, clientY: endY, bubbles: true }));
}

// --- Form Auto-Fill ---

/** Fill a form with given values */
export async function fillForm(
  formOrSelector: string | HTMLFormElement,
  fields: Record<string, string>,
  options?: { submit?: boolean; delayBetweenFields?: number },
): Promise<void> {
  const form = typeof formOrSelector === "string"
    ? document.querySelector<HTMLFormElement>(formOrSelector)!
    : formOrSelector;

  if (!form) throw new Error("Robot.fillForm: form not found");

  const delay = options?.delayBetweenFields ?? 100;

  for (const [name, value] of Object.entries(fields)) {
    const field = form.querySelector(`[name="${name}"], #${name}, [id="${name}"]`) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;

    if (!field) continue;

    field.focus();
    field.click();

    if (field instanceof HTMLSelectElement) {
      field.value = value;
      field.dispatchEvent(new Event("change", { bubbles: true }));
    } else if (
      field.type === "checkbox" ||
      field.type === "radio"
    ) {
      (field as HTMLInputElement).checked = value !== "false" && value !== "";
      field.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      await typeText(value, { clearFirst: true, delayPerChar: 10 });
    }

    if (delay > 0) await sleep(delay);
  }

  if (options?.submit) {
    const submitBtn = form.querySelector('[type="submit"]') as HTMLButtonElement | null;
    if (submitBtn) {
      await click(submitBtn);
    } else {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  }
}

// --- Sequence Runner ---

/**
 * Run a sequence of automation steps.
 *
 * @example
 * const results = await runSequence([
 *   { name: "click-login", action: () => click("#login-btn") },
 *   { name: "type-email", action: () => typeText("user@test.com") },
 *   { name: "submit", action: () => click("#submit-btn") },
 * ]);
 */
export async function runSequence(
  steps: Array<{ name: string; action: () => void | Promise<void>; timeoutMs?: number }>,
  options?: RobotOptions & { onStepComplete?: (result: StepResult) => void },
): Promise<StepResult[]> {
  const delay = options?.defaultDelay ?? 100;
  const results: StepResult[] = [];

  for (const step of steps) {
    const start = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      const timeout = step.timeoutMs ?? 5000;
      await Promise.race([
        step.action(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Step "${step.name}" timed out after ${timeout}ms`)), timeout),
      ]);

      if (delay > 0 && steps.indexOf(step) < steps.length - 1) await sleep(delay);
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
    }

    const result: StepResult = {
      step: step.name,
      success,
      durationMs: performance.now() - start,
      error,
    };

    results.push(result);
    options?.onStepComplete?.(result);

    if (!success && !options?.verbose) break; // Stop on failure unless verbose
  }

  return results;
}

// --- Accessibility Helpers ---

/** Get the accessibility tree summary of an element */
export function getA11yTree(el: HTMLElement, depth = 0): A11yNode {
  const role = el.getAttribute("role");
  const label =
    el.getAttribute("aria-label") ||
    el.getAttribute("aria-labelledby")
      ? `[linked]`
      : el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT"
        ? (el as HTMLInputElement).placeholder || (el as HTMLInputElement).name || ""
        : "";

  const children: A11yNode[] = [];
  for (const child of Array.from(el.children)) {
    if (child instanceof HTMLElement) {
      children.push(getA11yTree(child, depth + 1));
    }
  }

  return { role: role ?? el.tagName.toLowerCase(), label, children };
}

interface A11yNode {
  role: string;
  label: string;
  children: A11yNode[];
}

/** Find all interactive elements in order */
export function getInteractiveElements(root: HTMLElement = document.body): InteractiveElementInfo[] {
  const elements: InteractiveElementInfo[] = [];
  const selectors = [
    'a[href]', 'button', '[role="button"]', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
  ];

  for (const sel of selectors) {
    for (const el of root.querySelectorAll<HTMLElement>(sel)) {
      elements.push({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute("role") ?? "",
        label: getAccessibleLabel(el),
        tabIndex: el.tabIndex,
        disabled: el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true",
      });
    }
  }

  return elements.sort((a, b) => (a.tabIndex === b.tabIndex ? 0 : (a.tabIndex ?? 999) - (b.tabIndex ?? 999)));
}

interface InteractiveElementInfo {
  tag: string;
  role: string;
  label: string;
  tabIndex: number;
  disabled: boolean;
}

function getAccessibleLabel(el: HTMLElement): string {
  return (
    el.getAttribute("aria-label") ||
    el.getAttribute("title") ||
    (el.tagName === "INPUT" ? (el as HTMLInputElement).placeholder : "") ||
    (el.tagName === "IMG" ? (el as HTMLImageElement).alt : "") ||
    el.textContent?.slice(0, 80) ?? ""
  );
}

// --- Screenshot Comparison (Basic) ---

/** Take a snapshot of an element's current visual state (text-based) */
export function takeSnapshot(el: HTMLElement): ElementSnapshot {
  return {
    tagName: el.tagName,
    id: el.id,
    className: el.className,
    textContent: el.textContent?.trim() ?? "",
    childCount: el.children.length,
    boundingRect: el.getBoundingClientRect(),
    styles: {
      display: getComputedStyle(el).display,
      visibility: getComputedStyle(el).visibility,
      opacity: getComputedStyle(el).opacity,
    },
  };
}

interface ElementSnapshot {
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  childCount: number;
  boundingRect: DOMRect;
  styles: { display: string; visibility: string; opacity: string };
}

/** Compare two snapshots and return differences */
export function compareSnapshots(a: ElementSnapshot, b: ElementSnapshot): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];

  if (a.textContent !== b.textContent) diffs.push({ property: "textContent", before: a.textContent, after: b.textContent });
  if (a.className !== b.className) diffs.push({ property: "className", before: a.className, after: b.className });
  if (a.childCount !== b.childCount) diffs.push({ property: "childCount", before: String(a.childCount), after: String(b.childCount) });
  if (a.styles.display !== b.styles.display) diffs.push({ property: "display", before: a.styles.display, after: b.styles.display });
  if (a.styles.visibility !== b.styles.visibility) diffs.push({ property: "visibility", before: a.styles.visibility, after: b.styles.visibility });

  return diffs;
}

interface SnapshotDiff {
  property: string;
  before: string;
  after: string;
}

// --- Utility ---

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
