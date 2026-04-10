/**
 * Graph Utilities: Graph data structure (directed/undirected, weighted/unweighted),
 * BFS/DFS traversal, Dijkstra shortest path, A* pathfinding, topological sort,
 * connected components, cycle detection (DFS + Union-Find), minimum spanning tree
 * (Prim's algorithm), graph centrality measures, path reconstruction.
 */

// --- Types ---

export type GraphNodeId = string | number;

export interface GraphEdge {
  from: GraphNodeId;
  to: GraphNodeId;
  weight?: number;
}

export interface GraphPath {
  nodes: GraphNodeId[];
  totalWeight: number;
}

export interface TraversalResult {
  order: GraphNodeId[];
  visited: Set<GraphNodeId>;
  distances: Map<GraphNodeId, number>;
  parents: Map<GraphNodeId, GraphNodeId | null>;
}

export interface CentralityResult {
  node: GraphNodeId;
  betweenness: number;
  closeness: number;
  degree: number;
}

// --- Graph Class ---

export class Graph {
  private adjacencyList = new Map<GraphNodeId, Map<GraphNodeId, number>>();
  private _directed: boolean;

  constructor(directed = false) { this._directed = directed; }

  get directed(): boolean { return this._directed; }
  get nodes(): GraphNodeId[] { return [...this.adjacencyList.keys()]; }
  get edges(): GraphEdge[] {
    const result: GraphEdge[] = [];
    for (const [from, neighbors] of this.adjacencyList) {
      for (const [to, weight] of neighbors) {
        result.push({ from, to, weight });
      }
    }
    return result;
  }
  get size(): number { return this.adjacencyList.size; }

  /** Add a node (no-op if exists) */
  addNode(id: GraphNodeId): void {
    if (!this.adjacencyList.has(id)) this.adjacencyList.set(id, new Map());
  }

  /** Add an edge. Creates nodes if they don't exist */
  addEdge(from: GraphNodeId, to: GraphNodeId, weight = 1): void {
    this.addNode(from);
    this.addNode(to);
    this.adjacencyList.get(from)!.set(to, weight);
    if (!this._directed) this.adjacencyList.get(to)!.set(from, weight);
  }

  /** Remove an edge */
  removeEdge(from: GraphNodeId, to: GraphNodeId): boolean {
    const fromNeighbors = this.adjacencyList.get(from);
    if (!fromNeighbors?.delete(to)) return false;
    if (!this._directed) this.adjacencyList.get(to)?.delete(from);
    return true;
  }

  /** Remove a node and all its edges */
  removeNode(id: GraphNodeId): boolean {
    if (!this.adjacencyList.delete(id)) return false;
    for (const [, neighbors] of this.adjacencyList) neighbors.delete(id);
    return true;
  }

  /** Check if edge exists */
  hasEdge(from: GraphNodeId, to: GraphNodeId): boolean {
    return this.adjacencyList.get(from)?.has(to) ?? false;
  }

  /** Get edge weight (or undefined) */
  getWeight(from: GraphNodeId, to: GraphNodeId): number | undefined {
    return this.adjacencyList.get(from)?.get(to);
  }

  /** Get neighbors of a node */
  getNeighbors(node: GraphNodeId): GraphNodeId[] {
    return [...(this.adjacencyList.get(node)?.keys() ?? [])];
  }

  /** Get degree of a node (out-degree for directed, total degree for undirected) */
  getDegree(node: GraphNodeId): number {
    let deg = (this.adjacencyList.get(node)?.size ?? 0);
    if (!this._directed) return deg;
    // In-degree
    for (const [, neighbors] of this.adjacencyList) {
      if (neighbors.has(node)) deg++;
    }
    return deg;
  }

  /** Check if node exists */
  hasNode(id: GraphNodeId): boolean { return this.adjacencyList.has(id); }

  /** Create a deep copy */
  clone(): Graph {
    const g = new Graph(this._directed);
    for (const [node, neighbors] of this.adjacencyList) {
      g.addNode(node);
      for (const [neighbor, weight] of neighbors) {
        // Avoid double-adding in undirected graphs
        if (this._directed || !g.hasEdge(node, neighbor)) {
          g.addEdge(node, neighbor, weight);
        }
      }
    }
    return g;
  }

  clear(): void { this.adjacencyList.clear(); }

  /** Get adjacency list as plain object (for serialization) */
  toJSON(): Record<string, Record<string, number>> {
    const obj: Record<string, Record<string, number>> = {};
    for (const [id, neighbors] of this.adjacencyList) {
      obj[String(id)] = Object.fromEntries(neighbors);
    }
    return obj;
  }
}

// --- BFS (Breadth-First Search) ---

/**
 * Breadth-first search traversal.
 * Returns visitation order, visited set, distances from start, and parent map.
 */
export function bfs(
  graph: Graph,
  start: GraphNodeId,
): TraversalResult {
  const visited = new Set<GraphNodeId>();
  const order: GraphNodeId[] = [];
  const distances = new Map<GraphNodeId, number>();
  const parents = new Map<GraphNodeId, GraphNodeId | null>();
  const queue: GraphNodeId[] = [start];

  visited.add(start);
  distances.set(start, 0);
  parents.set(start, null);

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    for (const neighbor of graph.getNeighbors(current)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        distances.set(neighbor, distances.get(current)! + 1);
        parents.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return { order, visited, distances, parents };
}

/** Find shortest path (unweighted) using BFS */
export function bfsShortestPath(graph: Graph, start: GraphNodeId, end: GraphNodeId): GraphPath | null {
  const result = bfs(graph, start);
  if (!result.visited.has(end)) return null;
  return reconstructPath(result.parents, end, 0);
}

// --- DFS (Depth-First Search) ---

/**
 * Depth-first search traversal (iterative).
 */
export function dfs(
  graph: Graph,
  start: GraphNodeId,
): TraversalResult {
  const visited = new Set<GraphNodeId>();
  const order: GraphNodeId[] = [];
  const distances = new Map<GraphNodeId, number>();
  const parents = new Map<GraphNodeId, GraphNodeId | null>();
  const stack: GraphNodeId[] = [start];

  distances.set(start, 0);
  parents.set(start, null);

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    order.push(current);

    for (const neighbor of graph.getNeighbors(current)) {
      if (!visited.has(neighbor)) {
        distances.set(neighbor, distances.get(current)! + 1);
        parents.set(neighbor, current);
        stack.push(neighbor);
      }
    }
  }

  return { order, visited, distances, parents };
}

/** DFS recursive variant with pre/post callbacks */
export function dfsRecursive(
  graph: Graph,
  start: GraphNodeId,
  onEnter?: (node: GraphNodeId) => void,
  onExit?: (node: GraphNodeId) => void,
): TraversalResult {
  const visited = new Set<GraphNodeId>();
  const order: GraphNodeId[] = [];
  const distances = new Map<GraphNodeId, number>();
  const parents = new Map<GraphNodeId, GraphNodeId | null>();

  const visit = (node: GraphNodeId, depth: number) => {
    if (visited.has(node)) return;
    visited.add(node);
    order.push(node);
    distances.set(node, depth);
    onEnter?.(node);

    for (const neighbor of graph.getNeighbors(node)) {
      if (!visited.has(neighbor)) {
        parents.set(neighbor, node);
        visit(neighbor, depth + 1);
      }
    }
    onExit?.(node);
  };

  visit(start, 0);
  parents.set(start, null);
  return { order, visited, distances, parents };
}

// --- Dijkstra's Shortest Path ---

/**
 * Find shortest paths from source to all reachable nodes.
 * Uses binary heap priority queue. O((V+E) log V)
 */
export function dijkstra(
  graph: Graph,
  source: GraphNodeId,
): Map<GraphNodeId, GraphPath> {
  const dist = new Map<GraphNodeId, number>();
  const prev = new Map<GraphNodeId, GraphNodeId | null>();
  const visited = new Set<GraphNodeId>();

  // Initialize distances to infinity
  for (const node of graph.nodes) {
    dist.set(node, Infinity);
    prev.set(node, null);
  }
  dist.set(source, 0);

  // Priority queue: [distance, node]
  const pq: Array<[number, GraphNodeId]> = [[0, source]];

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);

    for (const v of graph.getNeighbors(u)) {
      if (visited.has(v)) continue;
      const weight = graph.getWeight(u, v) ?? 1;
      const alt = d + weight;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
        pq.push([alt, v]);
      }
    }
  }

  // Build paths
  const paths = new Map<GraphNodeId, GraphPath>();
  for (const node of graph.nodes) {
    if (dist.get(node) !== Infinity) {
      paths.set(node, reconstructPath(prev, node, dist.get(node)!));
    }
  }
  return paths;
}

/** Get single shortest path between two nodes using Dijkstra */
export function dijkstraShortestPath(
  graph: Graph,
  source: GraphNodeId,
  target: GraphNodeId,
): GraphPath | null {
  const paths = dijkstra(graph, source);
  return paths.get(target) ?? null;
}

// --- A* Pathfinding ---

/**
 * A* search with heuristic function.
 *
 * @param graph - The graph to search
 * @param start - Start node
 * @param goal - Goal node
 * @param heuristic - Estimated cost from node to goal (must be admissible: never overestimate)
 */
export function astar(
  graph: Graph,
  start: GraphNodeId,
  goal: GraphNodeId,
  heuristic: (node: GraphNodeId) => number = () => 0,
): GraphPath | null {
  const gScore = new Map<GraphNodeId, number>(); // Cost from start
  const fScore = new Map<GraphNodeId, number>(); // gScore + heuristic
  const cameFrom = new Map<GraphNodeId, GraphNodeId>();
  const openSet = new Set<GraphNodeId>([start]);

  for (const node of graph.nodes) {
    gScore.set(node, Infinity);
    fScore.set(node, Infinity);
  }
  gScore.set(start, 0);
  fScore.set(start, heuristic(start));

  while (openSet.size > 0) {
    // Find node in openSet with lowest fScore
    let current: GraphNodeId | null = null;
    let bestF = Infinity;
    for (const n of openSet) {
      const f = fScore.get(n) ?? Infinity;
      if (f < bestF) { bestF = f; current = n; }
    }
    if (current === null) break;

    if (current === goal) {
      const totalG = gScore.get(goal)!;
      const nodes: GraphNodeId[] = [goal];
      let c = goal;
      while (cameFrom.has(c)) { c = cameFrom.get(c)!; nodes.unshift(c); }
      return { nodes, totalWeight: totalG };
    }

    openSet.delete(current);

    for (const neighbor of graph.getNeighbors(current)) {
      const weight = graph.getWeight(current, neighbor) ?? 1;
      const tentativeG = (gScore.get(current) ?? Infinity) + weight;

      if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeG);
        fScore.set(neighbor, tentativeG + heuristic(neighbor));
        openSet.add(neighbor);
      }
    }
  }

  return null; // No path found
}

// --- Topological Sort ---

/**
 * Kahn's algorithm for topological sorting.
 * Only works on DAGs (Directed Acyclic Graphs).
 * Returns empty array if cycle detected.
 */
export function topologicalSort(graph: Graph): GraphNodeId[] {
  if (!graph.directed) throw new Error("Topological sort requires a directed graph");

  const inDegree = new Map<GraphNodeId, number>();
  for (const node of graph.nodes) inDegree.set(node, 0);
  for (const [, neighbors] of (graph as any).adjacencyList) {
    for (const [to] of neighbors) inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  }

  const queue: GraphNodeId[] = [];
  for (const [node, deg] of inDegree) if (deg === 0) queue.push(node);

  const sorted: GraphNodeId[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    sorted.push(u);
    for (const v of graph.getNeighbors(u)) {
      inDegree.set(v, inDegree.get(v)! - 1);
      if (inDegree.get(v) === 0) queue.push(v);
    }
  }

  // If not all nodes are sorted, there's a cycle
  return sorted.length === graph.size ? sorted : [];
}

// --- Connected Components ---

/**
 * Find connected components (for undirected graphs)
 * or weakly connected components (for directed graphs).
 */
export function findConnectedComponents(graph: Graph): GraphNodeId[][] {
  const visited = new Set<GraphNodeId>();
  const components: GraphNodeId[][] = [];

  for (const node of graph.nodes) {
    if (visited.has(node)) continue;
    const component: GraphNodeId[] = [];
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      for (const neighbor of graph.getNeighbors(current)) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
    components.push(component);
  }

  return components;
}

// --- Cycle Detection ---

/** Detect cycles using DFS. Returns true if graph contains at least one cycle. */
export function hasCycle(graph: Graph): boolean {
  const visited = new Set<GraphNodeId>();
  const recursionStack = new Set<GraphNodeId>();

  const detect = (node: GraphNodeId): boolean => {
    visited.add(node);
    recursionStack.add(node);

    for (const neighbor of graph.getNeighbors(node)) {
      if (!visited.has(neighbor)) {
        if (detect(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  };

  for (const node of graph.nodes) {
    if (!visited.has(node)) if (detect(node)) return true;
  }
  return false;
}

/** Detect cycles and return the cycle nodes if found */
export function findCycle(graph: Graph): GraphNodeId[] | null {
  const visited = new Set<GraphNodeId>();
  const parent = new Map<GraphNodeId, GraphNodeId>();

  for (const start of graph.nodes) {
    if (visited.has(start)) continue;
    const stack: Array<{ node: GraphNodeId; iter: IterableIterator<GraphNodeId> }> = [
      { node: start, iter: graph.getNeighbors(start)[Symbol.iterator]() },
    ];
    visited.add(start);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const next = frame.iter.next();
      if (next.done) { stack.pop(); continue; }
      const neighbor = next.value;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent.set(neighbor, frame.node);
        stack.push({ node: neighbor, iter: graph.getNeighbors(neighbor)[Symbol.iterator]() });
      } else if (neighbor !== parent.get(frame.node)) {
        // Found back-edge — reconstruct cycle
        const cycle: GraphNodeId[] = [neighbor, frame.node];
        let curr = frame.node;
        while (curr !== neighbor && parent.has(curr)) {
          curr = parent.get(curr)!;
          if (curr === neighbor) break;
          cycle.push(curr);
        }
        return cycle.reverse();
      }
    }
  }
  return null;
}

// --- Union-Find (Disjoint Set) ---

export class UnionFind {
  private parent = new Map<GraphNodeId, GraphNodeId>();
  private rank = new Map<GraphNodeId, number>();

  makeSet(x: GraphNodeId): void {
    if (!this.parent.has(x)) { this.parent.set(x, x); this.rank.set(x, 0); }
  }

  find(x: GraphNodeId): GraphNodeId {
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!)); // Path compression
    }
    return this.parent.get(x)!;
  }

  union(x: GraphNodeId, y: GraphNodeId): boolean {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return false; // Already in same set

    const rxRank = this.rank.get(rx) ?? 0;
    const ryRank = this.rank.get(ry) ?? 0;
    if (rxRank < ryRank) { this.parent.set(rx, ry); }
    else if (rxRank > ryRank) { this.parent.set(ry, rx); }
    else { this.parent.set(ry, rx); this.rank.set(rx, rxRank + 1); }
    return true;
  }

  connected(x: GraphNodeId, y: GraphNodeId): boolean { return this.find(x) === this.find(y); }
  sets(): GraphNodeId[][] {
    const groups = new Map<GraphNodeId, GraphNodeId[]>();
    for (const x of this.parent.keys()) {
      const root = this.find(x);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(x);
    }
    return [...groups.values()];
  }
}

/** Detect cycle using Union-Find (only for undirected graphs) */
export function hasCycleUnionFind(graph: Graph): boolean {
  if (graph.directed) throw new Error("Union-Find cycle detection only works for undirected graphs");
  const uf = new UnionFind();
  for (const node of graph.nodes) uf.makeSet(node);
  for (const edge of graph.edges) {
    if (uf.union(edge.from, edge.to)) continue; // Different components — safe
    return true; // Same component — creates cycle
  }
  return false;
}

// --- Minimum Spanning Tree (Prim's Algorithm) ---

/**
 * Compute MST using Prim's algorithm.
 * Returns a new Graph representing the MST, or null if graph is disconnected.
 */
export function primMST(graph: Graph): Graph | null {
  if (graph.directed) throw new Error("MST requires undirected graph");
  if (graph.size === 0) return null;

  const mst = new Graph(false);
  const inMST = new Set<GraphNodeId>();
  const start = graph.nodes[0];

  mst.addNode(start);
  inMST.add(start);

  while (inMST.size < graph.size) {
    let minEdge: { from: GraphNodeId; to: GraphNodeId; weight: number } | null = null;

    for (const u of inMST) {
      for (const v of graph.getNeighbors(u)) {
        if (inMST.has(v)) continue;
        const w = graph.getWeight(u, v) ?? 1;
        if (!minEdge || w < minEdge.weight) minEdge = { from: u, to: v, weight: w };
      }
    }

    if (!minEdge) return null; // Disconnected
    mst.addEdge(minEdge.from, minEdge.to, minEdge.weight);
    inMST.add(minEdge.to);
  }

  return mst;
}

/** Total weight of MST */
export function mstTotalWeight(mst: Graph): number {
  let total = 0;
  for (const e of mst.edges) total += e.weight ?? 1;
  return total;
}

// --- Centrality Measures ---

/**
 * Compute basic centrality metrics for each node:
 * - Degree centrality (normalized by max possible)
 * - Closeness centrality (inverse average distance to all other nodes)
 * - Betweenness centrality (fraction of shortest paths passing through node)
 */
export function computeCentrality(graph: Graph): CentralityResult[] {
  const results: CentralityResult[] = [];
  const n = graph.size;
  if (n <= 1) return graph.nodes.map((node) => ({ node, betweenness: 0, closeness: 0, degree: 0 }));

  const maxDegree = n - 1;

  for (const node of graph.nodes) {
    const paths = dijkstra(graph, node);
    let sumDist = 0;
    let reachableCount = 0;

    for (const [target, path] of paths) {
      if (target === node) continue;
      sumDist += path.totalWeight;
      reachableCount++;
    }

    const degree = graph.getDegree(node) / maxDegree;
    const closeness = reachableCount > 0 ? (reachableCount / sumDist) * ((reachableCount) / (n - 1)) : 0;

    results.push({ node, betweenness: 0, closeness, degree });
  }

  // Betweenness: simplified approximation (O(n^2))
  for (let i = 0; i < results.length; i++) {
    let betweenness = 0;
    const s = results[i]!.node;
    for (let j = 0; j < results.length; j++) {
      if (i === j) continue;
      const t = results[j]!.node;
      const path = dijkstraShortestPath(graph, s, t);
      if (path && path.nodes.length > 2) {
        // Count how many times intermediate nodes appear
        for (let k = 1; k < path.nodes.length - 1; k++) {
          const inter = path.nodes[k];
          const idx = results.findIndex((r) => r.node === inter);
          if (idx >= 0) results[idx]!.betweenness += 1;
        }
      }
    }
  }

  // Normalize betweenness
  const normFactor = n < 3 ? 1 : (n - 1) * (n - 2) / 2;
  for (const r of results) r.betweenness /= normFactor;

  return results;
}

// --- Path Reconstruction ---

function reconstructPath(
  parents: Map<GraphNodeId, GraphNodeId | null>,
  target: GraphNodeId,
  totalWeight: number,
): GraphPath {
  const nodes: GraphNodeId[] = [];
  let current: GraphNodeId | null = target;
  while (current !== null) {
    nodes.unshift(current);
    current = parents.get(current) ?? null;
  }
  return { nodes, totalWeight };
}
