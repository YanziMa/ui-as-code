/**
 * Text processing and transformation utilities.
 */

/** Convert text to title case (capitalize each word) */
export function toTitleCase(text: string): string {
  return text.replace(
    /\w\S*/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
}

/** Convert to sentence case (first letter capitalized, rest lowercase) */
export function toSentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** Convert to kebab-case (lowercase with hyphens) */
export function toKebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/** Convert to snake_case */
export function toSnakeCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/** Convert to camelCase */
export function toCamelCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-_\s]+(\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toLowerCase());
}

/** Convert to PascalCase */
export function toPascalCase(text: string): string {
  const camel = toCamelCase(text);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/** Truncate text to max length with ellipsis */
export function truncateText(text: string, maxLength: number, suffix = "..."): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/** Word wrap text at a given width */
export function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length <= maxWidth) {
      currentLine += word;
    } else {
      if (currentLine) lines.push(currentLine.trimEnd());
      currentLine = word.trimStart();
    }
  }

  if (currentLine) lines.push(currentLine.trimEnd());
  return lines;
}

/** Remove all whitespace from a string */
export function removeWhitespace(text: string): string {
  return text.replace(/\s+/g, "");
}

/** Normalize whitespace (collapse multiple spaces, trim) */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Reverse a string (handles Unicode correctly) */
export function reverseString(text: string): string {
  return [...text].reverse().join("");
}

/** Count words in text */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Count characters (excluding spaces optionally) */
export function countChars(text: string, excludeSpaces = false): number {
  return excludeSpaces ? text.replace(/\s/g, "").length : text.length;
}

/** Estimate reading time in minutes */
export function estimateReadingTime(text: string, wpm = 200): string {
  const words = countWords(text);
  const minutes = Math.ceil(words / wpm);
  return `${minutes} min read`;
}

/** Extract initials from a name (e.g., "Alex Chen" → "AC") */
export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .slice(0, maxLength)
    .join("")
    .toUpperCase();
}

/** Generate a slug from text (URL-safe) */
export function slugifyText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip ANSI escape codes from text */
export function stripAnsiCodes(text: string): string {
  return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");
}

/** Detect if text appears to be HTML */
export function isHtml(text: string): boolean {
  return /<[\w/][^>]*>/.test(text);
}

/** Extract plain text from simple HTML (strip tags) */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/** Pad text on left or right */
export function padText(text: string, length: number, char = " ", side: "left" | "right" = "left"): string {
  if (text.length >= length) return text;
  const padding = char.repeat(length - text.length);
  return side === "left" ? padding + text : text + padding;
}

/** Repeat text N times */
export function repeatText(text: string, times: number): string {
  return text.repeat(Math.max(0, times));
}
