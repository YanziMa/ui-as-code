/**
 * React Testing Utilities: Component rendering helpers, event simulation,
 * query selectors, async utilities, snapshot helpers, and test
 * convenience functions for React component testing.
 */

// --- Types ---

export interface RenderOptions {
  /** Container element to render into */
  container?: HTMLElement;
  /** Base URL for the test */
  baseURI?: string;
  /** Custom global state overrides */
  globals?: Partial<Window>;
}

export interface RenderResult {
  /** The container element */
  container: HTMLElement;
  /** Root unmount function */
  unmount: () => void;
  /** Query the container */
  querySelector: <E extends Element = Element>(selector: string) => E | null;
  /** Query all matching elements */
  querySelectorAll: <E extends Element = Element>(selector: string) => NodeListOf<E>;
  /** Find by text content */
  getByText: (text: string, options?: { exact?: boolean }) => HTMLElement;
  /** Find by role attribute */
  getByRole: (role: string) => HTMLElement | null;
  /** Find by test ID */
  getByTestId: (testId: string) => HTMLElement | null;
  /** Wait for an element to appear */
  waitFor: (selector: string, timeoutMs?: number) => Promise<HTMLElement>;
  /** Fire a DOM event on the container */
  fire: (element: HTMLElement, event: Event) => boolean;
}

// --- Simple Renderer (No framework dependency) ---

/** Render HTML/JSX-like markup for testing purposes */
export function renderForTest(
  htmlOrElement: string | HTMLElement,
  options: RenderOptions = {},
): RenderResult {
  const container = options.container ?? document.createElement("div");
  if (!options.container) {
    document.body.appendChild(container);
  }

  if (typeof htmlOrElement === "string") {
    container.innerHTML = htmlOrElement;
  } else {
    container.innerHTML = "";
    container.appendChild(htmlOrElement);
  }

  function querySelector<E extends Element = Element>(selector: string): E | null {
    return container.querySelector<E>(selector);
  }

  function querySelectorAll<E extends Element = Element>(selector: string): NodeListOf<E> {
    return container.querySelectorAll<E>(selector);
  }

  function getByText(text: string, opts?: { exact?: boolean }): HTMLElement {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const matches: HTMLElement[] = [];
    let node: Text | null;

    while ((node = walker.nextNode() as Text | null)) {
      const value = node.textContent ?? "";
      if (opts?.exact ? value.trim() === text : value.includes(text)) {
        const parent = node.parentElement;
        if (parent && !matches.includes(parent)) matches.push(parent);
      }
    }

    if (matches.length === 0) throw new Error(`Unable to find element with text: "${text}"`);
    return matches[0]!;
  }

  function getByRole(role: string): HTMLElement | null {
    return container.querySelector(`[role="${role}"]`);
  }

  function getByTestId(testId: string): HTMLElement | null {
    return container.querySelector(`[data-testid="${testId}"]`);
  }

  async function waitFor(selector: string, timeoutMs = 1000): Promise<HTMLElement> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      function check(): void {
        const el = container.querySelector(selector);
        if (el) resolve(el as HTMLElement);
        else if (Date.now() - start > timeoutMs)
          reject(new Error(`Timed out waiting for selector: "${selector}"`));
        else requestAnimationFrame(check);
      }
      check();
    });
  }

  function fire(element: HTMLElement, event: Event): boolean {
    return element.dispatchEvent(event);
  }

  return {
    container,
    unmount(): void {
      if (!options.container) container.remove();
    },
    querySelector,
    querySelectorAll,
    getByText,
    getByRole,
    getByTestId,
    waitFor,
    fire,
  };
}

// --- Event Simulation ---

/** Simulate a click event */
export function simulateClick(element: HTMLElement, options?: { ctrlKey?: boolean; shiftKey?: boolean; metaKey?: boolean }): boolean {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    ...options,
  });
  return element.dispatchEvent(event);
}

/** Simulate keyboard input */
export function simulateKeyDown(
  element: HTMLElement,
  key: string,
  options?: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; metaKey?: boolean },
): boolean {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  return element.dispatchEvent(event);
}

/** Simulate typing text into an input */
export function simulateType(element: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  // Focus first
  element.focus();
  element.value = "";
  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new InputEvent("input", { data: char, bubbles: true }));
  }
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Simulate form submission */
export function simulateSubmit(form: HTMLFormElement): boolean {
  const event = new Event("submit", { bubbles: true, cancelable: true });
  return form.dispatchEvent(event);
}

/** Simulate hover events */
export function simulateHover(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
}

function simulateUnhover(element: HTMLElement): void {
  element.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
}

// --- Assertion Helpers ---

/** Check if element is visible in DOM */
export function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== "none" &&
         style.visibility !== "hidden" &&
         style.opacity !== "0" &&
         element.offsetParent !== null;
}

/** Check if element has specific CSS class */
export function hasClass(element: HTMLElement, className: string): boolean {
  return element.classList.contains(className);
}

/** Get computed style property value */
export function getStyle(element: HTMLElement, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property).trim();
}

/** Assert element exists and return it */
export function expectToExist(selector: string, container: HTMLElement): HTMLElement {
  const el = container.querySelector(selector);
  if (!el) throw new Error(`Expected element "${selector}" to exist but it was not found`);
  return el as HTMLElement;
}

/** Assert text content contains expected string */
export function expectTextContains(element: HTMLElement, expected: string): void {
  const text = element.textContent ?? "";
  if (!text.includes(expected)) {
    throw new Error(`Expected text to contain "${expected}" but got "${text}"`);
  }
}

// --- Async Test Helpers ---

/** Wait for a condition to be true */
export async function waitForCondition(
  condition: () => boolean,
  options?: { timeoutMs?: number; intervalMs?: number },
): Promise<void> {
  const timeout = options?.timeoutMs ?? 2000;
  const interval = options?.intervalMs ?? 50;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    function check(): void {
      if (condition()) resolve();
      else if (Date.now() - start > timeout)
        reject(new Error(`waitForCondition timed out after ${timeout}ms`));
      else setTimeout(check, interval);
    }
    check();
  });
}

/** Wait for async operations to settle (no pending promises) */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Run action and wait for DOM update */
export async function act(callback: () => void | Promise<void>): Promise<void> {
  await callback();
  await flushPromises();
}

// --- Cleanup ---

/** Clean up all rendered test containers */
export function cleanup(): void {
  const containers = document.querySelectorAll("[data-test-container]");
  containers.forEach((c) => c.remove());
}
