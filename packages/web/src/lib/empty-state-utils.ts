/**
 * Empty State Utilities: Empty state displays with illustrations, actions,
 * and messaging for lists, search results, errors, and more.
 */

// --- Types ---

export type EmptyStateType = "empty" | "no-results" | "no-data" | "error" | "offline" | "unauthorized" | "coming-soon";

export interface EmptyStateOptions {
  /** Type of empty state */
  type?: EmptyStateType;
  /** Main heading/title */
  title: string;
  /** Description text */
  description?: string;
  /** Illustration/icon (HTML string, SVG, or emoji) */
  illustration?: string;
  /** Primary action button config */
  primaryAction?: { label: string; onClick: () => void };
  /** Secondary action button config */
  secondaryAction?: { label: string; onClick: () => void };
  /** Size variant ("compact" or default) */
  compact?: boolean;
  /** Max width (px) */
  maxWidth?: number;
  /** Center in container? */
  centered?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

// --- Default Messages by Type ---

const DEFAULT_MESSAGES: Record<EmptyStateType, { title: string; description: string; icon: string }> = {
  "empty": { title: "No items yet", description: "Get started by adding your first item.", icon: "&#128203;" },
  "no-results": { title: "No results found", description: "Try adjusting your search or filter criteria.", icon: "&#128269;" },
  "no-data": { title: "No data available", description: "There's no data to display at this time.", icon: "&#128202;" },
  "error": { title: "Something went wrong", description: "An error occurred while loading this content.", icon: "&#9888;" },
  "offline": { title: "You're offline", description: "Check your internet connection and try again.", icon: "&#128267;" },
  "unauthorized": { title: "Access denied", description: "You don't have permission to view this content.", icon: "&#128274;" },
  "coming-soon": { title: "Coming soon", description: "This feature is not available yet. Stay tuned!", icon: "&#128640;" },
};

// --- Core Factory ---

/**
 * Create an empty state component.
 *
 * @example
 * ```ts
 * const empty = createEmptyState({
 *   type: "no-results",
 *   title: "No users found",
 *   description: "Try a different search term.",
 *   primaryAction: { label: "Clear filters", onClick: () => clearFilters() },
 * });
 * ```
 */
export function createEmptyState(options: EmptyStateOptions): HTMLElement {
  const {
    type = "empty",
    title,
    description,
    illustration,
    primaryAction,
    secondaryAction,
    compact = false,
    maxWidth = 420,
    centered = true,
    className,
    container,
  } = options;

  const defaults = DEFAULT_MESSAGES[type];
  const displayTitle = title || defaults.title;
  const displayDesc = description || defaults.description;
  const displayIcon = illustration || defaults.icon;

  // Root
  const root = document.createElement("div");
  root.className = `empty-state ${type} ${compact ? "compact" : ""} ${className ?? ""}`.trim();
  root.style.cssText =
    (centered ? "display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px 20px;" :
      "display:block;padding:24px 20px;") +
    `max-width:${maxWidth}px;`;

  // Icon / Illustration
  if (displayIcon) {
    const iconEl = document.createElement("div");
    iconEl.className = "empty-state-icon";
    iconEl.innerHTML = displayIcon;
    iconEl.style.cssText =
      `font-size:${compact ? "36px" : "56px"};line-height:1;margin-bottom:${compact ? "12px" : "16px"};` +
      "opacity:0.7;";
    root.appendChild(iconEl);
  }

  // Title
  const titleEl = document.createElement("h3");
  titleEl.className = "empty-state-title";
  titleEl.textContent = displayTitle;
  titleEl.style.cssText =
    `font-size:${compact ? "15px" : "18px"};font-weight:600;color:#111827;margin:0 0 ${description ? "6px" : "0"} 0;line-height:1.3;`;
  root.appendChild(titleEl);

  // Description
  if (displayDesc) {
    const descEl = document.createElement("p");
    descEl.className = "empty-state-description";
    descEl.textContent = displayDesc;
    descEl.style.cssText =
      `font-size:${compact ? "13px" : "14px"};color:#6b7280;margin:0 0 ${primaryAction || secondaryAction ? "20px" : "0"} 0;` +
      "max-width:360px;line-height:1.5;";
    root.appendChild(descEl);
  }

  // Actions
  if (primaryAction || secondaryAction) {
    const actionsEl = document.createElement("div");
    actionsEl.className = "empty-state-actions";
    actionsEl.style.cssText =
      "display:flex;gap:10px;justify-content:center;align-items:center;flex-wrap:wrap;";

    if (secondaryAction) {
      actionsEl.appendChild(_createBtn(secondaryAction.label, secondaryAction.onClick, false));
    }
    if (primaryAction) {
      actionsEl.appendChild(_createBtn(primaryAction.label, primaryAction.onClick, true));
    }

    root.appendChild(actionsEl);
  }

  // ARIA
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");

  if (container) container.appendChild(root);

  return root;
}

function _createBtn(label: string, onClick: () => void, primary: boolean): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.style.cssText =
    "display:inline-flex;align-items:center;padding:8px 18px;border-radius:8px;" +
    "font-size:14px;font-weight:500;cursor:pointer;transition:all 0.15s;" +
    "border:none;line-height:1;" +
    (primary
      ? "background:#3b82f6;color:#fff;"
      : "background:#fff;color:#374151;border:1px solid #d1d5db;");

  btn.addEventListener("click", onClick);

  if (primary) {
    btn.addEventListener("mouseenter", () => { btn.style.background = "#2563eb"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "#3b82f6"; });
  } else {
    btn.addEventListener("mouseenter", () => { btn.style.background = "#f9fafb"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
  }

  return btn;
}
