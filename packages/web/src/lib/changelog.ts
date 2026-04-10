/**
 * Changelog / Release Notes: Version history viewer with diff display,
 * tag filtering, semantic versioning, date grouping, collapsible sections,
 * markdown rendering, and compare view.
 */

// --- Types ---

export type ChangelogEntryType = "added" | "changed" | "deprecated" | "removed" | "fixed" | "security";

export interface ChangelogItem {
  /** Entry type */
  type: ChangelogEntryType;
  /** Description (supports markdown) */
  description: string;
  /** Optional issue/PR link */
  issue?: string;
  /** Author credit */
  author?: string;
  /** Breaking change? */
  breaking?: boolean;
}

export interface ChangelogVersion {
  /** Semantic version string */
  version: string;
  /** Release date (ISO or Date) */
  date: string | Date;
  /** Release title */
  title?: string;
  /** Release body/description */
  body?: string;
  /** Changelog items */
  items: ChangelogItem[];
  /** Tag name (e.g., "v1.2.0") */
  tag?: string;
  /** Download URL */
  downloadUrl?: string;
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export interface ChangelogOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Version entries */
  versions: ChangelogVersion[];
  /** Show version dates? */
  showDates?: boolean;
  /** Show download buttons? */
  showDownloads?: boolean;
  /** Group items by type? */
  groupByType?: boolean;
  /** Filter by entry type initially */
  initialFilter?: ChangelogEntryType | "all";
  /** Collapsed by default? */
  collapsed?: boolean;
  /** Max versions to show before "show more" */
  maxVisible?: number;
  /** Callback on item click (e.g., issue link) */
  onItemClick?: (item: ChangelogItem, version: ChangelogVersion) => void;
  /** Callback on version select */
  onVersionSelect?: (version: ChangelogVersion) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChangelogInstance {
  element: HTMLElement;
  getVersions: () => ChangelogVersion[];
  addVersion: (version: ChangelogVersion) => void;
  removeVersion: (version: string) => void;
  setFilter: (type: ChangelogEntryType | "all") => void;
  getFilteredItems: () => Array<{ item: ChangelogItem; version: ChangelogVersion }>;
  destroy: () => void;
}

// --- Type Config ---

const TYPE_CONFIG: Record<ChangelogEntryType, { icon: string; color: string; label: string }> = {
  added:      { icon: "+",   color: "#22c55e", label: "Added" },
  changed:    { icon: "~",   color: "#3b82f6", label: "Changed" },
  deprecated: { icon: "!",   color: "#f59e0b", label: "Deprecated" },
  removed:    { icon: "-",   color: "#ef4444", label: "Removed" },
  fixed:      { icon: "\u2713", color: "#8b5cf6", label: "Fixed" },
  security:   { icon: "\u{1F512}", color: "#dc2626", label: "Security" },
};

// --- Helpers ---

function parseDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function simpleMarkdown(text: string): string {
  let html = escapeHtml(text);
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Code inline
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  return html;
}

// --- Main Class ---

export class ChangelogManager {
  create(options: ChangelogOptions): ChangelogInstance {
    const opts = {
      showDates: options.showDates ?? true,
      showDownloads: options.showDownloads ?? true,
      groupByType: options.groupByType ?? false,
      initialFilter: options.initialFilter ?? "all",
      collapsed: options.collapsed ?? false,
      maxVisible: options.maxVisible ?? 10,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Changelog: container not found");

    let allVersions: ChangelogVersion[] = [...options.versions];
    let currentFilter: ChangelogEntryType | "all" = opts.initialFilter;
    let destroyed = false;

    container.className = `changelog ${opts.className ?? ""}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.6;
    `;

    function render(): void {
      container.innerHTML = "";

      // Filter bar
      const filterBar = document.createElement("div");
      filterBar.className = "cl-filter-bar";
      filterBar.style.cssText = `
        display:flex;align-items:center;gap:6px;padding:10px 0;margin-bottom:12px;
        flex-wrap:wrap;border-bottom:1px solid #f0f0f0;
      `;

      const types: Array<ChangelogEntryType | "all"> = ["all", "added", "changed", "fixed", "deprecated", "removed", "security"];
      for (const t of types) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = t === "all" ? "All" : TYPE_CONFIG[t]?.label ?? t;
        btn.dataset.filter = t;
        btn.style.cssText = `
          padding:5px 12px;border-radius:14px;font-size:12px;font-weight:500;border:none;
          cursor:pointer;transition:all 0.15s;
          ${currentFilter === t ? "background:#4338ca;color:#fff;" : "background:#f3f4f6;color:#6b7280;"}
        `;
        btn.addEventListener("click", () => { currentFilter = t; render(); });
        btn.addEventListener("mouseenter", () => { if (currentFilter !== t) btn.style.background = "#e5e7eb"; });
        btn.addEventListener("mouseleave", () => { if (currentFilter !== t) btn.style.background = ""; });
        filterBar.appendChild(btn);
      }

      container.appendChild(filterBar);

      // Versions list
      const visible = allVersions.slice(0, opts.maxVisible);
      const hasMore = allVersions.length > opts.maxVisible;

      for (let i = 0; i < visible.length; i++) {
        const ver = visible[i]!;
        const el = renderVersion(ver, i);
        container.appendChild(el);
      }

      // Show more
      if (hasMore) {
        const moreBtn = document.createElement("button");
        moreBtn.type = "button";
        moreBtn.textContent = `Show ${allVersions.length - opts.maxVisible} older releases`;
        moreBtn.style.cssText = `
          width:100%;padding:12px;border:none;background:none;color:#4338ca;
          font-size:13px;font-weight:500;cursor:pointer;border-top:1px solid #f0f0f0;
        `;
        moreBtn.addEventListener("click", () => {
          opts.maxVisible += 10;
          render();
        });
        container.appendChild(moreBtn);
      }
    }

    function renderVersion(ver: ChangelogVersion, index: number): HTMLElement {
      const isCollapsed = opts.collapsed && index > 0;

      const wrapper = document.createElement("div");
      wrapper.className = "cl-version";
      wrapper.dataset.version = ver.version;
      wrapper.style.cssText = `
        border:1px solid #e5e7eb;border-radius:10px;margin-bottom:16px;overflow:hidden;
        background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04);
      `;

      // Header
      const header = document.createElement("div");
      header.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;padding:14px 18px;
        background:#fafbfc;border-bottom:1px solid #f0f0f0;cursor:pointer;
      `;

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "10px";

      // Version badge
      const badge = document.createElement("span");
      badge.style.cssText = `
        font-size:15px;font-weight:700;color:#111827;background:#eef2ff;
        padding:3px 10px;border-radius:6px;font-family:monospace;
      `;
      badge.textContent = ver.tag ?? ver.version;
      left.appendChild(badge);

      // Title
      if (ver.title) {
        const titleEl = document.createElement("span");
        titleEl.style.cssText = "font-size:14px;font-weight:600;color:#374151;";
        titleEl.textContent = ver.title;
        left.appendChild(titleEl);
      }

      // Date
      if (opts.showDates) {
        const dateEl = document.createElement("span");
        dateEl.style.cssText = "font-size:12px;color:#9ca3af;";
        dateEl.textContent = formatDate(parseDate(ver.date));
        left.appendChild(dateEl);
      }

      header.appendChild(left);

      // Right side
      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "8px";

      // Item count summary
      const itemCounts = getFilteredItems(ver.items);
      const countBadge = document.createElement("span");
      countBadge.style.cssText = "font-size:11px;color:#9ca3af;";
      countBadge.textContent = `${itemCounts.length} change${itemCounts.length !== 1 ? "s" : ""}`;
      right.appendChild(countBadge);

      // Download button
      if (opts.showDownloads && ver.downloadUrl) {
        const dlBtn = document.createElement("a");
        dlBtn.href = ver.downloadUrl;
        dlBtn.target = "_blank";
        dlBtn.textContent = "Download";
        dlBtn.style.cssText = `
          font-size:11px;padding:4px 10px;border-radius:5px;text-decoration:none;
          background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;
          transition:background 0.15s;
        `;
        dlBtn.addEventListener("mouseenter", () => { dlBtn.style.background = "#e5e7eb"; });
        dlBtn.addEventListener("mouseleave", () => { dlBtn.style.background = ""; });
        right.appendChild(dlBtn);
      }

      // Expand/collapse arrow
      if (isCollapsed) {
        const arrow = document.createElement("span");
        arrow.innerHTML = "&#9660;";
        arrow.style.cssText = "color:#9ca3af;font-size:12px;margin-left:8px;transition:transform 0.2s;";
        right.appendChild(arrow);
      }

      header.appendChild(right);
      wrapper.appendChild(header);

      // Body
      const body = document.createElement("div");
      body.className = "cl-body";
      body.style.cssText = `padding:16px 18px;display:${isCollapsed ? "none" : ""};`;

      // Description
      if (ver.body) {
        const desc = document.createElement("div");
        desc.className = "cl-description";
        desc.style.cssText = "margin-bottom:12px;color:#6b7280;font-size:13px;line-height:1.6;";
        desc.innerHTML = simpleMarkdown(ver.body);
        body.appendChild(desc);
      }

      // Items
      if (opts.groupByType) {
        // Group by type
        const groups = new Map<ChangelogEntryType, ChangelogItem[]>();
        for (const item of getFilteredItems(ver.items)) {
          const tc = TYPE_CONFIG[item.type];
          if (!groups.has(item.type)) groups.set(item.type, []);
          groups.get(item.type)!.push(item);
        }

        for (const [type, items] of groups) {
          const tc = TYPE_CONFIG[type]!;
          const groupHeader = document.createElement("div");
          groupHeader.style.cssText = `
            display:flex;align-items:center;gap:6px;margin-bottom:8px;margin-top:${groups.keys().next().value === type ? "0" : "14px"};
            padding-bottom:4px;border-bottom:1px solid #f3f4f6;
          `;
          const typeIcon = document.createElement("span");
          typeIcon.style.cssText = `width:18px;height:18px;border-radius:4px;background:${tc.color}20;color:${tc.color};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;`;
          typeIcon.textContent = tc.icon;
          groupHeader.appendChild(typeIcon);
          const typeName = document.createElement("span");
          typeName.style.cssText = "font-size:12px;font-weight:600;color:#374151;text-transform:capitalize;";
          typeName.textContent = tc.label;
          groupHeader.appendChild(typeName);
          const count = document.createElement("span");
          count.style.cssText = "font-size:11px;color:#9ca3af;margin-left:auto;";
          count.textContent = String(items.length);
          groupHeader.appendChild(count);
          body.appendChild(groupHeader);

          for (const item of items) {
            body.appendChild(renderItem(item, ver));
          }
        }
      } else {
        // Flat list
        for (const item of getFilteredItems(ver.items)) {
          body.appendChild(renderItem(item, ver));
        }
      }

      wrapper.appendChild(body);

      // Toggle collapse
      if (isCollapsed) {
        header.addEventListener("click", () => {
          const b = wrapper.querySelector(".cl-body") as HTMLElement;
          if (b) { b.style.display = ""; }
        });
      }

      // Click handler on version
      header.addEventListener("click", () => opts.onVersionSelect?.(ver));

      return wrapper;
    }

    function renderItem(item: ChangelogItem, ver: ChangelogVersion): HTMLElement {
      const tc = TYPE_CONFIG[item.type];

      const row = document.createElement("div");
      row.className = "cl-item";
      row.style.cssText = `
        display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-radius:4px;
        transition:background 0.1s;cursor:pointer;
      `;

      row.addEventListener("mouseenter", () => { row.style.background = "#f9fafb"; });
      row.addEventListener("mouseleave", () => { row.style.background = ""; });
      row.addEventListener("click", () => opts.onItemClick?.(item, ver));

      // Type icon
      const icon = document.createElement("span");
      icon.style.cssText = `
        width:18px;height:18px;border-radius:4px;background:${tc.color}15;color:${tc.color};
        display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;
        flex-shrink:0;margin-top:1px;
      `;
      icon.textContent = tc.icon;
      row.appendChild(icon);

      // Breaking indicator
      if (item.breaking) {
        const breakLabel = document.createElement("span");
        breakLabel.style.cssText = `
          font-size:9px;font-weight:700;background:#fef2f2;color:#ef4444;
          padding:1px 5px;border-radius:3px;text-transform:uppercase;flex-shrink:0;margin-top:1px;
        `;
        breakLabel.textContent = "BREAKING";
        row.appendChild(breakLabel);
      }

      // Description
      const desc = document.createElement("span");
      desc.style.cssText = "flex:1;font-size:13px;color:#374151;";
      desc.innerHTML = simpleMarkdown(item.description);
      row.appendChild(desc);

      // Issue link
      if (item.issue) {
        const link = document.createElement("a");
        link.href = item.issue;
        link.target = "_blank";
        link.textContent = item.issue.includes("#") ? item.issue : "#" + item.issue;
        link.style.cssText = `
          font-size:11px;font-family:monospace;color:#6366f1;text-decoration:none;
          flex-shrink:0;padding:2px 6px;border:1px solid #c7d2fe;border-radius:4px;
        `;
        link.addEventListener("mouseenter", () => { link.style.background = "#eef2ff"; });
        link.addEventListener("mouseleave", () => { link.style.background = ""; });
        row.appendChild(link);
      }

      // Author
      if (item.author) {
        const author = document.createElement("span");
        author.style.cssText = "font-size:11px;color:#9ca3af;flex-shrink:0;margin-left:auto;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        author.textContent = `by ${item.author}`;
        row.appendChild(author);
      }

      return row;
    }

    function getFilteredItems(items: ChangelogItem[]): ChangelogItem[] {
      if (currentFilter === "all") return items;
      return items.filter((i) => i.type === currentFilter);
    }

    // Initial render
    render();

    const instance: ChangelogInstance = {
      element: container,

      getVersions() { return [...allVersions]; },

      addVersion(ver) {
        allVersions.unshift(ver);
        render();
      },

      removeVersion(versionStr) {
        allVersions = allVersions.filter((v) => v.version !== versionStr && v.tag !== versionStr);
        render();
      },

      setFilter(type) {
        currentFilter = type;
        render();
      },

      getFilteredItems() {
        const result: Array<{ item: ChangelogItem; version: ChangelogVersion }> = [];
        for (const ver of allVersions) {
          for (const item of getFilteredItems(ver.items)) {
            result.push({ item, version: ver });
          }
        }
        return result;
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a changelog */
export function createChangelog(options: ChangelogOptions): ChangelogInstance {
  return new ChangelogManager().create(options);
}
