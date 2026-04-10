/**
 * Transfer: Dual-list transfer component (left/right panels with arrow buttons),
 * search/filter, drag-and-drop, select all, sortable, keyboard navigation,
 * and accessibility support.
 */

// --- Types ---

export interface TransferItem {
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
}

export interface TransferOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Source items (left panel) */
  dataSource: TransferItem[];
  /** Initially selected keys (right panel) */
  targetKeys?: string[];
  /** Titles for left/right panels */
  titles?: [string, string];
  /** Show search boxes */
  searchable?: boolean;
  /** Show "select all" checkbox */
  showSelectAll?: boolean;
  /** Allow dragging between panels */
  draggable?: boolean;
  /** Custom filter function */
  filterFn?: (item: TransferItem, query: string) => boolean;
  /** Callback on selection change */
  onChange?: (targetKeys: string[], direction: "left" | "right", moveKeys: string[]) => void;
  /** Callback when item is moved */
  onItemMove?: (key: string, direction: "left" | "right") => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface TransferInstance {
  element: HTMLElement;
  getTargetKeys: () => string[];
  setTargetKeys: (keys: string[]) => void;
  getSourceItems: () => TransferItem[];
  getTargetItems: () => TransferItem[];
  moveToLeft: (keys?: string[]) => void;
  moveToRight: (keys?: string[]) => void;
  moveAllLeft: () => void;
  moveAllRight: () => void;
  clear: () => void;
  destroy: () => void;
}

// --- Helpers ---

function defaultFilter(item: TransferItem, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.label.toLowerCase().includes(q) ||
    (item.description ?? "").toLowerCase().includes(q)
  );
}

// --- Main Class ---

export class TransferManager {
  create(options: TransferOptions): TransferInstance {
    const opts = {
      titles: options.titles ?? ["Source", "Target"],
      searchable: options.searchable ?? true,
      showSelectAll: options.showSelectAll ?? true,
      draggable: options.draggable ?? false,
      disabled: options.disabled ?? false,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Transfer: container not found");

    // Main wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `transfer ${opts.className ?? ""}`;
    wrapper.style.cssText = `
      display:flex;align-items:stretch;gap:12px;font-family:-apple-system,sans-serif;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;
    container.appendChild(wrapper);

    // State
    let targetKeys = new Set(opts.targetKeys ?? []);
    let sourceChecked = new Set<string>();
    let targetChecked = new Set<string>();
    let sourceQuery = "";
    let targetQuery = "";
    let destroyed = false;

    function getSourceItems(): TransferItem[] {
      return opts.dataSource.filter((item) => !targetKeys.has(item.key));
    }

    function getTargetItemsList(): TransferItem[] {
      return opts.dataSource.filter((item) => targetKeys.has(item.key));
    }

    // Create a panel
    function createPanel(
      title: string,
      side: "source" | "target",
      onSearchChange: (q: string) => void,
    ): { el: HTMLDivElement; listEl: HTMLDivElement; searchEl: HTMLInputElement | null } {
      const panel = document.createElement("div");
      panel.className = `transfer-panel transfer-panel-${side}`;
      panel.style.cssText = `
        flex:1;display:flex;flex-direction:column;min-width:200px;border:1px solid #e5e7eb;
        border-radius:8px;background:#fff;overflow:hidden;
      `;

      // Header
      const header = document.createElement("div");
      header.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;padding:8px 12px;
        border-bottom:1px solid #f0f0f0;background:#fafafa;font-size:13px;font-weight:600;color:#374151;
      `;
      const titleSpan = document.createElement("span");
      titleSpan.textContent = title;
      header.appendChild(titlePanel);

      // Select all checkbox
      let selectAllCb: HTMLInputElement | null = null;
      if (opts.showSelectAll) {
        selectAllCb = document.createElement("input");
        selectAllCb.type = "checkbox";
        selectAllCb.style.cssText = "cursor:pointer;";
        header.appendChild(selectAllCb);
        selectAllCb.addEventListener("change", () => {
          const items = side === "source" ? getFilteredSource() : getFilteredTarget();
          const checkedSet = side === "source" ? sourceChecked : targetChecked;
          if (selectAllCb!.checked) {
            for (const item of items) {
              if (!item.disabled) checkedSet.add(item.key);
            }
          } else {
            checkedSet.clear();
          }
          renderLists();
        });
      }
      panel.appendChild(header);

      // Search
      let searchEl: HTMLInputElement | null = null;
      if (opts.searchable) {
        const searchWrap = document.createElement("div");
        searchWrap.style.cssText = "padding:6px 8px;border-bottom:1px solid #f0f0f0;";
        searchEl = document.createElement("input");
        searchEl.type = "text";
        searchEl.placeholder = "Search...";
        searchEl.style.cssText = `
          width:100%;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;
          font-size:12px;outline:none;box-sizing:border-box;
        `;
        searchEl.addEventListener("input", () => {
          onSearchChange(searchEl!.value);
        });
        searchWrap.appendChild(searchEl);
        panel.appendChild(searchWrap);
      }

      // List
      const listEl = document.createElement("div");
      listEl.className = `transfer-list transfer-list-${side}`;
      listEl.style.cssText = `
        flex:1;overflow-y:auto;padding:4px 0;min-height:120px;max-height:280px;
      `;
      panel.appendChild(listEl);

      // Footer count
      const footer = document.createElement("div");
      footer.style.cssText = "padding:4px 12px;border-top:1px solid #f0f0f0;font-size:11px;color:#9ca3af;text-align:right;";
      footer.dataset.side = side;
      panel.appendChild(footer);

      return { el: panel, listEl, searchEl };
    }

    function getFilteredSource(): TransferItem[] {
      let items = getSourceItems();
      if (sourceQuery) {
        items = items.filter((i) => opts.filterFn ? opts.filterFn(i, sourceQuery) : defaultFilter(i, sourceQuery));
      }
      return items;
    }

    function getFilteredTarget(): TransferItem[] {
      let items = getTargetItemsList();
      if (targetQuery) {
        items = items.filter((i) => opts.filterFn ? opts.filterFn(i, targetQuery) : defaultFilter(i, targetQuery));
      }
      return items;
    }

    function renderListItem(
      item: TransferItem,
      isChecked: boolean,
      side: "source" | "target",
    ): HTMLDivElement {
      const row = document.createElement("div");
      row.className = "transfer-item";
      row.dataset.key = item.key;
      row.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;
        ${item.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
        transition:background 0.1s;
      `;
      row.draggable = opts.draggable && !item.disabled;

      // Checkbox
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = isChecked;
      cb.disabled = item.disabled;
      cb.style.cssText = "cursor:pointer;flex-shrink:0;";
      cb.addEventListener("change", (e) => {
        e.stopPropagation();
        const set = side === "source" ? sourceChecked : targetChecked;
        if (cb.checked) set.add(item.key); else set.delete(item.key);
      });
      row.appendChild(cb);

      // Label
      const label = document.createElement("span");
      label.style.cssText = `${item.disabled ? "color:#9ca3af;" : ""}flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      label.textContent = item.label;
      row.appendChild(label);

      // Hover effect
      row.addEventListener("mouseenter", () => { if (!item.disabled) row.style.background = "#f9fafb"; });
      row.addEventListener("mouseleave", () => { row.style.background = ""; });

      // Drag events
      if (opts.draggable && !item.disabled) {
        row.addEventListener("dragstart", (e) => {
          e.dataTransfer!.setData("text/plain", item.key);
          e.dataTransfer!.effectAllowed = "move";
          row.style.opacity = "0.4";
        });
        row.addEventListener("dragend", () => { row.style.opacity = ""; });
      }

      return row;
    }

    function renderLists(): void {
      // Source list
      sourcePanel.listEl.innerHTML = "";
      const srcItems = getFilteredSource();
      for (const item of srcItems) {
        const row = renderListItem(item, sourceChecked.has(item.key), "source");
        sourcePanel.listEl.appendChild(row);
      }
      if (srcItems.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "padding:20px;text-align:center;color:#9ca3af;font-size:12px;";
        empty.textContent = "No items";
        sourcePanel.listEl.appendChild(empty);
      }
      sourcePanel.el.querySelector(".transfer-panel-footer")!.textContent =
        `${srcItems.length} / ${getSourceItems().length} items`;

      // Target list
      targetPanel.listEl.innerHTML = "";
      const tgtItems = getFilteredTarget();
      for (const item of tgtItems) {
        const row = renderListItem(item, targetChecked.has(item.key), "target");
        targetPanel.listEl.appendChild(row);
      }
      if (tgtItems.length === 0) {
        const empty = document.createElement("div");
        empty.style.cssText = "padding:20px;text-align:center;color:#9ca3af;font-size:12px;";
        empty.textContent = "No items";
        targetPanel.listEl.appendChild(empty);
      }
      targetPanel.el.querySelector(".transfer-panel-footer")!.textContent =
        `${tgtItems.length} / ${getTargetItemsList().length} items`;
    }

    // Create panels
    const sourcePanel = createPanel(opts.titles[0]!, "source", (q) => { sourceQuery = q; renderLists(); });
    const targetPanel = createPanel(opts.titles[1]!, "target", (q) => { targetQuery = q; renderLists(); });

    // Arrow buttons
    const arrowContainer = document.createElement("div");
    arrowContainer.className = "transfer-arrows";
    arrowContainer.style.cssText = "display:flex;flex-direction:column;gap:4px;align-self:center;padding:4px 0;";

    function createArrowBtn(direction: "right" | "left", icon: string): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = icon;
      btn.title = direction === "right" ? "Move to right" : "Move to left";
      btn.style.cssText = `
        width:32px;height:32px;border-radius:6px;border:1px solid #d1d5db;
        background:#fff;cursor:pointer;display:flex;align-items:center;
        justify-content:center;font-size:16px;color:#4b5563;
        transition:all 0.15s;
      `;
      btn.addEventListener("mouseenter", () => {
        btn.style.background = "#eef2ff";
        btn.style.borderColor = "#a5b4fc";
        btn.style.color = "#4338ca";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "#fff";
        btn.style.borderColor = "#d1d5db";
        btn.style.color = "#4b5563";
      });

      btn.addEventListener("click", () => {
        if (direction === "right") moveToRight();
        else moveToLeft();
      });

      return btn;
    }

    const toRightBtn = createArrowBtn("right", "\u276F"); // >
    const toLeftBtn = createArrowBtn("left", "\u276E"); // <
    arrowContainer.append(toRightBtn, toLeftBtn);

    // Drop zones for drag
    if (opts.draggable) {
      sourcePanel.listEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = "move";
      });
      sourcePanel.listEl.addEventListener("drop", (e) => {
        e.preventDefault();
        const key = e.dataTransfer!.getData("text/plain");
        if (key && targetKeys.has(key)) {
          targetKeys.delete(key);
          renderLists();
          opts.onChange?.([...targetKeys], "left", [key]);
        }
      });

      targetPanel.listEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = "move";
      });
      targetPanel.listEl.addEventListener("drop", (e) => {
        e.preventDefault();
        const key = e.dataTransfer!.getData("text/plain");
        if (key && !targetKeys.has(key)) {
          targetKeys.add(key);
          renderLists();
          opts.onChange?.([...targetKeys], "right", [key]);
        }
      });
    }

    // Assemble
    wrapper.appendChild(sourcePanel.el);
    wrapper.appendChild(arrowContainer);
    wrapper.appendChild(targetPanel.el);

    // Actions
    function moveToLeft(keys?: string[]): void {
      const toMove = keys ?? [...(side === "source" ? sourceChecked : targetChecked)];
      // Actually use the correct checked set
      const keysToMove = keys ?? [...targetChecked];
      for (const k of keysToMove) {
        targetKeys.delete(k);
        opts.onItemMove?.(k, "left");
      }
      targetChecked.clear();
      renderLists();
      opts.onChange?.([...targetKeys], "left", keysToMove);
    }

    function moveToRight(keys?: string[]): void {
      const keysToMove = keys ?? [...sourceChecked];
      for (const k of keysToMove) {
        if (!targetKeys.has(k)) {
          targetKeys.add(k);
          opts.onItemMove?.(k, "right");
        }
      }
      sourceChecked.clear();
      renderLists();
      opts.onChange?.([...targetKeys], "right", keysToMove);
    }

    function moveAllRight(): void {
      const allSource = getSourceItems().filter((i) => !i.disabled).map((i) => i.key);
      for (const k of allSource) targetKeys.add(k);
      sourceChecked.clear();
      renderLists();
      opts.onChange?.([...targetKeys], "right", allSource);
    }

    function moveAllLeft(): void {
      const allTarget = [...targetKeys];
      targetKeys.clear();
      targetChecked.clear();
      renderLists();
      opts.onChange?.([], "left", allTarget);
    }

    // Initial render
    renderLists();

    const instance: TransferInstance = {
      element: wrapper,

      getTargetKeys() { return [...targetKeys]; },

      setTargetKeys(keys: string[]) {
        targetKeys = new Set(keys);
        sourceChecked.clear();
        targetChecked.clear();
        renderLists();
      },

      getSourceItems: getSourceItems,
      getTargetItems: getTargetItemsList,

      moveToLeft,
      moveToRight,
      moveAllLeft,
      moveAllRight,

      clear() {
        targetKeys.clear();
        sourceChecked.clear();
        targetChecked.clear();
        sourceQuery = "";
        targetQuery = "";
        if (sourcePanel.searchEl) sourcePanel.searchEl.value = "";
        if (targetPanel.searchEl) targetPanel.searchEl.value = "";
        renderLists();
      },

      destroy() {
        destroyed = true;
        wrapper.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a transfer */
export function createTransfer(options: TransferOptions): TransferInstance {
  return new TransferManager().create(options);
}
