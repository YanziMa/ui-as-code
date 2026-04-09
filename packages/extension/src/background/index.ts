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

  try {
    const res = await fetch(`${apiUrl}/api/generate-diff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component_code: payload.componentCode,
        component_types: payload.componentTypes,
        description: payload.description,
        screenshot_base64: payload.screenshotBase64,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`API returned ${res.status}: ${errorText}`)
    }

    const data = await res.json()
    return data
  } catch (err) {
    console.error("[UI-as-Code] Generate diff failed:", err)
    throw err
  }
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
    fetch(`${apiUrl}/api/frictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saas_name: payload.saasName,
        component_name: payload.componentName,
        description: payload.description,
      }),
    }),
    fetch(`${apiUrl}/api/pull-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diff_id: payload.diffId,
        description: payload.description,
        saas_name: payload.saasName,
        component_name: payload.componentName,
      }),
    }),
  ])

  if (!fricRes.ok || !prRes.ok) {
    throw new Error(`Failed to submit PR (${fricRes.status}/${prRes.status})`)
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

  // Record as friction only (for analytics)
  const res = await fetch(`${apiUrl}/api/frictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      saas_name: payload.saasName,
      component_name: payload.componentName,
      description: payload.description,
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to record rejection (${res.status})`)
  }

  return { success: true }
}
