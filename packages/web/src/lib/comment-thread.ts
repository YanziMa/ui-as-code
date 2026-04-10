/**
 * Comment Thread: Nested comment/reply system with threading, voting,
 * timestamps, avatars, markdown support, edit/delete, and real-time feel.
 */

// --- Types ---

export interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
  /** Is the author (owner/mod)? */
  isAuthor?: boolean;
}

export interface Comment {
  id: string;
  author: CommentAuthor;
  content: string;
  createdAt: string; // ISO date
  updatedAt?: string;
  replies?: Comment[];
  /** Upvote count */
  votes?: number;
  /** Current user's vote: 1, -1, or 0 */
  userVote?: number;
  /** Pinned? */
  pinned?: boolean;
  /** Deleted (soft) */
  deleted?: boolean;
  /** Custom data */
  data?: Record<string, unknown>;
}

export interface CommentThreadOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Comments data */
  comments?: Comment[];
  /** Current user ID (for vote/edit UI) */
  currentUserId?: string;
  /** Max reply nesting depth (default: 3) */
  maxDepth?: number;
  /** Show timestamps in relative format? */
  relativeTime?: boolean;
  /** Show vote buttons? */
  showVotes?: boolean;
  /** Show avatars? */
  showAvatars?: boolean;
  /** Allow replying? */
  allowReply?: boolean;
  /** Allow editing own comments? */
  allowEdit?: boolean;
  /** Allow deleting? */
  allowDelete?: boolean;
  /** Callback on submit new comment/reply */
  onSubmit?: (content: string, parentId?: string) => void;
  /** Callback on vote */
  onVote?: (commentId: string, direction: 1 | -1) => void;
  /** Callback on edit */
  onEdit?: (commentId: string, content: string) => void;
  /** Callback on delete */
  onDelete?: (commentId: string) => void;
  /** Format timestamp function */
  formatTimestamp?: (date: string) => string;
  /** Custom CSS class */
  className?: string;
}

export interface CommentThreadInstance {
  element: HTMLElement;
  getComments: () => Comment[];
  addComment: (comment: Comment, parentId?: string) => void;
  removeComment: (id: string) => void;
  updateComment: (id: string, updates: Partial<Comment>) => void;
  setComments: (comments: Comment[]) => void;
  focusReplyInput: (parentId?: string) => void;
  destroy: () => void;
}

// --- Helpers ---

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// --- Main Class ---

export class CommentThreadManager {
  create(options: CommentThreadOptions): CommentThreadInstance {
    const opts = {
      maxDepth: options.maxDepth ?? 3,
      relativeTime: options.relativeTime ?? true,
      showVotes: options.showVotes ?? true,
      showAvatars: options.showAvatars ?? true,
      allowReply: options.allowReply ?? true,
      allowEdit: options.allowEdit ?? true,
      allowDelete: options.allowDelete ?? true,
      formatTimestamp: options.formatTimestamp ?? timeAgo,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("CommentThread: container not found");

    container.className = `comment-thread ${opts.className ?? ""}`;
    let comments: Comment[] = opts.comments ?? [];
    let destroyed = false;

    function render(): void {
      container.innerHTML = "";

      // Sort: pinned first, then by date
      const sorted = [...comments].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      for (const comment of sorted) {
        const el = renderComment(comment, 0);
        container.appendChild(el);
      }

      // Top-level input
      if (opts.allowReply) {
        const inputEl = createInputBox(undefined);
        container.appendChild(inputEl);
      }
    }

    function renderComment(comment: Comment, depth: number): HTMLElement {
      const wrapper = document.createElement("div");
      wrapper.className = `comment comment-depth-${depth}`;
      wrapper.dataset.id = comment.id;
      wrapper.style.cssText = `
        margin-bottom:${depth === 0 ? "16px" : "12px"};
        ${depth > 0 ? `margin-left:${Math.min(depth * 24, 60)}px;border-left:2px solid #e5e7eb;padding-left:12px;` : ""}
      `;

      if (comment.deleted) {
        wrapper.innerHTML = `<div style="color:#9ca3af;font-style:italic;font-size:13px;padding:8px 0;">[deleted]</div>`;
        return wrapper;
      }

      // Header row
      const header = document.createElement("div");
      header.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";

      // Avatar
      if (opts.showAvatars && comment.author.avatar) {
        const avatar = document.createElement("img");
        avatar.src = comment.author.avatar;
        avatar.alt = "";
        avatar.style.cssText = "width:28px;height:28px;border-radius:50%;object-fit:cover;";
        header.appendChild(avatar);
      } else if (opts.showAvatars) {
        const avatarInitial = document.createElement("span");
        avatarInitial.style.cssText = `
          width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:11px;font-weight:600;color:#fff;
          background:hsl(${hashCode(comment.author.id) % 360}, 65%, 55%);
        `;
        avatarInitial.textContent = comment.author.name.charAt(0).toUpperCase();
        header.appendChild(avatarInitial);
      }

      // Author name + badge
      const nameEl = document.createElement("span");
      nameEl.style.cssText = "font-weight:600;font-size:13px;color:#111827;";
      nameEl.textContent = comment.author.name;
      header.appendChild(nameEl);

      if (comment.author.isAuthor) {
        const badge = document.createElement("span");
        badge.style.cssText = "font-size:10px;font-weight:500;background:#eef2ff;color:#4338ca;padding:1px 6px;border-radius:3px;";
        badge.textContent = "Author";
        header.appendChild(badge);
      }

      // Timestamp
      const ts = document.createElement("span");
      ts.style.cssText = "font-size:11px;color:#9ca3af;margin-left:auto;";
      ts.textContent = opts.formatTimestamp(comment.createdAt);
      if (comment.updatedAt && comment.updatedAt !== comment.createdAt) {
        const edited = document.createElement("span");
        edited.style.cssText = "font-size:10px;color:#d1d5db;margin-left:4px;";
        edited.textContent = "(edited)";
        ts.appendChild(edited);
      }
      header.appendChild(ts);
      wrapper.appendChild(header);

      // Content body
      const body = document.createElement("div");
      body.className = "comment-body";
      body.style.cssText = "font-size:14px;color:#374151;line-height:1.6;word-break:break-word;";
      body.innerHTML = escapeHtml(comment.content).replace(/\n/g, "<br>");
      wrapper.appendChild(body);

      // Action bar
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;align-items:center;gap:12px;margin-top:8px;";

      // Vote buttons
      if (opts.showVotes) {
        const voteWrapper = document.createElement("div");
        voteWrapper.style.cssText = "display:flex;align-items:center;gap:4px;";

        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.innerHTML = "&#9650;";
        upBtn.style.cssText = `
          background:none;border:none;font-size:12px;cursor:pointer;
          color:${comment.userVote === 1 ? "#4338ca" : "#9ca3af"};
          padding:2px;transition:color 0.15s;
        `;
        upBtn.addEventListener("click", () => opts.onVote?.(comment.id, 1));
        upBtn.addEventListener("mouseenter", () => { if (comment.userVote !== 1) upBtn.style.color = "#6b7280"; });
        upBtn.addEventListener("mouseleave", () => { if (comment.userVote !== 1) upBtn.style.color = "#9ca3af"; });
        voteWrapper.appendChild(upBtn);

        const countEl = document.createElement("span");
        countEl.style.cssText = "font-size:12px;font-weight:500;color:#6b7280;min-width:16px;text-align:center;";
        countEl.textContent = String(comment.votes ?? 0);
        voteWrapper.appendChild(countEl);

        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.innerHTML = "&#9660;";
        downBtn.style.cssText = `
          background:none;border:none;font-size:12px;cursor:pointer;
          color:${comment.userVote === -1 ? "#4338ca" : "#9ca3af"};
          padding:2px;transition:color 0.15s;
        `;
        downBtn.addEventListener("click", () => opts.onVote?.(comment.id, -1));
        downBtn.addEventListener("mouseenter", () => { if (comment.userVote !== -1) downBtn.style.color = "#6b7280"; });
        downBtn.addEventListener("mouseleave", () => { if (comment.userVote !== -1) downBtn.style.color = "#9ca3af"; });
        voteWrapper.appendChild(downBtn);

        actions.appendChild(voteWrapper);
      }

      // Reply button
      if (opts.allowReply && depth < opts.maxDepth) {
        const replyBtn = document.createElement("button");
        replyBtn.type = "button";
        replyBtn.textContent = "Reply";
        replyBtn.style.cssText = "background:none;border:none;font-size:12px;color:#6366f1;cursor:pointer;padding:2px 6px;";
        replyBtn.addEventListener("click", () => toggleReplyInput(wrapper, comment.id));
        actions.appendChild(replyBtn);
      }

      // Edit button (own comment)
      if (opts.allowEdit && comment.author.id === opts.currentUserId) {
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.style.cssText = "background:none;border:none;font-size:12px;color:#6b7280;cursor:pointer;padding:2px 6px;";
        editBtn.addEventListener("click", () => startEdit(wrapper, comment));
        actions.appendChild(editBtn);
      }

      // Delete button
      if (opts.allowDelete && (comment.author.id === opts.currentUserId || opts.currentUserId === "mod")) {
        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "Delete";
        delBtn.style.cssText = "background:none;border:none;font-size:12px;color:#ef4444;cursor:pointer;padding:2px 6px;";
        delBtn.addEventListener("click", () => opts.onDelete?.(comment.id));
        actions.appendChild(delBtn);
      }

      wrapper.appendChild(actions);

      // Replies
      if (comment.replies && comment.replies.length > 0) {
        const repliesContainer = document.createElement("div");
        repliesContainer.className = "comment-replies";
        for (const reply of comment.replies) {
          repliesContainer.appendChild(renderComment(reply, depth + 1));
        }
        wrapper.appendChild(repliesContainer);
      }

      return wrapper;
    }

    function createInputBox(parentId?: string): HTMLElement {
      const box = document.createElement("div");
      box.className = "comment-input-box";
      box.dataset.parentId = parentId ?? "";
      box.style.cssText = "margin-top:12px;";

      const textarea = document.createElement("textarea");
      textarea.placeholder = parentId ? "Write a reply..." : "Add a comment...";
      textarea.rows = 2;
      textarea.style.cssText = `
        width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;
        font-size:14px;font-family:inherit;resize:vertical;outline:none;
        transition:border-color 0.15s;box-sizing:border-box;line-height:1.5;
      `;
      textarea.addEventListener("focus", () => { textarea.style.borderColor = "#6366f1"; });
      textarea.addEventListener("blur", () => { textarea.style.borderColor = "#d1d5db"; });
      box.appendChild(textarea);

      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;justify-content:flex-end;margin-top:6px;";

      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.textContent = parentId ? "Reply" : "Comment";
      submitBtn.disabled = true;
      submitBtn.style.cssText = `
        padding:6px 16px;border-radius:6px;font-size:13px;font-weight:500;
        background:${submitBtn.disabled ? "#e5e7eb" : "#4338ca"};color:${submitBtn.disabled ? "#9ca3af" : "#fff"};
        border:none;cursor:${submitBtn.disabled ? "not-allowed" : "pointer"};transition:all 0.15s;
      `;
      submitBtn.addEventListener("click", () => {
        const val = textarea.value.trim();
        if (!val) return;
        opts.onSubmit?.(val, parentId);
        textarea.value = "";
        submitBtn.disabled = true;
      });
      btnRow.appendChild(submitBtn);
      box.appendChild(btnRow);

      textarea.addEventListener("input", () => {
        submitBtn.disabled = !textarea.value.trim();
      });

      return box;
    }

    function toggleReplyInput(parentEl: HTMLElement, parentId: string): void {
      let input = parentEl.querySelector(".comment-input-box") as HTMLElement | null;
      if (input) {
        input.remove();
        return;
      }
      input = createInputBox(parentId);
      parentEl.appendChild(input);
      const ta = input.querySelector("textarea") as HTMLTextAreaElement;
      ta?.focus();
    }

    function startEdit(parentEl: HTMLElement, comment: Comment): void {
      const body = parentEl.querySelector(".comment-body") as HTMLElement;
      if (!body) return;

      const originalContent = comment.content;
      const textarea = document.createElement("textarea");
      textarea.value = originalContent;
      textarea.rows = 3;
      textarea.style.cssText = `
        width:100%;padding:8px;border:1px solid #6366f1;border-radius:6px;
        font-size:14px;font-family:inherit;resize:vertical;outline:none;
        box-sizing:border-box;line-height:1.5;
      `;
      body.innerHTML = "";
      body.appendChild(textarea);

      const saveBar = document.createElement("div");
      saveBar.style.cssText = "display:flex;gap:6px;margin-top:6px;";

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.textContent = "Save";
      saveBtn.style.cssText = "padding:4px 12px;border-radius:4px;font-size:12px;background:#4338ca;color:#fff;border:none;cursor:pointer;";
      saveBtn.addEventListener("click", () => {
        const newVal = textarea.value.trim();
        if (newVal && newVal !== originalContent) {
          opts.onEdit?.(comment.id, newVal);
        } else {
          body.innerHTML = escapeHtml(originalContent).replace(/\n/g, "<br>");
        }
      });

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText = "padding:4px 12px;border-radius:4px;font-size:12px;background:#f3f4f6;color:#6b7280;border:none;cursor:pointer;";
      cancelBtn.addEventListener("click", () => {
        body.innerHTML = escapeHtml(originalContent).replace(/\n/g, "<br>");
      });

      saveBar.append(saveBtn, cancelBtn);
      body.appendChild(saveBar);
      textarea.focus();
    }

    function hashCode(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }

    // Initial render
    render();

    const instance: CommentThreadInstance = {
      element: container,

      getComments() { return [...comments]; },

      setComments(newComments: Comment[]) {
        comments = newComments;
        render();
      },

      addComment(newComment: Comment, parentId?: string) {
        if (parentId) {
          const parent = findComment(comments, parentId);
          if (parent) {
            if (!parent.replies) parent.replies = [];
            parent.replies.push(newComment);
          }
        } else {
          comments.push(newComment);
        }
        render();
      },

      removeComment(id: string) {
        comments = removeFromTree(comments, id);
        render();
      },

      updateComment(id: string, updates: Partial<Comment>) {
        const c = findComment(comments, id);
        if (c) Object.assign(c, updates);
        render();
      },

      focusReplyInput(parentId?: string) {
        const parentSelector = parentId ? `[data-id="${parentId}"]` : "";
        const threadEl = parentSelector
          ? container.querySelector(parentSelector)
          : container;
        if (threadEl) toggleReplyInput(threadEl as HTMLElement, parentId ?? "");
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a comment thread */
export function createCommentThread(options: CommentThreadOptions): CommentThreadInstance {
  return new CommentThreadManager().create(options);
}

// --- Tree helpers ---

function findComment(tree: Comment[], id: string): Comment | undefined {
  for (const c of tree) {
    if (c.id === id) return c;
    if (c.replies) {
      const found = findComment(c.replies, id);
      if (found) return found;
    }
  }
  return undefined;
}

function removeFromTree(tree: Comment[], id: string): Comment[] {
  return tree
    .filter((c) => c.id !== id)
    .map((c) => ({ ...c, replies: c.replies ? removeFromTree(c.replies, id) : undefined }));
}
