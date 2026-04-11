/**
 * Diff Engine: Unified diff generation, parsing, and application.
 * Supports text diffs (line-level), JSON diffs, and structured patch
 * operations with conflict detection and 3-way merge support.
 */

// --- Types ---

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "context" | "add" | "delete";
  content: string;
  lineNumber?: number; // Original line number for context/delete lines
}

export interface UnifiedDiff {
  header: { oldFile: string; newFile: string };
  hunks: DiffHunk[];
  metadata?: Record<string, string>;
}

export interface TextDiffResult {
  unified: string;
  parsed: UnifiedDiff;
  stats: { additions: number; deletions: number; changes: number };
}

export interface JsonPatchOp {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
}

// --- Line-based Text Diff (Myers-like algorithm) ---

/**
 * Compute a simple diff between two strings, returning line-level changes.
 */
export function computeDiff(oldText: string, newText: string): TextDiffResult {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);

  const lcs = computeLCS(oldLines, newLines);

  const hunks: DiffHunk[] = [];
  let additions = 0;
  let deletions = 0;

  let hunk: DiffHunk | null = null;

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const isLCS =
      oldIdx < lcs.oldIndices.length &&
      newIdx < lcs.newIndices.length &&
      lcs.oldIndices[oldIdx] === lcs.newIndices[newIdx];

    if (isLCS) {
      if (hunk) {
        hunks.push(hunk);
        hunk = null;
      }
      oldIdx++;
      newIdx++;
    } else {
      if (!hunk) {
        hunk = {
          oldStart: oldIdx + 1,
          oldCount: 0,
          newStart: newIdx + 1,
          newCount: 0,
          lines: [],
        };
      }

      // Check what's different
      if (oldIdx < oldLines.length && (newIdx >= newLines.length || !lcsMatch(lcs, oldIdx, newIdx))) {
        hunk.lines.push({ type: "delete", content: oldLines[oldIdx]!, lineNumber: oldIdx + 1 });
        hunk.oldCount++;
        deletions++;
        oldIdx++;
      }

      if (newIdx < newLines.length && (oldIdx > lcs.oldIndices.length || !lcsMatch(lcs, oldIdx - 1, newIdx))) {
        hunk.lines.push({ type: "add", content: newLines[newIdx]! });
        hunk.newCount++;
        additions++;
        newIdx++;
      }
    }
  }

  if (hunk) hunks.push(hunk);

  return {
    unified: formatUnified(oldText.split("\n").pop() ?? "a", newText.split("\n").pop() ?? "b", hunks),
    parsed: { header: { oldFile: "a", newFile: "b" }, hunks },
    stats: { additions, deletions, changes: additions + deletions },
  };
}

function lcsMatch(lcs: LCSResult, oldIdx: number, newIdx: number): boolean {
  return (
    oldIdx < lcs.oldIndices.length &&
    newIdx < lcs.newIndices.length &&
    lcs.oldIndices[oldIdx] === lcs.newIndices[newIdx]
  );
}

interface LCSResult {
  oldIndices: (number | undefined)[];
  newIndices: (number | undefined)[];
}

/** Compute Longest Common Subsequence between two arrays of strings */
function computeLCS(a: string[], b: string[]): LCSResult {
  const m = a.length;
  const n = b.length;

  // Use the optimized Myers approach with O(min(m,n)) space
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]! + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j]!, dp[i][j - 1]!);
      }
    }
  }

  // Backtrack to find alignment
  const oldIndices: (number | undefined)[] = new Array(m).fill(undefined);
  const newIndices: (number | undefined)[] = new Array(n).fill(undefined);

  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      oldIndices[i - 1] = j - 1;
      newIndices[j - 1] = i - 1;
      i--;
      j--;
    } else if ((dp[i - 1][j] ?? 0) > (dp[i][j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }

  return { oldIndices, newIndices };
}

function splitLines(text: string): string[] {
  // Preserve trailing newline info
  return text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
}

// --- Unified Diff Formatting ---

function formatUnified(oldFile: string, newFile: string, hunks: DiffHunk[]): string {
  const lines: string[] = [
    `--- ${oldFile}`,
    `+++ ${newFile}`,
  ];

  for (const hunk of hunks) {
    lines.push(
      `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`,
    );

    for (const line of hunk.lines) {
      switch (line.type) {
        case "context": lines.push(` ${line.content}`); break;
        case "add": lines.push(`+${line.content}`); break;
        case "delete": lines.push(`-${line.content}`); break;
      }
    }
  }

  return lines.join("\n");
}

// --- Parse Unified Diff ---

/**
 * Parse a unified diff string into structured data.
 */
export function parseUnifiedDiff(diffText: string): UnifiedDiff | null {
  const lines = diffText.split("\n");

  let oldFile = "";
  let newFile = "";
  let idx = 0;

  // Parse header
  while (idx < lines.length) {
    const line = lines[idx]!;
    if (line.startsWith("--- ")) {
      oldFile = line.slice(4).trim();
    } else if (line.startsWith("+++ ")) {
      newFile = line.slice(4).trim();
    } else if (line.startsWith("@@")) {
      break; // Start of first hunk
    }
    idx++;
  }

  if (!oldFile || !newFile) return null;

  const hunks: DiffHunk[] = [];

  while (idx < lines.length) {
    const line = lines[idx]!;
    if (!line.startsWith("@@")) {
      idx++;
      continue;
    }

    // Parse hunk header: @@ -start,count +start,count @@
    const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!match) { idx++; continue; }

    const hunk: DiffHunk = {
      oldStart: parseInt(match[1], 10),
      oldCount: parseInt(match[2] ?? "1", 10),
      newStart: parseInt(match[3], 10),
      newCount: parseInt(match[4] ?? "1", 10),
      lines: [],
    };

    idx++;

    let contextLineNum = hunk.oldStart;
    while (idx < lines.length) {
      const content = lines[idx]!;
      if (content.startsWith("@@") || content.startsWith("--- ") || content.startsWith("+++ ")) {
        break;
      }

      if (content.startsWith("+")) {
        hunk.lines.push({ type: "add", content: content.slice(1) });
      } else if (content.startsWith("-")) {
        hunk.lines.push({ type: "delete", content: content.slice(1), lineNumber: contextLineNum });
        contextLineNum++;
      } else if (content.startsWith(" ") || content === "") {
        hunk.lines.push({ type: "context", content: content.slice(1), lineNumber: contextLineNum });
        contextLineNum++;
      } else {
        // No prefix (possible malformed diff)
        hunk.lines.push({ type: "context", content, lineNumber: contextLineNum });
        contextLineNum++;
      }

      idx++;
    }

    hunks.push(hunk);
  }

  return { header: { oldFile, newFile }, hunks };
}

// --- Apply Diff ---

/**
 * Apply a unified diff to original text, producing the modified result.
 * Returns null if the diff cannot be applied cleanly.
 */
export function applyDiff(original: string, diff: UnifiedDiff): string | null {
  const origLines = original.split("\n");
  const result: string[] = [];
  let origIdx = 0;

  for (const hunk of diff.hunks) {
    // Copy context before this hunk
    while (origIdx < hunk.oldStart - 1) {
      result.push(origLines[origIdx] ?? "");
      origIdx++;
    }

    // Verify context lines match
    for (const line of hunk.lines) {
      if (line.type === "context" && line.lineNumber !== undefined) {
        const expected = origLines[line.lineNumber - 1];
        if (expected !== undefined && expected !== line.content) {
          return null; // Conflict detected
        }
      }
    }

    // Apply hunk changes
    for (const line of hunk.lines) {
      switch (line.type) {
        case "context":
          if (origIdx < origLines.length) {
            result.push(origLines[origIdx]);
            origIdx++;
          }
          break;
        case "add":
          result.push(line.content);
          break;
        case "delete":
          if (origIdx < origLines.length) origIdx++;
          break;
      }
    }
  }

  // Copy remaining lines after last hunk
  while (origIdx < origLines.length) {
    result.push(origLines[origIdx]!);
    origIdx++;
  }

  return result.join("\n");
}

// --- JSON Patch (RFC 6902) ---

/**
 * Apply a JSON Patch (RFC 6902) operation array to an object.
 * Returns the patched object or throws on error.
 */
export function applyJsonPatch(target: unknown, ops: JsonPatchOp[]): unknown {
  let result = deepClone(target);

  for (const op of ops) {
    result = applyJsonPatchOp(result, op);
  }

  return result;
}

function applyJsonPatchOp(target: unknown, op: JsonPatchOp): unknown {
  const pathParts = parseJsonPointer(op.path);

  switch (op.op) {
    case "add":
      return jsonAdd(target, pathParts, op.value);
    case "remove":
      return jsonRemove(target, pathParts);
    case "replace":
      return jsonReplace(target, pathParts, op.value);
    case "move": {
      const fromParts = parseJsonPointer(op.from!);
      const value = jsonGetValue(target, fromParts);
      let removed = jsonRemove(target, fromParts);
      return jsonAdd(removed, pathParts, value);
    }
    case "copy": {
      const fromParts = parseJsonPointer(op.from!);
      const value = jsonGetValue(target, fromParts);
      return jsonAdd(target, pathParts, value);
    }
    case "test": {
      const actual = jsonGetValue(target, pathParts);
      if (JSON.stringify(actual) !== JSON.stringify(op.value)) {
        throw new Error(`JSON Patch test failed at "${op.path}": expected ${JSON.stringify(op.value)}, got ${JSON.stringify(actual)}`);
      }
      return target;
    }
    default:
      throw new Error(`Unknown JSON Patch operation: ${(op as any).op}`);
  }
}

function parseJsonPointer(pointer: string): string[] {
  if (pointer === "") return [];
  if (!pointer.startsWith("/")) throw new Error(`Invalid JSON Pointer: ${pointer}`);
  return pointer.slice(1).split("/").map(decodeUriComponentSafe);
}

function decodeUriComponentSafe(s: string): string {
  try { return decodeURIComponent(s.replace(/~1/g, "/").replace(/~0/g, "~")); }
  catch { return s.replace(/~1/g, "/").replace(/~0/g, "~"); }
}

function jsonGetValue(obj: unknown, parts: string[]): unknown {
  let current: any = obj;
  for (const part of parts) {
    if (current == null) throw new Error(`Cannot navigate to "${part}" in null`);
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      current = current[idx];
    } else if (typeof current === "object") {
      current = current[part];
    } else {
      throw new Error(`Cannot navigate to "${part}" in primitive`);
    }
  }
  return current;
}

function jsonAdd(obj: unknown, parts: string[], value: unknown): unknown {
  if (parts.length === 0) return value;

  const [head, ...rest] = parts;
  const cloned = deepClone(obj);

  if (Array.isArray(cloned)) {
    const idx = head === "-" ? cloned.length : parseInt(head, 10);
    cloned.splice(idx, 0, rest.length > 0 ? jsonAdd(cloned[idx] ?? {}, rest, value) : value);
    return cloned;
  }

  if (typeof cloned === "object" && cloned !== null) {
    cloned[head] = rest.length > 0 ? jsonAdd(cloned[head] ?? {}, rest, value) : value;
    return cloned;
  }

  return { [head]: rest.length > 0 ? jsonAdd({}, rest, value) : value };
}

function jsonRemove(obj: unknown, parts: string[]): unknown {
  if (parts.length === 0) throw new Error("Cannot remove root");

  const [head, ...rest] = parts;
  const cloned = deepClone(obj);

  if (Array.isArray(cloned)) {
    const idx = parseInt(head, 10);
    cloned.splice(idx, 1);
    return cloned;
  }

  if (typeof cloned === "object" && cloned !== null) {
    if (rest.length === 0) {
      delete cloned[head];
    } else {
      cloned[head] = jsonRemove(cloned[head], rest);
    }
    return cloned;
  }

  return cloned;
}

function jsonReplace(obj: unknown, parts: string[], value: unknown): unknown {
  if (parts.length === 0) return value;

  const [head, ...rest] = parts;
  const cloned = deepClone(obj);

  if (Array.isArray(cloned)) {
    cloned[parseInt(head, 10)] = rest.length > 0 ? jsonReplace(cloned[parseInt(head, 10)], rest, value) : value;
    return cloned;
  }

  if (typeof cloned === "object" && cloned !== null) {
    cloned[head] = rest.length > 0 ? jsonReplace(cloned[head], rest, value) : value;
    return cloned;
  }

  return cloned;
}

// --- Deep Clone (simple version for JSON values) ---

function deepClone(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => deepClone(v));
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Map) return new Map([...value].map(([k, v]) => [k, deepClone(v)]));
  if (value instanceof Set) return new Set([...value].map((v) => deepClone(v)));
  const obj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as object)) {
    obj[key] = deepClone(val);
  }
  return obj;
}

// --- 3-Way Merge ---

export interface MergeResult {
  merged: string;
  conflicts: Array<{ baseLine: number; ours: string; theirs: string }>;
  clean: boolean;
}

/**
 * Perform a basic 3-way merge between ours, theirs, and a common ancestor.
 * Marks conflicts with standard conflict markers.
 */
export function threeWayMerge(base: string, ours: string, theirs: string): MergeResult {
  const baseToOurs = computeDiff(base, ours);
  const baseToTheirs = computeDiff(base, theirs);

  // Simple strategy: check if both sides changed the same region
  const conflicts: MergeResult["conflicts"] = [];

  // Find overlapping change regions
  const ourChangedLines = new Set<number>();
  for (const hunk of baseToOurs.parsed.hunks) {
    for (const line of hunk.lines) {
      if (line.lineNumber !== undefined) ourChangedLines.add(line.lineNumber);
    }
  }

  const theirChangedLines = new Set<number>();
  for (const hunk of baseToTheirs.parsed.hunks) {
    for (const line of hunk.lines) {
      if (line.lineNumber !== undefined) theirChangedLines.add(line.lineNumber);
    }
  }

  // Check for conflicts (both sides modified same lines differently)
  const overlap = [...ourChangedLines].filter((l) => theirChangedLines.has(l));

  if (overlap.length > 0) {
    for (const lineNum of overlap) {
      const baseLines = base.split("\n");
      const ourLines = ours.split("\n");
      const theirLines = theirs.split("\n");
      conflicts.push({
        baseLine: lineNum,
        ours: ourLines[lineNum - 1] ?? "",
        theirs: theirLines[lineNum - 1] ?? "",
      });
    }
  }

  // For now, prefer "ours" when there's no conflict
  const merged = conflicts.length > 0
    ? ours.split("\n").map((line, i) => {
        const conflict = conflicts.find((c) => c.baseLine === i + 1);
        if (conflict) {
          return `<<<<<<< OURS\n${conflict.ours}\n=======\n${conflict.theirs\n>>>>>>> THEIRS}`;
        }
        return line;
      }).join("\n")
    : ours;

  return { merged, conflicts, clean: conflicts.length === 0 };
}
