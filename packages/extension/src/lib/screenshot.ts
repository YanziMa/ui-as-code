/**
 * Capture a screenshot of a specific area using chrome.tabs API.
 * Falls back to full-page capture if area-specific capture isn't available.
 */
export async function captureScreenshot(rect?: DOMRect): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return null

    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: "png",
    })

    // If we have a rect, crop the image using canvas
    if (rect && tab.width && tab.height) {
      return cropImage(dataUrl, rect, tab.width, tab.height)
    }

    return dataUrl
  } catch {
    return null
  }
}

function cropImage(
  dataUrl: string,
  rect: DOMRect,
  _tabWidth: number,
  _tabHeight: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")!

      // Use devicePixelRatio for high-DPI screens
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      ctx.drawImage(
        img,
        rect.left * dpr,
        rect.top * dpr,
        rect.width * dpr,
        rect.height * dpr,
        0,
        0,
        canvas.width,
        canvas.height
      )

      resolve(canvas.toDataURL("image/png"))
    }
    img.src = dataUrl
  })
}
