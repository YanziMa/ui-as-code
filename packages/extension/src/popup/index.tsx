import { useState } from "react"

function IndexPopup() {
  const [apiUrl, setApiUrl] = useState("http://localhost:3000")
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await chrome.storage.local.set({ apiUrl })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ width: 320, padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
        UI-as-Code
      </h2>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        Alt+Click any element to inspect and modify it.
      </p>

      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
        API Server URL
      </label>
      <input
        type="text"
        value={apiUrl}
        onChange={(e) => setApiUrl(e.target.value)}
        style={{
          width: "100%",
          padding: "6px 8px",
          border: "1px solid #ddd",
          borderRadius: 6,
          fontSize: 13,
          marginBottom: 8,
          boxSizing: "border-box",
        }}
      />
      <button
        onClick={handleSave}
        style={{
          width: "100%",
          padding: "8px 0",
          backgroundColor: saved ? "#16a34a" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  )
}

export default IndexPopup
