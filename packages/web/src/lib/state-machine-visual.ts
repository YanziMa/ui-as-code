/**
 * State Machine Visualizer: SVG-based graph rendering for finite state machines,
 * hierarchical state machines, and statecharts. Supports interactive highlighting,
 * auto-layout (force-directed + layered), transition animation, Mermaid-like
 * diagram generation, and export to SVG/PNG.
 */

// --- Types ---

export interface VisualState {
  id: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  type?: "normal" | "initial" | "final" | "history" | "deepHistory";
  color?: string;
  substates?: VisualState[];
  isComposite?: boolean;
  isParallel?: boolean;
}

export interface VisualTransition {
  from: string;
  to: string;
  event?: string;
  guard?: string;
  action?: string;
  label?: string;
  color?: string;
  animated?: boolean;
  dashed?: boolean;
  selfLoop?: boolean;
}

export interface LayoutOptions {
  algorithm?: "force" | "layered" | "circular" | "grid";
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  iterations?: number;       // force-directed
  layers?: number;           // layered
  radius?: number;           // circular
  cols?: number;             // grid
  padding?: number;
  direction?: "lr" | "tb";   // layered direction
}

export interface RenderOptions {
  width?: number;
  height?: number;
  theme?: "light" | "dark";
  showLabels?: boolean;
  showGuards?: boolean;
  showActions?: boolean;
  highlightState?: string;
  highlightTransitions?: string[];
  animateTransitions?: boolean;
  curveRadius?: number;
  arrowSize?: number;
  fontSize?: number;
  fontFamily?: string;
  roundedCorners?: number;
  shadow?: boolean;
  gradient?: boolean;
}

export interface SvgDiagram {
  svg: string;
  width: number;
  height: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface StateMachineModel {
  states: VisualState[];
  transitions: VisualTransition[];
  initialState?: string;
  finalStates?: string[];
  name?: string;
}

export interface AnimationFrame {
  activeState: string;
  activeTransition?: string;
  progress: number; // 0-1
  timestamp: number;
}

// --- Color Themes ---

const THEMES = {
  light: {
    background: "#ffffff",
    stateFill: "#f8fafc",
    stateStroke: "#94a3b8",
    stateText: "#1e293b",
    initialFill: "#dbeafe",
    initialStroke: "#3b82f6",
    finalFill: "#dcfce7",
    finalStroke: "#22c55e",
    historyFill: "#fef3c7",
    historyStroke: "#f59e0b",
    transitionStroke: "#64748b",
    transitionLabel: "#475569",
    arrowFill: "#64748b",
    highlightFill: "#fef08a",
    highlightStroke: "#eab308",
    compositeFill: "#f1f5f9",
    compositeStroke: "#cbd5e1",
    textBg: "rgba(255,255,255,0.9)",
  },
  dark: {
    background: "#0f172a",
    stateFill: "#1e293b",
    stateStroke: "#475569",
    stateText: "#e2e8f0",
    initialFill: "#1e3a5f",
    initialStroke: "#60a5fa",
    finalFill: "#14532d",
    finalStroke: "#4ade80",
    historyFill: "#422006",
    historyStroke: "#fbbf24",
    transitionStroke: "#94a3b8",
    transitionLabel: "#cbd5e1",
    arrowFill: "#94a3b8",
    highlightFill: "#713f12",
    highlightStroke: "#facc15",
    compositeFill: "#1e293b",
    compositeStroke: "#334155",
    textBg: "rgba(15,23,42,0.9)",
  },
};

const STATE_TYPE_COLORS: Record<string, { fill: string; stroke: string }> = {
  normal:   { fill: "#f8fafc", stroke: "#94a3b8" },
  initial:  { fill: "#dbeafe", stroke: "#3b82f6" },
  final:    { fill: "#dcfce7", stroke: "#22c55e" },
  history:  { fill: "#fef3c7", stroke: "#f59e0b" },
  deepHistory: { fill: "#fef3c7", stroke: "#d97706" },
};

// --- Layout Algorithms ---

/** Force-directed layout using simple spring/repulsion model */
function forceDirectedLayout(
  states: VisualState[],
  transitions: VisualTransition[],
  opts: LayoutOptions = {},
): void {
  const w = opts.nodeWidth ?? 140;
  const h = opts.nodeHeight ?? 50;
  const spacingX = opts.horizontalSpacing ?? 80;
  const spacingY = opts.verticalSpacing ?? 60;
  const iters = opts.iterations ?? 100;

  // Initialize positions in a circle if not set
  const positioned = states.some((s) => s.x !== undefined && s.y !== undefined);
  if (!positioned) {
    const cx = 400, cy = 300, r = 200;
    states.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / states.length;
      s.x = cx + r * Math.cos(angle);
      s.y = cy + r * Math.sin(angle);
    });
  }

  // Build adjacency for attraction forces
  const adj = new Map<string, Set<string>>();
  for (const t of transitions) {
    if (!adj.has(t.from)) adj.set(t.from, new Set());
    if (!adj.has(t.to)) adj.set(t.to, new Set());
    adj.get(t.from)!.add(t.to);
    adj.get(t.to)!.add(t.from);
  }

  for (let iter = 0; iter < iters; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>();

    for (const s of states) {
      let fx = 0, fy = 0;

      // Repulsion between all pairs
      for (const other of states) {
        if (other.id === s.id) continue;
        const dx = (s.x ?? 0) - (other.x ?? 0);
        const dy = (s.y ?? 0) - (other.y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (spacingX * spacingY) / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      // Attraction along edges
      const neighbors = adj.get(s.id);
      if (neighbors) {
        for (const nid of neighbors) {
          const other = states.find((x) => x.id === nid);
          if (!other) continue;
          const dx = (other.x ?? 0) - (s.x ?? 0);
          const dy = (other.y ?? 0) - (s.y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - (spacingX + w)) * 0.05;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      }

      // Center gravity
      fx -= ((s.x ?? 0) - 400) * 0.01;
      fy -= ((s.y ?? 0) - 300) * 0.01;

      forces.set(s.id, { fx, fy });
    }

    // Apply forces with damping
    const temp = 1 - iter / iters;
    for (const s of states) {
      const f = forces.get(s.id)!;
      s.x = (s.x ?? 0) + f.fx * temp;
      s.y = (s.y ?? 0) + f.fy * temp;
    }
  }
}

/** Layered/Sugiyama-style layout */
function layeredLayout(
  states: VisualState[],
  transitions: VisualTransition[],
  opts: LayoutOptions = {},
): void {
  const w = opts.nodeWidth ?? 140;
  const h = opts.nodeHeight ?? 50;
  const hSpace = opts.horizontalSpacing ?? 80;
  const vSpace = opts.verticalSpacing ?? 70;
  const dir = opts.direction ?? "lr";

  // Build adjacency list
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, string[]>();
  for (const s of states) {
    inDegree.set(s.id, 0);
    outEdges.set(s.id, []);
  }
  for (const t of transitions) {
    if (t.from === t.to) continue; // skip self-loops
    outEdges.get(t.from)?.push(t.to);
    inDegree.set(t.to, (inDegree.get(t.to) ?? 0) + 1);
  }

  // Kahn's algorithm for topological sort into layers
  const layers: string[][] = [];
  const remaining = new Set(states.map((s) => s.id));
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  while (queue.length > 0 || remaining.size > 0) {
    const layer: string[] = [];
    // Process current queue
    while (queue.length > 0) {
      const id = queue.shift()!;
      layer.push(id);
      remaining.delete(id);
      for (const target of outEdges.get(id) ?? []) {
        if (remaining.has(target)) {
          inDegree.set(target, (inDegree.get(target) ?? 1) - 1);
          if ((inDegree.get(target) ?? 0) === 0) queue.push(target);
        }
      }
    }
    // If stuck (cycle), pick any remaining
    if (remaining.size > 0 && layer.length === 0) {
      const anyId = remaining.values().next().value!;
      layer.push(anyId);
      remaining.delete(anyId);
    }
    if (layer.length > 0) layers.push(layer);
  }

  // Assign positions
  const pad = opts.padding ?? 40;
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    const totalW = layer.length * w + (layer.length - 1) * hSpace;
    const startX = dir === "lr"
      ? pad + li * (w + vSpace)
      : pad + (Math.max(...layers.map((l) => l.length)) * w + (Math.max(...layers.map((l) => l.length) - 1) * hSpace) - totalW) / 2;

    for (let ni = 0; ni < layer.length; ni++) {
      const state = states.find((s) => s.id === layer[ni])!;
      if (dir === "lr") {
        state.x = startX;
        state.y = pad + ni * (h + hSpace);
      } else {
        state.x = startX + ni * (w + hSpace);
        state.y = pad + li * (h + vSpace);
      }
    }
  }
}

/** Circular layout */
function circularLayout(
  states: VisualState[],
  _transitions: VisualTransition[],
  opts: LayoutOptions = {},
): void {
  const radius = opts.radius ?? 200;
  const cx = 350, cy = 300;

  states.forEach((s, i) => {
    const angle = (2 * Math.PI * i) / states.length - Math.PI / 2;
    s.x = cx + radius * Math.cos(angle);
    s.y = cy + radius * Math.sin(angle);
  });
}

/** Grid layout */
function gridLayout(
  states: VisualState[],
  _transitions: VisualTransition[],
  opts: LayoutOptions = {},
): void {
  const cols = opts.cols ?? Math.ceil(Math.sqrt(states.length));
  const w = opts.nodeWidth ?? 140;
  const h = opts.nodeHeight ?? 50;
  const hSpace = opts.horizontalSpacing ?? 60;
  const vSpace = opts.verticalSpacing ?? 50;
  const pad = opts.padding ?? 40;

  states.forEach((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    s.x = pad + col * (w + hSpace);
    s.y = pad + row * (h + vSpace);
  });
}

// --- Path Generation ---

interface Point { x: number; y: number; }

/** Generate a curved path between two nodes */
function generateTransitionPath(
  from: VisualState,
  to: VisualState,
  selfLoop: boolean,
  curveRadius: number,
): { path: string; labelPos: Point; controlPoints: Point[] } {
  const fw = from.width ?? 140;
  const fh = from.height ?? 50;
  const tw = to.width ?? 140;
  const th = to.height ?? 50;
  const fx = from.x ?? 0, fy = from.y ?? 0;
  const tx = to.x ?? 0, ty = to.y ?? 0;

  if (selfLoop) {
    // Self-loop: arc above the node
    const loopR = Math.min(fw, fh) * 0.5;
    return {
      path: `M ${fx + fw * 0.3} ${fy} C ${fx + fw * 0.3} ${fy - loopR * 2}, ${fx + fw * 0.7} ${fy - loopR * 2}, ${fx + fw * 0.7} ${fy}`,
      labelPos: { x: fx + fw / 2, y: fy - loopR * 1.5 },
      controlPoints: [{ x: fx + fw * 0.3, y: fy - loopR * 2 }, { x: fx + fw * 0.7, y: fy - loopR * 2 }],
    };
  }

  // Find best connection points (edge midpoints)
  const fromCenter = { x: fx + fw / 2, y: fy + fh / 2 };
  const toCenter = { x: tx + tw / 2, y: ty + th / 2 };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  let startX: number, startY: number, endX: number, endY: number;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal dominant
    startX = dx > 0 ? fx + fw : fx;
    startY = fromCenter.y;
    endX = dx > 0 ? tx : tx + tw;
    endY = toCenter.y;
  } else {
    // Vertical dominant
    startX = fromCenter.x;
    startY = dy > 0 ? fy + fh : fy;
    endX = toCenter.x;
    endY = dy > 0 ? ty : ty + th;
  }

  // Curved path with control points
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const perpX = -(endY - startY);
  const perpY = endX - startX;
  const perpLen = Math.sqrt(perpX * perpX + perpY * perpLen) || 1;
  const offset = curveRadius * (perpLen > 0 ? 1 : 0);

  const cp1x = midX + (perpX / perpLen) * offset;
  const cp1y = midY + (perpY / perpLen) * offset;

  return {
    path: `M ${startX} ${startY} Q ${cp1x} ${cp1y} ${endX} ${endY}`,
    labelPos: { x: (startX + endX + cp1x) / 3, y: (startY + endY + cp1y) / 3 },
    controlPoints: [{ x: cp1x, y: cp1y }],
  };
}

/** Generate arrow marker definition */
function arrowMarkerDef(id: string, color: string, size: number): string {
  return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${size}" markerHeight="${size}" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}" />
  </marker>`;
}

// --- Main Renderer ---

/**
 * Render a state machine model as an SVG diagram.
 */
export function renderStateMachine(
  model: StateMachineModel,
  layoutOpts: LayoutOptions = {},
  renderOpts: RenderOptions = {},
): SvgDiagram {
  const opts: RenderOptions = {
    width: 800, height: 600,
    showLabels: true, showGuards: true, showActions: true,
    curveRadius: 30, arrowSize: 8, fontSize: 13,
    fontFamily: "system-ui, -apple-system, sans-serif",
    roundedCorners: 8, shadow: true, gradient: false,
    ...renderOpts,
  };

  const theme = THEMES[opts.theme ?? "light"];
  const states = [...model.states];
  const transitions = [...model.transitions];

  // Apply layout
  switch (layoutOpts.algorithm ?? "force") {
    case "layered": layeredLayout(states, transitions, layoutOpts); break;
    case "circular": circularLayout(states, transitions, layoutOpts); break;
    case "grid": gridLayout(states, transitions, layoutOpts); break;
    default: forceDirectedLayout(states, transitions, layoutOpts);
  }

  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of states) {
    const sw = s.width ?? 140;
    const sh = s.height ?? 50;
    minX = Math.min(minX, s.x ?? 0);
    minY = Math.min(minY, s.y ?? 0);
    maxX = Math.max(maxX, (s.x ?? 0) + sw);
    maxY = Math.max(maxY, (s.y ?? 0) + sh);
  }

  // Add padding
  const pad = (layoutOpts.padding ?? 40);
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;

  const diagramWidth = opts.width ?? Math.max(maxX - minX, 200);
  const diagramHeight = opts.height ?? Math.max(maxY - minY, 200);

  // Build SVG parts
  const parts: string[] = [];

  // Definitions (markers, gradients, shadows)
  parts.push(`<defs>`);
  parts.push(arrowMarkerDef("arrow-normal", theme.arrowFill, opts.arrowSize!));
  parts.push(arrowMarkerDef("arrow-highlight", opts.highlightTransitions?.length ? "#eab308" : theme.arrowFill, opts.arrowSize!));

  if (opts.shadow) {
    parts.push(`<filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="1" dy="2" stdDeviation="3" flood-opacity="0.1"/>
    </filter>`);
  }

  if (opts.gradient) {
    parts.push(`<linearGradient id="stateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${theme.stateFill}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${theme.compositeFill}" stop-opacity="1"/>
    </linearGradient>`);
  }
  parts.push(`</defs>`);

  // Background
  parts.push(`<rect width="100%" height="100%" fill="${theme.background}" rx="8"/>`);

  // Draw transitions first (behind states)
  for (const t of transitions) {
    const fromState = states.find((s) => s.id === t.from);
    const toState = states.find((s) => s.id === t.to);
    if (!fromState || !toState) continue;

    const isHighlighted = opts.highlightTransitions?.includes(`${t.from}->${t.to}`);
    const { path, labelPos } = generateTransitionPath(
      fromState, toState, t.selfLoop ?? false, opts.curveRadius!,
    );

    const strokeColor = t.color ?? (isHighlighted ? theme.highlightStroke : theme.transitionStroke);
    const dashArray = t.dashed ? "stroke-dasharray='6,3'" : "";
    const markerEnd = `url(#${isHighlighted ? "arrow-highlight" : "arrow-normal"})`;

    parts.push(`<path d="${path}" fill="none" stroke="${strokeColor}" stroke-width="2" ${dashArray} marker-end="${markerEnd}"/>`);

    // Transition label
    if (opts.showLabels && t.label || t.event) {
      const labelText = t.label ?? t.event ?? "";
      const fullLabel = [labelText];
      if (opts.showGuards && t.guard) fullLabel.push(`[${t.guard}]`);
      if (opts.showActions && t.action) fullLabel.push(`/ ${t.action}`);

      const text = fullLabel.join(" ");
      parts.push(`<rect x="${labelPos.x - text.length * 3}" y="${labelPos.y - 10}" width="${text.length * 6 + 8}" height="18" rx="3" fill="${theme.textBg}"/>`);
      parts.push(`<text x="${labelPos.x}" y="${labelPos.y + 3}" fill="${theme.transitionLabel}" font-size="${(opts.fontSize! - 1)}" font-family="${opts.fontFamily}" text-anchor="middle">${escapeSvg(text)}</text>`);
    }
  }

  // Draw states
  for (const s of states) {
    const sx = s.x ?? 0, sy = s.y ?? 0;
    const sw = s.width ?? 140, sh = s.height ?? 50;
    const typeColors = STATE_TYPE_COLORS[s.type ?? "normal"] ?? STATE_TYPE_COLORS.normal;
    const isHighlighted = opts.highlightState === s.id;
    const fill = isHighlighted ? theme.highlightFill : (s.color ?? typeColors.fill);
    const stroke = isHighlighted ? theme.highlightStroke : (typeColors.stroke);

    const filterAttr = opts.shadow ? ' filter="url(#shadow)"' : "";

    if (s.type === "initial") {
      // Initial state: filled circle (small)
      const r = 10;
      parts.push(`<circle cx="${sx + sw / 2}" cy="${sy + sh / 2}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"${filterAttr}/>`);

      // Label next to it
      if (opts.showLabels) {
        parts.push(`<text x="${sx + sw / 2 + r + 8}" y="${sy + sh / 2 + 4}" fill="${theme.stateText}" font-size="${opts.fontSize}" font-family="${opts.fontFamily}">${escapeSvg(s.label)}</text>`);
      }
    } else if (s.type === "final") {
      // Final state: double circle
      const rx = sw / 2, ry = sh / 2;
      const innerRx = rx - 5, innerRy = ry - 5;
      parts.push(`<ellipse cx="${sx + rx}" cy="${sy + ry}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="2"${filterAttr}/>`);
      parts.push(`<ellipse cx="${sx + rx}" cy="${sy + ry}" rx="${innerRx}" ry="${innerRy}" fill="none" stroke="${stroke}" stroke-width="2"/>`);

      if (opts.showLabels) {
        parts.push(`<text x="${sx + rx}" y="${sy + ry + 4}" fill="${theme.stateText}" font-size="${opts.fontSize}" font-family="${opts.fontFamily}" text-anchor="middle">${escapeSvg(s.label)}</text>`);
      }
    } else if (s.isComposite) {
      // Composite state: rounded rect with border
      parts.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${opts.roundedCorners}" fill="${theme.compositeFill}" stroke="${theme.compositeStroke}" stroke-width="2" stroke-dasharray="5,3"${filterAttr}/>`);
      parts.push(`<text x="${sx + sw / 2}" y="${sy + 16}" fill="${theme.stateText}" font-size="${opts.fontSize}" font-weight="bold" font-family="${opts.fontFamily}" text-anchor="middle">${escapeSvg(s.label)}</text>`);

      // Draw substates inside
      if (s.substates) {
        const subPad = 25;
        for (const sub of s.substates) {
          const subX = sx + (sub.x ?? subPad);
          const subY = sy + (sub.y ?? 30);
          const subW = sub.width ?? 100;
          const subH = sub.height ?? 35;
          parts.push(`<rect x="${subX}" y="${subY}" width="${subW}" height="${subH}" rx="5" fill="${theme.stateFill}" stroke="${theme.stateStroke}" stroke-width="1.5"/>`);
          parts.push(`<text x="${subX + subW / 2}" y="${subY + subH / 2 + 4}" fill="${theme.stateText}" font-size="${opts.fontSize! - 2}" font-family="${opts.fontFamily}" text-anchor="middle">${escapeSvg(sub.label)}</text>`);
        }
      }
    } else {
      // Normal state: rounded rectangle
      parts.push(`<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${opts.roundedCorners}" fill="${fill}" stroke="${stroke}" stroke-width="2"${filterAttr}/>`);
      if (opts.showLabels) {
        parts.push(`<text x="${sx + sw / 2}" y="${sy + sh / 2 + 4}" fill="${theme.stateText}" font-size="${opts.fontSize}" font-family="${opts.fontFamily}" text-anchor="middle">${escapeSvg(s.label)}</text>`);
      }
    }
  }

  // Title
  if (model.name) {
    parts.push(`<text x="16" y="24" fill="${theme.stateText}" font-size="16" font-weight="bold" font-family="${opts.fontFamily}">${escapeSvg(model.name)}</text>`);
  }

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${diagramWidth}" height="${diagramHeight}" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}">
${parts.join("\n")}
</svg>`;

  return {
    svg: svgContent,
    width: diagramWidth,
    height: diagramHeight,
    bounds: { minX, minY, maxX, maxY },
  };
}

// --- Mermaid-like Text Diagram Generator ---

/**
 * Generate a Mermaid-compatible state diagram string from a model.
 */
export function toMermaidDiagram(model: StateMachineModel, options: { compact?: boolean } = {}): string {
  const lines: string[] = ["stateDiagram-v2"];

  if (model.name && !options.compact) {
    lines.push(`  title: ${model.name}`);
  }

  // States
  for (const s of model.states) {
    if (s.type === "initial") {
      lines.push(`  [*] --> ${s.id}`);
    } else if (s.type === "final") {
      lines.push(`  ${s.id} --> [*]`);
    }

    if (s.isComposite && s.substates) {
      lines.push(`  state "${s.label}" as ${s.id} {`);
      for (const sub of s.substates) {
        lines.push(`    ${sub.id}: ${sub.label}`);
      }
      lines.push(`  }`);
    } else if (s.type !== "initial") {
      lines.push(`  state "${s.label}" as ${s.id}`);
    }
  }

  // Transitions
  for (const t of model.transitions) {
    let label = t.event ?? "";
    if (t.guard) label += ` [${t.guard}]`;
    if (t.action) label += ` / ${t.action}`;
    const labelStr = label ? ` : ${label}` : "";
    lines.push(`  ${t.from} --> ${t.to}${labelStr}`);
  }

  return lines.join("\n");
}

/**
 * Generate a PlantUML state diagram string.
 */
export function toPlantUmlDiagram(model: StateMachineModel): string {
  const lines: string[] = ["@startuml", "skinparam state {", "  BackgroundColor<<initial>> LightBlue", "  BorderColor<<final>> Green", "}"];

  if (model.name) lines.push(`title ${model.name}`);

  for (const s of model.states) {
    if (s.type === "initial") {
      lines.push(`[*] --> ${s.id}`);
    } else if (s.type === "final") {
      lines.push(`state "${s.label}" as ${s.id} <<final>>`);
      lines.push(`${s.id} --> [*]`);
    } else {
      lines.push(`state "${s.label}" as ${s.id}`);
    }
  }

  for (const t of model.transitions) {
    let label = t.event ?? "";
    if (t.guard) label += ` [${t.guard}]`;
    if (t.action) label += ` / ${t.action}`;
    lines.push(`${t.id ?? `${t.from}_${t.to}`} : ${label}`);
    lines.push(`${t.from} --> ${t.to} : ${label}`);
  }

  lines.push("@enduml");
  return lines.join("\n");
}

// --- Interactive Highlighting ---

/**
 * Create an interactive SVG state machine viewer.
 * Returns controller methods for programmatic interaction.
 */
export function createInteractiveViewer(
  container: HTMLElement,
  model: StateMachineModel,
  options: RenderOptions & LayoutOptions = {},
): StateMachineViewer {
  const viewer = new StateMachineViewer(container, model, options);
  viewer.render();
  return viewer;
}

export class StateMachineViewer {
  private container: HTMLElement;
  private model: StateMachineModel;
  private renderOpts: RenderOptions;
  private layoutOpts: LayoutOptions;
  private currentHighlight: string | null = null;
  private activeTransitions: Set<string> = new Set();
  private onStateClickCallbacks: ((stateId: string) => void)[] = [];
  private onTransitionClickCallbacks: ((transition: VisualTransition) => void)[] = [];
  private animationTimer: ReturnType<typeof setTimeout> | null = null;
  private animationQueue: AnimationFrame[] = [];
  private animationIndex = 0;

  constructor(
    container: HTMLElement,
    model: StateMachineModel,
    options: RenderOptions & LayoutOptions = {},
  ) {
    this.container = container;
    this.model = JSON.parse(JSON.stringify(model)); // Deep clone
    this.renderOpts = options;
    this.layoutOpts = options;
  }

  /** Re-render the diagram */
  render(): void {
    const diagram = renderStateMachine(this.model, this.layoutOpts, this.renderOpts);
    this.container.innerHTML = diagram.svg;
    this.attachEventListeners();
  }

  /** Highlight a specific state */
  highlightState(stateId: string | null): void {
    this.currentHighlight = stateId;
    this.renderOpts.highlightState = stateId ?? undefined;
    this.render();
  }

  /** Highlight specific transitions */
  highlightTransitions(transitionKeys: string[]): void {
    this.activeTransitions = new Set(transitionKeys);
    this.renderOpts.highlightTransitions = transitionKeys;
    this.render();
  }

  /** Clear all highlights */
  clearHighlights(): void {
    this.currentHighlight = null;
    this.activeTransitions.clear();
    this.renderOpts.highlightState = undefined;
    this.renderOpts.highlightTransitions = undefined;
    this.render();
  }

  /** Change layout algorithm */
  setLayout(algorithm: LayoutOptions["algorithm"], extraOpts?: Partial<LayoutOptions>): void {
    this.layoutOpts.algorithm = algorithm;
    Object.assign(this.layoutOpts, extraOpts ?? {});
    this.render();
  }

  /** Toggle dark/light theme */
  setTheme(theme: "light" | "dark"): void {
    this.renderOpts.theme = theme;
    this.render();
  }

  /** Register click handler for states */
  onStateClick(fn: (stateId: string) => void): void {
    this.onStateClickCallbacks.push(fn);
  }

  /** Register click handler for transitions */
  onTransitionClick(fn: (transition: VisualTransition) => void): void {
    this.onTransitionClickCallbacks.push(fn);
  }

  /** Play an animation sequence through states */
  playAnimation(frames: AnimationFrame[], speedMs = 500): void {
    this.stopAnimation();
    this.animationQueue = frames;
    this.animationIndex = 0;

    const advance = () => {
      if (this.animationIndex >= this.animationQueue.length) {
        this.clearHighlights();
        return;
      }
      const frame = this.animationQueue[this.animationIndex]!;
      this.highlightState(frame.activeState);
      if (frame.activeTransition) {
        this.highlightTransitions([frame.activeTransition]);
      }
      this.animationIndex++;
      this.animationTimer = setTimeout(advance, speedMs);
    };

    advance();
  }

  /** Stop running animation */
  stopAnimation(): void {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    this.animationQueue = [];
    this.animationIndex = 0;
  }

  /** Get raw SVG string */
  getSvgString(): string {
    const diagram = renderStateMachine(this.model, this.layoutOpts, this.renderOpts);
    return diagram.svg;
  }

  /** Export as data URL for download/image */
  exportAsDataUrl(type: "svg" | "png" = "svg"): string {
    const svg = this.getSvgString();
    if (type === "svg") {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }
    // For PNG, we'd need canvas - return SVG data URL as fallback
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  /** Update the model dynamically */
  updateModel(partial: Partial<StateMachineModel>): void {
    Object.assign(this.model, partial);
    this.render();
  }

  private attachEventListeners(): void {
    // Find all state rects/circles in the SVG
    const svgs = this.container.querySelectorAll<SVGElement>("svg");
    svgs.forEach((svg) => {
      svg.querySelectorAll<SVGRectElement>("rect[data-state-id], circle[data-state-id]").forEach((el) => {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => {
          const stateId = el.getAttribute("data-state-id");
          if (stateId) {
            this.onStateClickCallbacks.forEach((fn) => fn(stateId));
          }
        });
      });

      svg.querySelectorAll<SVGPathElement>("path[data-transition]").forEach((el) => {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => {
          const transKey = el.getAttribute("data-transition");
          if (transKey) {
            const [from, to] = transKey.split("->");
            const trans = this.model.transitions.find(
              (t) => t.from === from && t.to === to,
            );
            if (trans) {
              this.onTransitionClickCallbacks.forEach((fn) => fn(trans));
            }
          }
        });
      });
    });
  }
}

// --- Utility Functions ---

/** Escape special XML characters for SVG content */
function escapeSvg(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build a StateMachineModel from a simpler declarative format.
 * Useful for quick diagram generation without manual coordinate setup.
 */
export function buildModel(definition: {
  name?: string;
  states: Record<string, { label?: string; type?: VisualState["type"]; initial?: boolean; final?: boolean }>;
  transitions: Array<{ from: string; to: string; event?: string; guard?: string; action?: string }>;
}): StateMachineModel {
  const states: VisualState[] = [];
  const transitions: VisualTransition[] = [];
  let initialState: string | undefined;

  for (const [id, def] of Object.entries(definition.states)) {
    const stateType: VisualState["type"] = def.initial ? "initial" : def.final ? "final" : "normal";
    if (def.initial) initialState = id;
    states.push({
      id,
      label: def.label ?? id,
      type: stateType,
      x: 0, y: 0, // Will be set by layout
    });
  }

  for (const t of definition.transitions) {
    transitions.push({
      from: t.from,
      to: t.to,
      event: t.event,
      guard: t.guard,
      action: t.action,
      selfLoop: t.from === t.to,
    });
  }

  return {
    name: definition.name,
    states,
    transitions,
    initialState,
    finalStates: states.filter((s) => s.type === "final").map((s) => s.id),
  };
}

/**
 * Extract reachable states from a starting state via BFS.
 */
export function getReachableStates(
  model: StateMachineModel,
  startState: string,
): string[] {
  const visited = new Set<string>();
  const queue: string[] = [startState];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const t of model.transitions) {
      if (t.from === current && !visited.has(t.to)) {
        queue.push(t.to);
      }
    }
  }

  return Array.from(visited);
}

/**
 * Find all paths between two states (for analysis/debugging).
 */
export function findAllPaths(
  model: StateMachineModel,
  from: string,
  to: string,
  maxDepth = 20,
): string[][] {
  const results: string[][] = [];

  function dfs(current: string, path: string[], visited: Set<string>) {
    if (path.length > maxDepth) return;
    if (current === to) {
      results.push([...path]);
      return;
    }

    for (const t of model.transitions) {
      if (t.from === current && !visited.has(t.to)) {
        visited.add(t.to);
        path.push(t.to);
        dfs(t.to, path, visited);
        path.pop();
        visited.delete(t.to);
      }
    }
  }

  dfs(from, [from], new Set([from]));
  return results;
}

/**
 * Validate a state machine model for common issues:
 * - Unreachable states
 * - Dead-end states (no outgoing transitions)
 * - Missing initial state
 * - Orphan states (not connected at all)
 */
export function validateModel(model: StateMachineModel): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: { totalStates: number; totalTransitions: number; reachableCount: number; deadEndCount: number };
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check initial state
  if (!model.initialState) {
    const hasExplicitInitial = model.states.some((s) => s.type === "initial");
    if (!hasExplicitInitial) {
      warnings.push("No initial state defined");
    }
  }

  // Check reachability
  const start = model.initialState ?? model.states[0]?.id;
  const reachable = start ? new Set(getReachableStates(model, start)) : new Set<string>();

  for (const s of model.states) {
    if (!reachable.has(s.id) && s.type !== "initial") {
      warnings.push(`State "${s.label}" (${s.id}) is unreachable from initial state`);
    }
  }

  // Check dead ends
  let deadEndCount = 0;
  for (const s of model.states) {
    if (s.type === "final") continue;
    const hasOutgoing = model.transitions.some((t) => t.from === s.id);
    if (!hasOutgoing) {
      warnings.push(`State "${s.label}" (${s.id}) has no outgoing transitions (dead end)`);
      deadEndCount++;
    }
  }

  // Check orphan states
  const connected = new Set<string>();
  for (const t of model.transitions) {
    connected.add(t.from);
    connected.add(t.to);
  }
  for (const s of model.states) {
    if (!connected.has(s.id) && model.transitions.length > 0) {
      warnings.push(`State "${s.label}" (${s.id}) is not connected to any transition`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalStates: model.states.length,
      totalTransitions: model.transitions.length,
      reachableCount: reachable.size,
      deadEndCount,
    },
  };
}
