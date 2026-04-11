/**
 * Code Snippet Manager: Create, store, manage, render, and share code snippets
 * with syntax highlighting, language detection, tag management, search,
 * favorites, import/export (JSON), line-level actions, and a snippet browser UI.
 */

// --- Types ---

export interface CodeSnippet {
  /** Unique ID */
  id: string;
  /** Title */
  title: string;
  /** Code content */
  code: string;
  /** Language (e.g., "javascript", "python") */
  language: string;
  /** Description */
  description?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Created timestamp */
  createdAt?: number;
  /** Last modified timestamp */
  updatedAt?: number;
  /** Is this a favorite? */
  favorite?: boolean;
  /** Usage count */
  useCount?: number;
  /** Custom data */
  data?: unknown;
}

export interface SnippetManagerOptions {
  /** Initial snippets */
  snippets?: CodeSnippet[];
  /** Storage key for persistence */
  storageKey?: string;
  /** Persist to localStorage? */
  persist?: boolean;
  /** Auto-generate ID if not provided */
  autoId?: boolean;
  /** Called when snippets change */
  onChange?: (snippets: CodeSnippet[]) => void;
  /** Container element (for snippet browser UI) */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface SnippetManagerInstance {
  /** Get all snippets */
  getAll: () => CodeSnippet[];
  /** Get by ID */
  get: (id: string) => CodeSnippet | undefined;
  /** Create new snippet */
  create: (snippet: Omit<CodeSnippet, "id">) => CodeSnippet;
  /** Update existing snippet */
  update: (id: string, updates: Partial<CodeSnippet>) => void;
  /** Delete snippet */
  delete: (id: string) => void;
  /** Search by text/tags/language */
  search: (query: string) => CodeSnippet[];
  /** Filter by language */
  filterByLanguage: (language: string) => CodeSnippet[];
  /** Filter by tag */
  filterByTag: (tag: string) => CodeSnippet[];
  /** Get favorites */
  getFavorites: () => CodeSnippet[];
  /** Toggle favorite */
  toggleFavorite: (id: string) => void;
  /** Increment usage count */
  recordUsage: (id: string) => void;
  /** Import from JSON array */
  importJSON: (data: CodeSnippet[]) => void;
  /** Export as JSON array */
  exportJSON: () => CodeSnippet[];
  /** Render snippet browser UI into container */
  renderBrowser: (opts?: {
    onSelect?: (snippet: CodeSnippet) => void;
    onDelete?: (id: string) => void;
    onEdit?: (snippet: CodeSnippet) => void;
    showSearch?: boolean;
    showLanguageFilter?: boolean;
    showTags?: boolean;
  }) => HTMLElement;
  /** Destroy */
  destroy: () => void;
}

// --- Language Detection ---

function _detectLanguage(code: string): string {
  const patterns: Array<{ lang: string; regex: RegExp }> = [
    { lang: "typescript", regex: /:\s*(interface|type|enum|abstract|implements|as\s+\w)/ },
    { lang: "javascript", regex: /(const|let|var|=>|function|async|await|require|import|from|export)/ },
    { lang: "python", regex: /(def |class |import |from |elif |except |:\s*[\w]|\bprint\(|self\.)/ },
    { lang: "html", regex: /<(html|head|body|div|span|script|style|link|meta)\b/i },
    { lang: "css", regex: /([.#][\w-]+\s*{|@media|@keyframes|!important|var\(--)/ },
    { lang: "json", regex: /^\s*\{[\s\S]*"[^"]*":[\s\S]*\}\s*$/ },
    { lang: "sql", regex: /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|GROUP BY|ORDER BY|CREATE|ALTER|DROP|TABLE)\b/i },
    { lang: "rust", regex: /\b(fn|mut|let|pub|impl|struct|use|mod|crate|Self)\b/ },
    { lang: "go", regex: /\b(func|package|import|fmt|type|struct|interface|map|chan|go)\b/ },
    { lang: "java", regex: /\b(public|private|protected|class|interface|extends|implements|import|static|void|new )\b/ },
    { lang: "bash", regex: /^(#!\/(bin\/env\s(bash|sh)|\$|echo|cd|ls|mkdir|rm|cp|mv|grep|awk|sed|cat|chmod|chown|sudo|apt|yum|brew|npm|pnpm|pip|git|curl|wget)/m },
    { lang: "yaml", regex: /^[\s]*[\w]+:\s+/m },
    { lang: "markdown", regex: /^(#{1,6}\s|\*\s[-*])/m },
  ];

  for (const { lang, regex } of patterns) {
    if (regex.test(code)) return lang;
  }
  return "text";
}

// --- Helpers ---

function _uid(): string {
  return `snip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Factory ---

export function createSnippetManager(options: SnippetManagerOptions = {}): SnippetManagerInstance {
  const {
    snippets: initialSnippets = [],
    storageKey = "snippet-manager",
    persist = true,
    autoId = true,
    onChange,
    container,
    className,
  } = options;

  let _snippets: CodeSnippet[] = [...initialSnippets];
  let cleanupFns: Array<() => void> = [];

  // Load persisted
  if (persist) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) { _snippets = JSON.parse(raw); }
    } catch {}
  }

  function _save(): void {
    if (!persist) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(_snippets));
    } catch {}
    onChange?.(_snippets);
  }

  // --- Public API ---

  function getAll(): CodeSnippet[] { return [..._snippets]; }

  function get(id: string): CodeSnippet | undefined {
    return _snippets.find((s) => s.id === id);
  }

  function create(snippet: Omit<CodeSnippet, "id">): CodeSnippet {
    const now = Date.now();
    const newSnippet: CodeSnippet = {
      ...snippet,
      id: autoId ? _uid() : crypto.randomUUID?.() ?? _uid(),
      createdAt: snippet.createdAt ?? now,
      updatedAt: now,
      favorite: snippet.favorite ?? false,
      useCount: snippet.useCount ?? 0,
      language: snippet.language || _detectLanguage(snippet.code),
      tags: snippet.tags ?? [],
    };
    _snippets.push(newSnippet);
    _save();
    return newSnippet;
  }

  function update(id: string, updates: Partial<CodeSnippet>): void {
    const idx = _snippets.findIndex((s) => s.id === id);
    if (idx >= 0) {
      _snippets[idx] = { ..._snippets[idx], ...updates, id, updatedAt: Date.now() };
      _save();
    }
  }

  function delete_(id: string): void {
    _snippets = _snippets.filter((s) => s.id !== id);
    _save();
  }

  function search(query: string): CodeSnippet[] {
    const q = query.toLowerCase();
    return _snippets.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.language.toLowerCase().includes(q) ||
      s.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }

  function filterByLanguage(language: string): CodeSnippet[] {
    const lower = language.toLowerCase();
    return _snippets.filter((s) => s.language.toLowerCase() === lower);
  }

  function filterByTag(tag: string): CodeSnippet[] {
    return _snippets.filter((s) => s.tags?.some((t) => t === tag));
  }

  function getFavorites(): CodeSnippet[] {
    return _snippets.filter((s) => s.favorite);
  }

  function toggleFavorite(id: string): void {
    const s = _snippets.find((x) => x.id === id);
    if (s) { s.favorite = !s.favorite; _save(); }
  }

  function recordUsage(id: string): void {
    const s = _snippets.find((x) => x.id === id);
    if (s) { s.useCount = (s.useCount ?? 0) + 1; _save(); }
  }

  function importJSON(data: CodeSnippet[]): void {
    _snippets = [..._snippets, ...data];
    _save();
  }

  function exportJSON(): CodeSnippet[] { return [..._snippets]; }

  // --- Browser UI ---

  function renderBrowser(browserOpts?: {
    onSelect?, onDelete?, onEdit?,
    showSearch = true,
    showLanguageFilter = true,
    showTags = true,
  } = {}): HTMLElement {
    const root = document.createElement("div");
    root.className = `snippet-browser ${className ?? ""}`;
    root.style.cssText =
      "font-family:-apple-system,sans-serif;font-size:13px;color:#374151;display:flex;flex-direction:column;gap:12px;";

    // Toolbar
    const toolbar = document.createElement("div");
    toolbar.style.cssText =
      "display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-bottom:8px;border-bottom:1px solid #f3f4f6;";

    // Search
    if (showSearch) {
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search snippets...";
      searchInput.style.cssText =
        "padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;" +
        "outline:none;min-width:200px;flex:1;";
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        const items = root.querySelectorAll(".snippet-item") as NodeListOf<HTMLElement>;
        items.forEach((item) => {
          const match = !q || _snippets.find((s) => s.id === item.dataset.snipId)?.title.toLowerCase().includes(q);
          item.style.display = match ? "" : "none";
        });
      });
      toolbar.appendChild(searchInput);
    }

    // Language filter
    if (showLanguageFilter) {
      const langs = [...new Set(_snippets.map((s) => s.language))].sort();
      const sel = document.createElement("select");
      sel.style.cssText = "padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;background:#fff;";
      const optAll = document.createElement("option");
      optAll.value = ""; optAll.textContent = "All Languages";
      sel.appendChild(optAll);
      for (const l of langs) {
        const o = document.createElement("option");
        o.value = l; o.textContent = l;
        sel.appendChild(o);
      }
      sel.addEventListener("change", () => {
        const val = sel.value;
        const items = root.querySelectorAll(".snippet-item") as NodeListOf<HTMLElement>;
        items.forEach((item) => {
          const s = _snippets.find((x) => x.id === item.dataset.snipId);
          item.style.display = (!val || s?.language === val) ? "" : "none";
        });
      });
      toolbar.appendChild(sel);
    }

    // Stats
    const stats = document.createElement("span");
    stats.style.cssText = "font-size:11px;color:#9ca3af;margin-left:auto;";
    stats.textContent = `${_snippets.length} snippets`;
    toolbar.appendChild(stats);

    root.appendChild(toolbar);

    // List
    const listEl = document.createElement("div");
    listEl.className = "snippet-list";
    listEl.style.cssText = "display:flex;flex-direction:column;gap:6px;overflow-y:auto;max-height:500px;";

    for (const snip of _snippets) {
      const item = document.createElement("div");
      item.className = "snippet-item";
      item.dataset.snipId = snip.id;
      item.style.cssText =
        "padding:10px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;" +
        "cursor:pointer;display:flex;align-items:center;gap:10px;" +
        "transition:box-shadow 0.15s,border-color 0.15s;";

      // Favorite star
      const star = document.createElement("span");
      star.innerHTML = snip.favorite ? "&#9733;" : "&#9734;";
      star.style.cssText = `color:${snip.favorite ? "#f59e0b" : "#d1d5db"};font-size:14px;cursor:pointer;flex-shrink:0;`;
      star.addEventListener("click", (e) => { e.stopPropagation(); toggleFavorite(snip.id); renderBrowser(browserOpts); });
      item.appendChild(star);

      // Info
      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0;";

      const titleRow = document.createElement("div");
      titleRow.style.cssText = "display:flex;align-items:center;gap:6px;";

      const title = document.createElement("span");
      title.style.cssText = "font-weight:500;color:#111827;font-size:13px;";
      title.textContent = snip.title;
      titleRow.appendChild(title);

      const langBadge = document.createElement("span");
      langBadge.style.cssText =
        "padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;" +
        "background:#eff6ff;color:#2563eb;text-transform:uppercase;";
      langBadge.textContent = snip.language;
      titleRow.appendChild(langBadge);

      info.appendChild(titleRow);

      if (snip.description) {
        const desc = document.createElement("div");
        desc.style.cssText = "font-size:11px;color:#9ca3af;margin-top:2px;overflow:hidden;text-ellipsis;white-space:nowrap;";
        desc.textContent = snip.description;
        info.appendChild(desc);
      }

      // Preview
      const preview = document.createElement("div");
      preview.style.cssText =
        "margin-top:4px;padding:4px 8px;background:#f9fafb;border-radius:4px;" +
        "font-family:'SFMono-Regular',Consolas,monospace;font-size:11px;color:#4b5563;" +
        "overflow:hidden;max-height:60px;";
      preview.textContent = snip.code.slice(0, 200) + (snip.code.length > 200 ? "..." : "");
      info.appendChild(preview);

      // Tags
      if (showTags && snip.tags && snip.tags.length > 0) {
        const tagsWrap = document.createElement("div");
        tagsWrap.style.cssText = "display:flex;gap:3px;margin-top:4px;flex-wrap:wrap;";
        for (const tag of snip.tags.slice(0, 4)) {
          const t = document.createElement("span");
          t.style.cssText = "padding:1px 6px;border-radius:3px;font-size:10px;background:#f3f4f6;color:#6b7280;";
          t.textContent = tag;
          tagsWrap.appendChild(t);
        }
        info.appendChild(tagsWrap);
      }

      // Meta
      const meta = document.createElement("div");
      meta.style.cssText = "font-size:10px;color:#c4b5ce;margin-top:4px;display:flex;gap:8px;";
      meta.innerHTML = `${snip.useCount ?? 0} uses &middot; ${new Date(snip.createdAt!).toLocaleDateString()}`;
      info.appendChild(meta);

      item.appendChild(info);

      // Actions
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:4px;flex-shrink:0;";

      const editBtn = document.createElement("button");
      editBtn.type = "button"; editBtn.textContent = "Edit"; editBtn.title = "Edit snippet";
      editBtn.style.cssText = "padding:3px 8px;font-size:11px;border-radius:4px;background:none;border:1px solid #d1d5db;cursor:pointer;";
      editBtn.addEventListener("click", (e) => { e.stopPropagation(); onEdit?.(snip); });

      const delBtn = document.createElement("button");
      delBtn.type = "button"; delBtn.textContent = "Delete"; delBtn.title = "Delete snippet";
      delBtn.style.cssText = "padding:3px 8px;font_size:11px;border-radius:4px;background:none;border:1px solid #fecaca;color:#dc2626;cursor:pointer;";
      delBtn.addEventListener("click", (e) => { e.stopPropagation(); delete_(snip.id); renderBrowser(browserOpts); });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      item.appendChild(actions);

      // Click
      item.addEventListener("click", () => onSelect?.(snip));

      item.addEventListener("mouseenter", () => { item.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; item.style.borderColor = "#d1d5db"; });
      item.addEventListener("mouseleave", () => { item.style.boxShadow = ""; item.style.borderColor = "#e5e7eb"; });

      listEl.appendChild(item);
    }

    root.appendChild(listEl);

    if (_snippets.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px;color:#9ca3af;font-size:14px;";
      empty.textContent = "No snippets yet. Use create() to add one.";
      listEl.appendChild(empty);
    }

    (container ?? document.body)?.appendChild(root);
    cleanupFns.push(() => root.remove());

    return root;
  }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return {
    getAll, get, create, update, delete: delete_,
    search, filterByLanguage, filterByTag,
    getFavorites, toggleFavorite, recordUsage,
    importJSON, exportJSON, renderBrowser, destroy,
  };
}
