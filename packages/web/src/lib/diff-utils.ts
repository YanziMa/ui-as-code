/**
 * Diff and patch utilities for text comparison and unified diff parsing.
 */

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "context" | "add" | "remove";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

/** Parse a unified diff string into structured data */
export function parseUnifiedDiff(diffText: string): FileDiff[] {
  const files: FileDiff[] = [];
  const lines = diffText.split("\n");
  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // New file header
    if (line.startsWith("diff --git")) {
      if (currentFile) files.push(currentFile);

      const parts = line.split(" ").slice(2);
      const aPath = parts[0]?.replace("a/", "");
      const bPath = parts[1]?.replace("b/", "");

      currentFile = {
        path: bPath ?? "",
        oldPath: aPath !== bPath ? aPath : undefined,
        isNew: false,
        isDeleted: false,
        isRenamed: aPath !== bPath && !!aPath && !!bPath,
        hunks: [],
        additions: 0,
        deletions: 0,
      };
      currentHunk = null;
    }

    // Index line (new file)
    else if (line.startsWith("new file mode") && currentFile) {
      currentFile.isNew = true;
    }

    // Deleted file
    else if (line.startsWith("deleted file mode") && currentFile) {
      currentFile.isDeleted = true;
    }

    // Hunk header
    else if (line.startsWith("@@") && currentFile) {
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        currentHunk = {
          oldStart: parseInt(match[1], 10),
          oldCount: parseInt(match[2] ?? "1", 10),
          newStart: parseInt(match[3], 10),
          newCount: parseInt(match[4] ?? "1", 10),
          lines: [],
        };
        currentFile.hunks.push(currentHunk);
      }
    }

    // Diff lines
    else if (currentHunk && currentFile) {
      let oldLine = currentHunk.lines.length > 0
        ? currentHunk.lines[currentHunk.lines.length - 1].oldLineNumber ?? currentHunk.oldStart - 1
        : currentHunk.oldStart - 1;
      let newLine = currentHunk.lines.length > 0
        ? currentHunk.lines[currentHunk.lines.length - 1].newLineNumber ?? currentHunk.newStart - 1
        : currentHunk.newStart - 1;

      // Get last actual line numbers
      for (const l of currentHunk.lines) {
        if (l.oldLineNumber !== undefined) oldLine = l.oldLineNumber;
        if (l.newLineNumber !== undefined) newLine = l.newLineNumber;
      }

      if (line.startsWith("+")) {
        const diffLine: DiffLine = { type: "add", content: line.slice(1), newLineNumber: newLine + 1 };
        currentHunk.lines.push(diffLine);
        currentFile.additions++;
      } else if (line.startsWith("-")) {
        const diffLine: DiffLine = { type: "remove", content: line.slice(1), oldLineNumber: oldLine + 1 };
        currentHunk.lines.push(diffLine);
        currentFile.deletions++;
      } else if (line.startsWith("\\")) {
        // No newline at end of file — skip
      } else {
        // Context line
        const diffLine: DiffLine = {
          type: "context",
          content: line.startsWith(" ") ? line.slice(1) : line,
          oldLineNumber: oldLine + 1,
          newLineNumber: newLine + 1,
        };
        currentHunk.lines.push(diffLine);
      }
    }

    i++;
  }

  if (currentFile) files.push(currentFile);
  return files;
}

/** Generate a simple text diff between two strings */
export function textDiff(oldText: string, newText: string): string {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const result: string[] = [];
  result.push(`--- a/file`);
  result.push(`+++ b/file`);

  // Simple LCS-based diff for demonstration
  const hunks = computeHunks(oldLines, newLines);
  for (const hunk of hunks) {
    result.push(
      `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`
    );
    for (const line of hunk.lines) {
      result.push(`${line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}${line.content}`);
    }
  }

  return result.join("\n");
}

interface ComputedHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: { type: "context" | "add" | "remove"; content: string }[];
}

function computeHunks(oldLines: string[], newLines: string[]): ComputedHunk[] {
  // Simplified: find changed regions
  const hunks: ComputedHunk[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  let inHunk = false;
  let hunkOldStart = 0;
  let hunkNewStart = 0;
  let hunkLines: ComputedHunk["lines"] = [];

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    const changed = oldLine !== newLine;

    if (changed || oldLine === undefined || newLine === undefined) {
      if (!inHunk) {
        inHunk = true;
        hunkOldStart = i + 1;
        hunkNewStart = i + 1;
        hunkLines = [];
      }

      if (oldLine !== undefined && oldLine !== newLine) {
        hunkLines.push({ type: "remove", content: oldLine });
      }
      if (newLine !== undefined && oldLine !== newLine) {
        hunkLines.push({ type: "add", content: newLine });
      } else if (newLine === undefined && oldLine !== undefined) {
        // Line was deleted — already added as remove above
      } else if (oldLine === undefined && newLine !== undefined) {
        // Line was added — already added as add above
      }
    } else if (inHunk) {
      // Add context after changes
      hunkLines.push({ type: "context", content: oldLine! });
      if (hunkLines.length >= 3) { // End hunk with enough context
        closeHunk();
      }
    }
  }

  if (inHunk) closeHunk();

  function closeHunk() {
    const removeCount = hunkLines.filter((l) => l.type === "remove").length;
    const addCount = hunkLines.filter((l) => l.type === "add").length;
    const contextCount = hunkLines.filter((l) => l.type === "context").length;

    hunks.push({
      oldStart: hunkOldStart,
      oldCount: Math.max(removeCount + contextCount, 1),
      newStart: hunkNewStart,
      newCount: Math.max(addCount + contextCount, 1),
      lines: hunkLines,
    });
    inHunk = false;
  }

  return hunks;
}

/** Get diff stats summary */
export function getDiffStats(diffs: FileDiff[]): {
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
  filesChanged: number;
} {
  return diffs.reduce(
    (acc, f) => ({
      totalAdditions: acc.totalAdditions + f.additions,
      totalDeletions: acc.totalDeletions + f.deletions,
      totalFiles: acc.totalFiles + 1,
      filesChanged: acc.filesChanged + (f.additions > 0 || f.deletions > 0 ? 1 : 0),
    }),
    { totalAdditions: 0, totalDeletions: 0, totalFiles: 0, filesChanged: 0 },
  );
}
