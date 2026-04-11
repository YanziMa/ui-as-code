/**
 * Geolocation utilities: browser Geolocation API wrapper with watch position,
 * accuracy settings, error handling, caching, reverse geocoding hints,
 * permission management, and motion/heading support.
 */

// --- Types ---

export interface GeoPosition {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy: number; // meters
  altitudeAccuracy?: number | null;
  heading?: number | null; // degrees clockwise from true north
  speed?: number | null; // m/s
  timestamp: number;
}

export interface GeoOptions {
  /** Enable high-accuracy mode (GPS) */
  enableHighAccuracy?: boolean;
  /** Timeout in ms (default: 10000) */
  timeout?: number;
  /** Maximum age of cached position in ms (0 = no cache) */
  maximumAge?: number;
}

export interface GeoWatchOptions extends GeoOptions {
  /** Minimum distance change in meters before update fires (default: 0) */
  distanceFilter?: number;
  /** Update interval cap in ms (throttle) */
  throttleMs?: number;
}

export interface GeoError {
  code: number;
  message: string;
  /** PERMISSION_DENIED=1, POSITION_UNAVAILABLE=2, TIMEOUT=3 */
  type: "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT";
}

export interface GeoState {
  position: GeoPosition | null;
  error: GeoError | null;
  loading: boolean;
  watching: boolean;
  permissionStatus: PermissionState | null;
}

export type GeoListener = (state: GeoState) => void;

// --- Error Mapping ---

function mapGeoError(err: GeolocationPositionError): GeoError {
  const types: Record<number, GeoError["type"]> = {
    1: "PERMISSION_DENIED",
    2: "POSITION_UNAVAILABLE",
    3: "TIMEOUT",
  };
  return {
    code: err.code,
    message: err.message,
    type: types[err.code] ?? "POSITION_UNAVAILABLE",
  };
}

function positionToGeo(pos: GeolocationPosition): GeoPosition {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    altitude: pos.coords.altitude,
    accuracy: pos.coords.accuracy,
    altitudeAccuracy: pos.coords.altitudeAccuracy,
    heading: pos.coords.heading,
    speed: pos.coords.speed,
    timestamp: pos.timestamp,
  };
}

// --- Main Class ---

export class GeoLocationManager {
  private geo: Geolocation | null = null;
  private state: GeoState = {
    position: null,
    error: null,
    loading: false,
    watching: false,
    permissionStatus: null,
  };
  private listeners = new Set<GeoListener>();
  private watchId: number | null = null;
  private destroyed = false;
  private lastWatchUpdate = 0;

  constructor() {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      this.geo = navigator.geolocation;
    }
  }

  /** Subscribe to state changes */
  subscribe(listener: GeoListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  /** Get current state */
  getState(): GeoState {
    return { ...this.state };
  }

  /** Check if geolocation is available */
  isAvailable(): boolean {
    return this.geo !== null;
  }

  /** Get current position once */
  async getCurrentPosition(options?: GeoOptions): Promise<GeoPosition> {
    if (!this.geo || this.destroyed) {
      throw new Error("Geolocation is not available");
    }

    this.state.loading = true;
    this.state.error = null;
    this.emit();

    const opts: PositionOptions = {
      enableHighAccuracy: options?.enableHighAccuracy ?? false,
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 0,
    };

    return new Promise<GeoPosition>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.state.loading = false;
        this.state.error = { code: 3, message: "Position request timed out", type: "TIMEOUT" };
        this.emit();
        reject(this.state.error!);
      }, opts.timeout ?? 10000);

      this.geo!.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          const geoPos = positionToGeo(pos);
          this.state.position = geoPos;
          this.state.loading = false;
          this.emit();
          resolve(geoPos);
        },
        (err) => {
          clearTimeout(timer);
          const geoErr = mapGeoError(err);
          this.state.error = geoErr;
          this.state.loading = false;
          this.emit();
          reject(geoErr);
        },
        opts,
      );
    });
  }

  /** Start watching position changes */
  startWatching(options?: GeoWatchOptions): void {
    if (!this.geo || this.destroyed || this.watchId !== null) return;

    const throttleMs = options?.throttleMs ?? 0;

    this.watchId = this.geo.watchPosition(
      (pos) => {
        // Throttle updates
        if (throttleMs > 0) {
          const now = Date.now();
          if (now - this.lastWatchUpdate < throttleMs) return;
          this.lastWatchUpdate = now;
        }

        // Distance filter check
        if (options?.distanceFilter && options.distanceFilter > 0 && this.state.position) {
          const dist = this.haversineDistance(
            this.state.position.latitude,
            this.state.position.longitude,
            pos.coords.latitude,
            pos.coords.longitude,
          );
          if (dist < options.distanceFilter) return;
        }

        this.state.position = positionToGeo(pos);
        this.state.error = null;
        this.state.watching = true;
        this.emit();
      },
      (err) => {
        this.state.error = mapGeoError(err);
        this.emit();
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? false,
        timeout: options?.timeout ?? Infinity,
        maximumAge: options?.maximumAge ?? 0,
      } as PositionOptions,
    );

    this.state.watching = true;
    this.emit();
  }

  /** Stop watching position */
  stopWatching(): void {
    if (this.watchId !== null && this.geo) {
      this.geo.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.state.watching = false;
    this.emit();
  }

  /** Query permission status */
  async queryPermission(): Promise<PermissionState> {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      this.state.permissionStatus = "prompt";
      return "prompt";
    }

    try {
      const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      this.state.permissionStatus = result.state;
      this.emit();

      // Listen for permission changes
      result.addEventListener("change", () => {
        this.state.permissionStatus = result.state;
        this.emit();
      });

      return result.state;
    } catch {
      this.state.permissionStatus = "prompt";
      return "prompt";
    }
  }

  /** Request permission (triggers browser prompt on first call) */
  async requestPermission(): Promise<boolean> {
    try {
      await this.getCurrentPosition({ timeout: 5000 });
      return true;
    } catch (err) {
      const geoErr = err as GeoError;
      return geoErr.type !== "PERMISSION_DENIED";
    }
  }

  /** Calculate distance between two coordinates using Haversine formula (meters) */
  haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** Calculate bearing between two points (degrees from true north) */
  calculateBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    let bearing = toDeg(Math.atan2(y, x));
    return (bearing + 360) % 360;
  }

  /** Calculate destination point given start, bearing, and distance (meters) */
  calculateDestination(
    lat: number,
    lon: number,
    bearingDeg: number,
    distanceMeters: number,
  ): { latitude: number; longitude: number } {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const brng = toRad(bearingDeg);
    const d = distanceMeters / R;

    const lat1 = toRad(lat);
    const lon1 = toRad(lon);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng),
    );
    const lon2 = lon1 + Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );

    return {
      latitude: toDeg(lat2),
      longitude: ((toDeg(lon2) + 540) % 360) - 180,
    };
  }

  /** Check if a point is inside a bounding box */
  isInBoundingBox(
    lat: number,
    lon: number,
    bounds: { north: number; south: number; east: number; west: number },
  ): boolean {
    return (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lon >= bounds.west &&
      lon <= bounds.east
    );
  }

  /** Generate an OpenStreetMap URL for a coordinate */
  getMapUrl(lat: number, lon: number, zoom = 15): string {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=${zoom}`;
  }

  /** Generate a Google Maps URL for a coordinate */
  getGoogleMapsUrl(lat: number, lon: number, zoom = 15): string {
    return `https://maps.google.com/?q=${lat},${lon}&z=${zoom}`;
  }

  /** Destroy and cleanup */
  destroy(): void {
    this.destroyed = true;
    this.stopWatching();
    this.listeners.clear();
    this.state = {
      position: null,
      error: null,
      loading: false,
      watching: false,
      permissionStatus: null,
    };
  }

  // --- Private ---

  private emit(): void {
    const snapshot = { ...this.state };
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Ignore listener errors
      }
    }
  }
}

/** Convenience: create a geolocation manager */
export function createGeoLocationManager(): GeoLocationManager {
  return new GeoLocationManager();
}

// --- Standalone Utilities ---

/** Quick one-shot position fetch */
export async function getCurrentLocation(options?: GeoOptions): Promise<GeoPosition> {
  return createGeoLocationManager().getCurrentPosition(options);
}

/** Calculate distance between two points (meters) */
export function geoDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return createGeoLocationManager().haversineDistance(lat1, lon1, lat2, lon2);
}
