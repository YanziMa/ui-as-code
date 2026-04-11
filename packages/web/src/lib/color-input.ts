/**
 * Color Input: Visual color picker widget with saturation/brightness gradient,
 * hue slider, alpha channel, hex/RGB/HSL text inputs, preset swatches,
 * recent colors history, eyedropper trigger, and format switching.
 */

// --- Types ---

export type ColorInputFormat = "hex" | "rgb" | "hsl" | "auto";

export interface ColorSwatch {
  /** Hex color value */
  color: string;
  /** Label (optional) */
  label?: string;
}

export interface ColorInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial color value */
  value?: string;
  /** Display format */
  format?: ColorInputFormat;
  /** Show alpha/transparency control */
  showAlpha?: boolean;
  /** Preset color swatches */
  presets?: ColorSwatch[];
  /** Max recent colors to remember (default: 8) */
  maxRecent?: number;
  /** Enable eyedropper (native color input fallback) */
  enableEyedropper?: boolean;
  /** Callback on color change */
  onChange?: (color: string) => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface ColorInputInstance {
  element: HTMLElement;
  /** Get current color as hex */
  getValue: () => string;
  /** Set color programmatically */
  setValue: (color: string) => void;
  /** Get as specific format */
  getAsHex: () => string;
  getAsRgb: () => string;
  getAsHsl: () => string;
  /** Get alpha value (0-1) */
  getAlpha: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Color Math ---

interface Rgb { r: number; g: number; b: number; }
interface Hsl { h: number; s: number; l: number; }

function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + 6) % 6; break;
    case g: h = ((b - r) / d + 4); break;
    default: h = ((r - g) / d + 2); break;
  }
  return { h: h * 60, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const fn = (n: number) => {
    const k = (n + l < 1 ? n + l - 1 : n + l > 1 ? n + l - 1 : n);
    return k < 1 / 6 ? k * 6 : k < 1 / 2 ? 1 : k < 2 / 3 ? 1 - (k - 2 / 3) * 6 : 0;
  };
  return {
    r: Math.round(255 * fn(h + 1 / 3)),
    g: Math.round(255 * fn(h)),
    b: Math.round(255 * fn(h - 1 / 3)),
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// --- Default Presets ---

const DEFAULT_PRESETS: ColorSwatch[] = [
  { color: "#ef4444", label: "Red" },
  { color: "#f97316", label: "Orange" },
  { color: "#eab308", label: "Yellow" },
  { color: "#22c55e", label: "Green" },
  { color: "#06b6d4", label: "Cyan" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#8b5cf6", label: "Purple" },
  { color: "#ec4899", label: "Pink" },
  { color: "#000000", label: "Black" },
  { color: "#ffffff", label: "White" },
  { color: "#6b7280", label: "Gray" },
  { color: "#f43f5e", label: "Rose" },
];

// --- Main Factory ---

export function createColorInput(options: ColorInputOptions): ColorInputInstance {
  const opts = {
    value: options.value ?? "#000000",
    format: options.format ?? "auto",
    showAlpha: options.showAlpha ?? false,
    presets: options.presets?.length ? options.presets : DEFAULT_PRESETS,
    maxRecent: options.maxRecent ?? 8,
    enableEyedropper: options.enableEyedropper ?? false,
    disabled: options.disabled ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ColorInput: container not found");

  // Parse initial color
  let rgb = hexToRgb(opts.value) ?? { r: 0, g: 0, b: 0 };
  let hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  let alpha = 1;

  // Recent colors from localStorage key
  const storageKey = "ci-recent-" + (container.id || "default");
  let recentColors: string[] = [];
  try { recentColors = JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch {}

  let destroyed = false;

  container.className = `color-input ${opts.className ?? ""}`;
  container.style.cssText = `
    display:inline-flex;flex-direction:column;gap:10px;font-family:-apple-system,sans-serif;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;

  // --- Saturation/Brightness Gradient Picker ---

  const sbWrapper = document.createElement("div");
  sbWrapper.style.cssText = `
    position:relative;width:200px;height:150px;border-radius:8px;overflow:hidden;
    cursor:crosshair;border:1px solid #d1d5db;
  `;
  container.appendChild(sbWrapper);

  const sbCanvas = document.createElement("div");
  sbCanvas.style.cssText = `
    position:absolute;inset:0;background:linear-gradient(to right,#fff,transparent);
  `;
  sbWrapper.appendChild(sbCanvas);

  const sbOverlay = document.createElement("div");
  sbOverlay.style.cssText = `
    position:absolute;inset:0;background:linear-gradient(to top,#000,transparent);
  `;
  sbWrapper.appendChild(sbOverlay);

  // SB cursor
  const sbCursor = document.createElement("div");
  sbCursor.style.cssText = `
    position:absolute;width:14px;height:14px;border-radius:50%;
    border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,0.4);transform:translate(-50%,-50%);
    pointer-events:none;z-index:2;
  `;
  sbWrapper.appendChild(sbCursor);

  // --- Hue Slider ---

  const hueRow = document.createElement("div");
  hueRow.style.cssText = "display:flex;align-items:center;gap:8px;";
  container.appendChild(hueRow);

  const hueLabel = document.createElement("span");
  hueLabel.textContent = "H";
  hueLabel.style.cssText = "font-size:11px;color:#6b7280;font-weight:600;width:12px;text-align:center;";
  hueRow.appendChild(hueLabel);

  const hueSlider = document.createElement("input");
  hueSlider.type = "range";
  hueSlider.min = "0";
  hueSlider.max = "360";
  hueSlider.value = String(Math.round(hsl.h));
  hueSlider.style.cssText = `
    flex:1;height:10px;-webkit-appearance:none;appearance:none;border-radius:5px;
    background:linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000);
    outline:none;cursor:pointer;
  `;
  hueRow.appendChild(hueSlider);

  // --- Alpha Slider ---

  let alphaRow: HTMLElement | null = null;
  let alphaSlider: HTMLInputElement | null = null;

  if (opts.showAlpha) {
    alphaRow = document.createElement("div");
    alphaRow.style.cssText = "display:flex;align-items:center;gap:8px;";
    container.appendChild(alphaRow);

    const aLabel = document.createElement("span");
    aLabel.textContent = "A";
    aLabel.style.cssText = "font-size:11px;color:#6b7280;font-weight:600;width:12px;text-align:center;";
    alphaRow.appendChild(aLabel);

    alphaSlider = document.createElement("input");
    alphaSlider.type = "range";
    alphaSlider.min = "0";
    alphaSlider.max = "100";
    alphaSlider.value = String(Math.round(alpha * 100));
    alphaSlider.style.cssText = `
      flex:1;height:10px;-webkit-appearance:none;appearance:none;border-radius:5px;
      background:url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABlJREFUeNpi+P//PwMxgImBQjBQjUGgBBCogFQOASUAAQYAqJkzWtKzyTAAAAAElFTkSuQmCC');
      outline:none;cursor:pointer;
    `;
    alphaRow.appendChild(alphaSlider);
  }

  // --- Text Inputs Row ---

  const inputsRow = document.createElement("div");
  inputsRow.style.cssText = "display:flex;gap:6px;align-items:center;";
  container.appendChild(inputsRow);

  const hexInput = document.createElement("input");
  hexInput.type = "text";
  hexInput.value = rgbToHex(rgb.r, rgb.g, rgb.b);
  hexInput.placeholder = "#000000";
  hexInput.maxLength = 7;
  hexInput.spellcheck = false;
  hexInput.style.cssText = `
    width:80px;padding:4px 6px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;
    font-family:monospace;text-transform:uppercase;outline:none;
  `;
  hexInput.addEventListener("change", () => handleHexInput());
  inputsRow.appendChild(hexInput);

  const rgbInputs = document.createElement("div");
  rgbInputs.style.cssText = "display:flex;gap:2px;";
  inputsRow.appendChild(rgbInputs);

  for (const ch of ["R", "G", "B"]) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = "0";
    inp.max = "255";
    inp.dataset.channel = ch;
    inp.value = String(ch === "R" ? rgb.r : ch === "G" ? rgb.g : rgb.b);
    inp.style.cssText = `
      width:42px;padding:4px;border:1px solid #d1d5db;border-radius:4px;font-size:11px;
      font-family:monospace;text-align:center;outline:none;-moz-appearance:textfield;
    `;
    inp.addEventListener("change", () => handleRgbInput());
    rgbInputs.appendChild(inp);
  }

  // Preview swatch
  const preview = document.createElement("div");
  preview.style.cssText = `
    width:28px;height:28px;border-radius:6px;border:1px solid #d1d5db;flex-shrink:0;
    cursor:pointer;position:relative;overflow:hidden;
  `;
  preview.title = "Click to copy";
  preview.addEventListener("click", () => {
    navigator.clipboard.writeText(getCurrentHex()).catch(() => {});
  });
  inputsRow.appendChild(preview);

  // --- Preset Swatches ---

  const presetsGrid = document.createElement("div");
  presetsGrid.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";
  container.appendChild(presetsGrid);

  for (const swatch of opts.presets) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = swatch.label ?? swatch.color;
    btn.style.cssText = `
      width:22px;height:22px;border-radius:4px;border:2px solid transparent;
      padding:0;cursor:pointer;transition:border-color 0.15s;
      background:${swatch.color};
    `;
    btn.addEventListener("click", () => setValue(swatch.color));
    btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#6366f1"; });
    btn.addEventListener("mouseleave", () => { btn.style.borderColor = "transparent"; });
    presetsGrid.appendChild(btn);
  }

  // --- Recent Colors ---

  let recentEl: HTMLElement | null = null;
  function renderRecent(): void {
    if (!recentEl || recentColors.length === 0) return;
    recentEl.innerHTML = "";
    for (const c of recentColors) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = `
        width:18px;height:18px;border-radius:3px;border:1px solid #e5e7eb;
        padding:0;cursor:pointer;background:${c};
      `;
      btn.addEventListener("click", () => setValue(c));
      recentEl.appendChild(btn);
    }
  }

  if (opts.maxRecent > 0) {
    recentEl = document.createElement("div");
    recentEl.style.cssText = "display:flex;gap:3px;align-items:center;margin-top:2px;";
    const recentLabel = document.createElement("span");
    recentLabel.textContent = "Recent:";
    recentLabel.style.cssText = "font-size:10px;color:#9ca3af;margin-right:4px;";
    recentEl.appendChild(recentLabel);
    renderRecent();
    container.appendChild(recentEl);
  }

  // --- Eyedropper ---

  if (opts.enableEyedropper) {
    const eyeBtn = document.createElement("input");
    eyeBtn.type = "color";
    eyeBtn.value = getCurrentHex();
    eyeBtn.style.cssText = `
      width:24px;height:24px;border:none;border-radius:4px;cursor:pointer;padding:0;
      opacity:0;position:absolute;pointer-events:auto;
    `;
    eyeBtn.addEventListener("input", () => setValue(eyeBtn.value));

    const eyeWrap = document.createElement("div");
    eyeWrap.style.cssText = "position:relative;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;";
    eyeWrap.innerHTML =
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><path d="M2 22l1-1h3l9-9"/><path d="M3 21v-3l9-9"/><circle cx="17" cy="7" r="4"/></svg>`;
    eyeWrap.appendChild(eyeBtn);
    eyeWrap.style.cursor = "pointer";
    container.appendChild(eyeWrap);
  }

  // --- Core Logic ---

  function getCurrentHex(): string {
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function updateFromHSL(): void {
    rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    syncUI();
  }

  function syncUI(): void {
    // Update SB cursor position
    const sbX = hsl.s;
    const sbY = 100 - hsl.l;
    sbCursor.style.left = `${sbX}%`;
    sbCursor.style.top = `${sbY}%`;
    sbCursor.style.background = `hsl(${Math.round(hsl.h)}, 100%, 50%)`;

    // Update hue slider
    hueSlider.value = String(Math.round(hsl.h));

    // Update alpha slider
    if (alphaSlider) alphaSlider.value = String(Math.round(alpha * 100));

    // Update text inputs
    hexInput.value = getCurrentHex();
    const rgbInps = rgbInputs.querySelectorAll<HTMLInputElement>("input[data-channel]");
    for (const inp of rgbInps) {
      const ch = inp.dataset.channel!;
      inp.value = String(ch === "R" ? rgb.r : ch === "G" ? rgb.g : rgb.b);
    }

    // Update preview
    const hex = getCurrentHex();
    if (opts.showAlpha && alpha !== 1) {
      preview.style.background = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha.toFixed(2)})`;
    } else {
      preview.style.background = hex;
    }
  }

  function addRecent(color: string): void {
    const idx = recentColors.indexOf(color);
    if (idx >= 0) recentColors.splice(idx, 1);
    recentColors.unshift(color);
    if (recentColors.length > opts.maxRecent!) recentColors.pop();
    try { localStorage.setItem(storageKey, JSON.stringify(recentColors)); } catch {}
    renderRecent();
  }

  function setValue(color: string): void {
    const parsed = hexToRgb(color.replace("#", ""));
    if (!parsed) return;
    rgb = parsed;
    hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    syncUI();
    addRecent(getCurrentHex());
    opts.onChange?.(getCurrentHex());
  }

  // --- Event Handlers ---

  // SB picker drag
  let sbDragging = false;

  function handleSBMove(e: MouseEvent | TouchEvent): void {
    if (!sbDragging || destroyed) return;
    const rect = sbWrapper.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

    hsl.s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    hsl.l = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);

    updateFromHSL();
    opts.onChange?.(getCurrentHex());
  }

  sbWrapper.addEventListener("mousedown", (e) => {
    if (opts.disabled || destroyed) return;
    sbDragging = true;
    handleSBMove(e);
  });

  document.addEventListener("mousemove", (e) => handleSBMove(e));
  document.addEventListener("mouseup", () => { sbDragging = false; addRecent(getCurrentHex()); });

  sbWrapper.addEventListener("touchstart", (e) => {
    if (opts.disabled || destroyed) return;
    e.preventDefault();
    sbDragging = true;
    handleSBMove(e);
  }, { passive: false });
  document.addEventListener("touchmove", (e) => handleSBMove(e));
  document.addEventListener("touchend", () => { sbDragging = false; addRecent(getCurrentHex()); });

  // Hue slider
  hueSlider.addEventListener("input", () => {
    hsl.h = parseFloat(hueSlider.value);
    updateFromHSL();
    opts.onChange?.(getCurrentHex());
  });

  // Alpha slider
  if (alphaSlider) {
    alphaSlider.addEventListener("input", () => {
      alpha = parseFloat(alphaSlider.value) / 100;
      syncUI();
      opts.onChange?.(getCurrentHex());
    });
  }

  // Hex input
  function handleHexInput(): void {
    const val = hexInput.value.trim().replace("#", "");
    if (/^[a-fA-F\d]{6}$/.test(val)) {
      setValue("#" + val.toLowerCase());
    }
  }

  // RGB inputs
  function handleRgbInput(): void {
    const rgbInps = rgbInputs.querySelectorAll<HTMLInputElement>("input[data-channel]");
    let r = 0, g = 0, b = 0;
    for (const inp of rgbInps) {
      const v = clamp(parseInt(inp.value) || 0, 0, 255);
      switch (inp.dataset.channel) {
        case "R": r = v; break;
        case "G": g = v; break;
        case "B": b = v; break;
      }
    }
    rgb = { r, g, b };
    hsl = rgbToHsl(r, g, b);
    syncUI();
    opts.onChange?.(getCurrentHex());
  }

  // Keyboard support on hex input
  hexInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleHexInput();
  });

  // Initial sync
  syncUI();

  // --- Public API ---

  const instance: ColorInputInstance = {
    element: container,

    getValue: getCurrentHex,

    setValue,

    getAsHex: () => getCurrentHex(),

    getAsRgb: () => `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,

    getAsHsl: () => `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`,

    getAlpha: () => alpha,

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
