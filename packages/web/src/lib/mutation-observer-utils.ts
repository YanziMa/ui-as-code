/**
 * Mutation Observer Utilities: Enhanced MutationObserver with filtered
 * observation, batched callbacks, DOM change tracking, change summaries,
 * undo/redo snapshots, and structured diff output.
 */

// --- Types ---

export type MutationFilter = "attributes" | "characterData" | "childList" | "all";
export type MutationAction = "added" | "removed" | "moved" | "changed" | "attribute";

export interface MutationRecordEx {
  /** Original MutationRecord */
  record: MutationRecord;
  /** Normalized action type */
  action: MutationAction;
  /** Affected element(s) */
  elements: HTMLElement[];
  /** Attribute name (if attribute mutation) */
  attributeName?: string;
  /** Previous value (if available) */
  previousValue?: string;
  /** New value (if available) */
  newValue?: string;
  /** XPath-like path to the changed element */
  path: string;
}

export interface ChangeSummary {
  /** Total mutations in this batch */
  totalMutations: number;
  /** Mutations by type */
  byType: Record<MutationAction, number>;
  /** Elements that were added */
  addedElements: HTMLElement[];
  /** Elements that were removed */
  removedElements: HTMLElement[];
  /** Elements with attribute changes */
  attributeChanges: Array<{ el: HTMLElement; attr: string; oldValue?: string; newValue?: string }>;
  /** Text content changes */
  textChanges: Array<{ el: HTMLElement; oldValue?: string; newValue?: string }>;
  /** Timestamp of this summary */
  timestamp: number;
  /** Duration since last batch (ms) */
  durationSinceLastBatch: number;
}

export interface MutationObserverOptions {
  /** Target element to observe */
  target: HTMLElement;
  /** What to observe */
  filter?: MutationFilter;
  /** Watch specific attributes only? */
  attributes?: string[] | boolean;
  /** Watch subtree changes? */
  subtree?: boolean;
  /** Watch character data changes? */
  characterData?: boolean;
  /** Batch multiple rapid mutations into one callback (ms, 0 = no batching) */
  batchMs?: number;
  /** Only report mutations matching a CSS selector? */
  selectorFilter?: string;
  /** Ignore mutations on elements matching this selector */
  ignoreSelector?: string;
  /** Ignore invisible/hidden element changes? */
  ignoreHidden?: boolean;
  /** Max history entries for snapshots */
  maxSnapshots?: number;
  /** Called with enhanced records on each mutation batch */
  onMutate?: (records: MutationRecordEx[], summary: ChangeSummary) => void;
  /** Called when any child is added */
  onChildAdded?: (el: HTMLElement, parent: HTMLElement) => void;
  /** Called when any child is removed */
  onChildRemoved?: (el: HTMLElement, parent: HTMLElement) => void;
  /** Called when an attribute changes */
  onAttributeChanged?: (el: HTMLElement, attr: string, oldValue: string | null, newValue: string | null) => void;
  /** Called when text content changes */
  onTextChanged?: (el: HTMLElement, oldValue: string | null, newValue: string | null) => void;
  /** Called before DOM is modified (for interception) */
  beforeMutation?: (summary: Partial<ChangeSummary>) => boolean | void;
  /** Custom class name */
  className?: string;
}

export interface MutationObserverInstance {
  /** The underlying native observer */
  observer: MutationObserver;
  /** Get current snapshot of target's innerHTML */
  getSnapshot: () => string;
  /** Get snapshot history */
  getHistory: () => string[];
  /** Undo to previous snapshot (replaces innerHTML) */
  undo: () => boolean;
  /** Redo (after undo) */
  redo: () => boolean;
  /** Check if can undo */
  canUndo: () => boolean;
  /** Check if can redo */
  canRedo: () => boolean;
  /** Take a manual snapshot */
  takeSnapshot: () => void;
  /** Get mutation count since creation */
  getMutationCount: () => number;
  /** Pause observation */
  pause: () => void;
  /** Resume observation */
  resume: () => void;
  /** Disconnect and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function getElementPath(el: Node): string {
  const parts: string[] = [];
  let current: Node | null = el;

  while (current && current !== document.body) {
    let selector = "";
    if (current instanceof Element) {
      selector = current.tagName.toLowerCase();
      if (current.id) selector += `#${current.id}`;
      else if (current.classList.length > 0) {
        selector += `.${Array.from(current.classList).slice(0, 2).join(".")}`;
      }
    } else {
      selector = current.nodeName.toLowerCase();
    }
    parts.unshift(selector);
    current = current.parentNode;
  }

  return parts.join(" > ");
}

function matchesSelector(el: Element, selector: string): boolean {
  try { return el.matches(selector); }
  catch { return false; }
}

function isVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const style = getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

// --- Core Factory ---

/**
 * Create an enhanced MutationObserver with batching, filtering, and snapshots.
 *
 * @example
 * ```ts
 * const mo = createEnhancedMutationObserver({
 *   target: document.getElementById("app")!,
 *   filter: "childList",
 *   subtree: true,
 *   batchMs: 50,
 *   onMutate: (records, summary) => {
 *     console.log(`${summary.totalMutations} mutations detected`);
 *   },
 * });
 *
 * // Later:
 * mo.undo(); // Revert to previous state
 * ```
 */
export function createEnhancedMutationObserver(options: MutationObserverOptions): MutationObserverInstance {
  const {
    target,
    filter = "all",
    attributes: watchAttributes = true,
    subtree = true,
    characterData = false,
    batchMs = 0,
    selectorFilter,
    ignoreSelector,
    ignoreHidden = false,
    maxSnapshots = 20,
    onMutate,
    onChildAdded,
    onChildRemoved,
    onAttributeChanged,
    onTextChanged,
  } = options;

  let _paused = false;
  let _mutationCount = 0;
  let isDestroyed = false;
  const _snapshots: string[] = [];
  let _snapshotIndex = -1; // points to current position
  let _pendingRecords: MutationRecord[] = [];
  let _batchTimer: ReturnType<typeof setTimeout> | null = null;
  let _lastBatchTime = performance.now();

  // Build native config
  const nativeConfig: MutationObserverInit = {
    attributes: filter === "all" || filter === "attributes" ? watchAttributes : false,
    attributeOldValue: filter === "all" || filter === "attributes",
    childList: filter === "all" || filter === "childList",
    subtree,
    characterData: filter === "all" || filter === "characterData" ? characterData : false,
    characterDataOldValue: filter === "all" || filter === "characterData",
  };

  // Take initial snapshot
  _snapshots.push(target.innerHTML);
  _snapshotIndex = 0;

  // --- Enhanced record builder ---

  function enhanceRecord(record: MutationRecord): MutationRecordEx | null {
    const action = classifyAction(record);
    const elements: HTMLElement[] = [];

    switch (action) {
      case "added":
        if (record.addedNodes) {
          record.addedNodes.forEach((n) => {
            if (n instanceof HTMLElement) elements.push(n);
          });
        }
        break;
      case "removed":
        if (record.removedNodes) {
          record.removedNodes.forEach((n) => {
            // Removed nodes are detached — try to get info from record
            if (n instanceof HTMLElement) elements.push(n);
          });
        }
        break;
      case "changed":
      case "attribute":
        if (record.target instanceof HTMLElement) elements.push(record.target as HTMLElement);
        break;
    }

    // Selector filter
    if (selectorFilter) {
      const filtered = elements.filter((el) => matchesSelector(el, selectorFilter));
      if (filtered.length === 0) return null;
    }

    // Ignore filter
    if (ignoreSelector) {
      const ignored = elements.some((el) => matchesSelector(el, ignoreSelector));
      if (ignored) return null;
    }

    // Hidden filter
    if (ignoreHidden) {
      const visible = elements.some((el) => isVisible(el));
      if (!visible) return null;
    }

    return {
      record,
      action,
      elements,
      attributeName: record.attributeName ?? undefined,
      previousValue: record.oldValue ?? undefined,
      newValue: action === "attribute"
        ? ((record.target as HTMLElement).getAttribute(record.attributeName!) ?? undefined)
        : undefined,
      path: getElementPath(record.target),
    };
  }

  function classifyAction(record: MutationRecord): MutationAction {
    if (record.type === "attributes") return "attribute";
    if (record.type === "characterData") return "changed";
    if (record.addedNodes?.length) return "added";
    if (record.removedNodes?.length) return "removed";
    return "changed";
  }

  // --- Summary builder ---

  function buildSummary(records: MutationRecordEx[]): ChangeSummary {
    const summary: ChangeSummary = {
      totalMutations: records.length,
      byType: { added: 0, removed: 0, moved: 0, changed: 0, attribute: 0 },
      addedElements: [],
      removedElements: [],
      attributeChanges: [],
      textChanges: [],
      timestamp: performance.now(),
      durationSinceLastBatch: performance.now() - _lastBatchTime,
    };

    for (const rec of records) {
      summary.byType[rec.action]++;
      switch (rec.action) {
        case "added": summary.addedElements.push(...rec.elements); break;
        case "removed": summary.removedElements.push(...rec.elements); break;
        case "attribute":
          if (rec.attributeName && rec.elements[0]) {
            summary.attributeChanges.push({
              el: rec.elements[0]!,
              attr: rec.attributeName,
              oldValue: rec.previousValue,
              newValue: rec.newValue,
            });
          }
          break;
        case "changed":
          if (rec.elements[0]) {
            summary.textChanges.push({
              el: rec.elements[0]!,
              oldValue: rec.previousValue,
              newValue: rec.elements[0]!.textContent,
            });
          }
          break;
      }
    }

    _lastBatchTime = summary.timestamp;
    return summary;
  }

  // --- Handler ---

  function handleMutations(records: MutationRecord[]): void {
    if (_paused || isDestroyed) return;

    _mutationCount += records.length;

    if (batchMs > 0) {
      _pendingRecords.push(...records);

      if (_batchTimer) clearTimeout(_batchTimer);
      _batchTimer = setTimeout(() => {
        processBatch(_pendingRecords);
        _pendingRecords = [];
        _batchTimer = null;
      }, batchMs);
    } else {
      processBatch(records);
    }
  }

  function processBatch(records: MutationRecord[]): void {
    const enhanced: MutationRecordEx[] = [];

    for (const record of records) {
      const ex = enhanceRecord(record);
      if (ex) enhanced.push(ex);
    }

    if (enhanced.length === 0) return;

    const summary = buildSummary(enhanced);

    // Individual callbacks
    for (const ex of enhanced) {
      switch (ex.action) {
        case "added":
          ex.elements.forEach((el) => onChildAdded?.(el, target));
          break;
        case "removed":
          ex.elements.forEach((el) => onChildRemoved?.(el, target));
          break;
        case "attribute":
          if (ex.attributeName && ex.elements[0]) {
            onAttributeChanged?.(
              ex.elements[0]!, ex.attributeName,
              ex.previousValue ?? null, ex.newValue ?? null,
            );
          }
          break;
        case "changed":
          if (ex.elements[0]) {
            onTextChanged?.(
              ex.elements[0]!, ex.previousValue ?? null, ex.newValue ?? null,
            );
          }
          break;
      }
    }

    // Global callback
    onMutate?.(enhanced, summary);

    // Auto-snapshot after mutations
    takeSnapshot();
  }

  // --- Create native observer ---

  const nativeObserver = new MutationObserver(handleMutations);
  nativeObserver.observe(target, nativeConfig);

  // --- Snapshot management ---

  function getSnapshot(): string { return target.innerHTML; }

  function getHistory(): string[] { return [..._snapshots]; }

  function takeSnapshot(): void {
    // Truncate any redo states
    if (_snapshotIndex < _snapshots.length - 1) {
      _snapshots.splice(_snapshotIndex + 1);
    }

    _snapshots.push(target.innerHTML);
    _snapshotIndex++;

    // Limit history
    while (_snapshots.length > maxSnapshots) {
      _snapshots.shift();
      _snapshotIndex--;
    }
  }

  function undo(): boolean {
    if (_snapshotIndex <= 0) return false;
    _snapshotIndex--;
    target.innerHTML = _snapshots[_snapshotIndex]!;
    return true;
  }

  function redo(): boolean {
    if (_snapshotIndex >= _snapshots.length - 1) return false;
    _snapshotIndex++;
    target.innerHTML = _snapshots[_snapshotIndex]!;
    return true;
  }

  function canUndo(): boolean { return _snapshotIndex > 0; }
  function canRedo(): boolean { return _snapshotIndex < _snapshots.length - 1; }

  function getMutationCount(): number { return _mutationCount; }

  function pause(): void { _paused = true; }
  function resume(): void { _paused = false; }

  function destroy(): void {
    isDestroyed = true;
    if (_batchTimer) clearTimeout(_batchTimer);
    nativeObserver.disconnect();
    _snapshots.length = 0;
    _pendingRecords = [];
  }

  return {
    observer: nativeObserver,
    getSnapshot, getHistory,
    undo, redo, canUndo, canRedo,
    takeSnapshot,
    getMutationCount,
    pause, resume, destroy,
  };
}
