/**
 * Tree data structure utilities.
 */

export interface TreeNode<T> {
  id: string;
  value: T;
  children: TreeNode<T>[];
  parent?: TreeNode<T>;
  depth?: number;
}

/** Create a tree node */
export function createTreeNode<T>(id: string, value: T, children: TreeNode<T>[] = []): TreeNode<T> {
  const node: TreeNode<T> = { id, value, children };
  // Set parent references
  for (const child of children) {
    child.parent = node;
  }
  return node;
}

/** Build a tree from a flat list with parent references */
export function buildTree<T extends { id: string; parentId?: string | null }>(
  items: T[],
  options?: {
    idKey?: string;
    parentIdKey?: string;
  },
): TreeNode<T>[] {
  const idKey = options?.idKey ?? "id";
  const parentIdKey = options?.parentIdKey ?? "parentId";

  const nodeMap = new Map<string, TreeNode<T>>();
  const roots: TreeNode<T>[] = [];

  // Create all nodes
  for (const item of items) {
    const id = item[idKey as keyof T] as unknown as string;
    nodeMap.set(id, {
      id,
      value: item,
      children: [],
    });
  }

  // Build hierarchy
  for (const item of items) {
    const id = item[idKey as keyof T] as unknown as string;
    const parentId = item[parentIdKey as keyof T] as unknown as string | null | undefined;

    const node = nodeMap.get(id)!;

    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node);
      node.parent = nodeMap.get(parentId);
    } else if (!parentId) {
      roots.push(node);
    } else {
      // Orphaned — treat as root
      roots.push(node);
    }
  }

  return roots;
}

/** Flatten a tree to an array in depth-first order */
export function flattenTree<T>(nodes: TreeNode<T>[]): T[] {
  const result: T[] = [];

  function traverse(node: TreeNode<T>) {
    result.push(node.value);
    for (const child of node.children) {
      traverse(child);
    }
  }

  for (const root of nodes) {
    traverse(root);
  }

  return result;
}

/** Flatten tree with depth information */
export function flattenTreeWithDepth<T>(
  nodes: TreeNode<T>[],
): Array<{ value: T; depth: number }> {
  const result: Array<{ value: T; depth: number }> = [];

  function traverse(node: TreeNode<T>, depth: number) {
    result.push({ value: node.value, depth });
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  for (const root of nodes) {
    traverse(root, 0);
  }

  return result;
}

/** Find a node by ID in the tree */
export function findNodeById<T>(nodes: TreeNode<T>[], id: string): TreeNode<T> | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;

    const found = findNodeById(node.children, id);
    if (found) return found;
  }

  return undefined;
}

/** Find all nodes matching a predicate */
export function findNodes<T>(
  nodes: TreeNode<T>[],
  predicate: (node: TreeNode<T>) => boolean,
): TreeNode<T>[] {
  const results: TreeNode<T>[] = [];

  function search(nodeList: TreeNode<T>[]) {
    for (const node of nodeList) {
      if (predicate(node)) results.push(node);
      search(node.children);
    }
  }

  search(nodes);

  return results;
}

/** Get the path from root to a node */
export function getPathToNode<T>(target: TreeNode<T>): TreeNode<T>[] {
  const path: TreeNode<T>[] = [];
  let current: TreeNode<T> | undefined = target;

  while (current) {
    path.unshift(current);
    current = current.parent;
  }

  return path;
}

/** Calculate the maximum depth of a tree */
export function getTreeDepth<T>(nodes: TreeNode<T>[]): number {
  let maxDepth = 0;

  function measure(node: TreeNode<T>, depth: number) {
    maxDepth = Math.max(maxDepth, depth);
    for (const child of node.children) {
      measure(child, depth + 1);
    }
  }

  for (const root of nodes) {
    measure(root, 1);
  }

  return maxDepth;
}

/** Count total nodes in a tree */
export function countNodes<T>(nodes: TreeNode<T>[]): number {
  let count = 0;

  function count(node: TreeNode<T>) {
    count++;
    for (const child of node.children) {
      count(child);
    }
  }

  for (const root of nodes) {
    count(root);
  }

  return count;
}

/** Map over all values in a tree, returning a new tree structure */
export function mapTree<T, R>(
  nodes: TreeNode<T>[],
  fn: (value: T, depth: number) => R,
): TreeNode<R>[] {
  return nodes.map((node) => mapNode(node, fn, 0));
}

function mapNode<T, R>(node: TreeNode<T>, fn: (value: T, depth: number) => R, depth: number): TreeNode<R> {
  return {
    id: node.id,
    value: fn(node.value, depth),
    children: node.children.map((child) => mapNode(child, fn, depth + 1)),
  };
}

/** Filter a tree — keep only nodes (and ancestors) that match predicate */
export function filterTree<T>(
  nodes: TreeNode<T>[],
  predicate: (value: T) => boolean,
): TreeNode<T>[] {
  return nodes
    .map((node) => filterNode(node, predicate))
    .filter(Boolean) as TreeNode<T>[];
}

function filterNode<T>(node: TreeNode<T>, predicate: (value: T) => boolean): TreeNode<T> | null {
  const filteredChildren = node.children
    .map((child) => filterNode(child, predicate))
    .filter(Boolean) as TreeNode<T>[];

  // Keep this node if it matches or has matching descendants
  if (predicate(node.value) || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren,
    };
  }

  return null;
}
