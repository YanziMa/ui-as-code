/**
 * Zoom & Pan Utilities: Transformable viewport with smooth zoom (wheel/pinch),
 * pan (drag/swipe), constrained boundaries, programmatic control, animation,
 * double-tap to reset, inertia, coordinate mapping, and element tracking.
 */

// --- Types ---

export type PanConstraint = "none" | "inside" | "outside" | "custom";
export type ZoomOrigin = "cursor" | "center" | "element";

export interface ZoomPanOptions {
  /** Element to make zoomable/pannable */
  element: HTMLElement;
  /** Container that clips the view (defaults to element parent) */
  container?: HTMLElement;
  /** Initial zoom level */
  initialZoom?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Zoom step per wheel notch */
  wheelZoomSpeed?: number;
  /** Pinch zoom sensitivity */
  pinchSensitivity?: number;
  /** Pan constraint mode */
  panConstraint?: PanConstraint;
  /** Custom constraint function */
  customConstraint?: (x: number, y: number, zoom: number) => { x: number; y: number };
  /** Enable mouse wheel zoom */
  wheelEnabled?: boolean;
  /** Enable drag to pan */
  dragPanEnabled?: boolean;
  /** Enable touch pinch zoom */
  pinchZoomEnabled?: boolean;
  /** Smooth/damped zoom transitions */
  smooth?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Double-tap to zoom/reset */
  doubleTapReset?: boolean;
  /** Double-tap zoom level (0 = toggle between 1 and maxZoom) */
  doubleTapZoomLevel?: number;
  /** Inertia after drag release */
  inertia?: boolean;
  /** Inertia friction (0-1, lower = more slide) */
  inertiaFriction?: number;
  /** Origin point for zoom operations */
  zoomOrigin?: ZoomOrigin;
  /** Called on transform change */
  onTransform?: (state: ZoomPanState) => void;
  /** Called on zoom start/end */
  onZoomChange?: (zoom: number) => void;
  /** Called on pan start/end */
  onPanChange?: (x: number, y: number) => void;
  /** Cursor style when pannable */
  cursorGrab?: string;
  /** Cursor style when grabbing */
  cursorGrabbing?: string;
}

export interface ZoomPanState {
  /** Current zoom level */
  zoom: number;
  /** Pan offset X (px) */
  x: number;
  /** Pan offset Y (px) */
  y: number;
  /** Is currently animating */
  animating: boolean;
}

export interface ZoomPanInstance {
  /** The target element */
  el: HTMLElement;
  /** Get current state */
  getState: () => ZoomPanState;
  /** Set zoom level */
  setZoom: (zoom: number, origin?: ZoomOrigin) => void;
  /** Set pan position */
  setPan: (x: number, y: number) => void;
  /** Set both zoom and pan */
  setTransform: (zoom: number, x: number, y: number) => void;
  /** Zoom in by one step */
  zoomIn: (origin?: ZoomOrigin) => void;
  /** Zoom out by one step */
  zoomOut: (origin?: ZoomOrigin) => void;
  /** Reset to initial state */
  reset: (animate?: boolean) => void;
  /** Animate to a specific transform */
  animateTo: (zoom: number, x: number, y: number, duration?: number) => void;
  /** Fit content into view */
  fit: (padding?: number) => void;
  /** Fill container with content */
  fill: () => void;
  /** Convert screen coordinates to transformed space */
  screenToTransform: (screenX: number, screenY: number) => { x: number; y: number };
  /** Convert transformed space to screen coordinates */
  transformToScreen: (transformX: number, transformY: number) => { x: number; y: number };
  /** Track an element (keep it centered) */
  trackElement: (el: HTMLElement) => void;
  /** Stop tracking */
  stopTracking: () => void;
  /** Enable/disable interactions */
  setEnabled: (enabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a zoomable and pannable element.
 *
 * @example
 * ```ts
 * const zp = createZoomPan({
 *   element: document.getElementById("map")!,
 *   minZoom: 0.5,
 *   maxZoom: 5,
 *   wheelEnabled: true,
 *   dragPanEnabled: true,
 * });
 * zp.setZoom(2.5);
 * ```
 */
export function createZoomPan(options: ZoomPanOptions): ZoomPanInstance {
  const {
    element,
    container,
    initialZoom = 1,
    minZoom = 0.25,
    maxZoom = 10,
    wheelZoomSpeed = 0.15,
    pinchSensitivity = 1,
    panConstraint = "inside",
    customConstraint,
    wheelEnabled = true,
    dragPanEnabled = true,
    pinchZoomEnabled = true,
    smooth = true,
    animationDuration = 250,
    doubleTapReset = true,
    doubleTapZoomLevel = 0,
    inertia = false,
    inertiaFriction = 0.92,
    zoomOrigin = "cursor",
    onTransform,
    onZoomChange,
    onPanChange,
    cursorGrab = "grab",
    cursorGrabbing = "grabbing",
  } = options;

  const clipContainer = container ?? element.parentElement!;
  let _zoom = initialZoom;
  let _panX = 0;
  let _panY = 0;
  let _enabled = true;
  let _animating = false;
  let _trackingEl: HTMLElement | null = null;
  let _trackRAF: number | null = null;

  // Drag state
  let _isDragging = false;
  let _dragStart = { x: 0, y: 0, panX: 0, panY: 0 };
  let _lastMoveTime = 0;
  let _velocity = { x: 0, y: 0 };

  // Inertia state
  let _inertiaRAF: number | null = null;

  // Touch state
  let _pinchStartDist = 0;
  let _pinchStartZoom = 1;
  let _touchStartTime = 0;

  // Double tap detection
  let _lastTapTime = 0;

  const cleanupFns: Array<() => void> = [];

  // Ensure element has proper positioning
  element.style.transformOrigin = "0 0";
  element.style.willChange = "transform";

  // --- Apply Transform ---

  function _apply(animate = false): void {
    const constrained = _constrain(_panX, _panY, _zoom);

    if (animate && smooth) {
      _animating = true;
      element.style.transition = `transform ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    } else {
      element.style.transition = "none";
    }

    element.style.transform = `translate(${constrained.x}px, ${constrained.y}px) scale(${_zoom})`;

    if (animate) {
      setTimeout(() => {
        _animating = false;
        element.style.transition = "none";
      }, animationDuration);
    }

    onTransform?.({ zoom: _zoom, x: constrained.x, y: constrained.y, animating: _animating });
  }

  function _constrain(x: number, y: number, z: number): { x: number; y: number } {
    if (panConstraint === "none") return { x, y };
    if (panConstraint === "custom" && customConstraint) return customConstraint(x, y, z);

    const rect = clipContainer.getBoundingClientRect();
    const elRect = element.getBoundingClientRect();
    const scaledW = elRect.width / z;
    const scaledH = elRect.height / z;

    if (panConstraint === "inside") {
      // Keep content inside container
      const maxX = Math.max(0, (scaledW * z - rect.width) / 2);
      const maxY = Math.max(0, (scaledH * z - rect.height) / 2);
      return {
        x: z <= 1 ? Math.max(-maxX, Math.min(maxX, x)) : x,
        y: z <= 1 ? Math.max(-maxY, Math.min(maxY, y)) : y,
      };
    }

    // outside: keep container filled with content
    if (z > 1) {
      const minX = rect.width - scaledW * z;
      const minY = rect.height - scaledH * z;
      return {
        x: Math.max(minX, Math.min(0, x)),
        y: Math.max(minY, Math.min(0, y)),
      };
    }

    return { x, y };
  }

  // --- Zoom ---

  function _zoomAt(newZoom: number, originX?: number, originY?: number): void {
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    if (clampedZoom === _zoom) return;

    if (originX !== undefined && originY !== undefined && zoomOrigin === "cursor") {
      // Zoom toward cursor/point
      const rect = clipContainer.getBoundingClientRect();
      const cx = originX - rect.left;
      const cy = originY - rect.top;

      // Adjust pan to keep the point under cursor stationary
      const scale = clampedZoom / _zoom;
      _panX = cx - (cx - _panX) * scale;
      _panY = cy - (cy - _panY) * scale;
    }

    _zoom = clampedZoom;
    _apply(smooth);
    onZoomChange?.(_zoom);
  }

  function setZoom(zoom: number, origin?: ZoomOrigin): void {
    if (origin === "center") {
      const rect = clipContainer.getBoundingClientRect();
      _zoomAt(zoom, rect.width / 2, rect.height / 2);
    } else if (origin === "element") {
      const rect = element.getBoundingClientRect();
      _zoomAt(zoom, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      _zoomAt(zoom);
    }
  }

  function zoomIn(origin?: ZoomOrigin): void {
    setZoom(_zoom * (1 + wheelZoomSpeed * 2), origin);
  }

  function zoomOut(origin?: ZoomOrigin): void {
    setZoom(_zoom / (1 + wheelZoomSpeed * 2), origin);
  }

  // --- Pan ---

  function setPan(x: number, y: number): void {
    _panX = x;
    _panY = y;
    _apply(false);
    onPanChange?.(_panX, _panY);
  }

  function setTransform(zoom: number, x: number, y: number): void {
    _zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    _panX = x;
    _panY = y;
    _apply(false);
  }

  // --- Animation ---

  function animateTo(zoom: number, x: number, y: number, dur?: number): void {
    _zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
    _panX = x;
    _panY = y;
    _apply(true);
  }

  function reset(animate = false): void {
    _zoom = initialZoom;
    _panX = 0;
    _panY = 0;
    _apply(animate);
  }

  function fit(padding = 20): void {
    const cRect = clipContainer.getBoundingClientRect();
    const elRect = element.getBoundingClientRect();
    const scaleX = (cRect.width - padding * 2) / elRect.width;
    const scaleY = (cRect.height - padding * 2) / elRect.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);
    setZoom(fitZoom, "center");
    setPan(0, 0);
  }

  function fill(): void {
    const cRect = clipContainer.getBoundingClientRect();
    const elRect = element.getBoundingClientRect();
    const scaleX = cRect.width / elRect.width;
    const scaleY = cRect.height / elRect.height;
    const fillZoom = Math.max(scaleX, scaleY);
    setZoom(Math.min(fillZoom, maxZoom), "center");
    setPan(0, 0);
  }

  // --- Coordinate Mapping ---

  function screenToTransform(screenX: number, screenY: number): { x: number; y: number } {
    const rect = clipContainer.getBoundingClientRect();
    return {
      x: (screenX - rect.left - _panX) / _zoom,
      y: (screenY - rect.top - _panY) / _zoom,
    };
  }

  function transformToScreen(transformX: number, transformY: number): { x: number; y: number } {
    const rect = clipContainer.getBoundingClientRect();
    return {
      x: transformX * _zoom + _panX + rect.left,
      y: transformY * _zoom + _panY + rect.top,
    };
  }

  // --- Element Tracking ---

  function trackElement(el: HTMLElement): void {
    stopTracking();
    _trackingEl = el;

    const update = (): void => {
      if (!_trackingEl) return;
      const elRect = _trackingEl.getBoundingClientRect();
      const cRect = clipContainer.getBoundingClientRect();
      const targetX = cRect.width / 2 - (elRect.left + elRect.width / 2 - cRect.left);
      const targetY = cRect.height / 2 - (elRect.top + elRect.height / 2 - cRect.top);

      _panX += (targetX - _panX) * 0.1;
      _panY += (targetY - _panY) * 0.1;
      _apply(false);

      _trackRAF = requestAnimationFrame(update);
    };

    _trackRAF = requestAnimationFrame(update);
  }

  function stopTracking(): void {
    if (_trackRAF !== null) { cancelAnimationFrame(_trackRAF); _trackRAF = null; }
    _trackingEl = null;
  }

  // --- Event Setup ---

  function _setupEvents(): void {
    // Mouse wheel zoom
    if (wheelEnabled) {
      element.addEventListener("wheel", (e: WheelEvent) => {
        if (!_enabled) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1 - wheelZoomSpeed : 1 + wheelZoomSpeed;
        _zoomAt(_zoom * factor, e.clientX, e.clientY);
      }, { passive: false });
    }

    // Drag to pan
    if (dragPanEnabled) {
      element.style.cursor = cursorGrab;

      element.addEventListener("mousedown", (e: MouseEvent) => {
        if (!_enabled || e.button !== 0) return;
        _isDragging = true;
        _dragStart = { x: e.clientX, y: e.clientY, panX: _panX, panY: _panY };
        _lastMoveTime = performance.now();
        _velocity = { x: 0, y: 0 };
        element.style.cursor = cursorGrabbing;
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e: MouseEvent) => {
        if (!_isDragging || !_enabled) return;
        const now = performance.now();
        const dt = now - _lastMoveTime;
        _panX = _dragStart.panX + (e.clientX - _dragStart.x);
        _panY = _dragStart.panY + (e.clientY - _dragStart.y);

        // Track velocity for inertia
        if (dt > 0) {
          _velocity = {
            x: (e.clientX - _dragStart.x - (_panX - _dragStart.panX)) / dt,
            y: (e.clientY - _dragStart.y - (_panY - _dragStart.panY)) / dt,
          };
        }
        _lastMoveTime = now;

        _apply(false);
        onPanChange?.(_panX, _panY);
      });

      document.addEventListener("mouseup", () => {
        if (!_isDragging) return;
        _isDragging = false;
        element.style.cursor = _enabled ? cursorGrab : "";

        // Start inertia
        if (inertia && (Math.abs(_velocity.x) > 0.01 || Math.abs(_velocity.y) > 0.01)) {
          _startInertia();
        }
      });
    }

    // Touch pinch zoom
    if (pinchZoomEnabled) {
      element.addEventListener("touchstart", (e: TouchEvent) => {
        if (e.touches.length === 2) {
          _pinchStartDist = _getTouchDistance(e.touches);
          _pinchStartZoom = _zoom;
        }

        // Double tap detection
        if (e.touches.length === 1) {
          const now = Date.now();
          if (now - _lastTapTime < 300 && doubleTapReset) {
            if (_zoom > initialZoom * 1.1 || (doubleTapZoomLevel > 0 && _zoom > initialZoom)) {
              reset(true);
            } else {
              const targetZoom = doubleTapZoomLevel > 0 ? doubleTapZoomLevel : maxZoom;
              setZoom(targetZoom, "center");
            }
          }
          _lastTapTime = now;
        }
      }, { passive: true });

      element.addEventListener("touchmove", (e: TouchEvent) => {
        if (!_enabled) return;
        if (e.touches.length === 2) {
          e.preventDefault();
          const dist = _getTouchDistance(e.touches);
          const scale = dist / _pinchStartDist;
          _zoomAt(_pinchStartZoom * scale);
        } else if (e.touches.length === 1 && dragPanEnabled) {
          const t = e.touches[0];
          if (_touchStartTime === 0) _touchStartTime = Date.now();
          _panX += (t.clientX - (_lastMoveX ?? t.clientX));
          _panY += (t.clientY - (_lastMoveY ?? t.clientY));
          _lastMoveX = t.clientX;
          _lastMoveY = t.clientY;
          _apply(false);
        }
      }, { passive: false });

      element.addEventListener("touchend", () => {
        _touchStartTime = 0;
        _lastMoveX = undefined;
        _lastMoveY = undefined;
      }, { passive: true });
    }

    let _lastMoveX: number | undefined;
    let _lastMoveY: number | undefined;
  }

  let _inertiaVel = { x: 0, y: 0 };

  function _startInertia(): void {
    _inertiaVel = { ..._velocity };

    const tick = (): void => {
      _panX += _inertiaVel.x * 16;
      _panY += _inertiaVel.y * 16;
      _inertiaVel.x *= inertiaFriction;
      _inertiaVel.y *= inertiaFriction;

      _apply(false);

      if (Math.abs(_inertiaVel.x) > 0.01 || Math.abs(_inertiaVel.y) > 0.01) {
        _inertiaRAF = requestAnimationFrame(tick);
      } else {
        _inertiaRAF = null;
      }
    };

    _inertiaRAF = requestAnimationFrame(tick);
  }

  function _getTouchDistance(touches: TouchList): number {
    const dx = touches[0]!.clientX - touches[1]!.clientX;
    const dy = touches[0]!.clientY - touches[1]!.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --- Public API ---

  function getState(): ZoomPanState {
    return { zoom: _zoom, x: _panX, y: _panY, animating: _animating };
  }

  function setEnabled(enabled: boolean): void {
    _enabled = enabled;
    element.style.cursor = enabled && dragPanEnabled ? cursorGrab : "";
    if (!enabled) { _isDragging = false; stopTracking(); }
  }

  function destroy(): void {
    stopTracking();
    if (_inertiaRAF !== null) { cancelAnimationFrame(_inertiaRAF); _inertiaRAF = null; }
    _removeListeners();
    element.style.transform = "";
    element.style.transition = "";
    element.style.cursor = "";
    element.style.willChange = "";
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // --- Init ---
  _setupEvents();
  _apply(false);

  return {
    el: element,
    getState,
    setZoom,
    setPan,
    setTransform,
    zoomIn,
    zoomOut,
    reset,
    animateTo,
    fit,
    fill,
    screenToTransform,
    transformToScreen,
    trackElement,
    stopTracking,
    setEnabled,
    destroy,
  };
}
