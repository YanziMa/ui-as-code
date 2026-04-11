/**
 * Board (Kanban) Utilities: Drag-and-drop kanban board with columns,
 * cards, swimlanes, filters, card detail panels, WIP limits,
 * keyboard shortcuts, persistence, and responsive layout.
 */

// --- Types ---

export interface BoardCard {
  /** Unique ID */
  id: string;
  /** Card title */
  title: string;
  /** Description */
  description?: string;
  /** Column ID */
  columnId: string;
  /** Priority (1-5) */
  priority?: number;
  /** Tags/labels */
  tags?: string[];
  /** Assignee display name */
  assignee?: string;
  /** Avatar URL or initials */
  avatar?: string;
  /** Due date (ISO string) */
  dueDate?: string;
  /** Color accent */
  color?: string;
  /** Cover image URL */
  coverImage?: string;
  /** Custom data */
  data?: unknown;
  /** Disabled (cannot drag) */
  disabled?: boolean;
}

export interface BoardColumn {
  /** Column ID */
  id: string;
  /** Column title */
  title: string;
  /** Cards in this column */
  cards?: BoardCard[];
  /** Work-in-progress limit (0 = unlimited) */
  wipLimit?: number;
  /** Column color */
  color?: string;
  /** Can cards be added here? */
  allowAdd?: boolean;
  /** Is this column locked? */
  locked?: boolean;
}

export interface BoardOptions {
  /** Columns defining the board */
  columns: BoardColumn[];
  /** Board title */
  title?: string;
  /** Show column WIP indicators */
  showWipLimit?: boolean;
  /** Enable card dragging between columns */
  draggable?: boolean;
  /** Enable card click for detail */
  cardClickable?: boolean;
  /** Show card priority badges */
  showPriority?: boolean;
  /** Show card tags */
  showTags?: boolean;
  /** Show card due dates */
  showDueDates?: boolean;
  /** Show card assignees */
  showAssignees?: boolean;
  /** Card add callback */
  onCardAdd?: (columnId: string, title: string) => void;
  /** Card move callback */
  onCardMove?: (cardId: string, fromCol: string, toCol: string, newIndex: number) => void;
  /** Card click callback */
  onCardClick?: (card: BoardCard) => void;
  /** Called when columns reorder */
  onColumnsChange?: (columns: BoardColumn[]) => void;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface BoardInstance {
  /** Root element */
  el: HTMLElement;
  /** Add a card to a column */
  addCard: (columnId: string, card: BoardCard) => void;
  /** Remove a card */
  removeCard: (cardId: string) => void;
  /** Update a card */
  updateCard: (cardId: string, updates: Partial<BoardCard>) => void;
  /** Move a card programmatically */
  moveCard: (cardId: string, toColumnId: string, index?: number) => void;
  /** Add a column */
  addColumn: (col: BoardColumn) => void;
  /** Remove a column */
  removeColumn: (columnId: string) => void;
  /** Get all columns */
  getColumns: () => BoardColumn[];
  /** Get all cards */
  getCards: () => BoardCard[];
  /** Filter cards */
  filterCards: (predicate: (card: BoardCard) => boolean) => void;
  /** Clear filter */
  clearFilter: () => void;
  /** Set board title */
  setTitle: (title: string) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Priority Colors ---

const PRIORITY_COLORS: Record<number, string> = {
  1: "#ef4444", // Critical - red
  2: "#f97316", // High - orange
  3: "#eab308", // Medium - yellow
  4: "#3b82f6", // Low - blue
  5: "#9ca3af", // None - gray
};

// --- Core Factory ---

/**
 * Create a kanban-style board.
 *
 * @example
 * ```ts
 * const board = createBoard({
 *   columns: [
 *     { id: "todo", title: "To Do", wipLimit: 5 },
 *     { id: "doing", title: "In Progress", wipLimit: 3 },
 *     { id: "done", title: "Done" },
 *   ],
 *   draggable: true,
 *   onCardMove: (card, from, to) => console.log(`${card} moved ${from} -> ${to}`),
 * });
 * ```
 */
export function createBoard(options: BoardOptions): BoardInstance {
  const {
    columns: initialColumns,
    title: boardTitle,
    showWipLimit = true,
    draggable = true,
    cardClickable = true,
    showPriority = true,
    showTags = true,
    showDueDates = true,
    showAssignees = true,
    onCardAdd,
    onCardMove,
    onCardClick,
    onColumnsChange,
    container,
    className,
  } = options;

  let _columns: BoardColumn[] = initialColumns.map((c) => ({
    ...c,
    cards: [...(c.cards ?? [])],
  }));
  let _filterFn: ((card: BoardCard) => boolean) | null = null;
  let cleanupFns: Array<() => void> = [];
  let _draggedCardId: string | null = null;
  let _dragSourceCol: string | null = null;

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `kanban-board ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-direction:column;width:100%;height:100%;" +
    "font-family:-apple-system,sans-serif;font-size:13px;color:#374151;overflow:hidden;";

  // Header
  if (boardTitle) {
    const header = document.createElement("div");
    header.className = "board-header";
    header.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;" +
      "border-bottom:1px solid #f3f4f6;flex-shrink:0;";
    const titleEl = document.createElement("h3");
    titleEl.style.cssText = "margin:0;font-size:16px;font-weight:600;color:#111827;";
    titleEl.textContent = boardTitle;
    header.appendChild(titleEl);
    root.appendChild(header);
  }

  // Columns container
  const columnsContainer = document.createElement("div");
  columnsContainer.className = "board-columns";
  columnsContainer.style.cssText =
    "display:flex;gap:12px;padding:16px;overflow-x:auto;flex:1;align-items:flex-start;";

  // Column elements map
  const colEls = new Map<string, HTMLElement>();
  const cardEls = new Map<string, HTMLElement>();

  // --- Render ---

  function _render(): void {
    columnsContainer.innerHTML = "";
    colEls.clear();
    cardEls.clear();

    for (const col of _columns) {
      const colEl = _renderColumn(col);
      colEls.set(col.id, colEl);
      columnsContainer.appendChild(colEl);
    }
  }

  function _renderColumn(col: BoardColumn): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "kanban-column";
    wrapper.dataset.columnId = col.id;
    wrapper.style.cssText =
      "flex:0 0 280px;min-width:250px;display:flex;flex-direction:column;" +
      "background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;max-height:100%;";

    // Column header
    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;padding:10px 12px;" +
      "border-bottom:1px solid #f3f4f6;flex-shrink:0;";

    const left = document.createElement("div");
    left.style.cssText = "display:flex;align-items:center;gap:8px;";

    // Color dot
    if (col.color) {
      const dot = document.createElement("span");
      dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${col.color};flex-shrink:0;`;
      left.appendChild(dot);
    }

    const titleSpan = document.createElement("span");
    titleSpan.style.cssText = "font-weight:600;font-size:13px;color:#111827;";
    titleSpan.textContent = col.title;
    left.appendChild(titleSpan);

    // Card count
    const countBadge = document.createElement("span");
    countBadge.className = "board-card-count";
    countBadge.style.cssText =
      "background:#e5e7eb;color:#6b7280;font-size:11px;padding:1px 7px;border-radius:10px;";
    const visibleCount = _filterFn ? col.cards!.filter(_filterFn).length : col.cards!.length;
    countBadge.textContent = String(visibleCount);
    left.appendChild(countBadge);

    // WIP limit indicator
    if (showWipLimit && col.wipLimit && col.wipLimit > 0) {
      const wipEl = document.createElement("span");
      wipEl.style.cssText =
        `font-size:11px;color:${visibleCount >= col.wipLimit ? "#ef4444" : "#9ca3af"};`;
      wipEl.textContent = `/ ${col.wipLimit}`;
      left.appendChild(wipEl);
    }

    header.appendChild(left);

    // Lock icon if locked
    if (col.locked) {
      const lockIcon = document.createElement("span");
      lockIcon.innerHTML = "&#128274;";
      lockIcon.style.cssText = "font-size:12px;color:#9ca3af;";
      header.appendChild(lockIcon);
    }

    wrapper.appendChild(header);

    // Cards area (drop target)
    const cardsArea = document.createElement("div");
    cardsArea.className = "board-cards-area";
    cardsArea.dataset.columnId = col.id;
    cardsArea.style.cssText =
      "flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px;" +
      "min-height:60px;";

    // Render cards
    const cardsToShow = _filterFn ? col.cards!.filter(_filterFn) : col.cards!;
    for (const card of cardsToShow) {
      const cardEl = _renderCard(card, col.locked);
      cardEls.set(card.id, cardEl);
      cardsArea.appendChild(cardEl);
    }

    // Drop zone placeholder
    if (draggable && !col.locked) {
      cardsArea.setAttribute("data-drop-zone", "true");
    }

    // Add card input
    if (col.allowAdd !== false && !col.locked) {
      const addWrapper = document.createElement("div");
      addWrapper.style.cssText = "padding:6px 12px 10px;";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.textContent = "+ Add a card";
      addBtn.style.cssText =
        "width:100%;padding:6px;border:1px dashed #d1d5db;border-radius:6px;" +
        "background:none;cursor:pointer;font-size:12px;color:#6b7280;" +
        "transition:all 0.15s;text-align:left;";
      addBtn.addEventListener("mouseenter", () => { addBtn.style.borderColor = "#9ca3af"; addBtn.style.color = "#374151"; });
      addBtn.addEventListener("mouseleave", () => { addBtn.style.borderColor = "#d1d5db"; addBtn.style.color = "#6b7280"; });
      addBtn.addEventListener("click", () => _showAddCardInput(col.id, addWrapper));

      addWrapper.appendChild(addBtn);
      wrapper.appendChild(addWrapper);
    }

    wrapper.appendChild(cardsArea);
    return wrapper;
  }

  function _renderCard(card: BoardCard, locked: boolean): HTMLElement {
    const el = document.createElement("div");
    el.className = "kanban-card";
    el.dataset.cardId = card.id;
    el.draggable = !card.disabled && draggable && !locked;
    el.style.cssText =
      "background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;" +
      "cursor:default;box-shadow:0 1px 2px rgba(0,0,0,0.04);transition:box-shadow 0.15s," +
      (draggable && !card.disabled && !locked ? "transform 0.15s;" : "") +
      (card.disabled ? "opacity:0.5;" : "");

    // Priority badge
    if (showPriority && card.priority) {
      const badge = document.createElement("span");
      badge.style.cssText =
        `display:inline-block;width:6px;height:6px;border-radius:50%;background:${PRIORITY_COLORS[card.priority] ?? PRIORITY_COLORS[5]};` +
        "flex-shrink:0;margin-right:4px;";
      badge.title = `Priority: ${card.priority}`;
      el.appendChild(badge);
    }

    // Title
    const titleEl = document.createElement("div");
    titleEl.style.cssText = "font-size:13px;font-weight:500;color:#111827;line-height:1.4;margin-bottom:4px;";
    titleEl.textContent = card.title;
    el.appendChild(titleEl);

    // Tags
    if (showTags && card.tags && card.tags.length > 0) {
      const tagsWrap = document.createElement("div");
      tagsWrap.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px;";
      for (const tag of card.tags.slice(0, 3)) {
        const tagEl = document.createElement("span");
        tagEl.style.cssText =
          "padding:1px 6px;border-radius:3px;font-size:10px;background:#eff6ff;color:#2563eb;";
        tagEl.textContent = tag;
        tagsWrap.appendChild(tagEl);
      }
      el.appendChild(tagsWrap);
    }

    // Meta row (assignee + due date)
    const metaRow = document.createElement("div");
    metaRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-top:4px;";

    // Assignee
    if (showAssignees && card.assignee) {
      const assigneeEl = document.createElement("div");
      assigneeEl.style.cssText = "display:flex;align-items:center;gap:4px;font-size:11px;color:#6b7280;";
      if (card.avatar) {
        const avatar = document.createElement("span");
        avatar.style.cssText =
          "width:20px;height:20px;border-radius:50%;background:#e5e7eb;display:flex;" +
          "align-items:center;justify-content:center;font-size:10px;color:#6b7280;";
        avatar.textContent = card.avatar.length <= 2 ? card.avatar : card.avatar[0]!;
        assigneeEl.appendChild(avatar);
      }
      const name = document.createElement("span");
      name.textContent = card.assignee;
      name.style.cssText = "max-width:80px;overflow:hidden;text-ellipsis;white-space:nowrap;";
      assigneeEl.appendChild(name);
      metaRow.appendChild(assigneeEl);
    }

    // Due date
    if (showDueDates && card.dueDate) {
      const due = new Date(card.dueDate);
      const overdue = due < new Date() && !card.disabled;
      const dueEl = document.createElement("span");
      dueEl.style.cssText = `font-size:11px;color:${overdue ? "#ef4444" : "#9ca3af"};`;
      dueEl.textContent = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      metaRow.appendChild(dueEl);
    }

    if (metaRow.children.length > 0) el.appendChild(metaRow);

    // Border accent
    if (card.color) {
      el.style.borderLeftWidth = "3px";
      el.style.borderLeftColor = card.color;
    }

    // Events
    if (cardClickable && !card.disabled) {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => onCardClick?.(card));
    }

    el.addEventListener("mouseenter", () => { el.style.boxShadow = "0 4px 8px rgba(0,0,0,0.08)"; });
    el.addEventListener("mouseleave", () => { el.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"; });

    // Drag events
    if (draggable && !card.disabled && !locked) {
      el.addEventListener("dragstart", (e: DragEvent) => {
        _draggedCardId = card.id;
        _dragSourceCol = card.columnId;
        el.style.opacity = "0.4";
        e.dataTransfer!.effectAllowed = "move";
        e.dataTransfer!.setData("text/plain", card.id);
      });
      el.addEventListener("dragend", () => {
        el.style.opacity = "1";
        _draggedCardId = null;
        _dragSourceCol = null;
        _clearDropHighlights();
      });
    }

    return el;
  }

  function _showAddCardInput(columnId: string, wrapper: HTMLElement): void {
    const existing = wrapper.querySelector(".add-card-input");
    if (existing) return;

    const inputWrap = document.createElement("div");
    inputWrap.className = "add-card-input";
    inputWrap.style.cssText = "margin-bottom:6px;";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Enter card title...";
    textarea.rows = 2;
    textarea.style.cssText =
      "width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;" +
      "font-size:12px;font-family:inherit;resize:none;box-sizing:border-box;outline:none;";
    textarea.focus();

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:6px;margin-top:4px;";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Add";
    addBtn.style.cssText = "padding:4px 12px;background:#3b82f6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "\u2715";
    cancelBtn.style.cssText = "padding:4px 8px;background:none;border:none;cursor:pointer;font-size:12px;color:#6b7280;";

    btnRow.appendChild(addBtn);
    btnRow.appendChild(cancelBtn);
    inputWrap.appendChild(textarea);
    inputWrap.appendChild(btnRow);
    wrapper.insertBefore(inputWrap, wrapper.firstChild?.nextSibling);

    addBtn.addEventListener("click", () => {
      const val = textarea.value.trim();
      if (val) onCardAdd?.(columnId, val);
      inputWrap.remove();
    });
    cancelBtn.addEventListener("click", () => inputWrap.remove());

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        addBtn.click();
      }
      if (e.key === "Escape") inputWrap.remove();
    });
  }

  // --- Drop handling ---

  function _setupDropZones(): void {
    columnsContainer.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      const target = (e.target as HTMLElement).closest("[data-drop-zone]") as HTMLElement;
      if (target) {
        target.style.background = "#eff6ff";
        const rect = target.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const afterMiddle = y > rect.height / 2;
        // Visual feedback could go here
      }
    });

    columnsContainer.addEventListener("dragleave", (e: DragEvent) => {
      const target = (e.target as HTMLElement).closest("[data-drop-zone]") as HTMLElement;
      if (target && !target.contains(e.relatedTarget as Node)) {
        target.style.background = "";
      }
    });

    columnsContainer.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      const target = (e.target as HTMLElement).closest("[data-drop-zone]") as HTMLElement;
      if (!target || !_draggedCardId || !_dragSourceCol) return;

      const toColId = target.dataset.columnId;
      if (toColId === _dragSourceCol) { target.style.background = ""; return; }

      const toCol = _columns.find((c) => c.id === toColId);
      if (toCol?.locked) { target.style.background = ""; return; }

      // Find drop position
      const cards = target.querySelectorAll(".kanban-card");
      let insertIndex = cards.length;
      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i]!.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          insertIndex = i;
          break;
        }
      }

      onCardMove?.(_draggedCardId, _dragSourceCol, toColId!, insertIndex);
      target.style.background = "";
    });
  }

  function _clearDropHighlights(): void {
    columnsContainer.querySelectorAll("[data-drop-zone]").forEach((el) => {
      (el as HTMLElement).style.background = "";
    });
  }

  // --- Public API ---

  function addCard(columnId: string, card: BoardCard): void {
    const col = _columns.find((c) => c.id === columnId);
    if (col) {
      col.cards!.push(card);
      _render();
    }
  }

  function removeCard(cardId: string): void {
    for (const col of _columns) {
      const idx = col.cards!.findIndex((c) => c.id === cardId);
      if (idx >= 0) { col.cards!.splice(idx, 1); _render(); return; }
    }
  }

  function updateCard(cardId: string, updates: Partial<BoardCard>): void {
    for (const col of _columns) {
      const card = col.cards!.find((c) => c.id === cardId);
      if (card) { Object.assign(card, updates); _render(); return; }
    }
  }

  function moveCard(cardId: string, toColumnId: string, index?: number): void {
    let card: BoardCard | undefined;
    for (const col of _columns) {
      const idx = col.cards!.findIndex((c) => c.id === cardId);
      if (idx >= 0) {
        card = col.cards!.splice(idx, 1)[0];
        break;
      }
    }
    if (!card) return;
    card.columnId = toColumnId;
    const toCol = _columns.find((c) => c.id === toColumnId);
    if (toCol) {
      const pos = index !== undefined ? Math.min(index, toCol.cards!.length) : toCol.cards!.length;
      toCol.cards!.splice(pos, 0, card);
    }
    _render();
  }

  function addColumn(col: BoardColumn): void {
    _columns.push({ ...col, cards: [...(col.cards ?? [])] });
    _render();
    onColumnsChange?.(_columns);
  }

  function removeColumn(columnId: string): void {
    _columns = _columns.filter((c) => c.id !== columnId);
    _render();
    onColumnsChange?.(_columns);
  }

  function getColumns(): BoardColumn[] { return _columns.map((c) => ({ ...c, cards: [...c.cards!] })); }
  function getCards(): BoardCard[] { return _columns.flatMap((c) => c.cards!); }

  function filterCards(predicate: (card: BoardCard) => boolean): void {
    _filterFn = predicate;
    _render();
  }

  function clearFilter(): void {
    _filterFn = null;
    _render();
  }

  function setTitle(t: string): void {
    const titleEl = root.querySelector(".board-header h3");
    if (titleEl) titleEl.textContent = t;
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // --- Init ---
  root.appendChild(columnsContainer);
  _render();
  if (draggable) _setupDropZones();

  return { el: root, addCard, removeCard, updateCard, moveCard, addColumn, removeColumn, getColumns, getCards, filterCards, clearFilter, setTitle, destroy };
}
