/**
 * Avatar Generator: Create avatars from initials, random patterns, gradients,
 * and shapes with configurable styles, colors, export options (SVG/canvas/
 * data URI), accessibility support, and batch generation.
 */

// --- Types ---

export type AvatarShape = "circle" | "square" | "rounded" | "hexagon" | "octagon";
export type AvatarStyle = "initials" | "gradient" | "pattern" | "geometric" | "pixel" | "wave";

export interface AvatarOptions {
  /** Display size in pixels (default: 80) */
  size?: number;
  /** Shape of the avatar */
  shape?: AvatarShape;
  /** Visual style */
  style?: AvatarStyle;
  /** Text/initials to display */
  text?: string;
  /** Primary color (or first gradient color) */
  color?: string;
  /** Secondary color (for gradients) */
  color2?: string;
  /** Text color */
  textColor?: string;
  /** Font size ratio (0-1, relative to container) */
  fontSize?: number;
  /** Font weight */
  fontWeight?: number | string;
  /** Border width (px) */
  borderWidth?: number;
  /** Border color */
  borderColor?: string;
  /** Corner radius for rounded squares (0-1 as ratio) */
  borderRadius?: number;
  /** Background opacity */
  backgroundOpacity?: number;
  /** Seed for deterministic random generation */
  seed?: string;
}

export interface GradientStop {
  offset: number; // 0-1
  color: string;
}

export interface PatternConfig {
  type: "dots" | "grid" | "diagonal" | "crosshatch" | "waves" | "triangles" | "circles";
  color: string;
  opacity?: number;
  size?: number;    // Pattern element size
  spacing?: number; // Gap between elements
  angle?: number;   // Rotation in degrees
}

export interface AvatarResult {
  svg: string;
  dataUri: string;   // data:image/svg+xml
  pngDataUri?: string; // data:image/png (if canvas rendered)
}

// --- Color Palettes ---

const COLOR_PALETTES: string[][] = [
  ["#6366f1", "#8b5cf6"], // Indigo → Violet
  ["#ec4899", "#f43f5e"], // Pink → Rose
  ["#14b8a6", "#06b6d4"], // Teal → Cyan
  ["#f59e0b", "#ef4444"], // Amber → Red
  ["#10b981", "#3b82f6"], // Emerald → Blue
  ["#8b5cf6", "#ec4899"], // Violet → Pink
  ["#06b6d4", "#6366f1"], // Cyan → Indigo
  ["#f43f5e", "#f59e0b"], // Rose → Amber
  ["#22c55e", "#14b8a6"], // Green → Teal
  ["#3b82f6", "#8b5cf6"], // Blue → Violet
  ["#ef4444", "#f97316"], // Red → Orange
  ["#a855f7", "#ec4899"], // Purple → Pink
  ["#0ea5e9", "#14b8a6"], // Sky → Teal
  ["#eab308", "#f97316"], // Yellow → Orange
  ["#84cc16", "#22c55e"], // Lime → Green
];

// --- Seeded Random ---

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

function pickPalette(seed: string): [string, string] {
  const rng = seededRandom(seed);
  const idx = Math.floor(rng() * COLOR_PALETTES.length);
  return COLOR_PALETTES[idx]! as [string, string];
}

// --- SVG Path Generators ---

function getShapePath(shape: AvatarShape, size: number): string {
  const cx = size / 2, cy = size / 2, r = size / 2;

  switch (shape) {
    case "circle":
      return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;

    case "square":
      return `<rect x="0" y="0" width="${size}" height="${size}"/>`;

    case "rounded": {
      const radius = size * 0.15;
      return `<rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}"/>`;
    }

    case "hexagon": {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      return `<polygon points="${points.join(" ")}"/>`;
    }

    case "octagon": {
      const points = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 8;
        const pr = r * 0.92; // Slightly smaller for visual balance
        points.push(`${cx + pr * Math.cos(angle)},${cy + pr * Math.sin(angle)}`);
      }
      return `<polygon points="${points.join(" ")}"/>`;
    }

    default:
      return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  }
}

function getClipPath(shape: AvatarShape, size: number): string {
  switch (shape) {
    case "circle": return `<clipPath id="clip"><circle cx="${size/2}" cy="${size/2}" r="${size/2}"/></clipPath>`;
    case "hexagon": {
      const cx = size/2, cy = size/2, r = size/2;
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      return `<clipPath id="clip"><polygon points="${points.join(" ")}"/></clipPath>`;
    }
    case "octagon": {
      const cx = size/2, cy = size/2, r = size/2;
      const points = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 8;
        points.push(`${cx + r * 0.92 * Math.cos(angle)},${cy + r * 0.92 * Math.sin(angle)}`);
      }
      return `<clipPath id="clip"><polygon points="${points.join(" ")}"/></clipPath>`;
    }
    default: return "";
  }
}

// --- Pattern Generators ---

function generatePatternSvg(pattern: PatternConfig, size: number): string {
  const { type, color, opacity = 0.15, size: pSize = 8, spacing = 12, angle = 0 } = pattern;
  const defs: string[] = [];
  let patternId = `pat-${type}`;

  switch (type) {
    case "dots":
      defs.push(`<pattern id="${patternId}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">`);
      defs.push(`  <circle cx="${spacing/2}" cy="${spacing/2}" r="${pSize/2}" fill="${color}" opacity="${opacity}"/>`);
      defs.push(`</pattern>`);
      break;

    case "grid":
      defs.push(`<pattern id="${patternId}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">`);
      defs.push(`  <rect width="${pSize}" height="${pSize}" fill="${color}" opacity="${opacity}"/>`);
      defs.push(`</pattern>`);
      break;

    case "diagonal":
      defs.push(`<pattern id="${patternId}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">`);
      defs.push(`  <line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${color}" stroke-width="${pSize/3}" opacity="${opacity}"/>`);
      defs.push(`</pattern>`);
      break;

    case "crosshatch":
      defs.push(`<pattern id="${patternId}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">`);
      defs.push(`  <line x1="0" y1="0" x2="${spacing}" y2="${spacing}" stroke="${color}" stroke-width="${pSize/4}" opacity="${opacity}"/>`);
      defs.push(`  <line x1="${spacing}" y1="0" x2="0" y2="${spacing}" stroke="${color}" stroke-width="${pSize/4}" opacity="${opacity}"/>`);
      defs.push(`</pattern>`);
      break;

    case "waves":
      defs.push(`<pattern id="${patternId}" width="${spacing*2}" height="${spacing}" patternUnits="userSpaceOnUse">`);
      defs.push(`  <path d="M0 ${spacing/2} Q ${spacing/2} 0, ${spacing} ${spacing/2} T ${spacing*2} ${spacing/2}" stroke="${color}" stroke-width="${pSize/3}" fill="none" opacity="${opacity}"/>`);
      defs.push(`</pattern>`);
      break;

    case "triangles":
      defs.push(`<pattern id="${patternId}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">`);
      defs.push(`  <polygon points="${spacing/2},0 ${spacing},${spacing} 0,${spacing}" fill="${color}" opacity="${opacity}"/>`);
      defs.push(`</pattern>`);
      break;

    case "circles":
      defs.push(`<pattern id="${patternId}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">`);
      defs.push(`  <circle cx="${spacing/2}" cy="${spacing/2}" r="${pSize}" fill="none" stroke="${color}" stroke-width="${pSize/4}" opacity="${opacity}"/>`);
      defs.push(`</pattern>`);
      break;
  }

  return `<defs>${defs.join("\n")}</defs><rect width="100%" height="100%" fill="url(#${patternId})"/>`;
}

// --- Geometric Pattern Generator ---

function generateGeometricSvg(seed: string, colors: [string, string], size: number): string {
  const rng = seededRandom(seed);
  const shapes: string[] = [];

  // Generate 3-6 random geometric shapes
  const count = 3 + Math.floor(rng() * 4);

  for (let i = 0; i < count; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const s = size * (0.15 + rng() * 0.35);
    const color = colors[rng() > 0.5 ? 0 : 1];
    const opacity = 0.3 + rng() * 0.5;
    const shapeType = Math.floor(rng() * 4);

    switch (shapeType) {
      case 0:
        shapes.push(`<circle cx="${x}" cy="${y}" r="${s/2}" fill="${color}" opacity="${opacity}"/>`);
        break;
      case 1:
        shapes.push(`<rect x="${x-s/2}" y="${y-s/2}" width="${s}" height="${s}" rx="${s*0.1}" fill="${color}" opacity="${opacity}"/>`);
        break;
      case 2:
        shapes.push(`<polygon points="${x},${y-s/2} ${x+s/2},${y+s/2} ${x-s/2},${y+s/2}" fill="${color}" opacity="${opacity}"/>`);
        break;
      case 3:
        shapes.push(`<circle cx="${x}" cy="${y}" r="${s/2}" fill="none" stroke="${color}" stroke-width="${s*0.08}" opacity="${opacity}"/>`);
        break;
    }
  }

  return shapes.join("\n");
}

// --- Wave Pattern Generator ---

function generateWaveSvg(colors: [string, string], size: number): string {
  const waves: string[] = [];
  const waveCount = 3;

  for (let w = 0; w < waveCount; w++) {
    const yOffset = size * (0.3 + w * 0.25);
    const amplitude = size * (0.08 + w * 0.03);
    const frequency = 1.5 + w * 0.5;
    const color = colors[w % 2];

    let pathD = `M 0 ${yOffset}`;
    for (let x = 0; x <= size; x += size / 20) {
      const y = yOffset + Math.sin((x / size) * Math.PI * 2 * frequency) * amplitude;
      pathD += ` L ${x} ${y}`;
    }
    pathD += ` L ${size} ${size} L 0 ${size} Z`;

    waves.push(`<path d="${pathD}" fill="${color}" opacity="${0.6 - w * 0.15}"/>`);
  }

  return waves.join("\n");
}

// --- Pixel Art Generator ---

function generatePixelArtSvg(seed: string, colors: [string, string], size: number): string {
  const rng = seededRandom(seed);
  const gridSize = 8; // 8x8 pixel grid
  const cellSize = size / gridSize;
  const pixels: string[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (rng() > 0.5) {
        const color = colors[Math.floor(rng() * 2)];
        const opacity = 0.5 + rng() * 0.5;
        pixels.push(`<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" width="${cellSize}" height="${cellSize}" fill="${color}" opacity="${opacity}"/>`);
      }
    }
  }

  return pixels.join("\n");
}

// --- Main Generator Class ---

/**
 * Generate avatar images as SVG or data URIs.
 *
 * ```ts
 * const gen = new AvatarGenerator();
 *
 * // Initials avatar
 * const avatar1 = gen.generate({ text: "John Doe", style: "initials" });
 *
 * // Gradient avatar
 * const avatar2 = gen.generate({ text: "JD", style: "gradient", shape: "rounded" });
 *
 * // Random pattern avatar
 * const avatar3 = gen.generate({ seed: "user-123", style: "geometric" });
 *
 * document.getElementById("avatar").innerHTML = avatar1.svg;
 * ```
 */
export class AvatarGenerator {
  private defaultOptions: Required<AvatarOptions>;

  constructor(defaults?: Partial<AvatarOptions>) {
    this.defaultOptions = {
      size: defaults?.size ?? 80,
      shape: defaults?.shape ?? "circle",
      style: defaults?.style ?? "gradient",
      text: defaults?.text ?? "",
      color: defaults?.color ?? "",
      color2: defaults?.color2 ?? "",
      textColor: defaults?.textColor ?? "#ffffff",
      fontSize: defaults?.fontSize ?? 0.42,
      fontWeight: defaults?.fontWeight ?? 600,
      borderWidth: defaults?.borderWidth ?? 0,
      borderColor: defaults?.borderColor ?? "#ffffff",
      borderRadius: defaults?.borderRadius ?? 0.2,
      backgroundOpacity: defaults?.backgroundOpacity ?? 1,
      seed: defaults?.seed ?? "",
    };
  }

  /**
   * Generate an avatar.
   */
  generate(options: Partial<AvatarOptions> = {}): AvatarResult {
    const opts = { ...this.defaultOptions, ...options };
    const { size, shape, style, text, textColor, fontSize, fontWeight } = opts;

    // Determine colors
    let color1 = opts.color;
    let color2 = opts.color2;
    if (!color1 || !color2) {
      const palette = pickPalette(opts.seed || text || String(Date.now()));
      if (!color1) color1 = palette[0];
      if (!color2) color2 = palette[1];
    }

    // Extract initials
    const initials = this.extractInitials(text || opts.seed || "?");

    // Build SVG
    const svg = this.buildSvg(opts, color1!, color2!, initials);

    // Data URI
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    const dataUri = `data:image/svg+xml;base64,${base64}`;

    return { svg, dataUri };
  }

  /**
   * Generate and render to a canvas element (for PNG export).
   */
  async renderToCanvas(options: Partial<AvatarOptions> = {}): Promise<HTMLCanvasElement> {
    const result = this.generate(options);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const size = options.size ?? this.defaultOptions.size;
    canvas.width = size * 2; // HiDPI
    canvas.height = size * 2;
    ctx.scale(2, 2);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = result.dataUri;
    });
    ctx.drawImage(img, 0, 0, size, size);

    return canvas;
  }

  /**
   * Generate PNG data URI.
   */
  async toPng(options: Partial<AvatarOptions> = {}): Promise<string> {
    const canvas = await this.renderToCanvas(options);
    return canvas.toDataURL("image/png");
  }

  /**
   * Batch generate multiple avatars.
   */
  batchGenerate(items: Array<{ seed?: string; text?: string; options?: Partial<AvatarOptions> }>): AvatarResult[] {
    return items.map((item) =>
      this.generate({ ...item.options, seed: item.seed, text: item.text })
    );
  }

  /**
   * Get all available color palettes.
   */
  static getPalettes(): string[][] {
    return [...COLOR_PALETTES];
  }

  /**
   * Get a random palette.
   */
  static randomPalette(): [string, string] {
    return COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)]! as [string, string];
  }

  // --- Internal ---

  private extractInitials(text: string): string {
    if (!text) return "?";
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      return words[0]!.slice(0, 2).toUpperCase();
    }
    return (words[0]![0] + words[words.length - 1]![0]).toUpperCase();
  }

  private buildSvg(opts: Required<AvatarOptions>, color1: string, color2: string, initials: string): string {
    const { size, shape, style, textColor, fontSize, fontWeight, borderWidth, borderColor, borderRadius, backgroundOpacity } = opts;

    let content = "";

    // Clip path for non-circle shapes
    const clipPath = getClipPath(shape, size);

    // Background based on style
    switch (style) {
      case "initials":
        content = this.buildGradientContent(color1, color2, size, "linear", 135);
        break;

      case "gradient":
        content = this.buildGradientContent(color1, color2, size, "linear", 135);
        break;

      case "pattern": {
        const config: PatternConfig = {
          type: "dots",
          color: color2,
          opacity: 0.2,
          size: size * 0.04,
          spacing: size * 0.08,
        };
        content = `${this.buildGradientContent(color1, color1, size, "solid")}${generatePatternSvg(config, size)}`;
        break;
      }

      case "geometric":
        content = `${this.buildGradientContent(color1, color2, size, "linear", 135)}${generateGeometricSvg(opts.seed || initials, [color1, color2], size)}`;
        break;

      case "pixel":
        content = `${this.buildGradientContent(color1, color2, size, "linear", 135)}${generatePixelArtSvg(opts.seed || initials, [color1, color2], size)}`;
        break;

      case "wave":
        content = `${this.buildGradientContent(color1, color2, size, "linear", 180)}${generateWaveSvg([color1, color2], size)}`;
        break;
    }

    // Text overlay
    const textSize = Math.round(size * fontSize);
    const textY = size / 2 + textSize * 0.35; // Approximate vertical center

    // Determine font family based on length
    const fontFamily = initials.length <= 2 ? "'Inter', 'Segoe UI', sans-serif" : "'Inter', 'Segoe UI', sans-serif";

    const textEl = `<text x="${size/2}" y="${textY}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${textSize}" font-weight="${fontWeight}" font-family="${fontFamily}" letter-spacing="${initials.length === 1 ? '0' : '-0.02em'}">${this.escapeXml(initials)}</text>`;

    // Border
    const borderEl = borderWidth > 0
      ? `<rect x="${borderWidth/2}" y="${borderWidth/2}" width="${size-borderWidth}" height="${size-borderWidth}" ${shape === "rounded" ? `rx="${size * borderRadius}"` : ""} fill="none" stroke="${borderColor}" stroke-width="${borderWidth}"/>`
      : "";

    // Assemble SVG
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size ${size}" role="img" aria-label="Avatar of ${this.escapeXml(initials)}">`,
      clipPath ? `<defs>${clipPath}</defs>` : "<defs>",
      `<g${clipPath ? ' clip-path="url(#clip)"' : ""}>`,
      `<g opacity="${backgroundOpacity}">`,
      content,
      `</g>`,
      textEl,
      `</g>`,
      borderEl,
      `</svg>`,
    ].join("\n");

    return svg;
  }

  private buildGradientContent(c1: string, c2: string, size: number, type: "solid" | "linear" | "radial", angle = 135): string {
    if (type === "solid") {
      return `<rect width="${size}" height="${size}" fill="${c1}"/>`;
    }

    const rad = (angle * Math.PI) / 180;
    const x2 = size + Math.cos(rad) * size;
    const y2 = size + Math.sin(rad) * size;

    if (type === "radial") {
      return `<defs><radialGradient id="bg" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient></defs><rect width="${size}" height="${size}" fill="url(#bg)"/>`;
    }

    return `<defs><linearGradient id="bg" x1="0%" y1="0%" x2="${x2}" y2="${y2}"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#bg)"/>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

// --- Convenience Functions ---

/** Quick-generate an avatar SVG string */
export function generateAvatar(text: string, options?: Partial<AvatarOptions>): string {
  const gen = new AvatarGenerator();
  return gen.generate({ ...options, text }).svg;
}

/** Quick-generate an avatar data URI */
export function avatarDataUri(text: string, options?: Partial<AvatarOptions>): string {
  const gen = new AvatarGenerator();
  return gen.generate({ ...options, text }).dataUri;
}

/** Generate avatar from a user name (auto-extracts initials) */
export function userAvatar(name: string, size = 80): string {
  return generateAvatar(name, { size, style: "initials", shape: "circle" });
}
