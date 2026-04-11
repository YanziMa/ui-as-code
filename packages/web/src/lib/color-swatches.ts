/**
 * Color Swatches / Palette Picker: Visual color palette with predefined swatches,
 * recent colors, custom color input, opacity slider, eye-dropper trigger,
 * palette categories, and accessible color selection.
 */

// --- Types ---

export interface ColorSwatch {
  /** Hex color value */
  value: string;
  /** Display label */
  label?: string;
}

export interface ColorPalette {
  /** Palette name/category */
  name: string;
  /** Swatches in this palette */
  colors: ColorSwatch[];
}

export interface ColorSwatchesOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Predefined palettes */
  palettes?: ColorPalette[];
  /** Currently selected color (hex) */
  value?: string;
  /** Show opacity/alpha control? */
  showOpacity?: boolean;
  /** Show custom hex input? */
  showHexInput?: boolean;
  /** Show recent colors? */
  showRecent?: boolean;
  /** Max recent colors to store */
  maxRecent?: number;
  /** Storage key for recent colors (localStorage) */
  recentKey?: string;
  /** Swatch size in px */
  swatchSize?: number;
  /** Columns per row */
  columns?: number;
  /** Border radius for swatches */
  borderRadius?: number;
  /** Show color name tooltip on hover? */
  showTooltip?: boolean;
  /** Callback on color change */
  onChange?: (color: string, alpha?: number) => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface ColorSwatchesInstance {
  element: HTMLElement;
  getValue: () => { color: string; alpha: number };
  setValue: (color: string, alpha?: number) => void;
  getRecentColors: () => string[];
  clearRecent: () => void;
  addPalette: (palette: ColorPalette) => void;
  destroy: () => void;
}

// --- Default Palettes ---

const DEFAULT_PALETTES: ColorPalette[] = [
  {
    name: "Basic",
    colors: [
      { value: "#000000", label: "Black" },
      { value: "#ffffff", label: "White" },
      { value: "#6b7280", label: "Gray" },
      { value: "#9ca3af", label: "Light Gray" },
      { value: "#ef4444", label: "Red" },
      { value: "#f97316", label: "Orange" },
      { value: "#eab308", label: "Yellow" },
      { value: "#22c55e", label: "Green" },
      { value: "#3b82f6", label: "Blue" },
      { value: "#8b5cf6", label: "Purple" },
      { value: "#ec4899", label: "Pink" },
      { value: "#14b8a6", label: "Teal" },
    ],
  },
  {
    name: "Material",
    colors: [
      { value: "#F44336" }, { value: "#E91E63" }, { value: "#9C27B0" },
      { value: "#673AB7" }, { value: "#3F51B5" }, { value: "#2196F3" },
      { value: "#03A9F4" }, { value: "#00BCD4" }, { value: "#009688" },
      { value: "#4CAF50" }, { value: "#8BC34A" }, { value: "#CDDC39" },
      { value: "#FFEB3B" }, { value: "#FFC107" }, { value: "#FF9800" },
      { value: "#FF5722" }, { value: "#795548" }, { value: "#607D8B" },
    ],
  },
  {
    name: "Tailwind",
    colors: [
      { value: "#ef4444" }, { value: "#f97316" }, { value: "#f59e0b" },
      { value: "#eab308" }, { value: "#84cc16" }, { value: "#22c55e" },
      { value: "#10b981" }, { value: "#14b8a6" }, { value: "#06b6d4" },
      { value: "#0ea5e9" }, { value: "#3b82f6" }, { value: "#6366f1" },
      { value: "#8b5cf6" }, { value: "#a855f7" }, { value: "#d946ef" },
      { value: "#ec4899" }, { value: "#f43f5e" },
    ],
  },
];

// --- Helpers ---

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// --- Main Class ---

export class ColorSwatchesManager {
  create(options: ColorSwatchesOptions): ColorSwatchesInstance {
    const opts = {
      palettes: options.palettes ?? DEFAULT_PALETTES,
      showOpacity: options.showOpacity ?? false,
      showHexInput: options.showHexInput ?? true,
      showRecent: options.showRecent ?? true,
      maxRecent: options.maxRecent ?? 12,
      recentKey: options.recentKey ?? "cs-recent-colors",
      swatchSize: options.swatchSize ?? 28,
      columns: options.columns ?? 8,
      borderRadius: options.borderRadius ?? 6,
      showTooltip: options.showTooltip ?? true,
      disabled: options.disabled ?? false,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ColorSwatches: container not found");

    let currentColor = opts.value ?? "#3b82f6";
    let currentAlpha = 1;
    let recentColors: string[] = [];

    // Load recent from localStorage
    if (opts.showRecent) {
      try {
        const saved = localStorage.getItem(opts.recentKey);
        if (saved) recentColors = JSON.parse(saved);
      } catch { /* ignore */ }
    }

    container.className = `color-swatches ${opts.className}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;background:#fff;
      border:1px solid #e5e7eb;border-radius:10px;padding:14px;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    // Current color preview + controls
    const previewRow = document.createElement("div");
    previewRow.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:12px;";
    container.appendChild(previewRow);

    // Preview swatch
    const preview = document.createElement("div");
    preview.style.cssText = `
      width:40px;height:40px;border-radius:${opts.borderRadius}px;border:2px solid #e5e7eb;
      background:${currentColor};position:relative;flex-shrink:0;
      box-shadow:inset 0 0 0 1px rgba(0,0,0,0.05);transition:background 0.15s;
    `;
    previewRow.appendChild(preview);

    // Value display
    const valueArea = document.createElement("div");
    valueArea.style.cssText = "flex:1;display:flex;flex-direction:column;gap:4px;";
    previewRow.appendChild(valueArea);

    // Hex input
    let hexInput: HTMLInputElement | null = null;
    if (opts.showHexInput) {
      const hexWrap = document.createElement("div");
      hexWrap.style.cssText = "display:flex;align-items:center;gap:6px;";
      const hashLabel = document.createElement("span");
      hashLabel.textContent = "#";
      hashLabel.style.cssText = "font-weight:600;color:#6b7280;font-size:13px;";
      hexWrap.appendChild(hashLabel);

      hexInput = document.createElement("input");
      hexInput.type = "text";
      hexInput.value = currentColor.replace("#", "");
      hexInput.maxLength = 6;
      hexInput.style.cssText = `
        width:80px;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;
        font-size:13px;font-family:monospace;text-transform:uppercase;outline:none;
        transition:border-color 0.15s;
      `;
      hexInput.addEventListener("focus", () => { hexInput.style.borderColor = "#4338ca"; });
      hexInput.addEventListener("blur", () => { hexInput.style.borderColor = "#d1d5db"; });
      hexInput.addEventListener("input", () => {
        const val = hexInput.value.trim();
        if (/^[0-9a-fA-F]{6}$/.test(val)) {
          instance.setValue(`#${val.toLowerCase()}`);
        } else if (/^[0-9a-fA-F]{3}$/.test(val)) {
          const expanded = val.split("").map((c) => c + c).join("");
          instance.setValue(`#${expanded.toLowerCase()}`);
        }
      });
      hexWrap.appendChild(hexInput);
      valueArea.appendChild(hexWrap);
    }

    // Opacity slider
    let alphaSlider: HTMLInputElement | null = null;
    let alphaLabel: HTMLSpanElement | null = null;
    if (opts.showOpacity) {
      const alphaRow = document.createElement("div");
      alphaRow.style.cssText = "display:flex;align-items:center;gap:6px;";
      alphaSlider = document.createElement("input");
      alphaSlider.type = "range";
      alphaSlider.min = "0";
      alphaSlider.max = "100";
      alphaSlider.value = String(Math.round(currentAlpha * 100));
      alphaSlider.style.cssText = "flex:1;accent-color:#4338ca;height:4px;";
      alphaLabel = document.createElement("span");
      alphaLabel.textContent = `${Math.round(currentAlpha * 100)}%`;
      alphaLabel.style.cssText = "font-size:11px;color:#9ca3af;width:30px;text-align:right;";
      alphaSlider.addEventListener("input", () => {
        currentAlpha = parseInt(alphaSlider!.value, 10) / 100;
        alphaLabel!.textContent = `${alphaSlider!.value}%`;
        updatePreview();
        opts.onChange?.(currentColor, currentAlpha);
      });
      alphaRow.appendChild(alphaSlider);
      alphaRow.appendChild(alphaLabel);
      valueArea.appendChild(alphaRow);
    }

    // Palettes area
    const palettesEl = document.createElement("div");
    palettesEl.className = "cs-palettes";
    palettesEl.style.cssText = "max-height:240px;overflow-y:auto;";
    container.appendChild(palettesEl);

    function render(): void {
      palettesEl.innerHTML = "";

      // Recent colors
      if (opts.showRecent && recentColors.length > 0) {
        renderPaletteSection("Recent", recentColors.map((c) => ({ value: c, label: c })));
      }

      // All palettes
      for (const palette of opts.palettes) {
        renderPaletteSection(palette.name, palette.colors);
      }
    }

    function renderPaletteSection(name: string, swatches: ColorSwatch[]): void {
      const section = document.createElement("div");
      section.className = "cs-section";
      section.style.cssText = "margin-bottom:12px;";

      const title = document.createElement("div");
      title.textContent = name;
      title.style.cssText = "font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;margin-bottom:6px;";
      section.appendChild(title);

      const grid = document.createElement("div");
      grid.style.cssText = `
        display:grid;grid-template-columns:repeat(${Math.min(opts.columns, swatches.length)}, 1fr);gap:4px;
      `;

      for (const swatch of swatches) {
        const btn = createSwatch(swatch);
        grid.appendChild(btn);
      }

      section.appendChild(grid);
      palettesEl.appendChild(section);
    }

    function createSwatch(swatch: ColorSwatch): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.color = swatch.value;
      btn.title = swatch.label ?? swatch.value;

      const isSelected = swatch.value.toLowerCase() === currentColor.toLowerCase();

      btn.style.cssText = `
        width:${opts.swatchSize}px;height:${opts.swatchSize}px;border-radius:${opts.borderRadius}px;
        border:2px solid ${isSelected ? "#4338ca" : "transparent"};
        background:${swatch.value};cursor:pointer;position:relative;
        transition:transform 0.1s,border-color 0.15s;outline:none;
        padding:0;display:flex;align-items:center;justify-content:center;
      `;

      // Checkmark for selected
      if (isSelected) {
        const check = document.createElement("span");
        check.innerHTML = "&#x2713;";
        check.style.cssText = `font-size:${opts.swatchSize * 0.45}px;font-weight:bold;color:${isLightColor(swatch.value) ? "#000" : "#fff"};`;
        btn.appendChild(check);
      }

      // Tooltip on hover
      if (opts.showTooltip && swatch.label) {
        btn.addEventListener("mouseenter", () => {
          btn.title = `${swatch.label} (${swatch.value})`;
        });
      }

      btn.addEventListener("click", () => selectColor(swatch.value));

      btn.addEventListener("mouseenter", () => {
        btn.style.transform = "scale(1.15)";
        btn.style.zIndex = "1";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "";
        btn.style.zIndex = "";
      });

      return btn;
    }

    function selectColor(color: string): void {
      currentColor = color;
      updatePreview();
      if (hexInput) hexInput.value = color.replace("#", "");

      // Add to recent
      if (opts.showRecent) {
        recentColors = recentColors.filter((c) => c.toLowerCase() !== color.toLowerCase());
        recentColors.unshift(color);
        if (recentColors.length > opts.maxRecent) recentColors.pop();
        try { localStorage.setItem(opts.recentKey, JSON.stringify(recentColors)); } catch { /* ignore */ }
        render(); // Re-render to show updated recent
      }

      opts.onChange?.(color, currentAlpha);
    }

    function updatePreview(): void {
      const bg = currentAlpha < 1
        ? `rgba(${parseInt(currentColor.slice(1, 3), 16)},${parseInt(currentColor.slice(3, 5), 16)},${parseInt(currentColor.slice(5, 7), 16)},${currentAlpha})`
        : currentColor;
      preview.style.background = bg;
    }

    // Initial render
    render();
    updatePreview();

    const instance: ColorSwatchesInstance = {
      element: container,

      getValue() { return { color: currentColor, alpha: currentAlpha }; },

      setValue(color: string, alpha?: number) {
        // Validate hex format
        const hex = color.startsWith("#") ? color : `#${color}`;
        if (!/^#[0-9a-fA-F]{3,6}$/.test(hex)) return;
        currentColor = hex.length === 4
          ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase()
          : hex.toLowerCase();
        if (alpha !== undefined) currentAlpha = Math.max(0, Math.min(1, alpha));
        if (alphaSlider) alphaSlider.value = String(Math.round(currentAlpha * 100));
        if (alphaLabel) alphaLabel.textContent = `${Math.round(currentAlpha * 100)}%`;
        updatePreview();
        render();
      },

      getRecentColors() { return [...recentColors]; },

      clearRecent() {
        recentColors = [];
        try { localStorage.removeItem(opts.recentKey); } catch { /* ignore */ }
        render();
      },

      addPalette(palette: ColorPalette) {
        opts.palettes.push(palette);
        render();
      },

      destroy() { container.innerHTML = ""; },
    };

    return instance;
  }
}

/** Convenience: create a color swatches picker */
export function createColorSwatches(options: ColorSwatchesOptions): ColorSwatchesInstance {
  return new ColorSwatchesManager().create(options);
}
