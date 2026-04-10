/**
 * Gantt Chart: Interactive Gantt chart with tasks, dependencies,
 * timeline, zoom levels, drag-to-resize, progress tracking,
 * milestones, critical path highlighting, and date navigation.
 */

// --- Types ---

export interface GanttTask {
  /** Unique ID */
  id: string;
  /** Task name */
  name: string;
  /** Start date (ISO string) */
  start: string;
  /** End date (ISO string) */
  end: string;
  /** Progress 0-100 */
  progress?: number;
  /** Task color */
  color?: string;
  /** Dependencies: IDs of tasks this depends on */
  dependencies?: string[];
  /** Assignee name */
  assignee?: string;
  /** Is this a milestone? (zero-duration) */
  milestone?: boolean;
  /** Group/category for grouping rows */
  group?: string;
  /** Custom CSS class */
  className?: string;
  /** Expanded? (for parent tasks) */
  expanded?: boolean;
  /** Child tasks (for parent/grouping) */
  children?: GanttTask[];
}

export interface GanttChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Tasks data */
  tasks: GanttTask[];
  /** Start of visible timeline (ISO) */
  viewStart?: string;
  /** End of visible timeline (ISO) */
  viewEnd?: string;
  /** Zoom level: 'day', 'week', 'month', 'quarter' */
  zoom?: "day" | "week" | "month" | "quarter";
  /** Show today marker line */
  showTodayLine?: boolean;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show progress bars inside tasks */
  showProgress?: boolean;
  /** Show dependency arrows */
  showDependencies?: boolean;
  /** Row height in px (default: 36) */
  rowHeight?: number;
  /** Bar height in px (default: 24) */
  barHeight?: number;
  /** Allow dragging to move tasks */
  draggable?: boolean;
  /** Allow resizing task duration */
  resizable?: boolean;
  /** Callback on task click */
  onTaskClick?: (task: GanttTask) => void;
  /** Callback on task move/resize */
  onTaskChange?: (task: GanttTask) => void;
  /** Callback on date range change (zoom/pan) */
  onViewChange?: (start: Date, end: Date) => void;
  /** Custom CSS class */
  className?: string;
}

export interface GanttChartInstance {
  element: HTMLElement;
  getTasks: () => GanttTask[];
  setTasks: (tasks: GanttTask[]) => void;
  addTask: (task: GanttTask) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<GanttTask>) => void;
  setZoom: (zoom: "day" | "week" | "month" | "quarter") => void;
  scrollToTask: (taskId: string) => void;
  goToToday: () => void;
  fitToView: () => void;
  destroy: () => void;
}

// --- Helpers ---

function parseDate(s: string): Date {
  return new Date(s);
}

function formatDate(d: Date, fmt: "short" | "medium" | "long"): string {
  if (fmt === "short") return `${d.getMonth() + 1}/${d.getDate()}`;
  if (fmt === "medium") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const DAY_MS = 86400000;

// --- Main Factory ---

export function createGanttChart(options: GanttChartOptions): GanttChartInstance {
  const opts = {
    zoom: options.zoom ?? "week",
    showTodayLine: options.showTodayLine ?? true,
    showGrid: options.showGrid ?? true,
    showProgress: options.showProgress ?? true,
    showDependencies: options.showDependencies ?? true,
    rowHeight: options.rowHeight ?? 36,
    barHeight: options.barHeight ?? 24,
    draggable: options.draggable ?? false,
    resizable: options.resizable ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("GanttChart: container not found");

  let allTasks: GanttTask[] = [...options.tasks];
  let destroyed = false;
  let viewStart: Date = options.viewStart ? parseDate(options.viewStart) : addDays(new Date(), -14);
  let viewEnd: Date = options.viewEnd ? parseDate(options.viewEnd) : addDays(new Date(), 42);
  let scrollLeft = 0;

  // Root
  const root = document.createElement("div");
  root.className = `gantt-chart ${opts.className ?? ""}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;height:100%;
    font-family:-apple-system,sans-serif;font-size:12px;color:#374151;overflow:hidden;
    background:#fff;border-radius:8px;border:1px solid #e5e7eb;
  `;
  container.appendChild(root);

  // Header (timeline)
  const headerEl = document.createElement("div");
  headerEl.className = "gc-header";
  headerEl.style.cssText = `
    display:flex;flex-shrink:0;border-bottom:1px solid #e5e7eb;background:#fafafa;
    position:relative;overflow:hidden;height:48px;
  `;
  root.appendChild(headerEl);

  // Body (task rows + timeline grid)
  const bodyEl = document.createElement("div");
  bodyEl.className = "gc-body";
  bodyEl.style.cssText = `
    display:flex;flex:1;overflow:hidden;position:relative;
  `;
  root.appendChild(bodyEl);

  // Left sidebar (task names)
  const sidebar = document.createElement("div");
  sidebar.className = "gc-sidebar";
  sidebar.style.cssText = `
    width:220px;flex-shrink:0;border-right:1px solid #e5e7eb;
    overflow-y:auto;background:#fafafa;font-weight:500;font-size:12px;
  `;
  bodyEl.appendChild(sidebar);

  // Timeline area
  const timelineArea = document.createElement("div");
  timelineArea.className = "gc-timeline-area";
  timelineArea.style.cssText = `
    flex:1;position:relative;overflow:auto;
  `;
  bodyEl.appendChild(timelineArea);

  // SVG overlay for dependency lines
  let svgOverlay: SVGSVGElement | null = null;
  if (opts.showDependencies) {
    svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgOverlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;";
    timelineArea.appendChild(svgOverlay);
  }

  function getViewDays(): number {
    return daysBetween(viewStart, viewEnd);
  }

  function pxPerDay(): number {
    const areaWidth = Math.max(timelineArea.clientWidth - 40, 400);
    switch (opts.zoom) {
      case "day": return areaWidth / Math.max(getViewDays(), 30);
      case "week": return areaWidth / Math.max(getViewDays() / 7, 4);
      case "month": return areaWidth / Math.max(getViewDays() / 30, 2);
      case "quarter": return areaWidth / Math.max(getViewDays() / 90, 1);
      default: return areaWidth / Math.max(getViewDays(), 30);
    }
  }

  function dateToPx(date: Date): number {
    return daysBetween(viewStart, date) * pxPerDay();
  }

  function pxToDate(px: number): Date {
    return addDays(viewStart, px / pxPerDay());
  }

  function renderHeader(): void {
    headerEl.innerHTML = "";
    const ppd = pxPerDay();
    const totalW = getViewDays() * ppd;

    // Timeline ruler
    const ruler = document.createElement("div");
    ruler.style.cssText = `display:flex;width:${totalW}px;position:absolute;left:0;top:0;height:100%;`;

    switch (opts.zoom) {
      case "day": {
        for (let d = new Date(viewStart); d < viewEnd; d = addDays(d, 1)) {
          const cell = document.createElement("div");
          cell.style.cssText = `flex:1;min-width:${ppd}px;text-align:center;padding-top:6px;border-right:1px solid #f0f0f0;font-size:10px;color:#9ca3af;`;
          const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
          cell.innerHTML = `<div>${dow}</div><div style="font-weight:600;">${formatDate(d, "short")}</div>`;
          ruler.appendChild(cell);
        }
        break;
      }
      case "week": {
        const weeks = Math.ceil(getViewDays() / 7);
        for (let w = 0; w < weeks; w++) {
          const weekStart = addDays(viewStart, w * 7);
          const cell = document.createElement("div");
          cell.style.cssText = `flex:1;min-width:${ppd * 7}px;text-align:center;padding-top:12px;border-right:1px solid #f0f0f0;font-size:11px;color:#6b7280;font-weight:500;`;
          cell.textContent = `Week of ${formatDate(weekStart, "medium")}`;
          ruler.appendChild(cell);
        }
        break;
      }
      case "month": {
        const months = Math.ceil(getViewDays() / 30);
        for (let m = 0; m < months; m++) {
          const monthStart = addDays(viewStart, m * 30);
          const cell = document.createElement("div");
          cell.style.cssText = `flex:1;min-width:${ppd * 30}px;text-align:center;padding-top:16px;border-right:1px solid #f0f0f0;font-size:11px;color:#6b7280;font-weight:600;`;
          cell.textContent = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          ruler.appendChild(cell);
        }
        break;
      }
      default: {
        const quarters = Math.ceil(getViewDays() / 90);
        for (let q = 0; q < quarters; q++) {
          const qStart = addDays(viewStart, q * 90);
          const cell = document.createElement("div");
          cell.style.cssText = `flex:1;min-width:${ppd * 90}px;text-align:center;padding-top:18px;border-right:1px solid #f0f0f0;font-size:12px;color:#374151;font-weight:700;";
          cell.textContent = `Q${Math.floor(qStart.getMonth() / 3) + 1} ${qStart.getFullYear()}`;
          ruler.appendChild(cell);
        }
      }
    }

    headerEl.appendChild(ruler);

    // Today line
    if (opts.showTodayLine) {
      const todayPx = dateToPx(new Date());
      if (todayPx >= 0 && todayPx <= totalW) {
        const todayLine = document.createElement("div");
        todayLine.className = "gc-today-line";
        todayLine.style.cssText = `
          position:absolute;left:${todayPx}px;top:0;bottom:0;width:2px;
          background:#ef4444;z-index:2;
        `;
        const label = document.createElement("span");
        label.textContent = "Today";
        label.style.cssText = "position:absolute;top:-1px;left:4px;font-size:9px;background:#ef4444;color:#fff;padding:1px 4px;border-radius:3px;white-space:nowrap;";
        todayLine.appendChild(label);
        headerEl.appendChild(todayLine);
      }
    }
  }

  function flattenTasks(tasks: GanttTask[]): GanttTask[] {
    const result: GanttTask[] = [];
    for (const t of tasks) {
      result.push(t);
      if (t.children && t.expanded !== false) {
        result.push(...flattenTasks(t.children));
      }
    }
    return result;
  }

  function renderBody(): void {
    sidebar.innerHTML = "";
    timelineArea.innerHTML = "";

    if (svgOverlay) {
      svgOverlay.innerHTML = "";
      timelineArea.appendChild(svgOverlay);
    }

    const flatTasks = flattenTasks(allTasks);
    const ppd = pxPerDay();
    const totalW = getViewDays() * ppd;

    // Grid background
    if (opts.showGrid) {
      const grid = document.createElement("div");
      grid.style.cssText = `position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;`;
      const gridLines = Math.min(Math.floor(totalW / (opts.zoom === "day" ? ppd : ppd * 7)), 60);
      for (let i = 0; i <= gridLines; i++) {
        const step = opts.zoom === "day" ? 1 : opts.zoom === "week" ? 7 : opts.zoom === "month" ? 30 : 90;
        const x = i * step * ppd;
        const line = document.createElement("div");
        line.style.cssText = `position:absolute;left:${x}px;top:0;bottom:0;width:1px;background:#f0f0f0;`;
        grid.appendChild(line);
      }
      timelineArea.appendChild(grid);
    }

    // Row backgrounds (alternating)
    for (let i = 0; i < flatTasks.length; i++) {
      const rowBg = document.createElement("div");
      rowBg.style.cssText = `position:absolute;left:0;right:0;top:${i * opts.rowHeight}px;height:${opts.rowHeight}px;background:${i % 2 === 0 ? "#fff" : "#fafbfc"};`;
      timelineArea.appendChild(rowBg);
    }

    // Sidebar items
    for (const task of flatTasks) {
      const item = document.createElement("div");
      item.style.cssText = `
        padding:0 12px;height:${opts.rowHeight}px;display:flex;align-items:center;
        border-bottom:1px solid #f0f0f0;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        ${task.milestone ? "font-weight:600;" : ""}
      `;
      item.textContent = task.name;
      item.addEventListener("click", () => opts.onTaskClick?.(task));
      sidebar.appendChild(item);
    }

    // Task bars
    for (let i = 0; i < flatTasks.length; i++) {
      const task = flatTasks[i]!;
      const bar = renderTaskBar(task, i);
      timelineArea.appendChild(bar);
    }

    // Dependency arrows
    if (svgOverlay) {
      renderDependencies(flatTasks);
    }

    // Set total width
    timelineArea.querySelector(".gc-grid")?.remove();
    const content = document.createElement("div");
    content.className = "gc-content";
    content.style.cssText = `width:${totalW}px;position:relative;min-height:${flatTasks.length * opts.rowHeight}px;`;

    // Move all children except SVG into content wrapper
    const children = Array.from(timelineArea.children);
    for (const child of children) {
      if (child !== svgOverlay) content.appendChild(child);
    }
    timelineArea.appendChild(content);
  }

  function renderTaskBar(task: GanttTask, rowIndex: number): HTMLElement {
    const startDate = parseDate(task.start);
    const endDate = parseDate(task.end);
    const left = dateToPx(startDate);
    const width = Math.max(daysBetween(startDate, endDate) * pxPerDay(), task.milestone ? 12 : 4);

    const bar = document.createElement("div");
    bar.className = `gc-bar ${task.className ?? ""}`;
    bar.dataset.taskId = task.id;
    bar.style.cssText = `
      position:absolute;left:${left}px;top:${rowIndex * opts.rowHeight + (opts.rowHeight - opts.barHeight) / 2}px;
      width:${width}px;height:${opts.barHeight}px;border-radius:${task.milestone ? "50%" : "4px"};
      background:${task.color ?? "#4338ca"};cursor:pointer;z-index:3;
      transition:box-shadow 0.15s;display:flex;align-items:center;overflow:hidden;
      ${task.milestone ? "width:12px;" : ""}
    `;

    // Progress fill
    if (!task.milestone && opts.showProgress && (task.progress ?? 0) > 0) {
      const prog = document.createElement("div");
      prog.style.cssText = `
        height:100%;background:rgba(255,255,255,0.35);border-radius:inherit;
        width:${task.progress}%;transition:width 0.3s;
      `;
      bar.appendChild(prog);
    }

    // Task name on bar (if wide enough)
    if (width > 60 && !task.milestone) {
      const label = document.createElement("span");
      label.textContent = task.name;
      label.style.cssText = "padding:0 8px;font-size:11px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;";
      bar.appendChild(label);
    }

    // Milestone diamond indicator
    if (task.milestone) {
      bar.title = `\u25C6 ${task.name}`;
    } else {
      bar.title = `${task.name} (${formatDate(startDate, "medium")} \u2013 ${formatDate(endDate, "medium")})${task.progress ? ` [${task.progress}%]` : ""}`;
    }

    // Events
    bar.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onTaskClick?.(task);
    });

    bar.addEventListener("mouseenter", () => {
      bar.style.boxShadow = "0 2px 8px rgba(67,56,202,0.3)";
    });
    bar.addEventListener("mouseleave", () => {
      bar.style.boxShadow = "";
    });

    // Drag to move
    if (opts.draggable && !task.milestone) {
      setupDrag(bar, task);
    }

    // Resize handle
    if (opts.resizable && !task.milestone) {
      const resizeHandle = document.createElement("div");
      resizeHandle.style.cssText = `
        position:absolute;right:-3px;top:0;bottom:0;width:6px;cursor:col-resize;z-index:4;
      `;
      resizeHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setupResize(e, task);
      });
      bar.appendChild(resizeHandle);
    }

    return bar;
  }

  function setupDrag(bar: HTMLElement, task: GanttTask): void {
    let startX = 0;
    let startLeft = 0;
    let origStart = parseDate(task.start).getTime();

    bar.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).style.cursor === "col-resize") return;
      e.preventDefault();
      startX = e.clientX;
      startLeft = parseFloat(bar.style.left) || 0;
      origStart = parseDate(task.start).getTime();

      const onMove = (me: MouseEvent) => {
        const delta = me.clientX - startX;
        const dayDelta = Math.round(delta / pxPerDay());
        const newStart = new Date(origStart + dayDelta * DAY_MS);
        const dur = daysBetween(parseDate(task.start), parseDate(task.end));
        task.start = newStart.toISOString().split("T")[0];
        task.end = addDays(newStart, dur).toISOString().split("T")[0];
        renderBody();
        opts.onTaskChange?.(task);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  function setupResize(_e: MouseEvent, task: GanttTask): void {
    let startX = _e.clientX;
    let origEnd = parseDate(task.end).getTime();

    const onMove = (me: MouseEvent) => {
      const delta = me.clientX - startX;
      const dayDelta = Math.round(delta / pxPerDay());
      const newEnd = new Date(origEnd + dayDelta * DAY_MS);
      if (newEnd <= parseDate(task.start)) return;
      task.end = newEnd.toISOString().split("T")[0];
      renderBody();
      opts.onTaskChange?.(task);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function renderDependencies(tasks: GanttTask[]): void {
    if (!svgOverlay) return;

    const taskPositions = new Map<string, { left: number; top: number; width: number }>();
    const bars = timelineArea.querySelectorAll(".gc-bar[data-task-id]");
    bars.forEach((bar) => {
      const id = bar.dataset.taskId!;
      const rect = bar.getBoundingClientRect();
      const areaRect = timelineArea.getBoundingClientRect();
      taskPositions.set(id, {
        left: rect.left - areaRect.left,
        top: rect.top - areaRect.top,
        width: rect.width,
      });
    });

    for (const task of tasks) {
      if (!task.dependencies) continue;
      for (const depId of task.dependencies) {
        const from = taskPositions.get(depId);
        const to = taskPositions.get(task.id);
        if (!from || !to) continue;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const sx = from.left + from.width;
        const sy = from.top + opts.barHeight / 2;
        const ex = to.left;
        const ey = to.top + opts.barHeight / 2;
        const mx = sx + (ex - sx) / 2;

        path.setAttribute("d", `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#9ca3af");
        path.setAttribute("stroke-width", "1.5");
        path.setAttribute("marker-end", "url(#gc-arrowhead)");

        svgOverlay.appendChild(path);
      }
    }

    // Arrow marker definition
    if (!document.getElementById("gc-arrowhead")) {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", "gc-arrowhead");
      marker.setAttribute("markerWidth", "10");
      marker.setAttribute("markerHeight", "7");
      marker.setAttribute("refX", "9");
      marker.setAttribute("refY", "3.5");
      marker.setAttribute("orient", "auto");
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("points", "0 0, 10 3.5, 0 7");
      poly.setAttribute("fill", "#9ca3af");
      marker.appendChild(poly);
      defs.appendChild(marker);
      svgOverlay.insertBefore(defs, svgOverlay.firstChild);
    }
  }

  // Scroll sync
  timelineArea.addEventListener("scroll", () => {
    scrollLeft = timelineArea.scrollLeft;
    // Could sync horizontal scrollbar here
  });

  // Initial render
  renderHeader();
  renderBody();

  const instance: GanttChartInstance = {
    element: root,

    getTasks() { return [...allTasks]; },

    setTasks(tasks) {
      allTasks = [...tasks];
      renderHeader();
      renderBody();
    },

    addTask(task) {
      allTasks.push(task);
      renderBody();
    },

    removeTask(id) {
      allTasks = allTasks.filter((t) => t.id !== id);
      renderBody();
    },

    updateTask(id, updates) {
      const idx = allTasks.findIndex((t) => t.id === id);
      if (idx >= 0) {
        allTasks[idx] = { ...allCards[idx], ...updates };
        renderBody();
      }
    },

    setZoom(zoom) {
      opts.zoom = zoom;
      renderHeader();
      renderBody();
      opts.onViewChange?.(viewStart, viewEnd);
    },

    scrollToTask(taskId) {
      const bar = timelineArea.querySelector(`[data-task-id="${taskId}"]`);
      if (bar) bar.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    },

    goToToday() {
      const today = new Date();
      const range = daysBetween(viewStart, viewEnd);
      viewStart = addDays(today, -range / 2);
      viewEnd = addDays(today, range / 2);
      renderHeader();
      renderBody();
      opts.onViewChange?.(viewStart, viewEnd);
    },

    fitToView() {
      if (allTasks.length === 0) return;
      let earliest = parseDate(allTasks[0].start);
      let latest = parseDate(allTasks[0].end);
      for (const t of allTasks) {
        const s = parseDate(t.start);
        const e = parseDate(t.end);
        if (s < earliest) earliest = s;
        if (e > latest) latest = e;
      }
      const padding = daysBetween(earliest, latest) * 0.15;
      viewStart = addDays(earliest, -padding);
      viewEnd = addDays(latest, padding);
      renderHeader();
      renderBody();
      opts.onViewChange?.(viewStart, viewEnd);
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
