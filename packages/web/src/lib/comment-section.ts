/**
 * Comment Section: Threaded comment system with replies, voting, markdown support,
 * user avatars, timestamps, edit/delete, nested replies, and infinite scroll.
 */

// --- Types ---

export interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
  /** Is the current user? */
  isCurrentUser?: boolean;
}

export interface Comment {
  id: string;
  author: CommentAuthor;
  content: string; // supports basic HTML
  /** ISO timestamp */
  createdAt: string;
  /** Updated timestamp (if edited) */
  updatedAt?: string;
  /** Vote count */
  votes?: number;
  /** Has current user voted up? */
  votedUp?: boolean;
  /** Reply count */
  replyCount?: number;
  /** Nested replies */
  replies?: Comment[];
  /** Is it pinned? */
  pinned?: boolean;
  /** Is it deleted? (show placeholder) */
  deleted?: boolean;
  /** Attachments */
  attachments?: Array<{ url: string; name: string; type: string }>;
}

export interface CommentSectionOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Comments data */
  comments?: Comment[];
  /** Current user info */
  currentUser?: CommentAuthor;
  /** Max nesting depth for replies */
  maxDepth?: number;
  /** Show avatars? */
  showAvatars?: boolean;
  /** Show vote buttons? */
  showVotes?: boolean;
  /** Show timestamps? */
  showTimestamps?: boolean;
  /** Allow replying? */
  allowReply?: boolean;
  /** Allow editing own comments? */
  allowEdit?: boolean;
  /** Allow deleting? */
  allowDelete?: boolean;
  /** Allow voting? */
  allowVote?: boolean;
  /** Sort order */
  sortOrder?: "newest" | "oldest" | "top" | "hot";
  /** Placeholder text for new comment input */
  placeholder?: string;
  /** Callback when a new comment is submitted */
  onSubmit?: (content: string, parentId?: string) => Promise<Comment> | void;
  /** Callback when comment is edited */
  onEdit?: (id: string, content: string) => Promise<void> | void;
  /** Callback when comment is deleted */
  onDelete?: (id: string) => Promise<void> | void;
  /** Callback when vote cast */
  onVote?: (id: string, direction: "up") => Promise<void> | void;
  /** Callback on sort change */
  onSortChange?: (order: "newest" | "oldest" | "top" | "hot") => void;
  /** Custom CSS class */
  className?: string;
}

export interface CommentSectionInstance {
  element: HTMLElement;
  getComments: () => Comment[];
  setComments: (comments: Comment[]) => void;
  addComment: (comment: Comment) => void;
  removeComment: (id: string) => void;
  updateComment: (id: string, updates: Partial<Comment>) => void;
  setSortOrder: (order: "newest" | "oldest" | "top" | "hot") => void;
  focusInput: () => void;
  destroy: () => void;
}

// --- Helpers ---

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return d.toLocaleDateString();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Main Factory ---

export function createCommentSection(options: CommentSectionOptions): CommentSectionInstance {
  const opts = {
    maxDepth: options.maxDepth ?? 3,
    showAvatars: options.showAvatars ?? true,
    showVotes: options.showVotes ?? true,
    showTimestamps: options.showTimestamps ?? true,
    allowReply: options.allowReply ?? true,
    allowEdit: options.allowEdit ?? true,
    allowDelete: options.allowDelete ?? true,
    allowVote: options.allowVote ?? true,
    sortOrder: options.sortOrder ?? "newest",
    placeholder: options.placeholder ?? "Write a comment...",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CommentSection: container not found");

  let comments: Comment[] = [...(options.comments ?? [])];
  let destroyed = false;
  let activeReplyTo: string | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `comment-section ${opts.className ?? ""}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;font-size:14px;
  `;
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";

    // New comment input at top
    root.appendChild(createInputArea(null));

    // Sort bar
    const sortBar = document.createElement("div");
    sortBar.style.cssText = "display:flex;align-items:center;gap:12px;margin:16px 0 12px;padding-bottom:10px;border-bottom:1px solid #f0f0f0;";
    sortBar.innerHTML = `<span style="font-weight:600;color:#111827;">${comments.length} Comments</span>`;

    const orders: Array<{ value: typeof opts.sortOrder; label: string }> = [
      { value: "newest", label: "Newest" },
      { value: "oldest", label: "Oldest" },
      { value: "top", label: "Top" },
      { value: "hot", label: "Hot" },
    ];

    for (const o of orders) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = o.label;
      btn.dataset.sort = o.value;
      btn.style.cssText = `
        padding:3px 10px;border-radius:9999px;font-size:12px;border:none;cursor:pointer;
        background:${opts.sortOrder === o.value ? "#eef2ff" : "transparent"};
        color:${opts.sortOrder === o.value ? "#4338ca" : "#6b7280"};
        font-weight:${opts.sortOrder === o.value ? "600" : "400"};
        transition:all 0.15s;
      `;
      btn.addEventListener("click", () => instance.setSortOrder(o.value));
      sortBar.appendChild(btn);
    }

    root.appendChild(sortBar);

    // Comment list
    const list = document.createElement("div");
    list.className = "comment-list";

    const sorted = sortComments(comments);
    for (const c of sorted) {
      list.appendChild(createCommentNode(c, 0));
    }

    if (sorted.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px 16px;color:#9ca3af;";
      empty.innerHTML = `<div style="font-size:28px;margin-bottom:8px;">\u{1F4AC}</div><div>No comments yet. Be the first!</div>`;
      list.appendChild(empty);
    }

    root.appendChild(list);
  }

  function sortComments(arr: Comment[]): Comment[] {
    const sorted = [...arr];
    switch (opts.sortOrder) {
      case "newest": sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "oldest": sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "top": sorted.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)); break;
      case "hot": sorted.sort((a, b) => ((b.votes ?? 0) + (b.replyCount ?? 0)) - ((a.votes ?? 0) + (a.replyCount ?? 0))); break;
    }
    return sorted;
  }

  function createInputArea(parentId: string | null): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "comment-input-area";
    wrap.style.cssText = "display:flex;gap:10px;margin-bottom:16px;align-items:flex-start;";

    // Avatar
    if (opts.currentUser && opts.showAvatars) {
      const avatar = document.createElement("div");
      avatar.style.cssText = `width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0;`;
      avatar.textContent = opts.currentUser.name.charAt(0).toUpperCase();
      wrap.appendChild(avatar);
    }

    const inputWrap = document.createElement("div");
    inputWrap.style.cssText = "flex:1;display:flex;flex-direction:column;gap:6px;";

    const textarea = document.createElement("textarea");
    textarea.placeholder = activeReplyTo ? "Write a reply..." : opts.placeholder;
    textarea.rows = 3;
    textarea.style.cssText = `
      width:100%;border:1px solid #d1d5db;border-radius:10px;padding:10px 14px;
      font-size:14px;font-family:inherit;color:#374151;resize:vertical;outline:none;
      transition:border-color 0.15s;line-height:1.5;
    `;
    textarea.addEventListener("focus", () => { textarea.style.borderColor = "#6366f1"; });
    textarea.addEventListener("blur", () => { textarea.style.borderColor = "#d1d5db"; });

    // Cancel reply button
    if (activeReplyTo && activeReplyTo !== parentId) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel reply";
      cancelBtn.style.cssText = "align-self:flex-start;padding:4px 12px;border:1px solid #e5e7eb;border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#6b7280;";
      cancelBtn.addEventListener("click", () => { activeReplyTo = null; render(); });
      inputWrap.appendChild(cancelBtn);
    }

    const submitRow = document.createElement("div");
    submitRow.style.cssText = "display:flex;justify-content:flex-end;";

    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.textContent = activeReplyTo ? "Reply" : "Comment";
    submitBtn.style.cssText = `
      padding:6px 18px;border-radius:8px;font-size:13px;font-weight:600;
      background:#4338ca;color:#fff;border:none;cursor:pointer;transition:opacity 0.15s;
      font-family:inherit;
    `;
    submitBtn.addEventListener("mouseenter", () => { submitBtn.style.opacity = "0.85"; });
    submitBtn.addEventListener("mouseleave", () => { submitBtn.style.opacity = ""; });
    submitBtn.addEventListener("click", async () => {
      const val = textarea.value.trim();
      if (!val) return;
      if (opts.onSubmit) {
        await opts.onSubmit(val, activeReplyTo ?? undefined);
        textarea.value = "";
        activeReplyTo = null;
        // Note: in real usage, the callback would add the comment and call setComments
      }
    });

    submitRow.appendChild(submitBtn);
    inputWrap.append(textarea, submitRow);
    wrap.appendChild(inputWrap);

    return wrap;
  }

  function createCommentNode(comment: Comment, depth: number): HTMLElement {
    const node = document.createElement("div");
    node.className = "comment-node";
    node.dataset.id = comment.id;
    node.style.cssText = depth > 0 ? "margin-left:32px;margin-top:12px;" : "padding:12px 0;border-bottom:1px solid #f9fafb;";

    if (comment.deleted) {
      node.innerHTML = `<div style="color:#9ca3af;font-style:italic;padding:8px 0;">[Comment deleted]</div>`;
      return node;
    }

    // Header row
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";

    // Avatar
    if (opts.showAvatars) {
      const avatar = document.createElement("div");
      avatar.style.cssText = `width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;flex-shrink:0;background:hsl(${hashCode(comment.author.name) % 360}, 65%, 55%);overflow:hidden;`;
      if (comment.author.avatar) {
        avatar.innerHTML = `<img src="${comment.author.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
      } else {
        avatar.textContent = comment.author.name.charAt(0).toUpperCase();
      }
      header.appendChild(avatar);
    }

    // Name
    const nameEl = document.createElement("span");
    nameEl.style.cssText = "font-weight:600;font-size:13px;color:#111827;";
    nameEl.textContent = comment.author.name;
    if (comment.author.isCurrentUser) {
      const badge = document.createElement("span");
      badge.textContent = "You";
      badge.style.cssText = "font-size:10px;font-weight:500;background:#eef2ff;color:#4338ca;padding:1px 6px;border-radius:99px;margin-left:4px;";
      nameEl.appendChild(badge);
    }
    header.appendChild(nameEl);

    // Timestamp
    if (opts.showTimestamps) {
      const ts = document.createElement("span");
      ts.style.cssText = "font-size:12px;color:#9ca3af;";
      ts.textContent = timeAgo(comment.createdAt);
      if (comment.updatedAt) ts.textContent += " (edited)";
      header.appendChild(ts);
    }

    // Pinned badge
    if (comment.pinned) {
      const pin = document.createElement("span");
      pin.textContent = "\uD83D\uDCCC Pinned";
      pin.style.cssText = "font-size:11px;color:#f59e0b;margin-left:auto;";
      header.appendChild(pin);
    }

    node.appendChild(header);

    // Content
    const body = document.createElement("div");
    body.className = "comment-body";
    body.style.cssText = "line-height:1.6;color:#374151;margin-bottom:8px;word-break:break-word;";
    body.innerHTML = escapeHtml(comment.content).replace(/\n/g, "<br>");
    node.appendChild(body);

    // Actions bar
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;align-items:center;gap:12px;";

    // Vote up
    if (opts.showVotes && opts.allowVote) {
      const voteBtn = document.createElement("button");
      voteBtn.type = "button";
      voteBtn.style.cssText = `
        display:flex;align-items:center;gap:3px;padding:2px 8px;border-radius:6px;
        border:1px solid ${comment.votedUp ? "#22c55e" : "#e5e7eb"};background:${comment.votedUp ? "#f0fdf4" : "transparent"};
        color:${comment.votedUp ? "#16a34a" : "#6b7280"};cursor:pointer;font-size:12px;font-family:inherit;transition:all 0.15s;
      `;
      voteBtn.innerHTML = `\u25B2 ${comment.votes ?? 0}`;
      voteBtn.addEventListener("click", () => { opts.onVote?.(comment.id, "up"); });
      actions.appendChild(voteBtn);
    }

    // Reply
    if (opts.allowReply && depth < opts.maxDepth) {
      const replyBtn = document.createElement("button");
      replyBtn.type = "button";
      replyBtn.textContent = "Reply";
      replyBtn.style.cssText = "padding:2px 10px;border-radius:6px;border:1px solid #e5e7eb;background:transparent;color:#6b7280;cursor:pointer;font-size:12px;font-family:inherit;transition:all 0.15s;";
      replyBtn.addEventListener("mouseenter", () => { replyBtn.style.background = "#f9fafb"; });
      replyBtn.addEventListener("mouseleave", () => { replyBtn.style.background = "transparent"; });
      replyBtn.addEventListener("click", () => { activeReplyTo = comment.id; render(); });
      actions.appendChild(replyBtn);
    }

    // Edit (own comment)
    if (opts.allowEdit && comment.author.isCurrentUser) {
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.style.cssText = "padding:2px 10px;border-radius:6px;border:1px solid #e5e7eb;background:transparent;color:#6b7280;cursor:pointer;font-size:12px;font-family:inherit;";
      editBtn.addEventListener("click", () => startEdit(comment));
      actions.appendChild(editBtn);
    }

    // Delete (own comment)
    if (opts.allowDelete && comment.author.isCurrentUser) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "Delete";
      delBtn.style.cssText = "padding:2px 10px;border-radius:6px;border:1px solid #e5e7eb;background:transparent;color:#dc2626;cursor:pointer;font-size:12px;font-family:inherit;opacity:0.7;";
      delBtn.addEventListener("mouseenter", () => { delBtn.style.opacity = "1"; });
      delBtn.addEventListener("mouseleave", () => { delBtn.style.opacity = "0.7"; });
      delBtn.addEventListener("click", async () => { await opts.onDelete?.(comment.id); });
      actions.appendChild(delBtn);
    }

    node.appendChild(actions);

    // Replies
    if (comment.replies && comment.replies.length > 0) {
      const repliesContainer = document.createElement("div");
      repliesContainer.className = "comment-replies";
      for (const r of comment.replies) {
        repliesContainer.appendChild(createCommentNode(r, depth + 1));
      }
      node.appendChild(repliesContainer);
    }

    return node;
  }

  function startEdit(comment: Comment): void {
    const bodyEl = root.querySelector(`[data-id="${comment.id}"] .comment-body`);
    if (!bodyEl) return;

    const originalContent = comment.content;
    bodyEl.innerHTML = "";

    const ta = document.createElement("textarea");
    ta.value = originalContent;
    ta.rows = 3;
    ta.style.cssText = "width:100%;border:1px solid #6366f1;border-radius:8px;padding:8px;font-size:14px;font-family:inherit;resize:vertical;outline:none;line-height:1.5;";
    bodyEl.appendChild(ta);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:6px;margin-top:6px;";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Save";
    saveBtn.style.cssText = "padding:4px 14px;border-radius:6px;background:#4338ca;color:#fff;border:none;cursor:pointer;font-size:12px;font-weight:500;font-family:inherit;";
    saveBtn.addEventListener("click", async () => {
      const newVal = ta.value.trim();
      if (newVal && newVal !== originalContent) {
        await opts.onEdit?.(comment.id, newVal);
      } else {
        bodyEl.innerHTML = escapeHtml(originalContent).replace(/\n/g, "<br>");
      }
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText = "padding:4px 14px;border-radius:6px;background:#f3f4f6;color:#6b7280;border:1px solid #e5e7eb;cursor:pointer;font-size:12px;font-family:inherit;";
    cancelBtn.addEventListener("click", () => {
      bodyEl.innerHTML = escapeHtml(originalContent).replace(/\n/g, "<br>");
    });

    btnRow.append(saveBtn, cancelBtn);
    bodyEl.appendChild(btnRow);
    ta.focus();
  }

  function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
    return Math.abs(hash);
  }

  // Initial render
  render();

  const instance: CommentSectionInstance = {
    element: root,

    getComments() { return [...comments]; },

    setComments(newComments: Comment[]) {
      comments = newComments;
      render();
    },

    addComment(newComment: Comment) {
      comments.push(newComment);
      render();
    },

    removeComment(id: string) {
      comments = comments.filter((c) => c.id !== id);
      render();
    },

    updateComment(id: string, updates: Partial<Comment>) {
      const findAndUpdate = (arr: Comment[]): boolean => {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i]!.id === id) { arr[i] = { ...arr[i]!, ...updates }; return true; }
          if (arr[i]!.replies && findAndUpdate(arr[i]!.replies!)) return true;
        }
        return false;
      };
      findAndUpdate(comments);
      render();
    },

    setSortOrder(order: "newest" | "oldest" | "top" | "hot") {
      opts.sortOrder = order;
      opts.onSortChange?.(order);
      render();
    },

    focusInput() {
      const ta = root.querySelector<HTMLTextAreaElement>("textarea");
      ta?.focus();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
