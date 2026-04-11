/**
 * Color Picker Utilities: Color picker with hex/RGB/HSL input, hue/saturation
 * gradient picker, preset swatches, opacity slider, alpha channel support,
 * and format conversion utilities.
 */

// --- Types ---

export type ColorFormat = "hex" | "rgb" | "hsl" | "hsv";

export interface ColorValue {
  /** Red (0-255) */
  r: number;
  /** Green (0-255) */
  g: number;
  /** Blue (0-255) */
  b: number;
  /** Alpha (0-1) */
  a: number;
}

export interface ColorPreset {
  /** Color value (any CSS color string) */
  color: string;
  /** Label */
  label?: string;
}

export interface ColorPickerOptions {
  /** Initial color value */
  value?: string;
  /** Output format */
  format?: ColorFormat;
  /** Show alpha/opacity channel? */
  showAlpha?: boolean;
  /** Preset colors to display */
  presets?: ColorPreset[];
  /** Label text */
  label?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** On change callback */
  onChange?: (color: string, value: ColorValue) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface ColorPickerInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Get current color string */
  getValue(): string;
  /** Set color programmatically */
  setValue(color: string): void;
  /** Get raw RGBA values */
  getColorValue(): ColorValue;
  /** Open the picker popup */
  open(): void;
  /** Close the picker popup */
  close(): void;
  /** Check if open */
  isOpen(): boolean;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Color Conversion Utilities ---

/** Parse any CSS color string into RGBA */
export function parseColor(color: string): ColorValue {
  // Handle hex
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 4) {
      const r = parseInt(hex[0] + hex[1], 16);
      const g = parseInt(hex[2] + hex[3], 16);
      const b = parseInt(hex[4] + hex[5], 16);
      const a = parseInt(hex[6] + hex[7], 16) / 255;
      return { r, g, b, a };
    }
    if (hex.length === 8) {
      const a = parseInt(hex.slice(6), 16) / 255;
      hex = hex.slice(0, 6);
      return { ...parseColor("#" + hex), a };
    }
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16), a: 1 };
    }
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    return { r: +rgbMatch[1], g: +rgbMatch[2], b: +rgbMatch[3], a: rgbMatch[4] ? +rgbMatch[4] : 1 };
  }

  // Handle hsl/hsla
  const hslMatch = color.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (hslMatch) {
    return hslToRgb(+hslMatch[1], +hslMatch[2], +hslMatch[3], hslMatch[4] ? +hslMatch[4] : 1);
  }

  // Fallback
  return { r: 0, g: 0, b: 0, a: 1 };
}

/** Convert HSL to RGB */
export function hslToRgb(h: number, s: number, l: number, a: number = 1): ColorValue {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)), a };
}

/** Convert RGB to HSL */
export function rgbToHsl(r: number, g: number, b: number, a: number = 1): { h: number; s: number; l: number; a: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100), a };
}

/** Convert RGB to Hex */
export function rgbToHex(r: number, g: number, b: number, a: number = 1): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  if (a < 1) return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(Math.round(a * 255))}`;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Format color in specified output format */
export function formatColor(value: ColorValue, format: ColorFormat): string {
  switch (format) {
    case "hex": return rgbToHex(value.r, value.g, value.b, value.a);
    case "rgb": return value.a < 1 ? `rgba(${value.r}, ${value.g}, ${value.b}, ${value.a.toFixed(2)})` : `rgb(${value.r}, ${value.g}, ${value.b})`;
    case "hsl": {
      const hsl = rgbToHsl(value.r, value.g, value.b, value.a);
      return value.a < 1 ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${value.a.toFixed(2)})` : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }
    default:
      return rgbToHex(value.r, value.g, value.b, value.a);
  }
}

// --- Default Presets ---

const DEFAULT_PRESETS: ColorPreset[] = [
  { color: "#ef4444", label: "Red" },
  { color: "#f97316", label: "Orange" },
  { color: "#eab308", label: "Yellow" },
  { color: "#22c55e", label: "Green" },
  { color: "#06b6d4", label: "Cyan" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#8b5cf6", label: "Purple" },
  { color: "#ec4899", label: "Pink" },
  { color: "#000000", label: "Black" },
  { color: "#6b7280", label: "Gray" },
  { color: "#ffffff", label: "White" },
];

// --- Core Factory ---

/**
 * Create a color picker component.
 *
 * @example
 * ```ts
 * const picker = createColorPicker({
 *   value: "#3b82f6",
 *   showAlpha: true,
 *   presets: DEFAULT_PRESETS,
 *   onChange: (color) => console.log(color),
 * });
 * ```
 */
export function createColorPicker(options: ColorPickerOptions = {}): ColorPickerInstance {
  const {
    value = "#000000",
    format = "hex",
    showAlpha = false,
    presets = DEFAULT_PRESETS,
    label,
    disabled = false,
    fullWidth = true,
    onChange,
    className,
    container,
  } = options;

  let _open = false;
  let _color = parseColor(value);

  // Root
  const root = document.createElement("div");
  root.className = `color-picker-wrapper ${className ?? ""}`.trim();
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "4px";
  root.style.width = fullWidth ? "100%" : "fit-content";
  root.style.position = "relative";

  // Label
  if (label) {
    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size:13px;font-weight:500;color:#374151;";
    root.appendChild(labelEl);
  }

  // Trigger row
  const triggerRow = document.createElement("div");
  triggerRow.className = "color-trigger-row";
  triggerRow.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:4px;" +
    "border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:" +
    (disabled ? "not-allowed" : "pointer") + ";" +
    (disabled ? "opacity:0.5;" : "");

  // Swatch preview
  const swatch = document.createElement("div");
  swatch.className = "color-swatch";
  swatch.style.cssText =
    "width:28px;height:28px;border-radius:6px;border:1px solid #e5e7eb;" +
    "position:relative;overflow:hidden;flex-shrink:0;";
  updateSwatch();
  triggerRow.appendChild(swatch);

  // Value text
  const valueText = document.createElement("span");
  valueText.className = "color-value-text";
  valueText.style.cssText =
    "flex:1;font-size:13px;color:#374151;font-family:monospace;";
  valueText.textContent = formatColor(_color, format);
  triggerRow.appendChild(valueText);

  // Chevron
  const chevron = document.createElement("span");
  chevron.innerHTML = "&#9662;";
  chevron.style.cssText = "font-size:10px;color:#9ca3af;transition:transform 0.15s;flex-shrink:0;";
  triggerRow.appendChild(chevron);

  root.appendChild(triggerRow);

  // Dropdown panel
  const panel = document.createElement("div");
  panel.className = "color-picker-panel";
  panel.style.cssText =
    "position:absolute;top:calc(100% + 4px);left:0;z-index:1100;" +
    "background:#fff;border:1px solid #e5e7eb;border-radius:12px;" +
    "box-shadow:0 12px 32px rgba(0,0,0,0.15);padding:14px;width:240px;" +
    "display:none;opacity:0;transform:translateY(-4px);" +
    "transition:opacity 0.15s ease, transform 0.15s ease;";

  // Saturation/Brightness area (gradient square)
  const satArea = document.createElement("div");
  satArea.className = "saturation-area";
  satArea.style.cssText =
    "width:100%;height:160px;border-radius:8px;position:relative;cursor:crosshair;" +
    "overflow:hidden;margin-bottom:10px;";

  const satCanvas = document.createElement("canvas");
  satCanvas.width = 200;
  satCanvas.height = 160;
  satCanvas.style.width = "100%";
  satCanvas.style.height = "100%";
  satCanvas.style.borderRadius = "8px";
  satArea.appendChild(satCanvas);

  // Saturation cursor
  const satCursor = document.createElement("div");
  satCursor.className = "sat-cursor";
  satCursor.style.cssText =
    "position:absolute;width:14px;height:14px;border-radius:50%;" +
    "border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,0.4);" +
    "transform:translate(-50%,-50%);pointer-events:none;";
  satArea.appendChild(satCursor);

  panel.appendChild(satArea);

  // Hue slider row
  const hueRow = document.createElement("div");
  hueRow.style.display = "flex";
  hueRow.style.alignItems = "center";
  hueRow.style.gap = "8px";
  hueRow.style.marginBottom = showAlpha ? "10px" : "0";

  const hueLabel = document.createElement("span");
  hueLabel.textContent = "H";
  hueLabel.style.cssText = "font-size:11px;font-weight:600;color:#6b7280;width:12px;text-align:center;";
  hueRow.appendChild(hueLabel);

  const hueSlider = document.createElement("input");
  hueSlider.type = "range";
  hueSlider.min = "0";
  hueSlider.max = "360";
  hueSlider.step = "1";
  hueSlider.style.cssText = "flex:1;height:8px;border-radius:4px;-webkit-appearance:none;appearance:none;background:linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000);cursor:pointer;";
  hueRow.appendChild(hueSlider);

  panel.appendChild(hueRow);

  // Alpha slider
  let alphaSlider: HTMLInputElement | null = null;

  if (showAlpha) {
    const alphaRow = document.createElement("div");
    alphaRow.style.display = "flex";
    alphaRow.style.alignItems = "center";
    alphaRow.style.gap = "8px";
    alphaRow.style.marginBottom = "10px";

    const alphaLabel = document.createElement("span");
    alphaLabel.textContent = "A";
    alphaLabel.style.cssText = "font-size:11px;font-weight:600;color:#6b7280;width:12px;text-align:center;";
    alphaRow.appendChild(alphaLabel);

    alphaSlider = document.createElement("input");
    alphaSlider.type = "range";
    alphaSlider.min = "0";
    alphaSlider.max = "100";
    alphaSlider.value = String(Math.round(_color.a * 100));
    alphaSlider.style.cssText = "flex:1;height:8px;border-radius:4px;-webkit-appearance:none;appearance:none;cursor:pointer;";
    alphaRow.appendChild(alphaSlider);

    panel.appendChild(alphaRow);
  }

  // Preset swatches
  if (presets.length > 0) {
    const presetRow = document.createElement("div");
    presetRow.className = "color-presets";
    presetRow.style.cssText =
      "display:flex;flex-wrap:wrap;gap:4px;padding-top:8px;border-top:1px solid #f3f4f6;";

    presets.forEach((preset) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = preset.label || preset.color;
      btn.style.cssText =
        "width:22px;height:22px;border-radius:4px;border:1.5px solid transparent;" +
        `background:${preset.color};cursor:pointer;padding:0;transition:border-color 0.1s;` +
        "flex-shrink:0;";
      btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#3b82f6"; });
      btn.addEventListener("mouseleave", () => { btn.style.borderColor = "transparent"; });
      btn.addEventListener("click", () => {
        _color = parseColor(preset.color);
        syncUIFromColor();
        fireChange();
      });
      presetRow.appendChild(btn);
    });

    panel.appendChild(presetRow);
  }

  document.body.appendChild(panel);

  // --- Internal Methods ---

  function updateSwatch(): void {
    swatch.style.background = formatColor(_color, "hex");

    // Checkerboard for alpha indication
    if (_color.a < 1) {
      const checker = document.createElement("div");
      checker.style.cssText =
        "position:absolute;inset:0;background:repeating-conic-gradient(#ccc 0% 25%,#fff 0% 50%) 50%/8px 8px;";
      swatch.insertBefore(checker, swatch.firstChild);
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:absolute;inset:0;background:" + formatColor(_color, "hex") + ";";
      swatch.appendChild(overlay);
    } else {
      // Remove existing overlays
      while (swatch.children.length > 0 && swatch.children.length !== (showAlpha ? 3 : 1)) {
        swatch.removeChild(swatch.firstChild);
      }
    }
  }

  function drawSaturationGradient(): void {
    const ctx = satCanvas.getContext("2d")!;
    const w = satCanvas.width;
    const h = satCanvas.height;
    const hsl = rgbToHsl(_color.r, _color.g, _color.b);

    // White to hue gradient (horizontal)
    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, "#ffffff");
    whiteGrad.addColorStop(1, `hsl(${hsl.h}, 100%, 50%)`);
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h);

    // Transparent to black gradient (vertical)
    const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, "rgba(0,0,0,0)");
    blackGrad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);
  }

  function syncUIFromColor(): void {
    const hsl = rgbToHsl(_color.r, _color.g, _color.b);

    // Update hue slider
    hueSlider.value = String(hsl.h);

    // Update alpha slider
    if (alphaSlider) alphaSlider.value = String(Math.round(_color.a * 100));

    // Update saturation cursor position
    const cx = (hsl.s / 100) * satArea.clientWidth;
    const cy = (100 - hsl.l) / 100 * satArea.clientHeight;
    satCursor.style.left = `${cx}px`;
    satCursor.style.top = `${cy}px`;

    // Update displays
    valueText.textContent = formatColor(_color, format);
    updateSwatch();
    drawSaturationGradient();

    // Update alpha slider background
    if (alphaSlider) {
      alphaSlider.style.background = `linear-gradient(to right, transparent, ${formatColor({ ..._color, a: 1 }, "hex")})`;
    }
  }

  function fireChange(): void {
    onChange?.(formatColor(_color, format), _color);
  }

  // --- Saturation area drag ---

  let _satDragging = false;

  function handleSatDrag(e: MouseEvent | TouchEvent): void {
    const rect = satArea.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const s = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const l = Math.max(0, Math.min(100, 100 - ((clientY - rect.top) / rect.height) * 100));

    const hsl = rgbToHsl(_color.r, _color.g, _color.b);
    _color = hslToRgb(hsl.h, s, l, _color.a);

    satCursor.style.left = `${(s / 100) * satArea.clientWidth}px`;
    satCursor.style.top = `${(100 - l) / 100 * satArea.clientHeight}px`;

    valueText.textContent = formatColor(_color, format);
    updateSwatch();

    if (!_satDragging) fireChange();
  }

  satArea.addEventListener("mousedown", (e) => {
    _satDragging = true;
    handleSatDrag(e);
  });
  satArea.addEventListener("touchstart", (e) => {
    _satDragging = true;
    handleSatDrag(e as unknown as TouchEvent);
  }, { passive: true });

  document.addEventListener("mousemove", (e) => { if (_satDragging) handleSatDrag(e); });
  document.addEventListener("mouseup", () => { if (_satDragging) { _satDragging = false; fireChange(); } });
  document.addEventListener("touchmove", (e) => { if (_satDragging) handleSatDrag(e as unknown as TouchEvent); });
  document.addEventListener("touchend", () => { if (_satDragging) { _satDragging = false; fireChange(); } });

  // --- Hue slider ---

  hueSlider.addEventListener("input", () => {
    const hsl = rgbToHsl(_color.r, _color.g, _color.b);
    _color = hslToRgb(+hueSlider.value, hsl.s, hsl.l, _color.a);
    syncUIFromColor();
    fireChange();
  });

  // --- Alpha slider ---

  if (alphaSlider) {
    alphaSlider.addEventListener("input", () => {
      _color.a = +alphaSlider.value / 100;
      valueText.textContent = formatColor(_color, format);
      updateSwatch();
      fireChange();
    });
  }

  // --- Open/Close ---

  function open(): void {
    if (_open || disabled) return;
    _open = true;

    const rect = triggerRow.getBoundingClientRect();
    panel.style.left = `${rect.left + window.scrollX}px`;
    panel.style.top = `${rect.bottom + window.scrollY + 4}px`;

    panel.style.display = "block";
    requestAnimationFrame(() => {
      panel.style.opacity = "1";
      panel.style.transform = "translateY(0)";
    });

    chevron.style.transform = "rotate(180deg)";
    syncUIFromColor();
  }

  function close(): void {
    if (!_open) return;
    _open = false;

    panel.style.opacity = "0";
    panel.style.transform = "translateY(-4px)";

    setTimeout(() => { panel.style.display = "none"; }, 150);
    chevron.style.transform = "";
  }

  // Trigger click
  triggerRow.addEventListener("click", () => toggle());

  function toggle(): void { _open ? close() : open(); }

  // Close on outside click
  document.addEventListener("mousedown", (e) => {
    if (_open && !root.contains(e.target as Node) && !panel.contains(e.target as Node)) close();
  });

  // Initial render
  syncUIFromColor();

  // --- Instance ---

  return {
    el: root,

    getValue() { return formatColor(_color, format); },

    setValue(color: string) {
      _color = parseColor(color);
      syncUIFromColor();
    },

    getColorValue() { return _color; },

    open, close,

    isOpen() { return _open; },

    setDisabled(d: boolean) {
      disabled = d;
      triggerRow.style.opacity = d ? "0.5" : "1";
      triggerRow.style.cursor = d ? "not-allowed" : "pointer";
    },

    destroy() {
      close();
      panel.remove();
      root.remove();
    },
  };
}
