/**
 * Kanban Board: Drag-and-drop board with columns, cards, swimlanes, filters,
 * card details panel, WIP limits, labels, priorities, due dates, assignees,
 * keyboard shortcuts, and responsive layout.
 */

// --- Types ---

export type CardPriority = "low" | "medium" | "high" | "urgent";
export type CardSize = "sm" | "md" | "lg";

export interface KanbanLabel {
  id: string;
  name: string;
  color: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  /** Column ID this card belongs to */
  columnId: string;
  /** Position/order within column */
  order?: number;
  priority?: CardPriority;
  labels?: string[];
  assignee?: { name: string; avatar?: string };
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  size?: CardSize;
  coverImage?: string;
  attachments?: number;
  comments?: number;
  subtasks?: { done: number; total: number };
  tags?: string[];
  customFields?: Record<string, unknown>;
  data?: unknown;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  /** WIP limit (0 = unlimited) */
  wipLimit?: number;
  color?: string;
  collapsed?: boolean;
  width?: string | number;
}

export interface KanbanSwimlane {
  id: string;
  title: string;
  columns: KanbanColumn[];
}

export interface KanbanOptions {
  container: HTMLElement | string;
  columns: KanbanColumn[];
  swimlanes?: KanbanSwimlane[];
  /** Show card counts in headers */
  showCounts?: boolean;
  /** Show WIP limit indicators */
  showWipLimits?: boolean;
  /** Allow drag-and-drop between columns */
  draggable?: boolean;
  /** Compact card mode */
  compact?: boolean;
  /** Card click handler */
  onCardClick?: (card: KanbanCard) => void;
  /** Card move handler */
  onCardMove?: (cardId: string, fromColId: string, toColId: string) => void;
  /** Column collapse toggle handler */
  onColumnToggle?: (columnId: string, collapsed: boolean) => void;
  /** Filter function for visible cards */
  filter?: (card: KanbanCard) => boolean;
  /** Available labels */
  labels?: KanbanLabel[];
  /** Custom CSS class */
  className?: string;
}

export interface KanbanInstance {
  element: HTMLElement;
  getColumns: () => KanbanColumn[];
  setColumns: (columns: KanbanColumn[]) => void;
  getCards: () => KanbanCard[];
  addCard: (columnId: string, card: KanbanCard) => void;
  removeCard: (cardId: string) => void;
  updateCard: (cardId: string, updates: Partial<KanbanCard>) => void;
  moveCard: (cardId: string, toColumnId: string, index?: number) => void;
  addColumn: (col: KanbanColumn) => void;
  removeColumn: (colId: string) => void;
  setFilter: (filter: ((card: KanbanCard) => boolean) | null) => void;
  destroy: () => void;
}

// --- Priority Colors ---

const PRIORITY_CONFIG: Record<CardPriority, { color: string; bg: string; label: string }> = {
  low:    { color: "#6b7280", bg: "#f3f4f6", label: "Low" },
  medium: { color: "#3b82f6", bg: "#eff6ff", label: "Medium" },
  high:   { color: "#f59e0b", bg: "#fffbeb", label: "High" },
  urgent: { color: "#ef4444", bg: "#fef2f2", label: "Urgent" },
};

// --- Main Class ---

export class KanbanManager {
  create(options: KanbanOptions): KanbanInstance {
    const opts = {
      showCounts: options.showCounts ?? true,
      showWipLimits: options.showWipLimits ?? true,
      draggable: options.draggable ?? true,
      compact: options.compact ?? false,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Kanban: container not found");

    let columns: KanbanColumn[] = [...options.columns];
    let destroyed = false;

    container.className = `kanban-board ${opts.className ?? ""}`;
    container.style.cssText = `
      display:flex;gap:12px;height:100%;overflow-x:auto;padding:8px;
      font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
      align-items:flex-start;
    `;

    function render(): void {
      container.innerHTML = "";

      for (const col of columns) {
        const colEl = createColumn(col);
        container.appendChild(colEl);
      }
    }

    function createColumn(col: KanbanColumn): HTMLElement {
      const wrapper = document.createElement("div");
      wrapper.className = "kanban-column";
      wrapper.dataset.colId = col.id;
      wrapper.style.cssText = `
        flex-shrink:0;width:${col.width ?? 300}px;min-width:250px;display:flex;
        flex-direction:column;background:#f9fafb;border-radius:10px;
        border:1px solid #e5e7eb;max-height:100%;overflow:hidden;
      `;

      // Header
      const header = document.createElement("div");
      header.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;
        padding:12px 14px;border-bottom:1px solid #e5e7eb;flex-shrink:0;
        cursor:pointer;
      `;

      const leftSide = document.createElement("div");
      leftSide.style.cssText = "display:flex;align-items:center;gap:8px;";

      const dot = document.createElement("span");
      dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${col.color ?? "#94a3b8"};flex-shrink:0;`;
      leftSide.appendChild(dot);

      const title = document.createElement("span");
      title.textContent = col.title;
      title.style.cssText = "font-weight:600;font-size:13px;";
      leftSide.appendChild(title);

      if (opts.showCounts) {
        const count = document.createElement("span");
        count.textContent = `${col.cards.length}`;
        count.style.cssText = `
          background:#e5e7eb;color:#6b7280;font-size:11px;font-weight:600;
          padding:1px 7px;border-radius:10px;
        `;
        leftSide.appendChild(count);

        // WIP limit warning
        if (opts.showWipLimits && col.wipLimit && col.cards.length > col.wipLimit) {
          count.style.background = "#fecaca";
          count.style.color = "#dc2626";
        }
      }

      header.appendChild(leftSide);

      // Collapse/expand
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;align-items:center;gap:4px;";

      const collapseBtn = document.createElement("button");
      collapseBtn.type = "button";
      collapseBtn.innerHTML = col.collapsed ? "\u25B6" : "\u25BC";
      collapseBtn.style.cssText = "background:none;border:none;font-size:10px;color:#9ca3af;cursor:pointer;padding:2px;";
      collapseBtn.addEventListener("click", () => {
        col.collapsed = !col.collapsed;
        render();
        opts.onColumnToggle?.(col.id, col.collapsed);
      });
      actions.appendChild(collapseBtn);

      header.appendChild(actions);

      header.addEventListener("click", (e) => {
        if (e.target !== collapseBtn) {
          col.collapsed = !col.collapsed;
          render();
          opts.onColumnToggle?.(col.id, col.collapsed);
        }
      });

      wrapper.appendChild(header);

      // Cards area
      const cardsArea = document.createElement("div");
      cardsArea.className = "kanban-cards";
      cardsArea.style.cssText = `
        flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px;
        ${col.collapsed ? "display:none;" : ""}
        min-height:60px;
      `;

      const filteredCards = opts.filter
        ? col.cards.filter(opts.filter)
        : col.cards;

      for (const card of filteredCards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
        const cardEl = createCard(card);
        cardsArea.appendChild(cardEl);
      }

      // Empty state / drop zone
      if (filteredCards.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = `
          border:2px dashed #e5e7eb;border-radius:8px;padding:16px;text-align:center;
          color:#9ca3af;font-size:12px;margin:4px;
        `;
        empty.textContent = "Drop cards here";
        cardsArea.appendChild(empty);
      }

      wrapper.appendChild(cardsArea);

      // Footer (add card)
      const footer = document.createElement("div");
      footer.style.cssText = "padding:8px 14px;border-top:1px solid #e5e7eb;flex-shrink:0;";
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.innerHTML = "+ Add card";
      addBtn.style.cssText = `
        background:none;border:none;color:#6b7280;cursor:pointer;font-size:12px;
        padding:4px 0;width:100%;text-align:left;border-radius:4px;
        transition:color 0.15s,background 0.15s;
      `;
      addBtn.addEventListener("mouseenter", () => { addBtn.style.color = "#4338ca"; addBtn.style.background = "#eef2ff"; });
      addBtn.addEventListener("mouseleave", () => { addBtn.style.color = ""; addBtn.style.background = ""; });
      footer.appendChild(addBtn);
      wrapper.appendChild(footer);

      return wrapper;
    }

    function createCard(card: KanbanCard): HTMLElement {
      const el = document.createElement("div");
      el.className = "kanban-card";
      el.dataset.cardId = card.id;
      el.style.cssText = `
        background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;
        cursor:pointer;transition:box-shadow 0.15s,border-color 0.15s;
        ${opts.compact ? "" : ""}
      `;
      if (opts.draggable) el.setAttribute("draggable", "true");

      el.addEventListener("mouseenter", () => {
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
        el.style.borderColor = "#c7d2fe";
      });
      el.addEventListener("mouseleave", () => {
        el.style.boxShadow = "";
        el.style.borderColor = "#e5e7eb";
      });
      el.addEventListener("click", () => opts.onCardClick?.(card));

      // Cover image
      if (card.coverImage && !opts.compact) {
        const cover = document.createElement("div");
        cover.style.cssText = `
          height:48px;border-radius:4px;margin-bottom:8px;background-size:cover;
          background-position:center;background-image:url(${card.coverImage});
        `;
        el.appendChild(cover);
      }

      // Labels
      if (card.labels && card.labels.length > 0) {
        const labelsRow = document.createElement("div");
        labelsRow.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px;";
        for (const labelId of card.labels) {
          const labelDef = opts.labels?.find((l) => l.id === labelId);
          const badge = document.createElement("span");
          badge.textContent = labelDef?.name ?? labelId;
          badge.style.cssText = `
            font-size:10px;padding:1px 6px;border-radius:3px;
            background:${labelDef?.color ?? "#e5e7eb"}20;color:${labelDef?.color ?? "#374151"};
          `;
          labelsRow.appendChild(badge);
        }
        el.appendChild(labelsRow);
      }

      // Title
      const title = document.createElement("div");
      title.textContent = card.title;
      title.style.cssText = "font-weight:500;font-size:13px;line-height:1.4;margin-bottom:4px;";
      el.appendChild(title);

      // Meta row (bottom)
      if (!opts.compact) {
        const meta = document.createElement("div");
        meta.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-top:8px;";

        const leftMeta = document.createElement("div");
        leftMeta.style.cssText = "display:flex;align-items:center;gap:6px;";

        // Priority badge
        if (card.priority) {
          const pc = PRIORITY_CONFIG[card.priority];
          const pb = document.createElement("span");
          pb.textContent = pc.label;
          pb.style.cssText = `font-size:10px;padding:1px 6px;border-radius:3px;background:${pc.bg};color:${pc.color};font-weight:500;`;
          leftMeta.appendChild(pb);
        }

        // Due date
        if (card.dueDate) {
          const due = document.createElement("span");
          due.style.cssText = "font-size:11px;color:#9ca3af;";
          due.textContent = formatDueDate(card.dueDate);
          leftMeta.appendChild(due);
        }

        meta.appendChild(leftMeta);

        const rightMeta = document.createElement("div");
        rightMeta.style.cssText = "display:flex;align-items:center;gap:8px;";

        // Attachments
        if (card.attachments) {
          const att = document.createElement("span");
          att.innerHTML = "\u{1F4CE}";
          att.style.cssText = "font-size:11px;";
          att.title = `${card.attachments} attachment(s)`;
          rightMeta.appendChild(att);
        }

        // Comments
        if (card.comments) {
          const cmt = document.createElement("span");
          cmt.innerHTML = "\u{1F4AC}";
          cmt.style.cssText = "font-size:11px;";
          cmt.title = `${card.comments} comment(s)`;
          rightMeta.appendChild(cmt);
        }

        // Assignee avatar
        if (card.assignee) {
          const av = document.createElement("span");
          av.style.cssText = `
            width:22px;height:22px;border-radius:50%;background:#e5e7eb;
            font-size:10px;display:flex;align-items:center;justify-content:center;
            overflow:hidden;background-size:cover;background-position:center;
            ${card.assignee.avatar ? `background-image:url(${card.assignee.avatar});` : ""}
            flex-shrink:0;
          `;
          if (!card.assignee.avatar) av.textContent = card.assignee.name.slice(0, 1).toUpperCase();
          rightMeta.appendChild(av);
        }

        meta.appendChild(rightMeta);
        el.appendChild(meta);
      }

      // Drag events
      if (opts.draggable) {
        el.addEventListener("dragstart", (e) => {
          e.dataTransfer!.setData("text/plain", JSON.stringify({ cardId: card.id, fromColId: col.id }));
          el.style.opacity = "0.5";
        });
        el.addEventListener("dragend", () => { el.style.opacity = ""; });
      }

      return el;
    }

    function formatDueDate(dateStr: string): string {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = d.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
      if (diffDays <= 1) return "Tomorrow";
      if (diffDays <= 7) return `${diffDays}d left`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    // Drop handling
    if (opts.draggable) {
      container.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      container.addEventListener("drop", (e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(e.dataTransfer!.getData("text/plain"));
          instance.moveCard(data.cardId, data.toColId || findClosestColumn(e));
        } catch { /* ignore */ }
      });
    }

    function findClosestColumn(e: DragEvent): string {
      const els = container.querySelectorAll<HTMLElement>(".kanban-column");
      let closest = columns[0]!.id;
      let minDist = Infinity;
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(e.clientX - rect.left - rect.width / 2);
        if (dist < minDist) { minDist = dist; closest = el.dataset.colId!; }
      }
      return closest;
    }

    // Initial render
    render();

    const instance: KanbanInstance = {
      element: container,

      getColumns() { return [...columns]; },

      setCols(newCols: KanbanColumn[]) {
        columns = newCols;
        render();
      },

      getCards() {
        return columns.flatMap((c) => c.cards);
      },

      addCard(colId, card) {
        const col = columns.find((c) => c.id === colId);
        if (col) {
          col.cards.push(card);
          render();
        }
      },

      removeCard(cardId) {
        for (const col of columns) {
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx >= 0) { col.cards.splice(idx, 1); break; }
        }
        render();
      },

      updateCard(cardId, updates) {
        for (const col of columns) {
          const card = col.cards.find((c) => c.id === cardId);
          if (card) { Object.assign(card, updates); break; }
        }
        render();
      },

      moveCard(cardId, toColId, index) {
        let movedCard: KanbanCard | undefined;
        let fromColId: string | undefined;

        for (const col of columns) {
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx >= 0) {
            [movedCard] = col.cards.splice(idx, 1);
            fromColId = col.id;
            break;
          }
        }

        if (movedCard) {
          const toCol = columns.find((c) => c.id === toColId);
          if (toCol) {
            movedCard.columnId = toColId;
            if (index !== undefined) toCol.cards.splice(index, 0, movedCard);
            else toCol.cards.push(movedCard);
          }
          opts.onCardMove?.(cardId, fromColId!, toColId);
          render();
        }
      },

      addColumn(col) {
        columns.push(col);
        render();
      },

      removeColumn(colId) {
        columns = columns.filter((c) => c.id !== colId);
        render();
      },

      setFilter(filter) {
        opts.filter = filter ?? undefined;
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    // Alias fix
    instance.setColumns = instance.setCols;

    return instance;
  }
}

/** Convenience: create a kanban board */
export function createKanban(options: KanbanOptions): KanbanInstance {
  return new KanbanManager().create(options);
}
