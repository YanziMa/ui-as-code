/**
 * Virtual filesystem utilities v2: path manipulation, directory tree operations,
 * file watching (polling-based), glob patterns, tree diffing, FS stats.
 */

// --- Path Utilities ---

/** Normalize a file path (resolve . and .., remove duplicate slashes) */
export function normalizePath(path: string): string {
  let result = path.replace(/\\/g, "/");

  // Preserve leading ./ or ../
  let prefix = "";
  while (result.startsWith("../") || result.startsWith("./")) {
    if (result.startsWith("../")) { prefix += "../"; result = result.slice(3); }
    else { prefix += "./"; result = result.slice(2); }
  }

  const parts = result.split("/").filter(Boolean);
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "..") {
      if (resolved.length > 0 && resolved[resolved.length - 1] !== "..") {
        resolved.pop();
      } else {
        resolved.push("..");
      }
    } else if (part !== ".") {
      resolved.push(part);
    }
  }

  return prefix + (resolved.length === 0 && !prefix ? "." : resolved.join("/"));
}

/** Join path segments */
export function joinPath(...segments: string[]): string {
  return segments
    .map((s, i) => i === 0 ? s.replace(/\/+$/, "") : s.replace(/^\/+|\/+$/g, ""))
    .filter((s) => s.length > 0)
    .join("/");
}

/** Get directory name from path */
export function dirname(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash <= 0 ? "." : normalized.slice(0, lastSlash);
}

/** Get base filename from path */
export function basename(path: string, ext?: string): string {
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/") + 1;
  let name = normalized.slice(lastSlash);
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}

/** Get file extension including dot */
export function extname(path: string): string {
  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1 || lastDot === path.lastIndexOf("/") + 1) return "";
  // Don't treat dotfiles as extensions
  const afterSlash = path.lastIndexOf("/") + 1;
  if (lastDot === afterSlash) return ""; // Hidden file like .gitignore
  return path.slice(lastDot);
}

/** Check if path is absolute */
export function isAbsolute(path: string): boolean {
  return /^\//.test(path) || /^[a-zA-Z]:\\/.test(path) || /^[a-zA-Z]:\//.test(path);
}

/** Check if path is relative */
export function isRelative(path: string): boolean { return !isAbsolute(path); }

/** Make path relative to a base */
export function relative(from: string, to: string): string {
  const fromParts = normalizePath(from).split("/").filter(Boolean);
  const toParts = normalizePath(to).split("/").filter(Boolean);

  // Find common prefix length
  let commonLength = 0;
  const minLen = Math.min(fromParts.length, toParts.length);
  for (; commonLength < minLen; commonLength++) {
    if (fromParts[commonLength]!.toLowerCase() !== toParts[commonLength]!.toLowerCase()) break;
  }

  // Build relative path
  const upCount = fromParts.length - commonLength;
  const upParts = Array(upCount).fill("..");
  const downParts = toParts.slice(commonLength);

  return [...upParts, ...downParts].join("/") || ".";
}

/** Resolve a path against a base (like Node's path.resolve but simpler) */
export function resolvePath(...segments: string[]): string {
  let result = "";
  for (const seg of segments) {
    if (isAbsolute(seg)) {
      result = seg.replace(/\\/g, "/");
    } else {
      result = result ? joinPath(result, seg) : seg;
    }
  }
  return normalizePath(result);
}

// --- Glob Patterns ---

export interface GlobOptions {
  dot?: boolean;       // Include dotfiles
  caseSensitive?: boolean;
  onlyDirectories?: boolean;
  onlyFiles?: boolean;
  deep?: number;        // Max depth (-1 = unlimited)
}

/** Simple glob pattern matcher (supports *, **, ?, [abc], [!abc]) */
export function matchGlob(pattern: string, str: string, options?: GlobOptions): boolean {
  const { caseSensitive = true } = options ?? {};
  const s = caseSensitive ? str : str.toLowerCase();
  const p = caseSensitive ? pattern : pattern.toLowerCase();

  // Convert glob to regex
  const regexStr = globToRegex(p);
  try {
    return new RegExp(`^${regexStr}$`).test(s);
  } catch {
    return false;
  }
}

function globToRegex(glob: string): string {
  let result = "";
  let i = 0;

  while (i < glob.length) {
    const ch = glob[i]!;

    switch (ch) {
      case "*":
        if (glob[i + 1] === "*") {
          // ** matches any number of directories
          result += "(?:[^/]*(?:/|$))*";
          i += 2;
          // Skip any following /
          while (i < glob.length && glob[i] === "/") i++;
        } else {
          result += "[^/]*";
          i++;
        }
        break;
      case "?":
        result += "[^/]";
        i++;
        break;
      case "[":
        const bracketEnd = glob.indexOf("]", i);
        if (bracketEnd === -1) {
          result += "\\[";
          i++;
        } else {
          result += "[";
          // Handle negation
          if (glob[i + 1] === "!") {
            result += "^";
            i++;
          }
          i++;
          while (i < bracketEnd) {
            if (glob[i] === "\\") { result += "\\\\"; i++; }
            else result += glob[i]!;
            i++;
          }
          result += "]";
          i = bracketEnd + 1;
        }
        break;
      case ".":
      case "+":
      case "(":
      case ")":
      case "{":
      case "}":
      case "|":
      case "^":
      case "$":
      case "\\":
        result += `\\${ch}`;
        i++;
        break;
      default:
        result += ch;
        i++;
    }
  }

  return result;
}

/** Match files in a virtual tree against a glob pattern */
export function globMatch(
  files: string[],
  pattern: string,
  options?: GlobOptions & { cwd?: string },
): string[] {
  const { cwd = "", ...opts } = options ?? {};
  return files.filter((f) => {
    const rel = cwd ? relative(cwd, f) : f;
    return matchGlob(pattern, rel, opts);
  });
}

// --- Virtual File System Tree ---

export interface FsNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  content?: string;
  modifiedAt?: Date;
  createdAt?: Date;
  children?: Map<string, FsNode>;
  /** For symlinks */
  symlink?: string;
}

export class VirtualFileSystem {
  private root: FsNode;

  constructor() {
    this.root = { name: "/", path: "/", type: "directory", children: new Map() };
  }

  /** Create file or directory */
  createEntry(path: string, type: "file" | "directory", content?: string): FsNode {
    const parentPath = dirname(path);
    const name = basename(path);
    const parent = this.ensureDir(parentPath);

    const entry: FsNode = {
      name,
      path: normalizePath(path),
      type,
      modifiedAt: new Date(),
      createdAt: new Date(),
      ...(type === "file" ? { content: content ?? "", size: content?.length ?? 0 } : { children: new Map() }),
    };

    parent.children!.set(name, entry);
    return entry;
  }

  /** Read file content */
  readFile(path: string): string | null {
    const node = this.findNode(path);
    return node?.type === "file" ? (node.content ?? null) : null;
  }

  /** Write file content */
  writeFile(path: string, content: string): void {
    const node = this.findNode(path);
    if (node?.type === "file") {
      node.content = content;
      node.size = content.length;
      node.modifiedAt = new Date();
    } else {
      this.createEntry(path, "file", content);
    }
  }

  /** Ensure directory exists (create parents as needed) */
  ensureDir(path: string): FsNode {
    const normalized = normalizePath(path);
    if (normalized === "/" || normalized === ".") return this.root;

    const parts = normalized.split("/").filter(Boolean);
    let current = this.root;

    for (const part of parts) {
      let child = current.children!.get(part);
      if (!child) {
        child = {
          name: part,
          path: joinPath(current.path, part),
          type: "directory",
          createdAt: new Date(),
          children: new Map(),
        };
        current.children!.set(part, child);
      }
      if (child.type !== "directory") {
        // Replace file with directory (unusual but possible in some systems)
        child.type = "directory";
        child.children = new Map();
      }
      current = child;
    }

    return current;
  }

  /** List directory contents */
  listDir(path: string): FsNode[] {
    const node = this.findNode(path);
    if (!node || node.type !== "directory" || !node.children) return [];
    return Array.from(node.children.values()).sort((a, b) => {
      // Directories first, then alphabetical
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  /** Delete a file or empty directory */
  delete(path: string): boolean {
    const parentPath = dirname(path);
    const name = basename(path);
    const parent = this.findNode(parentPath);

    if (!parent?.children?.has(name)) return false;
    const node = parent.children.get(name)!;

    // Can't delete non-empty directory without recursive flag
    if (node.type === "directory" && node.children && node.children.size > 0) {
      return false;
    }

    parent.children.delete(name);
    return true;
  }

  /** Recursively delete */
  deleteRecursive(path: string): boolean {
    const parentPath = dirname(path);
    const name = basename(path);
    const parent = this.findNode(parentPath);

    if (!parent?.children?.has(name)) return false;
    parent.children.delete(name);
    return true;
  }

  /** Move/rename */
  move(from: string, to: string): boolean {
    const node = this.findNode(from);
    if (!node) return false;

    const content = node.type === "file" ? node.content : undefined;
    this.createEntry(to, node.type as "file" | "directory", content);

    // If directory, copy children
    if (node.type === "directory" && node.children) {
      const newNode = this.findNode(to)!;
      for (const [childName, child] of node.children) {
        newNode.children!.set(childName, { ...child });
      }
    }

    return this.delete(from);
  }

  /** Copy file or directory */
  copy(from: string, to: string): boolean {
    const node = this.findNode(from);
    if (!node) return false;

    this.createEntry(to, node.type as "file" | "directory", node.content);

    if (node.type === "directory" && node.children) {
      const newNode = this.findNode(to)!;
      for (const [childName, child] of node.children) {
        this.copy(child.path, joinPath(to, childName));
      }
    }

    return true;
  }

  /** Find node by path */
  findNode(path: string): FsNode | null {
    const normalized = normalizePath(path);
    if (normalized === "/" || normalized === "." || normalized === "") return this.root;

    const parts = normalized.split("/").filter(Boolean);
    let current: FsNode | null = this.root;

    for (const part of parts) {
      if (!current?.children?.has(part)) return null;
      current = current.children.get(part) ?? null;
    }

    return current;
  }

  /** Check if path exists */
  exists(path: string): boolean { return this.findNode(path) !== null; }

  /** Get file/directory info */
  stat(path: string): FsNode | null { return this.findNode(path); }

  /** Get entire tree as nested object */
  getTree(path?: string, maxDepth = -1): FsNode {
    const root = path ? this.findNode(path) : this.root;
    if (!root) throw new Error(`Path not found: ${path}`);

    if (maxDepth === 0) return { ...root, children: undefined };

    const clone: FsNode = { ...root };
    if (root.children) {
      clone.children = new Map();
      for (const [key, value] of root.children) {
        clone.children.set(key, this.getTree(value.path, maxDepth < 0 ? -1 : maxDepth - 1));
      }
    }
    return clone;
  }

  /** Walk the tree calling visitor for each node */
  walk(
    visitor: (node: FsNode, depth: number) => boolean | void,
    startPath?: string,
    depth = 0,
  ): void {
    const root = startPath ? this.findNode(startPath) : this.root;
    if (!root) return;

    const shouldContinue = visitor(root, depth);
    if (shouldContinue === false) return;

    if (root.children) {
      for (const child of root.children.values()) {
        this.walk(visitor, child.path, depth + 1);
      }
    }
  }

  /** Calculate total size of a directory */
  du(path: string): number {
    const node = this.findNode(path);
    if (!node) return 0;
    if (node.type === "file") return node.size ?? 0;

    let total = 0;
    this.walk((n) => { if (n.type === "file") total += n.size ?? 0; }, path);
    return total;
  }

  /** Count files and directories */
  count(path: string): { files: number; directories: number } {
    let files = 0, dirs = 0;
    this.walk((n) => { if (n.type === "file") files++; else dirs++; }, path);
    return { files, directories: dirs };
  }

  /** Export tree as JSON-serializable object */
  toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    this.walk((node) => {
      if (node.type === "file") {
        obj[node.path] = { type: "file", size: node.size };
      }
    });
    return obj;
  }

  /** Import from flat key-value structure */
  fromJSON(data: Record<string, { type: string; content?: string; size?: number }>): void {
    for (const [path, info] of Object.entries(data)) {
      if (info.type === "file") {
        this.createEntry(path, "file", info.content);
      } else {
        this.ensureDir(path);
      }
    }
  }
}

// --- File Tree Diff ---

export interface TreeDiff {
  added: string[];
  removed: string[];
  modified: string[];     // Content changed
  renamed: Array<{ from: string; to: string }>;
  unchanged: string[];
}

/** Compare two virtual filesystem trees */
export function diffTrees(a: VirtualFileSystem, b: VirtualFileSystem, basePath = "/"): TreeDiff {
  const result: TreeDiff = { added: [], removed: [], modified: [], renamed: [], unchanged: [] };

  const filesA = new Set<string>();
  const filesB = new Set<string>();
  const contentsA = new Map<string, string>();
  const contentsB = new Map<string, string>();

  a.walk((node) => { if (node.type === "file") { filesA.add(node.path); contentsA.set(node.path, a.readFile(node.path) ?? ""); } }, basePath);
  b.walk((node) => { if (node.type === "file") { filesB.add(node.path); contentsB.set(node.path, b.readFile(node.path) ?? ""); } }, basePath);

  for (const path of filesA) {
    if (!filesB.has(path)) {
      result.removed.push(path);
    } else if (contentsA.get(path) !== contentsB.get(path)) {
      result.modified.push(path);
    } else {
      result.unchanged.push(path);
    }
  }

  for (const path of filesB) {
    if (!filesA.has(path)) {
      result.added.push(path);
    }
  }

  return result;
}
