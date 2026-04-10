/**
 * Color Palette Generator: Create harmonious color palettes from a base color.
 * Supports complementary, analogous, triadic, split-complementary, tetradic,
 * monochromatic, and custom schemes. Includes shade generation, contrast
 * checking, WCAG compliance info, and visual swatch rendering.
 */

// --- Types ---

export type PaletteScheme =
  | "complementary"
  | "analogous"
  | "triadic"
  | "splitComplementary"
  | "tetradic"
  | "monochromatic"
  | "custom";

export interface ColorShade {
  hex: string;
  hsl: { h: number; s: number; l: number };
  name: string;
}

export interface PaletteColor {
  /** Base hex color */
  hex: string;
  /** HSL values */
  hsl: { h: number; s: number; l: number };
  /** Generated shades (50-950) */
  shades: ColorShade[];
  /** Contrast ratio against white */
  contrastWhite: number;
  /** Contrast ratio against black */
  contrastBlack: number;
  /** WCAG AA normal text pass? */
  wcagAANormal: boolean;
  /** WCAG AA large text pass? */
  wcagAALarge: boolean;
}

export interface ColorPalette {
  scheme: PaletteScheme;
  baseColor: string;
  colors: PaletteColor[];
  /** All shades flattened for quick access */
  allShades: ColorShade[];
}

export interface ColorPaletteOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Base color (hex) */
  baseColor?: string;
  /** Initial scheme */
  scheme?: PaletteScheme;
  /** Number of shades per color (default: 10) */
  shadeCount?: number;
  /** Show contrast info? */
  showContrast?: boolean;
  /** Show WCAG badges? */
  showWcag?: boolean;
  /** Show hex codes? */
  showHex?: boolean;
  /** Click to copy hex? */
  copyOnClick?: boolean;
  /** Swatch size in px */
  swatchSize?: number;
  /** Gap between swatches */
  gap?: number;
  /** Callback on color click */
  onColorClick?: (color: PaletteColor) => void;
  /** Callback on scheme change */
  onSchemeChange?: (palette: ColorPalette) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ColorPaletteInstance {
  element: HTMLElement;
  getPalette: () => ColorPalette;
  setBaseColor: (hex: string) => void;
  setScheme: (scheme: PaletteScheme) => void;
  getContrastRatio: (fg: string, bg: string) => number;
  destroy: () => void;
}

// --- Color Utilities ---

/** Parse hex to HSL */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
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

/** HSL to hex */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.min(k - 3, Math.min(9 - k, 1));
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Calculate relative luminance */
function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const gamma = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * gamma(r) + 0.7152 * gamma(g) + 0.0722 * gamma(b);
}

/** Calculate WCAG contrast ratio between two colors */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Generate shades from a base HSL color */
function generateShades(h: number, s: number, baseL: number, count: number): ColorShade[] {
  const shades: ColorShade[] = [];
  const step = 100 / (count - 1);

  // Shade names following Tailwind convention
  const names = [
    "50", "100", "200", "300", "400", "500", "600", "700", "800", "900",
    "950",
  ];

  for (let i = 0; i < count; i++) {
    let l: number;
    if (i < count / 2) {
      // Lighter shades
      l = baseL + (100 - baseL) * (1 - i / ((count - 1) / 2));
    } else {
      // Darker shades
      l = baseL * (1 - (i - count / 2) / ((count - 1) / 2));
    }
    l = Math.max(0, Math.min(100, Math.round(l)));

    const hex = hslToHex(h, s, l);
    shades.push({
      hex,
      hsl: { h, s, l },
      name: names[i] ?? String(i),
    });
  }

  return shades;
}

const SHADE_NAMES: Record<number, string> = {
  0: "50", 10: "100", 20: "200", 30: "300", 40: "400",
  50: "500", 60: "600", 70: "700", 80: "800", 90: "900", 95: "950",
};

function getShadeName(lightness: number): string {
  // Find closest named shade
  let closest = "500";
  let closestDiff = Infinity;
  for (const [key, name] of Object.entries(SHADE_NAMES)) {
    const diff = Math.abs(Number(key) - lightness);
    if (diff < closestDiff) { closestDiff = diff; closest = name; }
  }
  return closest;
}

// --- Scheme Generation ---

function generateScheme(baseHsl: { h: number; s: number; l: number }, scheme: PaletteScheme): { h: number; s: number; l: number }[] {
  const { h, s, l } = baseHsl;

  switch (scheme) {
    case "monochromatic":
      return [{ h, s, l }];

    case "complementary":
      return [
        { h, s, l },
        { h: (h + 180) % 360, s, l },
      ];

    case "analogous": {
      const offset = 30;
      return [
        { h, s, l },
        { h: (h + 360 - offset) % 360, s, l },
        { h: (h + offset) % 360, s, l },
      ];
    }

    case "triadic":
      return [
        { h, s, l },
        { h: (h + 120) % 360, s, l },
        { h: (h + 240) % 360, s, l },
      ];

    case "splitComplementary":
      return [
        { h, s, l },
        { h: (h + 180 - 30) % 360, s, l },
        { h: (h + 180 + 30) % 360, s, l },
      ];

    case "tetradic":
      return [
        { h, s, l },
        { h: (h + 90) % 360, s, l },
        { h: (h + 180) % 360, s, l },
        { h: (h + 270) % 360, s, l },
      ];

    default:
      return [{ h, s, l }];
  }
}

// --- Main Class ---

export class ColorPaletteManager {
  create(options: ColorPaletteOptions): ColorPaletteInstance {
    const opts = {
      baseColor: options.baseColor ?? "#4338ca",
      scheme: options.scheme ?? "complementary",
      shadeCount: options.shadeCount ?? 10,
      showContrast: options.showContrast ?? true,
      showWcag: options.showWcag ?? true,
      showHex: options.showHex ?? true,
      copyOnClick: options.copyOnClick ?? true,
      swatchSize: options.swatchSize ?? 48,
      gap: options.gap ?? 6,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ColorPalette: container not found");

    container.className = `color-palette ${opts.className ?? ""}`;
    let currentPalette: ColorPalette;
    let destroyed = false;

    function buildPalette(): ColorPalette {
      const baseHsl = hexToHsl(opts.baseColor);
      const hues = generateScheme(baseHsl, opts.scheme);

      const colors: PaletteColor[] = [];
      const allShades: ColorShade[] = [];

      for (const hue of hues) {
        const shades = generateShades(hue.h, hue.s, hue.l, opts.shadeCount);
        const hex = hslToHex(hue.h, hue.s, hue.l);

        const pc: PaletteColor = {
          hex,
          hsl: hue,
          shades,
          contrastWhite: contrastRatio(hex, "#ffffff"),
          contrastBlack: contrastRatio(hex, "#000000"),
          wcagAANormal: contrastRatio(hex, "#ffffff") >= 4.5 || contrastRatio(hex, "#000000") >= 4.5,
          wcagAALarge: contrastRatio(hex, "#ffffff") >= 3 || contrastRatio(hex, "#000000") >= 3,
        };

        colors.push(pc);
        allShades.push(...shades);
      }

      return {
        scheme: opts.scheme,
        baseColor: opts.baseColor,
        colors,
        allShades,
      };
    }

    function render(): void {
      currentPalette = buildPalette();
      container.innerHTML = "";

      // Header: base color + scheme selector
      const header = document.createElement("div");
      header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;";

      // Base color picker
      const pickerRow = document.createElement("div");
      pickerRow.style.cssText = "display:flex;align-items:center;gap:8px;";

      const baseSwatch = document.createElement("div");
      baseSwatch.style.cssText = `
        width:${opts.swatchSize}px;height:${opts.swatchSize}px;border-radius:8px;
        background:${opts.baseColor};border:2px solid #e5e7eb;cursor:pointer;
        transition:transform 0.15s;
      `;
      baseSwatch.title = opts.baseColor;
      pickerRow.appendChild(baseSwatch);

      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = opts.baseColor;
      colorInput.style.cssText = "width:40px;height:32px;border:none;cursor:pointer;";
      colorInput.addEventListener("input", () => {
        opts.baseColor = colorInput.value;
        render();
        opts.onSchemeChange?.(currentPalette);
      });
      pickerRow.appendChild(colorInput);

      const hexLabel = document.createElement("span");
      hexLabel.textContent = opts.baseColor.toUpperCase();
      hexLabel.style.cssText = "font-size:13px;font-weight:500;font-family:monospace;color:#374151;";
      pickerRow.appendChild(hexLabel);

      header.appendChild(pickerRow);

      // Scheme selector
      const schemes: Array<PaletteScheme> = ["monochromatic", "complementary", "analogous", "triadic", "splitComplementary", "tetradic"];
      const schemeGroup = document.createElement("div");
      schemeGroup.style.cssText = "display:flex;gap:4px;flex-wrap:wrap;";

      for (const sc of schemes) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = sc.split(/(?=[A-Z])/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
        btn.dataset.scheme = sc;
        btn.style.cssText = `
          padding:4px 10px;border-radius:14px;font-size:11px;font-weight:500;border:none;
          cursor:pointer;transition:all 0.15s;
          ${opts.scheme === sc ? "background:#4338ca;color:#fff;" : "background:#f3f4f6;color:#6b7280;"}
        `;
        btn.addEventListener("click", () => {
          opts.scheme = sc;
          render();
          opts.onSchemeChange?.(currentPalette);
        });
        btn.addEventListener("mouseenter", () => {
          if (opts.scheme !== sc) btn.style.background = "#e5e7eb";
        });
        btn.addEventListener("mouseleave", () => {
          if (opts.scheme !== sc) btn.style.background = "#f3f4f6";
        });
        schemeGroup.appendChild(btn);
      }

      header.appendChild(schemeGroup);
      container.appendChild(header);

      // Render each palette color's shades
      for (let ci = 0; ci < currentPalette.colors.length; ci++) {
        const pc = currentPalette.colors[ci]!;

        const section = document.createElement("div");
        section.style.cssText = "margin-bottom:20px;";

        // Color header
        const colorHeader = document.createElement("div");
        colorHeader.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:8px;";

        const mainSwatch = document.createElement("div");
        mainSwatch.style.cssText = `
          width:24px;height:24px;border-radius:4px;background:${pc.hex};
          border:1px solid #e5e7eb;
        `;
        colorHeader.appendChild(mainSwatch);

        const colorName = document.createElement("span");
        colorName.style.cssText = "font-size:12px;font-weight:600;font-family:monospace;color:#374151;";
        colorName.textContent = pc.hex.toUpperCase();
        colorHeader.appendChild(colorName);

        if (opts.showContrast) {
          const crInfo = document.createElement("span");
          crInfo.style.cssText = `font-size:11px;color:${pc.wcagAANormal ? "#22c55e" : "#f59e0b"};margin-left:auto;`;
          crInfo.textContent = `${pc.contrastWhite.toFixed(1)}:1`;
          colorHeader.appendChild(crInfo);
        }

        section.appendChild(colorHeader);

        // Shades row
        const shadesRow = document.createElement("div");
        shadesRow.style.cssText = `display:flex;gap:${opts.gap}px;flex-wrap:wrap;`;

        for (const shade of pc.shades) {
          const swatch = document.createElement("div");
          swatch.className = "cp-swatch";
          swatch.dataset.hex = shade.hex;
          swatch.style.cssText = `
            width:${opts.swatchSize}px;height:${opts.swatchSize}px;border-radius:6px;
            background:${shade.hex};cursor:pointer;position:relative;
            border:1px solid ${shade.l > 85 ? "#e5e7eb" : "transparent"};
            display:flex;align-items:center;justify-content:center;
            transition:transform 0.15s, box-shadow 0.15s;
          `;

          // Hex label below
          if (opts.showHex) {
            const hexLbl = document.createElement("span");
            hexLbl.style.cssText = `
              position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);
              font-size:9px;font-family:monospace;color:#9ca3af;white-space:nowrap;
              opacity:0;transition:opacity 0.15s;
            `;
            hexLbl.textContent = shade.hex.toUpperCase();
            swatch.appendChild(hexLbl);

            swatch.addEventListener("mouseenter", () => { hexLbl.style.opacity = "1"; });
            swatch.addEventListener("mouseleave", () => { hexLbl.style.opacity = ""; });
          }

          // Click interaction
          swatch.addEventListener("click", () => {
            if (opts.copyOnClick) {
              navigator.clipboard.writeText(shade.hex).catch(() => {});
            }
            opts.onColorClick?.(pc);
            swatch.style.transform = "scale(0.92)";
            setTimeout(() => { swatch.style.transform = ""; }, 150);
          });

          swatch.addEventListener("mouseenter", () => { swatch.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)"; });
          swatch.addEventListener("mouseleave", () => { swatch.style.boxShadow = ""; });

          shadesRow.appendChild(swatch);
        }

        section.appendChild(shadesRow);
        container.appendChild(section);
      }
    }

    // Initial render
    render();

    const instance: ColorPaletteInstance = {
      element: container,

      getPalette() { return currentPalette; },

      setBaseColor(hex: string) {
        opts.baseColor = hex;
        render();
      },

      setScheme(scheme: PaletteScheme) {
        opts.scheme = scheme;
        render();
      },

      getContrastRatio(fg: string, bg: string) {
        return contrastRatio(fg, bg);
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a color palette */
export function createColorPalette(options: ColorPaletteOptions): ColorPaletteInstance {
  return new ColorPaletteManager().create(options);
}
