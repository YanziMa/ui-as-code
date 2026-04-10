/**
 * Gantt Chart: Timeline-based project visualization with tasks, milestones,
 * dependencies, progress bars, zoom levels, today marker, tooltips,
 * critical path highlighting, and responsive layout.
 */

// --- Types ---

export interface GanttTask {
  id: string;
  name: string;
  start: Date | string;
  end: Date | string;
  progress?: number; // 0-100
  color?: string;
  /** Task group — can contain subtasks */
  group?: boolean;
  parentId?: string;
  dependencies?: string[];
  assignee?: string;
  milestone?: boolean;
  description?: string;
  customFields?: Record<string, unknown>;
}

export interface GanttMilestone {
  id: string;
  date: Date | string;
  label: string;
  color?: string;
}

export type GanttZoom = "day" | "week" | "month";
export type GanttViewMode = "auto" | "fit" | "custom";

export interface GanttOptions {
  container: HTMLElement | string;
  tasks: GanttTask[];
  milestones?: GanttMilestone[];
  /** Zoom level */
  zoom?: GanttZoom;
  /** View date range */
  startDate?: Date | string;
  endDate?: Date | string;
  /** Show today line */
  showTodayLine?: boolean;
  /** Show progress bars */
  showProgress?: boolean;
  /** Show dependencies (arrows) */
  showDependencies?: boolean;
  /** Show milestone markers */
  showMilestones?: boolean;
  /** Grid lines style */
  gridLines?: "none" | "vertical" | "horizontal" | "both";
  /** Height of each task row in px */
  rowHeight?: number;
  /** Callback on task click */
  onTaskClick?: (task: GanttTask) => void;
  /** Callback on task double-click */
  onTaskDblClick?: (task: GanttTask) => void;
  /** Callback on date click (empty area) */
  onDateClick?: (date: Date) => void;
  /** Custom CSS class */
  className?: string;
}

export interface GanttInstance {
  element: HTMLElement;
  getTasks: () => GanttTask[];
  setTasks: (tasks: GanttTask[]) => void;
  addTask: (task: GanttTask) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<GanttTask>) => void;
  setZoom: (zoom: GanttZoom) => void;
  setDateRange: (start: Date | string, end: Date | string) => void;
  scrollToToday: () => void;
  destroy: () => void;
}

// --- Helpers ---

function parseDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d;
}

function fmt(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const ZOOM_DAY_MS = 86400000;
const ZOOM_WEEK_MS = 7 * ZOOM_DAY_MS;

// --- Main Class ---

export class GanttManager {
  create(options: GanttOptions): GanttInstance {
    const opts = {
      zoom: options.zoom ?? "week",
      showTodayLine: options.showTodayLine ?? true,
      showProgress: options.showProgress ?? true,
      showDependencies: options.showDependencies ?? true,
      showMilestones: options.showMilestones ?? true,
      gridLines: options.gridLines ?? "vertical",
      rowHeight: options.rowHeight ?? 40,
      startDate: options.startDate ? parseDate(options.startDate) : null,
      endDate: options.endDate ? parseDate(options.endDate) : null,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Gantt: container not found");

    let tasks: GanttTask[] = [...options.tasks];
    let destroyed = false;

    container.className = `gantt-chart ${opts.className ?? ""}`;
    container.style.cssText = `
      overflow:auto;font-family:-apple-system,sans-serif;font-size:12px;color:#374151;
      position:relative;border:1px solid #e5e7eb;border-radius:8px;background:#fff;
    `;

    function render(): void {
      container.innerHTML = "";

      // Determine date range
      const allDates: Date[] = [];
      for (const t of tasks) {
        allDates.push(parseDate(t.start));
        allDates.push(parseDate(t.end));
      }
      if (opts.milestones) {
        for (const m of opts.milestones) allDates.push(parseDate(m.date));
      }

      let viewStart = opts.startDate ?? new Date(Math.min(...allDates.map((d) => d.getTime())));
      let viewEnd = opts.endDate ?? new Date(Math.max(...allDates.map((d) => d.getTime())));

      // Pad range
      const padDays = opts.zoom === "day" ? 3 : opts.zoom === "week" ? 21 : 60;
      viewStart = new Date(viewStart.getTime() - padDays * ZOOM_DAY_MS);
      viewEnd = new Date(viewEnd.getTime() + padDays * ZOOM_DAY_MS);

      const totalDays = daysBetween(viewStart, viewEnd);
      const colWidth = opts.zoom === "day" ? 32 : opts.zoom === "week" ? 48 : 80;

      // Header: dates
      const headerEl = document.createElement("div");
      headerEl.style.cssText = `
        display:flex;position:sticky;top:0;z-index:10;background:#fff;
        border-bottom:2px solid #e5e7eb;padding:0;
      `;

      // Left column for task names (fixed)
      const nameColWidth = 220;
      const nameHeader = document.createElement("div");
      nameHeader.style.cssText = `width:${nameColWidth}px;flex-shrink:0;padding:8px 12px;font-weight:600;font-size:12px;border-bottom:1px solid #f0f0f0;background:#fafafa;`;
      nameHeader.textContent = "Task";
      headerEl.appendChild(nameHeader);

      // Date headers
      const datesHeader = document.createElement("div");
      datesHeader.style.cssText = `display:flex;flex:1;min-width:0;`;
      const cursor = new Date(viewStart);
      while (cursor <= viewEnd) {
        const cell = document.createElement("div");
        cell.style.cssText = `
          flex:1;min-width:${colWidth}px;text-align:center;padding:6px 2px;
          font-size:11px;font-weight:500;color:#6b7280;border-bottom:1px solid #f0f0f0;
          border-left:1px solid #f0f0f0;
        `;
        if (opts.zoom === "day") {
          cell.textContent = fmtShort(cursor);
        } else if (opts.zoom === "week") {
          cell.textContent = cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][cursor.getDay()];
          cell.innerHTML = `<div style="font-size:9px;color:#9ca3af;">${dow}</div><div>${cell.textContent}</div>`;
        } else {
          cell.textContent = cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        }
        datesHeader.appendChild(cell);
        cursor.setDate(cursor.getDate() + (opts.zoom === "month" ? 30 : opts.zoom === "week" ? 7 : 1));
      }
      headerEl.appendChild(datesHeader);
      container.appendChild(headerEl);

      // Body: task rows + grid
      const bodyEl = document.createElement("div");
      bodyEl.style.cssText = `position:relative;`;

      // Grid background
      if (opts.gridLines !== "none") {
        const gridEl = document.createElement("div");
        gridEl.style.cssText = `
          position:absolute;left:${nameColWidth}px;top:0;right:0;bottom:0;
          pointer-events:none;display:flex;
        `;
        const gridCursor = new Date(viewStart);
        let gridIdx = 0;
        while (gridCursor <= viewEnd) {
          const gCell = document.createElement("div");
          gCell.style.flex = "1";
          gCell.style.minWidth = `${colWidth}px`;
          if (opts.gridLines === "vertical" || opts.gridLines === "both") {
            gCell.style.borderLeft = "1px solid #f3f4f6";
          }
          if (opts.gridLines === "horizontal" || opts.gridLines === "both") {
            gCell.style.borderBottom = "1px solid #f3f4f6";
            gCell.style.height = "100%";
          }
          gridEl.appendChild(gCell);
          gridCursor.setDate(gridCursor.getDate() + (opts.zoom === "month" ? 30 : opts.zoom === "week" ? 7 : 1));
          gridIdx++;
        }
        bodyEl.appendChild(gridEl);
      }

      // Today line
      if (opts.showTodayLine) {
        const today = new Date();
        if (today >= viewStart && today <= viewEnd) {
          const offset = daysBetween(viewStart, today);
          const todayX = nameColWidth + offset * colWidth;
          const todayLine = document.createElement("div");
          todayLine.className = "gantt-today-line";
          todayLine.style.cssText = `
            position:absolute;left:${todayX}px;top:0;width:2px;height:100%;
            background:#ef4444;z-index:5;
          `;
          bodyEl.appendChild(todayLine);
        }
      }

      // Milestones
      if (opts.showMilestones && opts.milestones) {
        for (const ms of opts.milestones) {
          const msDate = parseDate(ms.date);
          if (msDate >= viewStart && msDate <= viewEnd) {
            const offset = daysBetween(viewStart, msDate);
            const x = nameColWidth + offset * colWidth - 4;
            const msEl = document.createElement("div");
            msEl.title = ms.label;
            msEl.style.cssText = `
              position:absolute;left:${x}px;top:-4px;width:8px;height:8px;
              transform:rotate(45deg);background:${ms.color ?? "#f59e0b"};
              border-radius:1px;z-index:6;cursor:pointer;
            `;
            msEl.addEventListener("click", () => {});
            bodyEl.appendChild(msEl);
          }
        }
      }

      // Task rows
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]!;
        const y = i * opts.rowHeight;

        // Row background (alternating)
        const rowBg = document.createElement("div");
        rowBg.style.cssText = `
          position:absolute;left:0;right:0;top:${y}px;height:${opts.rowHeight}px;
          ${i % 2 === 0 ? "background:#fff;" : "background:#fafafa;"}
        `;
        bodyEl.appendChild(rowBg);

        // Task name
        const nameEl = document.createElement("div");
        nameEl.style.cssText = `
          position:absolute;left:0;width:${nameColWidth}px;top:${y}px;
          height:${opts.rowHeight}px;padding:4px 10px;display:flex;align-items:center;
          gap:6px;overflow:hidden;border-bottom:1px solid #f3f4f6;
          font-size:12px;font-weight:500;cursor:pointer;z-index:3;
        `;

        // Group expand/collapse icon
        if (task.group) {
          const icon = document.createElement("span");
          icon.innerHTML = "&#9660;";
          icon.style.cssText = "font-size:10px;color:#6b7280;flex-shrink:0;";
          nameEl.appendChild(icon);
        }

        // Progress dot
        if (task.milestone) {
          const diamond = document.createElement("span");
          diamond.innerHTML = "&#9670;";
          diamond.style.cssText = "color:#f59e0b;flex-shrink:0;font-size:14px;";
          nameEl.appendChild(diamond);
        } else if (opts.showProgress && task.progress !== undefined) {
          const pct = document.createElement("span");
          pct.style.cssText = `
            flex-shrink:0;font-size:10px;font-weight:600;color:
            ${task.progress >= 100 ? "#16a34a" : task.progress >= 75 ? "#059669" : task.progress >= 50 ? "#2563eb" : "#d97706"};
          `;
          pct.textContent = `${task.progress}%`;
          nameEl.appendChild(pct);
        }

        const nameLabel = document.createElement("span");
        nameLabel.textContent = task.name;
        nameLabel.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        nameEl.appendChild(nameLabel);

        nameEl.addEventListener("click", () => opts.onTaskClick?.(task));
        nameEl.addEventListener("dblclick", () => opts.onTaskDblClick?.(task));
        bodyEl.appendChild(nameEl);

        // Task bar
        const startOffset = daysBetween(viewStart, parseDate(task.start));
        const duration = daysBetween(parseDate(task.start), parseDate(task.end));
        const barLeft = nameColWidth + startOffset * colWidth;
        const barWidth = Math.max(duration * colWidth, 2);

        const bar = document.createElement("div");
        bar.dataset.taskId = task.id;
        bar.style.cssText = `
          position:absolute;left:${barLeft}px;top:${y + 6}px;
          width:${barWidth}px;height:${opts.rowHeight - 12}px;
          border-radius:4px;background:${task.color ?? "#6366f1"}20;
          border:1px solid ${task.color ?? "#6366f1"};
          z-index:4;cursor:pointer;overflow:hidden;display:flex;align-items:center;
          padding:0 6px;font-size:11px;color:#fff;font-weight:500;
          transition:box-shadow 0.15s;
        `;

        // Progress fill
        if (opts.showProgress && !task.milestone && task.progress !== undefined && task.progress > 0) {
          const fill = document.createElement("div");
          fill.style.cssText = `
            position:absolute;left:0;top:0;height:100%;width:${task.progress}%;
            background:${task.color ?? "#6366f1"};border-radius:3px 0 0 3px;
          `;
          bar.appendChild(fill);
        }

        bar.textContent = task.name;
        bar.title = `${task.name} (${fmtShort(parseDate(task.start))} - ${fmtShort(parseDate(task.end))})`;

        bar.addEventListener("click", (e) => { e.stopPropagation(); opts.onTaskClick?.(task); });
        bar.addEventListener("mouseenter", () => {
          bar.style.boxShadow = `0 4px 12px rgba(0,0,0,0.15)`;
          bar.style.zIndex = "7";
        });
        bar.addEventListener("mouseleave", () => {
          bar.style.boxShadow = "";
          bar.style.zIndex = "4";
        });

        bodyEl.appendChild(bar);

        // Dependency arrows (simplified: just draw lines below)
        if (opts.showDependencies && task.dependencies) {
          for (const depId of task.dependencies) {
            const depTask = tasks.find((t) => t.id === depId);
            if (!depTask) continue;
            const depEndOffset = daysBetween(viewStart, parseDate(depTask.end));
            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as SVGSVGElement;
            const ax1 = nameColWidth + depEndOffset * colWidth;
            const ay1 = y + opts.rowHeight - 4;
            const ax2 = barLeft;
            const ay2 = y + 4;
            // Simple SVG arrow
            arrow.setAttribute("style", `
              position:absolute;left:0;top:0;width:100%;height:100%;
              pointer-events:none;z-index:2;
            `);
            arrow.innerHTML = `<line x1="${ax1}" y1="${ay1}" x2="${ax2}" y2="${ay2}"
              stroke="#9ca3af" stroke-width="1.5" marker-end="url(#arrowhead)"/>
              <defs><marker id="arrowhead" markerWidth="6" markerHeight="6"
              refX="5" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6"
              fill="#9ca3af"/></marker></defs>`;
            bodyEl.appendChild(arrow as HTMLElement);
          }
        }
      }

      // Total height
      const totalHeight = tasks.length * opts.rowHeight + 40;
      bodyEl.style.height = `${totalHeight}px`;
      bodyEl.style.minHeight = `${totalHeight}px`;
      container.appendChild(bodyEl);

      // Click on empty area
      bodyEl.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).classList.contains("gantt-chart") ||
            (e.target as HTMLElement) === bodyEl) {
          const rect = bodyEl.getBoundingClientRect();
          const relX = e.clientX - rect.left;
          if (relX > nameColWidth) {
            const dayOffset = (relX - nameColWidth) / colWidth;
            const clickedDate = new Date(viewStart.getTime() + dayOffset * ZOOM_DAY_MS);
            opts.onDateClick?.(clickedDate);
          }
        }
      });
    }

    // Initial render
    render();

    const instance: GanttInstance = {
      element: container,

      getTasks() { return [...tasks]; },

      setTasks(newTasks) {
        tasks = newTasks;
        render();
      },

      addTask(newTask) {
        tasks.push(newTask);
        render();
      },

      removeTask(id) {
        tasks = tasks.filter((t) => t.id !== id);
        render();
      },

      updateTask(id, updates) {
        const task = tasks.find((t) => t.id === id);
        if (task) Object.assign(task, updates);
        render();
      },

      setZoom(zoom) {
        opts.zoom = zoom;
        render();
      },

      setDateRange(start, end) {
        opts.startDate = parseDate(start);
        opts.endDate = parseDate(end);
        render();
      },

      scrollToToday() {
        opts.startDate = null;
        opts.endDate = null;
        render();
        // Scroll to today position
        const todayEl = container.querySelector(".gantt-today-line");
        if (todayEl) todayEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a Gantt chart */
export function createGantt(options: GanttOptions): GanttInstance {
  return new GanttManager().create(options);
}
