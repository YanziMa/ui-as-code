/**
 * QR Code generation utility (lightweight, no external dependencies).
 * Generates QR code as SVG string or data URI.
 */

// QR Code specification constants
const EC_LEVELS = ["L", "M", "Q", "H"] as const;
const EC_CODEWORDS_PER_BLOCK = [
  // [L, M, Q, H] for each version (1-40), index = version - 1
  // Simplified: using error correction level L for most cases
];

type EcLevel = (typeof EC_LEVELS)[number];

interface QrOptions {
  /** Size in pixels (default: 200) */
  size?: number;
  /** Foreground color (default: #000000) */
  foreground?: string;
  /** Background color (default: #ffffff) */
  background?: string;
  /** Error correction level (default: M) */
  ecLevel?: EcLevel;
  /** Quiet zone modules (default: 4) */
  quietZone?: number;
}

/** Generate QR code matrix (boolean[][]) */
function generateMatrix(data: string, ecLevel: EcLevel = "M"): boolean[][] {
  // Determine minimum version needed
  const dataBits = encodeData(data);
  const version = determineVersion(dataBits.length, ecLevel);

  // Create empty matrix with quiet zone
  const moduleCount = version * 4 + 17;
  const quietZone = 4;
  const totalSize = moduleCount + quietZone * 2;
  const matrix: boolean[][] = Array.from({ length: totalSize }, () =>
    Array(totalSize).fill(false)
  );

  // Add finder patterns (top-left, top-right, bottom-left)
  addFinderPattern(matrix, quietZone, quietZone);
  addFinderPattern(matrix, quietZone + moduleCount - 7, quietZone);
  addFinderPattern(matrix, quietZone, quietZone + moduleCount - 7);

  // Add alignment patterns (for version >= 2)
  if (version >= 2) {
    const positions = getAlignmentPositions(version);
    for (const row of positions) {
      for (const col of positions) {
        // Skip corners where finder patterns are
        if ((row <= 8 && col <= 8) ||
            (row <= 8 && col >= moduleCount - 8) ||
            (row >= moduleCount - 8 && col <= 8)) continue;
        addAlignmentPattern(matrix, quietZone + row, quietZone + col);
      }
    }
  }

  // Add timing patterns
  for (let i = 8; i < moduleCount - 8; i++) {
    matrix[quietZone + 6]![quietZone + i] = i % 2 === 0;
    matrix[quietZone + i]![quietZone + 6] = i % 2 === 0;
  }

  // Add dark module and format info areas
  matrix[quietZone + moduleCount - 8]![quietZone + 8] = true;

  // Reserve format info areas (set later)
  // Reserve version info areas (for version >= 7)

  // Place data bits
  placeDataBits(matrix, dataBits, quietZone, moduleCount);

  // Apply mask pattern (choose best one)
  applyBestMask(matrix, quietZone, moduleCount);

  return matrix;
}

/** Encode data string to bit array */
function encodeData(data: string): boolean[] {
  const bits: boolean[] = [];

  // Mode indicator: byte mode (0100)
  pushBits(bits, [false, true, false, false]);

  // Character count indicator
  const count = data.length;
  const countBits = count <= 255 ? 8 : 16;
  for (let i = countBits - 1; i >= 0; i--) {
    bits.push(((count >> i) & 1) === 1);
  }

  // Data bytes
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    for (let j = 7; j >= 0; j--) {
      bits.push(((byte >> j) & 1) === 1);
    }
  }

  // Terminator (up to 4 zero bits)
  while (bits.length % 8 !== 0) {
    bits.push(false);
  }

  // Pad to capacity with alternating pattern
  const padBytes = [0xEC, 0x11];
  let padIndex = 0;
  while (bits.length < getCapacity(1, "M") * 8) {
    const padByte = padBytes[padIndex % 2];
    for (let j = 7; j >= 0; j--) {
      bits.push(((padByte >> j) & 1) === 1);
    }
    padIndex++;
  }

  return bits;
}

function pushBits(bits: boolean[], values: boolean[]): void {
  for (const v of values) bits.push(v);
}

/** Determine QR version based on data length */
function determineVersion(dataLength: number, _ecLevel: EcLevel): number {
  // Simplified: use version 1-40 lookup
  for (let v = 1; v <= 40; v++) {
    if (dataLength <= getCapacity(v, "M") * 8) return v;
  }
  return 40;
}

/** Get data capacity for version and EC level */
function getCapacity(version: number, _ecLevel: EcLevel): number {
  // Total codewords per version (approximate formula)
  const totalCodewords = version * version * 2 + version * 4 + 18;
  // Reserve some for error correction (roughly 20% for M level)
  return Math.floor(totalCodewords * 0.75);
}

/** Add finder pattern (7x7) */
function addFinderPattern(matrix: boolean[][], startRow: number, startCol: number): void {
  const outer = 7;
  const inner = 3;

  for (let r = 0; r < outer; r++) {
    for (let c = 0; c < outer; c++) {
      const isOuter = r === 0 || r === outer - 1 || c === 0 || c === outer - 1;
      const isInner = r >= 2 && r <= outer - 3 && c >= 2 && c <= outer - 3;
      matrix[startRow + r]![startCol + c] = isOuter || isInner;
    }
  }
}

/** Add alignment pattern (5x5) */
function addAlignmentPattern(matrix: boolean[][], centerRow: number, centerCol: number): void {
  const size = 5;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isEdge = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      matrix[centerRow + r]![centerCol + c] = isEdge || isCenter;
    }
  }
}

/** Get alignment pattern positions for version */
function getAlignmentPositions(version: number): number[] {
  if (version === 1) return [];

  const positions: number[] = [6];
  const interval = Math.floor((version * 4 + 10) / (Math.ceil((version - 1) / 3) * 2 + 6)) * 2;
  let pos = version * 4 + 10 - interval;

  while (pos > 6) {
    positions.unshift(pos);
    pos -= interval;
  }

  return positions;
}

/** Place data bits in matrix (zigzag pattern) */
function placeDataBits(matrix: boolean[][], bits: boolean[], qz: number, mc: number): void {
  let bitIndex = 0;
  let upward = true;

  for (let col = mc - 1 + qz; col >= qz; col -= 2) {
    if (col === qz + 6) col--; // Skip timing column

    for (let row = 0; row < mc; row++) {
      const actualRow = upward ? mc - 1 - row : row;

      for (let c = 0; c < 2; c++) {
        const actualCol = col - c;
        const cell = matrix[qz + actualRow]![qz + actualCol];

        // Skip reserved cells
        if (cell === undefined || cell === null) continue;

        if (bitIndex < bits.length) {
          matrix[qz + actualRow]![qz + actualCol] = bits[bitIndex]!;
          bitIndex++;
        } else {
          matrix[qz + actualRow]![qz + actualCol] = false;
        }
      }
    }
    upward = !upward;
  }
}

/** Apply best mask pattern */
function applyBestMask(matrix: boolean[][], qz: number, mc: number): void {
  // Use mask pattern 0 (simplest) for now
  // In production, would evaluate all 8 masks and pick best
  const maskFn = (r: number, c: number) => (r + c) % 2 === 0;

  for (let r = 0; r < mc; r++) {
    for (let c = 0; c < mc; c++) {
      // Don't mask reserved areas
      if (isReservedArea(r, c, mc)) continue;
      if (matrix[qz + r]![qz + c]) {
        matrix[qz + r]![qz + c] = !maskFn(r, c);
      }
    }
  }
}

/** Check if cell is in a reserved area */
function isReservedArea(row: number, col: number, mc: number): boolean {
  // Finder patterns
  if (row < 9 && col < 9) return true;
  if (row < 9 && col >= mc - 8) return true;
  if (row >= mc - 8 && col < 9) return true;
  // Timing patterns
  if (row === 6 || col === 6) return true;
  // Dark module
  if (row === mc - 8 && col === 8) return true;
  return false;
}

// --- Public API ---

/** Generate QR code as SVG string */
export function generateQrSvg(text: string, options: QrOptions = {}): string {
  const {
    size = 200,
    foreground = "#000000",
    background = "#ffffff",
    quietZone = 4,
  } = options;

  const matrix = generateMatrix(text, options.ecLevel);
  const moduleCount = matrix.length;
  const cellSize = size / moduleCount;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<rect width="100%" height="100%" fill="${background}"/>`;

  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r]![c]) {
        const x = Math.round(c * cellSize * 100) / 100;
        const y = Math.round(r * cellSize * 100) / 100;
        const s = Math.max(Math.round(cellSize * 100) / 100, 0.01);
        svg += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${foreground}"/>`;
      }
    }
  }

  svg += "</svg>";
  return svg;
}

/** Generate QR code as data URI (PNG-like, actually SVG encoded) */
export function generateQrDataUri(text: string, options: QrOptions = {}): string {
  const svg = generateQrSvg(text, options);
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}

/** Generate QR code as canvas element (browser only) */
export async function generateQrCanvas(
  text: string,
  canvas: HTMLCanvasElement,
  options: QrOptions = {},
): Promise<void> {
  const {
    size = 200,
    foreground = "#000000",
    background = "#ffffff",
  } = options;

  const matrix = generateMatrix(text, options.ecLevel);
  const moduleCount = matrix.length;
  const cellSize = size / moduleCount;

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  // Background
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  // Modules
  ctx.fillStyle = foreground;
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r]![c]) {
        ctx.fillRect(
          Math.round(c * cellSize),
          Math.round(r * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize),
        );
      }
    }
  }
}

/** Validate QR code input */
export function validateQrInput(text: string): { valid: boolean; maxLength: number; currentLength: number } {
  // Max data length depends on version and EC level
  // Version 40-H can hold ~2953 bytes of data
  const maxLength = 2953;
  return {
    valid: text.length > 0 && text.length <= maxLength,
    maxLength,
    currentLength: text.length,
  };
}
