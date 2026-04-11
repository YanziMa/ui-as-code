/**
 * Inline Edit: In-place text editing component with click-to-edit,
 * validation, keyboard shortcuts (Enter/Escape), auto-resize,
 * blur-save, loading state, and multi-line support.
 */

// --- Types ---

export interface InlineEditOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial value */
  value?: string;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Edit mode trigger: "click" | "doubleclick" | "focus" (default: "click") */
  trigger?: "click" | "doubleclick" | "focus";
  /** Whether to allow multiline editing (default: false) */
  multiline?: boolean;
  /** Max length for single-line input */
  maxLength?: number;
  /** Min rows for textarea */
  minRows?: number;
  /** Max rows for textarea (auto-grows up to this) */
  maxRows?: number;
  /** Validation function returning error message or null */
  validate?: (value: string) => string | null;
  /** Whether to save on blur (default: true) */
  saveOnBlur?: boolean;
  /** Whether to save on Enter key (single-line only, default: true) */
  saveOnEnter?: boolean;
  /** Whether to cancel on Escape (default: true) */
  cancelOnEscape?: true;
  /** Show save/cancel buttons (default: false for single-line, true for multiline) */
  showButtons?: boolean;
  /** Save button text */
  saveLabel?: string;
  /** Cancel button text */
  cancelLabel?: string;
  /** CSS class for the display element */
  displayClassName?: string;
  /** CSS class for the edit element */
  editClassName?: string;
  /** Callback when value is saved */
  onSave?: (value: string) => void | Promise<void>;
  /** Callback when edit is cancelled */
  onCancel?: (originalValue: string) => void;
  /** Callback when entering edit mode */
  onEditStart?: () => void;
  /** Callback when leaving edit mode */
  onEditEnd?: () => void;
  /** Whether the field is disabled/read-only (default: false) */
  disabled?: boolean;
  /** Select all text on enter edit mode (default: true) */
  selectAllOnEdit?: boolean;
  /** Custom sanitizer applied before saving */
  sanitize?: (value: string) => string;
}

export interface InlineEditInstance {
  /** Root container element */
  element: HTMLElement;
  /** Current value */
  getValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Current editing state */
  getEditing: () => boolean;
  /** Enter edit mode */
  startEditing: () => void;
  /** Exit edit mode (save if changed) */
  stopEditing: () => void;
  /** Cancel edit (revert to original) */
  cancel: () => void;
  /** Focus the editor */
  focus: () => void;
  /** Disable/enable editing */
  setDisabled: (disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createInlineEdit(options: InlineEditOptions): InlineEditInstance {
  const opts = {
    placeholder: "Click to edit...",
    trigger: "click" as const,
    multiline: false,
    saveOnBlur: true,
    saveOnEnter: true,
    cancelOnEscape: true,
    showButtons: false,
    saveLabel: "Save",
    cancelLabel: "Cancel",
    selectAllOnEdit: true,
    disabled: false,
    minRows: 2,
    maxRows: 6,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)
    : options.container;

  if (!container) throw new Error("InlineEdit: container not found");

  let currentValue = opts.value ?? "";
  let originalValue = currentValue;
  let isEditing = false;
  let isSaving = false;

  // --- Display Element ---

  const displayEl = document.createElement("div");
  displayEl.className = `inline-edit-display ${opts.displayClassName ?? ""}`;
  displayEl.style.cssText = `
    min-height:1.5em;padding:4px 8px;border-radius:4px;cursor:text;
    transition:background 0.15s;word-break:break-word;
  `;
  updateDisplayText();

  // --- Edit Element ---

  let editEl: HTMLInputElement | HTMLTextAreaElement;

  if (opts.multiline) {
    editEl = document.createElement("textarea");
    Object.assign(editEl.style, {
      width: "100%", padding: "6px 8px", border: "1px solid #3b82f6",
      borderRadius: "6px", fontSize: "inherit", fontFamily: "inherit",
      resize: "vertical", outline: "none", boxSizing: "border-box",
      lineHeight: "1.5",
    });
    (editEl as HTMLTextAreaElement).minLength = undefined;
  } else {
    editEl = document.createElement("input");
    editEl.type = "text";
    Object.assign(editEl.style, {
      width: "100%", padding: "6px 8px", border: "1px solid #3b82f6",
      borderRadius: "6px", fontSize: "inherit", fontFamily: "inherit",
      outline: "none", boxSizing: "border-box",
    });
  }

  editEl.className = `inline-edit-input ${opts.editClassName ?? ""}`;
  editEl.placeholder = opts.placeholder!;
  if (opts.maxLength && !opts.multiline) (editEl as HTMLInputElement).maxLength = opts.maxLength;
  editEl.style.display = "none";

  // --- Buttons (for multiline or explicit showButtons) ---

  const buttonRow = document.createElement("div");
  buttonRow.style.cssText = "display:none;gap:8px;margin-top:6px;justify-content:flex-end;";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = opts.saveLabel!;
  saveBtn.style.cssText = "padding:4px 14px;background:#3b82f6;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;";
  saveBtn.addEventListener("click", handleSave);

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = opts.cancelLabel!;
  cancelBtn.style.cssText = "padding:4px 14px;background:#fff;color:#6b7280;border:1px solid #d1d5db;border-radius:4px;font-size:13px;cursor:pointer;";
  cancelBtn.addEventListener("click", handleCancel);

  buttonRow.appendChild(saveBtn);
  buttonRow.appendChild(cancelBtn);

  // --- Assemble ---

  container.appendChild(displayEl);
  container.appendChild(editEl);
  container.appendChild(buttonRow);

  // --- Event Handlers ---

  function updateDisplayText(): void {
    if (!currentValue) {
      displayEl.innerHTML = `<span style="color:#9ca3af">${opts.placeholder}</span>`;
    } else {
      displayEl.textContent = currentValue;
    }
  }

  function enterEditMode(): void {
    if (isEditing || opts.disabled || isSaving) return;
    isEditing = true;
    originalValue = currentValue;

    displayEl.style.display = "none";
    editEl.style.display = "";
    editEl.value = currentValue;

    // Auto-size textarea
    if (opts.multiline) autoResizeTextarea();

    // Show buttons if needed
    const shouldShowButtons = opts.showButtons || opts.multiline;
    buttonRow.style.display = shouldShowButtons ? "flex" : "none";

    opts.onEditStart?.();
    editEl.focus();

    if (opts.selectAllOnEdit) editEl.select();

    // Highlight border on hover
    displayEl.style.background = "";
  }

  function exitEditMode(save: boolean): void {
    if (!isEditing) return;

    if (save) {
      handleSave();
    } else {
      handleCancel();
    }
  }

  async function handleSave(): Promise<void> {
    if (isSaving) return;

    let newValue = editEl.value;

    // Sanitize
    if (opts.sanitize) newValue = opts.sanitize(newValue);

    // Validate
    if (opts.validate) {
      const err = opts.validate(newValue);
      if (err) {
        editEl.style.borderColor = "#ef4444";
        // Shake animation
        editEl.style.animation = "shake 0.3s ease-in-out";
        setTimeout(() => { editEl.style.animation = ""; }, 300);
        return;
      }
    }

    isSaving = true;
    currentValue = newValue;

    try {
      await opts.onSave?.(currentValue);
    } catch {
      // Save callback failed — revert
      currentValue = originalValue;
      isSaving = false;
      return;
    }

    isSaving = false;
    finishEditing();
  }

  function handleCancel(): void {
    currentValue = originalValue;
    opts.onCancel?.(originalValue);
    finishEditing();
  }

  function finishEditing(): void {
    isEditing = false;
    editEl.style.display = "none";
    editEl.style.borderColor = "#3b82f6";
    buttonRow.style.display = "none";
    displayEl.style.display = "";
    updateDisplayText();
    opts.onEditEnd?.();
  }

  function autoResizeTextarea(): void {
    const ta = editEl as HTMLTextAreaElement;
    ta.style.height = "auto";
    const minH = (opts.minRows ?? 2) * 24;
    const maxH = (opts.maxRows ?? 6) * 24;
    const scrollH = Math.min(ta.scrollHeight, maxH);
    ta.style.height = `${Math.max(minH, scrollH)}px`;
  }

  // --- Display interactions ---

  if (opts.trigger === "click") {
    displayEl.addEventListener("click", enterEditMode);
  } else if (opts.trigger === "doubleclick") {
    displayEl.addEventListener("dblclick", enterEditMode);
  }

  displayEl.addEventListener("mouseenter", () => {
    if (!isEditing && !opts.disabled) displayEl.style.background = "#f3f4f6";
  });

  displayEl.addEventListener("mouseleave", () => {
    if (!isEditing) displayEl.style.background = "";
  });

  // --- Editor keyboard events ---

  editEl.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !opts.multiline) {
      e.preventDefault();
      if (opts.saveOnEnter) handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (opts.cancelOnEscape) handleCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (opts.saveOnBlur) handleSave();
    }
  });

  if (opts.multiline) {
    editEl.addEventListener("input", autoResizeTextarea);
  }

  editEl.addEventListener("blur", () => {
    // Delay to allow click on buttons to register first
    if (opts.saveOnBlur && !(opts.showButtons || opts.multiline)) {
      setTimeout(() => { if (isEditing) handleSave(); }, 150);
    }
  });

  // --- Instance ---

  const instance: InlineEditInstance = {
    get element() { return container; },

    getValue: () => currentValue,

    setValue(val: string) {
      currentValue = val;
      if (!isEditing) updateDisplayText();
      else editEl.value = val;
    },

    getEditing: () => isEditing,

    startEditing: enterEditMode,

    stopEditing() { exitEditMode(true); },

    cancel: handleCancel,

    focus: () => { if (isEditing) editEl.focus(); else enterEditMode(); },

    setDisabled(disabled: boolean) {
      opts.disabled = disabled;
      displayEl.style.cursor = disabled ? "default" : "text";
      displayEl.style.opacity = disabled ? "0.6" : "1";
    },

    destroy() {
      displayEl.removeEventListener("click", enterEditMode);
      displayEl.removeEventListener("dblclick", enterEditMode);
      editEl.removeEventListener("keydown", () => {});
      editEl.remove();
      displayEl.remove();
      buttonRow.remove();
    },
  };

  return instance;
}
