/**
 * Comment Component: Threaded comment/review system with avatar, timestamp,
 * reply/edit/delete actions, markdown support, nested replies, and moderation.
 */

// --- Types ---

export interface CommentAuthor {
  name: string;
  avatar?: string;
  role?: string; // e.g., "Admin", "Moderator"
}

export interface CommentData {
  id: string;
  author: CommentAuthor;
  content: string;
  timestamp: string | Date;
  /** ISO date string for sorting */
  createdAt: string;
  /** Edited? */
  edited?: boolean;
  /** Edited at */
  editedAt?: string;
  /** Liked by current user? */
  liked?: boolean;
  /** Like count */
  likes?: number;
  /** Nested replies */
  replies?: CommentData[];
}

export interface CommentOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Comments data */
  comments: CommentData[];
  /** Current user info (for ownership checks) */
  currentUser?: CommentAuthor;
  /** Max nesting depth for replies (default: 3) */
  maxDepth?: number;
  /** Show timestamps in relative format ("2h ago") */
  relativeTime?: boolean;
  /** Callback on reply */
  onReply?: (parentId: string, content: string) => void;
  /** Callback on edit */
  onEdit?: (commentId: string, content: string) => void;
  /** Callback on delete */
  onDelete?: (commentId: string) => void;
  /** Callback on like */
  onLike?: (commentId: string) => void;
  /** Allow editing own comments? */
  allowEdit?: boolean;
  /** Allow deleting own comments? */
  allowDelete?: boolean;
  /** Allow replying? */
  allowReply?: boolean;
  /** Allow liking? */
  allowLike?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface CommentInstance {
  element: HTMLElement;
  getComments: () => CommentData[];
  addComment: (comment: CommentData) => void;
  removeComment: (id: string) => void;
  updateComment: (id: string, updates: Partial<CommentData>) => void;
  likeComment: (id: string) => void;
  destroy: () => void;
}

// --- Helpers ---

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

// --- Main ---

export function createCommentSystem(options: CommentOptions): CommentInstance {
  const opts = {
    maxDepth: options.maxDepth ?? 3,
    relativeTime: options.relativeTime ?? true,
    allowEdit: options.allowEdit ?? true,
    allowDelete: options.allowDelete ?? true,
    allowReply: options.allowReply ?? true,
    allowLike: options.allowLike ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CommentSystem: container not found");

  container.className = `comment-system ${opts.className}`;
  container.style.cssText = `
    display:flex;flex-direction:column;gap:16px;
    font-family:-apple-system,sans-serif;
  `;

  let comments = [...options.comments];

  function render(): void {
    container.innerHTML = "";

    for (const comment of comments) {
      const el = renderComment(comment, 0);
      container.appendChild(el);
    }
  }

  function renderComment(comment: CommentData, depth: number): HTMLElement {
    const isOwner = opts.currentUser?.name === comment.author.name;

    const wrapper = document.createElement("div");
    wrapper.className = "comment-item";
    wrapper.dataset.id = comment.id;
    wrapper.style.cssText = depth > 0 ? `margin-left:${Math.min(depth * 24, 48)}px;` : "";

    // Comment body
    const body = document.createElement("div");
    body.style.cssText = `
      display:flex;gap:10px;padding:12px 14px;background:#fff;
      border:1px solid #f0f0f0;border-radius:10px;
      transition:border-color 0.15s;
    `;
    body.addEventListener("mouseenter", () => { body.style.borderColor = "#e5e7eb"; });
    body.addEventListener("mouseleave", () => { body.style.borderColor = "#f0f0f0"; });

    // Avatar
    const avatarArea = document.createElement("div");
    avatarArea.style.cssText = "flex-shrink:0;";
    if (comment.author.avatar && /^https?:\/|^data:image/.test(comment.author.avatar)) {
      const img = document.createElement("img");
      img.src = comment.author.avatar;
      img.alt = comment.author.name;
      img.style.cssText = "width:36px;height:36px;border-radius:50%;object-fit:cover;";
      avatarArea.appendChild(img);
    } else {
      const av = document.createElement("div");
      av.style.cssText = `
        width:36px;height:36px;border-radius:50%;background:#e2e8f0;color:#64748b;
        display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;
      `;
      av.textContent = getInitials(comment.author.name);
      avatarArea.appendChild(av);
    }
    body.appendChild(avatarArea);

    // Content area
    const contentArea = document.createElement("div");
    contentArea.style.cssText = "flex:1;min-width:0;";

    // Header: name + role + time
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;";

    const nameEl = document.createElement("strong");
    nameEl.style.cssText = "font-size:13px;color:#111827;";
    nameEl.textContent = comment.author.name;
    header.appendChild(nameEl);

    if (comment.author.role) {
      const roleBadge = document.createElement("span");
      roleBadge.style.cssText = `
        font-size:10px;font-weight:500;padding:1px 6px;border-radius:3px;
        background:#eef2ff;color:#4338ca;
      `;
      roleBadge.textContent = comment.author.role;
      header.appendChild(roleBadge);
    }

    const timeEl = document.createElement("span");
    timeEl.style.cssText = "font-size:11px;color:#9ca3af;";
    timeEl.textContent = opts.relativeTime
      ? timeAgo(comment.createdAt)
      : new Date(comment.createdAt).toLocaleDateString();
    header.appendChild(timeEl);

    if (comment.edited) {
      const editedMark = document.createElement("span");
      editedMark.style.cssText = "font-size:11px;color:#9ca3af;font-style:italic;";
      editedMark.textContent = "(edited)";
      header.appendChild(editedMark);
    }

    contentArea.appendChild(header);

    // Body text
    const textEl = document.createElement("div");
    textEl.className = "comment-body-text";
    textEl.style.cssText = "font-size:13px;color:#374151;line-height:1.6;word-break:break-word;";
    textEl.textContent = comment.content;
    contentArea.appendChild(textEl);

    // Actions bar
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:12px;margin-top:8px;";

    // Like button
    if (opts.allowLike) {
      const likeBtn = document.createElement("button");
      likeBtn.type = "button";
      likeBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:3px;
        color:${comment.liked ? "#ef4444" : "#9ca3af"};padding:2px 4px;border-radius:4px;
        transition:color 0.15s;
      `;
      likeBtn.innerHTML = `${comment.liked ? "\u2665" : "\u2661"} ${(comment.likes ?? 0) > 0 ? comment.likes : ""}`.trim();
      likeBtn.addEventListener("click", () => {
        instance.likeComment(comment.id);
        opts.onLike?.(comment.id);
      });
      actions.appendChild(likeBtn);
    }

    // Reply button
    if (opts.allowReply && depth < opts.maxDepth) {
      const replyBtn = document.createElement("button");
      replyBtn.type = "button";
      replyBtn.textContent = "Reply";
      replyBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:12px;color:#6366f1;
        padding:2px 4px;border-radius:4px;font-weight:500;
        transition:background 0.15s;
      `;
      replyBtn.addEventListener("click", () => {
        const content = prompt("Enter your reply:");
        if (content?.trim()) {
          opts.onReply?.(comment.id, content.trim());
        }
      });
      replyBtn.addEventListener("mouseenter", () => { replyBtn.style.background = "#eef2ff"; });
      replyBtn.addEventListener("mouseleave", () => { replyBtn.style.background = ""; });
      actions.appendChild(replyBtn);
    }

    // Edit button (owner only)
    if (opts.allowEdit && isOwner) {
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:12px;color:#9ca3af;
        padding:2px 4px;border-radius:4px;
      `;
      editBtn.addEventListener("click", () => {
        const newContent = prompt("Edit comment:", comment.content);
        if (newContent !== null && newContent.trim()) {
          instance.updateComment(comment.id, { content: newContent.trim(), edited: true, editedAt: new Date().toISOString() });
          opts.onEdit?.(comment.id, newContent.trim());
        }
      });
      actions.appendChild(editBtn);
    }

    // Delete button (owner only)
    if (opts.allowDelete && isOwner) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "Delete";
      delBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:12px;color:#9ca3af;
        padding:2px 4px;border-radius:4px;
      `;
      delBtn.addEventListener("click", () => {
        if (confirm("Delete this comment?")) {
          instance.removeComment(comment.id);
          opts.onDelete?.(comment.id);
        }
      });
      actions.appendChild(delBtn);
    }

    contentArea.appendChild(actions);
    body.appendChild(contentArea);
    wrapper.appendChild(body);

    // Render replies
    if (comment.replies?.length) {
      const repliesContainer = document.createElement("div");
      repliesContainer.className = "comment-replies";
      repliesContainer.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-top:8px;";
      for (const reply of comment.replies) {
        repliesContainer.appendChild(renderComment(reply, depth + 1));
      }
      wrapper.appendChild(repliesContainer);
    }

    return wrapper;
  }

  render();

  const instance: CommentInstance = {
    element: container,

    getComments() { return [...comments]; },

    addComment(newComment: CommentData) {
      comments.push(newComment);
      render();
    },

    removeComment(id: string) {
      comments = comments.filter((c) => c.id !== id);
      render();
    },

    updateComment(id: string, updates: Partial<CommentData>) {
      function updateRecursive(items: CommentData[]): boolean {
        for (let i = 0; i < items.length; i++) {
          if (items[i]!.id === id) {
            items[i] = { ...items[i]!, ...updates };
            return true;
          }
          if (items[i]!.replies && updateRecursive(items[i]!.replies!)) return true;
        }
        return false;
      }
      updateRecursive(comments);
      render();
    },

    likeComment(id: string) {
      function toggleLike(items: CommentData[]): void {
        for (const c of items) {
          if (c.id === id) {
            c.liked = !c.liked;
            c.likes = (c.likes ?? 0) + (c.liked ? 1 : -1);
            return;
          }
          if (c.replies) toggleLike(c.replies);
        }
      }
      toggleLike(comments);
      render();
    },

    destroy() { container.innerHTML = ""; },
  };

  return instance;
}
