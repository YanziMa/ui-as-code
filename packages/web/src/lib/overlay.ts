/**
 * Overlay/modal/drawer system with stack management, focus trapping, and animations.
 */

"use client";

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// --- Types ---

export type OverlayType = "modal" | "drawer" | "dialog" | "popover" | "tooltip" | "alert" | "confirm";

export interface OverlayOptions {
  id?: string;
  type?: OverlayType;
  title?: string;
  content: React.ReactNode;
  /** Size preset or custom dimensions */
  size?: "sm" | "md" | "lg" | "xl" | "full" | { width: string; height?: string };
  /** Position for drawer */
  side?: "left" | "right" | "top" | "bottom";
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Close on Escape key */
  closeOnEscape?: boolean;
  /** Show close button */
  showCloseButton?: boolean;
  /** Footer content */
  footer?: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Z-index base */
  zIndex?: number;
  /** Callbacks */
  onOpen?: () => void;
  onClose?: (result?: unknown) => void;
  onConfirm?: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Prevent body scroll when open */
  lockScroll?: boolean;
  /** Focus trap enabled */
  trapFocus?: boolean;
  /** Return focus to trigger element on close */
  returnFocus?: boolean;
}

export interface OverlayInstance {
  id: string;
  open: () => void;
  close: (result?: unknown) => void;
  isOpen: boolean;
  update: (options: Partial<OverlayOptions>) => void;
}

// --- Context ---

const OverlayContext = createContext<OverlayStackManager | null>(null);

// --- Stack Manager ---

class OverlayStackManager {
  private stack: Array<{ id: string; options: OverlayOptions }> = [];
  private listeners = new Set<(stack: Array<{ id: string; options: OverlayOptions }>) => void>();
  private counter = 0;

  open(options: OverlayOptions): OverlayInstance {
    const id = options.id ?? `overlay-${++this.counter}-${Date.now()}`;
    this.stack.push({ id, options });
    this.notify();
    options.onOpen?.();

    return {
      id,
      open: () => {/* already open */},
      close: (result?) => this.close(id, result),
      isOpen: true,
      update: (updates) => {
        const entry = this.stack.find((e) => e.id === id);
        if (entry) Object.assign(entry.options, updates);
        this.notify();
      },
    };
  }

  close(id: string, result?: unknown): void {
    const idx = this.stack.findIndex((e) => e.id === id);
    if (idx < 0) return;

    const entry = this.stack[idx]!;
    this.stack.splice(idx, 1);
    entry.options.onClose?.(result);
    this.notify();
  }

  closeAll(): void {
    while (this.stack.length > 0) {
      const entry = this.stack.pop()!;
      entry.options.onClose?.();
    }
    this.notify();
  }

  getTop(): { id: string; options: OverlayOptions } | null {
    return this.stack[this.stack.length - 1] ?? null;
  }

  getStack(): Array<{ id: string; options: OverlayOptions }> {
    return [...this.stack];
  }

  getCount(): number {
    return this.stack.length;
  }

  subscribe(listener: (stack: Array<{ id: string; options: OverlayOptions }>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(this.getStack()); } catch { /* ignore */ }
    }
  }
}

let globalManager: OverlayStackManager | null = null;

function getGlobalManager(): OverlayStackManager {
  if (!globalManager) globalManager = new OverlayStackManager();
  return globalManager;
}

// --- Components ---

/** Main overlay provider that renders the overlay stack */
export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const manager = getGlobalManager();
  const [stack, setStack] = useState(() => manager.getStack());

  useEffect(() => manager.subscribe(setStack), [manager]);

  const topOverlay = stack[stack.length - 1];

  return (
    <OverlayContext.Provider value={manager}>
      {children}
      {topOverlay && (
        <OverlayRenderer
          key={topOverlay.id}
          id={topOverlay.id}
          options={topOverlay.options}
          onClose={(r) => manager.close(topOverlay.id, r)}
        />
      )}
    </OverlayContext.Provider>
  );
}

/** Internal renderer component */
function OverlayRenderer({
  id,
  options,
  onClose,
}: {
  id: string;
  options: OverlayOptions;
  onClose: (result?: unknown) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevActiveElement = useRef<HTMLElement | null>(null);
  const duration = options.animationDuration ?? 200;

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    setAnimating(true);

    // Save focus
    prevActiveElement.current = document.activeElement as HTMLElement;

    // Lock scroll
    if (options.lockScroll !== false) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      setVisible(false);
      document.body.style.overflow = "";
      // Return focus
      if (options.returnFocus !== false && prevActiveElement.current) {
        prevActiveElement.current.focus();
      }
    };
  }, []);

  const handleClose = useCallback(
    (result?: unknown) => {
      setVisible(false);
      setTimeout(() => onClose(result), duration);
    },
    [onClose, duration],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (options.closeOnEscape !== false && e.key === "Escape") {
        handleClose();
      }

      // Focus trap
      if (options.trapFocus !== false && e.key === "Tab" && contentRef.current) {
        trapTabKey(e, contentRef.current);
      }
    },
    [handleClose, options],
  );

  const handleOverlayClick = useCallback(() => {
    if (options.closeOnOverlayClick !== false) handleClose();
  }, [handleClose, options.closeOnOverlayClick]);

  // Size classes
  const sizeClasses: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-full mx-4",
  };

  const sizeClass =
    typeof options.size === "string"
      ? sizeClasses[options.size] ?? "max-w-md"
      : undefined;

  const customStyle =
    typeof options.size === "object"
      ? { width: options.size.width, ...(options.size.height ? { height: options.size.height } : {}) }
      : undefined;

  // Type-specific rendering
  const isDrawer = options.type === "drawer";
  const side = options.side ?? "right";

  const slideClasses: Record<string, string> = {
    right: visible ? "translate-x-0" : "translate-x-full",
    left: visible ? "translate-x-0" : "-translate-x-full",
    bottom: visible ? "translate-y-0" : "translate-y-full",
    top: visible ? "translate-y-0" : "-translate-y-full",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-${duration}`}
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* Content */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={options.title}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className={`
          relative z-10 bg-white dark:bg-gray-900 rounded-xl shadow-2xl
          transition-all duration-${duration} ease-out
          ${isDrawer
            ? `h-full ${slideClasses[side]}`
            : `w-full ${sizeClass ?? ""} max-h-[85vh] overflow-auto ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`
          }
          ${options.className ?? ""}
        `}
        style={customStyle}
      >
        {/* Header */}
        {(options.title || options.showCloseButton !== false) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            {options.title && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {options.title}
              </h2>
            )}
            {options.showCloseButton !== false && (
              <button
                onClick={() => handleClose()}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-4">{options.content}</div>

        {/* Footer */}
        {options.footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            {options.footer}
          </div>
        )}

        {/* Default action buttons for dialog/confirm types */}
        {(options.type === "dialog" || options.type === "confirm") && !options.footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleClose()}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              {options.cancelLabel ?? "Cancel"}
            </button>
            {options.type === "confirm" && (
              <button
                onClick={async () => {
                  await options.onConfirm?.();
                  handleClose("confirmed");
                }}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                {options.confirmLabel ?? "Confirm"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Quick Open Helpers ---

/** Open a modal programmatically */
export function openModal(options: Omit<OverlayOptions, "type">): OverlayInstance {
  return getGlobalManager().open({ ...options, type: "modal" });
}

/** Open a drawer */
export function openDrawer(
  options: Omit<OverlayOptions, "type"> & { side?: "left" | "right" | "top" | "bottom" },
): OverlayInstance {
  return getGlobalManager().open({ ...options, type: "drawer" });
}

/** Open a confirmation dialog */
export function openConfirm(
  message: React.ReactNode,
  onConfirm?: () => void | Promise<void>,
  title = "Confirm Action",
): OverlayInstance {
  return getGlobalManager().open({
    type: "confirm",
    title,
    content: typeof message === "string" ? <p>{message}</p> : message,
    onConfirm,
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
  });
}

/** Open an alert dialog */
export function openAlert(message: React.ReactNode, title = "Notice"): OverlayInstance {
  return getGlobalManager().open({
    type: "alert",
    title,
    content: typeof message === "string" ? <p>{message}</p> : message,
  });
}

/** Close all overlays */
export function closeAllOverlays(): void {
  getGlobalManager().closeAll();
}

// --- Focus Trap Helper ---

function trapTabKey(event: React.KeyboardEvent, container: HTMLElement): void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];

  if (!first || !last) return;

  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
