/**
 * Geolocation, timezone, and location-based utilities.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationInfo {
  coordinates: Coordinates;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  accuracy?: number; // meters
}

export interface DistanceResult {
  kilometers: number;
  miles: number;
  meters: number;
  /** Bearing in degrees (0-360) */
  bearing: number;
  /** Estimated duration driving (minutes) */
  estimatedDriveMinutes?: number;
}

/** Get user's current geolocation */
export function getCurrentLocation(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}): Promise<LocationInfo> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy: position.coords.accuracy ?? undefined,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? false,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 300000,
      },
    );
  });
}

/** Watch location changes */
export function watchLocation(
  callback: (location: LocationInfo) => void,
  options?: { enableHighAccuracy?: boolean },
): () => void {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported");
  }

  const id = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        accuracy: position.coords.accuracy ?? undefined,
      });
    },
    () => {}, // Ignore errors in watch mode
    { enableHighAccuracy: options?.enableHighAccuracy ?? false },
  );

  return () => navigator.geolocation.clearWatch(id);
}

/** Calculate distance between two points using Haversine formula */
export function calculateDistance(from: Coordinates, to: Coordinates): DistanceResult {
  const R = 6371; // Earth's radius in km

  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const kilometers = R * c;

  // Calculate bearing
  const y = Math.sin(dLon) * Math.cos(toRadians(to.latitude));
  const x =
    Math.cos(toRadians(from.latitude)) * Math.sin(toRadians(to.latitude)) -
    Math.sin(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.cos(dLon);
  let bearing = toDegrees(Math.atan2(y, x));
  if (bearing < 0) bearing += 360;

  return {
    kilometers: Math.round(kilometers * 100) / 100,
    miles: Math.round(kilometers * 0.621371 * 100) / 100,
    meters: Math.round(kilometers * 1000),
    bearing: Math.round(bearing * 10) / 10,
    // Rough estimate: ~50km/h average city driving speed
    estimatedDriveMinutes: Math.round((kilometers / 50) * 60),
  };
}

/** Check if a point is within a radius of another point */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusKm: number,
): boolean {
  const distance = calculateDistance(center, point);
  return distance.kilometers <= radiusKm;
}

/** Calculate the midpoint between two coordinates */
export function midpoint(a: Coordinates, b: Coordinates): Coordinates {
  const lat1 = toRadians(a.latitude);
  const lon1 = toRadians(a.longitude);
  const lat2 = toRadians(b.latitude);
  const lon2 = toRadians(b.longitude);

  const dLon = lon2 - lon1;
  const Bx = Math.cos(lat2) * Math.cos(dLon);
  const By = Math.cos(lat2) * Math.sin(dLon);

  const midLat = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By),
  );
  const midLon = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);

  return {
    latitude: toDegrees(midLat),
    longitude: toDegrees(midLon),
  };
}

/** Convert decimal degrees to DMS format */
export function toDMS(decimal: number, isLatitude: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  const direction = isLatitude
    ? decimal >= 0 ? "N" : "S"
    : decimal >= 0 ? "E" : "W";

  return `${degrees}° ${minutes}' ${seconds.toFixed(1)}" ${direction}`;
}

/** Format coordinates for display */
export function formatCoordinates(coords: Coordinates, format: "decimal" | "dms" | "compact" = "decimal"): string {
  switch (format) {
    case "decimal":
      return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    case "dms":
      return `${toDMS(coords.latitude, true)} ${toDMS(coords.longitude, false)}`;
    case "compact":
      return `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`;
    default:
      return `${coords.latitude}, ${coords.longitude}`;
  }
}

// --- Timezone utilities ---

/** Get user's timezone info */
export function getTimezoneInfo(): TimezoneInfo {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(now);
    const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? tz;

    // Get offset
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;
    const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
    const offsetMins = Math.abs(offsetMinutes) % 60;
    const offsetSign = offsetMinutes >= 0 ? "+" : "-";
    const offsetString = `UTC${offsetSign}${offsetHours}:${String(offsetMins).padStart(2, "0")}`;

    return {
      name: tz,
      abbreviation: tzName,
      offset: offsetString,
      offsetMinutes,
      isInDST: isCurrentlyDST(tz),
    };
  } catch {
    return { name: tz, abbreviation: tz, offset: "UTC+0", offsetMinutes: 0, isInDST: false };
  }
}

export interface TimezoneInfo {
  name: string;
  abbreviation: string;
  offset: string;
  offsetMinutes: number;
  isInDST: boolean;
}

/** Check if a timezone is currently observing DST */
function isCurrentlyDST(timezone: string): boolean {
  try {
    const jan = new Date(new Date().getFullYear(), 0, 1).toLocaleString("en-US", { timeZone: timezone });
    const jul = new Date(new Date().getFullYear(), 6, 1).toLocaleString("en-US", { timezone: timezone });
    const janOffset = new Date(jan).getTimezoneOffset();
    const julOffset = new Date(jul).getTimezoneOffset();
    return janOffset !== julOffset;
  } catch {
    return false;
  }
}

/** Get list of common timezones with their current offsets */
export function getCommonTimezones(): Array<{ name: string; offset: string; region: string }> {
  const zones = [
    { name: "America/New_York", region: "Americas" },
    { name: "America/Chicago", region: "Americas" },
    { name: "America/Denver", region: "Americas" },
    { name: "America/Los_Angeles", region: "Americas" },
    { name: "America/Sao_Paulo", region: "Americas" },
    { name: "Europe/London", region: "Europe" },
    { name: "Europe/Paris", region: "Europe" },
    { name: "Europe/Berlin", region: "Europe" },
    { name: "Europe/Moscow", region: "Europe" },
    { name: "Asia/Dubai", region: "Middle East" },
    { name: "Asia/Kolkata", region: "Asia" },
    { name: "Asia/Shanghai", region: "Asia" },
    { name: "Asia/Tokyo", region: "Asia" },
    { name: "Asia/Seoul", region: "Asia" },
    { name: "Australia/Sydney", region: "Oceania" },
    { name: "Pacific/Auckland", region: "Oceania" },
    { name: "Pacific/Honolulu", region: "Oceania" },
  ];

  return zones.map((z) => ({
    ...z,
    offset: getTimezoneOffset(z.name),
  }));
}

/** Get current offset string for a timezone */
function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(now.toLocaleString("en-US", { timezone }));
    const offsetMinutes = (tzDate.getTime() - utcDate.getTime()) / 60000;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const mins = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? "+" : "-";
    return `UTC${sign}${hours}:${String(mins).padStart(2, "0")}`;
  } catch {
    return "UTC";
  }
}

/** Convert time between timezones */
export function convertTime(
  date: Date,
  fromTz: string,
  toTz: string,
): Date | null {
  try {
    const fromStr = date.toLocaleString("en-US", { timeZone: fromTz });
    const toStr = date.toLocaleString("en-US", { timeZone: toTz });

    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    const diff = toDate.getTime() - fromDate.getTime;

    return new Date(date.getTime() + diff);
  } catch {
    return null;
  }
}

/** Format a date in a specific timezone */
export function formatDateInTimezone(
  date: Date,
  timezone: string,
  format: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  return date.toLocaleString("en-US", { ...format, timezone });
}

// --- Helpers ---

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}
