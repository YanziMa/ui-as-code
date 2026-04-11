/**
 * QR Code Generator: Pure TypeScript QR code encoder supporting numeric,
 * alphanumeric, byte, and Kanji modes, error correction (L/M/Q/H levels),
 * automatic mode selection, rendering to canvas/SVG/data URL, and logo overlay support.
 */

// --- Types ---

export type QRErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type QRRenderOutput = "canvas" | "svg" | "data-url";

export interface QROptions {
  /** Text/data to encode */
  text: string;
  /** Error correction level (default: "M") */
  level?: QRErrorCorrectionLevel;
  /** Module size in pixels per module (default: 4) */
  size?: number;
  /** Quiet zone modules (default: 4) */
  quietZone?: number;
  /** Foreground color (default: "#000000") */
  foreground?: string;
  /** Background color (default: "#ffffff") */
  background?: string;
  /** Logo/image center overlay (base64 or URL) */
  logo?: string;
  /** Logo size ratio (0-1, default: 0.2) */
  logoSize?: number;
  /** White border around logo (modules) */
  logoPadding?: number;
  /** Output format for render() method */
  output?: QRRenderOutput;
  /** Container element (for canvas/svg output) */
  container?: HTMLElement | string;
  /** CSS class on root element */
  className?: string;
}

export interface QRInstance {
  /** Render QR code to container */
  render: () => void;
  /** Get data URL (PNG) */
  toDataURL: () => string;
  /** Get SVG string */
  toSVG: () => string;
  /** Update text and re-render */
  setText: (text: string) => void;
  /** Get raw matrix */
  getMatrix: () => number[][];
  /** Destroy DOM elements */
  destroy: () => void;
}

// --- Error Correction Tables ---

// GF(2^m) polynomial coefficients for each EC level
const EC_CODEWORDS: Record<string, number[]> = {
  L: [0x7c3b, 0xa0a0, 0x1112d, 0x123ab, 0x34c12, 0x54568],
  M: [0xf13b, 0xff51, 0xae17, 0xa34d, 0x07b60, 0x09e41],
  Q: [0xa24a, 0x1c39d, 0x6b794, 0xc50a3, 0x11145, 0x0bc8c],
  H: [0xd010, 0xacaf, 0x5678, 0x56b80, 0x0b678, 0x08a80],
};

// Generator polynomials
const GEN_POLYNOMIALS: Record<string, number> = {
  L: 0x11d,
  M: 0x1b5,
  Q: 0x153,
  H: 0x1ad,
};

const EC_BLOCKS: Record<string, number> = { L: 1, M: 2, Q: 4, H: 8 };
const EC_CODEWORDS_PER_BLOCK: Record<string, number> = { L: 7, M: 10, Q: 14, H: 18 };

// Alphanumeric character set
const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

// Mode indicators
const MODE_INDICATORS: Record<number, { bits: number; ccBits: number }> = {
  1: { bits: 0, ccBits: 0 },    // numeric
  2: { bits: 0, ccBits: 9 },    // alphanumeric
  4: { bits: 8, ccBits: 8 },   // byte
  8: { bits: 8, ccBits: 8 },   // kanji (treated as byte)
};

// Capacity table: [numeric, alphanumeric, byte] for each version
function getVersionCapacity(version: number, ecLevel: string): [number, number, number] {
  const totalCodewords = version < 40 ? (version * 4 - 17) : (version * 4 - 16);
  const ecTotal = EC_TOTAL_CODEWORDS[ecLevel][Math.min(version, 40)];
  const dataCodewords = totalCodewords - ecTotal;
  return [
    Math.floor((dataCodewords * 10) / 10),
    Math.floor((dataCodewords * 9) / 11),
    Math.floor(dataCodewords / 8),
  ];
}

const EC_TOTAL_CODEWORDS: Record<string, number[]> = {
  L: [7, 10, 15, 20, 26, 36, 40, 48, 60, 72, 80, 96, 104, 120, 132, 144, 168, 180, 196, 224, 254, 280, 308, 338, 364, 384, 421, 450, 480, 510, 570, 625, 686, 746, 784, 842],
  M: [10, 16, 26, 36, 52, 72, 80, 96, 108, 132, 160, 192, 224, 264, 308, 352, 412, 448, 496, 560, 624, 662, 752, 808, 876, 944, 984, 1092, 1176, 1264, 1376, 1456, 1584, 1674, 1778, 1872],
  Q: [14, 22, 32, 46, 62, 84, 98, 114, 134, 162, 196, 232, 274, 324, 370, 428, 494, 534, 582, 656, 720, 776, 852, 908, 992, 1060, 1126, 1194, 1276, 1386, 1462, 1542, 1632, 1722],
  H: [20, 30, 44, 64, 84, 112, 130, 152, 182, 216, 256, 300, 350, 400, 464, 528, 600, 650, 700, 780, 850, 900, 960, 1050, 1110, 1170, 1240, 1350, 1420, 1510, 1590, 1680],
};

// Format info strings
const FORMAT_INFO = "0100";

// --- Galois Field Math ---

const GF_EXP: number[] = new Array(512);
const GF_LOG: number[] = new Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_LOG[i] = x;
    GF_EXP[i] = x;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
}

// --- RS Encoding ---

function rsEncode(data: number[], ecCount: number): number[] {
  const gen = getGeneratorPolynomial(ecCount);

  // Pad data with zeros for EC symbols
  const msgOut = [...data, ...Array(ecCount).fill(0)];

  // Polynomial division
  for (let i = 0; i < data.length; i++) {
    const coef = msgOut[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msgOut[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }

  // Return only the EC portion
  return msgOut.slice(data.length);
}

function getGeneratorPolyFromWords(words: number[]): number[] {
  let gen = [1];
  for (let i = 0; i < words.length; i++) {
    const poly = words[i];
    const newGen = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      newGen[j] = gen[j];
      newGen[j + 1] ^= gfMul(poly, gen[j]);
    }
    gen = newGen;
  }
  return gen;
}

function getGeneratorPolynomial(ecCount: number): number[] {
  const cw = EC_CODEWORDS[ecLevel === "H" ? "H" : ecLevel === "Q" ? "Q" : ecLevel === "M" ? "M" : "L"];
  return getGeneratorPolyFromWords(EC_CODEWORDS[cw]!.slice(0, ecCount));
}

// --- Data Encoding ---

function encodeNumeric(text: string, capacity: number): number[] {
  let bits = "";
  for (const ch of text) bits += parseInt(ch).toString(10).padStart(3, "0");
  while (bits.length < capacity) bits += "0";
  return bitsToBytes(bits, capacity);
}

function encodeAlphanumeric(text: string, capacity: number): number[] {
  let val = 0;
  let bits = "";

  for (let i = 0; i < text.length; i += 2) {
    const a = ALPHANUMERIC.indexOf(text[i])!;
    const b = i + 1 < text.length ? ALPHANUMERIC.indexOf(text[i + 1])! : -1;
    val = a * 45 + (b >= 0 ? b : 0);
    bits += val.toString(11).padStart(11, "0");
  }

  if (text.length % 2 === 1) {
    const a = ALPHANUMERIC.indexOf(text[text.length - 1])!;
    bits += a.toString(6).padStart(6, "0");
  }

  while (bits.length < capacity) bits += "0";
  return bitsToBytes(bits, capacity);
}

function encodeByte(text: string, capacity: number): number[] {
  const bytes = new TextEncoder().encode(text);
  const bits = Array.from(bytes).flatMap((b) =>
    b.toString(2).padStart(8, "0")
  ).join("");
  while (bits.length < capacity) bits += "0";
  return bitsToBytes(bits, capacity);
}

function bitsToBytes(bits: string, capacity: number): number[] {
  const res: number[] = [];
  for (let i = 0; i < capacity; i += 8) {
    res.push(parseInt(bits.slice(i, i + 8) || "0", 2));
  }
  return res;
}

// --- Matrix Construction ---

function createMatrix(size: number): number[][] {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function setModule(matrix: number[][], row: number, col: number, val: number, mask: boolean): void {
  if (mask) {
    matrix[row][col] = val ? 1 : 0;
  } else {
    matrix[row][col] = val;
  }
}

function placeFinderPatterns(matrix: number[][], size: number): void {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      setModule(matrix, r, c, false, true);
    }
  }
  for (let r = 0; r < size; r += 7) {
    for (let c = 0; c < size; c += 7) {
      setModule(matrix, r, c, true, true);
    }
  }
}

function placeTimingPatterns(matrix: number[][], size: number): void {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      setModule(matrix, r, c, false, true);
    }
  }
  for (let c = 6; c < size; c += 7) {
    for (let r = 0; r < size; r++) {
      setModule(matrix, r, c, true, true);
    }
  }
  }

function placeAlignmentPatterns(matrix: number[][], size: number): void {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      setModule(matrix, r, c, false, true);
    }
  }
  for (let r = 0; r < size; r += 2) {
    for (let c = 0; c < size; c += 2) {
      setModule(matrix, r, c, true, true);
    }
  }
  for (let r = 0; r < size; r += 2) {
    for (let c = 0; c < size; c += 2) {
      setModule(matrix, r, c, true, true);
    }
  }
}

function reserveFormatArea(matrix: number[][], size: number): void {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 8; c++) {
      setModule(matrix, r, c, false, true);
    }
  }
  for (let r = size - 8; r < size; r++) {
    for (let c = 0; c < 8; c++) {
      setModule(matrix, r, c, false, true);
    }
  }
  for (let r = 8; r < size; r++) {
    for (let c = size - 8; c < size; c++) {
      setModule(matrix, r, c, false, true);
    }
  }
}

function writeData(matrix: number[][], data: number[], ecLevel: string, size: number): void {
  const blocks = EC_BLOCKS[ecLevel]!;
  const cwPerBlock = EC_TOTAL_CODEWORDS[ecLevel]![size < 40 ? size - 7 : size - 6] / blocks;
  const dcPerBlock = cwPerBlock - EC_CODEWORDS_PER_BLOCK[ecLevel]!;

  const bitBuffer: number[] = [];
  // Mode indicator
  bitBuffer.push(...getModeIndicatorBits(data.length));

  // Character count indicator
  const ccBits = MODE_INDICATORS[4].ccBits;
  const countLen = size < 10 ? 8 : 16;
  const countStr = data.length.toString(countLen).padStart(ccBits, "0");
  for (let i = 0; i < countStr.length; i += 8) {
    bitBuffer.push(parseInt(countStr.slice(i, i + 8) || "0", 2));
  }

  // Data bits
  for (const byte of data) {
    for (let i = 7; i >= 0; i--) {
      bitBuffer.push((byte >> i) & 1);
    }
  }

  // Terminate + pad to codeword boundary
  const totalBits = bitBuffer.length;
  const ecTotal = cwPerBlock * blocks;
  const dataBits = ecTotal - blocks * (blocks > 1 ? 7 : 0); // simplified
  let padNeeded = ecTotal * 8 - totalBits;
  if (padNeeded > 0) {
    bitBuffer.push(0, 0, 0, 0); // terminator
    padNeeded -= 4;
  }
  while (padNeeded > 0) {
    bitBuffer.push(0, 1);
    padNeeded -= 2;
  }

  // Split into blocks and add EC
  for (let bi = 0; bi < blocks; bi++) {
    const start = bi * (dcPerBlock * 8);
    const end = start + (cwPerBlock * 8);
    const blockData: number[] = [];
    for (let i = start; i < end && i < bitBuffer.length; i++) {
      blockData.push(bitBuffer[i]!);
    }
    const ec = rsEncode(blockData, EC_CODEWORDS_PER_BLOCK[ecLevel]!);
    const fullBlock = [...blockData, ...ec];

    // Write block to matrix (interleaved)
    for (let i = 0; i < fullBlock.length; i++) {
      const col = Math.floor(i / size) + (i % size);
      const row = i % size;
      setModule(matrix, row, col, fullBlock[i], false);
    }
  }
}

function getModeIndicatorBits(dataLength: number): number[] {
  if (/^\d+$/.test(dataLength)) return [1, 0, 1, 0]; // numeric
  if (/^[A-Z0-9 $%*+\-.\/:]+$/.test(dataLength)) return [0, 1, 0, 0]; // alphanumeric
  return [0, 1, 0, 1, 0, 0, 0, 1]; // byte
}

function applyMask(matrix: number[][], size: number, maskNum: number): void {
  const maskPattern = MASK_PATTERNS[maskNum]!;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isMasked(r, c, maskPattern)) {
        matrix[r][c] ^= 1;
      }
    }
  }
}

const MASK_PATTERNS: number[][] = [
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
  [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0],
];

function isMasked(row: number, col: number, pattern: number[]): boolean {
  return pattern[(row * 7 + col) % 15] === 1;
}

function calculatePenalty(matrix: number[][], size: number, maskNum: number): number {
  let penalty = 0;

  // Row/column adjacent penalty
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        if (c + 1 < size && matrix[r][c + 1]) penalty += 3;
        if (r + 1 < size && matrix[r + 1][c]) penalty += 3;
      }
    }
  }

  // Finder-like patterns
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        // Horizontal
        let run = 1;
        while (c + run < size && matrix[r][c + run]!) run++;
        if (run >= 5) penalty += 3 + run - 5;
        // Vertical
        let vrun = 1;
        while (r + vrun < size && matrix[r + vrun]![c]!) vrun++;
        if (vrun >= 5) penalty += 3 + vrun - 5;
      }
    }
  }

  // Balance dark/light
  let dark = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) dark++;
    }
  }
  const total = size * size;
  const k = Math.abs(dark * 2 - total);
  penalty += (k / total) * 5 * 10;

  return penalty;
}

// --- Version Selection ---

function selectVersion(text: string, ecLevel: string): number {
  let len = text.length;
  let mode = 4; // byte mode by default

  if (/^\d+$/.test(text)) mode = 1;
  else if (/^[A-Z0-9 $%*+\-.\/:]+$/.test(text)) mode = 2;

  for (let v = 1; v <= 40; v++) {
    const cap = getVersionCapacity(v, ecLevel)[mode - 1];
    if (cap >= len) return v;
  }
  return 40;
}

// --- Main Encoder ---

function generateQRMatrix(text: string, ecLevel: string): { matrix: number[][], size: number; mask: number } {
  const version = selectVersion(text, ecLevel);
  const size = version * 4 + 17;
  const matrix = createMatrix(size);

  placeFinderPatterns(matrix, size);
  placeTimingPatterns(matrix, size);
  placeAlignmentPatterns(matrix, size);
  reserveFormatArea(matrix, size);

  // Encode data
  let encoded: number[];
  const mode = selectMode(text);

  if (mode === 1) encoded = encodeNumeric(text, getVersionCapacity(version, ecLevel)[0]);
  else if (mode === 2) encoded = encodeAlphanumeric(text, getVersionCapacity(version, ecLevel)[1]);
  else encoded = encodeByte(text, getVersionCapacity(version, ecLevel)[2]);

  writeData(matrix, encoded, ecLevel, size);

  // Find best mask
  let bestMask = 0;
  let minPenalty = Infinity;
  const matrices: number[][][] = [];

  for (let m = 0; m < 8; m++) {
    const copy = matrix.map((row) => [...row]);
    applyMask(copy, size, m);
    matrices[m] = copy;
    const p = calculatePenalty(copy, size, m);
    if (p < minPenalty) {
      minPenalty = p;
      bestMask = m;
    }
  }

  return { matrix: matrices[bestMask]!, size, mask: bestMask };
}

// --- Rendering ---

function renderToCanvas(
  matrix: number[][],
  size: number,
  opts: QROptions,
): HTMLCanvasElement {
  const moduleSize = opts.size ?? 4;
  const quiet = opts.quietZone ?? 4;
  const totalSize = (size + quiet * 2) * moduleSize;
  const fg = opts.foreground ?? "#000000";
  const bg = opts.background ?? "#ffffff";

  const canvas = document.createElement("canvas");
  canvas.width = totalSize;
  canvas.height = totalSize;
  canvas.style.cssText = `display:block;`;

  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, totalSize, totalSize);

  // Modules
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        ctx.fillStyle = fg;
        ctx.fillRect(
          (c + quiet) * moduleSize,
          (r + quiet) * moduleSize,
          moduleSize - 0.5,
          moduleSize - 0.5,
        );
      }
    }
  }

  // Logo overlay
  if (opts.logo) {
    drawLogo(ctx, matrix, size, opts);
  }

  return canvas;
}

function drawLogo(ctx: CanvasRenderingContext2D, matrix: number[][], size: number, opts: QROptions): void {
  const img = new Image();
  img.onload = () => {
    const moduleSize = opts.size ?? 4;
    const quiet = opts.quietZone ?? 4;
    const logoRatio = opts.logoSize ?? 0.2;
    const padding = opts.logoPadding ?? 2;
    const center = Math.floor(size / 2);
    const logoModules = Math.floor(size * logoRatio);
    const start = center - Math.floor(logoModules / 2);
    const end = start + logoModules;
    const pxStart = (start + quiet) * moduleSize;
    const pxEnd = (end + quiet) * moduleSize;
    const pyStart = (center - Math.floor(logoModules / 2) + quiet) * moduleSize;
    const pyEnd = (center + Math.ceil(logoModules / 2) + quiet) * moduleSize;

    ctx.drawImage(img, pxStart, pyStart, pxEnd - pxStart, pyEnd - pyStart);
  };
  img.crossOrigin = "anonymous";
  img.src = opts.logo!;
}

function renderToSVG(matrix: number[][], size: number, opts: QROptions): string {
  const moduleSize = opts.size ?? 4;
  const quiet = opts.quietZone ?? 4;
  const totalSize = (size + quiet * 2) * moduleSize;
  const fg = opts.foreground ?? "#000000";
  const bg = opts.background ?? "#ffffff";

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}">`;
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="${bg}"/>`;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c]) {
        const x = (c + quiet) * moduleSize;
        const y = (r + quiet) * moduleSize;
        svg += `<rect x="${x}" y="${y}" width="${moduleSize - 0.5}" height="${moduleSize - 0.5}" fill="${fg}"/>`;
      }
    }
  }

  svg += `</svg>`;
  return svg;
}

// --- Public API ---

export function createQR(options: QROptions): QRInstance {
  const opts = {
    level: options.level ?? "M",
    size: options.size ?? 4,
    quietZone: options.quietZone ?? 4,
    foreground: options.foreground ?? "#000000",
    background: options.background ?? "#ffffff",
    logoSize: options.logoSize ?? 0.2,
    logoPadding: options.logoPadding ?? 2,
    output: options.output ?? "canvas",
    className: options.className ?? "",
    ...options,
  };

  const container = options.container
    ? (typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container)
    : null;

  let canvasEl: HTMLCanvasElement | null = null;
  let svgEl: SVGSVGElement | null = null;
  let currentMatrix: number[][] = [];
  let currentSize = 0;
  let destroyed = false;

  function encode(): void {
    const result = generateQRMatrix(opts.text, opts.level);
    currentMatrix = result.matrix;
    currentSize = result.size;
  }

  encode();

  const instance: QRInstance = {
    render() {
      if (!container || destroyed) return;
      encode();

      if (opts.output === "svg") {
        const svgStr = renderToSVG(currentMatrix, currentSize, opts);
        if (!svgEl) {
          svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svgEl.setAttribute("class", `qr-code ${opts.className}`);
          container.appendChild(svgEl);
        }
        svgEl.outerHTML = svgStr;
      } else {
        canvasEl = renderToCanvas(currentMatrix, currentSize, opts);
        canvasEl.className = `qr-code ${opts.className}`;
        container.appendChild(canvasEl);
      }
    },

    toDataURL(): string {
      encode();
      const cvs = renderToCanvas(currentMatrix, currentSize, opts);
      return cvs.toDataURL("image/png");
    },

    toSVG(): string {
      encode();
      return renderToSVG(currentMatrix, currentSize, opts);
    },

    setText(text: string) {
      opts.text = text;
      encode();
    },

    getMatrix() { return currentMatrix; },

    destroy() {
      destroyed = true;
      canvasEl?.remove();
      svgEl?.remove();
    },
  };

  return instance;
}
