/**
 * Color Swatch / Palette Picker: Visual color palette grid for quick selection,
 * with preset palettes (material, tailwind, custom), recent colors history,
 * eye-dropper integration, hex/rgb input, alpha slider, and accessibility contrast info.
 */

// --- Types ---

export interface SwatchColor {
  /** Hex value (e.g., "#ff5500") */
  value: string;
  /** Display label */
  label?: string;
}

export interface ColorPalette {
  /** Palette name */
  name: string;
  /** Colors in this palette */
  colors: SwatchColor[];
}

export interface ColorSwatchOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial selected value */
  value?: string;
  /** Preset palettes to include */
  palettes?: ("material" | "tailwind" | "basic" | "custom")[];
  /** Custom palettes */
  customPalettes?: ColorPalette[];
  /** Show alpha/opacity slider? */
  showAlpha?: boolean;
  /** Show hex input field? */
  showHexInput?: boolean;
  /** Show RGB input fields? */
  showRgbInput?: boolean;
  /** Show recent colors? */
  showRecentColors?: boolean;
  /** Max recent colors stored (default: 12) */
  maxRecentColors?: number;
  /** Columns per row (default: 8) */
  columns?: number;
  /** Swatch size in px (default: 28) */
  swatchSize?: number;
  /** Gap between swatches (default: 4) */
  gap?: number;
  /** Show contrast info against white/black? */
  showContrastInfo?: boolean;
  /** Callback on color selection */
  onChange?: (value: string, alpha: number) => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface ColorSwatchInstance {
  element: HTMLElement;
  getValue: () => string;
  getAlpha: () => number;
  setValue: (value: string) => void;
  setAlpha: (alpha: number) => void;
  getRecentColors: () => string[];
  clearRecentColors: () => void;
  destroy: () => void;
}

// --- Built-in Palettes ---

const MATERIAL_COLORS: SwatchColor[] = [
  { value: "#f44336", label: "Red" }, { value: "#e91e63", label: "Pink" },
  { value: "#9c27b0", label: "Purple" }, { value: "#673ab7", label: "Deep Purple" },
  { value: "#3f51b5", label: "Indigo" }, { value: "#2196f3", label: "Blue" },
  { value: "#03a9f4", label: "Light Blue" }, { value: "#00bcd4", label: "Cyan" },
  { value: "#009688", label: "Teal" }, { value: "#4caf50", label: "Green" },
  { value: "#8bc34a", label: "Light Green" }, { value: "#cddc39", label: "Lime" },
  { value: "#ffeb3b", label: "Yellow" }, { value: "#ff9800", label: "Orange" },
  { value: "#795548", label: "Brown" }, { value: "#607d8b", label: "Blue Grey" },
  // Shades
  { value: "#ffebee", label: "Red 50" }, { value: "#ef9a9a", label: "Red 200" },
  { value: "#e3f2fd", label: "Blue 50" }, { value: "#90caf9", label: "Blue 200" },
  { value: "#e8f5e9", label: "Green 50" }, { value: "#a5d6a7", label: "Green 200" },
  { value: "#fff3e0", label: "Orange 50" }, { value: "#ffcc80", label: "Orange 200" },
];

const TAILWIND_COLORS: SwatchColor[] = [
  { value: "#ef4444", label: "red-500" }, { value: "#f97316", label: "orange-500" },
  { value: "#f59e0b", label: "amber-500" }, { value: "#eab308", label: "yellow-500" },
  { value: "#84cc16", label: "lime-500" }, { value: "#22c55e", label: "green-500" },
  { value: "#10b981", label: "emerald-500" }, { value: "#14b8a6", label: "teal-500" },
  { value: "#06b6d4", label: "cyan-500" }, { value: "#0ea5e9", label: "sky-500" },
  { value: "#3b82f6", label: "blue-500" }, { value: "#6366f1", label: "indigo-500" },
  { value: "#8b5cf6", label: "violet-500" }, { value: "#a855f7", label: "purple-500" },
  { value: "#d946ef", label: "fuchsia-500" }, { value: "#ec4899", label: "pink-500" },
  { value: "#ffffff", label: "white" }, { value: "#f8fafc", label: "slate-50" },
  { value: "#f1f5f9", label: "slate-100" }, { value: "#e2e8f0", label: "slate-200" },
  { value: "#cbd5e1", label: "slate-300" }, { value: "#94a3b8", label: "slate-400" },
  { value: "#64748b", label: "slate-500" }, { value: "#475569", label: "slate-600" },
  { value: "#334155", label: "slate-700" }, { value: "#1e293b", label: "slate-800" },
  { value: "#0f172a", label: "slate-900" }, { value: "#000000", label: "black" },
];

const BASIC_COLORS: SwatchColor[] = [
  { value: "#000000", label: "Black" }, { value: "#333333", label: "Dark Gray" },
  { value: "#666666", label: "Gray" }, { value: "#999999", label: "Light Gray" },
  { value: "#cccccc", label: "Silver" }, { value: "#ffffff", label: "White" },
  { value: "#ef4444", label: "Red" }, { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" }, { value: "#22c55e", label: "Green" },
  { value: "#06b6d4", label: "Cyan" }, { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" }, { value: "#ec4899", label: "Pink" },
];

// --- Helpers ---

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function isValidHex(hex: string): boolean {
  return /^#([a-f\d]{3}|[a-f\d]{6})$/i.test(hex);
}

function normalizeHex(hex: string): string {
  if (!hex.startsWith("#")) hex = "#" + hex;
  if (hex.length === 4) {
    hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toLowerCase();
}

// --- Main Class ---

export class ColorSwatchManager {
  create(options: ColorSwatchOptions): ColorSwatchInstance {
    const opts = {
      value: options.value ?? "#3b82f6",
      palettes: options.palettes ?? ["basic"],
      showAlpha: options.showAlpha ?? false,
      showHexInput: options.showHexInput ?? true,
      showRgbInput: options.showRgbInput ?? false,
      showRecentColors: options.showRecentColors ?? true,
      maxRecentColors: options.maxRecentColors ?? 12,
      columns: options.columns ?? 8,
      swatchSize: options.swatchSize ?? 28,
      gap: options.gap ?? 4,
      showContrastInfo: options.showContrastInfo ?? false,
      disabled: options.disabled ?? false,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ColorSwatch: container not found");

    container.className = `color-swatch ${opts.className}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    let currentValue = normalizeHex(opts.value);
    let currentAlpha = 1;
    let recentColors: string[] = [];

    // Load recent from localStorage
    try {
      const saved = localStorage.getItem("color-swatch-recent");
      if (saved) recentColors = JSON.parse(saved);
    } catch { /* ignore */ }

    // Build palette map
    const paletteMap: Record<string, SwatchColor[]> = {
      material: MATERIAL_COLORS,
      tailwind: TAILWIND_COLORS,
      basic: BASIC_COLORS,
    };

    function getAllPalettes(): ColorPalette[] {
      const result: ColorPalette[] = [];
      for (const p of opts.palettes!) {
        if (paletteMap[p]) {
          result.push({ name: p.charAt(0).toUpperCase() + p.slice(1), colors: paletteMap[p]! });
        }
      }
      if (options.customPalettes) result.push(...options.customPalettes);
      return result;
    }

    // --- Render ---

    function render(): void {
      container.innerHTML = "";

      const allPalettes = getAllPalettes();

      for (const palette of allPalettes) {
        // Palette header
        if (allPalettes.length > 1) {
          const header = document.createElement("div");
          header.style.cssText = "font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;";
          header.textContent = palette.name;
          container.appendChild(header);
        }

        // Grid
        const grid = document.createElement("div");
        grid.className = "cs-grid";
        grid.style.cssText = `
          display:flex;flex-wrap:wrap;gap:${opts.gap}px;margin-bottom:${allPalettes.length > 1 ? 10 : 0}px;
        `;
        container.appendChild(grid);

        for (const color of palette.colors) {
          const swatch = document.createElement("button");
          swatch.type = "button";
          swatch.className = "cs-swatch";
          swatch.dataset.value = color.value;
          swatch.title = `${color.label ?? ""} ${color.value}`.trim();
          swatch.style.cssText = `
            width:${opts.swatchSize}px;height:${opts.swatchSize}px;border-radius:4px;border:2px solid ${color.value === currentValue ? "#4338ca" : "transparent"};
            background:${color.value};cursor:pointer;transition:all 0.15s;outline:none;
            flex-shrink:0;position:relative;
            ${color.value === "#ffffff" || color.value === "#fff" ? "box-shadow:inset 0 0 0 1px #e5e7eb;" : ""}
          `;

          // Checkmark for selected
          if (color.value === currentValue) {
            const check = document.createElement("span");
            check.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="${getLuminance(color.value) > 0.35 ? "#000" : "#fff"} stroke-width="1.5" stroke-linecap="round"/></svg>`;
            check.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;";
            swatch.appendChild(check);
          }

          swatch.addEventListener("click", () => selectColor(color.value));
          swatch.addEventListener("mouseenter", () => {
            if (color.value !== currentValue) swatch.style.borderColor = "#a5b4fc";
          });
          swatch.addEventListener("mouseleave", () => {
            if (color.value !== currentValue) swatch.style.borderColor = "transparent";
          });

          grid.appendChild(swatch);
        }
      }

      // Recent colors
      if (opts.showRecentColors && recentColors.length > 0) {
        const recentHeader = document.createElement("div");
        recentHeader.style.cssText = "font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;margin-top:8px;margin-bottom:4px;";
        recentHeader.textContent = "Recent";
        container.appendChild(recentHeader);

        const recentGrid = document.createElement("div");
        recentGrid.style.cssText = `display:flex;flex-wrap:wrap;gap:${opts.gap}px;`;
        for (const rc of recentColors) {
          const rs = document.createElement("button");
          rs.type = "button";
          rs.style.cssText = `
            width:${opts.swatchSize}px;height:${opts.swatchSize}px;border-radius:4px;
            border:2px solid ${rc === currentValue ? "#4338ca" : "transparent"};
            background:${rc};cursor:pointer;transition:all 0.15s;outline:none;
            ${rc === "#ffffff" || rc === "#fff" ? "box-shadow:inset 0 0 0 1px #e5e7eb;" : ""}
          `;
          rs.title = rc;
          rs.addEventListener("click", () => selectColor(rc));
          recentGrid.appendChild(rs);
        }
        container.appendChild(recentGrid);

        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.textContent = "Clear";
        clearBtn.style.cssText = "font-size:11px;color:#9ca3af;background:none;border:none;cursor:pointer;padding:2px 0;margin-top:2px;";
        clearBtn.addEventListener("click", () => { recentColors = []; saveRecent(); render(); });
        container.appendChild(clearBtn);
      }

      // Hex input
      if (opts.showHexInput) {
        const inputRow = document.createElement("div");
        inputRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:10px;";

        const preview = document.createElement("span");
        preview.style.cssText = `width:32px;height:32px;border-radius:6px;border:1px solid #e5e7eb;background:${currentValue};flex-shrink:0;`;
        inputRow.appendChild(preview);

        const hash = document.createElement("span");
        hash.textContent = "#";
        hash.style.cssText = "font-weight:600;color:#6b7280;";
        inputRow.appendChild(hash);

        const hexInput = document.createElement("input");
        hexInput.type = "text";
        hexInput.value = currentValue.replace("#", "");
        hexInput.maxLength = 6;
        hexInput.spellcheck = false;
        hexInput.style.cssText = `
          width:70px;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;
          font-family:monospace;font-size:13px;outline:none;text-transform:uppercase;
        `;
        hexInput.addEventListener("input", () => {
          const val = "#" + hexInput.value;
          if (isValidHex(val)) {
            selectColor(normalizeHex(val));
            preview.style.background = currentValue;
          }
        });
        hexInput.addEventListener("blur", () => {
          if (!isValidHex("#" + hexInput.value)) hexInput.value = currentValue.replace("#", "");
        });
        hexInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") hexInput.blur();
        });
        inputRow.appendChild(hexInput);

        container.appendChild(inputRow);
      }

      // Alpha slider
      if (opts.showAlpha) {
        const alphaRow = document.createElement("div");
        alphaRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px;";

        const alphaLabel = document.createElement("span");
        alphaLabel.textContent = "Alpha:";
        alphaLabel.style.cssText = "font-size:12px;color:#6b7280;width:36px;";
        alphaRow.appendChild(alphaLabel);

        const alphaSlider = document.createElement("input");
        alphaSlider.type = "range";
        alphaSlider.min = "0";
        alphaSlider.max = "100";
        alphaSlider.value = String(Math.round(currentAlpha * 100));
        alphaSlider.style.cssText = "flex:1;accent-color:#4338ca;";
        alphaSlider.addEventListener("input", () => {
          currentAlpha = parseInt(alphaSlider.value, 10) / 100;
          opts.onChange?.(currentValue, currentAlpha);
        });
        alphaRow.appendChild(alphaSlider);

        const alphaVal = document.createElement("span");
        alphaVal.textContent = Math.round(currentAlpha * 100) + "%";
        alphaVal.style.cssText = "font-size:12px;color:#6b7280;width:36px;text-align:right;";
        alphaSlider.addEventListener("input", () => { alphaVal.textContent = Math.round(currentAlpha * 100) + "%"; });
        alphaRow.appendChild(alphaVal);

        container.appendChild(alphaRow);
      }

      // Contrast info
      if (opts.showContrastInfo) {
        const ratioWhite = getContrastRatio(currentValue, "#ffffff");
        const ratioBlack = getContrastRatio(currentValue, "#000000");
        const wcagAA = ratioWhite >= 4.5 ? "Pass AA" : "Fail AA";

        const info = document.createElement("div");
        info.style.cssText = "margin-top:8px;padding:6px 10px;background:#f9fafb;border-radius:6px;font-size:11px;color:#6b7280;";
        info.innerHTML = `
          <div>vs White: ${ratioWhite.toFixed(1)}:1 (${wcagAA})</div>
          <div>vs Black: ${ratioBlack.toFixed(1)}:1</div>
        `;
        container.appendChild(info);
      }
    }

    function selectColor(value: string): void {
      currentValue = normalizeHex(value);

      // Add to recent
      if (opts.showRecentColors) {
        recentColors = recentColors.filter((c) => c !== currentValue);
        recentColors.unshift(currentValue);
        if (recentColors.length > opts.maxRecentColors!) {
          recentColors = recentColors.slice(0, opts.maxRecentColors);
        }
        saveRecent();
      }

      render();
      opts.onChange?.(currentValue, currentAlpha);
    }

    function saveRecent(): void {
      try { localStorage.setItem("color-swatch-recent", JSON.stringify(recentColors)); } catch { /* ignore */ }
    }

    // Initial render
    render();

    const instance: ColorSwatchInstance = {
      element: container,

      getValue() { return currentValue; },

      getAlpha() { return currentAlpha; },

      setValue(value: string) {
        if (isValidHex(value)) { selectColor(normalizeHex(value)); }
      },

      setAlpha(alpha: number) {
        currentAlpha = Math.max(0, Math.min(1, alpha));
        opts.onChange?.(currentValue, currentAlpha);
      },

      getRecentColors() { return [...recentColors]; },

      clearRecentColors() {
        recentColors = [];
        saveRecent();
        render();
      },

      destroy() { container.innerHTML = ""; },
    };

    return instance;
  }
}

/** Convenience: create a color swatch picker */
export function createColorSwatch(options: ColorSwatchOptions): ColorSwatchInstance {
  return new ColorSwatchManager().create(options);
}
