import { useState, useEffect } from "react"

function IndexPopup() {
  const [apiUrl, setApiUrl] = useState("https://ui-as-code-web.vercel.app")
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "ok" | "fail">("checking")
  const [stats, setStats] = useState<{ prs: number; frictions: number } | null>(null)

  useEffect(() => {
    chrome.storage.local.get("apiUrl", (result) => {
      if (result.apiUrl) setApiUrl(result.apiUrl)
    })
    checkConnection()
    fetchStats()
  }, [])

  async function checkConnection() {
    setConnectionStatus("checking")
    try {
      const stored = await chrome.storage.local.get("apiUrl")
      const url = stored.apiUrl || "https://ui-as-code-web.vercel.app"
      const res = await fetch(`${url}/api/health`)
      setConnectionStatus(res.ok ? "ok" : "fail")
    } catch {
      setConnectionStatus("fail")
    }
  }

  async function fetchStats() {
    try {
      const stored = await chrome.storage.local.get("apiUrl")
      const url = stored.apiUrl || "https://ui-as-code-web.vercel.app"
      const [prRes, fricRes] = await Promise.all([
        fetch(`${url}/api/pull-requests`).catch(() => null),
        fetch(`${url}/api/frictions`).catch(() => null),
      ])
      const prData = prRes?.ok ? await prRes.json().catch(() => ({ data: [] })) : { data: [] }
      const fricData = fricRes?.ok ? await fricRes.json().catch(() => ({ data: [] })) : { data: [] }
      setStats({
        prs: (prData.data || []).length,
        frictions: (fricData.data || []).length,
      })
    } catch { /* silent */ }
  }

  const handleSave = async () => {
    setStatus("saving")
    try {
      await chrome.storage.local.set({ apiUrl })
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 2000)
      checkConnection()
      fetchStats()
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 2000)
    }
  }

  return (
    <div
      style={{
        width: 320,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            UI
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
              UI-as-Code
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>
              v0.1.0 — Beta
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          margin: "10px 16px 8px",
          padding: "6px 10px",
          borderRadius: 8,
          fontSize: 11,
          background:
            connectionStatus === "ok"
              ? "#f0fdf4"
              : connectionStatus === "fail"
                ? "#fef2f2"
                : "#f9fafb9",
          color:
            connectionStatus === "ok"
              ? "#166534"
              : connectionStatus === "fail"
                ? "#991b1b"
                : "#854d0e",
          border: `1px solid ${
            connectionStatus === "ok"
              ? "#bbf7d0"
              : connectionStatus === "fail"
                ? "#fecaca"
                : "#fde68a"
          }`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background:
              connectionStatus === "ok"
                ? "#22c55e"
                : connectionStatus === "fail"
                  ? "#ef4444"
                  : "#d97706",
            display: "inline-block",
            animation: connectionStatus === "checking" ? "uac-pulse 1s infinite" : undefined,
          }}
        />
        {connectionStatus === "checking"
          ? "Checking..."
          : connectionStatus === "ok"
            ? "Connected"
            : "Server unreachable"}
        {stats && (
          <span style={{ marginLeft: "auto", opacity: 0.6 }}>
            {stats.prs} PRs · {stats.frictions} reports
          </span>
        )}
      </div>

      {/* Instructions */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          padding: "10px 12px",
          marginBottom: 14,
          fontSize: 11.5,
          color: "#1e40af",
          lineHeight: 1.55,
        }}
      >
        <strong>How to use:</strong>
        <br />
        Hold{" "}
        <kbd
          style={{
            background: "#dbeafe",
            padding: "1px 5px",
            borderRadius: 3,
            fontSize: 10.5,
            fontFamily: "monospace",
          }}
        >
          Alt
        </kbd>
        {" "}
        + click any element on a page.
      </div>

      {/* API URL */}
      <label
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 4,
          color: "#374151",
          paddingLeft: 4,
        }}
      >
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
          fontSize: 12,
          boxSizing: "border-box",
          marginBottom: 10,
        }}
        placeholder="https://your-api.vercel.app"
      />

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={status === "saving"}
        style={{
          width: "100%",
          padding: "9px 0",
          backgroundColor:
            status === "saved"
              ? "#16a34a"
              : status === "error"
                ? "#dc2626"
                : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: status === "saving" ? "wait" : "pointer",
          transition: "all 0.15s",
        }}
      >
        {status === "saving"
          ? "Saving..."
          : status === "saved"
            ? "Saved!"
            : status === "error"
              ? "Error — Retry"
              : "Save Settings"}
      </button>

      {/* Links */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid #f3f4f6",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "#9ca3af",
        }}
      >
        <a
          href="https://github.com/YanziMa/ui-as-code"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6b7280", textDecoration: "none" }}
        >
          GitHub
        </a>
        <a
          href="https://vercel.com/yanzi-mas-projects/ui-as-code-web"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#6b7280", textDecoration: "none" }}
        >
          Dashboard
        </a>
        <button
          onClick={() => {
            checkConnection()
            fetchStats()
          }}
          style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontSize: 11 }}
        >
          Refresh
        </button>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 8,
          textAlign: "center",
          fontSize: 9.5,
          color: "#d1d5db",
        }}
      >
        Made with ♥ by UI-as-Code Team
      </div>

      <style>{`
        @keyframes uac-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

export default IndexPopup
