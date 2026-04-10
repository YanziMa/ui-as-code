import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useCallback, useRef } from "react"
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
    width: 400px;
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
  .uac-label-count {
    float: right;
    font-weight: 400;
    color: #9ca3af;
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
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 12px;
    overflow: auto;
    max-height: 350px;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
    color: #c9d1d9;
  }
  .uac-diff-line-add { color: #3fb950; }
  .uac-diff-line-remove { color: #f85149; }
  .uac-diff-line-hunk { color: #58a6ff; font-weight: bold; }
  .uac-diff-line-context { color: #8b949e; }
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
  .uac-btn-adopt:hover:not(:disabled) {
    background: #15803d;
  }
  .uac-btn-adopt:disabled {
    opacity: 0.6;
    cursor: wait;
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
  .uac-btn-reject:hover:not(:disabled) {
    background: #fef2f2;
  }
  .uac-btn-reject:disabled {
    opacity: 0.6;
    cursor: wait;
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
  .uac-error-banner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 12px;
    font-size: 12px;
    color: #991b1b;
    line-height: 1.5;
  }
  .uac-success-banner {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 12px;
    font-size: 12px;
    color: #166534;
    line-height: 1.5;
  }
  .uac-url-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #6b7280;
    background: #f3f4f6;
    padding: 2px 8px;
    border-radius: 4px;
    margin-bottom: 8px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

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

  // Keyboard shortcuts: Enter to submit (step 1), Escape to close
  const generateRef = useRef<() => void>()
  generateRef.current = () => { if (selected && description.trim() && !loading && !diffResult) { /* trigger will be handled below */ } }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Enter / Ctrl+Enter: submit description
      if ((e.key === "Enter" || (e.key === "Enter" && e.ctrlKey)) && selected && !diffResult && !loading) {
        const textarea = document.querySelector(".uac-textarea") as HTMLTextAreaElement
        if (document.activeElement === textarea || !textarea) {
          e.preventDefault()
          // Find and click the generate button
          const btn = document.querySelector(".uac-btn-primary") as HTMLElement
          btn?.click()
        }
      }
      // Escape: go back from diff view
      if (e.key === "Escape" && diffResult) {
        setDiffResult(null)
        setError(null)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [selected, description, loading, diffResult])

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
      } else {
        // Fallback: use element info even without React detection
        const tag = target.tagName.toLowerCase()
        const cls = target.className && typeof target.className === "string"
          ? target.className.split(" ").slice(0, 2).join(".")
          : ""
        const id = target.id ? `#${target.id}` : ""
        const fallbackName = `${tag}${id || (cls ? `.${cls}` : "")}`
        setSelected({
          name: fallbackName,
          element: target as HTMLElement,
          rect: target.getBoundingClientRect(),
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

  const clearMessage = useCallback(() => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current)
  }, [])

  const showMessage = useCallback((msg: string, type: "error" | "success") => {
    clearMessage()
    if (type === "error") {
      setError(msg)
      setSuccessMsg(null)
    } else {
      setSuccessMsg(msg)
      setError(null)
    }
    messageTimeoutRef.current = setTimeout(() => {
      setError(null)
      setSuccessMsg(null)
    }, 5000)
  }, [clearMessage])

  const generateDiff = useCallback(async () => {
    if (!selected || !description.trim()) return

    setLoading(true)
    setError(null)

    try {
      let screenshotBase64: string | undefined
      try {
        screenshotBase64 = await captureScreenshot(selected.rect)
      } catch (_) {}

      // Use Promise-based messaging with timeout
      const response = await new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Request timed out. The AI server might be slow."))
        }, 90_000) // 90s timeout for AI generation

        chrome.runtime.sendMessage(
          {
            type: "GENERATE_DIFF",
            payload: {
              componentCode: selected.element.outerHTML,
              description: description.trim(),
              screenshotBase64,
            },
          },
          (response: any) => {
            clearTimeout(timer)
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            resolve(response)
          }
        )
      })

      if (response?.success && response?.data?.diff) {
        setDiffResult(response.data.diff)
      } else {
        const errMsg = response?.error || response?.data?.error || "Failed to generate diff"
        throw new Error(errMsg)
      }
    } catch (err: any) {
      console.error("[Inspector] Generate diff error:", err)
      showMessage(err.message || "Unknown error occurred", "error")
    } finally {
      setLoading(false)
    }
  }, [selected, description, showMessage])

  const adopt = useCallback(async () => {
    if (!diffResult || !selected) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Request timed out while submitting PR."))
        }, 30_000)

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
          (res: any) => {
            clearTimeout(timer)
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            resolve(res)
          }
        )
      })

      if (response?.success) {
        showMessage("PR submitted successfully!", "success")
        setTimeout(reset, 1500)
      } else {
        throw new Error(response?.error || "Failed to submit PR")
      }
    } catch (err: any) {
      console.error("[Inspector] Adopt error:", err)
      showMessage(err.message || "Failed to submit PR", "error")
    } finally {
      setSubmitting(false)
    }
  }, [diffResult, selected, description, showMessage])

  const reject = useCallback(async () => {
    if (!selected) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error("Request timed out."))
        }, 15_000)

        chrome.runtime.sendMessage(
          {
            type: "REJECT_DIFF",
            payload: {
              saasName: window.location.hostname,
              componentName: selected.name,
              description: description.trim(),
            },
          },
          (res: any) => {
            clearTimeout(timer)
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            resolve(res)
          }
        )
      })

      if (response?.success) {
        showMessage("Feedback recorded. Thanks!", "success")
        setTimeout(reset, 1000)
      } else {
        throw new Error(response?.error || "Failed to record feedback")
      }
    } catch (err: any) {
      console.error("[Inspector] Reject error:", err)
      showMessage(err.message || "Failed to record feedback", "error")
    } finally {
      setSubmitting(false)
    }
  }, [selected, description, showMessage])

  function reset() {
    setSelected(null)
    setDiffResult(null)
    setDescription("")
    setEnabled(false)
    setHoveredRect(null)
    setError(null)
    setSuccessMsg(null)
    setSubmitting(false)
  }

  // Format diff with syntax highlighting
  const highlightedDiff = useMemoHighlight(diffResult)

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
            <button className="uac-close-btn" onClick={reset}>&times;</button>
          </div>

          {/* Body */}
          <div className="uac-body">
            {/* URL badge */}
            <div className="uac-url-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              {window.location.hostname}
            </div>

            {/* Error / Success banners */}
            {error && (
              <div className="uac-error-banner">
                <strong>Error:</strong> {error}
              </div>
            )}
            {successMsg && (
              <div className="uac-success-banner">{successMsg}</div>
            )}

            {!diffResult ? (
              <>
                <span className="uac-step-indicator">
                  <span className="uac-step-dot" /> Step 1 of 2 — Describe your change
                </span>

                <label className="uac-label">
                  What do you want to change?
                  <span className="uac-label-count">{description.length}/2000</span>
                </label>
                <textarea
                  className="uac-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='e.g., "Make the title font larger and change color to dark blue"'
                  autoFocus
                  maxLength={2000}
                />
                <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1.5">
                  <span><kbd className="bg-gray-100 px-1 py-0.5 rounded text-[9px]">Enter</kbd> to submit</span>
                  <span><kbd className="bg-gray-100 px-1 py-0.5 rounded text-[9px]">Esc</kbd> to close</span>
                </div>
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
                    "Generate Preview &rarr;"
                  )}
                </button>

                <p style={{ marginTop: 8, fontSize: 11, color: "#9ca3af", textAlign: "center" }}>
                  AI will analyze this component and generate code changes
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="uac-step-indicator">
                    <span className="uac-step-dot" /> Step 2 of 2 — Review &amp; Submit
                  </span>
                  <button
                    onClick={() => { setDiffResult(null); setError(null); }}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                  >
                    ← Back to edit
                  </button>
                </div>

                <label className="uac-label">Generated Diff</label>
                <div className="uac-diff-viewer">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-zinc-400">{diffResult.split("\n").length} lines</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(diffResult).then(() => {
                          const btn = document.activeElement as HTMLButtonElement;
                          if (btn) {
                            const orig = btn.textContent;
                            btn.textContent = "Copied!";
                            setTimeout(() => { btn.textContent = orig }, 1500);
                          }
                        }).catch(() => {});
                      }}
                      className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-black dark:text-zinc-400 transition-colors"
                      title="Copy diff to clipboard"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <pre
                    className="uac-diff-pre"
                    dangerouslySetInnerHTML={{ __html: highlightedDiff }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {diffResult && (
            <div className="uac-footer">
              <button
                className="uac-btn-adopt"
                onClick={adopt}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "\u2713 Adopt & Submit PR"}
              </button>
              <button
                className="uac-btn-reject"
                onClick={reject}
                disabled={submitting}
              >
                {submitting ? "Recording..." : "\u2715 Reject"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ========== Diff syntax highlighting helper ==========
function useMemoHighlight(diff: string | null): string {
  if (!diff) return ""

  return diff
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^(\+.*)$/gm, '<span class="uac-diff-line-add">$1</span>')
    .replace(/^(-.*)$/gm, '<span class="uac-diff-line-remove">$1</span>')
    .replace(/^(@@.*@@)$/gm, '<span class="uac-diff-line-hunk">$1</span>')
    .replace(/^(\s+)$/gm, '<span class="uac-diff-line-context">$1</span>')
    .replace(/\n/g, "<br>")
}

export default InspectorOverlay
