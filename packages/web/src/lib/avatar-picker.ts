/**
 * Avatar Picker: Avatar selection/upload component with initials fallback,
 * image crop/preview, preset avatars, color generation from name,
 * size variants, status indicators, and accessibility.
 */

// --- Types ---

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarShape = "circle" | "rounded" | "square";

export interface PresetAvatar {
  /** Image URL or data URL */
  src: string;
  /** Label */
  label?: string;
}

export interface AvatarPickerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial avatar URL */
  value?: string | null;
  /** User display name for initials fallback */
  name?: string;
  /** Size variant (default: "md") */
  size?: AvatarSize;
  /** Shape variant (default: "circle") */
  shape?: AvatarShape;
  /** Show upload button? (default: true) */
  showUpload?: boolean;
  /** Show remove button? (default: true) */
  showRemove?: boolean;
  /** Show camera icon overlay on hover? (default: true) */
  showCameraOverlay?: boolean;
  /** Accepted file types (default: "image/*") */
  accept?: string;
  /** Max file size in bytes (default: 5MB) */
  maxFileSize?: number;
  /** Preset avatar options */
  presets?: PresetAvatar[];
  /** Color palette for initials background (auto-generated if not set) */
  colors?: string[];
  /** Text color for initials (default: "#fff") */
  textColor?: string;
  /** Font size multiplier for initials (default: 1) */
  fontSizeMultiplier?: number;
  /** Status indicator ("online" | "offline" | "away" | "busy" | null) */
  status?: string | null;
  /** Status position ("bottom-right" | "bottom-left") */
  statusPosition?: "bottom-right" | "bottom-left";
  /** Border width in px (default: 2) */
  borderWidth?: number;
  /** Border color */
  borderColor?: string;
  /** Callback when avatar changes */
  onChange?: (dataUrl: string | null, file?: File) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface AvatarPickerInstance {
  element: HTMLElement;
  /** Get current avatar data URL or null */
  getValue: () => string | null;
  /** Set avatar programmatically */
  setValue: (url: string | null) => void;
  /** Set user name (updates initials) */
  setName: (name: string) => void;
  /** Get initials text */
  getInitials: () => string;
  /** Open file picker */
  openPicker: () => void;
  /** Clear avatar (reverts to initials) */
  clear: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Constants ---

const SIZE_MAP: Record<AvatarSize, { dimension: number; fontSize: number; statusSize: number }> = {
  xs:  { dimension: 24,  fontSize: 9,  statusSize: 6 },
  sm:  { dimension: 32,  fontSize: 11, statusSize: 8 },
  md:  { dimension: 48,  fontSize: 16, statusSize: 12 },
  lg:  { dimension: 64,  fontSize: 22, statusSize: 14 },
  xl:  { dimension: 96,  fontSize: 34, statusSize: 18 },
};

const STATUS_COLORS: Record<string, string> = {
  online: "#22c55e",
  offline: "#9ca3af",
  away:   "#f59e0b",
  busy:   "#ef4444",
};

/** Deterministic color from string hash */
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [
    "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#84cc16", "#10b981", "#06b6d4",
    "#0ea5e9", "#3b82f6",
  ];
  return hues[Math.abs(hash) % hues.length]!;
}

// --- Helpers ---

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// --- Main Factory ---

export function createAvatarPicker(options: AvatarPickerOptions): AvatarPickerInstance {
  const opts = {
    value: options.value ?? null,
    name: options.name ?? "",
    size: options.size ?? "md",
    shape: options.shape ?? "circle",
    showUpload: options.showUpload ?? true,
    showRemove: options.showRemove ?? true,
    showCameraOverlay: options.showCameraOverlay ?? true,
    accept: options.accept ?? "image/*",
    maxFileSize: options.maxFileSize ?? 5 * 1024 * 1024,
    presets: options.presets ?? [],
    textColor: options.textColor ?? "#fff",
    fontSizeMultiplier: options.fontSizeMultiplier ?? 1,
    status: options.status ?? null,
    statusPosition: options.statusPosition ?? "bottom-right",
    borderWidth: options.borderWidth ?? 2,
    borderColor: options.borderColor ?? "#e5e7eb",
    disabled: options.disabled ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AvatarPicker: container not found");

  const sz = SIZE_MAP[opts.size];
  const isCircle = opts.shape === "circle";
  const bgCol = opts.colors?.length
    ? opts.colors[Math.abs(hashCode(opts.name)) % opts.colors.length]!
    : hashColor(opts.name || "User");

  container.className = `avatar-picker ${opts.className ?? ""}`;
  container.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    font-family:-apple-system,sans-serif;position:relative;
  `;

  // State
  let currentUrl: string | null = opts.value;
  let currentName = opts.name;
  let destroyed = false;

  // --- Build DOM ---

  const wrapper = document.createElement("div");
  wrapper.className = "avatar-wrapper";
  wrapper.style.cssText = `
    position:relative;display:inline-flex;align-items:center;justify-content:center;
    cursor:${!opts.disabled ? "pointer" : "default"};
    transition:transform 0.15s ease;
  `;
  container.appendChild(wrapper);

  // Avatar visual element
  const avatarEl = document.createElement("div");
  avatarEl.className = "avatar-visual";
  avatarEl.style.cssText = `
    width:${sz.dimension}px;height:${sz.dimension}px;
    ${isCircle ? "border-radius:50%;" : `border-radius:${opts.shape === "rounded" ? "12px" : "4px"};`}
    border:${opts.borderWidth}px solid ${opts.borderColor};
    overflow:hidden;display:flex;align-items:center;justify-content:center;
    font-weight:600;font-size:${sz.fontSize * opts.fontSizeMultiplier}px;
    user-select:none;-webkit-user-select:none;
    flex-shrink:0;background:${bgCol};color:${opts.textColor};
    transition:opacity 0.15s;
  `;
  wrapper.appendChild(avatarEl);

  // Camera overlay
  let overlayEl: HTMLElement | null = null;
  if (opts.showCameraOverlay && !opts.disabled) {
    overlayEl = document.createElement("div");
    overlayEl.className = "avatar-overlay";
    overlayEl.style.cssText = `
      position:absolute;inset:0;
      ${isCircle ? "border-radius:50%;" : `border-radius:${opts.shape === "rounded" ? "12px" : "4px"};`}
      background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;
      opacity:0;transition:opacity 0.2s;pointer-events:none;
    `;
    overlayEl.innerHTML =
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>`;
    wrapper.appendChild(overlayEl);

    wrapper.addEventListener("mouseenter", () => { if (!opts.disabled) overlayEl!.style.opacity = "1"; });
    wrapper.addEventListener("mouseleave", () => { overlayEl!.style.opacity = "0"; });
  }

  // Status indicator
  let statusEl: HTMLElement | null = null;
  if (opts.status) {
    statusEl = document.createElement("div");
    statusEl.className = "avatar-status";
    const sPos = opts.statusPosition;
    statusEl.style.cssText = `
      position:absolute;${sPos === "bottom-right" ? "right:-2px;bottom:-2px;" : "left:-2px;bottom:-2px;"}
      width:${sz.statusSize}px;height:${sz.statusSize}px;border-radius:50%;
      background:${STATUS_COLORS[opts.status!] ?? "#9ca3af"};
      border:2px solid #fff;flex-shrink:0;z-index:2;
    `;
    wrapper.appendChild(statusEl);
  }

  // Hidden file input
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = opts.accept;
  fileInput.style.display = "none";
  container.appendChild(fileInput);

  // Remove button (shown on hover when avatar is set)
  let removeBtn: HTMLButtonElement | null = null;
  if (opts.showRemove && !opts.disabled) {
    removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.title = "Remove avatar";
    removeBtn.innerHTML = "&times;";
    removeBtn.style.cssText = `
      position:absolute;top:-6px;right:-6px;width:18px;height:18px;
      border-radius:50%;background:#ef4444;color:#fff;border:none;font-size:11px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      opacity:0;transition:opacity 0.15s;z-index:3;padding:0;line-height:1;
    `;
    removeBtn.addEventListener("click", (e) => { e.stopPropagation(); clear(); });
    wrapper.appendChild(removeBtn);

    wrapper.addEventListener("mouseenter", () => {
      if (currentUrl && !opts.disabled && removeBtn) removeBtn.style.opacity = "1";
    });
    wrapper.addEventListener("mouseleave", () => {
      if (removeBtn) removeBtn.style.opacity = "0";
    });
  }

  // Preset grid (if provided)
  let presetGrid: HTMLElement | null = null;
  if (opts.presets.length > 0) {
    presetGrid = document.createElement("div");
    presetGrid.className = "avatar-presets";
    presetGrid.style.cssText = `
      display:none;margin-top:8px;padding:8px;background:#fff;
      border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);
    `;
    const gridInner = document.createElement("div");
    gridInner.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;";

    for (const preset of opts.presets) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = preset.label ?? "Preset avatar";
      btn.style.cssText = `
        width:36px;height:36px;border-radius:50%;border:2px solid transparent;
        padding:0;cursor:pointer;overflow:hidden;transition:border-color 0.15s;
        background:#f3f4f6;
      `;
      const img = document.createElement("img");
      img.src = preset.src;
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
      img.alt = preset.label ?? "";
      btn.appendChild(img);

      btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#6366f1"; });
      btn.addEventListener("mouseleave", () => { btn.style.borderColor = "transparent"; });
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        setValue(preset.src);
        togglePresets(false);
      });

      gridInner.appendChild(btn);
    }

    presetGrid.appendChild(gridInner);
    container.appendChild(presetGrid);
  }

  // --- Rendering ---

  function render(): void {
    // Clear current content
    avatarEl.innerHTML = "";

    if (currentUrl) {
      const img = document.createElement("img");
      img.src = currentUrl;
      img.alt = currentName || "Avatar";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
      img.onerror = () => {
        // Fallback to initials on load error
        currentUrl = null;
        render();
      };
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = getInitials(currentName);
    }

    // Update remove button visibility
    if (removeBtn) {
      removeBtn.style.display = currentUrl ? "" : "none";
    }
  }

  function togglePresets(show: boolean): void {
    if (!presetGrid) return;
    presetGrid.style.display = show ? "block" : "none";
  }

  // --- Event Handlers ---

  function handleFileSelect(file: File): void {
    if (opts.maxFileSize > 0 && file.size > opts.maxFileSize) {
      opts.onError?.(new Error(`File too large (${fmtSize(file.size)}, max ${fmtSize(opts.maxFileSize)})`));
      return;
    }
    if (!file.type.startsWith("image/")) {
      opts.onError?.(new Error("Only image files are accepted"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setValue(dataUrl);
      opts.onChange?.(dataUrl, file);
    };
    reader.onerror = () => opts.onError?.(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener("change", () => {
    if (fileInput.files?.[0]) handleFileSelect(fileInput.files[0]);
    fileInput.value = "";
  });

  // Click to open picker / toggle presets
  wrapper.addEventListener("click", () => {
    if (opts.disabled || destroyed) return;

    if (opts.presets.length > 0 && !currentUrl) {
      const isVisible = presetGrid?.style.display === "block";
      togglePresets(!isVisible);
      if (!isVisible) return;
    }

    if (opts.showUpload) fileInput.click();
  });

  // Keyboard support
  wrapper.setAttribute("tabindex", "0");
  wrapper.setAttribute("role", "button");
  wrapper.setAttribute("aria-label", "Change avatar");
  wrapper.addEventListener("keydown", (e: KeyboardEvent) => {
    if (opts.disabled || destroyed) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (opts.showUpload) fileInput.click();
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      clear();
    }
  });

  // Drag & drop onto the avatar
  if (!opts.disabled) {
    wrapper.addEventListener("dragenter", (e) => { e.preventDefault(); wrapper.style.transform = "scale(1.05)"; });
    wrapper.addEventListener("dragover", (e) => { e.preventDefault(); });
    wrapper.addEventListener("dragleave", (e) => {
      if (!wrapper.contains(e.relatedTarget as Node)) wrapper.style.transform = "";
    });
    wrapper.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      wrapper.style.transform = "";
      const file = e.dataTransfer?.files[0];
      if (file) handleFileSelect(file);
    });
  }

  // Initial render
  render();

  // --- Public API ---

  function getValue(): string | null { return currentUrl; }

  function setValue(url: string | null): void {
    currentUrl = url;
    render();
  }

  function setName(name: string): void {
    currentName = name;
    if (!currentUrl) render();
  }

  function getInitialsFn(): string { return getInitials(currentName); }

  function openPicker(): void {
    if (opts.showUpload && !opts.disabled) fileInput.click();
  }

  function clear(): void {
    currentUrl = null;
    render();
    opts.onChange?.(null);
  }

  function destroy(): void {
    destroyed = true;
    container.innerHTML = "";
    container.style.cssText = "";
  }

  return {
    element: container,
    getValue,
    setValue,
    setName,
    getInitials: getInitialsFn,
    openPicker,
    clear,
    destroy,
  };
}

// --- Utility ---

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
