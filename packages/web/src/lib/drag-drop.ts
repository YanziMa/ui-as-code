/**
 * Drag and drop utilities with file handling, zone detection, and sorting support.
 */

export interface DragItem {
  id: string;
  type: string;
  data: unknown;
  element?: HTMLElement;
}

export interface DropZoneConfig {
  /** Accepted types (empty = accept all) */
  acceptedTypes?: string[];
  /** Multiple files allowed? */
  multiple?: boolean;
  /** Max file size in bytes (0 = unlimited) */
  maxSize?: number;
  /** Allowed extensions (e.g., ['.png', '.jpg']) */
  acceptedExtensions?: string[];
  /** Handler when files are dropped */
  onDrop: (files: File[], items: DragItem[]) => void;
  /** Handler when dragging over */
  onDragEnter?: (event: DragEvent) => void;
  /** Handler when drag leaves */
  onDragLeave?: (event: DragEvent) => void;
  /** Handler during drag over (for highlighting) */
  onDragOver?: (event: DragEvent) => void;
  /** Custom validation */
  validateFile?: (file: File) => string | null; // Return error message or null
}

export interface DndState {
  isDragging: boolean;
  isOverZone: boolean;
  draggedFiles: File[];
  draggedItems: DragItem[];
  errors: string[];
  dropZoneActive: boolean;
}

/** Create a drop zone on an element */
export function createDropZone(
  element: HTMLElement,
  config: DropZoneConfig,
): DropZoneController {
  let counter = 0;
  let state: DndState = {
    isDragging: false,
    isOverZone: false,
    draggedFiles: [],
    draggedItems: [],
    errors: [],
    dropZoneActive: false,
  };

  const listeners: Array<(state: DndState) => void> = [];

  function emit() {
    for (const listener of listeners) listener({ ...state });
  }

  function handleDragEnter(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    counter++;

    if (counter === 1) {
      state.isDragging = true;
      state.isOverZone = true;
      state.dropZoneActive = true;
      config.onDragEnter?.(e);
      emit();
    }
  }

  function handleDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    counter--;

    if (counter === 0) {
      state.isOverZone = false;
      state.dropZoneActive = false;
      config.onDragLeave?.(e);
      emit();
    }
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    config.onDragOver?.(e);
  }

  async function handleDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    counter = 0;

    state.isDragging = false;
    state.isOverZone = false;
    state.dropZoneActive = false;
    state.errors = [];
    state.draggedFiles = [];
    state.draggedItems = [];

    // Handle files
    const files = Array.from(e.dataTransfer?.files ?? []);
    const validFiles: File[] = [];

    for (const file of files) {
      // Check extension
      if (config.acceptedExtensions?.length) {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!config.acceptedExtensions.includes(ext)) {
          state.errors.push(`File type not allowed: ${file.name}`);
          continue;
        }
      }

      // Check size
      if (config.maxSize && file.size > config.maxSize) {
        state.errors.push(`File too large: ${file.name}`);
        continue;
      }

      // Custom validation
      if (config.validateFile) {
        const err = config.validateFile(file);
        if (err) {
          state.errors.push(err);
          continue;
        }
      }

      validFiles.push(file);
    }

    // Handle items (non-file drag data)
    const items: DragItem[] = [];
    if (e.dataTransfer?.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === "string") {
          try {
            const data = await new Promise<string>((resolve) => {
              item.getAsString(resolve);
            });

            let parsed: unknown;
            try {
              parsed = JSON.parse(data);
            } catch {
              parsed = data;
            }

            items.push({
              id: `item-${i}`,
              type: item.type || "text",
              data: parsed,
            });
          } catch {
            // Skip unreadable items
          }
        }
      }
    }

    // Enforce single file mode
    if (!config.multiple && validFiles.length > 1) {
      state.draggedFiles = [validFiles[0]!];
      state.errors.push("Only one file is allowed");
    } else {
      state.draggedFiles = validFiles;
    }

    state.draggedItems = items;
    emit();

    if (validFiles.length > 0 || items.length > 0) {
      config.onDrop(validFiles, items);
    }
  }

  // Attach event listeners
  element.addEventListener("dragenter", handleDragEnter);
  element.addEventListener("dragleave", handleDragLeave);
  element.addEventListener("dragover", handleDragOver);
  element.addEventListener("drop", handleDrop);

  return {
    getState(): DndState {
      return { ...state };
    },

    subscribe(listener: (state: DndState) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    destroy(): void {
      element.removeEventListener("dragenter", handleDragEnter);
      element.removeEventListener("dragleave", handleDragLeave);
      element.removeEventListener("dragover", handleDragOver);
      element.removeEventListener("drop", handleDrop);
      listeners.clear();
    },

    reset(): void {
      counter = 0;
      state = {
        isDragging: false,
        isOverZone: false,
        draggedFiles: [],
        draggedItems: [],
        errors: [],
        dropZoneActive: false,
      };
      emit();
    },
  };
}

export type DropZoneController = ReturnType<typeof createDropZone>;

// --- File Utilities ---

/** Read dropped file as text */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Read dropped file as data URL */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Read dropped file as ArrayBuffer */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Get file info object */
export function getFileInfo(file: File): FileInfo {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return {
    name: file.name,
    size: file.size,
    type: file.type || guessMimeType(ext),
    extension: ext,
    lastModified: new Date(file.lastModified),
    isImage: file.type.startsWith("image/"),
    isText: isTextFile(file),
  };
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  extension: string;
  lastModified: Date;
  isImage: boolean;
  isText: boolean;
}

/** Guess MIME type from extension */
function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    pdf: "application/pdf", json: "application/json",
    js: "application/javascript", ts: "application/typescript",
    html: "text/html", css: "text/css", md: "text/markdown",
    csv: "text/csv", xml: "application/xml",
    zip: "application/zip", gz: "application/gzip",
  };
  return map[ext] ?? "application/octet-stream";
}

/** Check if file looks like text */
function isTextFile(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  if (["application/json", "application/javascript", "application/typescript"].includes(file.type))
    return true;
  const textExts = ["txt", "md", "csv", "html", "css", "js", "ts", "jsx", "tsx", "json", "xml", "yaml", "yml"];
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return textExts.includes(ext);
}

// --- Sortable List Utilities ---

export interface SortableItem {
  id: string;
  index: number;
  element: HTMLElement;
}

export interface SortableConfig {
  /** Handle selector (empty = entire item is handle) */
  handleSelector?: string;
  /** Group name for multi-list sorting */
  group?: string;
  /** Animation duration in ms */
  animationMs?: number;
  /** Threshold before drag starts (px) */
  threshold?: number;
  /** Called when order changes */
  onReorder: (oldIndex: number, newIndex: number, itemId: string) => void;
  /** Called when drag starts */
  onDragStart?: (itemId: string) => void;
  /** Called when drag ends */
  onDragEnd?: (itemId: string) => void;
}

/** Create a sortable list */
export function createSortableList(
  container: HTMLElement,
  items: SortableItem[],
  config: SortableConfig,
): SortableController {
  let draggedItem: SortableItem | null = null;
  let placeholder: HTMLElement | null = null;
  let startY = 0;
  let startX = 0;
  let startIndex = -1;

  function getItemFromPoint(x: number, y: number): SortableItem | null {
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      const item = items.find((i) => i.element === el || i.element.contains(el));
      if (item && item !== draggedItem) return item;
    }
    return null;
  }

  function handlePointerDown(e: PointerEvent): void {
    const target = e.target as HTMLElement;

    // Check handle selector
    if (config.handleSelector && !target.closest(config.handleSelector)) return;

    const itemEl = target.closest("[data-sortable-id]") as HTMLElement | null;
    if (!itemEl) return;

    const itemId = itemEl.dataset.sortableId;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    draggedItem = item;
    startIndex = item.index;
    startY = e.clientY;
    startX = e.clientX;

    config.onDragStart?.(itemId);

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!draggedItem) return;

    const threshold = config.threshold ?? 5;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);

    if (dx < threshold && dy < threshold) return;

    // Create placeholder if needed
    if (!placeholder) {
      placeholder = document.createElement("div");
      placeholder.className = "sortable-placeholder";
      placeholder.style.cssText = `
        height: ${draggedItem.element.offsetHeight}px;
        background: rgba(99, 102, 241, 0.1);
        border: 2px dashed #6366f1;
        border-radius: 4px;
        margin-bottom: 4px;
      `;
      draggedItem.element.parentNode!.insertBefore(placeholder, draggedItem.element.nextSibling);
      draggedItem.element.style.position = "fixed";
      draggedItem.element.style.zIndex = "1000";
      draggedItem.element.style.opacity = "0.9";
      draggedItem.element.style.boxShadow = "0 8px 30px rgba(0,0,0,0.2)";
      draggedItem.element.style.pointerEvents = "none";
    }

    // Move the dragged element
    draggedItem.element.style.left = `${e.clientX - draggedItem.element.offsetWidth / 2}px`;
    draggedItem.element.style.top = `${e.clientY - 10}px`;

    // Find item under cursor and swap
    const targetItem = getItemFromPoint(e.clientX, e.clientY);
    if (targetItem && placeholder) {
      const parent = placeholder.parentNode!;
      if (targetItem.element.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING) {
        parent.insertBefore(placeholder, targetItem.element);
      } else {
        parent.insertBefore(placeholder, targetItem.element.nextSibling);
      }
    }
  }

  function handlePointerUp(_e: PointerEvent): void {
    if (!draggedItem) return;

    // Clean up
    if (placeholder && placeholder.parentNode) {
      const newIdx = Array.from(placeholder.parentNode!.children).indexOf(placeholder);
      if (newIdx !== startIndex && newIdx >= 0) {
        config.onReorder(startIndex, newIdx, draggedItem.id);
      }
      placeholder.remove();
      placeholder = null;
    }

    // Reset styles
    draggedItem.element.style.position = "";
    draggedItem.element.style.zIndex = "";
    draggedItem.element.style.opacity = "";
    draggedItem.element.style.boxShadow = "";
    draggedItem.element.style.pointerEvents = "";
    draggedItem.element.style.left = "";
    draggedItem.element.style.top = "";

    config.onDragEnd?.(draggedItem.id);
    draggedItem = null;
    startIndex = -1;

    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
  }

  container.addEventListener("pointerdown", handlePointerDown);

  return {
    destroy(): void {
      container.removeEventListener("pointerdown", handlePointerDown);
    },

    refresh(newItems: SortableItem[]): void {
      items.length = 0;
      items.push(...newItems);
    },
  };
}

export type SortableController = ReturnType<typeof createSortableList>;
