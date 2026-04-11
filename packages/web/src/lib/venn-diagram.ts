/**
 * Venn Diagram: Euler/Venn diagram for set relationships with 2-4 sets,
 * proportional areas, overlap labels, color blending, and interactive
 * highlighting.
 */

// --- Types ---

export type VennSetType = "A" | "B" | "C" | "D";

export interface VennSet {
  id: VennSetType | string;
  label: string;
  size: number; // total elements in set
  color: string;
}

export interface VennOverlap {
  /** Set IDs involved in this overlap (e.g., ["A","B"] for A\u2229B) */
  sets: string[];
  size: number; // elements in intersection only
  label?: string; // custom label override
}

export interface VennDiagramOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Sets (2-4 sets supported) */
  sets: VennSet[];
  /** Overlaps/intersections data */
  overlaps: VennOverlap[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Style variant ("classic" | "rounded" | "ellipse" | "sharp") */
  variant?: string;
  /** Show size labels on each region? */
  showSizeLabels?: boolean;
  /** Label font size */
  labelFontSize?: number;
  /** Size label font size */
  sizeLabelFontSize?: number;
  /** Show set labels outside circles? */
  showSetLabels?: boolean;
  /** Overlap fill opacity */
  overlapOpacity?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Region click callback */
  onRegionClick?: (overlap: VennOverlap, event: MouseEvent) => void;
  /** Region hover callback */
  onRegionHover?: (overlap: VennOverlap | null) => void;
  /** Custom CSS class */
  className?: string;
}

export interface VennInstance {
  element: SVGElement;
  /** Update data */
  setData: (sets: VennSet[], overlaps: VennOverlap[]) => void;
  /** Highlight a set */
  highlightSet: (setId: string) => void;
  /** Clear highlight */
  clearHighlight: () => void;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Main Factory ---

export function createVennDiagram(options: VennDiagramOptions): VennInstance {
  const opts = {
    width: options.width ?? 450,
    height: options.height ?? 380,
    variant: options.variant ?? "rounded",
    showSizeLabels: options.showSizeLabels ?? true,
    labelFontSize: options.labelFontSize ?? 13,
    sizeLabelFontSize: options.sizeLabelFontSize ?? 11,
    showSetLabels: options.showSetLabels ?? true,
    overlapOpacity: options.overlapOpacity ?? 0.35,
    strokeWidth: options.strokeWidth ?? 2,
    animationDuration: options.animationDuration ?? 500,
    tooltip: options.tooltip ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("VennDiagram: container not found");

  let sets: VennSet[] = JSON.parse(JSON.stringify(options.sets));
  let overlaps: VennOverlap[] = JSON.parse(JSON.stringify(options.overlaps));
  let highlightedSet: string | null = null;
  let destroyed = false;

  const nSets = sets.length;
  if (nSets < 2 || nSets > 4) console.warn("VennDiagram supports 2-4 sets");

  const cx = opts.width / 2;
  const cy = opts.height / 2;
  const baseR = Math.min(opts.width, opts.height) / 2 * 0.38;

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `venn-diagram ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width));
  bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", "#fafbfc");
  bg.setAttribute("rx", "8");
  svg.appendChild(bg);

  const gRegions = document.createElementNS(ns, "g");
  svg.appendChild(gRegions);

  const gCircles = document.createElementNS(ns, "g");
  svg.appendChild(gCircles);

  const gLabels = document.createElementNS(ns, "g");
  svg.appendChild(gLabels);

  // Tooltip
  const gTooltip = document.createElementNS(ns, "g");
  gTooltip.style.display = "none";
  gTooltip.style.pointerEvents = "none";
  svg.appendChild(gTooltip);

  const ttBg = document.createElementNS(ns, "rect");
  ttBg.setAttribute("rx", "4"); ttBg.setAttribute("fill", "#1f2937"); ttBg.setAttribute("opacity", "0.9");
  gTooltip.appendChild(ttBg);

  const ttText = document.createElementNS(ns, "text");
  ttText.setAttribute("fill", "#fff"); ttText.setAttribute("font-size", "11");
  gTooltip.appendChild(ttText);

  container.appendChild(svg);

  // --- Circle Positions by Set Count ---

  function getCirclePositions(): Array<{ x: number; y: number; r: number }> {
    switch (nSets) {
      case 2:
        return [
          { x: cx - baseR * 0.45, y: cy, r: baseR },
          { x: cx + baseR * 0.45, y: cy, r: baseR },
        ];
      case 3:
        return [
          { x: cx, y: cy - baseR * 0.45, r: baseR },
          { x: cx - baseR * 0.42, y: cy + baseR * 0.35, r: baseR },
          { x: cx + baseR * 0.42, y: cy + baseR * 0.35, r: baseR },
        ];
      case 4:
        const sr = baseR * 0.75;
        return [
          { x: cx - sr * 0.55, y: cy - sr * 0.4, r: sr },
          { x: cx + sr * 0.55, y: cy - sr * 0.4, r: sr },
          { x: cx - sr * 0.55, y: cy + sr * 0.4, r: sr },
          { x: cx + sr * 0.55, y: cy + sr * 0.4, r: sr },
        ];
      default:
        return [];
    }
  }

  // --- Rendering ---

  function render(): void {
    gRegions.innerHTML = ""; gCircles.innerHTML = ""; gLabels.innerHTML = "";

    if (sets.length < 2) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(cx)); empty.setAttribute("y", String(cy));
      empty.setAttribute("text-anchor", "middle"); empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "Need at least 2 sets";
      gLabels.appendChild(empty);
      return;
    }

    const positions = getCirclePositions();

    // Draw circles with blend mode for overlaps
    for (let i = 0; i < sets.length; i++) {
      const s = sets[i]!;
      const pos = positions[i]!;
      const isDimmed = highlightedSet != null && highlightedSet !== s.id;

      let el: SVGElement;
      if (opts.variant === "ellipse") {
        el = document.createElementNS(ns, "ellipse");
        el.setAttribute("cx", String(pos.x)); el.setAttribute("cy", String(pos.y));
        el.setAttribute("rx", String(pos.r)); el.setAttribute("ry", String(pos.r * 0.7));
      } else if (opts.variant === "sharp") {
        el = document.createElementNS(ns, "rect");
        el.setAttribute("x", String(pos.x - pos.r)); el.setAttribute("y", String(pos.y - pos.r));
        el.setAttribute("width", String(pos.r * 2)); el.setAttribute("height", String(pos.r * 2));
      } else {
        el = document.createElementNS(ns, "circle" as "circle");
        el.setAttribute("cx", String(pos.x)); el.setAttribute("cy", String(pos.y));
        el.setAttribute("r", String(pos.r));
        if (opts.variant === "rounded") el.setAttribute("rx", "12");
      }

      el.setAttribute("fill", s.color);
      el.setAttribute("fill-opacity", String(isDimmed ? 0.15 : opts.overlapOpacity));
      el.setAttribute("stroke", s.color);
      el.setAttribute("stroke-width", String(opts.strokeWidth));
      el.setAttribute("stroke-opacity", String(isDimmed ? 0.25 : 0.85));
      el.style.cursor = "pointer";
      el.style.transition = `fill-opacity ${opts.animationDuration}ms ease, stroke-opacity ${opts.animationDuration}ms ease`;

      el.dataset.setId = s.id;

      el.addEventListener("mouseenter", () => {
        highlightedSet = s.id;
        render();
        opts.onRegionHover?.(overlaps.find(o => o.sets.includes(s.id)) ?? null);
      });
      el.addEventListener("mouseleave", () => {
        if (highlightedSet === s.id) { highlightedSet = null; render(); }
        opts.onRegionHover?.(null);
      });

      gCircles.appendChild(el);
    }

    // Draw overlap region labels
    for (const ov of overlaps) {
      if (ov.size === 0) continue;

      // Compute centroid of overlapping circles
      const involvedPositions = ov.sets.map(id => {
        const idx = sets.findIndex(s => s.id === id);
        return idx >= 0 ? positions[idx]! : null;
      }).filter(Boolean);

      if (involvedPositions.length === 0) continue;

      const rx = involvedPositions.reduce((s, p) => s + p.x, 0) / involvedPositions.length;
      const ry = involvedPositions.reduce((s, p) => s + p.y, 0) / involvedPositions.length;

      // Size label
      if (opts.showSizeLabels) {
        const sl = document.createElementNS(ns, "text");
        sl.setAttribute("x", String(rx)); sl.setAttribute("y", String(ry));
        sl.setAttribute("text-anchor", "middle"); sl.setAttribute("dominant-baseline", "middle");
        sl.setAttribute("fill", "#374151"); sl.setAttribute("font-size", String(opts.sizeLabelFontSize));
        sl.setAttribute("font-weight", "600");
        sl.setAttribute("pointer-events", "none");
        sl.textContent = ov.label ?? String(ov.size);
        gLabels.appendChild(sl);
      }
    }

    // Set labels (outside)
    if (opts.showSetLabels) {
      for (let i = 0; i < sets.length; i++) {
        const s = sets[i]!;
        const pos = positions[i]!;
        let lx = pos.x, ly = pos.y;

        // Push label outward from center
        const angle = Math.atan2(pos.y - cy, pos.x - cx);
        const labelDist = pos.r + 22;
        lx = cx + Math.cos(angle) * labelDist;
        ly = cy + Math.sin(angle) * labelDist;

        const lbl = document.createElementNS(ns, "text");
        lbl.setAttribute("x", String(lx)); lbl.setAttribute("y", String(ly));
        lbl.setAttribute("text-anchor", "middle"); lbl.setAttribute("dominant-baseline", "middle");
        lbl.setAttribute("fill", s.color); lbl.setAttribute("font-size", String(opts.labelFontSize));
        lbl.setAttribute("font-weight", "700"); lbl.setAttribute("pointer-events", "none");
        lbl.textContent = s.label;
        gLabels.appendChild(lbl);
      }
    }
  }

  function showTooltip(ov: VennOverlap): void {
    if (!opts.tooltip) return;
    const setName = ov.sets.join(" \u2229 ");
    ttText.textContent = `${setName}: ${ov.size}`;
    gTooltip.style.display = "block";
    requestAnimationFrame(() => {
      const bb = ttText.getBBox();
      const p = 6;
      ttBg.setAttribute("x", String(-bb.width / 2 - p));
      ttBg.setAttribute("y", String(-bb.height - p - 10));
      ttBg.setAttribute("width", String(bb.width + p * 2));
      ttBg.setAttribute("height", String(bb.height + p * 2));
      ttText.setAttribute("x", String(-bb.width / 2));
      ttText.setAttribute("y", String(-bb.height - 10 + bb.height / 2 + 4));
      gTooltip.setAttribute("transform", `translate(${cx}, ${cy})`);
    });
  }

  function hideTooltip(): void { gTooltip.style.display = "none"; }

  // Initial render
  render();

  // --- Public API ---

  const instance: VennInstance = {
    element: svg,

    setData(newSets: VennSet[], newOverlaps: VennOverlap[]) {
      sets = newSets.map(s => ({ ...s }));
      overlaps = newOverlaps.map(o => ({ ...o }));
      highlightedSet = null;
      render();
    },

    highlightSet(setId: string) {
      highlightedSet = setId;
      render();
    },

    clearHighlight() {
      highlightedSet = null;
      render();
    },

    exportSVG: () => svg.outerHTML,

    destroy() {
      destroyed = true;
      svg.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
