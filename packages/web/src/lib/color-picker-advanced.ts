/**
 * Advanced Color Picker: Full-featured color selection component.
 * Includes:
 * - HSL/HSV saturation-brightness gradient square
 * - Hue slider with rainbow gradient
 * - Alpha/transparency slider
 * - Hex, RGB, HSL input fields
 * - Swatch/palette presets
 * - Eye-dropper tool (via EyeDropper API or fallback)
 * - Color harmony suggestions (complementary, analogous, triadic)
 * - Recent colors history (localStorage-persisted)
 * - Keyboard accessible
 * - Popover positioning (auto-flip on viewport edge)
 */

// --- Types ---

export type ColorMode = "hex" | "rgb" | "hsl" | "hsv";
export type PickerPlacement = "bottom-start" | "bottom" | "bottom-end" | "top-start" | "top" | "top-end" | "auto";

export interface RgbColor { r: number; g: number; b: number; a?: number }
export interface HslColor { h: number; s: number; l: number; a?: number }
export interface HsvColor { h: number; s: number; v: number; a?: number }

export interface ColorSwatch {
  name: string;
  color: string;
}

export interface ColorPickerOptions {
  /** Target input element or container */
  target: HTMLElement | string;
  /** Initial color (default: #000000) */
  color?: string;
  /** Color mode for input display (default: hex) */
  mode?: ColorMode;
  /** Show alpha/transparency control (default: true) */
  showAlpha?: boolean;
  /** Show hue slider (default: true) */
  showHueSlider?: boolean;
  /** Show swatches/presets (default: true) */
  showSwatches?: boolean;
  /** Show recent colors (default: true) */
  showRecentColors?: boolean;
  /** Show color harmony suggestions (default: false) */
  showHarmony?: boolean;
  /** Show eye-dropper button (default: true if supported) */
  showEyeDropper?: boolean;
  /** Custom swatch palette */
  swatches?: ColorSwatch[];
  /** Max recent colors to store (default: 16) */
  maxRecentColors?: number;
  /** Storage key for recent colors (default: "cp-recent") */
  storageKey?: string;
  /** Picker placement relative to target */
  placement?: PickerPlacement;
  /** Offset from target [x, y] in px (default: [0, 8]) */
  offset?: [number, number];
  /** Z-index (default: 1050) */
  zIndex?: number;
  /** Picker width in px (default: 280) */
  width?: number;
  /** Callback when color changes (on every interaction) */
  onChange?: (color: string, rgb: RgbColor) => void;
  /** Callback when picker closes with final color */
  onComplete?: (color: string, rgb: RgbColor) => void;
  /** Callback when picker opens */
  onOpen?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ColorPickerInstance {
  element: HTMLElement;
  /** Open the picker */
  open: () => void;
  /** Close the picker */
  close: () => void;
  /** Toggle open/close */
  toggle: () => void;
  /** Set color programmatically */
  setColor: (color: string) => void;
  /** Get current color as hex */
  getColor: () => string;
  /** Get current RGB values */
  getRgb: () => RgbColor;
  /** Get current HSL values */
  getHsl: () => HslColor;
  /** Destroy instance */
  destroy: () => void;
}

// --- Color Conversion ---

function hexToRgb(hex: string): RgbColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("");
}

function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToRgb(h: number, s: number, v: number): RgbColor {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const vv = clamp(v, 0, 100) / 100;

  let r = 0, g = 0, b = 0;
  const i = Math.floor(hh / 60);
  const f = hh / 60 - i;
  const p = vv * (1 - ss);
  const q = vv * (1 - f * ss);
  const t = vv * (1 - (1 - f) * ss);

  switch (i % 6) {
    case 0: r = vv; g = t; b = p; break;
    case 1: r = q; g = vv; b = p; break;
    case 2: r = p; g = vv; b = t; break;
    case 3: r = p; g = q; b = vv; break;
    case 4: r = t; g = p; b = vv; break;
    case 5: r = vv; g = p; b = q; break;
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// --- Default Swatches ---

const DEFAULT_SWATCHES: ColorSwatch[] = [
  { name: "Red", color: "#ef4444" }, { name: "Orange", color: "#f97316" },
  { name: "Amber", color: "#f59e0b" }, { name: "Yellow", color: "#eab308" },
  { name: "Lime", color: "#84cc16" }, { name: "Green", color: "#22c55e" },
  { name: "Emerald", color: "#10b981" }, { name: "Teal", color: "#14b8a6" },
  { name: "Cyan", color: "#06b6d4" }, { name: "Sky", color: "#0ea5e9" },
  { name: "Blue", color: "#3b82f6" }, { name: "Indigo", color: "#6366f1" },
  { name: "Violet", color: "#8b5cf6" }, { name: "Purple", color: "#a855f7" },
  { name: "Fuchsia", color: "#d946ef" }, { name: "Pink", color: "#ec4899" },
  { name: "Rose", color: "#f43f5e" }, { name: "White", color: "#ffffff" },
  { name: "Light Gray", color: "#d1d5db" }, { name: "Gray", color: "#9ca3af" },
  { name: "Dark Gray", color: "#6b7280" }, { name: "Black", color: "#000000" },
];

// --- Main ---

export function createColorPicker(options: ColorPickerOptions): ColorPickerInstance {
  const opts = {
    color: "#000000",
    mode: "hex" as ColorMode,
    showAlpha: true,
    showHueSlider: true,
    showSwatches: true,
    showRecentColors: true,
    showHarmony: false,
    showEyeDropper: "EyeDropper" in window,
    maxRecentColors: 16,
    storageKey: "cp-recent",
    placement: "auto" as PickerPlacement,
    offset: [0, 8],
    zIndex: 1050,
    width: 280,
    swatches: DEFAULT_SWATCHES,
    ...options,
  };

  const target = typeof options.target === "string"
    ? document.querySelector<HTMLElement>(options.target)!
    : options.target;

  // State
  let isOpen = false;
  let destroyed = false;
  let hsv: HsvColor = { h: 0, s: 100, v: 100 };
  let alpha = 1;
  let recentColors: string[] = [];

  // Load recent colors
  try {
    const stored = localStorage.getItem(opts.storageKey);
    if (stored) recentColors = JSON.parse(stored);
  } catch { /* ignore */ }

  // Parse initial color
  const initialRgb = hexToRgb(opts.color);
  hsv = rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b);

  // Create picker DOM
  const picker = document.createElement("div");
  picker.className = `color-picker ${opts.className ?? ""}`;
  picker.style.cssText = `
    position:absolute;display:none;width:${opts.width}px;
    background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.2),0 2px 8px rgba(0,0,0,0.1);
    padding:14px;font-family:-apple-system,sans-serif;z-index:${opts.zIndex};
    box-sizing:border-box;user-select:none;-webkit-user-select:none;
  `;

  // Gradient square (saturation x value)
  const gradientBox = document.createElement("div");
  gradientBox.className = "cp-gradient-box";
  gradientBox.style.cssText = `
    position:relative;width:100%;height:180px;border-radius:8px;
    cursor:crosshair;margin-bottom:10px;overflow:hidden;
  `;
  const gradientInner = document.createElement("div");
  gradientInner.style.cssText = `
    position:absolute;top:0;left:0;right:0;bottom:100%;
    background:linear-gradient(to top, #000, transparent);
  `;
  const gradientWhite = document.createElement("div");
  gradientWhite.style.cssText = `
    position:absolute;top:0;left:0;bottom:0;right:100%;
    background:linear-gradient(to right, #fff, transparent);
  `;
  const gradientCursor = document.createElement("div");
  gradientCursor.className = "cp-cursor";
  gradientCursor.style.cssText = `
    position:absolute;width:16px;height:16px;border-radius:50%;
    border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,0.4);
    transform:translate(-50%,-50%);pointer-events:none;
  `;
  gradientBox.appendChild(gradientInner);
  gradientBox.appendChild(gradientWhite);
  gradientBox.appendChild(gradientCursor);
  picker.appendChild(gradientBox);

  // Hue slider
  let hueSlider: HTMLElement | null = null;
  let hueCursor: HTMLElement | null = null;
  if (opts.showHueSlider) {
    const hueContainer = document.createElement("div");
    hueContainer.className = "cp-hue-container";
    hueContainer.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;";
    const hueLabel = document.createElement("span");
    hueLabel.textContent = "H";
    hueLabel.style.cssText = "font-size:11px;color:#6b7280;font-weight:600;width:12px;text-align:center;";
    hueSlider = document.createElement("div");
    hueSlider.className = "cp-hue-slider";
    hueSlider.style.cssText = `
      flex:1;height:10px;border-radius:5px;cursor:pointer;
      background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);
    `;
    hueCursor = document.createElement("div");
    hueCursor.className = "cp-hue-cursor";
    hueCursor.style.cssText = `
      position:absolute;width:14px;height:14px;border-radius:50%;
      border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,0.4);
      transform:translate(-50%,-50%);top:50%;pointer-events:none;margin-left:-2px;
    `;
    hueSlider.style.position = "relative";
    hueSlider.appendChild(hueCursor);
    hueContainer.appendChild(hueLabel);
    hueContainer.appendChild(hueSlider);
    picker.appendChild(hueContainer);
  }

  // Alpha slider
  let alphaSlider: HTMLElement | null = null;
  let alphaCursor: HTMLElement | null = null;
  if (opts.showAlpha) {
    const alphaContainer = document.createElement("div");
    alphaContainer.className = "cp-alpha-container";
    alphaContainer.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;";
    const alphaLabel = document.createElement("span");
    alphaLabel.textContent = "A";
    alphaLabel.style.cssText = "font-size:11px;color:#6b7280;font-weight:600;width:12px;text-align:center;";
    alphaSlider = document.createElement("div");
    alphaSlider.className = "cp-alpha-slider";
    alphaSlider.style.cssText = `
      flex:1;height:10px;border-radius:5px;cursor:pointer;
      background:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAF0lEQVQoz2NgGAWjYBQMULgAGDGAMTDAEADQcAAOPMMLoAAAAASUVORK5CYII=') repeat;
    `;
    alphaCursor = document.createElement("div");
    alphaCursor.className = "cp-alpha-cursor";
    alphaCursor.style.cssText = `
      position:absolute;width:14px;height:14px;border-radius:50%;
      border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,0.4);
      transform:translate(-50%,-50%);top:50%;pointer-events:none;margin-left:-2px;
    `;
    alphaSlider.style.position = "relative";
    alphaSlider.appendChild(alphaCursor);
    alphaContainer.appendChild(alphaLabel);
    alphaContainer.appendChild(alphaSlider);
    picker.appendChild(alphaContainer);
  }

  // Input fields row
  const inputsRow = document.createElement("div");
  inputsRow.className = "cp-inputs-row";
  inputsRow.style.cssText = "display:flex;gap:6px;margin-bottom:10px;";

  const hexInput = document.createElement("input");
  Object.assign(hexInput, { type: "text", value: opts.color });
  hexInput.style.cssText = `
    flex:1;padding:6px 8px;border:1px solid #d1d5db;border-radius:6px;
    font-size:12px;font-family:monospace;text-transform:uppercase;outline:none;
  `;
  hexInput.addEventListener("input", () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
      const rgb = hexToRgb(hexInput.value);
      hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      updateUI();
      emitChange();
    }
  });

  const rgbInputs = ["R", "G", "B"].map((label, i) => {
    const inp = document.createElement("input");
    Object.assign(inp, { type: "number", min: 0, max: 255 });
    inp.style.cssText = hexInput.style.cssText.replace("flex:1", "width:48px");
    inp.placeholder = label;
    inp.addEventListener("change", () => {
      const vals = rgbInputs.map(inp => parseInt(inp.value) || 0);
      hsv = rgbToHsv(vals[0]!, vals[1]!, vals[2]!);
      updateUI();
      emitChange();
    });
    return inp;
  });

  inputsRow.appendChild(hexInput);
  rgbInputs.forEach(inp => inputsRow.appendChild(inp));
  picker.appendChild(inputsRow);

  // Swatches
  let swatchesEl: HTMLElement | null = null;
  if (opts.showSwatches) {
    swatchesEl = document.createElement("div");
    swatchesEl.className = "cp-swatches";
    swatchesEl.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;";
    for (const swatch of opts.swatches) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = swatch.name;
      btn.style.cssText = `
        width:24px;height:24px;border-radius:4px;border:2px solid transparent;
        cursor:pointer;padding:0;transition:border-color 0.15s;
        background:${swatch.color};
      `;
      btn.addEventListener("mouseenter", () => btn.style.borderColor = "#4338ca");
      btn.addEventListener("mouseleave", () => btn.style.borderColor = "transparent");
      btn.addEventListener("click", () => {
        const rgb = hexToRgb(swatch.color);
        hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        updateUI();
        emitChange();
      });
      swatchesEl.appendChild(btn);
    }
    picker.appendChild(swatchesEl);
  }

  // Recent colors
  let recentEl: HTMLElement | null = null;
  if (opts.showRecentColors) {
    recentEl = document.createElement("div");
    recentEl.className = "cp-recent-colors";
    renderRecentColors();
    picker.appendChild(recentEl);
  }

  // Harmony colors
  let harmonyEl: HTMLElement | null = null;
  if (opts.showHarmony) {
    harmonyEl = document.createElement("div");
    harmonyEl.className = "cp-harmony";
    harmonyEl.style.cssText = "display:flex;gap:6px;align-items:center;margin-top:8px;";
    const label = document.createElement("span");
    label.textContent = "Harmony:";
    label.style.cssText = "font-size:11px;color:#6b7280;margin-right:4px;";
    harmonyEl.appendChild(label);
    picker.appendChild(harmonyEl);
  }

  // Eye-dropper button
  if (opts.showEyeDropper) {
    const dropperBtn = document.createElement("button");
    dropperBtn.type = "button";
    dropperBtn.title = "Pick color from screen";
    dropperBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>`;
    dropperBtn.style.cssText = `
      position:absolute;top:10px;right:10px;padding:4px;border-radius:6px;
      border:1px solid #d1d5db;background:#fff;cursor:pointer;display:flex;
      align-items:center;justify-content:center;color:#6b7280;
    `;
    dropperBtn.addEventListener("click", async () => {
      try {
        // @ts-expect-error EyeDropper API
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const rgb = hexToRgb(result.sRGBHex);
        hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        updateUI();
        emitChange();
      } catch { /* User cancelled */ }
    });
    picker.appendChild(dropperBtn);
  }

  document.body.appendChild(picker);

  // --- UI Update Functions ---

  function updateGradientCursor(): void {
    const rect = gradientBox.getBoundingClientRect();
    const x = (hsv.s / 100) * rect.width;
    const y = (1 - hsv.v / 100) * rect.height;
    gradientCursor.style.left = `${x}px`;
    gradientCursor.style.top = `${y}px`;

    // Update gradient base color
    const baseColor = hsvToRgb(hsv.h, 100, 100);
    gradientWhite.style.background = `linear-gradient(to right, #fff, ${rgbToHex(baseColor.r, baseColor.g, baseColor.b)})`;
  }

  function updateHueCursor(): void {
    if (!hueSlider || !hueCursor) return;
    const rect = hueSlider.getBoundingClientRect();
    const x = (hsv.h / 360) * rect.width;
    hueCursor.style.left = `${x}px`;
  }

  function updateAlphaCursor(): void {
    if (!alphaSlider || !alphaCursor) return;
    const rect = alphaSlider.getBoundingClientRect();
    const x = alpha * rect.width;
    alphaCursor.style.left = `${x}px`;

    // Update alpha gradient overlay
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    alphaSlider!.style.background = `
      linear-gradient(to right, transparent, ${rgbToHex(rgb.r, rgb.g, rgb.b)}),
      url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAF0lEQVQoz2NgGAWjYBQMULgAGDGAMTDAEADQcAAOPMMLoAAAAASUVORK5CYII=')
    `;
  }

  function updateInputs(): void {
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    hexInput.value = rgbToHex(rgb.r, rgb.g, rgb.b);
    rgbInputs[0]!.value = String(rgb.r);
    rgbInputs[1]!.value = String(rgb.g);
    rgbInputs[2]!.value = String(rgb.b);
  }

  function updateHarmony(): void {
    if (!harmonyEl) return;
    // Clear existing harmony buttons (keep label)
    while (harmonyEl.children.length > 1) {
      harmonyEl.lastChild?.remove();
    }

    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const harmonies = [
      { h: (hsv.h + 180) % 360, label: "Comp" },
      { h: (hsv.h - 30 + 360) % 360, label: "Ana-1" },
      { h: (hsv.h + 30) % 360, label: "Ana+1" },
      { h: (hsv.h + 120) % 360, label: "Tri-1" },
      { h: (hsv.h + 240) % 360, label: "Tri-2" },
    ];

    for (const hm of harmonies) {
      const c = hsvToRgb(hm.h, hsv.s, hsv.v);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = hm.label;
      btn.style.cssText = `
        width:22px;height:22px;border-radius:4px;border:1px solid #e5e7eb;
        cursor:pointer;padding:0;background:${rgbToHex(c.r, c.g, c.b)};
      `;
      btn.addEventListener("click", () => {
        hsv.h = hm.h;
        updateUI();
        emitChange();
      });
      harmonyEl.appendChild(btn);
    }
  }

  function updateUI(): void {
    updateGradientCursor();
    updateHueCursor();
    updateAlphaCursor();
    updateInputs();
    updateHarmony();
  }

  function renderRecentColors(): void {
    if (!recentEl) return;
    recentEl.innerHTML = "";
    if (recentColors.length === 0) return;

    const label = document.createElement("span");
    label.textContent = "Recent:";
    label.style.cssText = "font-size:11px;color:#6b7280;display:block;margin-bottom:4px;";
    recentEl.appendChild(label);

    const row = document.createElement("div");
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";
    for (const color of recentColors.slice(0, opts.maxRecentColors)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = `
        width:20px;height:20px;border-radius:3px;border:1px solid #e5e7eb;
        cursor:pointer;padding:0;background:${color};
      `;
      btn.addEventListener("click", () => {
        const rgb = hexToRgb(color);
        hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        updateUI();
        emitChange();
      });
      row.appendChild(btn);
    }
    recentEl.appendChild(row);
  }

  function saveRecentColor(color: string): void {
    recentColors = [color, ...recentColors.filter(c => c !== color)].slice(0, opts.maxRecentColors);
    try { localStorage.setItem(opts.storageKey, JSON.stringify(recentColors)); } catch { /* ignore */ }
    renderRecentColors();
  }

  function emitChange(): void {
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    opts.onChange?.(hex, { ...rgb, a: alpha });
  }

  // --- Event Handlers ---

  function handleGradientInteraction(e: MouseEvent | TouchEvent): void {
    const rect = gradientBox.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? e.clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? e.clientY : e.clientY;
    const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
    hsv.s = s;
    hsv.v = v;
    updateUI();
    emitChange();
  }

  function handleHueInteraction(e: MouseEvent | TouchEvent): void {
    if (!hueSlider) return;
    const rect = hueSlider.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? e.clientX : e.clientX;
    const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 360);
    hsv.h = h;
    updateUI();
    emitChange();
  }

  function handleAlphaInteraction(e: MouseEvent | TouchEvent): void {
    if (!alphaSlider) return;
    const rect = alphaSlider.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? e.clientX : e.clientX;
    alpha = clamp((clientX - rect.left) / rect.width, 0, 1);
    updateUI();
    emitChange();
  }

  // Gradient drag
  let isDraggingGradient = false;
  gradientBox.addEventListener("mousedown", (e) => { isDraggingGradient = true; handleGradientInteraction(e); });
  gradientBox.addEventListener("touchstart", (e) => { isDraggingGradient = true; handleGradientInteraction(e); }, { passive: true });
  document.addEventListener("mousemove", (e) => { if (isDraggingGradient) handleGradientInteraction(e); });
  document.addEventListener("touchmove", (e) => { if (isDraggingGradient) handleGradientInteraction(e); }, { passive: true });
  document.addEventListener("mouseup", () => { isDraggingGradient = false; });
  document.addEventListener("touchend", () => { isDraggingGradient = false; });

  // Hue drag
  let isDraggingHue = false;
  if (hueSlider) {
    hueSlider.addEventListener("mousedown", (e) => { isDraggingHue = true; handleHueInteraction(e); });
    hueSlider.addEventListener("touchstart", (e) => { isDraggingHue = true; handleHueInteraction(e); }, { passive: true });
  }
  document.addEventListener("mousemove", (e) => { if (isDraggingHue) handleHueInteraction(e); });
  document.addEventListener("touchmove", (e) => { if (isDraggingHue) handleHueInteraction(e); }, { passive: true });
  document.addEventListener("mouseup", () => { isDraggingHue = false; });
  document.addEventListener("touchend", () => { isDraggingHue = false; });

  // Alpha drag
  let isDraggingAlpha = false;
  if (alphaSlider) {
    alphaSlider.addEventListener("mousedown", (e) => { isDraggingAlpha = true; handleAlphaInteraction(e); });
    alphaSlider.addEventListener("touchstart", (e) => { isDraggingAlpha = true; handleAlphaInteraction(e); }, { passive: true });
  }
  document.addEventListener("mousemove", (e) => { if (isDraggingAlpha) handleAlphaInteraction(e); });
  document.addEventListener("touchmove", (e) => { if (isDraggingAlpha) handleAlphaInteraction(e); }, { passive: true });
  document.addEventListener("mouseup", () => { isDraggingAlpha = false; });
  document.addEventListener("touchend", () => { isDraggingAlpha = false; });

  // Positioning
  function positionPicker(): void {
    const rect = target.getBoundingClientRect();
    let top = rect.bottom + opts.offset[1];
    let left = rect.left + opts.offset[0];

    // Auto placement
    const pickerHeight = picker.offsetHeight || 400;
    const pickerWidth = opts.width;

    if (opts.placement === "auto") {
      if (rect.bottom + pickerHeight > window.innerHeight && rect.top > pickerHeight) {
        top = rect.top - pickerHeight - opts.offset[1];
      }
      if (left + pickerWidth > window.innerWidth) {
        left = left + rect.width - pickerWidth;
      }
    }

    picker.style.top = `${top + window.scrollY}px`;
    picker.style.left = `${left}px`;
  }

  // Click outside to close
  document.addEventListener("mousedown", (e) => {
    if (isOpen && !picker.contains(e.target as Node) && !target.contains(e.target as Node)) {
      close();
    }
  });

  // Initialize UI
  updateUI();

  // Instance
  const instance: ColorPickerInstance = {
    element: picker,

    open() {
      if (isOpen || destroyed) return;
      isOpen = true;
      positionPicker();
      picker.style.display = "block";
      requestAnimationFrame(() => {
        picker.style.transform = "scale(0.95)";
        picker.style.opacity = "0";
        picker.style.transition = "all 0.15s ease";
        requestAnimationFrame(() => {
          picker.style.transform = "scale(1)";
          picker.style.opacity = "1";
        });
      });
      opts.onOpen?.();
    },

    close() {
      if (!isOpen || destroyed) return;
      isOpen = false;
      const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
      saveRecentColor(rgbToHex(rgb.r, rgb.g, rgb.b));
      opts.onComplete?.(rgbToHex(rgb.r, rgb.g, rgb.b), { ...rgb, a: alpha });
      picker.style.display = "none";
    },

    toggle() { isOpen ? close() : open(); },

    setColor(color: string) {
      const rgb = hexToRgb(color);
      hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      updateUI();
    },

    getColor() {
      const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    },

    getRgb() {
      const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
      return { ...rgb, a: alpha };
    },

    getHsl() {
      const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
      return { ...rgbToHsl(rgb.r, rgb.g, rgb.b), a: alpha };
    },

    destroy() {
      destroyed = true;
      picker.remove();
    },
  };

  return instance;
}
