import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useCallback } from "react"
import { findNearestComponent } from "../lib/react-detector"
import { captureScreenshot } from "../lib/screenshot"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
}

// ========== Styles (injected into page) ==========
const styles = `
  .uac-overlay {
    position: fixed;
    left: 0; top: 0; right: 0; bottom: 0;
    z-index: 2147483646;
    pointer-events: none;
  }
  .uac-highlight {
    position: absolute;
    border: 2px solid rgba(59,130,246,0.85);
    background: rgba(59,130,246,0.08);
    border-radius: 3px;
    pointer-events: none;
    transition: all 0.08s ease-out;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.15);
  }
  .uac-panel {
    position: fixed;
    right: 0;
    top: 0;
    width: 380px;
    height: 100vh;
    background: #fff;
    border-left: 1px solid #e5e7eb;
    box-shadow: -8px 0 32px rgba(0,0,0,0.12);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    animation: uac-slide-in 0.2s ease-out;
  }
  @keyframes uac-slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .uac-header {
    padding: 14px 16px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
  }
  .uac-header h2 {
    font-size: 15px;
    font-weight: 700;
    color: white;
    margin: 0;
  }
  .uac-header .uac-component-name {
    font-size: 11px;
    color: rgba(255,255,255,0.75);
    margin-top: 2px;
    font-family: "SF Mono", Monaco, monospace;
  }
  .uac-close-btn {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: rgba(255,255,255,0.7);
    padding: 4px;
    line-height: 1;
    border-radius: 4px;
    transition: all 0.15s;
  }
  .uac-close-btn:hover {
    color: white;
    background: rgba(255,255,255,0.15);
  }
  .uac-body {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }
  .uac-label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    display: block;
    margin-bottom: 6px;
  }
  .uac-textarea {
    width: 100%;
    height: 90px;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 13px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .uac-textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
  }
  .uac-textarea::placeholder {
    color: #9ca3af;
  }
  .uac-btn-primary {
    width: 100%;
    padding: 11px 0;
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .uac-btn-primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #1d4ed8, #2563eb);
    box-shadow: 0 4px 12px rgba(37,99,235,0.35);
  }
  .uac-btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .uac-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: uac-spin 0.6s linear infinite;
  }
  @keyframes uac-spin {
    to { transform: rotate(360deg); }
  }
  .uac-diff-viewer {
    margin-top: 12px;
  }
  .uac-diff-pre {
    font-size: 11px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    overflow: auto;
    max-height: 350px;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
    color: #1f2937;
  }
  .uac-footer {
    padding: 14px 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 10px;
    background: #fafafa;
  }
  .uac-btn-adopt {
    flex: 1;
    padding: 10px 0;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .uac-btn-adopt:hover {
    background: #15803d;
  }
  .uac-btn-reject {
    flex: 1;
    padding: 10px 0;
    background: white;
    color: #dc2626;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .uac-btn-reject:hover {
    background: #fef2f2;
  }
  .uac-step-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    background: #eff6ff;
    border-radius: 20px;
    font-size: 11px;
    color: #2563eb;
    font-weight: 500;
    margin-bottom: 12px;
  }
  .uac-step-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
`

function InspectorOverlay() {
  const [enabled, setEnabled] = useState(false)
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null)
  const [selected, setSelected] = useState<{
    name: string
    element: HTMLElement
    rect: DOMRect
  } | null>(null)
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [diffResult, setDiffResult] = useState<string | null>(null)

  // Alt key toggle
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === "Alt" && !selected) setEnabled(true)
      if (e.key === "Escape") reset()
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "Alt" && !selected) {
        setEnabled(false)
        setHoveredRect(null)
      }
    }

    document.addEventListener("keydown", onDown)
    document.addEventListener("keyup", onUp)
    return () => {
      document.removeEventListener("keydown", onDown)
      document.removeEventListener("keyup", onUp)
    }
  }, [selected])

  // Hover tracking
  useEffect(() => {
    if (!enabled) return

    const onMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target === document.body || target.closest(".uac-panel")) return
      setHoveredRect(target.getBoundingClientRect())
    }

    const onClick = async (e: MouseEvent) => {
      if (!e.altKey) return
      e.preventDefault()
      e.stopPropagation()

      const target = e.target as HTMLElement
      const component = findNearestComponent(target)

      if (component) {
        setSelected({
          name: component.name,
          element: component.element,
          rect: component.element.getBoundingClientRect(),
        })
        setEnabled(false)
      }
    }

    document.addEventListener("mousemove", onMouseMove, true)
    document.addEventListener("click", onClick, true)
    return () => {
      document.removeEventListener("mousemove", onMouseMove, true)
      document.removeEventListener("click", onClick, true)
    }
  }, [enabled])

  const generateDiff = useCallback(async () => {
    if (!selected || !description.trim()) return

    setLoading(true)
    try {
      let screenshotBase64: string | undefined
      try {
        screenshotBase64 = await captureScreenshot(selected.rect)
      } catch (_) {}

      chrome.runtime.sendMessage(
        {
          type: "GENERATE_DIFF",
          payload: {
            componentCode: selected.element.outerHTML,
            description: description.trim(),
            screenshotBase64,
          },
        },
        (response) => {
          if (response?.success && response.diff) {
            setDiffResult(response.diff)
          } else {
            alert(response?.error || "Failed to generate diff")
          }
          setLoading(false)
        }
      )
    } catch {
      setLoading(false)
    }
  }, [selected, description])

  const adopt = useCallback(async () => {
    if (!diffResult || !selected) return

    chrome.runtime.sendMessage(
      {
        type: "ADOPT_DIFF",
        payload: {
          diffId: crypto.randomUUID(),
          description: description.trim(),
          saasName: window.location.hostname,
          componentName: selected.name,
        },
      },
      () => reset()
    )
  }, [diffResult, selected, description])

  const reject = useCallback(async () => {
    if (!selected) return

    chrome.runtime.sendMessage(
      {
        type: "REJECT_DIFF",
        payload: {
          saasName: window.location.hostname,
          componentName: selected.name,
          description: description.trim(),
        },
      },
      () => reset()
    )
  }, [selected, description])

  function reset() {
    setSelected(null)
    setDiffResult(null)
    setDescription("")
    setEnabled(false)
    setHoveredRect(null)
  }

  // Nothing to render
  if (!enabled && !selected) return null

  return (
    <>
      <style>{styles}</style>

      {/* Hover highlight overlay */}
      {enabled && hoveredRect && (
        <div className="uac-overlay">
          <div
            className="uac-highlight"
            style={{
              left: hoveredRect.left,
              top: hoveredRect.top,
              width: hoveredRect.width,
              height: hoveredRect.height,
            }}
          />
        </div>
      )}

      {/* Side panel */}
      {selected && (
        <div className="uac-panel">
          {/* Header */}
          <div className="uac-header">
            <div>
              <h2>UI-as-Code</h2>
              <div className="uac-component-name">{selected.name}</div>
            </div>
            <button className="uac-close-btn" onClick={reset}>×</button>
          </div>

          {/* Body */}
          <div className="uac-body">
            {!diffResult ? (
              <>
                <span className="uac-step-indicator">
                  <span className="uac-step-dot" /> Step 1 of 2 — Describe your change
                </span>

                <label className="uac-label">What do you want to change?</label>
                <textarea
                  className="uac-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='e.g., "Make the title font larger and change color to dark blue"'
                  autoFocus
                />

                <button
                  className="uac-btn-primary"
                  onClick={generateDiff}
                  disabled={loading || !description.trim()}
                >
                  {loading ? (
                    <>
                      <span className="uac-spinner" />
                      Generating...
                    </>
                  ) : (
                    "Generate Preview →"
                  )}
                </button>

                <p style={{ marginTop: 8, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
                  AI will analyze this component and generate code changes
                </p>
              </>
            ) : (
              <>
                <span className="uac-step-indicator">
                  <span className="uac-step-dot" /> Step 2 of 2 — Review & Submit
                </span>

                <label className="uac-label">Generated Diff</label>
                <div className="uac-diff-viewer">
                  <pre className="uac-diff-pre">{diffResult}</pre>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {diffResult && (
            <div className="uac-footer">
              <button className="uac-btn-adopt" onClick={adopt}>
                ✓ Adopt & Submit PR
              </button>
              <button className="uac-btn-reject" onClick={reject}>
                ✕ Reject
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default InspectorOverlay
