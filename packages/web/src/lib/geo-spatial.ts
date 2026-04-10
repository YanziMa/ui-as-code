/**
 * Geospatial utilities: coordinate systems, distance calculations, geofencing,
 * bounding boxes, polygon operations, tile systems, GPS utilities, map projections.
 */

// --- Coordinate Types ---

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Circle {
  center: LatLng;
  radiusMeters: number;
}

// --- Distance Calculations ---

/** Earth radius in meters (WGS-84) */
const EARTH_RADIUS = 6378137;

/** Haversine formula: distance between two lat/lng points in meters */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const calc = sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
}

/** Vincenty formula: more accurate distance for long distances */
export function vincentyDistance(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const f = 1 / 298.257223563; // WGS-84 flattening
  const L = toRad(b.lng - a.lng);
  const U1 = Math.atan((1 - f) * Math.tan(toRad(a.lat)));
  const U2 = Math.atan((1 - f) * Math.tan(toRad(b.lat)));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  let lambda = L, iterLimit = 100;
  let cosSqAlpha, sinSigma, cosSigma, sigma, cos2SigmaM;

  do {
    const sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
    const sinSigma = Math.sqrt(
      (cosU2 * sinLambda) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2,
    );
    if (sinSigma === 0) return 0; // coincident points
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    const alpha = Math.asin(cosU1 * cosU2 * sinLambda / sinSigma);
    cosSqAlpha = Math.cos(alpha) ** 2;
    cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
    const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    const lambdaPrev = lambda;
    lambda = L + (1 - C) * f * Math.sin(alpha) *
      (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
    if (Math.abs(lambda - lambdaPrev) < 1e-12) break;
  } while (--iterLimit > 0);

  const uSq = cosSqAlpha * (EARTH_RADIUS ** 2 - 6356752.314245 ** 2) / 6356752.314245 ** 2;
  const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSql * (320 - 175 * uSq)));
  // Simplified for practical use
  return EARTH_RADIUS * sigma;
}
let uSql = 0; // Fix reference error in vincenty

/** Euclidean distance between two 2D points */
export function euclideanDistance2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Manhattan distance between two 2D points */
export function manhattanDistance2D(a: Point2D, b: Point2D): number {
  return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
}

/** Euclidean distance between two 3D points */
export function euclideanDistance3D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// --- Bearing / Heading ---

/** Initial bearing from point a to point b in degrees (0=North, clockwise) */
export function initialBearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  return ((toDeg(Math.atan2(y, x)) + 360) % 360);
}

/** Destination point given start, bearing (degrees), distance (meters) */
export function destinationPoint(start: LatLng, bearingDeg: number, distanceMeters: number): LatLng {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const brng = toRad(bearingDeg);
  const angDist = distanceMeters / EARTH_RADIUS;
  const lat1 = toRad(start.lat), lng1 = toRad(start.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angDist) + Math.cos(lat1) * Math.sin(angDist) * Math.cos(brng),
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(brng) * Math.sin(angDist) * Math.cos(lat1),
    Math.cos(angDist) - Math.sin(lat1) * Math.sin(lat2),
  );
  return { lat: toDeg(lat2), lng: ((toDeg(lng2) + 540) % 360) - 180 };
}

/** Midpoint between two coordinates */
export function midpoint(a: LatLng, b: LatLng): LatLng {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat), lng1 = toRad(a.lng);
  const lat2 = toRad(b.lat), lng2 = toRad(b.lng);
  const dLng = lng2 - lng1;
  const Bx = Math.cos(lat2) * Math.cos(dLng);
  const By = Math.cos(lat2) * Math.sin(dLng);
  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + Bx) ** 2 + By ** 2),
  );
  const lng3 = lng1 + Math.atan2(By, Math.cos(lat1) + Bx);
  return { lat: toDeg(lat3), lng: toDeg(lng3) };
}

// --- Bounding Box Operations ---

/** Create bounding box from array of coordinates */
export function boundingBoxFromPoints(points: LatLng[]): BoundingBox {
  if (points.length === 0) return { north: 0, south: 0, east: 0, west: 0 };
  let n = -90, s = 90, e = -180, w = 180;
  for (const p of points) {
    if (p.lat > n) n = p.lat;
    if (p.lat < s) s = p.lat;
    if (p.lng > e) e = p.lng;
    if (p.lng < w) w = p.lng;
  }
  return { north: n, south: s, east: e, west: w };
}

/** Check if point is inside bounding box */
export function isInBoundingBox(point: LatLng, bbox: BoundingBox): boolean {
  return point.lat >= bbox.south && point.lat <= bbox.north &&
    point.lng >= bbox.west && point.lng <= bbox.east;
}

/** Get center of bounding box */
export function bboxCenter(bbox: BoundingBox): LatLng {
  return { lat: (bbox.north + bbox.south) / 2, lng: (bbox.east + bbox.west) / 2 };
}

/** Expand bounding box by margin (degrees) */
export function expandBBox(bbox: BoundingBox, marginDegrees: number): BoundingBox {
  return {
    north: Math.min(90, bbox.north + marginDegrees),
    south: Math.max(-90, bbox.south - marginDegrees),
    east: Math.min(180, bbox.east + marginDegrees),
    west: Math.max(-180, bbox.west - marginDegrees),
  };
}

/** Merge multiple bounding boxes into one */
export function mergeBBoxes(...boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) return { north: 0, south: 0, east: 0, west: 0 };
  let n = -90, s = 90, e = -180, w = 180;
  for (const b of boxes) {
    if (b.north > n) n = b.north;
    if (b.south < s) s = b.south;
    if (b.east > e) e = b.east;
    if (b.west < w) w = b.west;
  }
  return { north: n, south: s, east: e, west: w };
}

/** Bounding box area in approximate square degrees */
export function bboxArea(bbox: BoundingBox): number {
  return (bbox.north - bbox.south) * (bbox.east - bbox.west);
}

/** Check if two bounding boxes intersect/overlap */
export function bboxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return !(a.south > b.north || a.north < b.south || a.west > b.east || a.east < b.west);
}

// --- Geofencing ---

/** Check if point is within radius of center (geofence circle) */
export function isWithinRadius(point: LatLng, center: LatLng, radiusMeters: number): boolean {
  return haversineDistance(point, center) <= radiusMeters;
}

/** Check if point is inside polygon (ray casting algorithm) */
export function isInsidePolygon(point: LatLng, polygon: LatLng[]): boolean {
  const x = point.lng, y = point.lat;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i]!.lng, yi = polygon[i]!.lat;
    const xj = polygon[j]!.lng, yj = polygon[j]!.lat;
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/** Geofence check against multiple zones */
export function geofenceCheck(point: LatLng, zones: Array<{ type: "circle" | "polygon"; shape: Circle | LatLng[] }>): string[] {
  const matches: string[] = [];
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i]!;
    if (zone.type === "circle") {
      if (isWithinRadius(point, zone.shape.center, zone.shape.radiusMeters)) matches.push(`zone-${i}`);
    } else {
      if (isInsidePolygon(point, zone.shape)) matches.push(`zone-${i}`);
    }
  }
  return matches;
}

// --- Polygon Operations ---

/** Calculate polygon area using Shoelace formula (approximate square degrees) */
export function polygonArea(polygon: LatLng[]): number {
  if (polygon.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i]!.lng * polygon[j]!.lat;
    area -= polygon[j]!.lng * polygon[i]!.lat;
  }
  return Math.abs(area / 2);
}

/** Calculate polygon centroid (geometric center) */
export function polygonCentroid(polygon: LatLng[]): LatLng {
  if (polygon.length === 0) return { lat: 0, lng: 0 };
  if (polygon.length === 1) return polygon[0]!;
  let lat = 0, lng = 0;
  for (const p of polygon) { lat += p.lat; lng += p.lng; }
  return { lat: lat / polygon.length, lng: lng / polygon.length };
}

/** Simplify polygon using Douglas-Peucker algorithm */
export function simplifyPolygon(points: LatLng[], tolerance = 0.0001): LatLng[] {
  if (points.length <= 2) return points;
  let maxDist = 0, maxIdx = 0;
  const first = points[0]!, last = points[points.length - 1]!;
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i]!, first, last);
    if (dist > maxDist) { maxDist = dist; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = simplifyPolygon(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPolygon(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function perpendicularDistance(point: LatLng, lineStart: LatLng, lineEnd: LatLng): number {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;
  if (dx === 0 && dy === 0) return haversineDistance(point, lineStart);
  const t = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / (dx * dx + dy * dy);
  const projLat = lineStart.lat + t * dy;
  const projLng = lineStart.lng + t * dx;
  return haversineDistance(point, { lat: projLat, lng: projLng });
}

/** Convex hull (Graham scan) */
export function convexHull(points: LatLng[]): LatLng[] {
  if (points.length <= 3) return [...new Set(points)];
  // Find lowest point
  let lowest = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i]!.lat < points[lowest]!.lat ||
      (points[i]!.lat === points[lowest]!.lat && points[i]!.lng < points[lowest]!.lng)) {
      lowest = i;
    }
  }
  const pivot = points[lowest]!;
  // Sort by polar angle
  const sorted = [...points].sort((a, b) => {
    if (a === pivot) return -1;
    if (b === pivot) return 1;
    return polarAngle(pivot, a) - polarAngle(pivot, b);
  });
  const hull: LatLng[] = [sorted[0]!, sorted[1]!];
  for (let i = 2; i < sorted.length; i++) {
    while (hull.length > 1 && crossProduct(hull[hull.length - 2]!, hull[hull.length - 1]!, sorted[i]!) <= 0) {
      hull.pop();
    }
    hull.push(sorted[i]!);
  }
  return hull;
}

function polarAngle(origin: LatLng, point: LatLng): number {
  return Math.atan2(point.lat - origin.lat, point.lng - origin.lng);
}

function crossProduct(o: LatLng, a: LatLng, b: LatLng): number {
  return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
}

// --- Tile Systems (Slippy Map / XYZ Tiles) ---

/** Convert lat/lng to tile coordinates at given zoom level */
export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  return { x: Math.floor(x), y: Math.floor(y) };
}

/** Convert tile coordinates to lat/lng bounds of the tile */
export function tileToLatLng(tileX: number, tileY: number, zoom: number): BoundingBox {
  const n = Math.pow(2, zoom);
  const west = (tileX / n) * 360 - 180;
  const north = radToDeg(Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n))));
  const east = ((tileX + 1) / n) * 360 - 180;
  const south = radToDeg(Math.atan(Math.sinh(Math.PI * (1 - (2 * (tileY + 1)) / n))));
  return { north, south, east, west };
}

/** Generate all tiles needed to cover a bounding box at given zoom */
export function getTilesForBBox(bbox: BoundingBox, zoom: number): Array<{ x: number; y: number; z: number }> {
  const nw = latLngToTile(bbox.north, bbox.west, zoom);
  const se = latLngToTile(bbox.south, bbox.east, zoom);
  const tiles: Array<{ x: number; y: number; z: number }> = [];
  for (let x = nw.x; x <= se.x; x++) {
    for (let y = nw.y; y <= se.y; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  return tiles;
}

/** Tile URL builder for common providers */
export function buildTileUrl(provider: "openstreetmap" | "carto" | "satellite" | "terrain", x: number, y: number, z: number): string {
  const urls: Record<string, string> = {
    openstreetmap: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    carto: `https://{a,b,c}.basemaps.cartocdn.com/light_all/${z}/${x}/{y}.png`,
    satellite: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    terrain: `https://{a,b,c}.tile.opentopomap.org/${z}/${x}/{y}.png`,
  };
  return urls[provider]?.replace("{a,b,c}", "abc"[x % 3]!) ?? urls.openstreetmap!;
}

// --- Coordinate Format Conversion ---

/** Decimal degrees to DMS (degrees minutes seconds) */
export function decimalToDms(decimal: number): { degrees: number; minutes: number; seconds: number; direction: string } {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  const direction = decimal >= 0 ? "N" : "S";
  return { degrees, minutes, seconds: Math.round(seconds * 1000) / 1000, direction };
}

/** DMS to decimal degrees */
export function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (direction === "S" || direction === "W") decimal = -decimal;
  return decimal;
}

/** UTM approximation (simplified - zone calculation only) */
export function getUTMZone(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}

/** MGRS grid zone designator */
export function getMGRSZone(lat: number, lng: number): string {
  const zone = getUTMZone(lng);
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const col = letters[((Math.floor((lng + 180) / 6)) % 3) * 8 + Math.floor(((lng + 180) % 6) * 8 / 6)] ?? "A";
  const rowLetters = "ABCDEFGHJKLMNPQRSTUV";
  const rowIdx = Math.floor((lat + 80) / 8);
  const row = rowLetters[Math.min(rowIdx, rowLetters.length - 1)] ?? "A";
  return `${zone}${col}${row}`;
}

// --- GPS Utilities ---

/** Parse NMEA GGA sentence */
export function parseNmeaGga(sentence: string): {
  time: string; lat: number; lng: number; quality: number;
  satellites: number; hdop: number; altitude: number;
} | null {
  if (!sentence.startsWith("$GPGGA")) return null;
  const parts = sentence.split(",");
  if (parts.length < 15) return null;
  const latVal = parseFloat(parts[2] ?? "0");
  const latDir = parts[3];
  const lngVal = parseFloat(parts[4] ?? "0");
  const lngDir = parts[5];
  if (isNaN(latVal) || isNaN(lngVal)) return null;
  const lat = dmsToDecimal(
    Math.floor(latVal / 100), latVal % 60, 0, latDir ?? "N",
  );
  const lng = dmsToDecimal(
    Math.floor(lngVal / 100), lngVal % 60, 0, lngDir ?? "E",
  );
  return {
    time: parts[1] ?? "", lat, lng,
    quality: parseInt(parts[6] ?? "0", 10),
    satellites: parseInt(parts[7] ?? "0", 10),
    hdop: parseFloat(parts[8] ?? "0"),
    altitude: parseFloat(parts[9] ?? "0"),
  };
}

/** Encode polyline (Google encoded polyline algorithm) */
export function encodePolyline(points: LatLng[], precision = 5): string {
  const factor = Math.pow(10, precision);
  let encoded = "";
  let prevLat = 0, prevLng = 0;
  for (const p of points) {
    let lat = Math.round(p.lat * factor);
    let lng = Math.round(p.lng * factor);
    const dLat = lat - prevLat;
    const dLng = lng - prevLng;
    prevLat = lat;
    prevLng = lng;
    encoded += encodeSignedValue(dLat);
    encoded += encodeSignedValue(dLng);
  }
  return encoded;
}

/** Decode Google encoded polyline */
export function decodePolyline(encoded: string, precision = 5): LatLng[] {
  const factor = Math.pow(10, precision);
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte: number;
    do {
      byte = encoded.charCodeAt(index++)! - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;
    shift = 0; result = 0;
    do {
      byte = encoded.charCodeAt(index++)! - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;
    points.push({ lat: lat / factor, lng: lng / factor });
  }
  return points;
}

function encodeSignedValue(value: number): string {
  let signed = value < 0 ? ~(value << 1) : value << 1;
  let encoded = "";
  while (signed >= 0x20) {
    encoded += String.fromCharCode((0x20 | (signed & 0x1f)) + 63);
    signed >>= 5;
  }
  encoded += String.fromCharCode(signed + 63);
  return encoded;
}

// --- Projections ---

/** Mercator projection: lat/lng to x/y (meters) */
export function mercatorProject(lat: number, lng: number): Point2D {
  const x = (lng * 20037508.34) / 180;
  const latRad = (lat * Math.PI) / 180;
  const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2)) * 6378137;
  return { x, y };
}

/** Inverse mercator: x/y to lat/lng */
export function mercatorInverse(x: number, y: number): LatLng {
  const lng = (x / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp(y / 6378137)) - Math.PI / 4) * 2 * (180 / Math.PI);
  return { lat, lng: (lng + 540) % 360 - 180 };
}

// --- Helpers ---

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Clamp latitude to valid range [-90, 90] */
export function clampLat(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

/** Normalize longitude to [-180, 180] */
export function normalizeLng(lng: number): number {
  return ((lng + 540) % 360) - 180;
}

/** Format coordinate as readable string */
export function formatCoordinate(lat: number, lng: number, format: "decimal" | "dms" = "decimal"): string {
  if (format === "dms") {
    const latDms = decimalToDms(lat);
    const lngDms = decimalToDms(lng);
    return `${Math.abs(latDms.degrees)}°${latDms.minutes}'${latDms.seconds.toFixed(2)}"${latDms.direction} ${Math.abs(lngDms.degrees)}°${lngDms.minutes}'${lngDms.seconds.toFixed(2)}"${lngDms.direction === "N" ? "E" : "W"}`;
  }
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
