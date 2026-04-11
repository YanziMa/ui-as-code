/**
 * State Machine Visualizer — renders finite state machine diagrams as SVG/HTML
 * from declarative state definitions, with animated transitions, layout
 * algorithms, interactive node highlighting, and export capabilities.
 *
 * Pure rendering module — does not include the state machine execution engine.
 */

// --- Types ---

export type StateId = string;

export type EventLabel = string;

export interface StateNode {
  id: StateId;
  /** Display label (defaults to id) */
  label?: string;
  /** Is this an initial state? */
  initial?: boolean;
  /** Is this an accepting/final state? */
  accepting?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Position override ({x, y}) — otherwise auto-layout */
  position?: { x: number; y: number };
  /** Additional metadata for tooltip etc. */
  meta?: Record<string, unknown>;
}

export interface TransitionEdge {
  from: StateId;
  to: StateId;
  label?: EventLabel;
  /** Guard condition text */
  guard?: string;
  /** Action text */
  action?: string;
  /** Is this a self-loop? (auto-detected if from === to) */
  selfLoop?: boolean;
  /** Group/layer for edge styling */
  group?: string;
  /** Custom style overrides */
  style?: Partial<CSSStyleDeclaration>;
}

export interface MachineDefinition {
  /** Name of the machine */
  name?: string;
  /** States */
  states: StateNode[];
  /** Transitions */
  transitions: TransitionEdge[];
  /** Initial state ID */
  initialState?: StateId;
  /** Groups/clusters of states */
  groups?: Array<{
    name: string;
    states: StateId[];
    color?: string;
    label?: string;
  }>;
}

export interface VizOptions {
  /** Render target container */
  container: HTMLElement;
  /** Canvas width (default: 800) */
  width?: number;
  /** Canvas height (default: auto-calculated) */
  height?: number;
  /** Node size in px (default: 60) */
  nodeSize?: number;
  /** Layout algorithm: "force" | "hierarchical" | "circular" | "grid" (default: "force") */
  layout?: "force" | "hierarchical" | "circular" | "grid";
  /** Node border radius (default: 8) */
  radius?: number;
  /** Show labels on edges (default: true) */
  showLabels?: boolean;
  /** Show guards/actions on edges (default: true) */
  showDetails?: bool;
  /** Color theme */
  colors?: VizColorTheme;
  /** Animate transitions (default: true) */
  animated?: boolean;
  /** Animation speed multiplier (default: 1) */
  animationSpeed?: number;
  /** Click callback on nodes */
  onNodeClick?: (state: StateNode) => void;
  /** Hover callback on nodes */
  onNodeHover?: (state: StateNode | null) => void;
  /** Callback after render completes */
  onRendered?: (svgEl: SVGSVGElement) => void;
  /** Direction: "lr" | "rl" | "tb" | "bt" (for hierarchical layout) */
  direction?: "lr" | "rl" | "tb" | "bt";
  /** Spacing between nodes (default: 120) */
  spacing?: number;
  /** Enable pan/zoom (default: true) */
  interactive?: boolean;
}

export interface VizColorTheme {
  /** Node fill */
  nodeFill?: string;
  /** Accepting state fill */
  acceptingFill?: string;
  /** Initial state stroke */
  initialStroke?: string;
  /** Edge stroke */
  edgeStroke?: string;
  /** Edge label fill */
  edgeLabelFill?: string;
  /** Text fill */
  textFill?: string;
  /** Background */
  background?: string;
  /** Highlight color */
  highlight?: string;
}

export interface VizInstance {
  /** The rendered SVG element */
  readonly svg: SVGSVGElement | null;
  /** The machine definition being visualized */
  readonly machine: MachineDefinition;
  /** Render (or re-render) the diagram */
  render: () => void;
  /** Highlight a specific state */
  highlightState: (stateId: StateId) => void;
  /** Clear all highlights */
  clearHighlights: () => void;
  /** Animate a transition between two states */
  animateTransition: (from: StateId, to: StateId) => Promise<void>;
  /** Export as SVG string */
  exportSvg: () => string;
  /** Export as PNG data URL */
  exportPng: () => Promise<string>;
  /** Update machine definition and re-render */
  updateMachine: (machine: MachineDefinition) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Default theme ---

const DEFAULT_COLORS: Required<VizColorTheme> = {
  nodeFill: "#f0f4ff",
  acceptingFill: "#d4f4dd",
  initialStroke: "#6366f1",
  edgeStroke: "#94a3b8",
  edgeLabelFill: "#64748b",
  textFill: "#1e293b",
  background: "#ffffff",
  highlight: "#fbbf24",
};

// --- Layout algorithms ---

interface PositionedNode extends StateNode {
  x: number;
  y: number;
}

function forceLayout(nodes: StateNode[], transitions: TransitionEdge[], spacing: number): Map<StateId, PositionedNode> {
  const positioned = new Map<StateId, PositionedNode>();
  const n = nodes.length;

  // Initialize positions in a circle
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const r = spacing * 0.6;
    positioned.set(nodes[i]!.id, {
      ...nodes[i]!,
      x: r * Math.cos(angle) + r,
      y: r * Math.sin(angle) + r,
    });
  }

  // Apply custom positions
  for (const node of nodes) {
    if (node.position) {
      const p = positioned.get(node.id)!;
      p.x = node.position.x;
      p.y = node.position.y;
    }
  }

  // Simple force-directed simulation (fixed iterations)
  const iterations = 100;
  const repulsion = spacing * 2;
  const attraction = spacing * 0.3;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<StateId, { fx: number; fy: number }>();

    // Initialize forces
    for (const id of positioned.keys()) forces.set(id, { fx: 0, fy: 0 });

    // Repulsion between all pairs
    const posArr = Array.from(positioned.values());
    for (let i = 0; i < posArr.length; i++) {
      for (let j = i + 1; j < posArr.length; j++) {
        const a = posArr[i]!;
        const b = posArr[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        dx /= dist;
        dy /= dist;

        forces.get(a.id)!.fx -= dx * force;
        forces.get(a.id)!.fy -= dy * force;
        forces.get(b.id)!.fx += dx * force;
        forces.get(b.id)!.fy += dy * force;
      }
    }

    // Attraction along edges
    for (const t of transitions) {
      const from = positioned.get(t.from);
      const to = positioned.get(t.to);
      if (!from || !to) continue;

      let dx = to.x - from.x;
      let dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - spacing * 0.5) * attraction / dist;
      dx *= force;
      dy *= force;

      forces.get(t.from)!.fx += dx;
      forces.get(t.from)!.fy += dy;
      forces.get(t.to)!.fx -= dx;
      forces.get(t.to)!.fy -= dy;
    }

    // Apply forces
    for (const [id, pos] of positioned) {
      const f = forces.get(id)!;
      const df = 0.1 - iter / iterations * 0.09; // Damping
      pos.x += f.fx * df;
      pos.y += f.fy * df;
    }
  }

  return positioned;
}

// --- Main ---

export function visualizeStateMachine(machine: MachineDefinition, options: VizOptions): VizInstance {
  const {
    container,
    width = 800,
    height: autoHeight,
    nodeSize = 60,
    layout = "force",
    radius = 8,
    showLabels = true,
    showDetails = true,
    colors = {},
    animated = true,
    animationSpeed = 1,
    onNodeClick,
    onNodeHover,
    onRendered,
    direction = "lr",
    spacing = 150,
    interactive = true,
  } = options;

  let destroyed = false;
  let svgEl: SVGSVGElement | null = null;
  let currentMachine = machine;
  const theme = { ...DEFAULT_COLORS, ...colors };
  const autoHeight = Math.max(400, (machine.states.length * spacing) / 2 + 100);

  function doRender(): void {
    if (destroyed) return;

    // Clean up previous
    if (svgEl) svgEl.remove();

    const ns = "http://www.w3.org/2000/svg";
    svgEl = document.createElementNS(ns, "svg");
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height ?? autoHeight));
    svgEl.setAttribute("viewBox", `0 0 ${width} ${height ?? autoHeight}`);
    svgEl.style.cssText = `
      background:${theme.background};border-radius:8px;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      ${interactive ? "cursor:grab;" : ""}
    `;
    svgEl.setAttribute("data-sm-viz", "true");

    // Defs for markers/gradients
    const defs = document.createElementNS(ns, "defs");

    // Arrow marker
    const marker = document.createElementNS(ns, "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("viewBox", "0 0 10 7");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "3.5");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("orient", "auto");
    const arrowPath = document.createElementNS(ns, "polygon");
    arrowPath.setAttribute("points", "0 0, 10 3.5, 0 7");
    arrowPath.setAttribute("fill", theme.edgeStroke);
    marker.appendChild(arrowPath);
    defs.appendChild(marker);

    // Glow filter for highlighted nodes
    const glowFilter = document.createElementNS(ns, "filter");
    glowFilter.setAttribute("id", "glow");
    const feGaussianBlur = document.createElementNS(ns, "feGaussianBlur");
    feGaussianBlur.setAttribute("stdDeviation", "3");
    feGaussianBlur.setAttribute("result", "coloredBlur");
    const feMerge = document.createElementNS(ns, "feMerge");
    const feMergeNode1 = document.createElementNS(ns, "feMergeNode");
    feMergeNode1.setAttribute("in", "coloredBlur");
    const feMergeNode2 = document.createElementNS(ns, "feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    glowFilter.appendChild(feGaussianBlur);
    glowFilter.appendChild(feMerge);
    defs.appendChild(glowFilter);

    svgEl.appendChild(defs);

    // Layout nodes
    const positioned = forceLayout(currentMachine.states, currentMachine.transitions, spacing);

    // Draw edges first (so they appear under nodes)
    const edgeGroup = document.createElementNS(ns, "g");
    edgeGroup.setAttribute("class", "sm-edges");
    svgEl.appendChild(edgeGroup);

    for (const trans of currentMachine.transitions) {
      const fromPos = positioned.get(trans.from);
      const toPos = positioned.get(trans.to);
      if (!fromPos || !toPos) continue;

      const isSelfLoop = trans.from === trans.to;
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;

      let pathD: string;
      if (isSelfLoop) {
        // Self-loop: draw a circular arc above the node
        const loopR = nodeSize * 0.4;
        pathD = `M ${fromPos.x - loopR} ${fromPos.y - nodeSize / 2}
                 A ${loopR} ${loopR} 0 1 1 ${fromPos.x + loopR} ${fromPos.y - nodeSize / 2}`;
      } else {
        // Curved edge
        const offsetX = (toPos.y - fromPos.y) * 0.25;
        const offsetY = (fromPos.x - toPos.x) * 0.25;
        pathD = `M ${fromPos.x} ${fromPos.y}
                 Q ${midX + offsetX} ${midY + offsetY} ${toPos.x} ${toPos.y}`;
      }

      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", pathD);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", theme.edgeStroke);
      path.setAttribute("stroke-width", "2");
      path.setAttribute("marker-end", "url(#arrowhead)");
      path.setAttribute("class", "sm-edge");
      if (trans.style) Object.assign(path.style, trans.style);
      edgeGroup.appendChild(path);

      // Edge label
      if ((trans.label || trans.guard || trans.action) && (showLabels || showDetails)) {
        const labelParts: string[] = [];
        if (showLabels && trans.label) labelParts.push(trans.label);
        if (showDetails && trans.guard) labelParts.push(`[${trans.guard}]`);
        if (showDetails && trans.action) labelParts.push(`{${trans.action}}`);

        if (labelParts.length > 0) {
          const text = document.createElementNS(ns, "text");
          text.setAttribute("x", String(isSelfLoop ? fromPos.x : midX));
          text.setAttribute("y", String(isSelfLoop ? fromPos.y - nodeSize / 2 - 12 : midY - 8));
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("fill", theme.edgeLabelFill);
          text.setAttribute("font-size", "11");
          text.setAttribute("class", "sm-edge-label");
          text.textContent = labelParts.join(" ");
          edgeGroup.appendChild(text);
        }
      }
    }

    // Draw nodes
    const nodeGroup = document.createElementNS(ns, "g");
    nodeGroup.setAttribute("class", "sm-nodes");
    svgEl.appendChild(nodeGroup);

    for (const state of currentMachine.states) {
      const pos = positioned.get(state.id)!;
      const isInitial = state.initial || state.id === currentMachine.initialState;
      const isAccepting = state.accepting;

      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", `sm-node sm-node-${state.id} ${state.className ?? ""}`);
      g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
      g.setAttribute("data-state-id", state.id);
      g.style.cursor = "pointer";

      // Node circle/rect
      const shape = document.createElementNS(ns, isAccepting ? "rect" : "circle");
      if (isAccepting) {
        shape.setAttribute("x", String(-nodeSize / 2));
        shape.setAttribute("y", String(-nodeSize / 2));
        shape.setAttribute("width", String(nodeSize));
        shape.setAttribute("height", String(nodeSize));
        shape.setAttribute("rx", String(radius));
      } else {
        shape.setAttribute("r", String(nodeSize / 2));
      }
      shape.setAttribute("fill", isAccepting ? theme.acceptingFill : theme.nodeFill);
      shape.setAttribute("stroke", isInitial ? theme.initialStroke : "#cbd5e1");
      shape.setAttribute("stroke-width", isInitial ? "3" : "2");
      shape.setAttribute("class", "sm-node-shape");
      g.appendChild(shape);

      // Label
      const label = document.createElementNS(ns, "text");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "central");
      label.setAttribute("fill", theme.textFill);
      label.setAttribute("font-size", "13");
      label.setAttribute("font-weight", "500");
      label.setAttribute("class", "sm-node-label");
      label.textContent = state.label ?? state.id;
      g.appendChild(label);

      // Double circle for accepting states (if using circles)
      if (isAccepting && !shape.tagName.toLowerCase().includes("rect")) {
        const outerCircle = document.createElementNS(ns, "circle");
        outerCircle.setAttribute("r", String(nodeSize / 2 - 4));
        outerCircle.setAttribute("fill", "none");
        outerCircle.setAttribute("stroke", theme.initialStroke);
        outerCircle.setAttribute("stroke-width", "2");
        g.insertBefore(outerCircle, label);
      }

      // Initial state arrow indicator
      if (isInitial) {
        const arrow = document.createElementNS(ns, "path");
        arrow.setAttribute("d", `M ${-nodeSize / 2 - 15} ${-nodeSize / 2 - 10} L ${-nodeSize / 2 - 2} ${-nodeSize / 2}`);
        arrow.setAttribute("fill", "none");
        arrow.setAttribute("stroke", theme.initialStroke);
        arrow.setAttribute("stroke-width", "2");
        arrow.setAttribute("marker-end", "url(#arrowhead)");
        g.appendChild(arrow);
      }

      // Events
      if (onNodeClick) {
        g.addEventListener("click", () => onNodeClick(state));
      }
      if (onNodeHover) {
        g.addEventListener("mouseenter", () => onNodeHover(state));
        g.addEventListener("mouseleave", () => onNodeHover(null));
      }

      nodeGroup.appendChild(g);
    }

    container.appendChild(svgEl);
    onRendered?.(svgEl);
  }

  function doHighlightState(stateId: StateId): void {
    if (!svgEl) return;
    // Clear previous highlights
    clearHighlights();
    const node = svgEl.querySelector(`[data-state-id="${CSS.escape(stateId)}"] .sm-node-shape`);
    if (node) {
      (node as HTMLElement).style.filter = "url(#glow)";
      (node as HTMLElement).style.stroke = theme.highlight;
      (node as HTMLElement).style.strokeWidth = "3";
    }
  }

  function doClearHighlights(): void {
    if (!svgEl) return;
    const shapes = svgEl.querySelectorAll(".sm-node-shape");
    shapes.forEach((s) => {
      s.removeAttribute("filter");
      s.removeAttribute("style");
    });
  }

  async function doAnimateTransition(from: StateId, to: StateId): Promise<void> {
    if (!svgEl || !animated) return;

    // Highlight the edge between these two states
    const edges = svgEl.querySelectorAll(".sm-edge");
    for (const edge of edges) {
      const d = edge.getAttribute("d");
      if (d) {
        edge.setAttribute("stroke", theme.highlight);
        edge.setAttribute("stroke-width", "3");
        await new Promise((r) => setTimeout(r, 500 / animationSpeed));
        edge.setAttribute("stroke", theme.edgeStroke);
        edge.setAttribute("stroke-width", "2");
      }
    }
  }

  function doExportSvg(): string {
    if (!svgEl) return "";
    return new XMLSerializer().serializeToString(svgEl);
  }

  async function doExportPng(): Promise<string> {
    if (!svgEl) return "";
    const svgData = doExportSvg();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height ?? autoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const img = new Image();
    img.src = "data:image/svg+xml;base64," + btoa(unescape(svgData));
    await new Promise((r) => { img.onload = r; });
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  }

  function unescape(str: string): string {
    return str
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }

  const instance: VizInstance = {
    get svg() { return svgEl; },
    get machine() { return currentMachine; },
    render: doRender,
    highlightState: doHighlightState,
    clearHighlights: doClearHighlights,
    animateTransition: doAnimateTransition,
    exportSvg: doExportSvg,
    exportPng: doExportPng,
    updateMachine(newMachine: MachineDefinition) {
      currentMachine = newMachine;
      doRender();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (svgEl) { svgEl.remove(); svgEl = null; }
    },
  };

  // Initial render
  doRender();

  return instance;
}

/** Quick one-shot: render a state machine diagram */
export function renderMachine(machine: MachineDefinition, container: HTMLElement): VizInstance {
  return visualizeStateMachine(machine, { container });
}
