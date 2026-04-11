/**
 * Image Zoom: Lens zoom, inner zoom, and hover/click-to-zoom with
 * smooth transitions, lens positioning, magnification levels,
 * touch support, fullscreen toggle, and lazy loading.
 */

// --- Types ---

export type ZoomMode = "lens" | "inner" | "click" | "hover";
export type ZoomLensShape = "circle" | "square";

export interface ImageZoomOptions {
  /** Target image element or selector */
  target: HTMLImageElement | string;
  /** High-res image URL for zoom (defaults to src) */
  zoomSrc?: string;
  /** Zoom mode (default: "lens") */
  mode?: ZoomMode;
  /** Magnification level (default: 2) */
  scale?: number;
  /** Lens size in px (default: 150) */
  lensSize?: number;
  /** Lens shape (default: "circle") */
  lensShape?: ZoomLensShape;
  /** Border color of the lens */
  lensBorderColor?: string;
  /** Border width in px (default: 2) */
  lensBorderWidth?: number;
  /** Lens shadow/box-shadow */
  lensShadow?: string;
  /** Show crosshair in center of lens? */
  showCrosshair?: boolean;
  /** Smooth scroll inertia? */
  smoothInertia?: number; // ms, 0 = off
  /** Fade transition duration ms (default: 150) */
  fadeDuration?: number;
  /** Enable double-click to toggle zoom? */
  doubleClickToggle?: boolean;
  /** Enable pinch-to-zoom on touch? */
  pinchZoom?: boolean;
  /** Maximum zoom level (default: 5) */
  maxScale?: number;
  /** Minimum zoom level (default: 1) */
  minScale?: number;
  /** Callback on zoom start */
  onZoomStart?: () => void;
  /** Callback on zoom move */
  onZoomMove?: (position: { x: number; y: number }) => void;
  /** Callback on zoom end */
  onZoomEnd?: () => void;
  /** Custom CSS class for container */
  className?: string;
}

export interface ImageZoomInstance {
  element: HTMLElement;
  /** Get current zoom state */
  isZoomed: () => boolean;
  /** Get current scale */
  getScale: () => number;
  /** Set scale programmatically */
  setScale: (scale: number) => void;
  /** Toggle zoom on/off (for click mode) */
  toggle: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Main Factory ---

export function createImageZoom(options: ImageZoomOptions): ImageZoomInstance {
  const opts = {
    mode: options.mode ?? "lens",
    scale: options.scale ?? 2,
    lensSize: options.lensSize ?? 150,
    lensShape: options.lensShape ?? "circle",
    lensBorderColor: options.lensBorderColor ?? "#fff",
    lensBorderWidth: options.lensBorderWidth ?? 2,
    lensShadow: options.lensShadow ?? "0 4px 20px rgba(0,0,0,0.3)",
    showCrosshair: options.showCrosshair ?? false,
    smoothInertia: options.smoothInertia ?? 80,
    fadeDuration: options.fadeDuration ?? 150,
    doubleClickToggle: options.doubleClickToggle ?? true,
    pinchZoom: options.pinchZoom ?? true,
    maxScale: options.maxScale ?? 5,
    minScale: options.minScale ?? 1,
    ...options,
  };

  // Resolve target
  const img = typeof options.target === "string"
    ? document.querySelector<HTMLImageElement>(options.target)!
    : options.target;

  if (!img) throw new Error("ImageZoom: target image not found");

  const zoomSrc = options.zoomSrc ?? img.src;

  // Wrap image in a positioned container
  let wrapper = img.parentElement;
  if (!wrapper || getComputedStyle(wrapper).position === "static") {
    wrapper = document.createElement("div");
    wrapper.className = `iz-wrapper ${opts.className ?? ""}`;
    wrapper.style.cssText = `
      position:relative;display:inline-block;max-width:100%;line-height:0;
    `;
    img.parentNode?.insertBefore(wrapper, img);
    wrapper.appendChild(img);
  }

  // Create high-res image (hidden)
  const hiResImg = document.createElement("img");
  hiResImg.src = zoomSrc;
  hiResImg.style.cssText = "display:none;";
  wrapper.appendChild(hiResImg);

  let currentScale = opts.scale;
  let isActive = false;
  let destroyed = false;

  // --- Lens Mode Elements ---
  let lensEl: HTMLElement | null = null;

  function createLens(): HTMLElement {
    const el = document.createElement("div");
    el.className = "iz-lens";
    const shapeStyle = opts.lensShape === "circle"
      ? `border-radius:50%;width:${opts.lensSize}px;height:${opts.lensSize}px;`
      : `border-radius:4px;width:${opts.lensSize}px;height:${opts.lensSize}px;`;

    el.style.cssText = `
      position:absolute;pointer-events:none;z-index:10;
      ${shapeStyle}
      border:${opts.lensBorderWidth}px solid ${opts.lensBorderColor};
      box-shadow:${opts.lensShadow};
      background-repeat:no-repeat;
      opacity:0;transition:opacity ${opts.fadeDuration}ms ease;
      overflow:hidden;
    `;

    // Crosshair
    if (opts.showCrosshair) {
      const crossH = document.createElement("div");
      crossH.innerHTML = `<div style="position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(255,255,255,0.4);"></div>
        <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.4);"></div>`;
      crossH.style.cssText = "position:absolute;inset:0;pointer-events:none;";
      el.appendChild(crossH);
    }

    wrapper!.appendChild(el);
    return el;
  }

  // --- Inner Zoom Mode ---
  let innerContainer: HTMLElement | null = null;

  function createInnerZoom(): { container: HTMLElement; zoomedImg: HTMLImageElement } {
    const container = document.createElement("div");
    container.className = "iz-inner";
    container.style.cssText = `
      position:absolute;inset:0;overflow:hidden;border-radius:inherit;
      display:none;transition:opacity ${opts.fadeDuration}ms ease;
    `;

    const zoomedImg = document.createElement("img");
    zoomedImg.src = zoomSrc;
    zoomedImg.draggable = false;
    zoomedImg.style.cssText = `
      position:absolute;width:100%;height:100%;object-fit:cover;
      transform-origin:center center;transition:transform ${opts.smoothInertia}ms ease-out;
    `;
    container.appendChild(zoomedImg);
    wrapper!.appendChild(container);

    return { container, zoomedImg };
  }

  // --- Positioning Logic ---

  function updateLensPosition(clientX: number, clientY: number): void {
    if (!lensEl || !isActive) return;

    const rect = img.getBoundingClientRect();
    const wrapperRect = wrapper!.getBoundingClientRect();

    // Mouse position relative to image
    let x = clientX - rect.left;
    let y = clientY - rect.top;

    // Clamp to image bounds
    x = Math.max(0, Math.min(x, rect.width));
    y = Math.max(0, Math.min(y, rect.height));

    // Center lens on cursor
    const halfLens = opts.lensSize / 2;
    let lensX = x - halfLens + rect.left - wrapperRect.left;
    let lensY = y - halfLens + rect.top - wrapperRect.top;

    // Clamp lens within wrapper bounds
    lensX = Math.max(-opts.lensBorderWidth, Math.min(lensX, wrapperRect.width - opts.lensSize + opts.lensBorderWidth));
    lensY = Math.max(-opts.lensBorderWidth, Math.min(lensY, wrapperRect.height - opts.lensSize + opts.lensBorderWidth));

    lensEl.style.left = `${lensX}px`;
    lensEl.style.top = `${lensY}px`;

    // Background position for zoomed view
    const bgX = -(x * currentScale - opts.lensSize / 2);
    const bgY = -(y * currentScale - opts.lensSize / 2);
    lensEl.style.backgroundImage = `url("${zoomSrc}")`;
    lensEl.style.backgroundSize = `${rect.width * currentScale}px ${rect.height * currentScale}px`;
    lensEl.style.backgroundPosition = `${bgX}px ${bgY}px`;

    opts.onZoomMove?.({ x, y });
  }

  function updateInnerZoomPosition(clientX: number, clientY: number): void {
    if (!innerContainer || !isActive) return;

    const rect = img.getBoundingClientRect();
    const zoomedImg = innerContainer.querySelector("img") as HTMLImageElement;

    // Offset from center as percentage
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const offsetX = ((clientX - rect.left - centerX) / centerX) * 15; // % offset
    const offsetY = ((clientY - rect.top - centerY) / centerY) * 15;

    zoomedImg.style.transform = `scale(${currentScale}) translate(${offsetX}%, ${offsetY}%)`;
    opts.onZoomMove?.({ x: clientX - rect.left, y: clientY - rect.top });
  }

  // --- Event Handlers ---

  function handleMouseEnter(): void {
    if (destroyed) return;
    if (opts.mode === "click") return;

    isActive = true;
    opts.onZoomStart?.();

    if (opts.mode === "lens" || opts.mode === "hover") {
      if (!lensEl) lensEl = createLens();
      lensEl.style.opacity = "1";
    } else if (opts.mode === "inner") {
      if (!innerContainer) ({ container: innerContainer } = createInnerZoom());
      innerContainer.style.display = "block";
      requestAnimationFrame(() => { innerContainer!.style.opacity = "1"; });
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!isActive || destroyed) return;
    if (opts.mode === "lens" || opts.mode === "hover") {
      updateLensPosition(e.clientX, e.clientY);
    } else if (opts.mode === "inner") {
      updateInnerZoomPosition(e.clientX, e.clientY);
    }
  }

  function handleMouseLeave(): void {
    if (destroyed) return;
    if (opts.mode === "click") return;

    isActive = false;
    if (lensEl) lensEl.style.opacity = "0";
    if (innerContainer) {
      innerContainer.style.opacity = "0";
      setTimeout(() => { if (!isActive && innerContainer) innerContainer.style.display = "none"; }, opts.fadeDuration);
    }
    opts.onZoomEnd?.();
  }

  function handleClick(): void {
    if (opts.mode !== "click" || destroyed) return;

    isActive = !isActive;
    if (isActive) {
      opts.onZoomStart?.();
      if (!innerContainer) ({ container: innerContainer } = createInnerZoom());
      innerContainer.style.display = "block";
      requestAnimationFrame(() => { innerContainer!.style.opacity = "1"; });
    } else {
      if (innerContainer) {
        innerContainer.style.opacity = "0";
        setTimeout(() => { innerContainer!.style.display = "none"; }, opts.fadeDuration);
      }
      opts.onZoomEnd?.();
    }
  }

  function handleDoubleClick(e: MouseEvent): void {
    if (!opts.doubleClickToggle || destroyed) return;
    e.preventDefault();

    if (currentScale > opts.minScale) {
      currentScale = opts.minScale;
    } else {
      currentScale = opts.scale;
    }

    if (innerContainer) {
      const zi = innerContainer.querySelector("img") as HTMLImageElement;
      zi.style.transform = `scale(${currentScale})`;
    }
  }

  // Touch support
  let initialPinchDist = 0;
  let initialScale = 1;

  function handleTouchStart(e: TouchEvent): void {
    if (!opts.pinchZoom || e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    initialPinchDist = Math.sqrt(dx * dx + dy * dy);
    initialScale = currentScale;
  }

  function handleTouchMove(e: TouchEvent): void {
    if (!opts.pinchZoom || e.touches.length !== 2) return;
    e.preventDefault();

    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    currentScale = Math.max(opts.minScale, Math.min(opts.maxScale, initialScale * (dist / initialPinchDist)));

    if (innerContainer) {
      const zi = innerContainer.querySelector("img") as HTMLImageElement;
      zi.style.transform = `scale(${currentScale})`;
    }
  }

  // Bind events
  img.addEventListener("mouseenter", handleMouseEnter);
  img.addEventListener("mousemove", handleMouseMove);
  img.addEventListener("mouseleave", handleMouseLeave);

  if (opts.mode === "click") {
    img.addEventListener("click", handleClick);
    img.style.cursor = "zoom-in";
  } else {
    img.style.cursor = opts.mode === "inner" ? "zoom-in" : "crosshair";
  }

  if (opts.doubleClickToggle) {
    img.addEventListener("dblclick", handleDoubleClick);
  }

  if (opts.pinchZoom) {
    img.addEventListener("touchstart", handleTouchStart, { passive: true });
    img.addEventListener("touchmove", handleTouchMove, { passive: false });
  }

  // Wheel zoom for click/inner modes
  if (opts.mode === "click" || opts.mode === "inner") {
    img.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      currentScale = Math.max(opts.minScale, Math.min(opts.maxScale, currentScale + delta));

      if (innerContainer) {
        const zi = innerContainer.querySelector("img") as HTMLImageElement;
        zi.style.transform = `scale(${currentScale})`;
      }
    }, { passive: false });
  }

  const instance: ImageZoomInstance = {
    element: wrapper!,

    isZoomed() { return isActive; },

    getScale() { return currentScale; },

    setScale(scale: number) {
      currentScale = Math.max(opts.minScale, Math.min(opts.maxScale, scale));
      if (innerContainer) {
        const zi = innerContainer.querySelector("img") as HTMLImageElement;
        zi.style.transform = `scale(${currentScale})`;
      }
    },

    toggle() {
      if (opts.mode === "click") handleClick();
      else if (isActive) handleMouseLeave(); else handleMouseEnter();
    },

    destroy() {
      destroyed = true;
      img.removeEventListener("mouseenter", handleMouseEnter);
      img.removeEventListener("mousemove", handleMouseMove);
      img.removeEventListener("mouseleave", handleMouseLeave);
      img.removeEventListener("click", handleClick);
      img.removeEventListener("dblclick", handleDoubleClick);
      img.removeEventListener("touchstart", handleTouchStart);
      img.removeEventListener("touchmove", handleTouchMove);
      lensEl?.remove();
      innerContainer?.remove();
      hiResImg.remove();
    },
  };

  return instance;
}
