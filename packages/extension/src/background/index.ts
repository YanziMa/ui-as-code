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

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GENERATE_DIFF") {
    handleGenerateDiff(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true // async response
  }

  if (message.type === "ADOPT_DIFF") {
    handleAdoptDiff(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.type === "REJECT_DIFF") {
    handleRejectDiff(message.payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true
  }
})

async function handleGenerateDiff(payload: {
  componentCode: string
  componentTypes?: string
  description: string
  screenshotBase64?: string
}) {
  const apiUrl = await getApiUrl()

  // AI calls can take up to 60s
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
