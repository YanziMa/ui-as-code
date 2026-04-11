/**
 * Imgix URL Builder: Construct and manipulate Imgix image URLs with
 * resize, crop, format conversion, filters, overlays, face detection,
 * auto optimization, and responsive srcset generation.
 */

// --- Types ---

export interface ImgixOptions {
  /** Base Imgix domain or full URL */
  domain: string;
  /** Image path (appended to domain) or full URL if using proxy mode */
  path?: string;
  /** Width in pixels */
  w?: number;
  /** Height in pixels */
  h?: number;
  /** Output format: "auto", "jpg", "png", "webp", "avif", "gif" */
  fm?: string;
  /** Quality (1-100) */
  q?: number;
  /** Fit mode: "clamp", "clip", "crop", "fill", "fillmax", "max", "min", "scale" */
  fit?: string;
  /** Crop mode: "entropy", "edges", "faces", "focalpoint", "left", "right", "top", "bottom" or coordinates */
  crop?: string;
  /** Auto enhancement: "compress", "enhance", "format", "redeye" or comma-separated */
  auto?: string;
  /** Rotate angle (degrees) */
  rot?: number;
  /** Flip: "h", "v", or "hv" */
  flip?: string;
  /** Padding in pixels */
  pad?: number;
  /** Border width in pixels */
  border?: number;
  /** Border color (hex) */
  borderColor?: string;
  /** Sharpen amount (0-100) */
  sharpen?: number;
  /** Blur amount (0-?) */
  blur?: number;
  /** Brightness (-100 to 100) */
  brightness?: number;
  /** Contrast (-100 to 100) */
  contrast?: number;
  /** Saturation (-100 to 100) */
  sat?: number;
  /** Hue rotation (0-360) */
  hue?: number;
  /** Pixel density for retina (1-3) */
  dpr?: number;
  /** Background color (hex or "blur") */
  bg?: string;
  /** Text overlay */
  txt?: string;
  /** Text font size */
  txtfont?: string;
  /** Text font family */
  txtfontfamily?: string;
  /** Text color (hex) */
  txtclr?: string;
  /** Text position (x,y) */
  txtpos?: string;
  /** Blend mode */
  blend?: string;
  /** Blend width */
  bw?: number;
  /** Blend height */
  bh?: number;
  /** Blend mode for overlay */
  bm?: string;
  /** Custom parameters */
  params?: Record<string, string | number | boolean>;
  /** Whether to use HTTPS (default: true) */
  https?: boolean;
  /** Sign URL with a token for security */
  signKey?: string;
}

export interface SrcsetOptions {
  /** Width breakpoints (default: [100, 200, 400, 600, 800, 1000, 1200, 1600]) */
  widths?: number[];
  /** Variable width range { min, max, step } */
  variableWidths?: { min: number; max: number; step: number };
  /** Fixed width for height-based srcset */
  fixedWidth?: number;
  /** Minimum source width to include */
  minWidth?: number;
  /** Maximum source width to include */
  maxWidth?: number;
  /** Qualifier for sizes attribute */
  sizes?: string;
}

// --- Main Class ---

export class ImgixUrlBuilder {
  private _domain: string;
  private _path: string;
  private _params: Record<string, string> = {};
  private _https = true;

  constructor(domainOrUrl: string, path?: string) {
    // If it looks like a full URL, extract domain
    if (domainOrUrl.startsWith("http://") || domainOrUrl.startsWith("https://")) {
      const url = new URL(domainOrUrl);
      this._domain = url.hostname;
      this._path = url.pathname.slice(1); // Remove leading /
      this._https = url.protocol === "https:";
    } else {
      this._domain = domainOrUrl.replace(/\/+$/, "");
      this._path = path ?? "";
    }
  }

  /** Set dimensions */
  size(width: number, height?: number): this {
    if (width > 0) this._params.w = String(width);
    if (height !== undefined && height > 0) this._params.h = String(height);
    return this;
  }

  /** Set output format */
  format(fmt: string): this {
    this._params.fm = fmt;
    return this;
  }

  /** Set quality */
  quality(q: number): this {
    this._params.q = String(Math.max(1, Math.min(100, q)));
    return this;
  }

  /** Set fit mode */
  fit(mode: string): this {
    this._params.fit = mode;
    return this;
  }

  /** Set crop mode */
  crop(mode: string): this {
    this._params.crop = mode;
    return this;
  }

  /** Set auto enhancements */
  auto(...features: string[]): this {
    this._params.auto = features.join(",");
    return this;
  }

  /** Set DPR */
  dpr(value: number): this {
    this._params.dpr = String(Math.max(1, Math.min(3, value)));
    return this;
  }

  /** Set background */
  background(colorOrMode: string): this {
    this._params.bg = colorOrMode;
    return this;
  }

  /** Rotate */
  rotate(degrees: number): this {
    this._params.rot = String(degrees % 360);
    return this;
  }

  /** Flip */
  flipHorizontal(): this { this._params.flip = this._params.flip?.includes("v") ? "hv" : "h"; return this; }
  flipVertical(): this { this._params.flip = this._params.flip?.includes("h") ? "hv" : "v"; return this; }

  /** Padding */
  padding(px: number): this {
    this._params.pad = String(px);
    return this;
  }

  /** Border */
  border(width: number, color = "000000"): this {
    this._params.border = String(width);
    this._params["border-color"] = color;
    return this;
  }

  /** Adjustments */
  adjust(options: Partial<{ sharpen: number; blur: number; brightness: number; contrast: number; saturation: number; hue: number }>): this {
    if (options.sharpen !== undefined) this._params.sharpen = String(options.sharpen);
    if (options.blur !== undefined) this._params.blur = String(options.blur);
    if (options.brightness !== undefined) this._params.bri = String(options.brightness);
    if (options.contrast !== undefined) this._params.con = String(options.contrast);
    if (options.saturation !== undefined) this._params.sat = String(options.saturation);
    if (options.hue !== undefined) this._params.hue = String(options.hue);
    return this;
  }

  /** Text overlay */
  text(text: string, options?: { fontSize?: string; fontFamily?: string; color?: string; position?: string }): this {
    this._params.txt = encodeURIComponent(text);
    if (options?.fontSize) this._params.txtfont = options.fontSize;
    if (options?.fontFamily) this._params.txtfontfamily = options.fontFamily;
    if (options?.color) this._params.txtclr = options.color;
    if (options?.position) this._params.txtpos = options.position;
    return this;
  }

  /** Overlay/blend image */
  overlay(src: string, options?: { width?: number; height?: number; mode?: string }): this {
    this._params.blend = encodeURIComponent(src);
    if (options?.width) this._params.bw = String(options.width);
    if (options?.height) this._params.bh = String(options.height);
    if (options?.mode) this._params.bm = options.mode;
    return this;
  }

  /** Apply custom parameter */
  param(key: string, value: string | number | boolean): this {
    this._params[key] = String(value);
    return this;
  }

  /** Apply multiple custom parameters */
  params(p: Record<string, string | number | boolean>): this {
    for (const [k, v] of Object.entries(p)) this._params[k] = String(v);
    return this;
  }

  /** Use HTTP instead of HTTPS */
  useHttp(): this { this._https = false; return this; }

  /** Build the final URL */
  build(): string {
    const protocol = this._https ? "https" : "http";
    const qs = Object.entries(this._params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    return `${protocol}://${this._domain}/${this._path}${qs ? `?${qs}` : ""}`;
  }

  /** Get current parameters (copy) */
  getParams(): Record<string, string> { return { ...this._params }; }
  getDomain(): string { return this._domain; }
  getPath(): string { return this._path; }

  /** Clone builder for variation */
  clone(): ImgixUrlBuilder {
    const b = new ImgixUrlBuilder(this._domain, this._path);
    b._params = { ...this._params };
    b._https = this._https;
    return b;
  }

  /** Reset all parameters */
  reset(): this {
    this._params = {};
    return this;
  }
}

// --- Convenience Functions ---

/** Create an Imgix URL from options object */
export function buildImgixUrl(options: ImgixOptions): string {
  const builder = new ImgixUrlBuilder(options.domain, options.path);

  if (options.w || options.h) builder.size(options.w ?? 0, options.h);
  if (options.fm) builder.format(options.fm);
  if (options.q) builder.quality(options.q);
  if (options.fit) builder.fit(options.fit);
  if (options.crop) builder.crop(options.crop);
  if (options.auto) builder.auto(...options.auto.split(","));
  if (options.dpr) builder.dpr(options.dpr);
  if (options.bg) builder.background(options.bg);
  if (options.rot) builder.rotate(options.rot);
  if (options.flip) {
    if (options.flip.includes("h")) builder.flipHorizontal();
    if (options.flip.includes("v")) builder.flipVertical();
  }
  if (options.pad) builder.padding(options.pad);
  if (options.border) builder.border(options.border, options.borderColor!);
  if (options.sharpen || options.blur || options.brightness || options.contrast || options.sat || options.hue) {
    builder.adjust({
      sharpen: options.sharpen,
      blur: options.blur,
      brightness: options.brightness,
      contrast: options.contrast,
      saturation: options.sat,
      hue: options.hue,
    });
  }
  if (options.txt) builder.text(options.txt, {
    fontSize: options.txtfont,
    fontFamily: options.txtfontfamily,
    color: options.txtclr,
    position: options.txtpos,
  });
  if (options.blend) builder.overlay(options.blend, {
    width: options.bw,
    height: options.bh,
    mode: options.bm,
  });
  if (options.params) builder.params(options.params);
  if (options.https === false) builder.useHttp();

  return builder.build();
}

/** Generate responsive srcset string for an Imgix image */
export function generateSrcset(
  baseUrl: string,
  opts: SrcsetOptions & Partial<ImgixOptions> = {},
): string {
  const widths = opts.variableWidths
    ? range(opts.variableWidths.min, opts.variableWidths.max, opts.variableWidths.step)
    : (opts.widths ?? [100, 200, 300, 400, 500, 640, 750, 800, 900, 1000, 1200, 1400, 1600, 1920]);

  const filtered = widths.filter((w) => {
    if (opts.minWidth && w < opts.minWidth) return false;
    if (opts.maxWidth && w > opts.maxWidth) return false;
    return true;
  });

  return filtered
    .map((w) => {
      let url: string;
      if (baseUrl.includes("://")) {
        const existing = new URL(baseUrl);
        existing.searchParams.set("w", String(w));
        url = existing.toString();
      } else {
        url = `${baseUrl}?w=${w}`;
      }
      return `${url} ${w}w`;
    })
    .join(", ");
}

/** Generate sizes attribute value */
export function generateSizes(breakpoints: Array<{ maxWidth?: number; size: string }>): string {
  return breakpoints
    .map((bp) => bp.maxWidth ? `(max-width: ${bp.maxWidth}px) ${bp.size}` : bp.size)
    .join(", ");
}

// --- Presets ---

/** Common preset configurations */
export const imgixPresets = {
  thumbnail: { w: 150, h: 150, fit: "crop", crop: "faces", fm: "webp", q: 70, auto: "format,compress" },
  small: { w: 400, fm: "webp", q: 75, auto: "format,compress" },
  medium: { w: 800, fm: "webp", q: 78, auto: "format,compress" },
  large: { w: 1200, fm: "webp", q: 80, auto: "format,compress" },
  hero: { w: 1920, fm: "webp", q: 82, auto: "format,enhance,compress" },
  avatar: { w: 120, h: 120, fit: "crop", crop: "faces", fm: "webp", q: 72 },
  ogImage: { w: 1200, h: 630, fit: "crop", crop: "entropy", fm: "jpg", q: 85 },
  banner: { w: 1920, h: 400, fit: "crop", crop: "entropy", fm: "webp", q: 80 },
} as const;

function range(min: number, max: number, step: number): number[] {
  const result: number[] = [];
  for (let i = min; i <= max; i += step) result.push(i);
  return result;
}
