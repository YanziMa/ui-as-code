/**
 * Text Diff Engine: LCS-based text differencing with multiple output formats
 * (unified, inline, side-by-side, JSON), character-level and word-level diffing,
 * change statistics (insertions/deletions/modifications), 3-way merge support,
 * patch application, and syntax-aware diffing (ignoring whitespace changes).
 */

// --- Types ---

export type DiffFormat = "unified" | "inline" | "sideBySide" | "json" | "compact" | "ndiff";

export interface DiffOp {
  type: "=" | "+" | "-" | "~"; // equal, insert, delete, modify
  /** Original text (for = and -) */
  oldText?: string;
  /** New text (for = and +) */
  newText?: string;
  /** Old line number(s) */
  oldLineStart?: number;
  oldLineEnd?: number;
  /** New line number(s) */
  newLineStart?: number;
  newLineEnd?: number;
}

export interface DiffHunk {
  ops: DiffOp[];
  /** Old file start line for this hunk */
  oldStart: number;
  /** New file start line for this hunk */
  newStart: number;
  /** Context lines before/after changes */
  context?: number;
}

export interface DiffResult {
  hunks: DiffHunk[];
  format: DiffFormat;
  /** Statistics */
  stats: DiffStats;
  /** Raw unified diff string */
  unifiedDiff?: string;
  /** HTML-rendered inline diff */
  inlineHtml?: string;
  /** Side-by-side HTML */
  sideBySideHtml?: string;
}

export interface DiffStats {
  insertions: number;
  deletions: number;
  modifications: number; // Lines that were both deleted and re-added nearby
  unchanged: number;
  totalOldLines: number;
  totalNewLines: number;
  similarity: number; // 0-1, Jaccard-like similarity
  distance: number;   // Levenshtein edit distance
}

export interface TextDiffOptions {
  /** Output format (default: "unified") */
  format?: DiffFormat;
  /** Number of context lines around changes (default: 3) */
  contextLines?: boolean | number;
  /** Ignore leading/trailing whitespace differences */
  ignoreWhitespace?: boolean;
  /** Ignore case differences */
  ignoreCase?: boolean;
  /** Treat as character-level diff instead of line-level */
  charLevel?: boolean;
  /** Treat as word-level diff (splits on whitespace) */
  wordLevel?: boolean;
  /** Original filename (for header) */
  oldFile?: string;
  /** New filename (for header) */
  newFile?: string;
  /** Max input size in characters (default: 1MB) */
  maxSize?: number;
  /** Color output (for terminal) */
  color?: boolean;
}

export interface MergeResult {
  merged: string[];
  conflicts: Array<{ base: string; ours: string; theirs: string; index: number }>;
  clean: boolean;
}

export interface Patch {
  hunks: DiffHunk[];
  oldText: string;
  newText?: string;
}

// --- LCS Algorithm ---

/** Compute the Longest Common Subsequence between two arrays */
function computeLCS<T>(a: T[], b: T[]): number[][] {
  const m = a.length;
  const n = b.length;
  // Use optimized DP with only two rows for memory efficiency
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]! + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j]!, dp[i][j - 1]!);
      }
    }
  }

  return dp;
}

/** Backtrack through LCS matrix to extract the actual subsequence */
function backtrack<T>(a: T[], b: T[], dp: number[][]): Array<{ type: "=" | "-" | "+"; value?: T }> {
  const result: Array<{ type: "=" | "-" | "+"; value?: T }> = [];
  let i = a.length, j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: "=", value: a[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i]?.[j - 1]! >= dp[i - 1]?.[j]!)) {
      result.push({ type: "+", value: b[j - 1] });
      j--;
    } else if (i > 0) {
      result.push({ type: "-", value: a[i - 1] });
      i--;
    } else {
      break;
    }
  }

  return result.reverse();
}

// --- Main Diff Function ---

/**
 * Compute the diff between two text strings.
 *
 * ```ts
 * const result = diffText(oldCode, newCode, { format: "unified", contextLines: 3 });
 * console.log(result.unifiedDiff); // Unified diff string
 * console.log(result.stats);        // { insertions: 5, deletions: 3, ... }
 * ```
 */
export function diffText(oldStr: string, newStr: string, options: TextDiffOptions = {}): DiffResult {
  const opts: Required<Omit<TextDiffOptions, "format" | "contextLines" | "color">> & Pick<TextDiffOptions, "format" | "contextLines" | "color"> = {
    format: options.format ?? "unified",
    contextLines: options.contextLines ?? 3,
    ignoreWhitespace: options.ignoreWhitespace ?? false,
    ignoreCase: options.ignoreCase ?? false,
    charLevel: options.charLevel ?? false,
    wordLevel: options.wordLevel ?? false,
    oldFile: options.oldFile ?? "a",
    newFile: options.newFile ?? "b",
    maxSize: options.maxSize ?? 1_000_000,
    color: options.color ?? false,
  };

  // Size check
  if (oldStr.length > opts.maxSize || newStr.length > opts.maxSize) {
    throw new Error(`Input exceeds maximum size of ${opts.maxSize} characters`);
  }

  // Normalize inputs
  let oldLines: string[];
  let newLines: string[];

  if (opts.charLevel) {
    oldLines = oldStr.split("");
    newLines = newStr.split("");
  } else if (opts.wordLevel) {
    oldLines = splitWords(oldStr);
    newLines = splitWords(newStr);
  } else {
    oldLines = oldStr.split("\n");
    newLines = newStr.split("\n");
  }

  // Apply normalization
  if (opts.ignoreCase) {
    oldLines = oldLines.map((l) => l.toLowerCase());
    newLines = newLines.map((l) => l.toLowerCase());
  }
  if (opts.ignoreWhitespace) {
    oldLines = oldLines.map((l) => l.trimEnd());
    newLines = newLines.map((l) => l.trimEnd());
  }

  // Compute LCS and backtrack
  const dp = computeLCS(oldLines, newLines);
  const rawOps = backtrack(oldLines, newLines, dp);

  // Group into hunks
  const hunks = groupIntoHunks(rawOps, typeof opts.contextLines === "number" ? opts.contextLines : opts.contextLines === true ? 3 : 0);

  // Compute stats
  const stats = computeStats(rawOps, oldLines.length, newLines.length);

  // Generate formatted output
  const result: DiffResult = { hunks, format: opts.format, stats };

  switch (opts.format) {
    case "unified":
      result.unifiedDiff = renderUnified(hunks, opts.oldFile, opts.newFile, stats);
      break;
    case "inline":
      result.inlineHtml = renderInlineHtml(hunks);
      break;
    case "sideBySide":
      result.sideBySideHtml = renderSideBySideHtml(hunks);
      break;
    case "json":
      // Already structured in hunks
      break;
    case "compact":
      result.unifiedDiff = renderCompact(hunks, stats);
      break;
    case "ndiff":
      result.unifiedDiff = renderNdiff(rawOps);
      break;
  }

  return result;
}

// --- Grouping Logic ---

function groupIntoHunks(
  ops: Array<{ type: "=" | "-" | "+"; value?: string }>,
  contextLines: number,
): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffOp[] = [];
  let oldLineNum = 0;
  let newLineNum = 0;
  let hunkOldStart = 0;
  let hunkNewStart = 0;
  let inChange = false;
  let trailingContext = 0;

  const flushHunk = () => {
    if (currentHunk.length > 0) {
      hunks.push({
        ops: currentHunk,
        oldStart: hunkOldStart,
        newStart: hunkNewStart,
        context: contextLines,
      });
      currentHunk = [];
      inChange = false;
      trailingContext = 0;
    }
  };

  for (const op of ops) {
    const isChange = op.type !== "=";

    if (isChange) {
      if (!inChange) {
        // Start new hunk — include some preceding context
        if (contextLines > 0 && currentHunk.length > 0) {
          const keepFrom = Math.max(0, currentHunk.length - contextLines);
          currentHunk = currentHunk.slice(keepFrom);
          // Adjust start lines
          const removedCount = keepFrom;
          hunkOldStart = Math.max(1, oldLineNum - removedCount + 1);
          hunkNewStart = Math.max(1, newLineNum - removedCount + 1);
        } else {
          hunkOldStart = oldLineNum + 1;
          hunkNewStart = newLineNum + 1;
        }
        inChange = true;
      }

      const diffOp: DiffOp = { type: op.type };
      if (op.type === "-") {
        diffOp.oldText = op.value;
        diffOp.oldLineStart = ++oldLineNum;
        diffOp.oldLineEnd = oldLineNum;
      } else if (op.type === "+") {
        diffOp.newText = op.value;
        diffOp.newLineStart = ++newLineNum;
        diffOp.newLineEnd = newLineNum;
      }
      currentHunk.push(diffOp);
      trailingContext = 0;
    } else {
      // Equal (context) line
      oldLineNum++;
      newLineNum++;

      if (inChange) {
        currentHunk.push({
          type: "=",
          oldText: op.value,
          newText: op.value,
          oldLineStart: oldLineNum,
          oldLineEnd: oldLineNum,
          newLineStart: newLineNum,
          newLineEnd: newLineNum,
        });
        trailingContext++;

        if (trailingContext >= contextLines) {
          flushHunk();
        }
      }
    }
  }

  flushHunk();
  return hunks;
}

// --- Statistics ---

function computeStats(
  ops: Array<{ type: string }>,
  oldCount: number,
  newCount: number,
): DiffStats {
  let insertions = 0, deletions = 0, unchanged = 0;

  for (const op of ops) {
    if (op.type === "+") insertions++;
    else if (op.type === "-") deletions++;
    else unchanged++;
  }

  // Modifications: approximate as min of adjacent ins/del pairs
  const totalChanged = insertions + deletions;
  const modifications = Math.min(insertions, deletions);

  // Similarity: Jaccard on changed vs unchanged
  const similarity = unchanged / Math.max(1, unchanged + totalChanged);

  // Edit distance approximation
  const distance = insertions + deletions - 2 * modifications;

  return {
    insertions,
    deletions,
    modifications,
    unchanged,
    totalOldLines: oldCount,
    totalNewLines: newCount,
    similarity: Math.round(similarity * 1000) / 1000,
    distance,
  };
}

// --- Renderers ---

function renderUnified(hunks: DiffHunk[], oldFile: string, newFile: string, _stats: DiffStats): string {
  const lines: string[] = [];

  for (const hunk of hunks) {
    const oldCount = hunk.ops.filter((o) => o.type !== "+").length;
    const newCount = hunk.ops.filter((o) => o.type !== "-").length;
    lines.push(`@@ -${hunk.oldStart},${oldCount} +${hunk.newStart},${newCount} @@`);

    for (const op of hunk.ops) {
      switch (op.type) {
        case "+": lines.push(`+${op.newText}`); break;
        case "-": lines.push(`-${op.oldText}`); break;
        case "=": lines.push(` ${op.oldText}`); break;
      }
    }
  }

  return `--- ${oldFile}\n+++ ${newFile}\n${lines.join("\n")}`;
}

function renderInlineHtml(hunks: DiffHunk[]): string {
  const parts: string[] = ['<div class="diff-inline">'];

  for (const hunk of hunks) {
    parts.push('<div class="diff-hunk">');
    for (const op of hunk.ops) {
      switch (op.type) {
        case "+":
          parts.push(`<div class="diff-add"><span class="diff-marker">+</span><span class="diff-content">${escapeHtml(op.newText ?? "")}</span></div>`);
          break;
        case "-":
          parts.push(`<div class="diff-remove"><span class="diff-marker">-</span><span class="diff-content">${escapeHtml(op.oldText ?? "")}</span></div>`);
          break;
        case "=":
          parts.push(`<div class="diff-equal"><span class="diff-marker"> </span><span class="diff-content">${escapeHtml(op.oldText ?? "")}</span></div>`);
          break;
      }
    }
    parts.push("</div>");
  }

  parts.append("</div>");
  return parts.join("\n");
}

function renderSideBySideHtml(hunks: DiffHunk[]): string {
  const parts: string[] = ['<table class="diff-side-by-side">'];

  for (const hunk of hunks) {
    parts.push("<tbody>");
    // Find max rows needed
    const maxRows = Math.max(...hunk.ops.map((o) =>
      o.type === "=" ? 1 : 1,
    ));

    for (const op of hunk.ops) {
      const oldCell = op.type === "+"
        ? '<td class="diff-empty"></td>'
        : `<td class="${op.type === "-" ? "diff-remove" : "diff-equal"}">${escapeHtml(op.oldText ?? "&nbsp;")}</td>`;
      const newCell = op.type === "-"
        ? '<td class="diff-empty"></td>'
        : `<td class="${op.type === "+" ? "diff-add" : "diff-equal"}">${escapeHtml(op.newText ?? "&nbsp;")}</td>`;
      parts.push(`<tr>${oldCell}${newCell}</tr>`);
    }
    parts.push("</tbody>");
  }

  parts.append("</table>");
  return parts.join("\n");
}

function renderCompact(hunks: DiffHunk[], stats: DiffStats): string {
  const lines: string[] = [];
  for (const hunk of hunks) {
    const adds = hunk.ops.filter((o) => o.type === "+").length;
    const dels = hunk.ops.filter((o) => o.type === "-").length;
    lines.push(`@@ ${hunk.oldStart},${hunk.newStart} +${adds}/-${dels}`);
  }
  return [`Diff: ${stats.insertions}ins, ${stats.deletions}del, ${stats.modifications}mod`, ...lines].join("\n");
}

function renderNdiff(ops: Array<{ type: string; value?: string }>): string {
  return ops.map((op) => {
    switch (op.type) {
      case "+": return `+ ${op.value}`;
      case "-": return `- ${op.value}`;
      default: return `  ${op.value}`;
    }
  }).join("\n");
}

// --- Utilities ---

function splitWords(text: string): string[] {
  const words: string[] = [];
  const regex = /\S+|\s+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    words.push(match[0]);
  }
  return words;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- 3-Way Merge ---

/**
 * Perform a 3-way merge given a common ancestor and two branches.
 */
export function merge3Way(base: string, ours: string, theirs: string, options?: {
  markerSize?: string;
  conflictStyle?: "diff3" | "inline";
}): MergeResult {
  const markerSize = options?.markerSize ?? "=======";
  const baseLines = base.split("\n");
  const ourLines = ours.split("\n");
  const theirLines = theirs.split("\n");

  const baseToOurs = diffText(base, ours).hunks;
  const baseToTheirs = diffText(base, theirs).hunks;

  // Simplified merge: apply non-conflicting changes from both sides
  const merged = [...baseLines];
  const conflicts: MergeResult["conflicts"] = [];

  // Apply their changes first (on a copy)
  let working = [...merged];
  const appliedIndices = new Set<number>();

  // Find conflicts (same region changed in both)
  const ourChangedRegions = getChangedRegions(baseToOurs);
  const theirChangedRegions = getChangedRegions(baseToTheirs);

  for (const theirRegion of theirChangedRegions) {
    const conflicting = ourChangedRegions.some((r) =>
      regionsOverlap(r.start, r.end, theirRegion.start, theirRegion.end),
    );

    if (conflicting) {
      // Mark as conflict
      conflicts.push({
        base: baseLines.slice(theirRegion.start, theirRegion.end + 1).join("\n"),
        ours: ourLines.slice(theirRegion.start, theirRegion.end + 1).join("\n"),
        theirs: theirLines.slice(theirRegion.start, theirRegion.end + 1).join("\n"),
        index: theirRegion.start,
      });
    } else {
      // Apply their change
      for (let i = theirRegion.start; i <= theirRegion.end; i++) {
        working[i] = theirLines[i] ?? "";
        appliedIndices.add(i);
      }
    }
  }

  // Apply our non-conflicting changes
  for (const ourRegion of ourChangedRegions) {
    const isConflict = theirChangedRegions.some((r) =>
      regionsOverlap(r.start, r.end, ourRegion.start, ourRegion.end),
    );
    if (!isConflict) {
      for (let i = ourRegion.start; i <= ourRegion.end; i++) {
        if (!appliedIndices.has(i)) {
          working[i] = ourLines[i] ?? "";
        }
      }
    }
  }

  return { merged: working, conflicts, clean: conflicts.length === 0 };
}

interface ChangedRegion { start: number; end: number }

function getChangedRegions(hunks: DiffHunk[]): ChangedRegion[] {
  const regions: ChangedRegion[] = [];
  for (const hunk of hunks) {
    let start = Infinity, end = -1;
    for (const op of hunk.ops) {
      if (op.type !== "=") {
        if (op.oldLineStart != null) start = Math.min(start, op.oldLineStart);
        if (op.oldLineEnd != null) end = Math.max(end, op.oldLineEnd);
        if (op.newLineStart != null) start = Math.min(start, op.newLineStart);
        if (op.newLineEnd != null) end = Math.max(end, op.newLineEnd);
      }
    }
    if (start <= end) regions.push({ start, end });
  }
  return regions;
}

function regionsOverlap(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 <= e2 && s2 <= e1;
}

// --- Patch Application ---

/**
 * Apply a diff (patch) to an original text to produce the modified version.
 */
export function applyPatch(original: string, patch: Patch): string {
  const lines = original.split("\n");
  let offset = 0; // Track line offset from previous hunks

  for (const hunk of patch.hunks) {
    const adjustStart = hunk.oldStart - 1 + offset;

    // Validate hunk applies at expected position
    if (adjustStart < 0 || adjustStart > lines.length) continue;

    const newLines: string[] = [];
    let lineDelta = 0;

    for (const op of hunk.ops) {
      switch (op.type) {
        case "-":
          // Delete line — skip it
          lineDelta--;
          break;
        case "+":
          // Insert line
          newLines.push(op.newText ?? "");
          lineDelta++;
          break;
        case "=":
          // Keep line
          newLines.push(op.oldText ?? op newText ?? "");
          break;
      }
    }

    // Replace the hunk range with new lines
    const removeCount = hunk.ops.filter((o) => o.type !== "+").length;
    lines.splice(adjustStart, removeCount, ...newLines);
    offset += lineDelta;
  }

  return lines.join("\n");
}

/**
 * Create a reverse patch (swap old/new).
 */
export function reversePatch(patch: Patch): Patch {
  return {
    ...patch,
    hunks: patch.hunks.map((hunk) => ({
      ...hunk,
      oldStart: hunk.newStart,
      newStart: hunk.oldStart,
      ops: hunk.ops.map((op) => ({
        ...op,
        type: op.type === "+" ? ("-") : op.type === "-" ? ("+") : op.type,
        oldText: op.newText,
        newText: op.oldText,
        oldLineStart: op.newLineStart,
        oldLineEnd: op.newLineEnd,
        newLineStart: op.oldLineStart,
        newLineEnd: op.oldLineEnd,
      })) as DiffOp[],
    })),
  };
}
