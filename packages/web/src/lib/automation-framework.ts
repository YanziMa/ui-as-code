/**
 * Automation Framework: Browser automation, UI testing, RPA (Robotic Process Automation),
 * element interaction, screenshot comparison, form filling, data extraction,
 * workflow orchestration, retry strategies, reporting, recorder/playback.
 */

// --- Types ---

export type Selector = string | ((el: Element) => boolean);
export type WaitCondition = () => Promise<boolean> | boolean;

export interface AutomationOptions {
  timeout?: number;           // Default wait timeout (ms)
  interval?: number;          // Polling interval (ms)
  slowMo?: number;            // Delay between actions (ms)
  headless?: boolean;         // Headless mode flag
  viewport?: { width: number; height: number };
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  record?: boolean;           // Record actions for playback
  screenshots?: "on-failure" | "always" | "never";
  video?: boolean;            // Record video of session
}

export interface StepResult {
  success: boolean;
  action: string;
  selector?: string;
  duration: number;
  error?: Error;
  screenshot?: string;
  data?: unknown;
  timestamp: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  action: AutomationAction;
  args: unknown[];
  options?: Partial<StepOptions>;
  skipIf?: () => Promise<boolean> | boolean;
  retry?: number;
  timeout?: number;
  expected?: (result: StepResult) => boolean;
  onFail?: "continue" | "abort" | "retry";
}

export interface StepOptions {
  timeout: number;
  retries: number;
  retryDelay: number;
  screenshot: boolean;
  description: string;
}

export interface ExtractedData {
  field: string;
  value: string | number | boolean | null;
  selector: string;
  confidence: number;
  extractedAt: number;
}

export interface FormFillRule {
  field: Selector;
  value: string | number | boolean | (() => string);
  type?: "text" | "select" | "checkbox" | "radio" | "file" | "date" | "textarea" | "hidden" | "custom";
  clearFirst?: boolean;
  delay?: number;
  validate?: (value: string) => boolean;
  transform?: (value: string) => string;
}

export interface RecordedAction {
  type: ActionType;
  timestamp: number;
  target: {
    tag: string;
    selector: string;
    text?: string;
    attributes?: Record<string, string>;
    rect?: DOMRect;
  };
  data?: unknown;
  pageUrl: string;
}

export type ActionType =
  | "click" | "dblclick" | "rightClick" | "hover" | "focus"
  | "type" | "clear" | "select" | "check" | "uncheck"
  | "scroll" | "drag" | "drop"
  | "navigate" | "back" | "forward" | "refresh"
  | "wait" | "waitForElement" | "waitForText" | "waitForVisible" | "waitForHidden"
  | "screenshot" | "extract" | "assert" | "evaluate"
  | "pressKey" | "uploadFile" | "switchFrame" | "switchTab";

// --- Element Locator ---

class ElementLocator {
  /** Find single element by selector */
  async find(selector: Selector, root: Document | Element = document, timeout = 5000): Promise<Element | null> {
    if (typeof selector === "function") {
      return this.waitFor(() => {
        const els = root.querySelectorAll("*");
        for (let i = 0; i < els.length; i++) {
          if (selector(els[i]!)) return els[i];
        }
        return null;
      }, timeout) as Promise<Element | null>;
    }

    // Try CSS selector first
    try {
      const el = root.querySelector(selector as string);
      if (el) return el;
    } catch {}

    // Try XPath
    try {
      const result = document.evaluate(selector as string, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      if (result.singleNodeValue) return result.singleNodeValue as Element;
    } catch {}

    // Try text content match
    const allElements = root.querySelectorAll("*");
    for (const el of allElements) {
      if (el.textContent?.trim() === selector) return el;
      if (el.getAttribute("data-testid") === selector) return el;
      if (el.getAttribute("aria-label") === selector) return el;
      if (el.getAttribute("placeholder") === selector) return el;
      if (el.id === selector) return el;
    }

    return this.waitFor(async () => {
      try { return root.querySelector(selector as string); } catch { return null; }
    }, timeout) as Promise<Element | null>;
  }

  /** Find all matching elements */
  findAll(selector: Selector, root: Document | Element = document): Element[] {
    if (typeof selector === "function") {
      return Array.from(root.querySelectorAll("*")).filter(selector);
    }
    try {
      return Array.from(root.querySelectorAll(selector as string));
    } catch {
      return [];
    }
  }

  /** Find by role and name */
  findByRole(role: string, name?: string): Element[] {
    const candidates = this.findAll(`[role="${role}"]`);
    if (!name) return candidates;
    return candidates.filter((el) =>
      el.getAttribute("aria-label")?.toLowerCase().includes(name.toLowerCase()) ||
      el.textContent?.trim().toLowerCase().includes(name.toLowerCase())
    );
  }

  /** Find by text content */
  findByText(text: string, exact = false): Element[] {
    const all = document.querySelectorAll("*");
    return Array.from(all).filter((el) => {
      const t = el.childNodes
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent?.trim())
        .join("")
        .trim();
      return exact ? t === text : t.includes(text);
    });
  }

  /** Find by test ID */
  findByTestId(testId: string): Element | null {
    return document.querySelector(`[data-testid="${testId}"]`);
  }

  /** Find visible elements only */
  findVisible(selector: Selector, root: Document | Element = document): Element[] {
    return this.findAll(selector, root).filter((el) => this.isVisible(el));
  }

  private isVisible(el: Element): boolean {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private waitFor(condition: WaitCondition, timeout = 5000, interval = 100): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = async () => {
        try {
          const result = await condition();
          if (result) resolve(result);
          else if (Date.now() - start >= timeout) reject(new Error(`Wait timed out after ${timeout}ms`));
          else setTimeout(check, interval);
        } catch (e) {
          if (Date.now() - start >= timeout) reject(e);
          else setTimeout(check, interval);
        }
      };
      check();
    });
  }
}

// --- Action Executor ---

export class ActionExecutor {
  private locator = new ElementLocator();
  private recordedActions: RecordedAction[] = [];
  private slowMo = 0;
  private defaultTimeout = 10000;
  private screenshotsEnabled = true;

  constructor(options?: Partial<AutomationOptions>) {
    this.slowMo = options?.slowMo ?? 0;
    this.defaultTimeout = options?.timeout ?? 10000;
    this.screenshotsEnabled = options?.screenshots !== "never";
  }

  /** Click an element */
  async click(selector: Selector, options?: { button?: "left" | "middle" | "right"; modifiers?: string[]; count?: number; delay?: number }): Promise<StepResult> {
    const start = Date.now();
    try {
      const el = await this.locator.find(selector, undefined, this.defaultTimeout);
      if (!el) throw new Error(`Element not found: ${selector}`);

      await this.delay(this.slowMo);
      el.click();

      if (options?.count && options.count > 1) {
        for (let i = 1; i < options.count; i++) {
          await this.delay(options.delay ?? 50);
          el.click();
        }
      }

      this.record({ type: "click", target: this.describeTarget(el) });
      return { success: true, action: "click", selector: String(selector), duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: "click", selector: String(selector), duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Type text into an input */
  async type(selector: Selector, text: string, options?: { clearFirst?: boolean; delay?: number }): Promise<StepResult> {
    const start = Date.now();
    try {
      const el = await this.locator.find(selector, undefined, this.defaultTimeout) as HTMLElement;
      if (!el) throw new Error(`Element not found: ${selector}`);

      await this.delay(this.slowMo);

      if (options?.clearFirst ?? true) {
        el.focus();
        el.select?.();
        // Use execCommand or native input clearing
        el.value = "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }

      // Simulate typing character by character
      const charDelay = options?.delay ?? 30;
      for (const char of text) {
        el.value += char;
        el.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent("keypress", { key: char, charCode: char.charCodeAt(0), bubbles: true }));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
        await this.delay(charDelay);
      }

      el.dispatchEvent(new Event("change", { bubbles: true }));

      this.record({ type: "type", target: this.describeTarget(el), data: text });
      return { success: true, action: "type", selector: String(selector), duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: "type", selector: String(selector), duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Hover over an element */
  async hover(selector: Selector): Promise<StepResult> {
    const start = Date.now();
    try {
      const el = await this.locator.find(selector, undefined, this.defaultTimeout) as HTMLElement;
      if (!el) throw new Error(`Element not found: ${selector}`);
      await this.delay(this.slowMo);
      el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
      this.record({ type: "hover", target: this.describeTarget(el) });
      return { success: true, action: "hover", selector: String(selector), duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: "hover", selector: String(selector), duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Select option from dropdown */
  async select(selector: Selector, value: string | string[]): Promise<StepResult> {
    const start = Date.now();
    try {
      const el = await this.locator.find(selector, undefined, this.defaultTimeout) as HTMLSelectElement;
      if (!el) throw new Error(`Select not found: ${selector}`);
      await this.delay(this.slowMo);

      const values = Array.isArray(value) ? value : [value];
      for (const v of values) {
        const option = Array.from(el.options).find((o) => o.value === v || o.text === v);
        if (option) option.selected = true;
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));

      this.record({ type: "select", target: this.describeTarget(el), data: value });
      return { success: true, action: "select", selector: String(selector), duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: "select", selector: String(selector), duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Check/uncheck checkbox */
  async check(selector: Selector, checked = true): Promise<StepResult> {
    const start = Date.now();
    try {
      const el = await this.locator.find(selector, undefined, this.defaultTimeout) as HTMLInputElement;
      if (!el) throw new Error(`Checkbox not found: ${selector}`);
      await this.delay(this.slowMo);
      if (el.checked !== checked) {
        el.click();
      }
      this.record({ type: checked ? "check" : "uncheck", target: this.describeTarget(el) });
      return { success: true, action: checked ? "check" : "uncheck", selector: String(selector), duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: checked ? "check" : "uncheck", selector: String(selector), duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Scroll to element */
  async scroll(selector: Selector, behavior: "auto" | "smooth" = "auto"): Promise<StepResult> {
    const start = Date.now();
    try {
      const el = await this.locator.find(selector, undefined, this.defaultTimeout) as HTMLElement;
      if (!el) throw new Error(`Element not found: ${selector}`);
      el.scrollIntoView({ behavior, block: "center" });
      this.record({ type: "scroll", target: this.describeTarget(el) });
      return { success: true, action: "scroll", selector: String(selector), duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: "scroll", selector: String(selector), duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Drag from one element to another */
  async drag(sourceSelector: Selector, targetSelector: Selector): Promise<StepResult> {
    const start = Date.now();
    try {
      const source = await this.locator.find(sourceSelector, undefined, this.defaultTimeout) as HTMLElement;
      const target = await this.locator.find(targetSelector, undefined, this.defaultTimeout) as HTMLElement;
      if (!source || !target) throw new Error("Source or target element not found");

      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      // Simulate drag events
      source.dispatchEvent(new MouseEvent("mousedown", { clientX: sourceRect.left + sourceRect.width / 2, clientY: sourceRect.top + sourceRect.height / 2, bubbles: true }));
      await this.delay(50);
      source.dispatchEvent(new MouseEvent("mousemove", { clientX: sourceRect.left + sourceRect.width / 2, clientY: sourceRect.top + sourceRect.height / 2, bubbles: true }));
      await this.delay(100);
      target.dispatchEvent(new MouseEvent("mousemove", { clientX: targetRect.left + targetRect.width / 2, clientY: targetRect.top + targetRect.height / 2, bubbles: true }));
      await this.delay(50);
      target.dispatchEvent(new MouseEvent("mouseup", { clientX: targetRect.left + targetRect.width / 2, clientY: targetRect.top + targetRect.height / 2, bubbles: true }));

      this.record({ type: "drag", target: this.describeTarget(source), data: { to: this.describeTarget(target) } });
      return { success: true, action: "drag", selector: `${sourceSelector} -> ${targetSelector}`, duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: "drag", selector: `${sourceSelector} -> ${targetSelector}`, duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Press keyboard key(s) */
  async pressKey(key: string, modifiers: string[] = []): Promise<StepResult> {
    const start = Date.now();
    try {
      await this.delay(this.slowMo);

      // Press modifier keys first
      for (const mod of modifiers) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: mod, bubbles: true }));
      }
      document.dispatchEvent(new KeyboardEvent("keydown", { key, code: this.keyCodeFor(key), bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keypress", { key, charCode: key.charCodeAt(0), bubbles: true }));
      document.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
      for (const mod of [...modifiers].reverse()) {
        document.dispatchEvent(new KeyboardEvent("keyup", { key: mod, bubbles: true }));
      }

      this.record({ type: "pressKey", target: { tag: "document", selector: ":root" }, data: [...modifiers, key] });
      return { success: true, action: "pressKey", selector: key, duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: "pressKey", selector: key, duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Navigate to URL */
  async navigate(url: string): Promise<StepResult> {
    const start = Date.now();
    try {
      location.href = url;
      this.record({ type: "navigate", target: { tag: "window", selector: url }, data: url });
      return { success: true, action: "navigate", selector: url, duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: "navigate", selector: url, duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Wait for condition */
  async waitFor(condition: WaitCondition, timeout?: number, message?: string): Promise<StepResult> {
    const start = Date.now();
    const ms = timeout ?? this.defaultTimeout;
    try {
      const pollInterval = 100;
      await new Promise<void>((resolve, reject) => {
        const check = async () => {
          try {
            const result = await condition();
            if (result) resolve();
            else if (Date.now() - start >= ms) reject(new Error(message ?? `Wait timed out after ${ms}ms`));
            else setTimeout(check, pollInterval);
          } catch (e) {
            if (Date.now() - start >= ms) reject(e);
            else setTimeout(check, pollInterval);
          }
        };
        check();
      });
      return { success: true, action: "waitFor", duration: Date.now() - start, timestamp: start };
    } catch (err) {
      return { success: false, action: "waitFor", duration: Date.now() - start, error: err as Error, timestamp: start };
    }
  }

  /** Wait for element to appear */
  async waitForElement(selector: Selector, timeout?: number): Promise<StepResult> {
    return this.waitFor(
      async () => (await this.locator.find(selector)) !== null,
      timeout,
      `Element not found: ${selector}`
    );
  }

  /** Wait for element to be visible */
  async waitForVisible(selector: Selector, timeout?: number): Promise<StepResult> {
    return this.waitFor(async () => {
      const el = await this.locator.find(selector);
      return el !== null && el.getBoundingClientRect().width > 0;
    }, timeout, `Element not visible: ${selector}`);
  }

  /** Take screenshot */
  async screenshot(selector?: Selector): Promise<string> {
    if (selector) {
      const el = await this.locator.find(selector);
      if (el) {
        // Would use html2canvas or similar in production
        return `[screenshot of ${String(selector)}]`;
      }
    }
    return "[full-page screenshot]";
  }

  /** Execute JavaScript in page context */
  async evaluate<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
    return fn(...args);
  }

  /** Get recorded actions */
  getRecording(): RecordedAction[] { return [...this.recordedActions]; }

  /** Clear recording */
  clearRecording(): void { this.recordedActions.length = 0; }

  /** Export recording as JSON */
  exportRecording(): string { return JSON.stringify(this.recordedActions, null, 2); }

  /** Import and play recording */
  async importAndPlay(recordingJson: string): Promise<StepResult[]> {
    const actions: RecordedAction[] = JSON.parse(recordingJson);
    const results: StepResult[] = [];
    for (const action of actions) {
      const result = await this.playAction(action);
      results.push(result);
      if (!result.success) break;
    }
    return results;
  }

  /** Play a single recorded action */
  async playAction(action: RecordedAction): Promise<StepResult> {
    switch (action.type) {
      case "click": return this.click(action.target.selector);
      case "type": return this.type(action.target.selector, action.data as string);
      case "hover": return this.hover(action.target.selector);
      case "select": return this.select(action.target.selector, action.data as string[]);
      case "scroll": return this.scroll(action.target.selector);
      case "pressKey":
        const keys = (action.data as string[]) ?? [];
        return this.pressKey(keys[keys.length - 1] ?? "", keys.slice(0, -1));
      case "navigate": return this.navigate(action.data as string);
      case "waitForElement": return this.waitForElement(action.target.selector);
      case "waitForVisible": return this.waitForVisible(action.target.selector);
      default:
        return { success: false, action: action.type, duration: 0, error: new Error(`Unknown action type: ${action.type}`), timestamp: Date.now() };
    }
  }

  private record(action: Omit<RecordedAction, "timestamp" | "pageUrl">): void {
    this.recordedActions.push({
      ...action,
      timestamp: Date.now(),
      pageUrl: location.href,
    });
  }

  private describeTarget(el: Element): RecordedAction["target"] {
    return {
      tag: el.tagName.toLowerCase(),
      selector: this.generateSelector(el),
      text: el.textContent?.slice(0, 100),
      attributes: {
        ...(el.id && { id: el.id }),
        ...((el as HTMLElement).className && { class: (el as HTMLElement).className }),
        ...(el.getAttribute("data-testid") && { "data-testid": el.getAttribute("data-testid") }),
        ...(el.getAttribute("aria-label") && { "aria-label": el.getAttribute("aria-label") }),
      },
      rect: el.getBoundingClientRect(),
    };
  }

  private generateSelector(el: Element): string {
    if (el.id) return `#${el.id}`;
    if (el.getAttribute("data-testid")) return `[data-testid="${el.getAttribute("data-testid")}"]`;
    const path: string[] = [];
    let current: Element | null = el;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) { selector = `#${current.id}`; path.unshift(selector); break; }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${idx})`;
        }
      }
      path.unshift(selector);
      current = parent;
    }
    return path.join(" > ");
  }

  private keyCodeFor(key: string): string {
    const map: Record<string, string> = {
      Enter: "Enter", Tab: "Tab", Escape: "Escape", Backspace: "Backspace",
      Delete: "Delete", Space: "Space", ArrowUp: "ArrowUp", ArrowDown: "ArrowDown",
      ArrowLeft: "ArrowLeft", ArrowRight: "ArrowRight", Home: "Home", End: "End",
      PageUp: "PageUp", PageDown: "PageDown", F1: "F1", F2: "F2", F3: "F3",
      F4: "F4", F5: "F5", F6: "F6", F7: "F7", F8: "F8", F9: "F9", F10: "F10",
      F11: "F11", F12: "F12",
    };
    return map[key] ?? `Key${key.toUpperCase()}`;
  }

  private delay(ms: number): Promise<void> {
    return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
  }
}

// --- Data Extractor ---

export class DataExtractor {
  private executor: ActionExecutor;

  constructor(executor?: ActionExecutor) {
    this.executor = executor ?? new ActionExecutor();
  }

  /** Extract text from element */
  async extractText(selector: Selector): Promise<ExtractedData> {
    const el = await this.executor["locator"].find(selector);
    return {
      field: String(selector),
      value: el?.textContent?.trim() ?? null,
      selector: String(selector),
      confidence: el ? 1 : 0,
      extractedAt: Date.now(),
    };
  }

  /** Extract attribute value */
  async extractAttribute(selector: Selector, attr: string): Promise<ExtractedData> {
    const el = await this.executor["locator"].find(selector);
    return {
      field: `${String(selector)}@${attr}`,
      value: el?.getAttribute(attr) ?? null,
      selector: String(selector),
      confidence: el ? 1 : 0,
      extractedAt: Date.now(),
    };
  }

  /** Extract table data */
  async extractTable(tableSelector: Selector): Promise<Record<string, string>[]> {
    const table = await this.executor["locator"].find(tableSelector) as HTMLTableElement | null;
    if (!table) return [];

    const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
    const rows: Record<string, string>[] = [];

    for (const row of table.querySelectorAll("tbody tr")) {
      const cells = Array.from(row.querySelectorAll("td"));
      const rowData: Record<string, string> = {};
      cells.forEach((cell, i) => {
        const header = headers[i] ?? `col_${i}`;
        rowData[header] = cell.textContent?.trim() ?? "";
      });
      rows.push(rowData);
    }

    return rows;
  }

  /** Extract list items */
  async extractList(listSelector: Selector, itemSelector?: Selector): Promise<string[]> {
    const container = await this.executor["locator"].find(listSelector);
    if (!container) return [];

    const itemSel = itemSelector ?? "li";
    return Array.from(container.querySelectorAll(itemSel)).map((item) =>
      item.textContent?.trim() ?? ""
    ).filter(Boolean);
  }

  /** Extract form values */
  async extractForm(formSelector: Selector): Promise<Record<string, string>> {
    const form = await this.executor["locator"].find(formSelector) as HTMLFormElement | null;
    if (!form) return {};

    const data: Record<string, string> = {};
    for (const el of form.elements) {
      const input = el as HTMLInputElement;
      if (input.name) {
        if (input.type === "checkbox" || input.type === "radio") {
          if (input.checked) data[input.name] = input.value ?? "on";
        } else if (input.type === "select-multiple") {
          const select = input as HTMLSelectElement;
          data[input.name] = Array.from(select.selectedOptions).map((o) => o.value).join(",");
        } else {
          data[input.name] = input.value;
        }
      }
    }
    return data;
  }

  /** Extract multiple fields at once using extraction plan */
  async extractBatch(plan: Array<{ field: string; selector: Selector; type?: "text" | "attr"; attr?: string }>): Promise<Record<string, ExtractedData>> {
    const results: Record<string, ExtractedData> = {};
    for (const item of plan) {
      switch (item.type) {
        case "attr":
          results[item.field] = await this.extractAttribute(item.selector, item.attr ?? "value");
          break;
        default:
          results[item.field] = await this.extractText(item.selector);
      }
    }
    return results;
  }

  /** Extract with OCR fallback (stub) */
  async extractWithOCR(_selector: Selector): Promise<ExtractedData> {
    // In production would use Tesseract.js or similar
    return { field: "", value: null, selector: "", confidence: 0, extractedAt: Date.now() };
  }
}

// --- Form Filler ---

export class FormFiller {
  private executor: ActionExecutor;

  constructor(executor?: ActionExecutor) {
    this.executor = executor ?? new ActionExecutor();
  }

  /** Fill a form according to rules */
  async fill(rules: FormFillRule[], options?: { delay?: number; submit?: boolean; submitSelector?: string }): Promise<StepResult[]> {
    const results: StepResult[] = [];
    const delay = options?.delay ?? 100;

    for (const rule of rules) {
      await this.executor["delay"](delay);

      switch (rule.type ?? "text") {
        case "text":
        case "textarea":
          const val = typeof rule.value === "function" ? rule.value() : String(rule.value);
          const transformed = rule.transform ? rule.transform(val) : val;
          results.push(await this.executor.type(rule.field, transformed, { clearFirst: rule.clearFirst ?? true }));
          break;
        case "select":
          results.push(await this.executor.select(rule.field, [String(rule.value)]));
          break;
        case "checkbox":
          results.push(await this.executor.check(rule.field, Boolean(rule.value)));
          break;
        case "radio":
          // Find radio button by value
          const radios = document.querySelectorAll(`${rule.field} input[type="radio"][value="${rule.value}"]`);
          if (radios[0]) results.push(await this.executor.click(radios[0]));
          break;
        case "date":
          results.push(await this.executor.type(rule.field, String(rule.value)));
          break;
        case "hidden":
          const hiddenEl = await this.executor["locator"].find(rule.field) as HTMLInputElement | null;
          if (hiddenEl) hiddenEl.value = String(rule.value);
          break;
        case "custom":
          if (typeof rule.value === "function") (rule.value as Function)();
          break;
      }

      // Validate if validator provided
      if (rule.validate) {
        const el = await this.executor["locator"].find(rule.field) as HTMLInputElement | null;
        if (el && !rule.validate(el.value)) {
          results[results.length - 1] = {
            ...results[results.length - 1]!,
            success: false,
            error: new Error(`Validation failed for field: ${String(rule.field)}`),
          };
        }
      }
    }

    // Submit form if requested
    if (options?.submit) {
      const submitBtn = options.submitSelector
        ? await this.executor["locator"].find(options.submitSelector)
        : document.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) results.push(await this.executor.click(submitBtn));
    }

    return results;
  }

  /** Generate fill rules from a data object (auto-detect fields) */
  autoGenerateRules(data: Record<string, unknown>, formSelector?: string): FormFillRule[] {
    const rules: FormFillRule[] = [];
    const baseSelector = formSelector ?? "form";
    const form = document.querySelector(baseSelector);

    for (const [field, value] of Object.entries(data)) {
      // Try to find the input element
      let selector = `${baseSelector} [name="${field}"]`;
      if (form && !form.querySelector(selector)) {
        selector = `[name="${field}"]`;
      }
      if (!document.querySelector(selector)) {
        // Try label-based lookup
        const label = Array.from(document.querySelectorAll("label")).find((l) =>
          l.textContent?.trim().toLowerCase() === field.toLowerCase() ||
          l.getAttribute("for") === field
        );
        if (label?.getAttribute("for")) {
          selector = `#${label.getAttribute("for")}`;
        }
      }

      rules.push({
        field: selector,
        value: value as string,
        type: this.inferType(value, selector),
      });
    }

    return rules;
  }

  private inferType(value: unknown, _selector: string): FormFillRule["type"] {
    if (typeof value === "boolean") return "checkbox";
    if (Array.isArray(value)) return "select";
    return "text";
  }
}

// --- Workflow Engine ---

export class WorkflowEngine {
  private steps: WorkflowStep[] = [];
  private results: StepResult[] = [];
  private variables = new Map<string, unknown>();
  private executor: ActionExecutor;
  private extractor: DataExtractor;
  private filler: FormFiller;
  private listeners = new Set<(event: WorkflowEvent) => void>();

  constructor(options?: Partial<AutomationOptions>) {
    this.executor = new ActionExecutor(options);
    this.extractor = new DataExtractor(this.executor);
    this.filler = new FormFiller(this.executor);
  }

  /** Add a step to the workflow */
  add(step: Omit<WorkflowStep, "id">): WorkflowEngine {
    this.steps.push({ ...step, id: `step-${this.steps.length + 1}` });
    return this;
  }

  /** Add click step */
  click(selector: string, opts?: Partial<WorkflowStep>): WorkflowEngine {
    return this.add({ name: `Click ${selector}`, action: "click", args: [selector], ...opts });
  }

  /** Add type step */
  type(selector: string, text: string, opts?: Partial<WorkflowStep>): WorkflowEngine {
    return this.add({ name: `Type "${text}" into ${selector}`, action: "type", args: [selector, text], ...opts });
  }

  /** Add navigation step */
  navigate(url: string, opts?: Partial<WorkflowStep>): WorkflowEngine {
    return this.add({ name: `Navigate to ${url}`, action: "navigate", args: [url], ...opts });
  }

  /** Add wait step */
  wait(condition: string, opts?: Partial<WorkflowStep>): WorkflowEngine {
    return this.add({ name: `Wait for ${condition}`, action: "waitForElement", args: [condition], ...opts });
  }

  /** Add extract step */
  extract(field: string, selector: string, opts?: Partial<WorkflowStep>): WorkflowEngine {
    return this.add({ name: `Extract ${field} from ${selector}`, action: "extract", args: [field, selector], ...opts });
  }

  /** Add assert step */
  assert(selector: string, expected: string, opts?: Partial<WorkflowStep>): WorkflowEngine {
    return this.add({ name: `Assert ${selector} == ${expected}`, action: "assert", args: [selector, expected], ...opts });
  }

  /** Set a variable */
  setVariable(name: string, value: unknown): WorkflowEngine {
    this.variables.set(name, value);
    return this;
  }

  /** Get a variable */
  getVariable<T = unknown>(name: string): T | undefined {
    return this.variables.get(name) as T | undefined;
  }

  /** Run the workflow */
  async run(): Promise<{ success: boolean; results: StepResult[]; duration: number }> {
    const startTime = Date.now();
    this.results = [];

    this.emit({ type: "workflow:start", stepCount: this.steps.length });

    for (const step of this.steps) {
      // Check skip condition
      if (step.skipIf && await step.skipIf()) {
        this.emit({ type: "step:skip", stepId: step.id, stepName: step.name });
        continue;
      }

      this.emit({ type: "step:start", stepId: step.id, stepName: step.name });

      let result: StepResult;
      const maxAttempts = (step.retry ?? 0) + 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        result = await this.executeStep(step);

        if (result.success) {
          // Check expected condition
          if (step.expected && !step.expected(result)) {
            result.success = false;
            result.error = new Error("Expected condition not met");
          } else {
            break;
          }
        }

        if (attempt < maxAttempts - 1 && step.onFail !== "abort") {
          const delay = step.options?.retryDelay ?? 1000 * (attempt + 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      this.results.push(result!);
      this.emit({ type: "step:complete", stepId: step.id, stepName: step.name, result: result! });

      if (!result!.success && step.onFail === "abort") {
        this.emit({ type: "workflow:abort", reason: `Step "${step.name}" failed`, lastResult: result! });
        break;
      }
    }

    const allSuccess = this.results.every((r) => r.success);
    this.emit({ type: "workflow:end", success: allSuccess, totalSteps: this.steps.length, completedSteps: this.results.length, duration: Date.now() - startTime });

    return { success: allSuccess, results: this.results, duration: Date.now() - startTime };
  }

  /** Get workflow results */
  getResults(): StepResult[] { return [...this.results]; }

  /** Export workflow as JSON */
  exportWorkflow(): string {
    return JSON.stringify({ steps: this.steps, variables: Object.fromEntries(this.variables) }, null, 2);
  }

  /** Import workflow from JSON */
  importWorkflow(json: string): void {
    const data = JSON.parse(json);
    this.steps = data.steps ?? [];
    if (data.variables) {
      for (const [k, v] of Object.entries(data.variables)) this.variables.set(k, v);
    }
  }

  /** Listen to workflow events */
  onEvent(listener: (event: WorkflowEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Clear workflow */
  clear(): void {
    this.steps = [];
    this.results = [];
    this.variables.clear();
  }

  private async executeStep(step: WorkflowStep): Promise<StepResult> {
    const timeout = step.options?.timeout ?? 10000;

    try {
      switch (step.action) {
        case "click": return await this.executor.click(step.args[0] as string);
        case "type": return await this.executor.type(step.args[0] as string, step.args[1] as string);
        case "hover": return await this.executor.hover(step.args[0] as string);
        case "select": return await this.executor.select(step.args[0] as string, step.args[1] as string | string[]);
        case "check": return await this.executor.check(step.args[0] as string, step.args[1] as boolean);
        case "scroll": return await this.executor.scroll(step.args[0] as string);
        case "drag": return await this.executor.drag(step.args[0] as string, step.args[1] as string);
        case "pressKey": return await this.executor.pressKey(step.args[0] as string, step.args[1] as string[]);
        case "navigate": return await this.executor.navigate(step.args[0] as string);
        case "waitForElement": return await this.executor.waitForElement(step.args[0] as string, timeout);
        case "waitForVisible": return await this.executor.waitForVisible(step.args[0] as string, timeout);
        case "screenshot": {
          const url = await this.executor.screenshot(step.args[0] as string);
          return { success: true, action: "screenshot", data: url, duration: 0, timestamp: Date.now() };
        }
        case "extract": {
          const data = await this.extractor.extractText(step.args[1] as string);
          this.variables.set(step.args[0] as string, data.value);
          return { success: true, action: "extract", data, duration: 0, timestamp: Date.now() };
        }
        case "assert": {
          const el = await this.executor["locator"].find(step.args[0] as string);
          const actual = el?.textContent?.trim() ?? "";
          const passed = actual === step.args[1];
          return { success: passed, action: "assert", data: { actual, expected: step.args[1] }, duration: 0, timestamp: Date.now(), error: passed ? undefined : new Error(`Assertion failed: "${actual}" !== "${step.args[1]}"`) };
        }
        case "fill": {
          const rules = step.args[0] as FormFillRule[];
          const fillResults = await this.filler.fill(rules);
          const allOk = fillResults.every((r) => r.success);
          return { success: allOk, action: "fill", data: fillResults, duration: 0, timestamp: Date.now() };
        }
        case "wait": {
          const ms = typeof step.args[0] === "number" ? step.args[0] : parseInt(String(step.args[0]) ?? "1000");
          await new Promise((r) => setTimeout(r, ms));
          return { success: true, action: "wait", duration: ms, timestamp: Date.now() };
        }
        case "evaluate": {
          const fn = step.args[0] as (...args: any[]) => any;
          const result = await fn(...step.args.slice(1));
          return { success: true, action: "evaluate", data: result, duration: 0, timestamp: Date.now() };
        }
        default:
          return { success: false, action: step.action, duration: 0, error: new Error(`Unknown action: ${step.action}`), timestamp: Date.now() };
      }
    } catch (err) {
      return { success: false, action: step.action, duration: 0, error: err as Error, timestamp: Date.now() };
    }
  }

  private emit(event: WorkflowEvent): void {
    for (const l of this.listeners) l(event);
  }
}

interface WorkflowEvent {
  type: "workflow:start" | "workflow:end" | "workflow:abort" | "step:start" | "step:complete" | "step:skip";
  stepId?: string;
  stepName?: string;
  result?: StepResult;
  reason?: string;
  lastResult?: StepResult;
  stepCount?: number;
  completedSteps?: number;
  success?: boolean;
  duration?: number;
  totalSteps?: number;
}

// --- Assertion Library ---

export class Assertions {
  /** Assert element exists */
  static async exists(selector: Selector, timeout = 5000): Promise<AssertionResult> {
    const locator = new ElementLocator();
    const el = await locator.find(selector, undefined, timeout);
    return { pass: !!el, message: el ? `Element exists: ${selector}` : `Element not found: ${selector}` };
  }

  /** Assert element visibility */
  static async isVisible(selector: Selector, timeout = 5000): Promise<AssertionResult> {
    const locator = new ElementLocator();
    const el = await locator.find(selector, undefined, timeout);
    if (!el) return { pass: false, message: `Element not found: ${selector}` };
    const rect = el.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    return { pass: visible, message: visible ? `Element is visible: ${selector}` : `Element is not visible: ${selector}` };
  }

  /** Assert text content */
  static async hasText(selector: Selector, expected: string, exact = false): Promise<AssertionResult> {
    const locator = new ElementLocator();
    const el = await locator.find(selector);
    if (!el) return { pass: false, message: `Element not found: ${selector}` };
    const actual = el.textContent?.trim() ?? "";
    const pass = exact ? actual === expected : actual.includes(expected);
    return { pass, message: pass ? `Text matches: "${expected}"` : `Expected "${expected}" but got "${actual}"` };
  }

  /** Assert element count */
  static async count(selector: Selector, expected: number): Promise<AssertionResult> {
    const locator = new ElementLocator();
    const elements = locator.findAll(selector);
    const actual = elements.length;
    const pass = actual === expected;
    return { pass, message: pass ? `Count matches: ${expected}` : `Expected ${expected} elements but found ${actual}` };
  }

  /** Assert attribute value */
  static async hasAttribute(selector: Selector, attr: string, expected: string): Promise<AssertionResult> {
    const locator = new ElementLocator();
    const el = await locator.find(selector);
    if (!el) return { pass: false, message: `Element not found: ${selector}` };
    const actual = el.getAttribute(attr) ?? "";
    const pass = actual === expected;
    return { pass, message: pass ? `Attribute "${attr}" = "${expected}"` : `Expected attr "${attr}"="${expected}" but got "${actual}"` };
  }

  /** Assert value */
  static async hasValue(selector: Selector, expected: string): Promise<AssertionResult> {
    const locator = new ElementLocator();
    const el = (await locator.find(selector)) as HTMLInputElement | null;
    if (!el) return { pass: false, message: `Element not found: ${selector}` };
    const pass = el.value === expected;
    return { pass, message: pass ? `Value matches: "${expected}"` : `Expected value "${expected}" but got "${el.value}"` };
  }

  /** Assert URL contains */
  static urlContains(expected: string): AssertionResult {
    const pass = location.href.includes(expected);
    return { pass, message: pass ? `URL contains "${expected}"` : `URL "${location.href}" does not contain "${expected}"` };
  }

  /** Assert title */
  static titleIs(expected: string): AssertionResult {
    const pass = document.title === expected;
    return { pass, message: pass ? `Title is "${expected}"` : `Expected title "${expected}" but got "${document.title}"` };
  }
}

interface AssertionResult {
  pass: boolean;
  message: string;
}

// --- Report Generator ---

export class TestReport {
  private results: StepResult[] = [];
  private metadata: Record<string, unknown> = {};
  private screenshots: Map<string, string> = new Map();
  private startTime = 0;
  private endTime = 0;

  start(): void { this.startTime = Date.now(); }

  end(): void { this.endTime = Date.now(); }

  addResult(result: StepResult): void { this.results.push(result); }

  addMetadata(key: string, value: unknown): void { this.metadata[key] = value; }

  addScreenshot(id: string, dataUrl: string): void { this.screenshots.set(id, dataUrl); }

  /** Generate summary statistics */
  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    duration: number;
    passRate: number;
    failures: Array<{ action: string; error: string }>;
  } {
    const passed = this.results.filter((r) => r.success).length;
    const failed = this.results.filter((r) => !r.success).length;
    return {
      total: this.results.length,
      passed,
      failed,
      duration: this.endTime - this.startTime,
      passRate: this.results.length > 0 ? Math.round((passed / this.results.length) * 10000) / 100 : 0,
      failures: this.results.filter((r) => !r.success).map((r) => ({ action: r.action, error: r.error?.message ?? "Unknown" })),
    };
  }

  /** Export report as JSON */
  toJson(): string {
    return JSON.stringify({
      metadata: this.metadata,
      summary: this.getSummary(),
      results: this.results,
      screenshots: Object.fromEntries(this.screenshots),
      generatedAt: new Date().toISOString(),
    }, null, 2);
  }

  /** Export as JUnit XML format */
  toJUnitXml(): string {
    const summary = this.getSummary();
    const suites = this.results.map((r) =>
      `  <testcase name="${r.action}" classname="automation" time="${(r.duration / 1000).toFixed(3)}">${r.error ? `\n    <failure message="${this.escapeXml(r.error.message)}"/>` : ""}\n  </testcase>`
    ).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="${summary.total}" failures="${summary.failed}" time="${((summary.endTime - this.startTime) / 1000).toFixed(3)}">
  <testsuite name="Automation" tests="${summary.total}" failures="${summary.failed}" time="${((summary.endTime - this.startTime) / 1000).toFixed(3)}">
${suites}
  </testsuite>
</testsuites>`;
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
}
