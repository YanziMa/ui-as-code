/**
 * Flow Graph / DAG: directed acyclic graph utilities, workflow engine,
  * topological sort, cycle detection, path finding, dependency resolution,
  * node/port system (like Node-RED or Unreal Blueprint), visual graph layout.
 */

// --- Core Graph Types ---

export interface GraphNode<T = unknown> {
  id: string;
  data: T;
  label?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  data?: unknown;
  weight?: number;
  label?: string;
}

export interface FlowGraph<T = unknown> {
  nodes: Map<string, GraphNode<T>>;
  edges: Map<string, GraphEdge>;
  adjacency: Map<string, Set<string>>; // source -> targets
  reverseAdjacency: Map<string, Set<string>>; // target -> sources
  directed: boolean;
}

// --- Graph Construction ---

export function createGraph<T = unknown>(directed = true): FlowGraph<T> {
  return {
    nodes: new Map(),
    edges: new Map(),
    adjacency: new Map(),
    reverseAdjacency: new Map(),
    directed,
  };
}

/** Add a node to the graph */
export function addNode<T>(graph: FlowGraph<T>, id: string, data: T, label?: string): GraphNode<T> {
  const node: GraphNode<T> = { id, data, label };
  graph.nodes.set(id, node);
  if (!graph.adjacency.has(id)) graph.adjacency.set(id, new Set());
  if (!graph.reverseAdjacency.has(id)) graph.reverseAdjacency.set(id, new Set());
  return node;
}

/** Remove a node and all connected edges */
export function removeNode<T>(graph: FlowGraph<T>, id: string): boolean {
  if (!graph.nodes.has(id)) return false;
  graph.nodes.delete(id);
  // Remove all edges connected to this node
  const toRemove: string[] = [];
  for (const [eid, edge] of graph.edges) {
    if (edge.source === id || edge.target === id) toRemove.push(eid);
  }
  for (const eid of toRemove) removeEdge(graph, eid);
  graph.adjacency.delete(id);
  graph.reverseAdjacency.delete(id);
  return true;
}

/** Add an edge between two nodes */
export function addEdge<T>(graph: FlowGraph<T>, id: string, source: string, target: string, data?: unknown, weight = 1): GraphEdge | null {
  if (!graph.nodes.has(source) || !graph.nodes.has(target)) return null;
  const edge: GraphEdge = { id, source, target, data, weight };
  graph.edges.set(id, edge);
  graph.adjacency.get(source)!.add(target);
  graph.reverseAdjacency.get(target)!.add(source);
  // For undirected graphs, also add reverse
  if (!graph.directed) {
    graph.adjacency.get(target)!.add(source);
    graph.reverseAdjacency.get(source)!.add(target);
  }
  return edge;
}

/** Remove an edge by ID */
export function removeEdge<T>(graph: FlowGraph<T>, id: string): boolean {
  const edge = graph.edges.get(id);
  if (!edge) return false;
  graph.edges.delete(id);
  graph.adjacency.get(edge.source)?.delete(edge.target);
  graph.reverseAdjacency.get(edge.target)?.delete(edge.source);
  if (!graph.directed) {
    graph.adjacency.get(edge.target)?.delete(edge.source);
    graph.reverseAdjacency.get(edge.source)?.delete(edge.target);
  }
  return true;
}

// --- Graph Queries ---

/** Get neighbors of a node */
export function neighbors<T>(graph: FlowGraph<T>, nodeId: string, direction: "out" | "in" | "both" = "out"): string[] {
  switch (direction) {
    case "out": return Array.from(graph.adjacency.get(nodeId) ?? []);
    case "in": return Array.from(graph.reverseAdjacency.get(nodeId) ?? []);
    case "both": return [...new Set([...(graph.adjacency.get(nodeId) ?? []), ...(graph.reverseAdjacency.get(nodeId) ?? [])])];
  }
}

/** Get in-degree of a node */
export function inDegree<T>(graph: FlowGraph<T>, nodeId: string): number {
  return graph.reverseAdjacency.get(nodeId)?.size ?? 0;
}

/** Get out-degree of a node */
export function outDegree<T>(graph: FlowGraph<T>, nodeId: string): number {
  return graph.adjacency.get(nodeId)?.size ?? 0;
}

/** Check if two nodes are adjacent */
export function areAdjacent<T>(graph: FlowGraph<T>, a: string, b: string): boolean {
  return graph.adjacency.get(a)?.has(b) ?? false;
}

/** Get edge between two nodes (if exists) */
export function getEdge<T>(graph: FlowGraph<T>, source: string, target: string): GraphEdge | undefined {
  for (const [, edge] of graph.edges) {
    if (edge.source === source && edge.target === target) return edge;
  }
  return undefined;
}

// --- Topological Sort ---

/** Kahn's algorithm for topological sort. Returns empty array if cycle detected. */
export function topologicalSort<T>(graph: FlowGraph<T>): string[] {
  const inDegreeMap = new Map<string, number>();
  const queue: string[] = [];
  const result: string[] = [];

  // Calculate in-degrees
  for (const [id] of graph.nodes) {
    inDegreeMap.set(id, inDegree(graph, id));
    if (inDegreeMap.get(id) === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const neighbor of graph.adjacency.get(current) ?? []) {
      const newDeg = (inDegreeMap.get(neighbor) ?? 1) - 1;
      inDegreeMap.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // If not all nodes processed, there's a cycle
  return result.length === graph.nodes.size ? result : [];
}

/** DFS-based topological sort with cycle detection info */
export function topologicalSortDFS<T>(graph: FlowGraph<T>): { order: string[]; hasCycle: boolean; cycle?: string[] } {
  const visited = new Set<string>();
  const visiting = new Set<string>(); // Currently in recursion stack
  const result: string[] = [];
  const cyclePath: string[] = [];

  const visit = (nodeId: string): boolean => {
    if (visited.has(nodeId)) return false;
    if (visiting.has(nodeId)) { cyclePath.push(nodeId); return true; } // Cycle detected

    visiting.add(nodeId);
    for (const neighbor of graph.adjacency.get(nodeId) ?? []) {
      if (visit(neighbor)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    result.unshift(nodeId); // Prepend for correct order
    return false;
  };

  for (const [id] of graph.nodes) {
    if (!visited[id]) {
      if (visit(id)) return { order: [], hasCycle: true, cycle: cyclePath };
    }
  }

  return { order: result, hasCycle: false };
}

// --- Cycle Detection ---

/** Detect if graph contains any cycles */
export function hasCycle<T>(graph: FlowGraph<T>): boolean {
  return topologicalSortDFS(graph).hasCycle;
}

/** Find all cycles in the graph using DFS */
export function findCycles<T>(graph: FlowGraph<T>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const path: string[] = [];
  const pathSet = new Set<string>();

  const dfs = (nodeId: string): void => {
    path.push(nodeId);
    pathSet.add(nodeId);

    for (const neighbor of graph.adjacency.get(nodeId) ?? []) {
      if (pathSet.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      } else if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    path.pop();
    pathSet.delete(nodeId);
    visited.add(nodeId);
  };

  for (const [id] of graph.nodes) {
    if (!visited.has(id)) dfs(id);
  }

  return cycles;
}

// --- Path Finding ---

/** BFS to find shortest path (unweighted) between two nodes */
export function findShortestPath<T>(graph: FlowGraph<T>, start: string, end: string): string[] | null {
  if (start === end) return [start];

  const visited = new Set<string>([start]);
  const queue: Array<{ node: string; path: string[] }> = [{ node: start, path: [start] }];

  while (queue.length > 0) {
    const { node, path } = queue.shift()!;

    for (const neighbor of graph.adjacency.get(node) ?? []) {
      if (neighbor === end) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ node: neighbor, path: [...path, neighbor] });
      }
    }
  }

  return null; // No path found
}

/** Dijkstra's algorithm for weighted shortest path */
export function dijkstra<T>(graph: FlowGraph<T>, start: string): Map<string, { distance: number; path: string[] }> {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const [id] of graph.nodes) {
    distances.set(id, id === start ? 0 : Infinity);
    previous.set(id, null);
    unvisited.add(id);
  }

  while (unvisited.size > 0) {
    // Find minimum distance node
    let minDist = Infinity;
    let minNode: string | null = null;
    for (const id of unvisited) {
      const d = distances.get(id)!;
      if (d < minDist) { minDist = d; minNode = id; }
    }
    if (minNode === null || minDist === Infinity) break;

    unvisited.delete(minNode);

    for (const neighbor of graph.adjacency.get(minNode) ?? []) {
      if (!unvisited.has(neighbor)) continue;
      const edge = getEdge(graph, minNode, neighbor);
      const alt = minDist + (edge?.weight ?? 1);
      if (alt < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, alt);
        previous.set(neighbor, minNode);
      }
    }
  }

  // Reconstruct paths
  const result = new Map<string, { distance: number; path: string[] }>();
  for (const [id] of graph.nodes) {
    const path: string[] = [];
    let current: string | null = id;
    while (current !== null) { path.unshift(current); current = previous.get(current)!; }
    result.set(id, { distance: distances.get(id)!, path });
  }

  return result;
}

/** Find all paths between two nodes (for small graphs) */
export function findAllPaths<T>(graph: FlowGraph<T>, start: string, end: string, maxDepth = 20): string[][] {
  const results: string[][] = [];

  const dfs = (current: string, path: string[], depth: number): void => {
    if (depth > maxDepth) return;
    if (current === end) { results.push([...path]); return; }

    for (const neighbor of graph.adjacency.get(current) ?? []) {
      if (!path.includes(neighbor)) { // Prevent revisiting
        dfs(neighbor, [...path, neighbor], depth + 1);
      }
    }
  };

  dfs(start, [start], 0);
  return results;
}

// --- Connectivity ---

/** Find all strongly connected components (Tarjan's algorithm) */
export function stronglyConnectedComponents<T>(graph: FlowGraph<T>): string[][] {
  let indexCounter = 0;
  const indexMap = new Map<string, number>();
  const lowlinkMap = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const sccs: string[][] = [];

  const strongConnect = (nodeId: string): void => {
    indexMap.set(nodeId, indexCounter);
    lowlinkMap.set(nodeId, indexCounter);
    indexCounter++;
    stack.push(nodeId);
    onStack.add(nodeId);

    for (const neighbor of graph.adjacency.get(nodeId) ?? []) {
      if (!indexMap.has(neighbor)) {
        strongConnect(neighbor);
        lowlinkMap.set(nodeId, Math.min(lowlinkMap.get(nodeId)!, lowlinkMap.get(neighbor)!));
      } else if (onStack.has(neighbor)) {
        lowlinkMap.set(nodeId, Math.min(lowlinkMap.get(nodeId)!, indexMap.get(neighbor)!));
      }
    }

    if (lowlinkMap.get(nodeId) === indexMap.get(nodeId)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== nodeId);
      sccs.push(component);
    }
  };

  for (const [id] of graph.nodes) {
    if (!indexMap.has(id)) strongConnect(id);
  }

  return sccs;
}

/** Check if graph is fully connected (undirected) or weakly connected (directed) */
export function isConnected<T>(graph: FlowGraph<T>): boolean {
  if (graph.nodes.size === 0) return true;

  const start = graph.nodes.keys().next().value!;
  const visited = new Set<string>();
  const queue = [start];
  visited.add(start);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const n of neighbors(graph, current, "both")) {
      if (!visited.has(n)) { visited.add(n); queue.push(n); }
    }
  }

  return visited.size === graph.nodes.size;
}

// --- Dependency Resolution ---

/** Resolve dependencies - returns execution order, throws on circular deps */
export function resolveDependencies<T>(graph: FlowGraph<T>, entryPoint?: string): string[] {
  const order = topologicalSort(graph);
  if (order.length === 0 && graph.nodes.size > 0) {
    const cycleInfo = topologicalSortDFS(graph);
    throw new Error(`Circular dependency detected: ${cycleInfo.cycle?.join(" → ")}`);
  }

  if (entryPoint) {
    // Filter to only nodes reachable from entry point
    const reachable = new Set<string>();
    const bfsQueue = [entryPoint];
    reachable.add(entryPoint);
    while (bfsQueue.length > 0) {
      const current = bfsQueue.shift()!;
      for (const n of graph.adjacency.get(current) ?? []) {
        if (!reachable.has(n)) { reachable.add(n); bfsQueue.push(n); }
      }
    }
    return order.filter((id) => reachable.has(id));
  }

  return order;
}

/** Get dependency tree for a specific node */
export function getDependencyTree<T>(graph: FlowGraph<T>, nodeId: string, depth = 0, maxDepth = 10, visited = new Set<string>()): DependencyTreeNode | null {
  if (depth > maxDepth || visited.has(nodeId)) return null;
  visited.add(nodeId);

  const node = graph.nodes.get(nodeId);
  if (!node) return null;

  const deps: DependencyTreeNode[] = [];
  for (const depId of graph.adjacency.get(nodeId) ?? []) {
    const child = getDependencyTree(graph, depId, depth + 1, maxDepth, visited);
    if (child) deps.push(child);
  }

  return { id: nodeId, label: node.label ?? nodeId, children: deps };
}

interface DependencyTreeNode {
  id: string;
  label: string;
  children: DependencyTreeNode[];
}

// --- Workflow Engine ---

export type WorkflowNodeStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled";

export interface WorkflowNode {
  id: string;
  fn: () => Promise<void>;
  status: WorkflowNodeStatus;
  retryCount: number;
  maxRetries: number;
  timeoutMs?: number;
  condition?: () => boolean;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
}

export interface WorkflowExecution {
  id: string;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  nodes: Map<string, WorkflowNode>;
  startedAt?: number;
  completedAt?: number;
  error?: Error;
  results: Map<string, unknown>;
  listeners: {
    onNodeComplete: ((nodeId: string, result: unknown) => void)[];
    onNodeError: ((nodeId: string, error: Error) => void)[];
    onComplete: (() => void)[];
    onError: ((error: Error) => void)[];
  };
}

export class WorkflowEngine {
  private graph: FlowGraph<WorkflowNode>;
  private executions = new Map<string, WorkflowExecution>();

  constructor() { this.graph = createGraph<WorkflowNode>(); }

  /** Add a workflow step/node */
  addStep(id: string, fn: () => Promise<void>, options?: { dependsOn?: string[]; maxRetries?: number; timeoutMs?: number; condition?: () => boolean }): this {
    const wfNode: WorkflowNode = {
      id, fn,
      status: "pending",
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 3,
      timeoutMs: options?.timeoutMs,
      condition: options?.condition,
    };
    addNode(this.graph, id, wfNode, id);
    for (const dep of options?.dependsOn ?? []) {
      addEdge(this.graph, `${dep}->${id}`, dep, id);
    }
    return this;
  }

  /** Execute the workflow from entry point(s) */
  async execute(entryPoints?: string[]): Promise<WorkflowExecution> {
    const execId = `wf-${Date.now()}`;
    const exec: WorkflowExecution = {
      id: execId,
      status: "running",
      nodes: new Map(),
      startedAt: Date.now(),
      results: new Map(),
      listeners: { onNodeComplete: [], onNodeError: [], onComplete: [], onError: [] },
    };

    // Copy node references
    for (const [id, node] of this.graph.nodes) {
      exec.nodes.set(id, { ...node.data as WorkflowNode });
    }

    this.executions.set(execId, exec);

    try {
      const order = entryPoints ? entryPoints : resolveDependencies(this.graph);

      for (const nodeId of order) {
        if (exec.status === "cancelled") break;

        const wfNode = exec.nodes.get(nodeId)!;

        // Check condition
        if (wfNode.condition && !wfNode.condition()) {
          wfNode.status = "skipped";
          continue;
        }

        wfNode.status = "running";

        try {
          await this.executeWithRetry(wfNode);
          wfNode.status = "completed";
          for (const cb of exec.listeners.onNodeComplete) cb(nodeId, exec.results.get(nodeId));
        } catch (err) {
          wfNode.status = "failed";
          wfNode.onError?.(err as Error);
          for (const cb of exec.listeners.onNodeError) cb(nodeId, err as Error);
          exec.error = err as Error;
          exec.status = "failed";
          for (const cb of exec.listeners.onError) cb(err as Error);
          break; // Stop workflow on failure
        }
      }

      if (exec.status !== "failed" && exec.status !== "cancelled") {
        exec.status = "completed";
        for (const cb of exec.listeners.onComplete) cb();
      }
    } catch (err) {
      exec.status = "failed";
      exec.error = err as Error;
      for (const cb of exec.listeners.onError) cb(err as Error);
    }

    exec.completedAt = Date.now();
    return exec;
  }

  /** Cancel a running workflow */
  cancel(execId: string): void {
    const exec = this.executions.get(execId);
    if (exec && exec.status === "running") exec.status = "cancelled";
  }

  /** Get execution by ID */
  getExecution(execId: string): WorkflowExecution | undefined { return this.executions.get(execId); }

  private async executeWithRetry(wfNode: WorkflowNode): Promise<void> {
    let lastError: Error | undefined;

    while (wfNode.retryCount <= wfNode.maxRetries) {
      try {
        if (wfNode.timeoutMs) {
          await Promise.race([
            wfNode.fn(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), wfNode.timeoutMs)),
          ]);
        } else {
          await wfNode.fn();
        }
        return; // Success
      } catch (err) {
        lastError = err as Error;
        wfNode.retryCount++;
        wfNode.onRetry?.(wfNode.retryCount);
        if (wfNode.retryCount <= wfNode.maxRetries) {
          // Exponential backoff before retry
          await new Promise((r) => setTimeout(r, Math.min(1000 * Math.pow(2, wfNode.retryCount), 30000)));
        }
      }
    }

    throw lastError ?? new Error("Max retries exceeded");
  }
}

// --- Graph Serialization ---

/** Export graph to JSON-serializable format */
export function exportGraph<T>(graph: FlowGraph<T>): object {
  return {
    nodes: Array.from(graph.nodes.entries()).map(([id, n]) => ({ id, data: n.data, label: n.label })),
    edges: Array.from(graph.edges.entries()).map(([id, e]) => ({ id, source: e.source, target: e.target, data: e.data, weight: e.weight })),
    directed: graph.directed,
  };
}

/** Import graph from exported format */
export function importGraph<T>(data: { nodes: Array<{ id: string; data: T; label?: string }>; edges: Array<{ id: string; source: string; target: string; data?: unknown; weight?: number }>; directed?: boolean }): FlowGraph<T> {
  const graph = createGraph<T>(data.directed ?? true);
  for (const n of data.nodes) addNode(graph, n.id, n.data, n.label);
  for (const e of data.edges) addEdge(graph, e.id, e.source, e.target, e.data, e.weight ?? 1);
  return graph;
}
