/**
 * Keyboard shortcut definitions and utilities.
 */

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  category: string;
  handler?: () => void;
}

/** App-wide keyboard shortcuts registry */
export const SHORTCUTS: Omit<Shortcut, "handler">[] = [
  // Navigation
  { key: "g", shift: true, description: "Go to Dashboard", category: "Navigation" },
  { key: "k", ctrl: true, description: "Open Search", category: "Navigation" },
  { key: "/", description: "Open Search", category: "Navigation" },
  { key: "g", alt: true, description: "Go to Frictions", category: "Navigation" },

  // Actions
  { key: "n", description: "New Friction", category: "Actions" },
  { key: "d", ctrl: true, description: "Duplicate current item", category: "Actions" },
  { key: "Enter", ctrl: true, description: "Submit form", category: "Actions" },
  { key: "s", ctrl: true, description: "Save", category: "Actions" },

  // View
  { key: "b", ctrl: true, description: "Toggle sidebar", category: "View" },
  { key: "[", ctrl: true, description: "Toggle dark mode", category: "View" },
  { key: "?", shift: true, description: "Show shortcuts help", category: "View" },

  // Misc
  { key: "Escape", description: "Close modal/dialog", category: "Global" },
];

/** Format shortcut for display (e.g., "Ctrl+K") */
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.meta) parts.push("Cmd");
  if (shortcut.alt) parts.push("Alt");
  if (shortcut.shift) parts.push("Shift");
  parts.push(shortcut.key === " " ? "Space" : shortcut.key);
  return parts.join("+");
}

/** Check if event matches a shortcut definition */
export function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    !!event.ctrlKey === !!shortcut.ctrl &&
    !!event.shiftKey === !!shortcut.shift &&
    !!event.altKey === !!shortcut.alt &&
    !!event.metaKey === !!shortcut.meta
  );
}

/** Get shortcuts by category */
export function getShortcutsByCategory(): Record<string, Omit<Shortcut, "handler">[]> {
  return SHORTCUTS.reduce((groups, s) => {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
    return groups;
  }, {} as Record<string, Omit<Shortcut, "handler">[]>);
}
