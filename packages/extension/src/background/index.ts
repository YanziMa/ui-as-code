export {}

console.log("UI-as-Code background service worker loaded")

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_DIFF") {
    // Forward to API
    handleGenerateDiff(message.payload).then(sendResponse)
    return true // async response
  }

  if (message.type === "ADOPT_DIFF") {
    handleAdoptDiff(message.payload).then(sendResponse)
    return true
  }

  if (message.type === "REJECT_DIFF") {
    handleRejectDiff(message.payload).then(sendResponse)
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
  return res.json()
}

async function handleAdoptDiff(payload: {
  diffId: string
  description: string
  saasName: string
  componentName: string
}) {
  const apiUrl = await getApiUrl()

  // Create friction record
  await fetch(`${apiUrl}/api/frictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      saas_name: payload.saasName,
      component_name: payload.componentName,
      description: payload.description,
    }),
  })

  // Create PR
  const res = await fetch(`${apiUrl}/api/pull-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diff_id: payload.diffId,
      description: payload.description,
    }),
  })
  return res.json()
}

async function handleRejectDiff(payload: {
  saasName: string
  componentName: string
  description: string
}) {
  const apiUrl = await getApiUrl()
  const res = await fetch(`${apiUrl}/api/frictions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      saas_name: payload.saasName,
      component_name: payload.componentName,
      description: payload.description,
    }),
  })
  return res.json()
}

async function getApiUrl(): Promise<string> {
  const result = await chrome.storage.local.get("apiUrl")
  return result.apiUrl || "http://localhost:3000"
}
