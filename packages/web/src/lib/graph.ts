/**
 * Graph data structure utilities (directed/undirected, weighted).
 */

export interface GraphNode {
  id: string;
  label?: string;
  [key: string]: unknown;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight?: number;
  directed?: boolean;
  [key: string]: unknown;
}

export class Graph<T extends GraphNode = GraphNode> {
  private nodes = new Map<string, T>();
  private adjacencyList = new Map<string, Array<{ node: string; edge: GraphEdge }>>();
  private _directed: boolean;

  constructor(directed = false) {
    this._directed = directed;
  }

  /** Add a node to the graph */
  addNode(node: T): this {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, []);
    }
    return this;
  }

  /** Add an edge between two nodes */
  addEdge(from: string, to: string, weight?: number): this {
    const edge: GraphEdge = { from, to, weight, directed: this._directed };

    if (!this.adjacencyList.has(from)) {
      this.adjacencyList.set(from, []);
    }

    this.adjacencyList.get(from)!.push({ node: to, edge });

    // For undirected graphs, add reverse edge
    if (!this._directed) {
      if (!this.adjacencyList.has(to)) {
        this.adjacencyList.set(to, []);
      }
      this.adjacencyList.get(to)!.push({ node: from, edge: { ...edge, from: to, to: from } });
    }

    return this;
  }

  /** Get a node by ID */
  getNode(id: string): T | undefined {
    return this.nodes.get(id);
  }

  /** Get neighbors of a node */
  getNeighbors(id: string): T[] {
    const neighbors = this.adjacencyList.get(id);
    if (!neighbors) return [];

    return neighbors
      .map((n) => this.nodes.get(n.node))
      .filter(Boolean) as T[];
  }

  /** Get edges connected to a node */
  getEdges(id: string): GraphEdge[] {
    const neighbors = this.adjacencyList.get(id);
    return neighbors?.map((n) => n.edge) ?? [];
  }

  /** Check if two nodes are adjacent */
  areAdjacent(a: string, b: string): boolean {
    const neighbors = this.adjacencyList.get(a);
    return neighbors?.some((n) => n.node === b) ?? false;
  }

  /** Get all node IDs */
  get nodeIds(): string[] {
    return [...this.nodes.keys()];
  }

  /** Get total number of nodes */
  get size(): number {
    return this.nodes.size;
  }

  /** Get total number of edges */
  get edgeCount(): number {
    let count = 0;
    for (const [, neighbors] of this.adjacencyList) {
      count += neighbors.length;
    }
    return this._directed ? count : count / 2;
  }

  /** BFS traversal — returns nodes in BFS order */
  bfs(startId: string): string[] {
    const visited = new Set<string>();
    const queue = [startId];
    const result: string[] = [];

    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = this.adjacencyList.get(current) ?? [];
      for (const n of neighbors) {
        if (!visited.has(n.node)) {
          visited.add(n.node);
          queue.push(n.node);
        }
      }
    }

    return result;
  }

  /** DFS traversal — returns nodes in DFS order */
  dfs(startId: string): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    function visit(id: string) {
      visited.add(id);
      result.push(id);

      const neighbors = this.adjacencyList.get(id) ?? [];
      for (const n of neighbors) {
        if (!visited.has(n.node)) {
          visit(n.node);
        }
      }
    }

    visit(startId);

    return result;
  }

  /** Find shortest path using Dijkstra's algorithm (weighted) */
  shortestPath(from: string, to: string): { path: string[]; distance: number } | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set(this.nodes.keys());

    // Initialize distances
    for (const id of this.nodes.keys()) {
      distances.set(id, id === from ? 0 : Infinity);
      previous.set(id, null);
    }

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let minDist = Infinity;
      let current: string | null = null;

      for (const id of unvisited) {
        const dist = distances.get(id)!;
        if (dist < minDist) {
          minDist = dist;
          current = id;
        }
      }

      if (current === null || minDist === Infinity) break;

      if (current === to) break;

      unvisited.delete(current);

      // Update distances to neighbors
      const neighbors = this.adjacencyList.get(current) ?? [];
      for (const n of neighbors) {
        if (!unvisited.has(n.node)) continue;

        const alt = distances.get(current)! + (n.edge.weight ?? 1);

        if (alt < distances.get(n.node)!) {
          distances.set(n.node, alt);
          previous.set(n.node, current);
        }
      }
    }

    // Reconstruct path
    if (distances.get(to) === Infinity) return null;

    const path: string[] = [];
    let current: string | null = to;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current)!;
    }

    return { path, distance: distances.get(to)! };
  }

  /** Detect cycles using DFS */
  hasCycle(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function detectCycle(nodeId: string): boolean {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = this.adjacencyList.get(nodeId) ?? [];
      for (const n of neighbors) {
        if (!visited.has(n.node)) {
          if (detectCycle(n.node)) return true;
        } else if (recursionStack.has(n.node)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    }

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (detectCycle(nodeId)) return true;
      }
    }

    return false;
  }

  /** Topological sort (for DAGs only) */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees
    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0);
    }

    for (const [, neighbors] of this.adjacencyList) {
      for (const n of neighbors) {
        inDegree.set(n.node, (inDegree.get(n.node) ?? 0) + 1);
      }
    }

    // Start with nodes that have no incoming edges
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const neighbors = this.adjacencyList.get(current) ?? [];
      for (const n of neighbors) {
        const newDegree = (inDegree.get(n.node) ?? 1) - 1;
        inDegree.set(n.node, newDegree);
        if (newDegree === 0) queue.push(n.node);
      }
    }

    // If not all nodes were processed, there's a cycle
    if (result.length !== this.nodes.size) {
      throw new Error("Graph contains a cycle — cannot perform topological sort");
    }

    return result;
  }

  /** Convert to adjacency matrix (for small graphs) */
  toAdjacencyMatrix(): (number | null)[][] {
    const ids = [...this.nodes.keys()];
    const size = ids.length;
    const matrix: (number | null)[][] = Array.from({ length: size }, () =>
      Array(size).fill(null),
    );

    const idToIndex = new Map(ids.map((id, i) => [id, i]));

    for (const [from, neighbors] of this.adjacencyList) {
      const fromIdx = idToIndex.get(from)!;
      for (const n of neighbors) {
        const toIdx = idToIndex.get(n.node)!;
        matrix[fromIdx][toIdx] = n.edge.weight ?? 1;
      }
    }

    return matrix;
  }
}
