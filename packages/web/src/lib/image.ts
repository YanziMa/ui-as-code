/**
 * Image processing and optimization utilities.
 */

/** Get image dimensions from a URL (without loading full image) */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };

    // For blob URLs, use directly
    if (url.startsWith("blob:")) {
      img.src = url;
    } else {
      // Use fetch to get as blob for CORS handling
      fetch(url)
        .then((res) => res.blob())
        .then((blob) => {
          img.src = URL.createObjectURL(blob);
        })
        .catch(reject);
    }
  });
}

/** Generate a responsive srcset string */
export function generateSrcSet(
  baseUrl: string,
  widths: number[],
  options?: { format?: "webp" | "avif" | "jpg" | "png" },
): string {
  const { format = "webp" } = options ?? {};

  return widths
    .map((w) => {
      const url = baseUrl.replace(/\.(jpe?g|png|webp|avif)$/i, `.${format}`);
      return `${url} ${w}w`;
    })
    .join(", ");
}

/** Generate a sizes attribute for responsive images */
export function generateSizes(breakpoints: Array<{ maxWidth: string; size: string }>): string {
  return breakpoints.map(({ maxWidth, size }) => `(max-width: ${maxWidth}) ${size}`).concat("100vw").join(", ");
}

/** Calculate aspect ratio from dimensions */
export function getAspectRatio(width: number, height: number): string {
  const gcdVal = gcd(width, height);
  return `${width / gcdVal}:${height / gcdVal}`;
}

/** Calculate optimal display dimensions maintaining aspect ratio */
export function fitToContainer(
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number,
  mode: "contain" | "cover" = "contain",
): { width: number; height: number; offsetX: number; offsetY: number } {
  const imgRatio = imgWidth / imgHeight;
  const containerRatio = containerWidth / containerHeight;

  let width: number, height: number;

  if (
    (mode === "contain" && imgRatio > containerRatio) ||
    (mode === "cover" && imgRatio <= containerRatio)
  ) {
    width = containerWidth;
    height = containerWidth / imgRatio;
  } else {
    height = containerHeight;
    width = containerHeight * imgRatio;
  }

  const offsetX = (containerWidth - width) / 2;
  const offsetY = (containerHeight - height) / 2;

  return { width, height, offsetX, offsetY };
}

/** Generate placeholder blur data URL (tiny base64 image) */
export function generateBlurPlaceholder(
  width = 8,
  height = 8,
  color = "#e5e7eb",
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
}

/** Check if an image URL is valid */
export async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.startsWith("image/");
  } catch {
    return false;
  }
}

/** Get dominant color of an image (simplified — uses canvas sampling) */
export async function getDominantColor(
  imageUrl: string,
): Promise<{ r: number; g: number; b: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      // Sample at small size for performance
      const sampleSize = 10;
      canvas.width = sampleSize;
      canvas.height = sampleSize;

      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < imageData.length; i += 4) {
        r += imageData[i]!;
        g += imageData[i + 1]!;
        b += imageData[i + 2]!;
        count++;
      }

      resolve({
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
      });

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => reject(new Error("Failed to load image"));

    fetch(imageUrl)
      .then((res) => res.blob())
      .then((blob) => { img.src = URL.createObjectURL(blob); })
      .catch(reject);
  });
}

/** GCD helper for aspect ratio calculation */
function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));

  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return a || 1;
}

/** Convert file to base64 data URL */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));

    reader.readAsDataURL(file);
  });
}

/** Resize an image using canvas */
export function resizeImage(
  source: HTMLImageElement | HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number,
  quality = 0.92,
): string {
  let { width, height } = source;

  // Scale down if needed
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width *= ratio;
    height *= ratio;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", quality);
}
