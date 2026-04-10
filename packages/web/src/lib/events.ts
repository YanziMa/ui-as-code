/**
 * Custom event bus for cross-component communication.
 * Uses DOM CustomEvent for client-side pub/sub.
 */

type EventMap = {
  "locale-change": { locale: string };
  "notification-read": { notificationId: string };
  "theme-toggle": { theme: "light" | "dark" | "system" };
};

type EventType = keyof EventMap;
type EventDetail<T extends EventType> = EventMap[T];

/** Subscribe to a custom event */
export function on<T extends EventType>(
  event: T,
  handler: (detail: EventDetail<T>) => void,
): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail as EventDetail<T>);
  window.addEventListener(event, listener);
  return () => window.removeEventListener(event, listener);
}

/** Emit a custom event */
export function emit<T extends EventType>(event: T, detail: EventDetail<T>): void {
  window.dispatchEvent(new CustomEvent(event, { detail }));
}
