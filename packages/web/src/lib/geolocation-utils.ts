/**
 * Geolocation, mapping, distance calculation, and location-based utilities.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInfo {
  coordinates: Coordinates;
  accuracy?: number;       // meters
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;        // degrees
  speed?: number;          // m/s
  timestamp: number;
}

export interface Geofence {
  id: string;
  center: Coordinates;
  radius: number;          // meters
  onEnter?: (loc: LocationInfo) => void;
  onExit?: (loc: LocationInfo) => void;
  inside?: boolean;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface DistanceResult {
  kilometers: number;
  miles: number;
  meters: number;
  nauticalMiles: number;
  bearing: number;         // degrees from start to end
  duration?: {            // estimated travel times
    walking?: number;      // minutes
    driving?: number;
    cycling?: number;
  };
}

// --- Core Geolocation ---

/** Get current position with options */
export function getCurrentPosition(
  options?: PositionOptions,
): Promise<LocationInfo> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        coordinates: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude ?? undefined,
        altitudeAccuracy: pos.coords.altitudeAccuracy ?? undefined,
        heading: pos.coords.heading ?? undefined,
        speed: pos.coords.speed ?? undefined,
        timestamp: pos.timestamp,
      }),
      (err) => reject(new Error(err.message)),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
        ...options,
      },
    );
  });
}

/** Watch position changes */
export function watchPosition(
  callback: (location: LocationInfo) => void,
  errorCallback?: (error: GeolocationPositionError) => void,
  options?: PositionOptions,
): () => void {
  const id = navigator.geolocation.watchPosition(
    (pos) => callback({
      coordinates: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude ?? undefined,
      altitudeAccuracy: pos.coords.altitudeAccuracy ?? undefined,
      heading: pos.coords.heading ?? undefined,
      speed: pos.coords.speed ?? undefined,
      timestamp: pos.timestamp,
    }),
    errorCallback ?? (() => {}),
    { enableHighAccuracy: true, ...options },
  );
  return () => navigator.geolocation.clearWatch(id);
}

// --- Distance Calculations ---

/** Haversine formula for great-circle distance between two points */
export function haversineDistance(from: Coordinates, to: Coordinates): DistanceResult {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const meters = R * c;

  // Calculate bearing
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

  return {
    meters: Math.round(meters),
    kilometers: parseFloat((meters / 1000).toFixed(3)),
    miles: parseFloat((meters / 1609.344).toFixed(3)),
    nauticalMiles: parseFloat((meters / 1852).toFixed(3)),
    bearing: Math.round(bearing * 10) / 10,
    duration: estimateTravelTime(meters),
  };
}

function estimateTravelTime(meters: number): { walking: number; driving: number; cycling: number } {
  // Rough estimates: walking 5km/h, driving 50km/h avg, cycling 15km/h
  return {
    walking: Math.round((meters / 5000) * 60),
    driving: Math.round((meters / 50000) * 60),
    cycling: Math.round((meters / 15000) * 60),
  };
}

/** Calculate distance between multiple points (total path length) */
export function pathDistance(points: Coordinates[]): DistanceResult {
  let totalMeters = 0;
  for (let i = 1; i < points.length; i++) {
    totalMeters += haversineDistance(points[i - 1]!, points[i]!).meters;
  }
  return {
    meters: totalMeters,
    kilometers: parseFloat((totalMeters / 1000).toFixed(3)),
    miles: parseFloat((totalMeters / 1609.344).toFixed(3)),
    nauticalMiles: parseFloat((totalMeters / 1852).toFixed(3)),
    bearing: 0,
    duration: estimateTravelTime(totalMeters),
  };
}

/** Find the midpoint between two or more coordinates */
export function midpointCoords(...points: Coordinates[]): Coordinates {
  if (points.length === 0) throw new Error("At least one point required");
  if (points.length === 1) return points[0]!;

  let x = 0, y = 0, z = 0;
  for (const p of points) {
    const latRad = (p.latitude * Math.PI) / 180;
    const lonRad = (p.longitude * Math.PI) / 180;
    x += Math.cos(latRad) * Math.cos(lonRad);
    y += Math.cos(latRad) * Math.sin(lonRad);
    z += Math.sin(latRad);
  }

  x /= points.length;
  y /= points.length;
  z /= points.length;

  return {
    latitude: (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI,
    longitude: (Math.atan2(y, x) * 180) / Math.PI,
  };
}

/** Check if a point is within a bounding box */
export function isInBoundingBox(point: Coordinates, bbox: BoundingBox): boolean {
  return (
    point.latitude >= bbox.south &&
    point.latitude <= bbox.north &&
    point.longitude >= bbox.west &&
    point.longitude <= bbox.east
  );
}

/** Create bounding box from center point and radius in km */
export function createBoundingBox(center: Coordinates, radiusKm: number): BoundingBox {
  // 1 degree lat ≈ 111 km, 1 degree lon ≈ 111 km * cos(lat)
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((center.latitude * Math.PI) / 180));

  return {
    north: center.latitude + latDelta,
    south: center.latitude - latDelta,
    east: center.longitude + lonDelta,
    west: center.longitude - lonDelta,
  };
}

// --- Geofencing ---

export class GeofenceManager {
  private fences = new Map<string, Geofence>();
  private watchId: ReturnType<typeof navigator.geolocation.watchPosition> | null = null;
  private currentPosition: LocationInfo | null = null;
  private updateIntervalMs: number;
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(updateIntervalMs = 5000) {
    this.updateIntervalMs = updateIntervalMs;
  }

  /** Add a geofence */
  add(fence: Omit<Geofence, "inside">): string {
    const id = fence.id || `fence_${Date.now()}`;
    this.fences.set(id, { ...fence, id, inside: false });
    this.ensureWatching();
    return id;
  }

  /** Remove a geofence */
  remove(id: string): boolean {
    this.fences.delete(id);
    if (this.fences.size === 0) this.stopWatching();
    return true;
  }

  /** Check all fences against current position */
  checkFences(location: LocationInfo): void {
    this.currentPosition = location;
    for (const [, fence] of this.fences) {
      const dist = haversineDistance(location.coordinates, fence.center).meters;
      const nowInside = dist <= fence.radius;

      if (nowInside && !fence.inside) {
        fence.inside = true;
        fence.onEnter?.(location);
      } else if (!nowInside && fence.inside) {
        fence.inside = false;
        fence.onExit?.(location);
      }
    }
  }

  /** Get list of fences and their status */
  getFences(): Array<{ id: string; center: Coordinates; radius: number; inside: boolean }> {
    return Array.from(this.fences.values()).map((f) => ({
      id: f.id,
      center: f.center,
      radius: f.radius,
      inside: f.inside ?? false,
    }));
  }

  /** Get current location */
  async getLocation(): Promise<LocationInfo> {
    if (this.currentPosition) return this.currentPosition;
    return getCurrentPosition();
  }

  private ensureWatching(): void {
    if (this.watchId) return;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: LocationInfo = {
          coordinates: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        this.checkFences(loc);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: this.updateIntervalMs },
    );

    // Also do periodic checks for reliability
    this.checkIntervalId = setInterval(async () => {
      try {
        const loc = await getCurrentPosition({ maximumAge: this.updateIntervalMs });
        this.checkFences(loc);
      } catch {}
    }, this.updateIntervalMs);
  }

  private stopWatching(): void {
    if (this.watchId) { navigator.geolocation.clearWatch(this.watchId); this.watchId = null; }
    if (this.checkIntervalId) { clearInterval(this.checkIntervalId); this.checkIntervalId = null; }
    this.currentPosition = null;
  }

  destroy(): void {
    this.stopWatching();
    this.fences.clear();
  }
}

// --- Address Formatting ---

/** Format coordinates as readable string */
export function formatCoordinates(coords: Coordinates, format: "decimal" | "dms" | "compact" = "decimal"): string {
  switch (format) {
    case "dms":
      return `${decToDMS(coords.latitude, true)}, ${decToDMS(coords.longitude, false)}`;
    case "compact":
      return `${coords.latitude.toFixed(4)}°${coords.latitude >= 0 ? "N" : "S"}, ${coords.longitude.toFixed(4)}°${coords.longitude >= 0 ? "E" : "W"}`;
    default:
      return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  }
}

function decToDMS(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  const sec = ((abs - deg - min / 60) * 3600).toFixed(1);

  const dir = isLat ? (decimal >= 0 ? "N" : "S") : (decimal >= 0 ? "E" : "W");
  return `${deg}° ${min}' ${sec}" ${dir}`;
}

/** Format distance with appropriate unit */
export function formatDistance(meters: number, unit: "metric" | "imperial" | "nautical" = "metric"): string {
  switch (unit) {
    case "imperial": {
      const feet = meters * 3.28084;
      const miles = meters / 1609.344;
      return miles >= 1 ? `${miles.toFixed(1)} mi` : `${Math.round(feet)} ft`;
    }
    case "nautical": {
      const nm = meters / 1852;
      return nm >= 1 ? `${nm.toFixed(1)} NM` : `${Math.round(meters * 1.94384)} m`;
    }
    default: {
      const km = meters / 1000;
      return km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(meters)} m`;
    }
  }
}

/** Generate a shareable map link */
export function generateMapLink(
  coords: Coordinates,
  provider: "google" | "apple" | "osm" | "bing" = "google",
  label?: string,
): string {
  const params = new URLSearchParams({
    q: `${coords.latitude},${coords.longitude}`,
    ...(label ? { [provider === "osm" ? "mlat" : "query"]: label } : {}),
  });

  switch (provider) {
    case "apple": return `https://maps.apple.com/?${params.toString()}`;
    case "osm": return `https://www.openstreetmap.org?mlat=${coords.latitude}&mlon=${coords.longitude}&zoom=15`;
    case "bing": return `https://www.bing.com/maps?ppoi=${coords.latitude}_${coords.longitude}`;
    default: return `https://maps.google.com/?${params.toString()}`;
  }
}

// --- Speed & Movement ---

/** Calculate speed between two positions over time */
export function calculateSpeed(
  from: LocationInfo,
  to: LocationInfo,
): { speed: number; unit: string; course: number } {
  const timeDiff = (to.timestamp - from.timestamp) / 1000; // seconds
  if (timeDiff <= 0) return { speed: 0, unit: "m/s", course: 0 };

  const dist = haversineDistance(from.coordinates, to.coordinates);
  const speedMs = dist.meters / timeDiff;

  return {
    speed: parseFloat(speedMs.toFixed(2)),
    unit: "m/s",
    course: dist.bearing,
  };
}

/** Detect if user is stationary (speed below threshold) */
export function isStationary(
  locations: LocationInfo[],
  thresholdMs = 1,     // m/s
  windowSamples = 5,
): boolean {
  if (locations.length < windowSamples) return false;

  const recent = locations.slice(-windowSamples);
  let totalSpeed = 0;
  for (let i = 1; i < recent.length; i++) {
    const s = calculateSpeed(recent[i - 1]!, recent[i]!);
    totalSpeed += s.speed;
  }

  return totalSpeed / (recent.length - 1) < thresholdMs;
}

// --- Timezone utilities ---

/** Get timezone info for a location (approximate) */
export function getTimezoneForLocation(coords: Coordinates): {
  offset: string;   // e.g., "+08:00"
  name: string;     // e.g., "Asia/Shanghai"
  abbreviation: string;
} {
  // This is an approximation - real implementation would use a timezone API
  // Using rough longitude-based estimation
  const offsetHours = Math.round(coords.longitude / 15);
  const offsetSign = offsetHours >= 0 ? "+" : "-";
  const absHours = Math.abs(offsetHours);
  const offsetStr = `${offsetSign}${absHours.toString().padStart(2, "0")}:00`;

  // Very rough timezone name mapping
  const tzNames: Record<string, string> = {
    "-12": "Pacific/Enderbury", "-11": "Pacific/Pago_Pago", "-10": "Pacific/Honolulu",
    "-9": "America/Anchorage", "-8": "America/Los_Angeles", "-7": "America/Denver",
    "-6": "America/Chicago", "-5": "America/New_York", "-4": "America/Caracas",
    "-3": "America/Sao_Paulo", "-2": "Atlantic/South_Georgia", "-1": "Atlantic/Azores",
    "0": "Europe/London", "+1": "Europe/Paris", "+2": "Europe/Athens",
    "+3": "Europe/Moscow", "+4": "Asia/Dubai", "+5": "Asia/Karachi",
    "+5.5": "Asia/Kolkata", "+6": "Asia/Dhaka", "+7": "Asia/Bangkok",
    "+8": "Asia/Shanghai", "+9": "Asia/Tokyo", "+10": "Australia/Sydney",
    "+11": "Pacific/Noumea", "+12": "Pacific/Auckland",
  };

  const key = offsetHours.toString();
  return {
    offset: offsetStr,
    name: tzNames[key] ?? `UTC${offsetStr}`,
    abbreviation: `UTC${offsetSign}${absHours}`,
  };
}
