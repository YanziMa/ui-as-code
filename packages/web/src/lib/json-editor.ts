/**
 * JSON Editor: Tree-view JSON editor with validation, schema support,
 * path editing, search/filter, collapse/expand, type indicators,
 * and formatted output.
 */

// --- Types ---

export type JsonNodeType = "object" | "array" | "string" | "number" | "boolean" | "null";

export interface JsonNode {
  /** Full JSON path (e.g., "users[0].name") */
  path: string;
  /** Key name (for object properties) or index (for arrays) */
  key: string;
  /** Node value */
  value: unknown;
  /** Node type */
  type: JsonNodeType;
  /** Depth level in tree */
  depth: number;
  /** Expanded? (for objects/arrays) */
  expanded?: boolean;
  /** Children nodes */
  children?: JsonNode[];
}

export interface JsonSchemaProperty {
  type: string | string[];
  description?: string;
  enum?: unknown[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  required?: boolean;
  properties?: Record<string, JsonSchemaProperty>;
  items?: JsonSchemaProperty;
}

export interface JsonEditorOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial JSON value */
  value?: string | object | Array<unknown>;
  /** Read-only mode? */
  readOnly?: boolean;
  /** Show line numbers? */
  showLineNumbers?: boolean;
  /** Show types? */
  showTypes?: boolean;
  /** Show copy buttons on values? */
  showCopyButtons?: boolean;
  /** Allow editing values inline? */
  editable?: boolean;
  /** Max depth to auto-expand (default: 10) */
  maxExpandDepth?: number;
  /** JSON Schema for validation */
  schema?: Record<string, unknown>;
  /** Theme: "light" or "dark" (default: "dark") */
  theme?: "light" | "dark";
  /** Font size in px (default: 13) */
  fontSize?: number;
  /** Tab size for indentation (default: 2) */
  tabSize?: number;
  /** Callback on value change */
  onChange?: (value: unknown, jsonString: string) => void;
  /** Callback on validation error */
  onError?: (errors: string[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface JsonEditorInstance {
  element: HTMLElement;
  getValue: () => unknown;
  getString: () => string;
  setValue: (value: string | object | Array<unknown>) => void;
  format: () => void;
  compress: () => void;
  getSelectedPath: () => string | null;
  find: (query: string) => JsonNode[];
  expandAll: () => void;
  collapseAll: () => void;
  expandPath: (path: string) => void;
  validate: () => { valid: boolean; errors: string[] };
  focus: () => void;
  destroy: () => void;
}

// --- Type Colors & Icons ---

const TYPE_CONFIG: Record<JsonNodeType, { color: string; bg: string; icon: string }> = {
  object:  { color: "#e879f9", bg: "#fdf4ff", icon: "{ }" },
  array:   { color: "#22d3ee", bg: "#ecfeff", icon: "[ ]" },
  string:  { color: "#4ade80", bg: "#f0fdf4", icon: '" "' },
  number:  { color: "#fb923c", bg: "#fff7ed", icon: "#" },
  boolean: { color: "#a78bfa", bg: "#f5f3ff", icon: "T/F" },
  null:    { color: "#9ca3af", bg: "#f9fafb", icon: "nul" },
};

// --- Helpers ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getType(value: unknown): JsonNodeType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as JsonNodeType;
}

function truncate(str: string, maxLen = 80): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "\u2026";
}

function parseJsonSafe(input: string): { value: unknown; error: string | null } {
  try {
    return { value: JSON.parse(input), error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

// --- Main Factory ---

export function createJsonEditor(options: JsonEditorOptions): JsonEditorInstance {
  const opts = {
    readOnly: options.readOnly ?? false,
    showLineNumbers: options.showLineNumbers ?? true,
    showTypes: options.showTypes ?? true,
    showCopyButtons: options.showCopyButtons ?? true,
    editable: options.editable ?? !options.readOnly,
    maxExpandDepth: options.maxExpandDepth ?? 10,
    theme: options.theme ?? "dark",
    fontSize: options.fontSize ?? 13,
    tabSize: options.tabSize ?? 2,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("JsonEditor: container not found");

  const isDark = opts.theme === "dark";
  const colors = isDark
    ? { bg: "#1e1e2e", surface: "#252533", border: "#3a3a4a", text: "#d4d4d8", muted: "#6b7280", accent: "#7c6ff0", hover: "#33334a", error: "#ef4444", success: "#22c55e" }
    : { bg: "#ffffff", surface: "#f9fafb", border: "#e5e7eb", text: "#1f2937", muted: "#9ca3af", accent: "#4338ca", hover: "#f3f4f6", error: "#dc2626", success: "#16a34a" };

  let currentValue: unknown;
  let destroyed = false;
  let selectedPath: string | null = null;
  const expandedPaths = new Set<string>();

  // Parse initial value
  if (typeof options.value === "string") {
    const parsed = parseJsonSafe(options.value);
    currentValue = parsed.value ?? {};
  } else {
    currentValue = options.value ?? {};
  }

  // Root element
  const root = document.createElement("div");
  root.className = `json-editor ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;height:100%;
    background:${colors.bg};color:${colors.text};
    font-family:'Fira Code','Cascadia Code',Consolas,monospace;
    font-size:${opts.fontSize}px;line-height:1.6;border-radius:8px;
    overflow:hidden;border:1px solid ${colors.border};
  `;
  container.appendChild(root);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "je-toolbar";
  toolbar.style.cssText = `
    display:flex;align-items:center;gap:6px;padding:8px 12px;
    background:${colors.surface};border-bottom:1px solid ${colors.border};
    flex-shrink:0;flex-wrap:wrap;
  `;

  const toolbarBtns: Array<{ label: string; action: () => void }> = [
    { label: "Format", action: () => instance.format() },
    { label: "Compress", action: () => instance.compress() },
    { label: "Expand All", action: () => instance.expandAll() },
    { label: "Collapse All", action: () => instance.collapseAll() },
    { label: "Copy", action: () => { navigator.clipboard.writeText(instance.getString()); } },
  ];

  for (const btn of toolbarBtns) {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = btn.label;
    el.style.cssText = `
      padding:4px 10px;border-radius:5px;font-size:11px;font-weight:500;
      border:1px solid ${colors.border};background:transparent;color:${colors.muted};
      cursor:pointer;transition:all 0.15s;
    `;
    el.addEventListener("click", btn.action);
    el.addEventListener("mouseenter", () => { el.style.background = colors.hover; el.style.color = colors.text; });
    el.addEventListener("mouseleave", () => { el.style.background = ""; el.style.color = colors.muted; });
    toolbar.appendChild(el);
  }

  root.appendChild(toolbar);

  // Tree view area
  const treeArea = document.createElement("div");
  treeArea.className = "je-tree-area";
  treeArea.style.cssText = `
    flex:1;overflow:auto;padding:8px 0;
  `;
  root.appendChild(treeArea);

  // Status bar
  const statusBar = document.createElement("div");
  statusBar.className = "je-status";
  statusBar.style.cssText = `
    display:flex;justify-content:space-between;padding:6px 12px;
    font-size:11px;color:${colors.muted};background:${colors.surface};
    border-top:1px solid ${colors.border};flex-shrink:0;
  `;
  root.appendChild(statusBar);

  // --- Tree Building ---

  function buildTree(value: unknown, path = "$", depth = 0): JsonNode {
    const type = getType(value);
    const node: JsonNode = { path, key: path.split(".").pop() ?? path, value, type, depth };

    if ((type === "object" || type === "array") && depth < opts.maxExpandDepth) {
      const isObj = type === "object";
      const entries: [string, unknown][] = isObj
        ? Object.entries(value as Record<string, unknown>)
        : (value as unknown[]).map((v, i) => [String(i), v]);

      node.children = entries.map(([k, v]) =>
        buildTree(v, `${path}${isObj ? "." : "["}${k}${isObj ? "" : "]"}`, depth + 1)
      );

      // Auto-expand first 2 levels
      if (depth < 2) expandedPaths.add(path);
    }

    return node;
  }

  function render(): void {
    treeArea.innerHTML = "";
    const tree = buildTree(currentValue);
    renderNode(tree, 0);
    updateStatusBar();
  }

  function renderNode(node: JsonNode, index: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "je-row";
    row.dataset.path = node.path;
    row.style.cssText = `
      display:flex;align-items:flex-start;gap:4px;padding:1px 12px;
      cursor:pointer;border-left:3px solid transparent;
      transition:background 0.1s;
      ${selectedPath === node.path ? `border-left-color:${colors.accent};background:${isDark ? "#2a2a3c" : "#eef2ff"};` : ""}
    `;

    // Indent
    const indent = document.createElement("span");
    indent.style.cssText = `display:inline-block;width:${node.depth * 20}px;flex-shrink:0;`;
    row.appendChild(indent);

    const tc = TYPE_CONFIG[node.type];

    // Expand/collapse toggle for containers
    if (node.type === "object" || node.type === "array") {
      const isExpanded = expandedPaths.has(node.path);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.textContent = isExpanded ? "\u25BE" : "\u25B8";
      toggle.style.cssText = `
        background:none;border:none;color:${colors.muted};cursor:pointer;
        font-size:10px;padding:0 2px;width:14px;text-align:center;flex-shrink:0;
      `;
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isExpanded) expandedPaths.delete(node.path);
        else expandedPaths.add(node.path);
        render();
      });
      row.appendChild(toggle);
    } else {
      const spacer = document.createElement("span");
      spacer.style.cssText = "width:14px;flex-shrink:0;display:inline-block;";
      row.appendChild(spacer);
    }

    // Key
    const keyEl = document.createElement("span");
    keyEl.className = "je-key";
    keyEl.style.cssText = `color:#fbbf24;font-weight:500;flex-shrink:0;`;
    if (node.key !== "$") {
      keyEl.textContent = `${escapeHtml(node.key)}: `;
    }
    row.appendChild(keyEl);

    // Type badge
    if (opts.showTypes && (node.type === "object" || node.type === "array")) {
      const typeBadge = document.createElement("span");
      typeBadge.style.cssText = `
        font-size:9px;padding:0 4px;border-radius:3px;background:${tc.bg};color:${tc.color};
        margin-right:4px;font-weight:600;
      `;
      typeBadge.textContent = node.type === "object" ? `{${(node.children?.length ?? 0)}}` : `[${node.children?.length ?? 0}]`;
      row.appendChild(typeBadge);
    }

    // Value display
    const valEl = document.createElement("span");
    valEl.className = "je-value";

    if (node.type === "object" || node.type === "array") {
      const isExpanded = expandedPaths.has(node.path);
      valEl.style.cssText = `color:${tc.color};font-weight:500;`;
      valEl.textContent = isExpanded
        ? (node.type === "object" ? "{" : "[")
        : (node.type === "object" ? "{\u2026}" : "[\u2026]");
      row.appendChild(valEl);

      // Render children if expanded
      if (isExpanded && node.children) {
        for (const child of node.children) {
          const childRow = renderNode(child, 0);
          treeArea.appendChild(childRow);
        }
        // Closing brace
        const closeRow = document.createElement("div");
        closeRow.style.cssText = `padding:1px 12px;padding-left:${(node.depth + 1) * 20 + 30}px;color:${tc.color};`;
        closeRow.textContent = node.type === "object" ? "}" : "]";
        treeArea.appendChild(closeRow);
      }
    } else {
      valEl.style.cssText = `color:${tc.color};word-break:break-all;`;

      switch (node.type) {
        case "string":
          valEl.innerHTML = `<span style="color:#4ade80;">"</span>${escapeHtml(truncate(String(node.value)))}<span style="color:#4ade80;">"</span>`;
          break;
        case "number":
          valEl.textContent = String(node.value);
          break;
        case "boolean":
          valEl.style.color = node.value ? colors.success : colors.error;
          valEl.textContent = String(node.value);
          break;
        case "null":
          valEl.style.color = colors.muted;
          valEl.textContent = "null";
          break;
      }

      row.appendChild(valEl);

      // Copy button
      if (opts.showCopyButtons) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.textContent = "\u{1F4CB}";
        copyBtn.title = "Copy value";
        copyBtn.style.cssText = `
          background:none;border:none;cursor:pointer;font-size:11px;opacity:0;
          padding:0 2px;margin-left:4px;transition:opacity 0.15s;color:${colors.muted};
        `;
        copyBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(JSON.stringify(node.value));
          copyBtn.textContent = "\u2713";
          setTimeout(() => { copyBtn.textContent = "\u{1F4CB}"; }, 1000);
        });
        row.addEventListener("mouseenter", () => { copyBtn.style.opacity = "1"; });
        row.addEventListener("mouseleave", () => { copyBtn.style.opacity = "0"; });
        row.appendChild(copyBtn);
      }
    }

    // Click handler
    row.addEventListener("click", () => {
      selectedPath = node.path;
      render();
    });

    // Hover effect
    row.addEventListener("mouseenter", () => {
      if (selectedPath !== node.path) row.style.background = colors.hover;
    });
    row.addEventListener("mouseleave", () => {
      if (selectedPath !== node.path) row.style.background = "";
    });

    return row;
  }

  function updateStatusBar(): void {
    const str = instance.getString();
    const lines = str.split("\n").length;
    const size = new Blob([str]).size;
    const sizeStr = size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB`;
    statusBar.innerHTML = `<span>${lines} lines \u00B7 ${sizeStr}</span><span>JSON</span>`;

    // Validate
    const result = instance.validate();
    if (!result.valid) {
      const errEl = document.createElement("span");
      errEl.style.color = colors.error;
      errEl.textContent = ` \u2717 ${result.errors.length} error(s)`;
      statusBar.appendChild(errEl);
    }
  }

  // --- Search ---

  function findInTree(query: string, node: JsonNode): JsonNode[] {
    const results: JsonNode[] = [];
    const qLower = query.toLowerCase();

    if (node.key.toLowerCase().includes(qLower)) results.push(node);
    if (typeof node.value === "string" && node.value.toLowerCase().includes(qLower)) results.push(node);
    if (node.children) {
      for (const child of node.children) {
        results.push(...findInTree(query, child));
      }
    }

    return results;
  }

  // Initial render
  render();

  const instance: JsonEditorInstance = {
    element: root,

    getValue() { return currentValue; },

    getString() {
      try { return JSON.stringify(currentValue, null, opts.tabSize); }
      catch { return String(currentValue); }
    },

    setValue(value) {
      if (typeof value === "string") {
        const parsed = parseJsonSafe(value);
        if (parsed.error) { opts.onError?.([parsed.error]); return; }
        currentValue = parsed.value;
      } else {
        currentValue = value;
      }
      expandedPaths.clear();
      render();
      opts.onChange?.(currentValue, instance.getString());
    },

    format() {
      const str = typeof currentValue === "string" ? currentValue : JSON.stringify(currentValue);
      const parsed = parseJsonSafe(str);
      if (!parsed.error) currentValue = parsed.value;
      render();
    },

    compress() {
      const str = JSON.stringify(currentValue);
      const parsed = parseJsonSafe(str);
      if (!parsed.error) currentValue = parsed.value;
      render();
    },

    getSelectedPath() { return selectedPath; },

    find(query: string) {
      const tree = buildTree(currentValue);
      return findInTree(query, tree);
    },

    expandAll() {
      function collectPaths(node: JsonNode) {
        if (node.type === "object" || node.type === "array") {
          expandedPaths.add(node.path);
          if (node.children) node.children.forEach(collectPaths);
        }
      }
      collectPaths(buildTree(currentValue));
      render();
    },

    collapseAll() {
      expandedPaths.clear();
      render();
    },

    expandPath(path: string) {
      expandedPaths.add(path);
      render();
    },

    validate() {
      const errors: string[] = [];
      try {
        JSON.stringify(currentValue);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Invalid value");
      }

      // Schema validation (basic)
      if (opts.schema) {
        errors.push(...validateAgainstSchema(currentValue, opts.schema));
      }

      return { valid: errors.length === 0, errors };
    },

    focus() { treeArea.focus(); },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}

// --- Schema Validation Helper ---

function validateAgainstSchema(value: unknown, schema: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const sch = schema as Record<string, unknown>;

  if (sch.type) {
    const expectedTypes = Array.isArray(sch.type) ? sch.type : [sch.type];
    const actualType = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
    if (!expectedTypes.includes(actualType)) {
      errors.push(`Expected type ${expectedTypes.join("|")} but got ${actualType}`);
    }
  }

  if (sch.enum && !sch.enum.includes(value)) {
    errors.push(`Value must be one of: ${(sch.enum as unknown[]).join(", ")}`);
  }

  if (typeof sch.minimum === "number" && typeof value === "number" && value < sch.minimum) {
    errors.push(`Value ${value} is below minimum ${sch.minimum}`);
  }

  if (typeof sch.maximum === "number" && typeof value === "number" && value > sch.maximum) {
    errors.push(`Value ${value} exceeds maximum ${sch.maximum}`);
  }

  return errors;
}
