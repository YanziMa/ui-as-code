/**
 * Animation utilities for CSS transitions.
 */

/** Generate CSS transition string */
export function transition(props: {
  property?: string;
  duration?: number;
  easing?: string;
  delay?: number;
}): string {
  const {
    property = "all",
    duration = 200,
    easing = "ease-out",
    delay = 0,
  } = props;
  return `${property} ${duration}ms ${easing} ${delay}ms`;
}

/** Stagger children animation delays */
export function stagger(index: number, baseMs = 50): string {
  return `${index * baseMs}ms`;
}

/** Spring-like animation config for common use cases */
export const springs = {
  quick: { duration: 200, easing: "ease-out" as const },
  smooth: { duration: 300, easing: "ease-out" as const },
  bouncy: { duration: 500, easing: [0.25, 0.46, 0.45, 0.94] as unknown as string },
} as const;

/** Reduced motion media query (for accessibility) */
export const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
