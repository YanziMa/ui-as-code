/**
 * Barcode Generation: Code 128, Code 39, EAN-13, UPC-A, ITF, and Codabar
 * barcode rendering as SVG, with customizable dimensions, colors, and text labels.
 */

// --- Types ---

export type BarcodeType = "code128" | "code39" | "ean13" | "upcA" | "itf" | "codabar";

export interface BarcodeOptions {
  /** Data to encode */
  value: string;
  /** Barcode type */
  type?: BarcodeType;
  /** Width in px (default: 200) */
  width?: number;
  /** Height in px (default: 80) */
  height?: number;
  /** Bar color (default: #000000) */
  barColor?: string;
  /** Background color (default: #ffffff) */
  background?: string;
  /** Show human-readable text below? */
  showText?: boolean;
  /** Text font size (px) */
  fontSize?: number;
  /** Text color */
  textColor?: string;
  /** Quiet zone width (in module units, default: 10) */
  quietZone?: number;
  /** Module width (thin bar width in px, default: 1) */
  moduleWidth?: number;
  /** Bar height ratio for tall bars (Code 39/ITF only) */
  barHeightRatio?: number;
  /** Custom CSS class */
  className?: string;
}

export interface BarcodeInstance {
  element: SVGElement;
  /** Update the barcode data */
  update: (value: string) => void;
  /** Get current data URL (SVG as data URI) */
  toDataURL: () => string;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Code 128 Encoding ---

function encodeCode128(data: string): boolean[] {
  const START_B = [1, 1, 0, 0, 0, 0]; // 11010000
  const STOP = [1, 1, 0, 0, 0, 0]; // 11010000

  // CODE128 character set patterns
  const PATTERNS: Record<string, number[]> = {
    " ": [2, 1, 0, 0, 0, 0],
    "!": [1, 1, 0, 1, 0, 0],
    '"': [1, 1, 0, 0, 1, 0],
    "#": [1, 1, 0, 1, 1, 0],
    "$": [1, 0, 1, 0, 0, 0],
    "%": [1, 0, 1, 0, 1, 0],
    "&": [1, 0, 1, 1, 0, 0],
    "'": [1, 0, 1, 1, 1, 0],
    "(": [1, 0, 0, 1, 0, 0],
    ")": [1, 0, 0, 1, 1, 0],
    "*": [1, 0, 0, 0, 1, 0],
    "+": [1, 0, 0, 0, 1, 1],
    ",": [1, 0, 0, 1, 0, 1],
    "-": [1, 0, 1, 0, 0, 1],
    ".": [1, 0, 1, 0, 1, 1],
    "/": [1, 0, 1, 1, 0, 0],
    "0": [1, 0, 1, 0, 0, 1],
    "1": [1, 1, 0, 0, 0, 1],
    "2": [1, 1, 0, 1, 0, 0],
    "3": [1, 1, 0, 1, 1, 0],
    "4": [1, 1, 0, 0, 1, 0],
    "5": [1, 1, 0, 0, 1, 1],
    "6": [1, 1, 0, 1, 0, 1],
    "7": [1, 1, 0, 1, 1, 0],
    "8": [1, 1, 0, 0, 0, 1],
    "9": [1, 1, 0, 1, 1, 1],
    ":": [1, 1, 1, 0, 0, 0],
    ";": [1, 1, 1, 0, 1, 0],
    "<": [1, 1, 1, 0, 0, 1],
    "=": [1, 1, 1, 0, 1, 1],
    ">": [1, 1, 1, 1, 0, 0],
    "?": [1, 1, 1, 1, 0, 1],
    "@": [1, 1, 1, 1, 1, 0],
    "A": [1, 1, 1, 0, 0, 1],
    "B": [1, 1, 1, 0, 1, 0],
    "C": [1, 1, 1, 0, 1, 1],
    "D": [1, 1, 1, 1, 0, 0],
    "E": [1, 1, 1, 1, 0, 1],
    "F": [1, 1, 1, 1, 1, 0],
    "G": [1, 0, 0, 1, 0, 0],
    "H": [1, 0, 0, 1, 0, 1],
    "I": [1, 0, 0, 1, 1, 0],
    "J": [1, 0, 0, 1, 1, 1],
    "K": [1, 0, 1, 0, 0, 0],
    "L": [1, 0, 1, 0, 0, 1],
    "M": [1, 0, 1, 0, 1, 0],
    "N": [1, 0, 1, 0, 1, 1],
    "O": [1, 0, 1, 1, 0, 0],
    "P": [1, 0, 1, 1, 0, 1],
    "Q": [1, 0, 1, 1, 1, 0],
    "R": [1, 0, 1, 1, 1, 1],
    "S": [1, 0, 0, 1, 0, 0],
    "T": [1, 0, 0, 1, 0, 1],
    "U": [1, 0, 0, 1, 1, 0],
    "V": [1, 0, 0, 1, 1, 1],
    "W": [1, 0, 0, 0, 1, 0],
    "X": [1, 0, 0, 0, 1, 1],
    "Y": [1, 0, 0, 0, 0, 1],
    "Z": [1, 0, 0, 0, 0, 0],
  };

  const bits: boolean[] = [];

  // Start code B
  bits.push(...START_B);

  // Encode each character
  for (const ch of data) {
    const pattern = PATTERNS[ch];
    if (!pattern) throw new Error(`Code128: cannot encode character "${ch}"`);
    bits.push(...pattern);
  }

  // Stop
  bits.push(...STOP);

  return bits;
}

// --- Code 39 Encoding ---

function encodeCode39(data: string): boolean[] {
  const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
  const PATTERNS: Record<string, boolean[]> = {};

  for (let i = 0; i < CHARS.length; i++) {
    const ch = CHARS[i]!;
    const val = i < 10 ? i : i - 10 + 35; // A=38, B=39, etc.
    const binary = val.toString(2).padStart(6, "0").split("").map((b) => b === "1");
    PATTERNS[ch] = [
      true, ...binary.slice(1), // Start pattern (wide bar)
      false,
    ];
  }

  const bits: boolean[] = [];
  // Start/stop pattern: * (narrow-wide-narrow-wide)
  const START_STOP = [true, false, true, false, true, false, false, true, false];

  bits.push(...START_STOP);

  for (const ch of data.toUpperCase()) {
    const pattern = PATTERNS[ch];
    if (!pattern) throw new Error(`Code39: cannot encode character "${ch}"`);
    bits.push(...pattern);
  }

  bits.push(...START_STOP);

  return bits;
}

// --- EAN-13 Encoding ---

function encodeEan13(data: string): { bits: boolean[]; checkDigit: number } {
  const digits = data.replace(/\D/g, "").padStart(12, "0").slice(0, 12);

  // Weighting patterns for odd/even positions (from right, starting at 1)
  let oddSum = 0, evenSum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i]!, 10);
    if ((12 - i) % 2 === 1) oddSum += digit;
    else evenSum += digit;
  }
  const checkDigit = (10 - (oddSum * 3 + evenSum) % 10) % 10;

  // Encode with check digit
  const fullData = digits + String(checkDigit);
  const bits: boolean[] = [];

  // Left guard bars (101)
  bits.push(true, false, true, false, true, false);

  // Variable weight encoding for first 7 digits (odd positions from left)
  const L_PATTERNS: Record<string, boolean[]> = {
    "0": [false, false, false, true, true, false, true], "1": [true, false, false, false, true, true, false],
    "2": [false, true, false, false, true, false, true], "3": [true, true, false, false, false, true, false],
    "4": [false, false, true, false, true, true, false], "5": [true, false, true, false, false, true, false],
    "6": [false, true, true, false, false, false, true], "7": [true, true, true, false, false, false, false],
    "8": [false, false, false, true, true, false, false], "9": [true, false, false, true, false, false, false],
  };
  for (let i = 0; i < 7; i++) {
    bits.push(...L_PATTERNS[fullData[i]]!);
  }

  // Center guard bars (01010)
  bits.push(false, true, false, true, false);

  // Right side (even positions from left) - simple mirror
  const R_PATTERNS: Record<string, boolean[]> = {
    "0": [false, false, true, true, false, false, true], "1": [false, true, false, true, false, false, true],
    "2": [true, false, true, true, false, false, true], "3": [true, true, false, true, false, false, true],
    "4": [false, true, false, false, true, false, true], "5": [true, false, false, false, true, false, true],
    "6": [true, true, false, false, false, false, true], "7": [true, true, true, false, false, false, true],
    "8": [false, false, true, true, false, false, false], "9": [true, false, true, true, false, false, false],
  };
  for (let i = 7; i < 13; i++) {
    bits.push(...R_PATTERNS[fullData[i]]!);
  }

  // Right guard bars (101)
  bits.push(true, false, true, false, true, false);

  return { bits, checkDigit };
}

// --- Render to SVG ---

function renderBarcode(bits: boolean[], options: Required<BarcodeOptions>): SVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", `barcode ${options.className ?? ""}`);
  svg.setAttribute("width", String(options.width));
  svg.setAttribute("height", String(options.height));
  svg.setAttribute("viewBox", `0 0 ${options.width} ${options.height}`);

  // Background
  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", options.background);
  svg.appendChild(bg);

  // Calculate bar geometry
  const quietZoneModules = options.quietZone / options.moduleWidth;
  const totalWidthBits = bits.length + quietZoneModules * 2;
  const drawAreaWidth = options.width - options.quietZone * 2;
  const moduleW = drawAreaWidth / totalWidthBits;

  let x = options.quietZone;

  for (const bit of bits) {
    if (bit) {
      const bar = document.createElementNS(ns, "rect");
      bar.setAttribute("x", String(x));
      bar.setAttribute("y", "0");
      bar.setAttribute("width", String(Math.max(moduleW, 0.5)));
      bar.setAttribute("height", String(options.height));
      bar.setAttribute("fill", options.barColor);
      svg.appendChild(bar);
    }
    x += moduleW;
  }

  // Text label
  if (options.showText) {
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String(options.width / 2));
    text.setAttribute("y", String(options.height + options.fontSize + 4));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-size", String(options.fontSize));
    text.setAttribute("fill", options.textColor);
    text.setAttribute("font-family", "monospace");
    text.textContent = options.value;
    svg.appendChild(text);
  }

  return svg;
}

// --- Main Factory ---

export function createBarcode(options: BarcodeOptions): BarcodeInstance {
  const opts = {
    type: options.type ?? "code128",
    width: options.width ?? 200,
    height: options.height ?? 80,
    barColor: options.barColor ?? "#000000",
    background: options.background ?? "#ffffff",
    showText: options.showText ?? true,
    fontSize: options.fontSize ?? 14,
    textColor: options.textColor ?? "#000000",
    quietZone: options.quietZone ?? 10,
    moduleWidth: options.moduleWidth ?? 1,
    className: options.className ?? "",
    ...options,
  };

  let bits: boolean[];

  switch (opts.type) {
    case "code128":
      bits = encodeCode128(opts.value);
      break;
    case "code39":
      bits = encodeCode39(opts.value);
      break;
    case "ean13":
      const result = encodeEan13(opts.value);
      bits = result.bits;
      break;
    case "upcA":
      // Simplified UPC-A (same as EAN-12 without leading zero)
      const upcResult = encodeEan13("0" + opts.value.padStart(11, "0").slice(0, 11));
      bits = upcResult.bits;
      break;
    case "itf":
      // Interleaved 2 of 5 (simplified)
      bits = encodeItf(opts.value);
      break;
    case "codabar":
      bits = encodeCodabar(opts.value);
      break;
    default:
      throw new Error(`Unknown barcode type: ${opts.type}`);
  }

  const svg = renderBarcode(bits, opts);

  const instance: BarcodeInstance = {
    element: svg,

    update(value: string) {
      let newBits: boolean[];
      switch (opts.type) {
        case "code128": newBits = encodeCode128(value); break;
        case "code39": newBits = encodeCode39(value); break;
        case "ean13": newBits = encodeEan13(value).bits; break;
        case "upcA": newBits = encodeEan13("0" + value.padStart(11, "0").slice(0, 11)).bits; break;
        default: newBits = encodeCode128(value);
      }
      const newSvg = renderBarcode(newBits, opts);
      svg.replaceWith(newSvg);
    },

    toDataURL() {
      return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg.outerHTML)));
    },

    destroy() {
      svg.remove();
    },
  };

  return instance;
}

// --- ITF (Interleaved 2 of 5) simplified encoder ---

function encodeItf(data: string): boolean[] {
  const CHARS = "0123456789";
  const ENCODINGS: Record<string, string> = {
    "0": "00110", "1": "10001", "2": "01001", "3": "11000", "4": "10100",
    "5": "01100", "6": "00011", "7": "10110", "8": "11101", "9": "01110",
  };

  const bits: boolean[] = [];
  // Start (start = 0000)
  bits.push(false, false, false, false);

  for (const ch of data) {
    if (!ENCODINGS[ch]) throw new Error(`ITF: invalid character "${ch}"`);
    for (const b of ENCODINGS[ch]) {
      bits.push(b === "1");
    }
  }

  // Stop (stop = 100)
  bits.push(true, false, false, false);

  return bits;
}

// --- Codabar encoder ---

function encodeCodabar(data: string): boolean[] {
  const CHARS = "0123456789-$:/.+ABCDTN*E";
  const ENCODINGS: Record<string, string> = {
    "0": "100001001", "1": "001001001", "2": "101001000", "3": "000001001",
    "4": "100001000", "5": "101000001", "6": "000010001", "7": "001010001",
    "8": "000001000", "9": "100100001", "-": "101000100", "$": "010100100",
    ":": "110100100", ".": "000110100", "/": "010001001", "+": "010001100",
    "A": "110010010", "B": "010010010", "C": "110001010", "D": "000001010",
    "T": "000011000", "N": "000110100", "*": "000010100", "E": "000011010",
  };

  const bits: boolean[] = [];
  // Start (1010)
  bits.push(true, false, true, false);

  for (const ch of data.toUpperCase()) {
    if (!ENCODINGS[ch]) throw new Error(`Codabar: invalid character "${ch}"`);
    for (const b of ENCODINGS[ch]) {
      bits.push(b === "1");
    }
  }

  // Stop (1010)
  bits.push(true, false, true, false);

  return bits;
}
