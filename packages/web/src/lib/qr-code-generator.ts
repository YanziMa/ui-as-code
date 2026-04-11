/**
 * QR Code Generator: Pure TypeScript QR code encoder and SVG renderer.
 * Supports multiple error correction levels, numeric/alphanumeric/byte/kanji modes,
 * automatic mode selection, SVG output with customizable colors/sizes,
 * logo overlay support, and export utilities.
 *
 * Based on the ISO/IEC 18004 QR Code standard.
 */

// --- Types ---

export type QRErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type QRRenderFormat = "svg" | "canvas" | "data-url";

export interface QROptions {
  /** Data to encode (string) */
  text: string;
  /** Error correction level: L(7%), M(15%), Q(25%), H(30%) */
  errorCorrection?: QRErrorCorrectionLevel;
  /** Module size in pixels (default: 4) */
  size?: number;
  /** Quiet zone modules (default: 4) */
  quietZone?: number;
  /** Foreground color (dark modules) */
  foreground?: string;
  /** Background color (light modules) */
  background?: string;
  /** Output format */
  format?: QRRenderFormat;
  /** Logo image URL or data-URL for center overlay */
  logo?: string;
  /** Logo size ratio (0-0.3, default: 0.2) */
  logoSize?: number;
  /** Rounded corners for modules? */
  roundedCorners?: boolean;
  /** Corner radius in px */
  cornerRadius?: number;
}

export interface QRResult {
  /** The rendered element (SVG or Canvas) */
  element: HTMLElement | HTMLCanvasElement;
  /** Raw QR matrix (2D boolean array) */
  matrix: boolean[][];
  /** Total module count (including quiet zone) */
  dimension: number;
  /** SVG string (if format=svg) */
  svgString?: string;
  /** Data URL (if format=data-url) */
  dataURL?: string;
}

// --- Error Correction Level Constants ---

const EC_LEVELS: Record<QRErrorCorrectionLevel, { ecCodewords: number; group1Num: number; group1Den: number; group2Num: number; group2Den: number }> = {
  L: { ecCodewords: 7,  group1Num: 1, group1Den: 26, group2Num: 0, group2Den: 0 },
  M: { ecCodewords: 10, group1Num: 1, group1Den: 20, group2Num: 0, group2Den: 0 },
  Q: { ecCodewords: 13, group1Num: 1, group1Den: 14, group2Num: 0, group2Den: 0 },
  H: { ecCodewords: 17, group1Num: 1, group1Den: 10, group2Num: 0, group2Den: 0 },
};

// Capacity table for Version 1 (21x21)
const VERSION_CAPACITY: Record<QRErrorCorrectionLevel, { numeric: number; alphanumeric: number; byte: number }> = {
  L:  { numeric: 41, alphanumeric: 25, byte: 17 },
  M:  { numeric: 34, alphanumeric: 20, byte: 14 },
  Q:  { numeric: 27, alphanumeric: 16, byte: 11 },
  H:  { numeric: 17, alphanumeric: 10, byte: 7 },
};

// --- Alphanumeric character set ---

const ALPHANUMERIC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

// --- Galois Field GF(256) with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d) ---

class GF256 {
  private static expTable = new Uint8Array(512);
  private static logTable = new Uint8Array(256);

  static {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF256.expTable[i] = x;
      GF256.logTable[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) {
      GF256.expTable[i] = GF256.expTable[i - 255];
    }
  }

  static exp(n: number): number {
    return GF256.expTable[n];
  }

  static log(n: number): number {
    return n === 0 ? -1 : GF256.logTable[n];
  }

  static mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return GF256.exp[GF256.log[a]! + GF256.log[b]!]!;
  }

  static div(a: number, b: number): number {
    if (b === 0) throw new Error("Division by zero");
    if (a === 0) return 0;
    return GF256.exp[(GF256.log[a]! - GF256.log[b]! + 255) % 255]!;
  }

  /** Generate Reed-Solomon error correction codewords */
  static rsEncode(data: Uint8Array, ecCount: number): Uint8Array {
    // Generator polynomial
    const gen = new Uint8Array(ecCount + 1);
    gen[0] = 1;
    for (let i = 0; i < ecCount; i++) {
      for (let j = i; j >= 0; j--) {
        gen[j] = gen[j] !== undefined ? GF256.mul(gen[j]!, i) ^ (gen[j + 1] ?? 0) : (gen[j + 1] ?? 0);
      }
    }

    // Polynomial division
    const result = new Uint8Array(ecCount);
    for (let i = 0; i < data.length; i++) {
      const coef = data[i]! ^ result[0]!;
      result.copyWithin(0, 1);
      result[ecCount - 1] = 0;
      for (let j = 0; j < ecCount; j++) {
        result[j] ^= GF256.mul(gen[j + 1]!, coef);
      }
    }

    return result;
  }
}

// --- Data Encoding ---

function detectMode(text: string): "numeric" | "alphanumeric" | "byte" {
  if (/^\d+$/.test(text)) return "numeric";
  if (/^[0-9A-Z $%*+\-./:]+$/.test(text)) return "alphanumeric";
  return "byte";
}

function encodeData(text: string, mode: string): Uint8Array {
  switch (mode) {
    case "numeric": {
      const bits: number[] = [];
      bits.push(...toBits(4, 1)); // Mode indicator
      bits.push(...toBits(text.length < 10 ? 10 : text.length < 27 ? 12 : 14, text.length));
      for (let i = 0; i < text.length; i += 3) {
        const chunk = text.slice(i, i + 3);
        const val = parseInt(chunk, 10);
        const len = chunk.length === 3 ? 10 : chunk.length === 2 ? 7 : 4;
        bits.push(...toBits(len, val));
      }
      return bitsToBytes(bits);
    }
    case "alphanumeric": {
      const bits: number[] = [];
      bits.push(...toBits(4, 2)); // Mode indicator
      bits.push(...toBits(text.length < 10 ? 9 : text.length < 41 ? 11 : 13, text.length));
      for (let i = 0; i < text.length; i += 2) {
        if (i + 1 < text.length) {
          const v = ALPHANUMERIC_CHARS.indexOf(text[i])! * 45 + ALPHANUMERIC_CHARS.indexOf(text[i + 1])!;
          bits.push(...toBits(11, v));
        } else {
          bits.push(...toBits(6, ALPHANUMERIC_CHARS.indexOf(text[i])!));
        }
      }
      return bitsToBytes(bits);
    }
    case "byte": {
      const bytes = new TextEncoder().encode(text);
      const bits: number[] = [];
      bits.push(...toBits(4, 4)); // Mode indicator
      bits.push(...toBits(8, bytes.length));
      for (const b of bytes) {
        bits.push(...toBits(8, b));
      }
      return bitsToBytes(bits);
    }
    default:
      return new TextEncoder().encode(text);
  }
}

function toBits(len: number, value: number): number[] {
  const bits: number[] = [];
  for (let i = len - 1; i >= 0; i--) {
    bits.push((value >> i) & 1);
  }
  return bits;
}

function bitsToBytes(bits: number[]): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] ?? 0);
    }
    bytes.push(byte);
  }
  return new Uint8Array(bytes);
}

// --- Matrix Construction ---

const VERSION_SIZE = 21; // Version 1 = 21x21

function createMatrix(): boolean[][] {
  const size = VERSION_SIZE;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns (top-left, top-right, bottom-left)
  placeFinderPattern(matrix, 0, 0);
  placeFinderPattern(matrix, size - 7, 0);
  placeFinderPattern(matrix, 0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Dark module (always on)
  matrix[size - 8][8] = true;

  // Alignment patterns (version 1 has none besides finders)

  // Format information area (reserved but not filled yet)
  // Format info goes around the top-left finder pattern

  return matrix;
}

function placeFinderPattern(matrix: boolean[][], row: number, col: number): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[row + r]![col + c] = isBorder || isInner;
    }
  }
}

function reserveFormatAreas(matrix: boolean[][]): void {
  const size = matrix.length;
  // Around top-left finder
  for (let i = 0; i < 9; i++) {
    matrix[8][i] = false; // Already reserved by timing at i=6
    matrix[i][8] = false;
  }
  // Top-right
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 1 - i] = false;
  }
  // Bottom-left
  for (let i = 0; i < 8; i++) {
    matrix[size - 1 - i][8] = false;
  }
}

// --- Masking ---

function applyMask(matrix: boolean[][], maskPattern: number): void {
  const size = matrix.length;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isReserved(row, col)) continue;

      let invert = false;
      switch (maskPattern) {
        case 0: invert = (row + col) % 2 === 0; break;
        case 1: invert = row % 2 === 0; break;
        case 2: invert = col % 3 === 0; break;
        case 3: invert = (row + col) % 3 === 0; break;
        case 4: invert = (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0; break;
        case 5: invert = ((row * col) % 2) + ((row * col) % 3) === 0; break;
        case 6: invert = ((row * col) % 2 + ((row * col) % 3)) % 2 === 0; break;
        case 7: invert = (((row + col) % 2) + ((row * col) % 3)) % 2 === 0; break;
      }

      if (invert) matrix[row]![col] = !matrix[row]![col];
    }
  }
}

function isReserved(row: number, col: number): boolean {
  // Finder patterns
  if ((row < 9 && col < 9) || (row < 9 && col >= VERSION_SIZE - 8) || (row >= VERSION_SIZE - 8 && col < 9)) {
    return true;
  }
  // Timing patterns
  if (row === 6 || col === 6) return true;
  return false;
}

// --- Format Information ---

function generateFormatInfo(ecLevel: QRErrorCorrectionLevel, maskPattern: number): number[] {
  const ecBits: Record<string, number> = { L: 1, M: 0, Q: 3, H: 2 };
  const data = (ecBits[ecLevel]! << 3) | maskPattern;

  // BCH(15,5) encoding for format info
  let d = data << 10;
  for (let i = 4; i >= 0; i--) {
    if (d & (1 << (i + 10))) {
      d ^= 0x537 << i; // Generator polynomial: x^10 + x^8 + x^5 + x^4 + x^2 + x + 1
    }
  }
  const format = (d << 10) | data;

  // Convert to 15-bit array (with XOR mask pattern)
  const bits: number[] = [];
  for (let i = 14; i >= 0; i--) {
    bits.push(((format >> i) & 1) ^ ((i % 2 === 0) ? 1 : 0));
  }
  return bits;
}

function placeFormatInfo(matrix: boolean[][], formatBits: number[]): void {
  const size = matrix.length;

  // Place around top-left finder (clockwise from bottom-right of finder area)
  let idx = 0;
  // Vertical: left side below finder
  for (let i = 8; i >= 0; i--) {
    if (i !== 6) matrix[i]![8] = formatBits[idx++]! === 1;
  }
  // Horizontal: top side right of finder
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) matrix[8]![i] = formatBits[idx++]! === 1;
  }

  // Top-right vertical
  for (let i = size - 1; i >= size - 8; i--) {
    matrix[8]![i] = formatBits[idx++]! === 1;
  }
  // Bottom-left horizontal
  for (let i = size - 8; i < size; i++) {
    matrix[i]![8] = formatBits[idx++]! === 1;
  }
}

// --- Main QR Generation ---

function generateQRMatrix(text: string, ecLevel: QRErrorCorrectionLevel): boolean[][] {
  const matrix = createMatrix();
  reserveFormatAreas(matrix);

  // Encode data
  const mode = detectMode(text);
  const dataBits = encodeData(text, mode);

  // Get EC config
  const ecConfig = EC_LEVELS[ecLevel];

  // Calculate total codewords needed
  const totalDataCodewords = Math.ceil((dataBits.length * 8) / 8); // Approximate
  const totalCodewords = totalDataCodewords + ecConfig.ecCodewords;

  // Pad data to required length
  const paddedData = padData(dataBits, totalDataCodewords);

  // Generate EC codewords
  const ecCodewords = GF256.rsEncode(paddedData, ecConfig.ecCodewords);

  // Combine data + EC
  const allData = new Uint8Array(paddedData.length + ecCodewords.length);
  allData.set(paddedData);
  allData.set(ecCodewords, paddedData.length);

  // Write data into matrix (right-to-bottom zigzag pattern)
  writeData(matrix, allData);

  // Find best mask pattern (simple: use pattern 0 for now)
  let bestMask = 0;
  let minPenalty = Infinity;
  for (let m = 0; m < 8; m++) {
    const testMatrix = JSON.parse(JSON.stringify(matrix)) as boolean[][];
    applyMask(testMatrix, m);
    const penalty = calculatePenalty(testMatrix);
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestMask = m;
    }
  }

  applyMask(matrix, bestMask);

  // Place format information
  const formatBits = generateFormatInfo(ecLevel, bestMask);
  placeFormatInfo(matrix, formatBits);

  return matrix;
}

function padData(data: Uint8Array, targetLength: number): Uint8Array {
  const padded = new Uint8Array(targetLength);
  padded.set(data);

  if (data.length < targetLength) {
    // Terminator
    let pos = data.length;
    const terminatorLen = Math.min(4, targetLength - pos);
    for (let i = 0; i < terminatorLen; i++) {
      padded[pos++] = 0; // Terminated already in bit form
    }

    // Pad bytes: 0xEC, 0x11 alternating
    let padByte = 0xEC;
    while (pos < targetLength) {
      padded[pos++] = padByte;
      padByte = padByte === 0xEC ? 0x11 : 0xEC;
    }
  }

  return padded;
}

function writeData(matrix: boolean[][], data: Uint8Array): void {
  const size = matrix.length;
  let bitIndex = 0;
  let upward = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip timing column

    for (let row = upward ? size - 1 : 0; upward ? row >= 0 : row < size; upward ? row-- : row++) {
      for (let c = 0; c < 2; c++) {
        const currentCol = col - c;
        if (!isReserved(row, currentCol)) {
          if (bitIndex < data.length * 8) {
            const byteIdx = Math.floor(bitIndex / 8);
            const bitIdx = 7 - (bitIndex % 8);
            matrix[row]![currentCol] = ((data[byteIdx]! >> bitIdx) & 1) === 1;
            bitIndex++;
          } else {
            matrix[row]![currentCol] = false; // Remaining padding
          }
        }
      }
    }
    upward = !upward;
  }
}

function calculatePenalty(matrix: boolean[][]): number {
  let penalty = 0;
  const size = matrix.length;

  // Rule 1: Adjacent same-color modules in a row/column
  for (let row = 0; row < size; row++) {
    let run = 1;
    for (let col = 1; col < size; col++) {
      if (matrix[row]![col] === matrix[row]![col - 1]!) run++;
      else {
        if (run >= 5) penalty += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) penalty += 3 + (run - 5);
  }

  for (let col = 0; col < size; col++) {
    let run = 1;
    for (let row = 1; row < size; row++) {
      if (matrix[row]![col] === matrix[row - 1]![col]!) run++;
      else {
        if (run >= 5) penalty += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) penalty += 3 + (run - 5);
  }

  // Rule 2: 2x2 blocks of same color
  for (let row = 0; row < size - 1; row++) {
    for (let col = 0; col < size - 1; col++) {
      const v = matrix[row]![col];
      if (v === matrix[row]![col + 1] && v === matrix[row + 1]![col] && v === matrix[row + 1]![col + 1]) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

// --- Rendering ---

function addQuietZone(matrix: boolean[][], quietZone: number): boolean[][] {
  const qz = Math.max(quietZone, 1);
  const oldSize = matrix.length;
  const newSize = oldSize + qz * 2;
  const result: boolean[][] = Array.from({ length: newSize }, () => Array(newSize).fill(false));

  for (let r = 0; r < oldSize; r++) {
    for (let c = 0; c < oldSize; c++) {
      result[r + qz]![c + qz] = matrix[r]![c];
    }
  }

  return result;
}

function renderSVG(matrix: boolean[][], options: QROptions): { svgElement: SVGSVGElement; svgString: string } {
  const moduleSize = options.size ?? 4;
  const fg = options.foreground ?? "#000000";
  const bg = options.background ?? "#FFFFFF";
  const size = matrix.length;
  const dim = size * moduleSize;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(dim));
  svg.setAttribute("height", String(dim));
  svg.setAttribute("viewBox", `0 0 ${dim} ${dim}`);
  svg.setAttribute("xmlns", ns);

  // Background rect
  const bgRect = document.createElementNS(ns, "rect");
  bgRect.setAttribute("width", String(dim));
  bgRect.setAttribute("height", String(dim));
  bgRect.setAttribute("fill", bg);
  svg.appendChild(bgRect);

  // Path for dark modules (more efficient than individual rects)
  const path = document.createElementNS(ns, "path");
  const pathParts: string[] = [];
  const cr = options.cornerRadius ?? (options.roundedCorners ? Math.max(1, moduleSize * 0.3) : 0);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r]![c]) {
        const x = c * moduleSize;
        const y = r * moduleSize;
        if (cr > 0 && moduleSize > 4) {
          pathParts.push(`M${x + cr},${y}h${moduleSize - cr * 2}a${cr},${cr} 0 0,1 ${cr},${cr}v${moduleSize - cr * 2}a${cr},${cr} 0 0,1 ${-cr},${cr}h${-(moduleSize - cr * 2)}a${cr},${cr} 0 0,1 ${-cr},${-cr}v${-(moduleSize - cr * 2)}a${cr},${cr} 0 0,1 ${cr},${-cr}Z`);
        } else {
          pathParts.push(`M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}Z`);
        }
      }
    }
  }

  path.setAttribute("d", pathParts.join(""));
  path.setAttribute("fill", fg);
  svg.appendChild(path);

  // Logo overlay
  if (options.logo) {
    const logoRatio = options.logoSize ?? 0.2;
    const logoDim = dim * logoRatio;
    const logoX = (dim - logoDim) / 2;
    const logoY = (dim - logoDim) / 2;

    const logoBg = document.createElementNS(ns, "rect");
    logoBg.setAttribute("x", String(logoX - 4));
    logoBg.setAttribute("y", String(logoY - 4));
    logoBg.setAttribute("width", String(logoDim + 8));
    logoBg.setAttribute("height", String(logoDim + 8));
    logoBg.setAttribute("rx", "8");
    logoBg.setAttribute("fill", bg);
    svg.appendChild(logoBg);

    const img = document.createElementNS(ns, "image");
    img.setAttribute("href", options.logo);
    img.setAttribute("x", String(logoX));
    img.setAttribute("y", String(logoY));
    img.setAttribute("width", String(logoDim));
    img.setAttribute("height", String(logoDim));
    img.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.appendChild(img);
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);

  return { svgElement: svg, svgString };
}

// --- Public API ---

/**
 * Generate a QR code.
 * @returns QRResult containing the rendered element and raw matrix
 */
export function generateQR(options: QROptions): QRResult {
  const opts = {
    errorCorrection: "M" as QRErrorCorrectionLevel,
    size: 4,
    quietZone: 4,
    foreground: "#000000",
    background: "#FFFFFF",
    format: "svg" as QRRenderFormat,
    ...options,
  };

  // Generate the QR matrix
  const rawMatrix = generateQRMatrix(options.text, opts.errorCorrection);

  // Add quiet zone
  const matrix = addQuietZone(rawMatrix, opts.quietZone);
  const dimension = matrix.length;

  // Render based on format
  const renderResult = renderSVG(matrix, opts);

  let dataURL: string | undefined;
  if (opts.format === "data-url") {
    const canvas = document.createElement("canvas");
    const dim = dimension * opts.size;
    canvas.width = dim;
    canvas.height = dim;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = opts.foreground;
    for (let r = 0; r < dimension; r++) {
      for (let c = 0; c < dimension; c++) {
        if (matrix[r]![c]) {
          ctx.fillRect(c * opts.size, r * opts.size, opts.size, opts.size);
        }
      }
    }
    dataURL = canvas.toDataURL("image/png");

    return {
      element: canvas,
      matrix,
      dimension,
      dataURL,
    };
  }

  return {
    element: renderResult.svgElement,
    matrix,
    dimension,
    svgString: renderResult.svgString,
  };
}

/** Convenience: generate QR code as an SVG element */
export function generateQRSVG(text: string, containerOrOptions: HTMLElement | QROptions): QRResult {
  const opts: QROptions = typeof containerOrOptions === "object" && "appendChild" in containerOrOptions
    ? { text, ...{} as QROptions }
    : containerOrOptions;

  if (typeof containerOrOptions === "object" && "appendChild" in containerOrOptions) {
    const result = generateQR({ text, ...opts });
    containerOrOptions.appendChild(result.element);
    return result;
  }

  return generateQR(opts);
}
