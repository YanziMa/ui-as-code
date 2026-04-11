/**
 * EXIF Reader: Parse EXIF metadata from JPEG/TIFF images in the browser.
 * Extracts camera make/model, date/time, GPS coordinates, orientation,
 * lens info, exposure settings, thumbnail, and custom tags.
 */

// --- Types ---

export interface ExifGpsData {
  latitude: number;
  longitude: number;
  altitude?: number;
  latitudeRef: "N" | "S";
  longitudeRef: "E" | "W";
  /** DMS representation */
  latitudeDms: string;
  longitudeDms: string;
}

export interface ExifCameraData {
  make?: string;
  model?: string;
  software?: string;
  lensMake?: string;
  lensModel?: string;
  lensSpec?: string;
  serialNumber?: string;
  firmwareVersion?: string;
}

export interface ExifPhotoData {
  /** Exposure time in seconds (e.g., 0.005 for 1/200) */
  exposureTime?: number;
  /** F-number (e.g., 2.8) */
  fNumber?: number;
  /** ISO speed rating */
  isoSpeedRatings?: number;
  /** Focal length in mm */
  focalLength?: number;
  /** Focal length in 35mm equivalent */
  focalLengthIn35mmFilm?: number;
  /** Flash fired? */
  flashFired?: boolean;
  /** Flash mode */
  flashMode?: string;
  /** Metering mode */
  meteringMode?: string;
  /** Exposure program */
  exposureProgram?: string;
  /** Exposure bias (EV) */
  exposureBiasValue?: number;
  /** White balance mode */
  whiteBalance?: string;
  /** Light source */
  lightSource?: string;
  /** Scene capture type */
  sceneCaptureType?: string;
  /** Digital zoom ratio */
  digitalZoomRatio?: number;
  /** Color space (sRGB, etc.) */
  colorSpace?: string;
  /** Pixel dimensions */
  pixelXDimension?: number;
  pixelYDimension?: number;
  /** Image unique ID */
  imageUniqueId?: string;
  /** User comment */
  userComment?: string;
  /** Image description */
  imageDescription?: string;
  /** Artist/photographer */
  artist?: string;
  /** Copyright notice */
  copyright?: string;
}

export interface ExifDateTime {
  /** Original datetime string from EXIF */
  raw: string;
  /** Parsed Date object */
  date: Date | null;
  /** Subsecond time */
  subsecTime?: string;
  /** Timezone offset (if available) */
  timezoneOffset?: number;
  /** Formatted display string */
  formatted: string;
}

export interface ExifThumbnailData {
  /** Thumbnail as data URI */
  dataUri?: string;
  /** Thumbnail width */
  width?: number;
  /** Thumbnail height */
  height?: number;
  /** Thumbnail offset in file */
  offset?: number;
  /** Thumbnail length in bytes */
  length?: number;
}

export interface ExifOrientation {
  /** Raw orientation value (1-8) */
  value: number;
  /** Human-readable description */
  description: string;
  /** Rotation angle in degrees */
  rotation: number;
  /** Whether to flip horizontally */
  flipH: boolean;
  /** Whether to flip vertically */
  flipV: boolean;
}

export interface ExifData {
  /** Full parsed EXIF data */
  gps?: ExifGpsData;
  camera?: ExifCameraData;
  photo?: ExifPhotoData;
  dateTime?: ExifDateTime;
  orientation?: ExifOrientation;
  thumbnail?: ExifThumbnailData;
  /** All raw tags (key-value map) */
  rawTags: Record<number, unknown>;
  /** File size in bytes */
  fileSize: number;
  /** Image dimensions */
  width: number;
  height: number;
  /** MIME type */
  mimeType: string;
  /** Whether EXIF data was found */
  hasExif: boolean;
  /** Parsing errors encountered */
  warnings: string[];
}

// --- Constants ---

/** IFD tag definitions */
const IFD0_TAGS: Record<number, { name: string; type: string }> = {
  0x0100: { name: "ImageWidth", type: "number" },
  0x0101: { name: "ImageLength", type: "number" },
  0x010E: { name: "ImageDescription", type: "string" },
  0x010F: { name: "Make", type: "string" },
  0x0110: { name: "Model", type: "string" },
  0x0112: { name: "Orientation", type: "number" },
  0x011A: { name: "XResolution", type: "rational" },
  0x011B: { name: "YResolution", type: "rational" },
  0x0128: { name: "ResolutionUnit", type: "number" },
  0x0131: { name: "Software", type: "string" },
  0x0132: { name: "DateTime", type: "string" },
  0x013B: { name: "Artist", type: "string" },
  0x8298: { name: "Copyright", type: "string" },
  0x9000: { name: "ExifVersion", type: "string" },
  0x927C: { name: "MakerNote", type: "undefined" },
  0x9286: { name: "UserComment", type: "string" },
  0xA001: { name: "ColorSpace", type: "number" },
  0xA002: { name: "PixelXDimension", type: "number" },
  0xA003: { name: "PixelYDimension", type: "number" },
  0xA217: { name: "SensingMethod", type: "number" },
  0xA300: { name: "FileSource", type: "undefined" },
  0xA301: { name: "SceneType", type: "undefined" },
};

const EXIF_TAGS: Record<number, { name: string; type: string }> = {
  0x829A: { name: "ExposureTime", type: "rational" },
  0x829D: { name: "FNumber", type: "rational" },
  0x8822: { name: "ExposureProgram", type: "number" },
  0x8824: { name: "SpectralSensitivity", type: "string" },
  0x8827: { name: "ISOSpeedRatings", type: "number" },
  0x8828: { name: "OECF", type: "undefined" },
  0x9003: { name: "DateTimeOriginal", type: "string" },
  0x9004: { name: "DateTimeDigitized", type: "string" },
  0x9101: { name: "ComponentsConfiguration", type: "undefined" },
  0x9102: { name: "CompressedBitsPerPixel", type: "rational" },
  0x9201: { name: "ShutterSpeedValue", type: "srational" },
  0x9202: { name: "ApertureValue", type: "srational" },
  0x9203: { name: "BrightnessValue", type: "srational" },
  0x9204: { name: "ExposureBiasValue", type: "srational" },
  0x9205: { name: "MaxApertureValue", type: "srational" },
  0x9207: { name: "MeteringMode", type: "number" },
  0x9208: { name: "LightSource", type: "number" },
  0x9209: { name: "Flash", type: "number" },
  0x920A: { name: "FocalLength", type: "rational" },
  0x9214: { name: "SubjectArea", type: "number[]" },
  0x927C: { name: "MakerNote", type: "undefined" },
  0x9286: { name: "UserComment", type: "string" },
  0xA000: { name: "FlashpixVersion", type: "string" },
  0xA001: { name: "ColorSpace", type: "number" },
  0xA002: { name: "PixelXDimension", type: "number" },
  0xA003: { name: "PixelYDimension", type: "number" },
  0xA20B: { name: "FlashEnergy", type: "rational" },
  0xA20C: { name: "SpatialFrequencyResponse", type: "undefined" },
  0xA20E: { name: "FocalPlaneXResolution", type: "rational" },
  0xA20F: { name: "FocalPlaneYResolution", type: "rational" },
  0xA210: { name: "FocalPlaneResolutionUnit", type: "number" },
  0xA214: { name: "SubjectLocation", type: "number[]" },
  0xA215: { name: "ExposureIndex", type: "rational" },
  0xA217: { name: "SensingMethod", type: "number" },
  0xA300: { name: "FileSource", type: "undefined" },
  0xA301: { name: "SceneType", type: "undefined" },
  0xA302: { name: "CFAPattern", type: "undefined" },
  0xA401: { name: "CustomRendered", type: "number" },
  0xA402: { name: "ExposureMode", type: "number" },
  0xA403: { name: "WhiteBalance", type: "number" },
  0xA404: { name: "DigitalZoomRatio", type: "rational" },
  0xA405: { name: "FocalLengthIn35mmFilm", type: "number" },
  0xA406: { name: "SceneCaptureType", type: "number" },
  0xA407: { name: "GainControl", type: "number" },
  0xA408: { name: "Contrast", type: "number" },
  0xA409: { name: "Saturation", type: "number" },
  0xA40A: { name: "Sharpness", type: "number" },
  0xA40B: { name: "DeviceSettingDescription", type: "undefined" },
  0xA40C: { name: "SubjectDistanceRange", type: "number" },
};

const GPS_TAGS: Record<number, { name: string; type: string }> = {
  0x0000: { name: "GPSVersionID", type: "number[]" },
  0x0001: { name: "GPSLatitudeRef", type: "string" },
  0x0002: { name: "GPSLatitude", type: "rational[]" },
  0x0003: { name: "GPSLongitudeRef", type: "string" },
  0x0004: { name: "GPSLongitude", type: "rational[]" },
  0x0005: { name: "GPSAltitudeRef", type: "number" },
  0x0006: { name: "GPSAltitude", type: "rational" },
  0x0007: { name: "GPSTimeStamp", type: "rational[]" },
  0x0009: { name: "GPSSatellites", type: "string" },
  0x000D: { name: "GPSDateStamp", type: "string" },
  0x001D: { name: "GPSDestLatitudeRef", type: "string" },
  0x001E: { name: "GPSDestLatitude", type: "rational[]" },
  0x001F: { name: "GPSDestLongitudeRef", type: "string" },
  0x0020: { name: "GPSDestLongitude", type: "rational[]" },
  0x0021: { name: "GPSDestBearingRef", type: "string" },
  0x0022: { name: "GPSDestBearing", type: "rational" },
  0x0023: { name: "GPSDestDistanceRef", type: "string" },
  0x0024: { name: "GPSDestDistance", type: "rational" },
  0x001B: { name: "GPSProcessingMethod", type: "string" },
};

const ORIENTATION_MAP: Record<number, ExifOrientation> = {
  1: { value: 1, description: "Normal", rotation: 0, flipH: false, flipV: false },
  2: { value: 2, description: "Flip horizontal", rotation: 0, flipH: true, flipV: false },
  3: { value: 3, description: "Rotate 180\u00B0", rotation: 180, flipH: false, flipV: false },
  4: { value: 4, description: "Flip vertical", rotation: 0, flipH: false, flipV: true },
  5: { value: 5, description: "Transpose", rotation: 90, flipH: true, flipV: false },
  6: { value: 6, description: "Rotate 90\u00B0 CW", rotation: 90, flipH: false, flipV: false },
  7: { value: 7, description: "Transverse", rotation: 270, flipH: true, flipV: false },
  8: { value: 8, description: "Rotate 90\u00B0 CCW", rotation: 270, flipH: false, flipV: false },
};

const METERING_MODES: Record<number, string> = {
  0: "Unknown", 1: "Average", 2: "CenterWeightedAverage",
  3: "Spot", 4: "MultiSpot", 5: "Pattern", 6: "Partial",
  255: "Other",
};

const EXPOSURE_PROGRAMS: Record<number, string> = {
  0: "Not defined", 1: "Manual", 2: "Normal program",
  3: "Aperture priority", 4: "Shutter priority",
  5: "Creative program", 6: "Action program",
  7: "Portrait mode", 8: "Landscape mode",
};

const LIGHT_SOURCES: Record<number, string> = {
  0: "Unknown", 1: "Daylight", 2: "Fluorescent", 3: "Tungsten",
  4: "Flash", 9: "Fine weather", 10: "Cloudy weather",
  11: "Shade", 12: "Daylight fluorescent (D 5700-7100K)",
  13: "Day white fluorescent (N 4600-5500K)",
  14: "Cool white fluorescent (W 3800-5000K)",
  15: "White fluorescent (WW 3300-3800K)",
  17: "Standard light A", 18: "Standard light B",
  19: "Standard light C", 20: "D55", 21: "D65",
  22: "D75", 23: "D50", 24: "ISO studio tungsten",
  255: "Other light source",
};

const WHITE_BALANCE: Record<number, string> = {
  0: "Auto", 1: "Manual",
};

const SCENE_CAPTURE_TYPES: Record<number, string> = {
  0: "Standard", 1: "Landscape", 2: "Portrait", 3: "Night scene",
};

const COLOR_SPACES: Record<number, string> = {
  0x1: "sRGB", 0xFFFF: "Uncalibrated",
};

// --- Main API ---

/**
 * Read EXIF data from an image file or blob.
 */
export async function readExif(input: File | Blob): Promise<ExifData> {
  const warnings: string[] = [];

  try {
    const buffer = await input.arrayBuffer();
    const view = new DataView(buffer);
    const fileSize = input.size;

    // Check JPEG signature
    if (view.getUint16(0, false) !== 0xFFD8) {
      warnings.push("Not a valid JPEG file");
      return createEmptyExif(fileSize, warnings);
    }

    // Scan for APP1 (EXIF) segment
    let exifOffset = findExifSegment(view);
    if (exifOffset === -1) {
      warnings.push("No EXIF data found in this image");
      return createEmptyExif(fileSize, warnings);
    }

    // Parse TIFF header
    const tiffHeaderOffset = exifOffset + 10; // Skip APP1 marker + header
    const byteOrder = view.getUint16(tiffHeaderOffset, false);
    const littleEndian = byteOrder === 0x4949; // "II" = Intel

    if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) {
      warnings.push("Invalid TIFF byte order");
      return createEmptyExif(fileSize, warnings);
    }

    const ifd0Offset = view.getUint32(tiffHeaderOffset + 4, littleEndian);

    // Parse IFD0
    const ifd0Tags = parseIfd(view, tiffHeaderOffset, ifd0Offset, littleEndian, IFD0_TAGS, warnings);

    // Find EXIF IFD pointer
    const exifIfdOffset = ifd0Tags[0x8769] as number | undefined;
    const exifTags = exifIfdOffset != null
      ? parseIfd(view, tiffHeaderOffset, exifIfdOffset, littleEndian, EXIF_TAGS, warnings)
      : {};

    // Find GPS IFD pointer
    const gpsIfdOffset = ifd0Tags[0x8825] as number | undefined;
    const gpsTags = gpsIfdOffset != null
      ? parseIfd(view, tiffHeaderOffset, gpsIfdOffset, littleEndian, GPS_TAGS, warnings)
      : {};

    // Find Interop IFD pointer
    const interopIfdOffset = exifTags[0xA005] as number | undefined;

    // Build structured result
    const orientation = parseOrientation(ifd0Tags[0x0112] as number | undefined);
    const dateTime = parseDateTime(exifTags[0x9003] as string | undefined ?? ifd0Tags[0x0132] as string | undefined);
    const camera = parseCameraData(ifd0Tags, exifTags);
    const photo = parsePhotoData(exifTags);
    const gps = parseGpsData(gpsTags);
    const thumbnail = parseThumbnail(view, ifd0Tags, tiffHeaderOffset, littleEndian);

    // Merge all raw tags
    const rawTags: Record<number, unknown> = {};
    for (const [k, v] of Object.entries(ifd0Tags)) rawTags[+k] = v;
    for (const [k, v] of Object.entries(exifTags)) rawTags[+k] = v;
    for (const [k, v] of Object.entries(gpsTags)) rawTags[+k] = v;

    // Get image dimensions
    const width = (ifd0Tags[0xA002] ?? ifd0Tags[0x0100]) as number | undefined ?? 0;
    const height = (ifd0Tags[0xA003] ?? ifd0Tags[0x0101]) as number | undefined ?? 0;

    return {
      gps: gps.hasData ? gps : undefined,
      camera: camera.hasData ? camera : undefined,
      photo: photo.hasData ? photo : undefined,
      dateTime: dateTime.hasData ? dateTime : undefined,
      orientation,
      thumbnail: thumbnail.hasData ? thumbnail : undefined,
      rawTags,
      fileSize,
      width,
      height,
      mimeType: input.type || "image/jpeg",
      hasExif: true,
      warnings,
    };
  } catch (err) {
    warnings.push(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
    return createEmptyExif(input.size, warnings);
  }
}

/**
 * Quick check: does this image have EXIF data?
 */
export async function hasExifData(input: File | Blob): Promise<boolean> {
  try {
    const buffer = await input.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);
    return findExifSegment(view) !== -1;
  } catch {
    return false;
  }
}

/**
 * Get just the orientation value (for quick image rotation).
 */
export async function getExifOrientation(input: File | Blob): Promise<number> {
  try {
    const exif = await readExif(input);
    return exif.orientation?.value ?? 1;
  } catch {
    return 1;
  }
}

/**
 * Format GPS coordinates as a human-readable string.
 */
export function formatGpsCoordinates(gps: ExifGpsData): string {
  const latDir = gps.latitudeRef;
  const lonDir = gps.longitudeRef;
  return `${Math.abs(gps.latitude).toFixed(6)}\u00B0${latDir} ${Math.abs(gps.longitude).toFixed(6)}\u00B0}${lonDir}`;
}

/**
 * Generate Google Maps link from GPS data.
 */
export function generateMapsLink(gps: ExifGpsData): string {
  return `https://maps.google.com/maps?q=${gps.latitude},${gps.longitude}`;
}

// --- Internal Parsing ---

function findExifSegment(view: DataView): number {
  let offset = 2; // Skip SOI marker

  while (offset < view.byteLength - 1) {
    if (view.getUint8(offset) !== 0xFF) break;

    const marker = view.getUint8(offset + 1);
    if (marker === 0xE1) { // APP1 = EXIF
      // Verify "Exif\0\0" header
      const headerStart = offset + 4;
      if (
        view.getUint8(headerStart) === 0x45 && // E
        view.getUint8(headerStart + 1) === 0x78 && // x
        view.getUint8(headerStart + 2) === 0x69 && // i
        view.getUint8(headerStart + 3) === 0x66 && // f
        view.getUint8(headerStart + 4) === 0x00 &&
        view.getUint8(headerStart + 5) === 0x00
      ) {
        return offset;
      }
    }

    // Skip this segment
    if (marker === 0xD9 || marker === 0xDA) break; // EOI or SOS

    const segLen = view.getUint16(offset + 2, false);
    offset += 2 + segLen;
  }

  return -1;
}

function parseIfd(
  view: DataView,
  tiffBase: number,
  ifdOffset: number,
  le: boolean,
  tagDefs: Record<number, { name: string; type: string }>,
  warnings: string[]
): Record<number, unknown> {
  const result: Record<number, unknown> = {};

  try {
    const numEntries = view.getUint16(tiffBase + ifdOffset, le);

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = tiffBase + ifdOffset + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;

      const tag = view.getUint16(entryOffset, le);
      const type = view.getUint16(entryOffset + 2, le);
      const count = view.getUint32(entryOffset + 4, le);
      const valueOffset = entryOffset + 8;

      const def = tagDefs[tag];
      if (!def) continue;

      try {
        result[tag] = readTagValue(view, valueOffset, type, count, le, tiffBase);
      } catch {
        // Skip unreadable tags
      }
    }
  } catch (err) {
    warnings.push(`Error parsing IFD at offset ${ifdOffset}: ${err}`);
  }

  return result;
}

function readTagValue(
  view: DataView,
  valueOffset: number,
  type: number,
  count: number,
  le: boolean,
  tiffBase: number
): unknown {
  const TYPE_SIZES: Record<number, number> = {
    1: 1, // BYTE
    2: 1, // ASCII
    3: 2, // SHORT
    4: 4, // LONG
    5: 8, // RATIONAL
    6: 1, // SBYTE
    7: 1, // UNDEFINED
    8: 2, // SSHORT
    9: 4, // SLONG
    10: 8, // SRATIONAL
    11: 4, // FLOAT
    12: 8, // DOUBLE
  };

  const byteSize = TYPE_SIZES[type] ?? 1;
  const totalBytes = byteSize * count;

  // If fits in 4 bytes, value is inline; otherwise it's an offset
  let actualOffset = valueOffset;
  if (totalBytes > 4) {
    actualOffset = tiffBase + view.getUint32(valueOffset, le);
  }

  if (actualOffset + totalBytes > view.byteLength) return undefined;

  switch (type) {
    case 1: // BYTE
      return count === 1 ? view.getUint8(actualOffset) :
        Array.from({ length: count }, (_, i) => view.getUint8(actualOffset + i));

    case 2: // ASCII
      return readAsciiString(view, actualOffset, count);

    case 3: // SHORT
      return count === 1 ? view.getUint16(actualOffset, le) :
        Array.from({ length: count }, (_, i) => view.getUint16(actualOffset + i * 2, le));

    case 4: // LONG
      return count === 1 ? view.getUint32(actualOffset, le) :
        Array.from({ length: count }, (_, i) => view.getUint32(actualOffset + i * 4, le));

    case 5: // RATIONAL (unsigned)
      if (count === 1) {
        const num = view.getUint32(actualOffset, le);
        const den = view.getUint32(actualOffset + 4, le);
        return den !== 0 ? num / den : 0;
      }
      return Array.from({ length: count }, (_, i) => {
        const o = actualOffset + i * 8;
        const n = view.getUint32(o, le);
        const d = view.getUint32(o + 4, le);
        return d !== 0 ? n / d : 0;
      });

    case 6: // SBYTE
      return count === 1 ? view.getInt8(actualOffset) :
        Array.from({ length: count }, (_, i) => view.getInt8(actualOffset + i));

    case 7: // UNDEFINED
      return Array.from({ length: Math.min(count, totalBytes) }, (_, i) =>
        view.getUint8(actualOffset + i)
      );

    case 8: // SSHORT
      return count === 1 ? view.getInt16(actualOffset, le) :
        Array.from({ length: count }, (_, i) => view.getInt16(actualOffset + i * 2, le));

    case 9: // SLONG
      return count === 1 ? view.getInt32(actualOffset, le) :
        Array.from({ length: count }, (_, i) => view.getInt32(actualOffset + i * 4, le));

    case 10: // SRATIONAL (signed)
      if (count === 1) {
        const num = view.getInt32(actualOffset, le);
        const den = view.getInt32(actualOffset + 4, le);
        return den !== 0 ? num / den : 0;
      }
      return Array.from({ length: count }, (_, i) => {
        const o = actualOffset + i * 8;
        const n = view.getInt32(o, le);
        const d = view.getInt32(o + 4, le);
        return d !== 0 ? n / d : 0;
      });

    case 11: // FLOAT
      return count === 1 ? view.getFloat32(actualOffset, le) : 0;

    case 12: // DOUBLE
      return count === 1 ? view.getFloat64(actualOffset, le) : 0;

    default:
      return undefined;
  }
}

function readAsciiString(view: DataView, offset: number, maxLength: number): string {
  const bytes: number[] = [];
  for (let i = 0; i < maxLength; i++) {
    const b = view.getUint8(offset + i);
    if (b === 0) break;
    bytes.push(b);
  }
  // Handle UTF-16 encoded strings (common in UserComment)
  if (bytes.length >= 8 &&
      bytes[0] === 0x55 && bytes[1] === 0x4E && // "UNICODE"
      bytes[2] === 0x49 && bytes[3] === 0x43 &&
      bytes[4] === 0x4F && bytes[5] === 0x44 &&
      bytes[6] === 0x45 && bytes[7] === 0x00) {
    const strBytes = bytes.slice(8);
    const chars: string[] = [];
    for (let i = 0; i < strBytes.length; i += 2) {
      const code = (strBytes[i]! << 8) | (strBytes[i + 1] ?? 0);
      chars.push(String.fromCharCode(code));
    }
    return chars.join("");
  }
  return String.fromCharCode(...bytes);
}

// --- Data Structuring Helpers ---

function parseOrientation(value: number | undefined): ExifOrientation {
  const v = value ?? 1;
  return ORIENTATION_MAP[v] ?? ORIENTATION_MAP[1]!;
}

function parseDateTime(raw: string | undefined): ExifDateTime & { hasData: boolean } {
  if (!raw) return { raw: "", date: null, formatted: "", hasData: false };

  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const cleaned = raw.replace(/\0/g, "").trim();
  const match = cleaned.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);

  if (!match) return { raw: cleaned, date: null, formatted: cleaned, hasData: !!cleaned };

  const [, year, month, day, hour, min, sec, subsec] = match;
  const date = new Date(
    parseInt(year!), parseInt(month!) - 1, parseInt(day!),
    parseInt(hour!), parseInt(min!), parseInt(sec!)
  );

  return {
    raw: cleaned,
    date,
    subsec: subsec,
    formatted: date.toLocaleString(),
    hasData: true,
  };
}

function parseCameraData(
  ifd0: Record<number, unknown>,
  _exif: Record<number, unknown>
): ExifCameraData & { hasData: boolean } {
  const data: ExifCameraData = {
    make: ifd0[0x010F] as string | undefined,
    model: ifd0[0x0110] as string | undefined,
    software: ifd0[0x0131] as string | undefined,
  };

  return {
    ...data,
    hasData: !!(data.make || data.model || data.software),
  };
}

function parsePhotoData(exif: Record<number, unknown>): ExifPhotoData & { hasData: boolean } {
  const data: ExifPhotoData = {
    exposureTime: exif[0x829A] as number | undefined,
    fNumber: exif[0x829D] as number | undefined,
    isoSpeedRatings: exif[0x8827] as number | undefined,
    focalLength: exif[0x920A] as number | undefined,
    focalLengthIn35mmFilm: exif[0xA405] as number | undefined,
    flashFired: ((exif[0x9209] as number) & 0x01) === 1,
    flashMode: parseFlashMode(exif[0x9209] as number | undefined),
    meteringMode: METERING_MODES[exif[0x9207] as number] ?? "Unknown",
    exposureProgram: EXPOSURE_PROGRAMS[exif[0x8822] as number] ?? "Unknown",
    exposureBiasValue: exif[0x9204] as number | undefined,
    whiteBalance: WHITE_BALANCE[exif[0xA403] as number] ?? "Auto",
    lightSource: LIGHT_SOURCES[exif[0x9208] as number] ?? "Unknown",
    sceneCaptureType: SCENE_CAPTURE_TYPES[exif[0xA406] as number] ?? "Standard",
    digitalZoomRatio: exif[0xA404] as number | undefined,
    colorSpace: COLOR_SPACES[exif[0xA001] as number] ?? "Unknown",
    pixelXDimension: exif[0xA002] as number | undefined,
    pixelYDimension: exif[0xA003] as number | undefined,
    imageDescription: exif[0x010E] as string | undefined,
    userComment: exif[0x9286] as string | undefined,
    artist: exif[0x013B] as string | undefined,
    copyright: exif[0x8298] as string | undefined,
  };

  return {
    ...data,
    hasData: !!(data.exposureTime || data.fNumber || data.isoSpeedRatings ||
              data.focalLength || data.flashFired),
  };
}

function parseFlashMode(flashValue: number | undefined): string {
  if (flashValue == null) return "Unknown";
  const fired = (flashValue & 0x01) === 1;
  const returnVal = (flashValue >> 1) & 0x03;
  const mode = (flashValue >> 3) & 0x03;
  const functionVal = (flashValue >> 5) & 0x01;
  const redEye = (flashValue >> 6) & 0x01;

  if (!fired) return "Did not fire";
  const parts: string[] = [];
  if (mode === 1) parts.push("Compulsory");
  if (mode === 2) parts.push("Compulsory suppress");
  if (mode === 3) parts.push("Multi-mode");
  if (functionVal) parts.push("External");
  if (redEye) parts.push("Red-eye reduction");

  return parts.length > 0 ? parts.join(", ") : "Fired";
}

function parseGpsData(gps: Record<number, unknown>): ExifGpsData & { hasData: boolean } {
  const latRef = (gps[0x0001] as string)?.charAt(0) ?? "N";
  const lonRef = (gps[0x0003] as string)?.charAt(0) ?? "E";

  const latParts = gps[0x0002] as number[] | undefined;
  const lonParts = gps[0x0004] as number[] | undefined;
  const alt = gps[0x0006] as number | undefined;

  if (!latParts || !lonParts || latParts.length < 3 || lonParts.length < 3) {
    return { ...createEmptyGps(), hasData: false };
  }

  const latitude = convertDmsToDecimal(latParts[0]!, latParts[1]!, latParts[2]!);
  const longitude = convertDmsToDecimal(lonParts[0]!, lonParts[1]!, lonParts[2]!);

  return {
    latitude: latRef === "S" ? -latitude : latitude,
    longitude: lonRef === "W" ? -longitude : longitude,
    altitude: alt,
    latitudeRef: latRef as "N" | "S",
    longitudeRef: lonRef as "E" | "W",
    latitudeDms: formatDms(latParts),
    longitudeDms: formatDms(lonParts),
    hasData: true,
  };
}

function parseThumbnail(
  view: DataView,
  ifd0: Record<number, unknown>,
  tiffBase: number,
  le: boolean
): ExifThumbnailData & { hasData: boolean } {
  const offset = ifd0[0x0201] as number | undefined;
  const length = ifd0[0x0202] as number | undefined;

  if (offset == null || length == null || length === 0) {
    return { hasData: false };
  }

  try {
    const thumbOffset = tiffBase + offset;
    if (thumbOffset + length > view.byteLength) return { hasData: false };

    const bytes = new Uint8Array(view.buffer, thumbOffset, length);
    const base64 = btoa(String.fromCharCode(...Array.from(bytes)));

    return {
      dataUri: `data:image/jpeg;base64,${base64}`,
      width: ifd0[0x0202] as number | undefined, // Sometimes stored here
      length,
      offset,
      hasData: true,
    };
  } catch {
    return { hasData: false };
  }
}

// --- Utility Functions ---

function convertDmsToDecimal(degrees: number, minutes: number, seconds: number): number {
  const sign = degrees < 0 ? -1 : 1;
  const d = Math.abs(degrees);
  return sign * (d + minutes / 60 + seconds / 3600);
}

function formatDms(parts: number[]): string {
  if (parts.length < 3) return "";
  const deg = Math.floor(Math.abs(parts[0]!));
  const min = Math.floor(Math.abs(parts[1]!));
  const sec = Math.abs(parts[2]!).toFixed(2);
  return `${deg}\u00B0 ${min}' ${sec}"`;
}

function createEmptyExif(fileSize: number, warnings: string[]): ExifData {
  return {
    rawTags: {},
    fileSize,
    width: 0,
    height: 0,
    mimeType: "image/jpeg",
    hasExif: false,
    warnings,
    orientation: ORIENTATION_MAP[1]!,
  };
}

function createEmptyGps(): ExifGpsData {
  return {
    latitude: 0,
    longitude: 0,
    latitudeRef: "N",
    longitudeRef: "E",
    latitudeDms: "",
    longitudeDms: "",
  };
}
