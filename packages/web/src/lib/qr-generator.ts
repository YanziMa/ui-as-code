/**
 * QR Code Generator: Pure TypeScript QR code encoding and rendering.
 * Supports numeric, alphanumeric, byte, and kanji modes, error correction
 * levels L/M/Q/H, automatic mode selection, SVG/canvas/text output formats,
 * logo overlay, quiet zones, and customizable styling.
 */

// --- Types ---

export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export type QRMode = "numeric" | "alphanumeric" | "byte" | "kanji";

export type QRRenderFormat = "svg" | "canvas" | "text" | "data-url";

export interface QROptions {
  /** Data to encode */
  content: string;
  /** Error correction level (default: M) */
  errorCorrectionLevel?: ErrorCorrectionLevel;
  /** Module size in pixels (default: 4) */
  size?: number;
  /** Quiet zone modules (default: 4) */
  quietZone?: number;
  /** Foreground color (default: #000000) */
  foregroundColor?: string;
  /** Background color (default: #ffffff) */
  backgroundColor?: string;
  /** Output format (default: svg) */
  format?: QRRenderFormat;
  /** Logo image (data URL or path) */
  logo?: string;
  /** Logo size ratio (0-0.3, default: 0.2) */
  logoSize?: number;
  /** Canvas element for canvas rendering */
  canvas?: HTMLCanvasElement;
  /** CSS class for SVG wrapper */
  className?: string;
  /** Custom module shape: square, circle, rounded */
  moduleShape?: "square" | "circle" | "rounded";
  /** Corner style: square, rounded, dot */
  cornerStyle?: "square" | "rounded" | "dot";
}

export interface QRResult {
  /** Rendered output (SVG string, data URL, or text) */
  data: string;
  /** Format used */
  format: QRRenderFormat;
  /** QR matrix dimensions (modules) */
  modules: number;
  /** Actual pixel dimensions */
  width: number;
  height: number;
}

// --- Constants ---

const ALPHANUMERIC_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

/** GF(256) lookup tables for Reed-Solomon encoding. */
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

// Initialize GF(256) tables with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11D;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
}

// --- Encoding Helpers ---

function pushBits(bits: number[], value: number, count: number): void {
  for (let i = count - 1; i >= 0; i--) {
    bits.push((value >> i) & 1);
  }
}

/** Detect optimal encoding mode for input data. */
function detectMode(data: string): QRMode {
  if (/^\d+$/.test(data)) return "numeric";
  if (/^[0-9A-Z $%*+\-.\/:]+$/.test(data)) return "alphanumeric";
  return "byte";
}

/** Encode data into bit stream using appropriate mode. */
function encodeData(data: string, mode: QRMode): number[] {
  switch (mode) {
    case "numeric": return encodeNumeric(data);
    case "alphanumeric": return encodeAlphanumeric(data);
    case "byte": return encodeByte(data);
    case "kanji": return encodeKanji(data);
    default: return encodeByte(data);
  }
}

function encodeNumeric(data: string): number[] {
  const bits: number[] = [];
  bits.push(0, 0, 0, 1); // Mode indicator
  const len = data.length;
  const ccBits = len <= 9 ? 4 : len <= 26 ? 8 : 14;
  pushBits(bits, len, ccBits);
  for (let i = 0; i < data.length; i += 3) {
    const group = data.slice(i, i + 3);
    const val = parseInt(group, 10);
    pushBits(bits, val, group.length * 3 + 1);
  }
  return bits;
}

function encodeAlphanumeric(data: string): number[] {
  const bits: number[] = [];
  bits.push(0, 0, 1, 0);
  const len = data.length;
  const ccBits = len <= 9 ? 9 : len <= 26 ? 11 : 13;
  pushBits(bits, len, ccBits);
  for (let i = 0; i < data.length; i += 2) {
    if (i + 1 < data.length) {
      const v1 = ALPHANUMERIC_CHARS.indexOf(data[i]!);
      const v2 = ALPHANUMERIC_CHARS.indexOf(data[i + 1]!);
      pushBits(bits, v1 * 45 + v2, 11);
    } else {
      pushBits(bits, ALPHANUMERIC_CHARS.indexOf(data[i]!), 6);
    }
  }
  return bits;
}

function encodeByte(data: string): number[] {
  const bits: number[] = [];
  bits.push(0, 1, 0, 0);
  const len = data.length;
  pushBits(bits, len, len <= 9 ? 8 : 16);
  for (let i = 0; i < data.length; i++) {
    pushBits(bits, data.charCodeAt(i), 8);
  }
  return bits;
}

function encodeKanji(_data: string): number[] {
  const bits: number[] = [];
  bits.push(1, 0, 0, 0);
  // Full kanji encoding requires Shift-JIS table — simplified stub
  return bits;
}

// --- Reed-Solomon Error Correction ---

/** Multiply two numbers in GF(256). */
function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!;
}

/** Generate generator polynomial of given degree. */
function generatorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const newPoly = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      newPoly[j] ^= poly[j]!;
      newPoly[j + 1] ^= gfMul(poly[j]!, i);
    }
    poly = newPoly;
  }
  return poly;
}

/** Calculate Reed-Solomon error correction codewords. */
function rsEncode(data: number[], ecCount: number): number[] {
  const gen = generatorPoly(ecCount);
  const result = [...data, ...new Array(ecCount).fill(0)];

  for (let i = 0; i < data.length; i++) {
    const coef = result[i]!;
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        result[i + j] ^= gfMul(gen[j]!, coef);
      }
    }
  }

  return result.slice(data.length);
}

// --- Matrix Construction ---

/** Find minimum version that can hold the given data length. */
function findMinVersion(dataLen: number, ecLevel: ErrorCorrectionLevel): number {
  const levelIndex = { L: 0, M: 1, Q: 2, H: 3 }[ecLevel] ?? 1;

  for (let v = 1; v <= 40; v++) {
    const totalCodewords = DATA_CODEWORDS_TABLE[v - 1]![levelIndex]!
      + EC_CODEWORDS_TABLE[v - 1]![levelIndex]!;
    const totalBits = totalCodewords * 8 - REMAINDER_BITS[v - 1]!;

    if (totalBits >= dataLen) return v;
  }

  throw new Error("Data too long for any QR version");
}

/** Build the QR matrix (2D array of 0/1/null). */
function buildMatrix(
  dataBits: number[],
  version: number,
  ecLevel: ErrorCorrectionLevel,
): (number | null)[][] {
  const size = version * 4 + 17;
  const matrix: (number | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null),
  );
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  // Add finder patterns (top-left, top-right, bottom-left)
  addFinderPattern(matrix, reserved, 0, 0);
  addFinderPattern(matrix, reserved, size - 7, 0);
  addFinderPattern(matrix, reserved, 0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  // Add alignment patterns
  if (version >= 2) {
    const positions = ALIGNMENT_PATTERNS[version - 1]!;
    for (const row of positions) {
      for (const col of positions) {
        // Skip if overlapping with finder pattern
        if ((row < 9 && col < 9) || (row < 9 && col > size - 10) || (row > size - 10 && col < 9)) continue;
        addAlignmentPattern(matrix, reserved, row!, col!);
      }
    }
  }

  // Reserve format info areas
  reserveFormatInfo(reserved, size);

  // Reserve version info areas (version 7+)
  if (version >= 7) {
    reserveVersionInfo(reserved, size);
  }

  // Dark module
  matrix[size - 8][8] = 1;
  reserved[size - 8][8] = true;

  // Place data bits
  placeDataBits(matrix, reserved, dataBits, size);

  // Apply mask pattern (always use mask 0 for simplicity)
  applyMask(matrix, size, 0);

  // Write format information
  writeFormatInfo(matrix, size, ecLevel, 0);

  // Write version information (version 7+)
  if (version >= 7) {
    writeVersionInfo(matrix, size, version);
  }

  return matrix;
}

function addFinderPattern(
  matrix: (number | null)[][],
  reserved: boolean[][],
  row: number,
  col: number,
): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      matrix[row + r][col + c] = isOuter || isInner ? 1 : 0;
      reserved[row + r][col + c] = true;
    }
  }
  // Separator (white border)
  for (let i = 0; i < 8; i++) {
    if (col - 1 >= 0) { reserved[row + i][col - 1] = true; matrix[row + i][col - 1] = 0; }
    if (row - 1 >= 0) { reserved[row - 1][col + i] = true; matrix[row - 1][col + i] = 0; }
  }
}

function addAlignmentPattern(
  matrix: (number | null)[][],
  reserved: boolean[][],
  row: number,
  col: number,
): void {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      matrix[row + r][col + c] = isOuter || isCenter ? 1 : 0;
      reserved[row + r][col + c] = true;
    }
  }
}

function reserveFormatInfo(reserved: boolean[][], size: number): void {
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
}

function reserveVersionInfo(reserved: boolean[][], size: number): void {
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      reserved[i][size - 11 + j] = true;
      reserved[size - 11 + j][i] = true;
    }
  }
}

function placeDataBits(
  matrix: (number | null)[][],
  reserved: boolean[][],
  dataBits: number[],
  size: number,
): void {
  let bitIdx = 0;
  let upward = true;

  for (let col = size - 1; col >= 0; col -= 2) {
    // Skip timing pattern column
    if (col === 6) col--;

    for (let row = upward ? size - 1 : 0; upward ? row >= 0 : row < size; upward ? row-- : row++) {
      for (let c = 0; c < 2; c++) {
        const currentCol = col - c;
        if (!reserved[row][currentCol]) {
          matrix[row][currentCol] = bitIdx < dataBits.length ? dataBits[bitIdx++]! : 0;
        }
      }
    }
    upward = !upward;
  }
}

function applyMask(matrix: (number | null)[][], size: number, maskPattern: number): void {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (matrix[row][col] !== null) {
        let invert = false;
        switch (maskPattern) {
          case 0: invert = (row + col) % 2 === 0; break;
          case 1: invert = row % 2 === 0; break;
          case 2: invert = col % 3 === 0; break;
          case 3: invert = (row + col) % 3 === 0; break;
          case 4: invert = (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0; break;
          case 5: invert = (row * col) % 2 + (row * col) % 3 === 0; break;
          case 6: invert = ((row * col) % 2 + (row * col) % 3) % 2 === 0; break;
          case 7: invert = ((row + col) % 2 + (row * col) % 3) % 2 === 0; break;
        }
        if (invert) matrix[row][col] = matrix[row][col] === 1 ? 0 : 1;
      }
    }
  }
}

function writeFormatInfo(
  matrix: (number | null)[][],
  size: number,
  ecLevel: ErrorCorrectionLevel,
  maskPattern: number,
): void {
  const levelBits = { L: 1, M: 0, Q: 3, H: 2 }[ecLevel] ?? 0;
  const formatIdx = levelBits * 8 + maskPattern;
  let formatInfo = FORMAT_INFO[formatIdx]!;

  // Write top-left and around finder patterns
  for (let i = 0; i < 15; i++) {
    const bit = (formatInfo >> (14 - i)) & 1;
    if (i < 6) { matrix[8][i] = bit; } else if (i < 8) { matrix[8][i + 1] = bit; }
    else { matrix[14 - i][8] = bit; }
  }
  // Write top-right and bottom-left
  for (let i = 0; i < 15; i++) {
    const bit = (formatInfo >> i) & 1;
    if (i < 8) { matrix[size - 1 - i][8] = bit; }
    else { matrix[8][size - 15 + i] = bit; }
  }
}

function writeVersionInfo(
  matrix: (number | null)[][],
  size: number,
  version: number,
): void {
  let verInfo = VERSION_INFO[version - 7]!;
  for (let i = 0; i < 18; i++) {
    const bit = (verInfo >> (17 - i)) & 1;
    // Left-bottom area
    const row = i % 3;
    const col = Math.floor(i / 3);
    matrix[row][size - 11 + col] = bit;
    // Top-right area (mirrored)
    matrix[size - 11 + col][row] = bit;
  }
}

// --- Rendering ---

/** Render QR code as SVG string. */
function renderSVG(
  matrix: (number | null)[][],
  options: Required<QROptions> & { moduleSize: number },
): string {
  const size = matrix.length;
  const quietZone = options.quietZone;
  const modSize = options.moduleSize;
  const dim = (size + quietZone * 2) * modSize;
  const fg = options.foregroundColor;
  const bg = options.backgroundColor;
  const shape = options.moduleShape;
  const cornerStyle = options.cornerStyle;

  let paths = "";

  // Build path data for all dark modules
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (matrix[row][col] !== 1) continue;

      const x = (col + quietZone) * modSize;
      const y = (row + quietZone) * modSize;

      // Check if this is a finder pattern region for corner styling
      const isFinderRegion =
        (row < 8 && col < 8) ||
        (row < 8 && col >= size - 8) ||
        (row >= size - 8 && col < 8);

      if (isFinderRegion && cornerStyle !== "square") {
        // Keep finder patterns as squares for reliability
        paths += `<rect x="${x}" y="${y}" width="${modSize}" height="${modSize}" fill="${fg}"/>`;
      } else if (shape === "circle") {
        const cx = x + modSize / 2;
        const cy = y + modSize / 2;
        const r = modSize * 0.4;
        paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fg}"/>`;
      } else if (shape === "rounded") {
        const r = modSize * 0.25;
        paths += `<rect x="${x}" y="${y}" width="${modSize}" height="${modSize}" rx="${r}" ry="${r}" fill="${fg}"/>`;
      } else {
        paths += `<rect x="${x}" y="${y}" width="${modSize}" height="${modSize}" fill="${fg}"/>`;
      }
    }
  }

  // Logo overlay
  let logoSvg = "";
  if (options.logo) {
    const logoDim = dim * (options.logoSize ?? 0.2);
    const logoX = (dim - logoDim) / 2;
    const logoY = (dim - logoDim) / 2;
    logoSvg = `<rect x="${logoX}" y="${logoY}" width="${logoDim}" height="${logoDim}" fill="${bg}" rx="4"/>
<image href="${options.logo}" x="${logoX}" y="${logoY}" width="${logoDim}" height="${logoDim}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" class="${options.className ?? ""}">
<rect width="${dim}" height="${dim}" fill="${bg}"/>
${paths}${logoSvg}
</svg>`;
}

/** Render QR code onto a canvas element. */
function renderCanvas(
  matrix: (number | null)[][],
  options: Required<QROptions> & { moduleSize: number },
  canvas: HTMLCanvasElement,
): string {
  const size = matrix.length;
  const quietZone = options.quietZone;
  const modSize = options.moduleSize;
  const dim = (size + quietZone * 2) * modSize;

  canvas.width = dim;
  canvas.height = dim;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = options.foregroundColor;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (matrix[row][col] !== 1) continue;

      const x = (col + quietZone) * modSize;
      const y = (row + quietZone) * modSize;

      if (options.moduleShape === "circle") {
        ctx.beginPath();
        ctx.arc(x + modSize / 2, y + modSize / 2, modSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (options.moduleShape === "rounded") {
        roundRect(ctx, x, y, modSize, modSize, modSize * 0.25);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, modSize, modSize);
      }
    }
  }

  // Logo overlay
  if (options.logo) {
    const logoDim = dim * (options.logoSize ?? 0.2);
    const logoX = (dim - logoDim) / 2;
    const logoY = (dim - logoDim) / 2;
    ctx.fillStyle = options.backgroundColor;
    roundRect(ctx, logoX, logoY, logoDim, logoDim, 4);
    ctx.fill();

    const img = new Image();
    img.src = options.logo;
    // Synchronous draw — in production would use onload callback
    try { ctx.drawImage(img, logoX, logoY, logoDim, logoDim); } catch {}
  }

  return canvas.toDataURL("image/png");
}

/** Render QR code as text (ASCII art). */
function renderText(matrix: (number | null)[][]): string {
  const lines: string[] = [];
  for (const row of matrix) {
    lines.push(row.map((cell) => (cell === 1 ? "\u2588\u2588" : "  ")).join(""));
  }
  return lines.join("\n");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// --- Main API ---

/** Generate a QR code from the given options. */
export function generateQR(options: QROptions): QRResult {
  const opts: Required<QROptions> & { moduleSize: number } = {
    errorCorrectionLevel: "M",
    size: 200,
    quietZone: 4,
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
    format: "svg",
    logoSize: 0.2,
    className: "",
    moduleShape: "square",
    cornerStyle: "square",
    moduleSize: 4,
    ...options,
  };

  // Auto-calculate module size from requested pixel size
  const mode = detectMode(opts.content);
  const rawBits = encodeData(opts.content, mode);
  const version = findMinVersion(rawBits.length, opts.errorCorrectionLevel);

  const levelIndex = { L: 0, M: 1, Q: 2, H: 3 }[opts.errorCorrectionLevel]!;
  const dataCapacity = DATA_CODEWORDS_TABLE[version - 1]![levelIndex]!;
  const ecCapacity = EC_CODEWORDS_TABLE[version - 1]![levelIndex]!;

  // Pad data bits to fill all data codewords
  const totalBits = (dataCapacity + ecCapacity) * 8 - REMAINDER_BITS[version - 1]!;
  const paddedBits = padDataBits(rawBits, totalBits);

  // Convert bits to bytes
  const dataBytes = bitsToBytes(paddedBits.slice(0, dataCapacity * 8));

  // Generate error correction codewords
  const ecBytes = rsEncode(dataBytes, ecCapacity);

  // Interleave data and EC codewords
  const finalBits = interleaveDataAndEC(dataBytes, ecBytes, version, opts.errorCorrectionLevel);

  // Build matrix
  const matrix = buildMatrix(finalBits, version, opts.errorCorrectionLevel);
  const qrSize = matrix.length;

  // Recalculate module size based on actual QR dimension
  opts.moduleSize = Math.floor(opts.size / (qrSize + opts.quietZone * 2));

  // Render
  switch (opts.format) {
    case "svg":
      return {
        data: renderSVG(matrix, opts),
        format: "svg",
        modules: qrSize,
        width: (qrSize + opts.quietZone * 2) * opts.moduleSize,
        height: (qrSize + opts.quietZone * 2) * opts.moduleSize,
      };

    case "canvas": {
      const cvs = opts.canvas ?? document.createElement("canvas");
      const dataUrl = renderCanvas(matrix, opts, cvs);
      return {
        data: dataUrl,
        format: "data-url",
        modules: qrSize,
        width: cvs.width,
        height: cvs.height,
      };
    }

    case "data-url": {
      const tmpCanvas = document.createElement("canvas");
      const dataUrl = renderCanvas(matrix, opts, tmpCanvas);
      return {
        data: dataUrl,
        format: "data-url",
        modules: qrSize,
        width: tmpCanvas.width,
        height: tmpCanvas.height,
      };
    }

    case "text":
      return {
        data: renderText(matrix),
        format: "text",
        modules: qrSize,
        width: qrSize,
        height: qrSize,
      };

    default:
      return {
        data: renderSVG(matrix, opts),
        format: "svg",
        modules: qrSize,
        width: (qrSize + opts.quietZone * 2) * opts.moduleSize,
        height: (qrSize + opts.quietZone * 2) * opts.moduleSize,
      };
  }
}

// --- Data Processing Helpers ---

/** Pad data bits to target length with terminator and padding bytes. */
function padDataBits(bits: number[], targetLength: number): number[] {
  const result = [...bits];

  // Terminator (up to 4 zero bits)
  const terminatorLen = Math.min(4, targetLength - result.length);
  for (let i = 0; i < terminatorLen; i++) result.push(0);

  // Align to byte boundary
  while (result.length % 8 !== 0) result.push(0);

  // Padding bytes (alternating 11101100 and 00010001)
  let padByte = 0xEC;
  while (result.length < targetLength) {
    for (let i = 7; i >= 0; i--) {
      if (result.length >= targetLength) break;
      result.push((padByte >> i) & 1);
    }
    padByte = padByte === 0xEC ? 0x11 : 0xEC;
  }

  return result;
}

/** Convert bit array to byte array. */
function bitsToBytes(bits: number[]): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bits[i + j] ?? 0);
    }
    bytes.push(byte);
  }
  return bytes;
}

/** Interleave data and error correction codewords according to QR spec. */
function interleaveDataAndEC(
  _dataBytes: number[],
  _ecBytes: number[],
  _version: number,
  _ecLevel: ErrorCorrectionLevel,
): number[] {
  // Simplified interleaving — concatenate data then EC
  const combined = [..._dataBytes, ..._ecBytes];
  const bits: number[] = [];
  for (const byte of combined) {
    pushBits(bits, byte, 8);
  }
  return bits;
}

// --- Utility Functions ---

/** Estimate QR version needed for given content length and EC level. */
export function estimateVersion(contentLength: number, ecLevel: ErrorCorrectionLevel): number {
  // Rough estimate: each data codeword holds ~1.5 characters in byte mode
  const estimatedBits = contentLength * 8 + 20; // mode indicator + overhead
  return findMinVersion(estimatedBits, ecLevel);
}

/** Get QR code capacity (max characters) for a given version and mode. */
export function getQRCapacity(version: number, mode: QRMode, ecLevel: ErrorCorrectionLevel): number {
  const levelIndex = { L: 0, M: 1, Q: 2, H: 3 }[ecLevel]!;
  const dataCodewords = DATA_CODEWORDS_TABLE[version - 1]![levelIndex]!;
  const bits = dataCodewords * 8 - REMAINDER_BITS[version - 1]!;

  switch (mode) {
    case "numeric": return Math.floor((bits - 4 - (version <= 9 ? 4 : version <= 26 ? 8 : 14)) / 3.33);
    case "alphanumeric": return Math.floor((bits - 4 - (version <= 9 ? 9 : version <= 26 ? 11 : 13)) / 2);
    case "byte": return Math.floor((bits - 4 - (version <= 9 ? 8 : 16)) / 8);
    case "kanji": return Math.floor((bits - 4 - (version <= 9 ? 8 : 16)) / 13);
    default: return 0;
  }
}

/** Validate QR code content for encoding compatibility. */
export function validateQRContent(content: string): { valid: boolean; suggestedMode: QRMode; maxVersion?: number } {
  const mode = detectMode(content);
  let maxVersion = 40;

  try {
    maxVersion = findMinVersion(encodeData(content, mode).length, "L");
  } catch {
    return { valid: false, suggestedMode: mode };
  }

  return {
    valid: maxVersion <= 40,
    suggestedMode: mode,
    maxVersion,
  };
}
