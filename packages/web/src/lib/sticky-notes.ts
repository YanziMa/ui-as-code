/**
 * Sticky Notes: Draggable, resizable, editable sticky note widget system.
 * Supports:
 * - Create, edit, delete notes
 * - Drag to reposition
 * - Resize from corners/edges
 * - Color themes (yellow, pink, blue, green, purple, white)
 * - Pin/unpin (always on top)
 * - Collapse/expand
 * - Z-index management (stacking order)
 * - LocalStorage persistence (optional)
 * - Keyboard shortcuts (delete selected, new note)
 * - Minimize to tray
 */

// --- Types ---

export type NoteColor = "yellow" | "pink" | "blue" | "green" | "purple" | "white" | "orange" | "teal";

export interface StickyNoteData {
  /** Unique ID */
  id: string;
  /** Note content (HTML or plain text) */
  content: string;
  /** Color theme */
  color: NoteColor;
  /** Position [x, y] in px */
  position: [number, number];
  /** Size [width, height] in px */
  size: [number, number];
  /** Z-index for stacking */
  zIndex: number;
  /** Is pinned (always on top) */
  pinned: boolean;
  /** Is collapsed */
  collapsed: boolean;
  /** Created timestamp */
  createdAt: number;
  /** Updated timestamp */
  updatedAt: number;
}

export interface StickyNotesOptions {
  /** Container element or selector (default: document.body) */
  container?: HTMLElement | string;
  /** Initial notes data */
  notes?: StickyNoteData[];
  /** Default color for new notes (default: yellow) */
  defaultColor?: NoteColor;
  /** Default size for new notes [w, h] (default: [220, 240]) */
  defaultSize?: [number, number];
  /** Enable drag (default: true) */
  draggable?: boolean;
  /** Enable resize (default: true) */
  resizable?: boolean;
  /** Enable collapse (default: true) */
  collapsible?: boolean;
  /** Enable pinning (default: true) */
  pinnable?: true;
  /** Enable delete with confirmation (default: true) */
  confirmDelete?: boolean;
  /** Minimum note size [w, h] (default: [150, 120]) */
  minSize?: [number, number];
  /** Maximum note size [w, h] (default: [600, 800]) */
  maxSize?: [number, number];
  /** Snap to grid (px, 0 = disabled, default: 0) */
  snapGrid?: number;
  /** Show timestamps (default: false) */
  showTimestamps?: boolean;
  /** Persist to localStorage (default: true) */
  persist?: boolean;
  /** Storage key (default: "sticky-notes") */
  storageKey?: string;
  /** Max notes allowed (default: 50) */
  maxNotes?: number;
  /** Callback when notes change */
  onChange?: (notes: StickyNoteData[]) => void;
  /** Callback when a note is created */
  onCreate?: (note: StickyNoteData) => void;
  /** Callback when a note is deleted */
  onDelete?: (noteId: string) => void;
  /** Custom CSS class for wrapper */
  className?: string;
}

export interface StickyNotesInstance {
  element: HTMLElement;
  /** All current notes */
  getNotes: () => StickyNoteData[];
  /** Create a new note */
  createNote: (options?: Partial<StickyNoteData>) => StickyNoteData;
  /** Update a note */
  updateNote: (id: string, updates: Partial<StickyNoteData>) => void;
  /** Delete a note by ID */
  deleteNote: (id: string) => void;
  /** Get a specific note */
  getNote: (id: string) => StickyNoteData | undefined;
  /** Bring note to front */
  bringToFront: (id: string) => void;
  /** Export all notes as JSON */
  exportJson: () => string;
  /** Import notes from JSON */
  importJson: (json: string) => void;
  /** Clear all notes */
  clearAll: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Constants ---

const COLOR_STYLES: Record<NoteColor, { bg: string; border: string; headerBg: string }> = {
  yellow: { bg: "#fef9c3", border: "#fde047", headerBg: "#fde047" },
  pink:   { bg: "#fce7f3", border: "#f9a8d4", headerBg: "#fbcfe8" },
  blue:   { bg: "#dbeafe", border: "#93c5fd", headerBg: "#bfdbfe" },
  green:  { bg: "#dcfce7", border: "#86efac", headerBg: "#bbf7d0" },
  purple: { bg: "#f3e8ff", border: "#c4b5fd", headerBg: "#ddd6fe" },
  white:  { bg: "#ffffff", border: "#e5e7eb", headerBg: "#f3f4f6" },
  orange: { bg: "#ffedd5", border: "#fdba74", headerBg: "#fed7aa" },
  teal:   { bg: "#ccfbf1", border: "#5eead4", headerBg: "#99f6e4" },
};

// --- Helpers ---

function generateId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function snapToGrid(val: number, gridSize: number): number {
  if (gridSize <= 0) return val;
  return Math.round(val / gridSize) * gridSize;
}

// --- Main ---

export function createStickyNotes(options: StickyNotesOptions = {}): StickyNotesInstance {
  const opts = {
    defaultColor: "yellow" as NoteColor,
    defaultSize: [220, 240] as [number, number],
    draggable: true,
    resizable: true,
    collapsible: true,
    pinnable: true,
    confirmDelete: true,
    minSize: [150, 120] as [number, number],
    maxSize: [600, 800] as [number, number],
    snapGrid: 0,
    showTimestamps: false,
    persist: true,
    storageKey: "sticky-notes",
    maxNotes: 50,
    ...options,
  };

  const container = typeof opts.container === "string"
    ? document.querySelector<HTMLElement>(opts.container)!
    : opts.container ?? document.body;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `sticky-notes-wrapper ${opts.className ?? ""}`;
  wrapper.style.cssText = `
    position:${container === document.body ? "fixed" : "absolute"};
    top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:9990;
  `;
  if (container !== document.body) {
    wrapper.style.cssText = wrapper.style.cssText.replace(/fixed/g, "absolute");
  }
  container.style.position = container.style.position || "relative";
  container.appendChild(wrapper);

  // State
  let notes: StickyNoteData[] = [...(options.notes ?? [])];
  let nextZIndex = notes.reduce((max, n) => Math.max(max, n.zIndex), 100);
  let destroyed = false;
  const noteElements = new Map<string, HTMLElement>();
  let activeNoteId: string | null = null;

  // Load persisted
  if (opts.persist && (!options.notes || options.notes.length === 0)) {
    try {
      const stored = localStorage.getItem(opts.storageKey);
      if (stored) notes = JSON.parse(stored);
      nextZIndex = notes.reduce((max, n) => Math.max(max, n.zIndex), 100);
    } catch { /* ignore */ }
  }

  // --- Render Functions ---

  function renderNote(note: StickyNoteData): HTMLElement {
    const colors = COLOR_STYLES[note.color] ?? COLOR_STYLES.yellow;
    const el = document.createElement("div");
    el.className = "sticky-note";
    el.dataset.noteId = note.id;
    el.style.cssText = `
      position:absolute;left:${note.position[0]}px;top:${note.position[1]}px;
      width:${note.size[0]}px;height:${note.collapsed ? "auto" : `${note.size[1]}px`};
      background:${colors.bg};border:1px solid ${colors.border};
      border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.10),0 2px 4px rgba(0,0,0,0.06);
      pointer-events:auto;display:flex;flex-direction:column;
      z-index:${note.zIndex};font-family:-apple-system,sans-serif;
      transition:box-shadow 0.15s;overflow:hidden;min-width:${opts.minSize[0]}px;
    `;

    // Header
    const header = document.createElement("div");
    header.className = "sn-header";
    header.style.cssText = `
      display:flex;align-items:center;padding:6px 8px;gap:4px;
      background:${colors.headerBg};cursor:${opts.draggable ? "grab" : "default"};
      border-bottom:1px solid ${colors.border};user-select:none;-webkit-user-select:none;
      flex-shrink:0;
    `;

    // Pin button
    if (opts.pinnable) {
      const pinBtn = createHeaderBtn(note.pinned ? "📌" : "📍", "Pin note");
      pinBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        updateNote(note.id, { pinned: !note.pinned });
        if (!note.pinned) bringToFront(note.id);
      });
      header.appendChild(pinBtn);
    }

    // Title area / drag handle
    const titleArea = document.createElement("div");
    titleArea.className = "sn-title";
    titleArea.style.cssText = "flex:1;font-size:12px;font-weight:600;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    titleArea.textContent = note.collapsed ? (note.content.replace(/<[^>]*>/g, "").slice(0, 40) || "Empty note") : "";
    if (!note.collapsed) titleArea.style.display = "none";
    header.appendChild(titleArea);

    // Spacer
    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    if (note.collapsed) spacer.style.display = "none";
    header.appendChild(spacer);

    // Collapse button
    if (opts.collapsible) {
      const collapseBtn = createHeaderBtn(note.collapsed ? "+" : "\u2013", note.collapsed ? "Expand" : "Collapse");
      collapseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        updateNote(note.id, { collapsed: !note.collapsed });
      });
      header.appendChild(collapseBtn);
    }

    // Delete button
    const delBtn = createHeaderBtn("\u00D7", "Delete note");
    delBtn.style.color = "#ef4444";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (opts.confirmDelete && confirm("Delete this note?")) {
        deleteNote(note.id);
      } else if (!opts.confirmDelete) {
        deleteNote(note.id);
      }
    });
    header.appendChild(delBtn);

    el.appendChild(header);

    // Content (when not collapsed)
    if (!note.collapsed) {
      const contentEl = document.createElement("div");
      contentEl.className = "sn-content";
      contentEl.contentEditable = "true";
      contentEl.innerHTML = note.content || "<p><br></p>";
      contentEl.style.cssText = `
        flex:1;padding:8px 10px;font-size:13px;line-height:1.5;color:#1f2937;
        outline:none;min-height:80px;overflow-y:auto;word-wrap:break-word;
      `;
      contentEl.addEventListener("input", () => {
        note.content = contentEl.innerHTML;
        note.updatedAt = Date.now();
        saveState();
        opts.onChange?.(notes);
      });

      // Timestamp
      if (opts.showTimestamps) {
        const ts = document.createElement("div");
        ts.style.cssText = "padding:2px 10px 6px;font-size:10px;color:#9ca3af;";
        ts.textContent = `Updated: ${new Date(note.updatedAt).toLocaleString()}`;
        contentEl.appendChild(ts);
      }

      el.appendChild(contentEl);
    }

    // Resize handles
    if (opts.resizable && !note.collapsed) {
      const handles = ["se", "sw", "ne", "nw", "n", "s", "e", "w"];
      for (const pos of handles) {
        const handle = document.createElement("div");
        handle.className = `sn-resize sn-resize-${pos}`;
        const isCorner = pos.length === 2;
        handle.style.cssText = `
          position:absolute;${pos.includes("s") ? "bottom:-3px;" : ""}${pos.includes("n") ? "top:-3px;" : ""}
          ${pos.includes("e") ? "right:-3px;" : ""}${pos.includes("w") ? "left:-3px;" : ""}
          width:${isCorner ? "8px" : "14px"};height:${isCorner ? "8px" : "14px"};
          cursor:${pos}-resize;z-index:2;
        `;
        setupResize(handle, note.id, pos);
        el.appendChild(handle);
      }
    }

    // Drag setup
    if (opts.draggable) {
      setupDrag(header, note.id);
    }

    // Focus handling (bring to front on click)
    el.addEventListener("mousedown", () => bringToFront(note.id));

    return el;
  }

  function createHeaderBtn(label: string, title: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = title;
    btn.textContent = label;
    btn.style.cssText = `
      display:flex;align-items:center;justify-content:center;
      width:22px;height:22px;border:none;background:none;
      cursor:pointer;border-radius:4px;font-size:13px;
      transition:background 0.1s;color:#6b7280;flex-shrink:0;padding:0;
    `;
    btn.addEventListener("mouseenter", () => btn.style.background = "rgba(0,0,0,0.06)");
    btn.addEventListener("mouseleave", () => btn.style.background = "none");
    return btn;
  }

  // --- Drag & Resize ---

  function setupDrag(handle: HTMLElement, noteId: string): void {
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    handle.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).closest(".sn-header-btn")) return;
      e.preventDefault();

      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const el = noteElements.get(noteId)!;
      activeNoteId = noteId;

      startX = e.clientX;
      startY = e.clientY;
      startLeft = note.position[0];
      startTop = note.position[1];

      handle.style.cursor = "grabbing";

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        if (opts.snapGrid > 0) {
          newLeft = snapToGrid(newLeft, opts.snapGrid);
          newTop = snapToGrid(newTop, opts.snapGrid);
        }

        note.position[0] = newLeft;
        note.position[1] = newTop;
        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
      };

      const onUp = () => {
        handle.style.cursor = "grab";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        saveState();
        opts.onChange?.(notes);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function setupResize(handle: HTMLElement, noteId: string, _position: string): void {
    let startX = 0, startY = 0, startW = 0, startH = 0;

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const el = noteElements.get(noteId)!;

      startX = e.clientX;
      startY = e.clientY;
      startW = note.size[0];
      startH = note.size[1];

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        let newW = startW + dx;
        let newH = startH + dy;

        // Handle different resize directions
        if (_position.includes("w")) {
          const clampedW = clamp(newW, opts.minSize[0], opts.maxSize[0]);
          const wDiff = clampedW - startW;
          note.position[0] -= wDiff;
          newW = clampedW;
        }
        if (_position.includes("n")) {
          const clampedH = clamp(newH, opts.minSize[1], opts.maxSize[1]);
          const hDiff = clampedH - startH;
          note.position[1] -= hDiff;
          newH = clampedH;
        }
        if (_position.includes("e") || _position.includes("s")) {
          newW = clamp(newW, opts.minSize[0], opts.maxSize[0]);
          newH = clamp(newH, opts.minSize[1], opts.maxSize[1]);
        }

        note.size[0] = newW;
        note.size[1] = newH;
        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
        el.style.left = `${note.position[0]}px`;
        el.style.top = `${note.position[1]}px`;
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        note.updatedAt = Date.now();
        saveState();
        opts.onChange?.(notes);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  // --- State Management ---

  function renderAll(): void {
    // Clear existing elements
    for (const [, el] of noteElements) el.remove();
    noteElements.clear();

    // Sort by z-index then creation time
    const sorted = [...notes].sort((a, b) => a.zIndex - b.zIndex || a.createdAt - b.createdAt);

    for (const note of sorted) {
      const el = renderNote(note);
      noteElements.set(note.id, el);
      wrapper.appendChild(el);
    }
  }

  function saveState(): void {
    if (opts.persist) {
      try { localStorage.setItem(opts.storageKey, JSON.stringify(notes)); } catch { /* ignore */ }
    }
  }

  function bringToFront(id: string): void {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    // Pinned notes always stay above non-pinned
    const maxZOfSameType = notes
      .filter(n => n.pinned === note.pinned)
      .reduce((max, n) => Math.max(max, n.zIndex), 0);

    note.zIndex = maxZOfSameType + 1;
    nextZIndex = Math.max(nextZIndex, note.zIndex + 1);

    const el = noteElements.get(id);
    if (el) el.style.zIndex = String(note.zIndex);
  }

  // --- Public API ---

  function createNote(extra?: Partial<StickyNoteData>): StickyNoteData {
    if (notes.length >= opts.maxNotes) {
      console.warn(`Sticky Notes: max limit of ${opts.maxNotes} reached`);
      return notes[notes.length - 1]!;
    }

    const now = Date.now();
    const note: StickyNoteData = {
      id: generateId(),
      content: "",
      color: extra?.color ?? opts.defaultColor,
      position: extra?.position ?? [
        50 + (notes.length % 5) * 30,
        50 + Math.floor(notes.length / 5) * 30,
      ],
      size: extra?.size ?? [...opts.defaultSize],
      zIndex: ++nextZIndex,
      pinned: extra?.pinned ?? false,
      collapsed: extra?.collapsed ?? false,
      createdAt: now,
      updatedAt: now,
      ...extra,
    };

    notes.push(note);
    const el = renderNote(note);
    noteElements.set(note.id, el);
    wrapper.appendChild(el);
    saveState();
    opts.onCreate?.(note);
    opts.onChange?.(notes);

    // Focus the contenteditable
    setTimeout(() => {
      const contentEl = el.querySelector(".sn-content") as HTMLElement | null;
      contentEl?.focus();
    }, 50);

    return note;
  }

  function updateNote(id: string, updates: Partial<StickyNoteData>): void {
    const idx = notes.findIndex(n => n.id === id);
    if (idx < 0) return;

    Object.assign(notes[idx], updates);
    notes[idx].updatedAt = Date.now();

    // Re-render this note
    const oldEl = noteElements.get(id);
    oldEl?.remove();

    const newEl = renderNote(notes[idx]!);
    noteElements.set(id, newEl);
    wrapper.appendChild(newEl);

    saveState();
    opts.onChange?.(notes);
  }

  function deleteNote(id: string): void {
    notes = notes.filter(n => n.id !== id);
    const el = noteElements.get(id);
    if (el) {
      el.style.transform = "scale(0.8)";
      el.style.opacity = "0";
      el.style.transition = "all 0.2s ease";
      setTimeout(() => { el.remove(); noteElements.delete(id); }, 200);
    }
    saveState();
    opts.onDelete?.(id);
    opts.onChange?.(notes);
  }

  // Initialize
  renderAll();

  // Keyboard shortcut: Ctrl/Cmd+N for new note
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "n" && !destroyed) {
      e.preventDefault();
      createNote();
    }
    // Delete or Backspace when focused on empty note
    if ((e.key === "Delete" || e.key === "Backspace") && activeNoteId) {
      const activeEl = noteElements.get(activeNoteId);
      const focused = document.activeElement;
      if (focused === activeEl || activeEl?.contains(focused)) {
        // Only if content is empty-ish
        const note = notes.find(n => n.id === activeNoteId);
        if (note && (!note.content || note.content.replace(/<[^>]*>/g, "").trim().length === 0)) {
          deleteNote(activeNoteId);
        }
      }
    }
  });

  // Instance
  const instance: StickyNotesInstance = {
    element: wrapper,

    getNotes() { return [...notes] },

    createNote,

    updateNote,

    deleteNote,

    getNote(id) { return notes.find(n => n.id === id); },

    bringToFront,

    exportJson() { return JSON.stringify(notes, null, 2); },

    importJson(json: string) {
      try {
        const imported = JSON.parse(json) as StickyNoteData[];
        if (Array.isArray(imported)) {
          for (const note of imported) {
            if (!notes.find(n => n.id === note.id)) {
              notes.push(note);
            }
          }
          renderAll();
          saveState();
        }
      } catch { /* invalid json */ }
    },

    clearAll() {
      if (confirm("Clear all notes?")) {
        notes = [];
        for (const [, el] of noteElements) el.remove();
        noteElements.clear();
        saveState();
        opts.onChange?.(notes);
      }
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
    },
  };

  return instance;
}
