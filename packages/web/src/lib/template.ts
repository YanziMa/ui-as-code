/**
 * Simple template/string interpolation engine.
 */

/** Render a template string with variables */
export function renderTemplate(
  template: string,
  vars: Record<string, unknown>,
  options?: {
    /** Open delimiter (default: "{{") */
    openDelim?: string;
    /** Close delimiter (default: "}}") */
    closeDelim?: string;
    /** Fallback for missing vars (default: "") */
    fallback?: string;
    /** Auto-escape HTML */
    escapeHtml?: boolean;
  },
): string {
  const { openDelim = "{{", closeDelim = "}}", fallback = "", escapeHtml = false } = options ?? {};

  let result = template;
  const regex = new RegExp(
    `${escapeRegex(openDelim)}\\s*([^}]+?)\\s*${escapeRegex(closeDelim)}`,
    "g",
  );

  result = result.replace(regex, (_, expr) => {
    const trimmed = expr.trim();
    const value = resolvePath(vars, trimmed);
    const str = value !== undefined ? String(value) : fallback;
    return escapeHtml ? escapeHtmlEntities(str) : str;
  });

  return result;
}

/** Resolve a dot-path in an object */
function resolvePath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/** Escape HTML special characters */
function escapeHtmlEntities(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Conditional block rendering */
export interface TemplateBlock {
  condition: string;
  content: string;
  elseContent?: string;
}

/** Parse conditional blocks like {{#if show}}...{{else}}...{{/if}} */
export function parseConditionalBlocks(
  template: string,
  ifTag = "#if",
  elseTag = "else",
  endTag = "/if",
): TemplateBlock[] {
  const blocks: TemplateBlock[] = [];
  // Simplified parsing — find {{#if ...}} ... {{else}} ... {{/if}} patterns
  const ifRegex = new RegExp(`\\{\\{${escapeRegex(ifTag)}\\s+(.+?)\\s*\\}\\}`, "g");
  const elseRegex = new RegExp(`\\{\\{${escapeRegex(elseTag)}\\}\\}`, "g");
  const endRegex = new RegExp(`\\{\\{${escapeRegex(endTag)}\\}\\}`, "g");

  let match: RegExpExecArray | null;
  while ((match = ifRegex.exec(template)) !== null) {
    const condition = match[1].trim();
    const startIf = match.index + match[0].length;

    // Find matching else or end
    const elseMatch = elseRegex.exec(template);
    const endMatch = endRegex.exec(template);

    if (endMatch && endMatch.index > startIf) {
      const hasElse = elseMatch && elseMatch.index > startIf && elseMatch.index < endMatch.index;
      blocks.push({
        condition,
        content: hasElse
          ? template.slice(startIf, elseMatch!.index)
          : template.slice(startIf, endMatch.index),
        elseContent: hasElse ? template.slice(elseMatch!.index + elseMatch![0].length, endMatch.index) : undefined,
      });
    }

    // Reset lastIndex for next search
    ifRegex.lastIndex = 0;
    elseRegex.lastIndex = 0;
    endRegex.lastIndex = 0;
  }

  return blocks;
}

/** Create a reusable template from a string */
export class Template {
  private source: string;
  private delimiters: { open: string; close: string };

  constructor(source: string, delimiters?: { open: string; close: string }) {
    this.source = source;
    this.delimiters = delimiters ?? { open: "{{", close: "}}" };
  }

  render(vars: Record<string, unknown>, options?: Parameters<typeof renderTemplate>[2]): string {
    return renderTemplate(this.source, vars, {
      ...options,
      openDelim: this.delimiters.open,
      closeDelim: this.delimiters.close,
    });
  }

  get raw(): string {
    return this.source;
  }
}
