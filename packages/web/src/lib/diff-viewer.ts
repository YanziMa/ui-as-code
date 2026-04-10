/**
 * Diff viewer and unified/patch formatter: generate colored diffs, render side-by-side
 * or inline diffs, apply patches, generate patch files.
 */

export interface DiffChunk {
  type: "context" | "add" | "remove";
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

export interface DiffResult {
  filePath: string;
  oldContent: string;
  newContent: string;
  chunks: DiffChunk[];
  stats: { additions: number; deletions: number; changes: number };
  header?: string; // @@ -x,y +x,y @@
}

export interface FileDiff {
  path: string;
  status: "added" | "deleted" | "modified" | "renamed";
  additions: number;
  deletions: number;
  binary?: boolean;
  oldPath?: string;
}

// --- Text Diff Algorithm (LCS-based) ---

/** Compute the diff between two strings, returning line-level changes */
export function computeDiff(oldText: string, newText: string, options?: {
  contextLines?: number;
  ignoreWhitespace?: boolean;
}): DiffResult {
  const { contextLines = 3, ignoreWhitespace = false } = options ?? {};

  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const normalize = (s: string) => ignoreWhitespace ? s.trim() : s;

  // Compute LCS using dynamic programming (optimized for memory)
  const lcs = computeLCS(oldLines.map(normalize), newLines.map(normalize));

  // Generate hunks from LCS
  const hunks = generateHunks(oldLines, newLines, lcs, contextLines);

  let additions = 0, deletions = 0;
  for (const hunk of hunks) {
    if (hunk.type === "add") additions++;
    else if (hunk.type === "remove") deletions++;
  }

  return {
    filePath: "",
    oldContent: oldText,
    newContent: newText,
    chunks: hunks,
    stats: { additions, deletions, changes: additions + deletions },
  };
}

/** Compute Longest Common Subsequence between two arrays */
function computeLCS<T>(a: T[], b: T[]): Array<{ type: "equal" | "remove" | "add"; value: T }> {
  const m = a.length, n = b.length;

  // Use optimized DP with only two rows
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  // Backtrack to find the actual sequence
  const result: Array<{ type: "equal" | "remove" | "add"; value: T }> = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "equal", value: a[i - 1]! });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      result.unshift({ type: "add", value: b[j - 1]! });
      j--;
    } else if (i > 0) {
      result.unshift({ type: "remove", value: a[i - 1]! });
      i--;
    } else {
      break;
    }
  }

  return result;
}

function generateHunks(
  oldLines: string[],
  newLines: string[],
  lcs: Array<{ type: "equal" | "remove" | "add"; value: string }>,
  contextLines: number,
): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  let oldIdx = 0, newIdx = 0;
  let inHunk = false;
  let hunkOldStart = 0, hunkNewStart = 0;
  let pendingContext: DiffChunk[] = [];
  let hunkChanges: DiffChunk[] = [];

  function flushHunk(): void {
    if (hunkChanges.length === 0) return;
    // Add leading context
    const leadCtx = pendingContext.splice(0, Math.max(0, pendingContext.length - contextLines));
    chunks.push(...leadCtx);
    chunks.push(...hunkChanges);
    // Keep trailing context in pending
    pendingContext = pendingContext.slice(-contextLines);
    hunkChanges = [];
    inHunk = false;
  }

  for (const item of lcs) {
    switch (item.type) {
      case "equal":
        if (!inHunk) {
          pendingContext.push({
            type: "context",
            content: item.value,
            oldLineNum: ++oldIdx,
            newLineNum: ++newIdx,
          });
          // Limit pending context size
          if (pendingContext.length > contextLines * 2) {
            pendingContext.shift();
          }
        } else {
          hunkChanges.push({
            type: "context",
            content: item.value,
            oldLineNum: ++oldIdx,
            newLineNum: ++newIdx,
          });
          // End hunk after enough context lines
          const ctxInHunk = hunkChanges.filter((c) => c.type === "context").length;
          if (ctxInHunk >= contextLines) flushHunk();
        }
        break;

      case "remove":
        if (!inHunk) {
          inHunk = true;
          hunkOldStart = oldIdx + 1;
          hunkNewStart = newIdx + 1;
        }
        hunkChanges.push({
          type: "remove",
          content: item.value,
          oldLineNum: ++oldIdx,
        });
        break;

      case "add":
        if (!inHunk) {
          inHunk = true;
          hunkOldStart = oldIdx + 1;
          hunkNewStart = newIdx + 1;
        }
        hunkChanges.push({
          type: "add",
          content: item.value,
          newLineNum: ++newIdx,
        });
        break;
    }
  }

  flushHunk();
  // Don't include trailing context as it's not meaningful at EOF

  // Assign line numbers properly
  let oldLine = 0, newLine = 0;
  for (const chunk of chunks) {
    if (chunk.oldLineNum) oldLine = chunk.oldLineNum;
    if (chunk.newLineNum) newLine = chunk.newLineNum;
    if (chunk.type === "remove") chunk.oldLineNum = ++oldLine;
    if (chunk.type === "add") chunk.newLineNum = ++newLine;
    if (chunk.type === "context") { chunk.oldLineNum = ++oldLine; chunk.newLineNum = ++newLine; }
  }

  return chunks;
}

// --- Unified Diff Format ---

/** Generate unified diff format string */
export function toUnifiedDiff(diff: DiffResult, filePath = "file"): string {
  if (diff.chunks.length === 0) return "";

  const lines: string[] = [];
  lines.push(`--- a/${filePath}`);
  lines.push(`+++ b/${filePath}`);

  let currentOldStart = 0, currentNewStart = 0;
  let oldCount = 0, newCount = 0;
  let hunkStartIdx = 0;

  for (let i = 0; i < diff.chunks.length; i++) {
    const chunk = diff.chunks[i]!;

    // Start new hunk
    if (i === 0 || (chunk.type === "context" && i > 0 && diff.chunks[i - 1]?.type === "context")) {
      // Flush previous hunk
      if (i > 0 && (oldCount > 0 || newCount > 0)) {
        lines.push(`@@ -${currentOldStart},${oldCount} +${currentNewStart},${newCount} @@`);
        for (let j = hunkStartIdx; j < i; j++) {
          lines.push(formatUnifiedLine(diff.chunks[j]!));
        }
      }

      currentOldStart = chunk.oldLineNum ?? 0;
      currentNewStart = chunk.newLineNum ?? 0;
      oldCount = 0;
      newCount = 0;
      hunkStartIdx = i;
    }

    switch (chunk.type) {
      case "context": oldCount++; newCount++; break;
      case "remove": oldCount++; break;
      case "add": newCount++; break;
    }
  }

  // Flush last hunk
  if (oldCount > 0 || newCount > 0) {
    lines.push(`@@ -${currentOldStart},${oldCount} +${currentNewStart},${newCount} @@`);
    for (let j = hunkStartIdx; j < diff.chunks.length; j++) {
      lines.push(formatUnifiedLine(diff.chunks[j]!));
    }
  }

  return lines.join("\n");
}

function formatUnifiedLine(chunk: DiffChunk): string {
  switch (chunk.type) {
    case "add": return `+${chunk.content}`;
    case "remove": return `-${chunk.content}`;
    default: return ` ${chunk.content}`;
  }
}

// --- Apply Patch ---

/** Apply a unified diff to original text, returning patched text */
export function applyPatch(originalText: string, unifiedDiff: string): { success: boolean; result: string; error?: string } {
  try {
    const lines = originalText.split("\n");
    const patchLines = unifiedDiff.split("\n");

    let lineIdx = 0; // Current position in original file

    for (const patchLine of patchLines) {
      if (patchLine.startsWith("@@")) {
        // Parse hunk header
        const match = patchLine.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          lineIdx = parseInt(match[1]!, 10) - 1;
        }
        continue;
      }
      if (patchLine.startsWith("---") || patchLine.startsWith("+++")) continue;

      if (patchLine.startsWith("+")) {
        lines.splice(lineIdx, 0, patchLine.slice(1));
        lineIdx++;
      } else if (patchLine.startsWith("-")) {
        lines.splice(lineIdx, 1);
      } else {
        lineIdx++;
      }
    }

    return { success: true, result: lines.join("\n") };
  } catch (error) {
    return { success: false, result: originalText, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// --- Inline Render (HTML) ---

/** Generate HTML for inline (GitHub-style) diff view */
export function renderInlineDiffHtml(chunks: DiffChunk[]): string {
  const lines: string[] = ['<div class="diff-inline">'];

  for (const chunk of chunks) {
    const oldNum = chunk.oldLineNum?.toString().padStart(4, " ") ?? "";
    const newNum = chunk.newLineNum?.toString().padStart(4, " ") ?? "";
    const escaped = escapeHtml(chunk.content);

    switch (chunk.type) {
      case "add":
        lines.push(`<div class="diff-line diff-add"><span class="line-num new">${newNum}</span><span class="line-content">+${escaped}</span></div>`);
        break;
      case "remove":
        lines.push(`<div class="diff-line diff-remove"><span class="line-num old">${oldNum}</span><span class="line-content">-${escaped}</span></div>`);
        break;
      default:
        lines.push(`<div class="diff-line diff-context"><span class="line-num old">${oldNum}</span><span class="line-num new">${newNum}</span><span class="line-content"> ${escaped}</span></div>`);
    }
  }

  lines.push("</div>");
  return lines.join("\n");
}

/** Generate HTML for side-by-side diff view */
export function renderSideBySideDiffHtml(chunks: DiffChunk[]): string {
  const lines: string[] = ['<div class="diff-side-by-side"><div class="diff-side diff-old"><table>'];
  lines.push('<tr><th class="line-header">Old Version</th></tr>');

  for (const chunk of chunks) {
    const num = (chunk.oldLineNum ?? "").toString().padStart(4, " ");
    const escaped = escapeHtml(chunk.content);

    if (chunk.type === "add") {
      lines.push(`<tr class="diff-empty"><td class="line-num">${num}</td><td class="line-content"></td></tr>`);
    } else {
      const cls = chunk.type === "remove" ? "diff-remove" : "diff-context";
      const prefix = chunk.type === "remove" ? "-" : " ";
      lines.push(`<tr class="${cls}"><td class="line-num">${num}</td><td class="line-content">${prefix}${escaped}</td></tr>`);
    }
  }

  lines.push('</table></div><div class="diff-side diff-new"><table>');
  lines.push('<tr><th class="line-header">New Version</th></tr>');

  for (const chunk of chunks) {
    const num = (chunk.newLineNum ?? "").toString().padStart(4, " ");
    const escaped = escapeHtml(chunk.content);

    if (chunk.type === "remove") {
      lines.push(`<tr class="diff-empty"><td class="line-num">${num}</td><td class="line-content"></td></tr>`);
    } else {
      const cls = chunk.type === "add" ? "diff-add" : "diff-context";
      const prefix = chunk.type === "add" ? "+" : " ";
      lines.push(`<tr class="${cls}"><td class="line-num">${num}</td><td class="line-content">${prefix}${escaped}</td></tr>`);
    }
  }

  lines.push("</table></div></div>");
  return lines.join("\n");
}

// --- Word-level Diff ---

/** Compute word-level diff within a changed line for fine-grained highlighting */
export function wordDiff(oldStr: string, newStr: string): Array<{
  type: "equal" | "add" | "remove";
  value: string;
}> {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  return computeLCS(oldWords, newWords);
}

/** Render word-diffed line with intra-line highlighting */
export function renderWordDiffHtml(oldStr: string, newStr: string): { oldHtml: string; newHtml: string } {
  const words = wordDiff(oldStr, newStr);

  let oldHtml = "", newHtml = "";

  for (const w of words) {
    const esc = escapeHtml(w.value);
    switch (w.type) {
      case "remove":
        oldHtml += `<span class="word-remove">${esc}</span>`;
        break;
      case "add":
        newHtml += `<span class="word-add">${esc}</span>`;
        break;
      default:
        oldHtml += esc;
        newHtml += esc;
    }
  }

  return { oldHtml, newHtml };
}

// --- CSS for diff rendering ---

/** Get CSS styles for diff rendering (inject into page) */
export function getDiffStyles(): string {
  return `
.diff-inline, .diff-side-by-side { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 13px; border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow-x: auto; }
.diff-line { display: flex; border-bottom: 1px solid var(--color-border, #f1f5f9); }
.diff-line:hover { background: rgba(99,102,241,0.04); }
.line-num { display: inline-block; width: 50px; text-align: right; padding: 0 8px; color: #94a3b8; user-select: none; flex-shrink: 0; }
.line-content { padding: 0 12px; white-space: pre-wrap; word-break: break-all; flex: 1; }
.diff-add { background: rgba(34,197,94,0.08); }
.diff-add .line-content { color: #16a34a; }
.diff-remove { background: rgba(239,68,68,0.08); }
.diff-remove .line-content { color: #dc2626; }
.diff-context { color: var(--color-text-secondary, #64748b); }
.diff-empty { opacity: 0.3; }
.diff-empty .line-content { min-height: 22px; }
.word-remove { background: rgba(239,68,68,0.25); text-decoration: line-through; }
.word-add { background: rgba(34,197,94,0.25); font-weight: 600; }
.diff-side-by-side { display: grid; grid-template-columns: 1fr 1fr; }
.diff-side { overflow: hidden; }
.diff-side table { width: 100%; border-collapse: collapse; }
.line-header { text-align: center; padding: 8px; background: var(--color-surface, #f8fafc); font-weight: 600; color: var(--color-text, #1e293b); border-bottom: 2px solid var(--color-border, #e2e8f0); }
.diff-side td { padding: 2px 8px; vertical-align: top; }
`;
}

// --- Utilities ---

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Calculate similarity percentage between two texts (0-1) */
export function textSimilarity(a: string, b: string): number {
  const diff = computeDiff(a, b);
  const total = diff.stats.additions + diff.stats.deletions;
  const maxLen = Math.max(a.split("\n").length, b.split("\n").length);
  if (maxLen === 0) return 1;
  return 1 - (total / maxLen);
}

/** Get a summary stat string like "+42 -17" */
export function formatDiffStats(additions: number, deletions: number): string {
  const parts: string[] = [];
  if (additions > 0) parts.push(`+${additions}`);
  if (deletions > 0) parts.push(`-${deletions}`);
  return parts.length > 0 ? parts.join(" ") : "no changes";
}
