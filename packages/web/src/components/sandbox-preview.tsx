"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  parseDiff,
  applyDiff,
  extractDiffFromResponse,
  type ParsedDiff,
} from "@/lib/diff-parser";

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
  const [mode, setMode] = useState<"split" | "overlay" | "diff">("split");
  const [parsedDiff, setParsedDiff] = useState<ParsedDiff | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const modifiedHtml = useMemo(() => {
    if (!diff || !originalHtml) return originalHtml;

    // Try to parse and apply diff properly
    try {
      const parsed = parseDiff(diff);
      if (parsed && parsed.hunks.length > 0) {
        setParsedDiff(parsed);
        setParseError(null);
        return applyDiff(originalHtml, parsed);
      }
    } catch (e) {
      setParseError((e as Error).message);
    }

    // Fallback: return original if parsing fails
    return originalHtml;
  }, [originalHtml, diff]);

  const stats = useMemo(() => {
    if (!parsedDiff) return null;
    let additions = 0;
    let removals = 0;
    for (const hunk of parsedDiff.hunks) {
      for (const change of hunk.changes) {
        if (change.type === "add") additions++;
        else if (change.type === "remove") removals++;
      }
    }
    return { additions, removals, hunks: parsedDiff.hunks.length };
  }, [parsedDiff]);

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex gap-2 flex-wrap">
        <ModeButton active={mode === "split"} onClick={() => setMode("split")}>
          Split View
        </ModeButton>
        <ModeButton active={mode === "overlay"} onClick={() => setMode("overlay")}>
          Overlay
        </ModeButton>
        <ModeButton active={mode === "diff"} onClick={() => setMode("diff")}>
          Diff View
        </ModeButton>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-4 rounded-lg bg-zinc-50 px-4 py-2 text-xs dark:bg-zinc-900">
          <span className="text-green-600 dark:text-green-400">
            +{stats.additions} lines added
          </span>
          <span className="text-red-500 dark:text-red-400">
            -{stats.removals} lines removed
          </span>
          <span className="text-zinc-500">
            {stats.hunks} hunk{stats.hunks !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
          Diff parsing warning: {parseError}. Showing raw diff view.
        </div>
      )}

      {/* Preview area */}
      {mode === "diff" ? (
        <DiffView diff={diff} />
      ) : mode === "split" ? (
        <SplitView originalHtml={originalHtml} modifiedHtml={modifiedHtml} />
      ) : (
        <OverlayView originalHtml={originalHtml} modifiedHtml={modifiedHtml} />
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onAdopt}
          className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition-all hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/25 active:scale-[0.98]"
        >
          Adopt & Submit PR
        </button>
        <button
          onClick={onReject}
          className="flex-1 rounded-xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 hover:border-red-300 active:scale-[0.98] dark:bg-black dark:hover:bg-red-950"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

// ========== Sub-components ==========

function ModeButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-blue-600 text-white shadow-md"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
      }`}
    >
      {children}
    </button>
  );
}

function SplitView({
  originalHtml,
  modifiedHtml,
}: {
  originalHtml: string;
  modifiedHtml: string;
}) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-zinc-200 sm:grid-cols-2 dark:border-zinc-800">
      <IframeView label="Original" srcDoc={wrapHtml(originalHtml)} />
      <IframeView label="Modified Preview" srcDoc={wrapHtml(modifiedHtml)} accent />
    </div>
  );
}

function OverlayView({
  originalHtml,
  modifiedHtml,
}: {
  originalHtml: string;
  modifiedHtml: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex justify-between bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
        <span>Overlay Preview</span>
        <span className="text-blue-600">Modified layer on top</span>
      </div>
      <div className="relative h-[450px]">
        <iframe
          srcDoc={wrapHtml(originalHtml)}
          className="absolute inset-0 h-full w-full opacity-30 bg-white"
          sandbox="allow-scripts allow-same-origin"
          title="Original (background)"
        />
        <iframe
          srcDoc={wrapHtml(modifiedHtml)}
          className="absolute inset-0 h-full w-full bg-transparent"
          sandbox="allow-scripts allow-same-origin"
          title="Modified (foreground)"
        />
      </div>
    </div>
  );
}

function DiffView({ diff }: { diff: string }) {
  const highlighted = useMemo(() => highlightDiff(diff), [diff]);

  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden dark:border-zinc-800">
      <div className="bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
        Unified Diff
      </div>
      <pre className="max-h-[500px] overflow-auto bg-zinc-950 p-5 text-xs leading-relaxed overflow-x-auto">
        <code dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}

function IframeView({
  label,
  srcDoc,
  accent,
}: {
  label: string;
  srcDoc: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div
        className={`px-4 py-2 text-xs font-medium ${
          accent
            ? "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
        }`}
      >
        {label}
      </div>
      <iframe
        srcDoc={srcDoc}
        className="h-[450px] w-full bg-white"
        sandbox="allow-scripts allow-same-origin"
        title={label}
      />
    </div>
  );
}

// ========== Helpers ==========

function wrapHtml(html: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:16px;line-height:1.6;color:#1f2937;max-width:800px;margin:auto}</style></head><body>${html}</body></html>`;
}

function highlightDiff(diffText: string): string {
  return diffText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^(\+.*)$/gm, '<span class="text-green-600">$1</span>')
    .replace(/^(-.*)$/gm, '<span class="text-red-500">$1</span>')
    .replace(/^(@@.*@@)$/gm, '<span class="text-blue-500 font-bold">$1</span>')
    .replace(/^(\s+)$/gm, '<span class="text-zinc-400">$1</span>')
    .replace(/\n/g, "<br>");
}
