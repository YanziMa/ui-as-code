/**
 * Kanban Board: Drag-and-drop Kanban board with columns, cards,
 * swimlanes, filters, WIP limits, card detail view, and persistence.
 */

// --- Types ---

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  /** Column ID this card belongs to */
  columnId: string;
  /** Optional swimlane grouping */
  swimlane?: string;
  /** Priority indicator */
  priority?: "low" | "medium" | "high" | "critical";
  /** Tags/labels */
  tags?: string[];
  /** Assignee name/avatar */
  assignee?: string;
  /** Due date (ISO string) */
  dueDate?: string;
  /** Custom color for card header */
  color?: string;
  /** Card order within column */
  order?: number;
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export interface KanbanColumn {
  id: string;
  title: string;
  /** Work-in-progress limit (0 = unlimited) */
  wipLimit?: number;
  /** Column color accent */
  color?: string;
  /** Icon/emoji */
  icon?: string;
  /** Is this a done/completed column? */
  isDone?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface KanbanBoardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: KanbanColumn[];
  /** Initial cards */
  cards?: KanbanCard[];
  /** Show swimlanes? */
  showSwimlanes?: boolean;
  /** Show card counts per column? */
  showCounts?: boolean;
  /** Show WIP limit indicators? */
  showWipLimits?: boolean;
  /** Allow drag-and-drop between columns? */
  draggable?: boolean;
  /** Allow adding new cards inline? */
  allowAddCards?: boolean;
  /** Show filters bar? */
  showFilters?: boolean;
  /** Compact mode? */
  compact?: boolean;
  /** Card click handler */
  onCardClick?: (card: KanbanCard) => void;
  /** Callback when card moves between columns */
  onCardMove?: (cardId: string, fromColumn: string, toColumn: string) => void;
  /** Callback when card is added */
  onCardAdd?: (card: KanbanCard) => void;
  /** Callback when card is deleted */
  onCardDelete?: (cardId: string) => void;
  /** Persist state to localStorage key? */
  persistKey?: string;
  /** Custom render function for each card */
  renderCard?: (card: KanbanCard) => HTMLElement | string;
  /** Custom CSS class */
  className?: string;
}

export interface KanbanBoardInstance {
  element: HTMLElement;
  getCards: () => KanbanCard[];
  getColumns: () => KanbanColumn[];
  addCard: (card: KanbanCard) => void;
  updateCard: (id: string, updates: Partial<KanbanCard>) => void;
  removeCard: (id: string) => void;
  moveCard: (cardId: string, toColumnId: string) => void;
  addColumn: (column: KanbanColumn) => void;
  removeColumn: (columnId: string) => void;
  filterByTag: (tag: string | null) => void;
  filterByAssignee: (assignee: string | null) => void;
  clearFilters: () => void;
  destroy: () => void;
}

// --- Helpers ---

function generateId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "#9ca3af",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

// --- Main Factory ---

export function createKanbanBoard(options: KanbanBoardOptions): KanbanBoardInstance {
  const opts = {
    cards: options.cards ?? [],
    showSwimlanes: options.showSwimlanes ?? false,
    showCounts: options.showCounts ?? true,
    showWipLimits: options.showWipLimits ?? true,
    draggable: options.draggable ?? true,
    allowAddCards: options.allowAddCards ?? true,
    showFilters: options.showFilters ?? false,
    compact: options.compact ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("KanbanBoard: container not found");

  let allCards = [...opts.cards];
  let destroyed = false;
  let activeTagFilter: string | null = null;
  let activeAssigneeFilter: string | null = null;
  let draggedCardId: string | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `kanban-board ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;height:100%;
    font-family:-apple-system,sans-serif;color:#374151;overflow:hidden;
  `;
  container.appendChild(root);

  // Filters bar
  if (opts.showFilters) {
    const filterBar = document.createElement("div");
    filterBar.className = "kb-filters";
    filterBar.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:8px 12px;
      background:#f9fafb;border-bottom:1px solid #e5e7eb;flex-shrink:0;
      flex-wrap:wrap;
    `;

    const tagLabel = document.createElement("span");
    tagLabel.textContent = "Filter by tag:";
    tagLabel.style.cssText = "font-size:12px;color:#6b7280;";
    filterBar.appendChild(tagLabel);

    const tagSelect = document.createElement("select");
    tagSelect.style.cssText = `
      padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;background:#fff;
    `;
    tagSelect.innerHTML = '<option value="">All tags</option>';
    // Collect unique tags
    const allTags = [...new Set(allCards.flatMap((c) => c.tags ?? []))];
    for (const tag of allTags) {
      const opt = document.createElement("option");
      opt.value = tag;
      opt.textContent = tag;
      tagSelect.appendChild(opt);
    }
    tagSelect.addEventListener("change", () => {
      instance.filterByTag(tagSelect.value || null);
    });
    filterBar.appendChild(tagSelect);

    root.appendChild(filterBar);
  }

  // Columns container
  const boardEl = document.createElement("div");
  boardEl.className = "kb-board";
  boardEl.style.cssText = `
    display:flex;gap:12px;padding:16px;overflow-x:auto;flex:1;min-height:0;
    align-items:flex-start;
  `;
  root.appendChild(boardEl);

  function getFilteredCards(): KanbanCard[] {
    return allCards.filter((c) => {
      if (activeTagFilter && !(c.tags ?? []).includes(activeTagFilter)) return false;
      if (activeAssigneeFilter && c.assignee !== activeAssigneeFilter) return false;
      return true;
    });
  }

  function getColumnCards(columnId: string): KanbanCard[] {
    return getFilteredCards()
      .filter((c) => c.columnId === columnId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  function render(): void {
    boardEl.innerHTML = "";

    for (const col of opts.columns) {
      const colEl = renderColumn(col);
      boardEl.appendChild(colEl);
    }
  }

  function renderColumn(col: KanbanColumn): HTMLElement {
    const cards = getColumnCards(col.id);
    const wipLimit = col.wipLimit ?? 0;
    const overLimit = wipLimit > 0 && cards.length > wipLimit;

    const el = document.createElement("div");
    el.className = `kb-column ${col.className ?? ""}`;
    el.dataset.columnId = col.id;
    el.style.cssText = `
      flex:1;min-width:${opts.compact ? 200 : 260}px;max-width:360px;
      background:#f9fafb;border-radius:10px;display:flex;flex-direction:column;
      border:1px solid #e5e7eb;overflow:hidden;flex-shrink:0;height:fit-content;
      max-height:100%;
    `;

    // Column header
    const header = document.createElement("div");
    header.className = "kb-column-header";
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:10px 14px;border-bottom:1px solid #e5e7eb;flex-shrink:0;
    `;

    const leftSide = document.createElement("div");
    leftSide.style.display = "flex";
    leftSide.style.alignItems = "center";
    leftSide.style.gap = "6px";

    if (col.icon) {
      const icon = document.createElement("span");
      icon.textContent = col.icon;
      icon.style.fontSize = "14px";
      leftSide.appendChild(icon);
    }

    const title = document.createElement("span");
    title.style.cssText = `font-weight:600;font-size:13px;color:#111827;${col.color ? `color:${col.color};` : ""}`;
    title.textContent = col.title;
    leftSide.appendChild(title);

    if (opts.showCounts || (opts.showWipLimits && wipLimit > 0)) {
      const countBadge = document.createElement("span");
      countBadge.style.cssText = `
        font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;
        background:${overLimit ? "#fef2f2" : "#f3f4f6"};color:${overLimit ? "#ef4444" : "#6b7280"};
      `;
      countBadge.textContent = `${cards.length}${wipLimit > 0 ? `/${wipLimit}` : ""}`;
      leftSide.appendChild(countBadge);
    }

    header.appendChild(leftSide);

    // Add card button
    if (opts.allowAddCards) {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.innerHTML = "+";
      addBtn.title = "Add card";
      addBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:18px;color:#9ca3af;
        padding:2px 6px;border-radius:4px;line-height:1;
      `;
      addBtn.addEventListener("click", () => handleAddCard(col.id));
      addBtn.addEventListener("mouseenter", () => { addBtn.style.background = "#f3f4f6"; });
      addBtn.addEventListener("mouseleave", () => { addBtn.style.background = ""; });
      header.appendChild(addBtn);
    }

    el.appendChild(header);

    // Cards area
    const cardsArea = document.createElement("div");
    cardsArea.className = "kb-cards-area";
    cardsArea.dataset.columnId = col.id;
    cardsArea.style.cssText = `
      flex:1;padding:8px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;
      min-height:60px;${overLimit ? "background:#fef2f2;" : ""}
    `;

    // Drop zone events
    if (opts.draggable) {
      cardsArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        cardsArea.style.background = "#eef2ff";
        cardsArea.style.outline = "2px dashed #4338ca";
        cardsArea.style.outlineOffset = "-2px";
      });

      cardsArea.addEventListener("dragleave", () => {
        cardsArea.style.background = "";
        cardsArea.style.outline = "";
      });

      cardsArea.addEventListener("drop", (e) => {
        e.preventDefault();
        cardsArea.style.background = "";
        cardsArea.style.outline = "";
        if (draggedCardId) {
          instance.moveCard(draggedCardId, col.id);
          draggedCardId = null;
        }
      });
    }

    // Render cards
    for (const card of cards) {
      const cardEl = renderCard(card);
      cardsArea.appendChild(cardEl);
    }

    // Empty state
    if (cards.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = `
        text-align:center;padding:20px 12px;color:#d1d5db;font-size:12px;
      `;
      empty.textContent = opts.allowAddCards ? "Drop cards here or click +" : "No cards";
      cardsArea.appendChild(empty);
    }

    el.appendChild(cardsArea);
    return el;
  }

  function renderCard(card: KanbanCard): HTMLElement {
    const el = document.createElement("div");
    el.className = "kb-card";
    el.dataset.cardId = card.id;
    el.style.cssText = `
      background:#fff;border-radius:8px;padding:10px 12px;border:1px solid #e5e7eb;
      cursor:pointer;transition:all 0.15s;position:relative;
      ${opts.compact ? "padding:6px 8px;" : ""}
    `;

    // Priority indicator (left border)
    if (card.priority) {
      el.style.borderLeftColor = PRIORITY_COLORS[card.priority] ?? "#d1d5db";
      el.style.borderLeftWidth = "3px";
    }

    // Custom color
    if (card.color) {
      el.style.borderTop = `3px solid ${card.color}`;
    }

    // Drag attributes
    if (opts.draggable) {
      el.draggable = true;
      el.addEventListener("dragstart", (e) => {
        draggedCardId = card.id;
        el.style.opacity = "0.5";
        e.dataTransfer!.effectAllowed = "move";
      });
      el.addEventListener("dragend", () => {
        el.style.opacity = "";
        draggedCardId = null;
      });
    }

    // Use custom renderer or default
    if (opts.renderCard) {
      const custom = opts.renderCard(card);
      if (typeof custom === "string") el.innerHTML = custom;
      else el.appendChild(custom);
    } else {
      // Default card rendering
      // Title
      const title = document.createElement("div");
      title.style.cssText = `font-weight:500;font-size:${opts.compact ? 11 : 13}px;color:#111827;margin-bottom:4px;line-height:1.3;`;
      title.textContent = card.title;
      el.appendChild(title);

      // Tags
      if (card.tags && card.tags.length > 0) {
        const tagsRow = document.createElement("div");
        tagsRow.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px;";
        for (const tag of card.tags.slice(0, 3)) {
          const tagEl = document.createElement("span");
          tagEl.style.cssText = `
            font-size:10px;padding:1px 6px;border-radius:99px;background:#eef2ff;color:#4338ca;
            white-space:nowrap;
          `;
          tagEl.textContent = tag;
          tagsRow.appendChild(tagEl);
        }
        if (card.tags.length > 3) {
          const more = document.createElement("span");
          more.style.cssText = "font-size:10px;color:#9ca3af;";
          more.textContent = `+${card.tags.length - 3}`;
          tagsRow.appendChild(more);
        }
        el.appendChild(tagsRow);
      }

      // Meta row (assignee + due date)
      if (!opts.compact && (card.assignee || card.dueDate)) {
        const meta = document.createElement("div");
        meta.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-top:6px;";

        if (card.assignee) {
          const avatar = document.createElement("span");
          avatar.style.cssText = `
            width:22px;height:22px;border-radius:50%;background:#e5e7eb;display:inline-flex;
            align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#6b7280;
          `;
          avatar.textContent = card.assignee.charAt(0).toUpperCase();
          avatar.title = card.assignee;
          meta.appendChild(avatar);
        }

        if (card.dueDate) {
          const due = document.createElement("span");
          due.style.cssText = "font-size:11px;color:#9ca3af;";
          const d = new Date(card.dueDate);
          const overdue = d < new Date() && !colIsDone(card.columnId);
          due.textContent = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (overdue) due.style.color = "#ef4444";
          meta.appendChild(due);
        }

        el.appendChild(meta);
      }
    }

    // Click handler
    el.addEventListener("click", () => opts.onCardClick?.(card));

    // Hover effect
    el.addEventListener("mouseenter", () => { el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; });
    el.addEventListener("mouseleave", () => { el.style.boxShadow = ""; });

    return el;
  }

  function colIsDone(columnId: string): boolean {
    return opts.columns.find((c) => c.id === columnId)?.isDone ?? false;
  }

  function handleAddCard(columnId: string): void {
    const title = prompt("Enter card title:");
    if (!title?.trim()) return;

    const newCard: KanbanCard = {
      id: generateId(),
      title: title.trim(),
      columnId,
      order: getColumnCards(columnId).length,
    };

    allCards.push(newCard);
    opts.onCardAdd?.(newCard);
    saveState();
    render();
  }

  function saveState(): void {
    if (opts.persistKey) {
      try {
        localStorage.setItem(opts.persistKey, JSON.stringify(allCards));
      } catch {}
    }
  }

  function loadState(): void {
    if (opts.persistKey) {
      try {
        const saved = localStorage.getItem(opts.persistKey);
        if (saved) allCards = JSON.parse(saved);
      } catch {}
    }
  }

  // Load persisted state and initial render
  loadState();
  render();

  const instance: KanbanBoardInstance = {
    element: root,

    getCards() { return [...allCards]; },
    getColumns() { return [...opts.columns]; },

    addCard(card: KanbanCard) {
      allCards.push({ ...card, id: card.id ?? generateId() });
      opts.onCardAdd?.(card);
      saveState();
      render();
    },

    updateCard(id: string, updates: Partial<KanbanCard>) {
      const idx = allCards.findIndex((c) => c.id === id);
      if (idx >= 0) {
        allCards[idx] = { ...allCards[idx]!, ...updates };
        saveState();
        render();
      }
    },

    removeCard(id: string) {
      allCards = allCards.filter((c) => c.id !== id);
      opts.onCardDelete?.(id);
      saveState();
      render();
    },

    moveCard(cardId: string, toColumnId: string) {
      const card = allCards.find((c) => c.id === cardId);
      if (!card || card.columnId === toColumnId) return;

      const fromColumn = card.columnId;
      card.columnId = toColumnId;
      card.order = getColumnCards(toColumnId).length;
      opts.onCardMove?.(cardId, fromColumn, toColumnId);
      saveState();
      render();
    },

    addColumn(col: KanbanColumn) {
      opts.columns.push(col);
      render();
    },

    removeColumn(columnId: string) {
      opts.columns = opts.columns.filter((c) => c.id !== columnId);
      render();
    },

    filterByTag(tag: string | null) {
      activeTagFilter = tag;
      render();
    },

    filterByAssignee(assignee: string | null) {
      activeAssigneeFilter = assignee;
      render();
    },

    clearFilters() {
      activeTagFilter = null;
      activeAssigneeFilter = null;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
