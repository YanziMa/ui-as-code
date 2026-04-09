/**
 * Unified Diff Parser & Patcher
 *
 * Parses unified diff format and applies it to HTML/JSX strings.
 * Supports:
 * - @@ hunk headers
 * - Context lines (unchanged)
 * - Addition lines (+)
 * - Removal lines (-)
 * - Multiple hunks
 */

export interface Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  changes: Change[];
}

export interface Change {
  type: "context" | "add" | "remove";
  content: string;
  lineNumber?: number; // original line number
}

export interface ParsedDiff {
  filePath?: string;
  oldFilePath?: string;
  newFilePath?: string;
  hunks: Hunk[];
}

/**
 * Parse a unified diff string into structured data
 */
export function parseDiff(diffText: string): ParsedDiff | null {
  const lines = diffText.split("\n");
  let i = 0;

  // Skip optional diff header
  if (lines[i]?.startsWith("diff ")) {
    i++;
  }

  // Parse --- a/file and +++ b/file headers
  let oldFilePath: string | undefined;
  let newFilePath: string | undefined;

  while (i < lines.length && (lines[i]?.startsWith("---") || lines[i]?.startsWith("+++"))) {
    if (lines[i]?.startsWith("---")) {
      oldFilePath = lines[i].replace(/^--- (a\/)?/, "").trim();
      i++;
    }
    if (lines[i]?.startsWith("+++")) {
      newFilePath = lines[i].replace(/^\+\+\+ (b\/)?/, "").trim();
      i++;
    }
  }

  const hunks: Hunk[] = [];

  while (i < lines.length) {
    const line = lines[i];
    if (!line?.startsWith("@@")) {
      i++;
      continue;
    }

    // Parse hunk header: @@ -start,count +start,count @@
    const headerMatch = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    if (!headerMatch) {
      i++;
      continue;
    }

    const hunk: Hunk = {
      oldStart: parseInt(headerMatch[1], 10),
      oldCount: parseInt(headerMatch[2] || "1", 10),
      newStart: parseInt(headerMatch[3], 10),
      newCount: parseInt(headerMatch[4] || "1", 10),
      changes: [],
    };
    i++;

    // Parse change lines until next hunk or end
    while (i < lines.length) {
      const changeLine = lines[i];
      if (!changeLine || changeLine.startsWith("@@") || changeLine.startsWith("diff ") ||
          changeLine.startsWith("--- ") || changeLine.startsWith("+++ ")) {
        break;
      }

      let type: Change["type"] = "context";
      let content = changeLine;

      if (changeLine.startsWith("+")) {
        type = "add";
        content = changeLine.slice(1);
      } else if (changeLine.startsWith("-")) {
        type = "remove";
        content = changeLine.slice(1);
      } else if (changeLine.startsWith(" ")) {
        content = changeLine.slice(1);
      } else if (changeLine === "\\ No newline at end of file" || changeLine === "\\ No newline at end of file\\") {
        i++;
        continue;
      }

      hunk.changes.push({ type, content });
      i++;
    }

    hunks.push(hunk);
  }

  if (hunks.length === 0) return null;

  return { oldFilePath, newFilePath, hunks };
}

/**
 * Apply parsed diff to source text
 */
export function applyDiff(sourceText: string, diff: ParsedDiff): string {
  const sourceLines = sourceText.split("\n");

  // Process hunks in reverse order to preserve line numbers
  for (let h = diff.hunks.length - 1; h >= 0; h--) {
    const hunk = diff.hunks[h];
    applyHunk(sourceLines, hunk);
  }

  return sourceLines.join("\n");
}

function applyHunk(sourceLines: string[], hunk: Hunk): void {
  const { changes } = hunk;

  // Build the result for this hunk
  const resultLines: string[] = [];
  let sourceIdx = hunk.oldStart - 1; // 0-indexed

  for (const change of changes) {
    switch (change.type) {
      case "context":
        // Verify context line matches (optional, for safety)
        if (sourceIdx < sourceLines.length) {
          resultLines.push(sourceLines[sourceIdx]);
        }
        sourceIdx++;
        break;

      case "remove":
        // Skip this line in source (don't add to result)
        sourceIdx++;
        break;

      case "add":
        // Insert new line
        resultLines.push(change.content);
        break;
    }
  }

  // Replace the affected range in source with result
  const startIdx = hunk.oldStart - 1;
  const endIdx = startIdx + hunk.oldCount;

  if (startIdx >= 0 && endIdx <= sourceLines.length) {
    sourceLines.splice(startIdx, hunk.oldCount, ...resultLines);
  }
}

/**
 * Quick apply: parse + apply in one step
 */
export function quickApplyDiff(sourceText: string, diffText: string): string {
  const parsed = parseDiff(diffText);
  if (!parsed) return sourceText;
  return applyDiff(sourceText, parsed);
}

/**
 * Extract diff from AI response text (handles various formats)
 */
export function extractDiffFromResponse(text: string): string | null {
  // Try code block first
  const codeBlockMatch = text.match(/```(?:diff|patch)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    const diffContent = codeBlockMatch[1].trim();
    // Validate it looks like a real diff
    if (/^@@/.test(diffContent) || /^---/.test(diffContent)) {
      return diffContent;
    }
  }

  // Try raw diff pattern
  const rawMatch = text.match(
    /(?:^---\s+[^\n]+\n\+\+\+[^\n]+\n@@[\s\S]*?)(?=\n(?:---|\+\+\+|@@|$))/
  );
  if (rawMatch) {
    return rawMatch[0].trim();
  }

  // Last resort: find any diff-like content
  const lines = text.split("\n");
  const diffLines: string[] = [];
  let inDiff = false;
  let hasDiffMarkers = false;

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) {
      inDiff = true;
      hasDiffMarkers = true;
    }
    if (inDiff) {
      diffLines.push(line);
      // Stop at obvious non-diff content after we started
      if (hasDiffMarkers && line.length > 0 && !line.startsWith("-") &&
          !line.startsWith("+") && !line.startsWith("@@") &&
          !line.startsWith(" ") && !line.startsWith("---") &&
          !line.startsWith("+++") && !line.startsWith("index") &&
          !line.startsWith("diff ")) {
        // Check if this could be a regular content line (no special chars)
        if (!/^[<>=#*]/.test(line) && line.includes("  ")) {
          diffLines.pop(); // remove it
          break;
        }
      }
    }
  }

  const result = diffLines.join("\n").trim();
  return hasDiffMarkers && result.length > 10 ? result : null;
}
