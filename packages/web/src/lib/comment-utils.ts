/**
 * Comment Utilities: Comment thread component with nested replies, avatars,
 * timestamps, markdown rendering, actions (reply/edit/delete/like),
 * collapsible threads, and ARIA live regions.
 */

// --- Types ---

export type CommentVariant = "default" | "primary" | "success" | "warning";

export interface CommentAuthor {
  /** Display name */
  name: string;
  /** Avatar URL */
  avatar?: string;
  /** Author role badge */
  role?: "author" | "moderator" | "admin";
}

export interface CommentAction {
  /** Action label */
  label: string;
  /** Icon (HTML string) */
  icon?: string;
  /** Click handler */
  onClick: () => void;
  /** Destructive action? (shown in red) */
  destructive?: boolean;
}

export interface Comment {
  /** Unique ID */
  id: string;
  /** Author info */
  author: CommentAuthor;
  /** Comment body text (supports basic HTML) */
  body: string;
  /** ISO date string or Date object */
  createdAt: Date | string;
  /** Updated at? */
  updatedAt?: Date | string;
  /** Nested replies */
  replies?: Comment[];
  /** Is the comment edited? */
  edited?: boolean;
  /** Like count */
  likes?: number;
  /** Did current user like this? */
  liked?: boolean;
  /** Pinned? */
  pinned?: boolean;
  /** Custom actions */
  actions?: CommentAction[];
  /** Variant for styling */
  variant?: CommentVariant;
  /** Collapsed state (for long threads) */
  collapsed?: boolean;
}

export interface CommentThreadOptions {
  /** Root-level comments */
  comments: Comment[];
  /** Current user ID (for ownership checks) */
  currentUserId?: string;
  /** Max nesting depth for replies */
  maxDepth?: number;
  /** Show timestamps as relative ("2h ago") vs absolute */
  relativeTime?: boolean;
  /** Show avatars? */
  showAvatar?: boolean;
  /** Show like button? */
  showLikes?: boolean;
  /** Show reply action? */
  showReply?: boolean;
  /** Allow editing own comments? */
  allowEdit?: boolean;
  /** Allow deleting own comments? */
  allowDelete?: boolean;
  /** On reply callback */
  onReply?: (parentId: string) => void;
  /** On edit callback */
  onEdit?: (commentId: string) => void;
  /** On delete callback */
  onDelete?: (commentId: string) => void;
  /** On like toggle callback */
  onLike?: (commentId: string, liked: boolean) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface CommentThreadInstance {
  /** Root element */
  el: HTMLElement;
  /** Add a new top-level comment */
  addComment(comment: Comment): void;
  /** Add a reply to an existing comment */
  addReply(parentId: string, reply: Comment): void;
  /** Remove a comment by ID */
  removeComment(id: string): void;
  /** Update a comment's content */
  updateComment(id: string, updates: Partial<Comment>): void;
  /** Toggle like on a comment */
  toggleLike(id: string): void;
  /** Set all comments */
  setComments(comments: Comment[]): void;
  /** Get all comments */
  getComments(): Comment[];
  /** Collapse/expand a thread */
  collapseThread(id: string, collapsed: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Helpers ---

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const palette = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
  return palette[Math.abs(hash) % palette.length];
}

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const ROLE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  "admin": { bg: "#fef2f2", color: "#dc2626", label: "Admin" },
  "moderator": { bg: "#fef3c7", color: "#d97706", label: "Mod" },
  "author": { bg: "#eff6ff", color: "#2563eb", label: "Author" },
};

// --- Core Factory ---

/**
 * Create a comment thread component.
 *
 * @example
 * ```ts
 * const thread = createCommentThread({
 *   comments: [
 *     {
 *       id: "c1",
 *       author: { name: "Alice", avatar: "/alice.png" },
 *       body: "Great work on this feature!",
 *       createdAt: new Date(),
 *       likes: 3,
 *       replies: [
 *         { id: "c2", author: { name: "Bob" }, body: "Thanks!", createdAt: new Date() },
 *       ],
 *     },
 *   ],
 *   onReply: (id) => openReplyBox(id),
 * });
 * ```
 */
export function createCommentThread(options: CommentThreadOptions): CommentThreadInstance {
  const {
    comments,
    currentUserId,
    maxDepth = 5,
    relativeTime = true,
    showAvatar = true,
    showLikes = true,
    showReply = true,
    allowEdit = true,
    allowDelete = true,
    onReply,
    onEdit,
    onDelete,
    onLike,
    className,
    container,
  } = options;

  let _comments = [...comments];

  // Root
  const root = document.createElement("div");
  root.className = `comment-thread ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-direction:column;gap:12px;font-size:14px;color:#374151;";

  _render();

  // --- Render ---

  function _render(): void {
    root.innerHTML = "";

    // Sort: pinned first, then by date
    const sorted = [..._comments].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return db - da;
    });

    sorted.forEach((comment) => {
      renderComment(comment, 0);
    });
  }

  function renderComment(comment: Comment, depth: number): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = `comment ${comment.variant ?? "default"}`;
    wrapper.dataset.commentId = comment.id;
    wrapper.style.cssText =
      `display:flex;gap:10px;padding:12px;border-radius:10px;` +
      "background:#fff;border:1px solid #e5e7eb;" +
      (comment.pinned ? "border-color:#f59e0b;border-width:1.5px;" : "");

    // Avatar
    if (showAvatar) {
      const avatarArea = document.createElement("div");
      avatarArea.style.flexShrink = "0";

      if (comment.author.avatar) {
        const img = document.createElement("img");
        img.src = comment.author.avatar;
        img.alt = comment.author.name;
        img.style.cssText =
          "width:36px;height:36px;border-radius:50%;object-fit-cover;";
        img.onerror = () => { img.replaceWith(createFallbackAvatar(comment.author.name)); };
        avatarArea.appendChild(img);
      } else {
        avatarArea.appendChild(createFallbackAvatar(comment.author.name));
      }
      wrapper.appendChild(avatarArea);
    }

    // Content area
    const contentArea = document.createElement("div");
    contentArea.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;";

    // Header row
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.alignItems = "center";
    headerRow.style.gap = "8px";

    const authorName = document.createElement("span");
    authorName.textContent = comment.author.name;
    authorName.style.cssText = "font-weight:600;font-size:13px;color:#111827;";
    headerRow.appendChild(authorName);

    // Role badge
    if (comment.author.role && ROLE_STYLES[comment.author.role]) {
      const rs = ROLE_STYLES[comment.author.role];
      const badge = document.createElement("span");
      badge.textContent = rs.label;
      badge.style.cssText =
        `font-size:10px;font-weight:600;padding:1px 6px;border-radius:9999px;` +
        `background:${rs.bg};color:${rs.color};`;
      headerRow.appendChild(badge);
    }

    // Timestamp
    const timeLabel = document.createElement("span");
    timeLabel.textContent = relativeTime
      ? timeAgo(comment.createdAt)
      : formatDate(comment.createdAt);
    timeLabel.style.cssText = "font-size:11px;color:#9ca3af;margin-left:auto;";
    headerRow.appendChild(timeLabel);

    // Edited indicator
    if (comment.edited) {
      const editedBadge = document.createElement("span");
      editedBadge.textContent = "(edited)";
      editedBadge.style.cssText = "font-size:11px;color:#9ca3af;font-style:italic;margin-left:4px;";
      headerRow.appendChild(editedBadge);
    }

    contentArea.appendChild(headerRow);

    // Body
    const bodyEl = document.createElement("div");
    bodyEl.className = "comment-body";
    bodyEl.innerHTML = comment.body;
    bodyEl.style.cssText = "font-size:14px;line-height:1.5;color:#374151;word-break:break-word;";
    contentArea.appendChild(bodyEl);

    // Actions row
    const hasActions = (showLikes || showReply || comment.actions ||
      (allowEdit && comment.author.name === currentUserId) ||
      (allowDelete && comment.author.name === currentUserId));

    if (hasActions) {
      const actionsRow = document.createElement("div");
      actionsRow.style.display = "flex";
      actionsRow.style.gap = "12px";
      actionsRow.style.marginTop = "4px";

      // Like button
      if (showLikes) {
        const likeBtn = document.createElement("button");
        likeBtn.type = "button";
        likeBtn.innerHTML = `${comment.liked ? "&#10084;" : "&#9825;"} ${comment.likes ?? 0}`;
        likeBtn.style.cssText =
          "background:none;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:3px;" +
          `color:${comment.liked ? "#ef4444" : "#9ca3af"};padding:2px 4px;border-radius:4px;` +
          "transition:color 0.12s;";
        likeBtn.addEventListener("mouseenter", () => { likeBtn.style.color = "#ef4444"; });
        likeBtn.addEventListener("mouseleave", () => { likeBtn.style.color = comment.liked ? "#ef4444" : "#9ca3af"; });
        likeBtn.addEventListener("click", () => instance.toggleLike(comment.id));
        actionsRow.appendChild(likeBtn);
      }

      // Reply button
      if (showReply && depth < maxDepth) {
        const replyBtn = document.createElement("button");
        replyBtn.type = "button";
        replyBtn.textContent = "Reply";
        replyBtn.style.cssText =
          "background:none;border:none;cursor:pointer;font-size:12px;color:#6b7280;" +
          "padding:2px 6px;border-radius:4px;transition:color 0.12s;";
        replyBtn.addEventListener("mouseenter", () => { replyBtn.style.color = "#3b82f6"; });
        replyBtn.addEventListener("mouseleave", () => { replyBtn.style.color = "#6b7280"; });
        replyBtn.addEventListener("click", () => onReply?.(comment.id));
        actionsRow.appendChild(replyBtn);
      }

      // Edit / Delete (own comments only)
      const isOwn = comment.author.name === currentUserId;

      if (isOwn && allowEdit) {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.style.cssText =
          "background:none;border:none;cursor:pointer;font-size:12px;color:#9ca3af;" +
          "padding:2px 6px;border-radius:4px;";
        editBtn.addEventListener("click", () => onEdit?.(comment.id));
        actionsRow.appendChild(editBtn);
      }

      if (isOwn && allowDelete) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.style.cssText =
          "background:none;border:none;cursor:pointer;font-size:12px;color:#ef4444;" +
          "padding:2px 6px;border-radius:4px;";
        deleteBtn.addEventListener("click", () => onDelete?.(comment.id));
        actionsRow.appendChild(deleteBtn);
      }

      // Custom actions
      if (comment.actions) {
        for (const action of comment.actions) {
          const btn = document.createElement("button");
          btn.type = "button";
          if (action.icon) btn.innerHTML = `${action.icon} ${action.label}`;
          else btn.textContent = action.label;
          btn.style.cssText =
            "background:none;border:none;cursor:pointer;font-size:12px;padding:2px 8px;border-radius:4px;" +
            (action.destructive ? "color:#ef4444;" : "color:#6b7280;");
          btn.addEventListener("click", action.onClick);
          actionsRow.appendChild(btn);
        }
      }

      contentArea.appendChild(actionsRow);
    }

    wrapper.appendChild(contentArea);

    // Replies
    if (comment.replies && comment.replies.length > 0 && !comment.collapsed) {
      const repliesWrapper = document.createElement("div");
      repliesWrapper.className = "comment-replies";
      repliesWrapper.style.cssText =
        `margin-left:${Math.min(40 + depth * 24, 80)}px;margin-top:8px;` +
        "display:flex;flex-direction:column;gap:8px;" +
        "border-left:2px solid #f3f4f6;padding-left:12px;";

      for (const reply of comment.replies) {
        repliesWrapper.appendChild(renderComment(reply, depth + 1));
      }
      wrapper.appendChild(repliesWrapper);
    }

    // Collapse indicator for long threads
    if (comment.replies && comment.replies.length > 0) {
      const collapseToggle = document.createElement("button");
      collapseToggle.type = "button";
      collapseToggle.textContent = comment.collapsed
        ? `Show ${comment.replies.length} replies`
        : "Hide replies";
      collapseToggle.style.cssText =
        "background:none;border:none;cursor:pointer;font-size:11px;color:#3b82f6;" +
        "padding:2px 0;text-align:left;width:auto;";
      collapseToggle.addEventListener("click", () => instance.collapseThread(comment.id, !comment.collapsed));
      contentArea.appendChild(collapseToggle);
    }

    root.appendChild(wrapper);
    return wrapper;
  }

  function createFallbackAvatar(name: string): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText =
      "width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;" +
      `background:${getColorForName(name)};color:#fff;font-size:13px;font-weight:600;flex-shrink:0;`;
    el.textContent = getInitials(name);
    return el;
  }

  function findComment(id: string, arr: Comment[] = _comments): Comment | undefined {
    for (const c of arr) {
      if (c.id === id) return c;
      if (c.replies) {
        const found = findComment(id, c.replies);
        if (found) return found;
      }
    }
    return undefined;
  }

  function findAndRemove(id: string, arr: Comment[]): boolean {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i]!.id === id) { arr.splice(i, 1); return true; }
      if (arr[i]!.replies && findAndRemove(id, arr[i]!.replies!)) return true;
    }
    return false;
  }

  // --- Instance ---

  const instance: CommentThreadInstance = {
    el: root,

    addComment(c) { _comments.push(c); _render(); },

    addReply(parentId, reply) {
      const parent = findComment(parentId);
      if (parent) {
        if (!parent.replies) parent.replies = [];
        parent.replies.push(reply);
        _render();
      }
    },

    removeComment(id) { findAndRemove(id); _render(); },

    updateComment(id, updates) {
      const c = findComment(id);
      if (c) Object.assign(c, updates);
      _render();
    },

    toggleLike(id) {
      const c = findComment(id);
      if (c) {
        c.liked = !c.liked;
        c.likes = (c.likes ?? 0) + (c.liked ? 1 : -1);
        onLike?.(id, c.liked);
        _render();
      }
    },

    setComments(comments) { _comments = comments; _render(); },

    getComments() { return [..._comments]; },

    collapseThread(id, collapsed) {
      const c = findComment(id);
      if (c) { c.collapsed = collapsed; _render(); }
    },

    destroy() { root.remove(); },
  };

  if (container) container.appendChild(root);

  return instance;
}
