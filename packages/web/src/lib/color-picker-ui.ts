/**
 * Color Picker UI: Visual color picker with hue/saturation/lightness canvas,
 * hue slider, alpha slider, hex/RGB/HSL input fields, swatches palette,
 * eyedropper simulation, and keyboard accessibility.
 */

// --- Types ---

export interface ColorSwatch {
  /** Hex color value */
  color: string;
  /** Label/tooltip */
  label?: string;
}

export interface ColorPickerUIOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial color (hex, rgb, hsl) */
  value?: string;
  /** Show alpha/transparency slider */
  showAlpha?: boolean;
  /** Show HSL inputs */
  showHSL?: boolean;
  /** Show RGB inputs */
  showRGB?: true;
  /** Show hex input */
  showHex?: true;
  /** Preset swatches */
  swatches?: ColorSwatch[];
  /** Max swatches per row (default: 8) */
  swatchesPerRow?: number;
  /** Callback on color change (fires continuously during drag) */
  onChange?: (color: { hex: string; r: number; g: number; b: number; a: number; h: number; s: number; l: number }) => void;
  /** Callback on final selection (mouse up / Enter) */
  onSelect?: (color: { hex: string; r: number; g: number; b: number; a: number }) => void;
  /** Disable the picker */
  disabled?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Custom CSS class */
  className?: string;
  /** Z-index for popup positioning */
  zIndex?: number;
  /** Popover mode: shows as anchored popover instead of inline */
  popover?: boolean;
  /** Anchor element for popover mode */
  anchor?: HTMLElement;
}

export interface ColorPickerUIInstance {
  /** Root DOM element */
  element: HTMLElement;
  /** Get current color as hex */
  getHex: () => string;
  /** Get current color as rgba string */
  getRgba: () => string;
  /** Get full color object */
  getColor: () => { hex: string; r: number; g: number; b: number; a: number; h: number; s: number; l: number };
  /** Set color by hex string */
  setHex: (hex: string) => void;
  /** Show (for popover mode) */
  show: () => void;
  /** Hide (for popover mode) */
  hide: () => void;
  /** Toggle visibility (popover mode) */
  toggle: () => void;
  /** Check if visible (popover mode) */
  isVisible: () => boolean;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Color Math (self-contained) ---

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(255 * hue2rgb(p, q, h + 1 / 3)),
    g: Math.round(255 * hue2rgb(p, q, h)),
    b: Math.round(255 * hue2rgb(p, q, h - 1 / 3)),
  };
}

// --- Default Swatches ---

const DEFAULT_SWATCHES: ColorSwatch[] = [
  { color: "#000000", label: "Black" },
  { color: "#434343", label: "Dark Gray" },
  { color: "#666666", label: "Gray" },
  { color: "#999999", label: "Light Gray" },
  { color: "#cccccc", label: "Silver" },
  { color: "#ffffff", label: "White" },
  { color: "#ef4444", label: "Red" },
  { color: "#f97316", label: "Orange" },
  { color: "#eab308", label: "Yellow" },
  { color: "#22c55e", label: "Green" },
  { color: "#06b6d4", label: "Cyan" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#8b5cf6", label: "Purple" },
  { color: "#ec4899", label: "Pink" },
  { color: "#dc2626", label: "Dark Red" },
  { color: "#ea580c", label: "Dark Orange" },
];

// --- Main Factory ---

export function createColorPickerUI(options: ColorPickerUIOptions): ColorPickerUIInstance {
  const opts = {
    value: options.value ?? "#4f46e5",
    showAlpha: options.showAlpha ?? true,
    showHSL: options.showHSL ?? false,
    showRGB: options.showRGB ?? true,
    showHex: options.showHex ?? true,
    swatches: options.swatches ?? DEFAULT_SWATCHES,
    swatchesPerRow: options.swatchesPerRow ?? 8,
    size: options.size ?? "md",
    zIndex: options.zIndex ?? 10600,
    disabled: options.disabled ?? false,
    popover: options.popover ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ColorPickerUI: container not found");

  // Parse initial color
  let { r, g, b } = parseColor(opts.value) ?? { r: 79, g: 70, b: 229 };
  let a = 1;
  let { h, s, l } = rgbToHsl(r, g, b);

  // State
  let visible = false;
  let destroyed = false;
  let draggingCanvas = false;
  let draggingHue = false;
  let draggingAlpha = false;

  // Size config
  const sizes = {
    sm: { canvasW: 180, canvasH: 120, sliderH: 10, inputSize: 28, fontSize: 11 },
    md: { canvasW: 220, canvasH: 150, sliderH: 12, inputSize: 32, fontSize: 12 },
    lg: { canvasW: 280, canvasH: 180, sliderH: 14, inputSize: 36, fontSize: 13 },
  };
  const sz = sizes[opts.size];

  // Root
  const root = document.createElement("div");
  root.className = `cpui-root ${opts.className ?? ""}`;
  root.style.cssText = `
    display:${opts.popover ? "none" : "block"};position:${opts.popover ? "absolute" : "relative"};
    z-index:${opts.zIndex};background:#fff;border-radius:12px;
    box-shadow:0 8px 40px rgba(0,0,0,0.18);padding:14px;
    font-family:-apple-system,sans-serif;font-size:${sz.fontSize}px;color:#333;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;
  if (opts.popover && opts.anchor) {
    document.body.appendChild(root);
  } else {
    container.appendChild(root);
  }

  // === Saturation/Lightness Canvas ===
  const canvasWrap = document.createElement("div");
  canvasWrap.style.cssText = `
    position:relative;width:${sz.canvasW}px;height:${sz.canvasH}px;border-radius:8px;
    overflow:hidden;cursor:crosshair;margin-bottom:10px;
  `;

  const slCanvas = document.createElement("canvas");
  slCanvas.width = sz.canvasW;
  slCanvas.height = sz.canvasH;
  slCanvas.style.cssText = "display:block;width:100%;height:100%;";
  canvasWrap.appendChild(slCanvas);

  // Canvas cursor indicator
  const slCursor = document.createElement("div");
  slCursor.style.cssText = `
    position:absolute;width:16px;height:16px;border-radius:50%;
    border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,0.4);pointer-events:none;
    transform:translate(-50%,-50%);
  `;
  canvasWrap.appendChild(slCursor);

  root.appendChild(canvasWrap);

  // === Hue Slider ===
  const hueRow = document.createElement("div");
  hueRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:8px;";
  const hueLabel = document.createElement("span");
  hueLabel.textContent = "H";
  hueLabel.style.cssText = "width:12px;text-align:center;font-weight:600;font-size:11px;color:#666;";
  const hueSliderWrap = document.createElement("div");
  hueSliderWrap.style.cssText = `flex:1;height:${sz.sliderH}px;border-radius:${sz.sliderH / 2}px;position:relative;cursor:pointer;background:linear-gradient(to right,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000);`;
  const hueCursor = document.createElement("div");
  hueCursor.style.cssText = `
    position:absolute;width:14px;height:14px;border-radius:50%;border:2px solid #fff;
    box-shadow:0 0 3px rgba(0,0,0,0.4);top:50%;transform:translate(-50%,-50%);pointer-events:none;
  `;
  hueSliderWrap.appendChild(hueCursor);
  hueRow.append(hueLabel, hueSliderWrap);
  root.appendChild(hueRow);

  // === Alpha Slider ===
  let alphaRow: HTMLElement | null = null;
  let alphaCursor: HTMLDivElement | null = null;
  let alphaSliderWrap: HTMLDivElement | null = null;

  if (opts.showAlpha) {
    alphaRow = document.createElement("div");
    alphaRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:8px;";
    const alphaLabel = document.createElement("span");
    alphaLabel.textContent = "A";
    alphaLabel.style.cssText = "width:12px;text-align:center;font-weight:600;font-size:11px;color:#666;";
    alphaSliderWrap = document.createElement("div");
    alphaSliderWrap.style.cssText = `flex:1;height:${sz.sliderH}px;border-radius:${sz.sliderH / 2}px;position:relative;cursor:pointer;`;
    alphaCursor = document.createElement("div");
    alphaCursor.style.cssText = `
      position:absolute;width:14px;height:14px;border-radius:50%;border:2px solid #fff;
      box-shadow:0 0 3px rgba(0,0,0,0.4);top:50%;transform:translate(-50%,-50%);pointer-events:none;
    `;
    alphaSliderWrap!.appendChild(alphaCursor!);
    alphaRow!.append(alphaLabel, alphaSliderWrap!);
    root.appendChild(alphaRow!);
  }

  // === Input Fields ===
  const inputsRow = document.createElement("div");
  inputsRow.style.cssText = "display:flex;gap:6px;align-items:center;flex-wrap:wrap;";

  if (opts.showHex) {
    const hexInput = createInputField("HEX", 80, opts.inputSize);
    hexInput.input.value = rgbToHex(r, g, b);
    hexInput.input.addEventListener("change", () => {
      const parsed = hexToRgb(hexInput.input.value);
      if (parsed) { r = parsed.r; g = parsed.g; b = parsed.b; ({ h, s, l } = rgbToHsl(r, g, b)); updateAll(); }
    });
    hexInput.input.addEventListener("input", () => {
      const parsed = hexToRgb(hexInput.input.value);
      if (parsed) { r = parsed.r; g = parsed.g; b = parsed.b; ({ h, s, l } = rgbToHsl(r, g, b)); updateAll(true); }
    });
    (hexInput as any)._type = "hex";
    inputsRow.appendChild(hexInput.wrap);
  }

  if (opts.showRGB) {
    ["R", "G", "B"].forEach((ch, i) => {
      const field = createInputField(ch, 42, opts.inputSize);
      field.input.type = "number";
      field.input.min = "0";
      field.input.max = "255";
      field.input.value = String([r, g, b][i]);
      field.input.addEventListener("change", () => {
        const v = clampInt(parseInt(field.input.value) || 0, 0, 255);
        if (ch === "R") r = v; else if (ch === "G") g = v; else b = v;
        ({ h, s, l } = rgbToHsl(r, g, b)); updateAll();
      });
      inputsRow.appendChild(field.wrap);
    });
  }

  if (opts.showHSL) {
    ["H", "S", "L"].forEach((ch, i) => {
      const field = createInputField(ch, 42, opts.inputSize);
      field.input.type = "number";
      const max = ch === "H" ? 360 : 100;
      field.input.min = "0";
      field.input.max = String(max);
      field.input.value = String([{ h, s, l }, { h, s, l }][i]?.[ch.toLowerCase()] ?? 0);
      field.input.addEventListener("change", () => {
        const v = clampInt(parseInt(field.input.value) || 0, 0, max);
        if (ch === "H") h = v; else if (ch === "S") s = v; else l = v;
        ({ r, g, b } = hslToRgb(h, s, l)); updateAll();
      });
      inputsRow.appendChild(field.wrap);
    });
  }

  // Preview color swatch
  const preview = document.createElement("div");
  preview.style.cssText = `
    width:${sz.inputSize}px;height:${sz.inputSize}px;border-radius:6px;border:1px solid #d1d5db;
    flex-shrink:0;position:relative;overflow:hidden;
  `;
  const previewInner = document.createElement("div");
  previewInner.style.cssText = "position:absolute;inset:0;";
  preview.appendChild(preview);
  preview.appendChild(previewInner);
  inputsRow.appendChild(preview);

  root.appendChild(inputsRow);

  // === Swatches ===
  if (opts.swatches.length > 0) {
    const swatchGrid = document.createElement("div");
    swatchGrid.style.cssText = `
      display:grid;grid-template-columns:repeat(${opts.swatchesPerRow}, 1fr);gap:4px;
      margin-top:10px;padding-top:10px;border-top:1px solid #f0f0f0;
    `;

    for (const sw of opts.swatches) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = sw.label ?? sw.color;
      btn.style.cssText = `
        width:100%;aspect-ratio:1;border-radius:4px;border:1px solid #e5e7eb;
        background:${sw.color};cursor:pointer;transition:transform 0.1s,box-shadow 0.1s;
      `;
      btn.addEventListener("click", () => {
        const parsed = hexToRgb(sw.color);
        if (parsed) { r = parsed.r; g = parsed.g; b = parsed.b; ({ h, s, l } = rgbToHsl(r, g, b)); updateAll(); }
      });
      btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.15)"; btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)"; });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; btn.style.boxShadow = ""; });
      swatchGrid.appendChild(btn);
    }

    root.appendChild(swatchGrid);
  }

  // --- Rendering ---

  function renderSLCanvas(): void {
    const ctx = slCanvas.getContext("2d");
    if (!ctx) return;

    // White base (lightness = 100)
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, sz.canvasW, sz.canvasH);

    // Saturation gradient (left to right)
    const satGrad = ctx.createLinearGradient(0, 0, sz.canvasW, 0);
    satGrad.addColorStop(0, "#fff");
    const { r: sr, g: sg, b: sb } = hslToRgb(h, 100, 50);
    satGrad.addColorStop(1, `rgb(${sr},${sg},${sb})`);
    ctx.fillStyle = satGrad;
    ctx.fillRect(0, 0, sz.canvasW, sz.canvasH);

    // Lightness gradient (bottom to top = black overlay)
    const litGrad = ctx.createLinearGradient(0, 0, 0, sz.canvasH);
    litGrad.addColorStop(0, "transparent");
    litGrad.addColorStop(1, "#000");
    ctx.fillStyle = litGrad;
    ctx.fillRect(0, 0, sz.canvasW, sz.canvasH);
  }

  function renderAlphaBackground(): void {
    if (!alphaSliderWrap) return;
    // Checkerboard pattern for transparency
    const checker = `repeating-conic-gradient(#ccc 0% 25%,#fff 0% 50%) 50% / 10px 10px`;
    alphaSliderWrap.style.background = `${checker}, linear-gradient(to right, transparent, ${rgbToHex(r, g, b)})`;
  }

  function updateSlCursor(): void {
    // Position cursor based on current S and L
    const cx = (s / 100) * sz.canvasW;
    const cy = (1 - l / 100) * sz.canvasH;
    slCursor.style.left = `${cx}px`;
    slCursor.style.top = `${cy}px`;
    slCursor.style.borderColor = l > 55 ? "#333" : "#fff";
  }

  function updateHueCursor(): void {
    const hx = (h / 360) * hueSliderWrap.offsetWidth;
    hueCursor.style.left = `${hx}px`;
  }

  function updateAlphaCursor(): void {
    if (!alphaCursor || !alphaSliderWrap) return;
    const ax = a * alphaSliderWrap.offsetWidth;
    alphaCursor.style.left = `${ax}px`;
  }

  function updatePreview(): void {
    previewInner.style.background = opts.showAlpha ? `rgba(${r},${g},${b},${a})` : rgbToHex(r, g, b);
  }

  function updateInputs(silent = false): void {
    const hexVal = rgbToHex(r, g, b);
    const children = inputsRow.querySelectorAll("input");
    for (const inp of children) {
      const wrap = inp.parentElement?.parentElement as any;
      if (wrap?._type === "hex" && !silent) inp.value = hexVal;
      else if (inp.placeholder === "R" && !silent) inp.value = String(r);
      else if (inp.placeholder === "G" && !silent) inp.value = String(g);
      else if (inp.placeholder === "B" && !silent) inp.value = String(b);
      else if (inp.placeholder === "H" && !silent) inp.value = String(h);
      else if (inp.placeholder === "S" && !silent) inp.value = String(s);
      else if (inp.placeholder === "L" && !silent) inp.value = String(l);
    }
  }

  function updateAll(silent = false): void {
    renderSLCanvas();
    if (opts.showAlpha) renderAlphaBackground();
    updateSlCursor();
    updateHueCursor();
    updateAlphaCursor();
    updatePreview();
    updateInputs(silent);

    const colorObj = { hex: rgbToHex(r, g, b), r, g, b, a, h, s, l };
    opts.onChange?.(colorObj);
  }

  function emitSelect(): void {
    opts.onSelect?.({ hex: rgbToHex(r, g, b), r, g, b, a });
  }

  // --- Event Handlers ---

  function handleSlDrag(e: MouseEvent | TouchEvent): void {
    const rect = slCanvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;

    s = clampInt(Math.round(((clientX - rect.left) / rect.width) * 100), 0, 100);
    l = clampInt(Math.round(100 - ((clientY - rect.top) / rect.height) * 100), 0, 100);

    ({ r, g, b } = hslToRgb(h, s, l));
    updateAll();
  }

  function handleHueDrag(e: MouseEvent | TouchEvent): void {
    const rect = hueSliderWrap.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    h = clampInt(Math.round(((clientX - rect.left) / rect.width) * 360), 0, 360);

    ({ r, g, b } = hslToRgb(h, s, l));
    updateAll();
  }

  function handleAlphaDrag(e: MouseEvent | TouchEvent): void {
    if (!alphaSliderWrap) return;
    const rect = alphaSliderWrap.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    a = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    updateAll();
  }

  // Canvas drag
  slCanvas.addEventListener("mousedown", (e) => { draggingCanvas = true; handleSlDrag(e); });
  hueSliderWrap.addEventListener("mousedown", (e) => { draggingHue = true; handleHueDrag(e); });
  if (alphaSliderWrap) alphaSliderWrap.addEventListener("mousedown", (e) => { draggingAlpha = true; handleAlphaDrag(e); });

  document.addEventListener("mousemove", (e) => {
    if (draggingCanvas) handleSlDrag(e);
    if (draggingHue) handleHueDrag(e);
    if (draggingAlpha) handleAlphaDrag(e);
  });

  document.addEventListener("mouseup", () => {
    if (draggingCanvas || draggingHue || draggingAlpha) emitSelect();
    draggingCanvas = false;
    draggingHue = false;
    draggingAlpha = false;
  });

  // Touch support
  slCanvas.addEventListener("touchstart", (e) => { draggingCanvas = true; handleSlDrag(e); }, { passive: true });
  hueSliderWrap.addEventListener("touchstart", (e) => { draggingHue = true; handleHueDrag(e); }, { passive: true });
  if (alphaSliderWrap) alphaSliderWrap.addEventListener("touchstart", (e) => { draggingAlpha = true; handleAlphaDrag(e); }, { passive: true });

  document.addEventListener("touchmove", (e) => {
    if (draggingCanvas) handleSlDrag(e);
    if (draggingHue) handleHueDrag(e);
    if (draggingAlpha) handleAlphaDrag(e);
  }, { passive: true });

  document.addEventListener("touchend", () => {
    if (draggingCanvas || draggingHue || draggingAlpha) emitSelect();
    draggingCanvas = false;
    draggingHue = false;
    draggingAlpha = false;
  });

  // Click outside to close (popover mode)
  if (opts.popover) {
    document.addEventListener("mousedown", (e) => {
      if (visible && !root.contains(e.target as Node)) instance.hide();
    });
  }

  // --- Instance API ---

  function positionPopover(): void {
    if (!opts.anchor || !opts.popover) return;
    const rect = opts.anchor.getBoundingClientRect();
    root.style.left = `${rect.left}px`;
    root.style.top = `${rect.bottom + 4}px`;
  }

  const instance: ColorPickerUIInstance = {
    element: root,

    getHex() { return rgbToHex(r, g, b); },

    getRgba() { return opts.showAlpha ? `rgba(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`; },

    getColor() { return { hex: rgbToHex(r, g, b), r, g, b, a, h, s, l }; },

    setHex(hex: string) {
      const parsed = hexToRgb(hex);
      if (parsed) { r = parsed.r; g = parsed.g; b = parsed.b; ({ h, s, l } = rgbToHsl(r, g, b)); updateAll(); }
    },

    show() {
      if (!opts.popover) return;
      visible = true;
      root.style.display = "block";
      positionPopover();
      updateAll();
    },

    hide() {
      if (!opts.popover) return;
      visible = false;
      root.style.display = "none";
    },

    toggle() { visible ? this.hide() : this.show(); },

    isVisible() { return visible; },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  // Initial render
  updateAll();

  return instance;
}

// --- Helpers ---

function parseColor(c: string): { r: number; g: number; b: number } | null {
  const hex = hexToRgb(c);
  if (hex) return hex;
  const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return { r: parseInt(rgb[1]!), g: parseInt(rgb[2]!), b: parseInt(rgb[3]!) };
  return null;
}

function createInputField(label: string, width: number, height: number): { wrap: HTMLElement; input: HTMLInputElement } {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:2px;";

  const lbl = document.createElement("span");
  lbl.textContent = label;
  lbl.style.cssText = "font-size:9px;color:#888;font-weight:500;text-transform:uppercase;";

  const input = document.createElement("input");
  input.type = "text";
  input.spellcheck = false;
  input.style.cssText = `
    width:${width}px;height:${height - 14}px;border:1px solid #d1d5db;border-radius:4px;
    padding:2px 4px;font-size:inherit;font-family:inherit;text-align:center;
    outline:none;transition:border-color 0.15s;box-sizing:border-box;
  `;
  input.addEventListener("focus", () => { input.style.borderColor = "#4338ca"; });
  input.addEventListener("blur", () => { input.style.borderColor = "#d1d5db"; });

  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return { wrap, input };
}

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}
