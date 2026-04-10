export {}

console.log("[UI-as-Code] Background service worker loaded")

// Cache API URL to avoid repeated storage reads
let cachedApiUrl: string | null = null

async function getApiUrl(): Promise<string> {
  if (cachedApiUrl) return cachedApiUrl
  const result = await chrome.storage.local.get("apiUrl")
  cachedApiUrl = result.apiUrl || "https://ui-as-code-web.vercel.app"
  return cachedApiUrl!
}

/** Invalidate cached API URL (call after settings save) */
export function invalidateApiCache(): void {
  cachedApiUrl = null
}

// ========== Request timeout wrapper ==========
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 30_000
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`)
    }
    throw err
  }
}

// ========== User-friendly error messages ==========
function formatApiError(status: number, body: string): string {
  try {
    const json = JSON.parse(body)
    if (json.error) return json.error
  } catch { /* not JSON */ }

  switch (status) {
    case 400:
      return "Invalid request. Please check your input."
    case 401:
      return "Authentication required. Please sign in first."
    case 422:
      return "The request data was invalid. Try rephrasing your description."
    case 429:
      return "Too many requests. Please wait a moment and try again."
    case 500:
    case 502:
    case 503:
      return "Server is temporarily unavailable. Please try again later."
    default:
      return `Server error (${status}). Please try again.`
  }
}

// ========== Message type constants ==========
const MESSAGE_TYPES = {
  GENERATE_DIFF: "GENERATE_DIFF",
  ADOPT_DIFF: "ADOPT_DIFF",
  REJECT_DIFF: "REJECT_DIFF",
} as const

// ========== Logging helper ==========
function bgLog(action: string, detail?: string): void {
  console.log(`[Background] ${action}${detail ? ` — ${detail}` : ""}`)
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = message?.type as string

  switch (type) {
    case MESSAGE_TYPES.GENERATE_DIFF:
      bgLog("GENERATE_DIFF received")
      handleGenerateDiff(message.payload)
        .then((result) => { bgLog("GENERATE_DIFF success"); sendResponse(result) })
        .catch((err) => { bgLog("GENERATE_DIFF error", err.message); sendResponse({ success: false, error: err.message }) })
      return true // async response

    case MESSAGE_TYPES.ADOPT_DIFF:
      bgLog("ADOPT_DIFF received")
      handleAdoptDiff(message.payload)
        .then((result) => { bgLog("ADOPT_DIFF success"); sendResponse(result) })
        .catch((err) => { bgLog("ADOPT_DIFF error", err.message); sendResponse({ success: false, error: err.message }) })
      return true

    case MESSAGE_TYPES.REJECT_DIFF:
      bgLog("REJECT_DIFF received")
      handleRejectDiff(message.payload)
        .then((result) => { bgLog("REJECT_DIFF success"); sendResponse(result) })
        .catch((err) => { bgLog("REJECT_DIFF error", err.message); sendResponse({ success: false, error: err.message }) })
      return true

    default:
      bgLog("Unknown message type", type)
      sendResponse({ success: false, error: `Unknown message type: ${type}` })
      return false
  }
})

async function handleGenerateDiff(payload: {
  componentCode: string
  componentTypes?: string
  description: string
  screenshotBase64?: string
}) {
  const apiUrl = await getApiUrl()

  // AI calls can take up to 90s
  const res = await fetchWithTimeout(`${apiUrl}/api/generate-diff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      component_code: payload.componentCode,
      component_types: payload.componentTypes,
      description: payload.description,
      screenshot_base64: payload.screenshotBase64,
    }),
  }, 90_000)

  if (!res.ok) {
    const errorText = await res.text().catch(() => "")
    throw new Error(formatApiError(res.status, errorText))
  }

  const data = await res.json()
  return { success: true, data }
}

async function handleAdoptDiff(payload: {
  diffId: string
  description: string
  saasName: string
  componentName: string
}) {
  const apiUrl = await getApiUrl()

  // Create friction record + PR in parallel
  const [fricRes, prRes] = await Promise.all([
    fetchWithTimeout(`${apiUrl}/api/frictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saas_name: payload.saasName,
        component_name: payload.componentName,
        description: payload.description,
      }),
    }, 15_000),
    fetchWithTimeout(`${apiUrl}/api/pull-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diff_id: payload.diffId,
        description: payload.description,
        saas_name: payload.saasName,
        component_name: payload.componentName,
      }),
    }, 15_000),
  ])

  if (!fricRes.ok || !prRes.ok) {
    const fricError = fricRes.ok ? "" : `friction(${fricRes.status})`
    const prError = prRes.ok ? "" : `PR(${prRes.status})`
    const details = [fricError, prError].filter(Boolean).join(", ")
    throw new Error(`Failed to submit (${details})`)
  }

  const prData = await prRes.json()
  return { success: true, pr: prData.data }
}

async function handleRejectDiff(payload: {
  saasName: string
  componentName: string
  description: string
}) {
  const apiUrl = await getApiUrl()

  const res = await fetchWithTimeout(`${apiUrl}/api/frictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      saas_name: payload.saasName,
      component_name: payload.componentName,
      description: payload.description,
    }),
  }, 15_000)

  if (!res.ok) {
    const errorText = await res.text().catch(() => "")
    throw new Error(formatApiError(res.status, errorText))
  }

  return { success: true }
}
