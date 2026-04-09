"use client";

import { useState, useEffect, useRef } from "react";

interface SandboxPreviewProps {
  originalHtml: string;
  diff: string;
  onAdopt: () => void;
  onReject: () => void;
}

export function SandboxPreview({
  originalHtml,
  diff,
  onAdopt,
  onReject,
}: SandboxPreviewProps) {
  const [mode, setMode] = useState<"split" | "overlay">("split");
  const [modifiedHtml, setModifiedHtml] = useState<string>("");
  const originalIframeRef = useRef<HTMLIFrameElement>(null);
  const modifiedIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Apply diff to original HTML to generate modified version
    // For MVP, we show the diff as a code preview with highlighted changes
    // Full HTML patching would require a proper diff parser
    setModifiedHtml(applyDiffToHtml(originalHtml, diff));
  }, [originalHtml, diff]);

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("split")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "split"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          Split View
        </button>
        <button
          onClick={() => setMode("overlay")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "overlay"
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          Overlay
        </button>
      </div>

      {/* Preview area */}
      {mode === "split" ? (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-200 overflow-hidden dark:border-zinc-800">
          <div>
            <div className="bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              Original
            </div>
            <iframe
              ref={originalIframeRef}
              srcDoc={wrapHtml(originalHtml)}
              className="h-[400px] w-full bg-white"
              sandbox="allow-scripts allow-same-origin"
              title="Original"
            />
          </div>
          <div>
            <div className="bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              Modified (Preview)
            </div>
            <iframe
              ref={modifiedIframeRef}
              srcDoc={wrapHtml(modifiedHtml)}
              className="h-[400px] w-full bg-white"
              sandbox="allow-scripts allow-same-origin"
              title="Modified Preview"
            />
          </div>
        </div>
      ) : (
        <div className="relative rounded-xl border border-zinc-200 overflow-hidden dark:border-zinc-800">
          <div className="flex justify-between bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <span>Overlay Preview</span>
            <span className="text-blue-600">Modified on top</span>
          </div>
          <div className="relative h-[400px]">
            <iframe
              ref={originalIframeRef}
              srcDoc={wrapHtml(originalHtml)}
              className="absolute inset-0 h-full w-full opacity-40 bg-white"
              sandbox="allow-scripts allow-same-origin"
              title="Original (background)"
            />
            <iframe
              ref={modifiedIframeRef}
              srcDoc={wrapHtml(modifiedHtml)}
              className="absolute inset-0 h-full w-full bg-transparent"
              sandbox="allow-scripts allow-same-origin"
              title="Modified (foreground)"
            />
          </div>
        </div>
      )}

      {/* Diff code view */}
      <details className="rounded-xl border border-zinc-200 dark:border-zinc-800">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900">
          View Generated Diff Code
        </summary>
        <pre className="max-h-[300px] overflow-auto bg-zinc-950 p-4 text-xs leading-relaxed text-green-400">
          {diff || "(no diff generated)"}
        </pre>
      </details>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onAdopt}
          className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
        >
          Adopt & Submit PR
        </button>
        <button
          onClick={onReject}
          className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

// ========== Helpers ==========

function wrapHtml(html: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;padding:16px}</style></head><body>${html}</body></html>`;
}

function applyDiffToHtml(originalHtml: string, diff: string): string {
  if (!diff) return originalHtml;

  // Simple diff application for MVP:
  // Parse unified diff and apply +/- lines to the HTML
  try {
    const lines = diff.split("\n");
    let result = "";

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        result += line.slice(1);
      } else if (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) {
        // skip headers
      } else if (!line.startsWith("-") || line.startsWith("---")) {
        // keep context lines
        if (!line.startsWith("@@") && !line.startsWith("---") && !line.startsWith("+++")) {
          result += line + "\n";
        }
      }
    }

    return result || originalHtml;
  } catch {
    return originalHtml;
  }
}
