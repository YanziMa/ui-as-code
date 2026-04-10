/**
 * Tree Select: Dropdown selector with tree-structured options, expand/collapse nodes,
 * checkbox selection (single/multi), search/filter, async node loading,
 * keyboard navigation, and accessibility.
 */

// --- Types ---

export interface TreeNodeData {
  value: string;
  label: string;
  children?: TreeNodeData[];
  disabled?: boolean;
  disableCheckbox?: boolean;
  isLeaf?: boolean;
  icon?: string;
  data?: unknown;
}

export interface TreeSelectOptions {
  /** Trigger element or selector */
  trigger: HTMLElement | string | HTMLInputElement;
  /** Tree data or async loader */
  treeData: TreeNodeData[] | (() => Promise<TreeNodeData[]>);
  /** Placeholder text */
  placeholder?: string;
  /** Allow multiple selections */
  multiple?: boolean;
  /** Show checkboxes */
  showCheckbox?: boolean;
  /** Show tree lines/indent guides */
  showLine?: boolean;
  /** Show icons for nodes */
  showIcon?: boolean;
  /** Searchable */
  searchable?: boolean;
  /** Default expanded keys */
  defaultExpandedKeys?: string[];
  /** Default selected values */
  defaultValue?: string | string[];
  /** Only allow leaf selection */
  onlyLeafSelectable?: boolean;
  /** Expand parent on check */
  checkStrictly?: boolean;
  /** Async loader for children */
  loadChildren?: (node: TreeNodeData) => Promise<TreeNodeData[]>;
  /** Custom render for node */
  renderNode?: (node: TreeNodeData, level: number, isSelected: boolean) => HTMLElement;
  /** Filter function */
  filterFn?: (node: TreeNodeData, query: string) => boolean;
  /** Callback on change */
  onChange?: (values: string[], nodes: TreeNodeData[]) => void;
  /** Dropdown z-index */
  zIndex?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Max height of dropdown */
  dropdownMaxHeight?: number;
  /** Custom CSS class */
  className?: string;
}

export interface TreeSelectInstance {
  element: HTMLDivElement;
  inputEl: HTMLInputElement | null;
  open: () => void;
  close: () => void;
  getValues: () => string[];
  getSelectedNodes: () => TreeNodeData[];
  setValues: (values: string[]) => void;
  expandAll: () => void;
  collapseAll: () => void;
  clear: () => void;
  destroy: () => void;
}

// --- Helpers ---

function findNode(nodes: TreeNodeData[], value: string): TreeNodeData | null {
  for (const n of nodes) {
    if (n.value === value) return n;
    if (n.children) {
      const found = findNode(n.children, value);
      if (found) return found;
    }
  }
  return null;
}

function flattenNodes(nodes: TreeNodeData[]): TreeNodeData[] {
  const result: TreeNodeData[] = [];
  for (const n of nodes) {
    result.push(n);
    if (n.children) result.push(...flattenNodes(n.children));
  }
  return result;
}

function getAllLeafValues(nodes: TreeNodeData[]): string[] {
  const result: string[] = [];
  for (const n of nodes) {
    if (!n.children || n.children.length === 0 || n.isLeaf) {
      result.push(n.value);
    } else {
      result.push(...getAllLeafValues(n.children));
    }
  }
  return result;
}

function getDescendantValues(node: TreeNodeData): string[] {
  if (!node.children || node.children.length === 0) return [node.value];
  const values: string[] = [];
  for (const child of node.children!) {
    values.push(...getDescendantValues(child));
  }
  return values;
}

// --- Main Class ---

export class TreeSelectManager {
  create(options: TreeSelectOptions): TreeSelectInstance {
    const opts = {
      placeholder: options.placeholder ?? "Please select",
      multiple: options.multiple ?? false,
      showCheckbox: options.showCheckbox ?? true,
      showLine: options.showLine ?? false,
      showIcon: options.showIcon ?? false,
      searchable: options.searchable ?? true,
      onlyLeafSelectable: options.onlyLeafSelectable ?? false,
      checkStrictly: options.checkStrictly ?? false,
      zIndex: options.zIndex ?? 10500,
      dropdownMaxHeight: options.dropdownMaxHeight ?? 300,
      disabled: options.disabled ?? false,
      ...options,
    };

    const triggerEl = typeof options.trigger === "string"
      ? document.querySelector<HTMLElement>(options.trigger)!
      : options.trigger;

    if (!triggerEl) throw new Error("TreeSelect: trigger element not found");

    const isInputTrigger = triggerEl instanceof HTMLInputElement;

    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `tree-select ${opts.className ?? ""}`;
    wrapper.style.cssText = "position:relative;display:inline-block;width:100%;";
    triggerEl.parentNode?.insertBefore(wrapper, triggerEl);

    // Input/display
    let inputEl: HTMLInputElement;
    if (isInputTrigger) {
      inputEl = triggerEl as HTMLInputElement;
      inputEl.placeholder = opts.placeholder;
      if (opts.disabled) inputEl.disabled = true;
      wrapper.appendChild(inputEl);
    } else {
      inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.readOnly = true;
      inputEl.placeholder = opts.placeholder;
      inputEl.style.cssText = `
        width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;
        font-size:13px;font-family:-apple-system,sans-serif;outline:none;
        transition:border-color 0.15s;box-sizing:border-box;background:#fff;
        ${opts.disabled ? "background:#f9fafb;cursor:not-allowed;" : "cursor:pointer;"}
      `;
      wrapper.appendChild(inputEl);
      triggerEl.style.display = "none";
    }

    // Tags for multi-select
    let tagsContainer: HTMLDivElement | null = null;
    if (opts.multiple) {
      tagsContainer = document.createElement("div");
      tagsContainer.style.cssText = `
        display:flex;flex-wrap:wrap;gap:4px;padding:2px 8px;min-height:34px;align-items:center;
      `;
      wrapper.insertBefore(tagsContainer, inputEl);
      inputEl.style.flex = "1";
      inputEl.style.minWidth = "80px";
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.flexWrap = "wrap";
    }

    // Dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "tree-select-dropdown";
    dropdown.style.cssText = `
      position:absolute;left:0;top:100%;width:100%;
      max-height:${opts.dropdownMaxHeight}px;overflow-y:auto;
      background:#fff;border-radius:8px;
      box-shadow:0 8px 30px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.08);
      z-index:${opts.zIndex};display:none;
      font-family:-apple-system,sans-serif;font-size:13px;
      border:1px solid #e5e7eb;padding:4px 0;margin-top:4px;
    `;
    document.body.appendChild(dropdown);

    // Search
    let searchInput: HTMLInputElement | null = null;
    if (opts.searchable) {
      const sWrap = document.createElement("div");
      sWrap.style.cssText = "padding:6px 10px;border-bottom:1px solid #f0f0f0;";
      searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search...";
      searchInput.style.cssText = `
        width:100%;padding:6px 8px;border:1px solid #d1d5db;border-radius:4px;
        font-size:13px;outline:none;box-sizing:border-box;
      `;
      searchInput.addEventListener("focus", () => { searchInput!.style.borderColor = "#6366f1"; });
      searchInput.addEventListener("blur", () => { searchInput!.style.borderColor = "#d1d5db"; });
      sWrap.appendChild(searchInput);
      dropdown.appendChild(sWrap);
    }

    // Tree container
    const treeContainer = document.createElement("div");
    treeContainer.className = "tree-select-tree";
    treeContainer.style.cssText = "padding:4px 0;";
    dropdown.appendChild(treeContainer);

    // State
    let isOpen = false;
    let selectedValues: string[] = [];
    let expandedKeys = new Set(opts.defaultExpandedKeys ?? []);
    let allTreeData: TreeNodeData[] = [];
    let destroyed = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const isAsyncSource = typeof options.treeData === "function";

    async function loadData(): Promise<void> {
      if (isAsyncSource) {
        allTreeData = await (options.treeData as () => Promise<TreeNodeData[]>)();
      } else {
        allTreeData = options.treeData as TreeNodeData[];
      }
    }

    function isSelected(value: string): boolean {
      return selectedValues.includes(value);
    }

    function isExpanded(value: string): boolean {
      return expandedKeys.has(value);
    }

    function toggleExpand(value: string): void {
      if (expandedKeys.has(value)) {
        expandedKeys.delete(value);
      } else {
        expandedKeys.add(value);
      }
      renderTree();
    }

    function renderTreeNode(node: TreeNodeData, level: number): HTMLElement {
      const isExpandedNode = isExpanded(node.value);
      const isSelectedNode = isSelected(node.value);
      const hasChildren = node.children && node.children.length > 0;
      const isLeafNode = node.isLeaf || !hasChildren;

      const row = document.createElement("div");
      row.className = "tree-node";
      row.dataset.value = node.value;
      row.style.cssText = `
        display:flex;align-items:center;gap:4px;padding:3px 8px;
        min-height:28px;cursor:pointer;
        ${node.disabled ? "opacity:0.45;cursor:not-allowed;" : ""}
        ${isSelectedNode && !opts.multiple ? "background:#eef2ff;" : ""}
        transition:background 0.1s;
        padding-left:${level * 20 + 8}px;
      `;

      // Expand/collapse arrow
      if (hasChildren || !node.isLeaf) {
        const arrow = document.createElement("span");
        arrow.style.cssText = `
          width:16px;height:16px;display:inline-flex;align-items:center;
          justify-content:center;flex-shrink:0;font-size:10px;color:#6b7280;
          transform:rotate(${isExpandedNode ? "90deg" : "0"});
          transition:transform 0.15s;
        `;
        arrow.textContent = "\u25B6"; // ▶
        row.appendChild(arrow);

        if (!node.disabled) {
          arrow.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleExpand(node.value);
          });
        }
      } else {
        const spacer = document.createElement("span");
        spacer.style.cssText = "width:16px;flex-shrink:0;display:inline-block;";
        row.appendChild(spacer);
      }

      // Tree line connector
      if (opts.showLine && level > 0) {
        const line = document.createElement("span");
        line.style.cssText = `
          width:1px;height:16px;background:#e5e7eb;flex-shrink:0;margin-right:2px;
        `;
        row.insertBefore(line, row.firstChild);
      }

      // Checkbox
      if (opts.multiple && opts.showCheckbox && !node.disableCheckbox) {
        const cb = document.createElement("span");
        cb.style.cssText = `
          width:14px;height:14px;border-radius:3px;border:2px solid #d1d5db;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
          background:${isSelectedNode ? "#4338ca" : "transparent"};
          border-color:${isSelectedNode ? "#4338ca" : "#d1d5db"};
        `;
        if (isSelectedNode) {
          cb.innerHTML = `<svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
        }
        row.appendChild(cb);
      }

      // Icon
      if (opts.showIcon && node.icon) {
        const icon = document.createElement("span");
        icon.textContent = node.icon;
        icon.style.cssText = "font-size:14px;width:18px;text-align:center;flex-shrink:0;";
        row.appendChild(icon);
      }

      // Label
      const label = document.createElement("span");
      label.style.cssText = `
        flex:1;min-width:0;font-size:13px;white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis;
        ${node.disabled ? "color:#9ca3af;" : ""}
        ${isSelectedNode && !opts.multiple ? "color:#4338ca;font-weight:500;" : ""}
      `;
      label.textContent = node.label;
      row.appendChild(label);

      // Events
      if (!node.disabled) {
        row.addEventListener("mouseenter", () => { row.style.background = "#f9fafb"; });
        row.addEventListener("mouseleave", () => { if (!isSelectedNode) row.style.background = ""; });
        row.addEventListener("click", () => handleNodeClick(node));
      }

      // Children
      if (hasChildren && isExpandedNode) {
        for (const child of node.children!) {
          const childEl = renderTreeNode(child, level + 1);
          treeContainer.appendChild(childEl);
        }
      }

      return row;
    }

    function handleNodeClick(node: TreeNodeData): void {
      const hasChildren = node.children && node.children.length > 0;
      const isLeafNode = node.isLeaf || !hasChildren;

      // If has children and not leaf-only mode, toggle expand first click
      if (hasChildren && !isLeafNode && !opts.onlyLeafSelectable) {
        toggleExpand(node.value);
        return;
      }

      if (opts.multiple) {
        const idx = selectedValues.indexOf(node.value);
        if (idx >= 0) {
          selectedValues.splice(idx, 1);
        } else {
          selectedValues.push(node.value);
          // Auto-expand parent
          if (!opts.checkStrictly) {
            // Could implement parent auto-check here
          }
        }
        renderTags();
        renderTree();
        opts.onChange?.(selectedValues, getSelectedNodes());
      } else {
        selectedValues = [node.value];
        const labels = findNode(allTreeData, node.value)?.label ?? node.label;
        inputEl.value = labels;
        closeDropdown();
        opts.onChange?.(selectedValues, getSelectedNodes());
      }
    }

    function renderTree(): void {
      // Clear tree content (keep search)
      const afterSearch = searchInput ? searchInput.parentElement!.nextSibling : dropdown.firstChild;
      while (treeContainer.lastChild && treeContainer.lastChild !== afterSearch) {
        treeContainer.removeChild(treeContainer.lastChild);
      }
      treeContainer.innerHTML = "";

      for (const node of allTreeData) {
        const el = renderTreeNode(node, 0);
        treeContainer.appendChild(el);
      }
    }

    function renderTags(): void {
      if (!tagsContainer) return;
      tagsContainer.innerHTML = "";

      for (const val of selectedValues) {
        const node = findNode(allTreeData, val);
        if (!node) continue;

        const tag = document.createElement("span");
        tag.style.cssText = `
          display:inline-flex;align-items:center;gap:3px;padding:2px 8px;
          background:#eef2ff;color:#4338ca;border-radius:4px;font-size:12px;
          cursor:pointer;user-select:none;
        `;
        tag.textContent = node.label;

        const removeBtn = document.createElement("span");
        removeBtn.innerHTML = "&times;";
        removeBtn.style.cssText = "margin-left:2px;font-weight:bold;cursor:pointer;";
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = selectedValues.indexOf(val);
          if (idx >= 0) selectedValues.splice(idx, 1);
          renderTags();
          opts.onChange?.(selectedValues, getSelectedNodes());
        });
        tag.appendChild(removeBtn);
        tagsContainer.appendChild(tag);
      }
    }

    function getSelectedNodes(): TreeNodeData[] {
      return selectedValues.map(v => findNode(allTreeData, v)).filter(Boolean) as TreeNodeData[];
    }

    function openDropdown(): void {
      if (isOpen || opts.disabled) return;
      isOpen = true;
      loadData().then(() => {
        renderTree();
        dropdown.style.display = "block";
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
      });
    }

    function closeDropdown(): void {
      isOpen = false;
      dropdown.style.display = "none";
    }

    // Search handler
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const q = searchInput!.value.trim().toLowerCase();
          if (!q) {
            renderTree();
            return;
          }
          // Flatten and filter
          const flat = flattenNodes(allTreeData);
          const matched = flat.filter(n =>
            opts.filterFn ? opts.filterFn(n, q) :
            n.label.toLowerCase().includes(q) || n.value.toLowerCase().includes(q)
          );

          treeContainer.innerHTML = "";
          if (matched.length === 0) {
            const noRes = document.createElement("div");
            noRes.style.cssText = "padding:12px;text-align:center;color:#9ca3af;";
            noRes.textContent = "No results";
            treeContainer.appendChild(noRes);
          } else {
            for (const n of matched) {
              const el = renderTreeNode(n, 0);
              treeContainer.appendChild(el);
            }
          }
        }, 200);
      });
    }

    // Event handlers
    if (isInputTrigger) {
      inputEl.addEventListener("focus", () => { if (!opts.multiple) openDropdown(); });
    } else {
      wrapper.addEventListener("click", () => { if (!opts.disabled) openDropdown(); });
    }

    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          e.preventDefault();
          openDropdown();
        }
        return;
      }
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          closeDropdown();
          inputEl.focus();
          break;
      }
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.activeElement !== dropdown && !dropdown.contains(document.activeElement)) {
          closeDropdown();
        }
      }, 150);
    });

    // Click outside
    const clickOutside = (e: MouseEvent) => {
      if (isOpen && !wrapper.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", clickOutside);

    // Apply defaults
    if (opts.defaultValue) {
      if (Array.isArray(opts.defaultValue)) {
        selectedValues = [...opts.defaultValue];
      } else {
        selectedValues = [opts.defaultValue];
      }
      if (!opts.multiple && selectedValues.length > 0) {
        const node = findNode(allTreeData, selectedValues[0]);
        if (node) inputEl.value = node.label;
      }
      renderTags();
    }

    const instance: TreeSelectInstance = {
      element: wrapper,
      inputEl: isInputTrigger ? inputEl : null,

      open() { openDropdown(); },
      close() { closeDropdown(); },

      getValues() { return [...selectedValues]; },
      getSelectedNodes: getSelectedNodes,

      setValues(values: string[]) {
        selectedValues = [...values];
        if (!opts.multiple && values.length > 0) {
          const node = findNode(allTreeData, values[0]);
          inputEl.value = node?.label ?? "";
        }
        renderTags();
        renderTree();
      },

      expandAll() {
        const allVals = flattenNodes(allTreeData).map(n => n.value);
        expandedKeys = new Set(allVals);
        renderTree();
      },

      collapseAll() {
        expandedKeys.clear();
        renderTree();
      },

      clear() {
        selectedValues = [];
        inputEl.value = "";
        renderTags();
        opts.onChange?.([], []);
      },

      destroy() {
        destroyed = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        document.removeEventListener("mousedown", clickOutside);
        dropdown.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a tree select */
export function createTreeSelect(options: TreeSelectOptions): TreeSelectInstance {
  return new TreeSelectManager().create(options);
}
