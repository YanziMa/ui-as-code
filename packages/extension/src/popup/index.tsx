import { useState, useEffect } from "react"

function IndexPopup() {
  const [apiUrl, setApiUrl] = useState("https://ui-as-code-web.vercel.app")
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle")

  useEffect(() => {
    chrome.storage.local.get("apiUrl", (result) => {
      if (result.apiUrl) setApiUrl(result.apiUrl)
    })
  }, [])

  const handleSave = async () => {
    setStatus("saving")
    await chrome.storage.local.set({ apiUrl })
    setStatus("saved")
    setTimeout(() => setStatus("idle"), 2000)
  }

  return (
    <div
      style={{
        width: 320,
        padding: 20,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: "#fff",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "linear-gradient(135deg, #2563eb, #3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          UI
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>
            UI-as-Code
          </div>
          <div style={{ fontSize: 11, color: "#888" }}>v0.1.0</div>
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          fontSize: 12,
          color: "#0369a1",
          lineHeight: 1.5,
        }}
      >
        <strong>How to use:</strong>
        <br />
        Hold <kbd style={{ background: "#e0e7ff", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>
          Alt
        </kbd>{" "}
        + click any element on a page to start modifying it.
      </div>

      {/* API URL */}
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" }}>
        API Server URL
      </label>
      <input
        type="text"
        value={apiUrl}
        onChange={(e) => setApiUrl(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontSize: 13,
          boxSizing: "border-box",
          marginBottom: 10,
        }}
        placeholder="https://your-api.vercel.app"
      />

      <button
        onClick={handleSave}
        disabled={status === "saving"}
        style={{
          width: "100%",
          padding: "9px 0",
          backgroundColor: status === "saved" ? "#16a34a" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: status === "saving" ? "wait" : "pointer",
          transition: "all 0.15s",
        }}
      >
        {status === "saving" ? "Saving..." : status === "saved" ? "Saved!" : "Save Settings"}
      </button>

      {/* Links */}
      <div style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: "#9ca3af" }}>
        <a
          href="https://github.com/YanziMa/ui-as-code"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6b7280", textDecoration: "none" }}
        >
          GitHub
        </a>{" "}
        ·{" "}
        <a
          href="https://vercel.com/yanzi-mas-projects/ui-as-code-web"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6b7280", textDecoration: "none" }}
        >
          Dashboard
        </a>
      </div>
    </div>
  )
}

export default IndexPopup
