import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useCallback } from "react"
import { findNearestComponent } from "../lib/react-detector"
import { captureScreenshot } from "../lib/screenshot"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
}

interface InspectorState {
  enabled: boolean
  hoveredElement: HTMLElement | null
  selectedComponent: {
    name: string
    element: HTMLElement
    rect: DOMRect
  } | null
}

function InspectorOverlay() {
  const [state, setState] = useState<InspectorState>({
    enabled: false,
    hoveredElement: null,
    selectedComponent: null,
  })
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [diffResult, setDiffResult] = useState<string | null>(null)

  // Toggle inspector with Alt key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt" && !state.selectedComponent) {
        setState((s) => ({ ...s, enabled: true }))
      }
      if (e.key === "Escape") {
        setState({ enabled: false, hoveredElement: null, selectedComponent: null })
        setDiffResult(null)
        setDescription("")
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Alt" && !state.selectedComponent) {
        setState((s) => ({ ...s, enabled: false, hoveredElement: null }))
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("keyup", handleKeyUp)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("keyup", handleKeyUp)
    }
  }, [state.selectedComponent])

  // Hover highlight
  useEffect(() => {
    if (!state.enabled) return

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target === document.body) return
      setState((s) => ({ ...s, hoveredElement: target }))
    }

    const handleClick = async (e: MouseEvent) => {
      if (!e.altKey) return
      e.preventDefault()
      e.stopPropagation()

      const target = e.target as HTMLElement
      const component = findNearestComponent(target)

      if (component) {
        const rect = component.element.getBoundingClientRect()
        setState({
          enabled: false,
          hoveredElement: null,
          selectedComponent: {
            name: component.name,
            element: component.element,
            rect,
          },
        })
      }
    }

    document.addEventListener("mousemove", handleMouseMove, true)
    document.addEventListener("click", handleClick, true)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true)
      document.removeEventListener("click", handleClick, true)
    }
  }, [state.enabled])

  const handleGenerate = useCallback(async () => {
    if (!state.selectedComponent || !description.trim()) return

    setLoading(true)
    try {
      const screenshot = await captureScreenshot(state.selectedComponent.rect)

      chrome.runtime.sendMessage(
        {
          type: "GENERATE_DIFF",
          payload: {
            componentCode: state.selectedComponent.element.outerHTML,
            description: description.trim(),
            screenshotBase64: screenshot,
          },
        },
        (response) => {
          if (response?.success) {
            setDiffResult(response.diff)
          } else {
            setDiffResult(null)
            alert(response?.error || "Failed to generate diff")
          }
          setLoading(false)
        }
      )
    } catch {
      setLoading(false)
    }
  }, [state.selectedComponent, description])

  const handleAdopt = useCallback(async () => {
    if (!diffResult || !state.selectedComponent) return

    chrome.runtime.sendMessage(
      {
        type: "ADOPT_DIFF",
        payload: {
          diffId: crypto.randomUUID(),
          description: description.trim(),
          saasName: window.location.hostname,
          componentName: state.selectedComponent.name,
        },
      },
      () => {
        setState({ enabled: false, hoveredElement: null, selectedComponent: null })
        setDiffResult(null)
        setDescription("")
      }
    )
  }, [diffResult, state.selectedComponent, description])

  const handleReject = useCallback(async () => {
    if (!state.selectedComponent) return

    chrome.runtime.sendMessage(
      {
        type: "REJECT_DIFF",
        payload: {
          saasName: window.location.hostname,
          componentName: state.selectedComponent.name,
          description: description.trim(),
        },
      },
      () => {
        setState({ enabled: false, hoveredElement: null, selectedComponent: null })
        setDiffResult(null)
        setDescription("")
      }
    )
  }, [state.selectedComponent, description])

  // Don't render if nothing to show
  if (!state.enabled && !state.selectedComponent) return null

  return (
    <>
      {/* Hover highlight */}
      {state.enabled && state.hoveredElement && (
        <HighlightOverlay rect={state.hoveredElement.getBoundingClientRect()} />
      )}

      {/* Side panel */}
      {state.selectedComponent && (
        <SidePanel
          componentName={state.selectedComponent.name}
          description={description}
          onDescriptionChange={setDescription}
          onGenerate={handleGenerate}
          onAdopt={handleAdopt}
          onReject={handleReject}
          onClose={() => {
            setState({ enabled: false, hoveredElement: null, selectedComponent: null })
            setDiffResult(null)
            setDescription("")
          }}
          loading={loading}
          diffResult={diffResult}
        />
      )}
    </>
  )
}

function HighlightOverlay({ rect }: { rect: DOMRect }) {
  return (
    <div
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        border: "2px solid rgba(59, 130, 246, 0.8)",
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        pointerEvents: "none",
        zIndex: 2147483647,
        borderRadius: 4,
        transition: "all 0.1s ease",
      }}
    />
  )
}

function SidePanel({
  componentName,
  description,
  onDescriptionChange,
  onGenerate,
  onAdopt,
  onReject,
  onClose,
  loading,
  diffResult,
}: {
  componentName: string
  description: string
  onDescriptionChange: (v: string) => void
  onGenerate: () => void
  onAdopt: () => void
  onReject: () => void
  onClose: () => void
  loading: boolean
  diffResult: string | null
}) {
  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        width: 360,
        height: "100vh",
        backgroundColor: "#fff",
        borderLeft: "1px solid #e5e7eb",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
        zIndex: 2147483646,
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>UI-as-Code</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{componentName}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: 18,
            cursor: "pointer",
            color: "#9ca3af",
          }}
        >
          x
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
        {!diffResult ? (
          <>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              What do you want to change?
            </label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder='e.g. "Make the title font larger and change color to dark blue"'
              style={{
                width: "100%",
                height: 80,
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={onGenerate}
              disabled={loading || !description.trim()}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px 0",
                backgroundColor:
                  loading || !description.trim() ? "#93c5fd" : "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Generating..." : "Generate Preview"}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Generated Diff:
            </div>
            <pre
              style={{
                fontSize: 11,
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 12,
                overflow: "auto",
                maxHeight: 400,
                whiteSpace: "pre-wrap",
              }}
            >
              {diffResult}
            </pre>
          </>
        )}
      </div>

      {/* Footer */}
      {diffResult && (
        <div
          style={{
            padding: 16,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: 8,
          }}
        >
          <button
            onClick={onAdopt}
            style={{
              flex: 1,
              padding: "10px 0",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Adopt & Submit PR
          </button>
          <button
            onClick={onReject}
            style={{
              flex: 1,
              padding: "10px 0",
              backgroundColor: "#fff",
              color: "#dc2626",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}

export default InspectorOverlay
