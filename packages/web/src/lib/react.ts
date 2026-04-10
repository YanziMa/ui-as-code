/**
 * React-specific utility functions.
 */

import type { ReactNode, CSSProperties } from "react";

/** Merge class names conditionally */
export function cn(...classes: (string | false | null | undefined | 0)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Merge React styles */
export function mergeStyles(...styles: (CSSProperties | undefined)[]): CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}

/** Wrap children in a fragment or element */
export function wrapChildren(
  children: ReactNode,
  wrapper?: (children: ReactNode) => ReactNode,
): ReactNode {
  if (!wrapper) return children;
  return wrapper(children);
}

/** Render nothing (for conditional rendering) */
export const Nothing: ReactNode = null;

/** Create a simple event handler that stops propagation */
export function stopPropagation<T extends Event>(handler?: (e: T) => void): (e: T) => void {
  return (e: T) => {
    e.stopPropagation();
    handler?.(e);
  };
}

/** Create a handler that prevents default */
export function preventDefault<T extends Event>(handler?: (e: T) => void): (e: T) => void {
  return (e: T) => {
    e.preventDefault();
    handler?.(e);
  };
}

/** Check if children is empty */
export function isEmptyChildren(children: ReactNode): boolean {
  if (children === undefined || children === null) return true;
  if (Array.isArray(children)) return children.every(isEmptyChildren);
  if (typeof children === "string") return children.trim().length === 0;
  return false;
}

/** Get display name of a component */
export function getDisplayName(component: unknown): string {
  if (typeof component === "function" && component.displayName) return component.displayName;
  if (typeof component === "function" && component.name) return component.name;
  return "Unknown";
}

/** Memo comparison helpers */
export type EqualityFn<T> = (prev: T, next: T) => boolean;

/** Shallow compare two objects by specific keys */
export function shallowCompareBy<T>(keys: (keyof T)[]): EqualityFn<T> {
  return (prev, next) => keys.every((key) => prev[key] === next[key]);
}

/** Compare arrays by length and reference */
export function arrayCompare<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item === b[i]);
}
