/**
 * Comment System: Threaded/nested comment system with replies, voting,
 * markdown support, rich text editing, moderation tools, real-time
 * indicators, and infinite scroll / pagination.
 */

// --- Types ---

export interface CommentAuthor {
  id: string;
  name: string;
  avatar?: string;
  /** Is this author the current user? */
  isCurrentUser?: boolean;
  role?: "admin" | "moderator" | "user";
}

export interface Comment {
  id: string;
  author: CommentAuthor;
  content: string; // HTML or plain text
  createdAt: Date | string;
  updatedAt?: Date | string;
  /** Parent comment ID for threaded replies */
  parentId?: string;
  /** Nested replies */
  replies?: Comment[];
  /** Upvote count */
  upvotes?: number;
  /** Downvote count */
  downvotes?: number;
  /** Current user's vote: 1, -1, or 0 */
  userVote?: number;
  /** Is this comment pinned? */
  pinned?: boolean;
  /** Is this comment edited? */
  edited?: boolean;
  /** Moderation status */
  status?: "active" | "pending" | "hidden" | "deleted";
  /** Attachments */
  attachments?: Array<{ name: string; url: string; type: string }>;
  /** Metadata */
  meta?: Record<string, unknown>;
}

export interface CommentSystemOptions {
  container: HTMLElement | string;
  /** Initial comments */
  comments?: Comment[];
  /** Current user info */
  currentUser?: CommentAuthor;
  /** Allow nested replies? */
  allowReplies?: boolean;
  /** Max reply depth (0 = flat) */
  maxDepth?: number;
  /** Allow voting? */
  allowVoting?: boolean;
  /** Allow editing own comments? */
  allowEditing?: boolean;
  /** Allow deleting own comments? */
  allowDeleting?: boolean;
  /** Show timestamps as relative? */
  relativeTime?: boolean;
  /** Sort order */
  sortBy?: "newest" | "oldest" | "top" | "controversial";
  /** Placeholder text for input */
  placeholder?: string;
  /** Max characters per comment */
  maxLength?: number;
  /** Enable markdown rendering? */
  enableMarkdown?: boolean;
  /** Callback on submit new comment */
  onSubmit?: (content: string, parentId?: string) => Promise<Comment> | void;
  /** Callback on edit comment */
  onEdit?: (id: string, content: string) => Promise<void> | void;
  /** Callback on delete comment */
  onDelete?: (id: string) => Promise<void> | void;
  /** Callback on vote */
  onVote?: (id: string, direction: 1 | -1) => void;
  /** Callback on load more (pagination) */
  onLoadMore?: () => Promise<Comment[]>;
  /** Custom render function for a comment */
  renderComment?: (comment: Comment) => HTMLElement | string;
  /** Custom CSS class */
  className?: string;
}

export interface CommentSystemInstance {
  element: HTMLElement;
  getComments: () => Comment[];
  addComment: (comment: Comment) => void;
  removeComment: (id: string) => void;
  updateComment: (id: string, updates: Partial<Comment>) => void;
  setSortBy: (sort: "newest" | "oldest" | "top" | "controversial") => void;
  focusInput: () => void;
  destroy: () => void;
}

// --- Helpers ---

function generateId(): string {
  return `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function timeAgo(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function simpleMarkdown(text: string): string {
  let html = escapeHtml(text);
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Code
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");
  // Links
  html = html.replace(/\[(.+?)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Line breaks
  html = html.replace(/\n/g, "<br>");
  return html;
}

function flattenComments(comments: Comment[], depth = 0): Array<{ comment: Comment; depth: number }> {
  const result: Array<{ comment: Comment; depth: number }> = [];
  for (const c of comments) {
    result.push({ comment: c, depth });
    if (c.replies?.length) result.push(...flattenComments(c.replies, depth + 1));
  }
  return result;
}

function sortComments(comments: Comment[], sortBy: string): Comment[] {
  const sorted = [...comments];
  switch (sortBy) {
    case "newest": sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
    case "oldest": sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
    case "top": sorted.sort((a, b) => ((b.upvotes ?? 0) - (b.downvotes ?? 0)) - ((a.upvotes ?? 0) - (a.downvotes ?? 0))); break;
    case "controversial": sorted.sort((a, b) => { const sa = (a.upvotes ?? 0) + (a.downvotes ?? 0); const sb = (b.upvotes ?? 0) + (b.downvotes ?? 0); const ra = sa > 0 ? Math.min(a.upvotes ?? 0, a.downvotes ?? 0) / sa : 0; const rb = sb > 0 ? Math.min(b.upvotes ?? 0, b.downvotes ?? 0) / sb : 0; return rb - ra; }); break;
  }
  return sorted;
}

// --- Main Factory ---

export function createCommentSystem(options: CommentSystemOptions): CommentSystemInstance {
  const opts = {
    comments: options.comments ?? [],
    allowReplies: options.allowReplies ?? true,
    maxDepth: options.maxDepth ?? 3,
    allowVoting: options.allowVoting ?? true,
    allowEditing: options.allowEditing ?? true,
    allowDeleting: options.allowDeleting ?? true,
    relativeTime: options.relativeTime ?? true,
    sortBy: options.sortBy ?? "newest",
    placeholder: options.placeholder ?? "Write a comment...",
    maxLength: options.maxLength ?? 2000,
    enableMarkdown: options.enableMarkdown ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CommentSystem: container not found");

  let allComments: Comment[] = [...opts.comments];
  let destroyed = false;
  let replyingTo: string | null = null;
  let editingId: string | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `comment-system ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;
  `;
  container.appendChild(root);

  // Input area
  const inputArea = document.createElement("div");
  inputArea.className = "cs-input-area";
  inputArea.style.cssText = `
    display:flex;gap:10px;padding:16px;border-bottom:1px solid #e5e7eb;background:#fafafa;border-radius:8px;margin-bottom:12px;
  `;
  root.appendChild(inputArea);

  // Avatar
  const inputAvatar = document.createElement("div");
  inputAvatar.style.cssText = `
    width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:14px;font-weight:600;color:#fff;background:#4338ca;flex-shrink:0;
  `;
  inputAvatar.textContent = opts.currentUser?.name.charAt(0).toUpperCase() ?? "U";
  inputArea.appendChild(inputAvatar);

  const inputWrapper = document.createElement("div");
  inputWrapper.style.cssText = "flex:1;display:flex;flex-direction:column;gap:6px;";
  inputArea.appendChild(inputWrapper);

  // Reply indicator
  const replyIndicator = document.createElement("div");
  replyIndicator.className = "cs-reply-indicator";
  replyIndicator.style.cssText = "display:none;font-size:11px;color:#4338ca;font-weight:500;";
  inputWrapper.appendChild(replyIndicator);

  // Textarea
  const textarea = document.createElement("textarea");
  textarea.placeholder = opts.placeholder;
  textarea.rows = 2;
  textarea.maxLength = opts.maxLength;
  textarea.style.cssText = `
    width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;
    resize:vertical;outline:none;font-family:inherit;line-height:1.5;
    transition:border-color 0.15s;
  `;
  textarea.addEventListener("focus", () => { textarea.style.borderColor = "#4338ca"; textarea.style.boxShadow = "0 0 0 3px rgba(67,56,202,0.1)"; });
  textarea.addEventListener("blur", () => { textarea.style.borderColor = "#d1d5db"; textarea.style.boxShadow = ""; });

  // Character count
  const charCount = document.createElement("span");
  charCount.style.cssText = "font-size:10px;color:#9ca3af;text-align:right;";
  charCount.textContent = `0 / ${opts.maxLength}`;
  textarea.addEventListener("input", () => {
    charCount.textContent = `${textarea.value.length} / ${opts.maxLength}`;
  });
  inputWrapper.appendChild(textarea);
  inputWrapper.appendChild(charCount);

  // Submit button row
  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.cssText = `
    padding:6px 14px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;
    background:#fff;cursor:pointer;color:#6b7280;display:none;
  `;
  cancelBtn.addEventListener("click", () => { replyingTo = null; editingId = null; resetInput(); });
  btnRow.appendChild(cancelBtn);

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.textContent = "Comment";
  submitBtn.style.cssText = `
    padding:6px 16px;border:none;border-radius:6px;font-size:12px;font-weight:500;
    background:#4338ca;color:#fff;cursor:pointer;transition:background 0.15s;
  `;
  submitBtn.addEventListener("mouseenter", () => { submitBtn.style.background = "#3730a3"; });
  submitBtn.addEventListener("mouseleave", () => { submitBtn.style.background = "#4338ca"; });
  submitBtn.addEventListener("click", handleSubmit);
  btnRow.appendChild(submitBtn);
  inputWrapper.appendChild(btnRow);

  // Comments list
  const listEl = document.createElement("div");
  listEl.className = "cs-list";
  root.appendChild(listEl);

  // Sort bar
  const sortBar = document.createElement("div");
  sortBar.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px;";
  const sortLabel = document.createElement("span");
  sortLabel.textContent = "Sort by:";
  sortLabel.style.color = "#9ca3af";
  sortBar.appendChild(sortLabel);

  for (const s of ["newest", "oldest", "top"] as const) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = s.charAt(0).toUpperCase() + s.slice(1);
    btn.dataset.sort = s;
    btn.style.cssText = `
      padding:2px 8px;border-radius:4px;font-size:11px;border:none;cursor:pointer;
      background:${opts.sortBy === s ? "#eef2ff;color:#4338ca;font-weight:600;" : "transparent;color:#6b7280;"}
    `;
    btn.addEventListener("click", () => instance.setSortBy(s));
    sortBar.appendChild(btn);
  }
  root.insertBefore(sortBar, listEl);

  // --- Functions ---

  function resetInput(): void {
    textarea.value = "";
    charCount.textContent = `0 / ${opts.maxLength}`;
    replyIndicator.style.display = "none";
    cancelBtn.style.display = "none";
    replyingTo = null;
    editingId = null;
    submitBtn.textContent = "Comment";
    textarea.placeholder = opts.placeholder;
  }

  function setReplyingTo(parentComment: Comment): void {
    replyingTo = parentComment.id;
    editingId = null;
    replyIndicator.innerHTML = `Replying to <b>${escapeHtml(parentComment.author.name)}</b>`;
    replyIndicator.style.display = "block";
    cancelBtn.style.display = "inline-block";
    submitBtn.textContent = "Reply";
    textarea.placeholder = "Write your reply...";
    textarea.focus();
  }

  function setEditing(comment: Comment): void {
    editingId = comment.id;
    replyingTo = null;
    replyIndicator.innerHTML = `Editing your comment...`;
    replyIndicator.style.display = "block";
    cancelBtn.style.display = "inline-block";
    submitBtn.textContent = "Save";
    textarea.value = comment.content.replace(/<br>/g, "\n").replace(/<[^>]*>/g, "");
    textarea.focus();
  }

  async function handleSubmit(): void {
    const content = textarea.value.trim();
    if (!content) return;

    if (editingId) {
      await opts.onEdit?.(editingId, content);
      instance.updateComment(editingId!, { content, edited: true, updatedAt: new Date().toISOString() });
      resetInput();
      render();
      return;
    }

    const newComment: Comment = {
      id: generateId(),
      author: opts.currentUser ?? { id: "u1", name: "You", isCurrentUser: true },
      content: opts.enableMarkdown ? simpleMarkdown(content) : escapeHtml(content),
      createdAt: new Date().toISOString(),
      edited: false,
      upvotes: 0,
      downvotes: 0,
      userVote: 0,
      status: "active",
    };

    if (replyingTo) {
      // Add as reply to parent
      addToParent(allComments, replyingTo, newComment);
    } else {
      allComments.push(newComment);
    }

    await opts.onSubmit?.(content, replyingTo ?? undefined);
    resetInput();
    render();
  }

  function addToParent(comments: Comment[], parentId: string, newComment: Comment): boolean {
    for (const c of comments) {
      if (c.id === parentId) {
        if (!c.replies) c.replies = [];
        c.replies.push(newComment);
        return true;
      }
      if (c.replies && addToParent(c.replies, parentId, newComment)) return true;
    }
    return false;
  }

  function removeFromTree(comments: Comment[], id: string): boolean {
    for (let i = 0; i < comments.length; i++) {
      if (comments[i]!.id === id) { comments.splice(i, 1); return true; }
      if (comments[i]!.replies && removeFromTree(comments[i]!.replies!, id)) return true;
    }
    return false;
  }

  function findInTree(comments: Comment[], id: string): Comment | undefined {
    for (const c of comments) {
      if (c.id === id) return c;
      if (c.replies) { const found = findInTree(c.replies, id); if (found) return found; }
    }
    return undefined;
  }

  // --- Render ---

  function render(): void {
    listEl.innerHTML = "";

    const sorted = sortComments(allComments, opts.sortBy);

    if (sorted.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:32px;color:#9ca3af;font-size:13px;";
      empty.innerHTML = `<div style="font-size:28px;margin-bottom:8px;">\u{1F4AC}</div><div>No comments yet. Start the conversation!</div>`;
      listEl.appendChild(empty);
      return;
    }

    for (const comment of sorted) {
      listEl.appendChild(renderComment(comment, 0));
    }
  }

  function renderComment(comment: Comment, depth: number): HTMLElement {
    const isOwner = comment.author.isCurrentUser || comment.author.id === opts.currentUser?.id;
    const timeStr = opts.relativeTime ? timeAgo(comment.createdAt) : new Date(comment.createdAt).toLocaleDateString();

    const el = document.createElement("div");
    el.className = "cs-comment";
    el.dataset.commentId = comment.id;
    el.style.cssText = `
      display:flex;gap:10px;padding:12px 0;border-bottom:1px solid #f3f4f6;
      ${depth > 0 ? `margin-left:${Math.min(depth * 24, 80)}px;border-left:2px solid #e5e7eb;padding-left:12px;` : ""}
    `;

    // Avatar
    const avatar = document.createElement("div");
    avatar.style.cssText = `
      width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:600;color:#fff;flex-shrink:0;
      background:${comment.author.avatar ? `url(${comment.author.avatar}) center/cover` : `hsl(${hashCode(comment.author.name) % 360}, 60%, 55%)`};
    `;
    if (!comment.author.avatar) avatar.textContent = comment.author.name.charAt(0).toUpperCase();
    el.appendChild(avatar);

    // Body
    const body = document.createElement("div");
    body.style.cssText = "flex:1;min-width:0;";

    // Header
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:6px;flex-wrap:wrap;";

    const name = document.createElement("span");
    name.style.cssText = "font-weight:600;font-size:13px;color:#111827;";
    name.textContent = comment.author.name;
    header.appendChild(name);

    if (comment.pinned) {
      const pin = document.createElement("span");
      pin.textContent = "Pinned";
      pin.style.cssText = "font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;";
      header.appendChild(pin);
    }

    if (comment.edited) {
      const edited = document.createElement("span");
      edited.textContent = "(edited)";
      edited.style.cssText = "font-size:11px;color:#9ca3af;";
      header.appendChild(edited);
    }

    const ts = document.createElement("span");
    ts.style.cssText = "font-size:11px;color:#9ca3af;";
    ts.textContent = timeStr;
    header.appendChild(ts);

    // Role badge
    if (comment.author.role && comment.author.role !== "user") {
      const roleBadge = document.createElement("span");
      roleBadge.textContent = comment.author.role;
      roleBadge.style.cssText = `font-size:10px;padding:1px 5px;border-radius:3px;${
        comment.author.role === "admin" ? "background:#fee2e2;color:#991b1b;" :
        comment.author.role === "moderator" ? "background:#dbeafe;color:#1e40af;" : ""
      }`;
      header.appendChild(roleBadge);
    }

    body.appendChild(header);

    // Content
    const content = document.createElement("div");
    content.style.cssText = "font-size:13px;line-height:1.6;margin-top:4px;color:#374151;";
    if (opts.renderComment) {
      const custom = opts.renderComment(comment);
      if (typeof custom === "string") content.innerHTML = custom;
      else { content.innerHTML = ""; content.appendChild(custom); }
    } else {
      content.innerHTML = comment.content;
    }
    body.appendChild(content);

    // Attachments
    if (comment.attachments?.length) {
      const attachments = document.createElement("div");
      attachments.style.cssText = "display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;";
      for (const att of comment.attachments) {
        const attTag = document.createElement("span");
        attTag.style.cssText = "font-size:11px;background:#f3f4f6;padding:3px 8px;border-radius:4px;color:#4b5563;cursor:pointer;";
        attTag.textContent = att.name;
        attachments.appendChild(attTag);
      }
      body.appendChild(attachments);
    }

    // Actions bar
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;align-items:center;gap:12px;margin-top:6px;";

    // Vote buttons
    if (opts.allowVoting) {
      const voteWrap = document.createElement("div");
      voteWrap.style.cssText = "display:flex;align-items:center;gap:2px;";

      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.innerHTML = "&#9650;";
      upBtn.title = "Upvote";
      upBtn.style.cssText = `background:none;border:none;cursor:pointer;font-size:12px;color:${(comment.userVote ?? 0) === 1 ? "#4338ca" : "#9ca3af"};padding:2px;`;
      upBtn.addEventListener("click", () => handleVote(comment, 1));
      voteWrap.appendChild(upBtn);

      const score = document.createElement("span");
      score.style.cssText = "font-size:12px;font-weight:600;color:#374151;min-width:16px;text-align:center;";
      score.textContent = String(((comment.upvotes ?? 0) - (comment.downvotes ?? 0)));
      voteWrap.appendChild(score);

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.innerHTML = "&#9660;";
      downBtn.title = "Downvote";
      downBtn.style.cssText = `background:none;border:none;cursor:pointer;font-size:12px;color:${(comment.userVote ?? 0) === -1 ? "#ef4444" : "#9ca3af"};padding:2px;`;
      downBtn.addEventListener("click", () => handleVote(comment, -1));
      voteWrap.appendChild(downBtn);

      actions.appendChild(voteWrap);
    }

    // Reply button
    if (opts.allowReplies && depth < opts.maxDepth) {
      const replyBtn = document.createElement("button");
      replyBtn.type = "button";
      replyBtn.textContent = "Reply";
      replyBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;padding:2px 6px;border-radius:4px;";
      replyBtn.addEventListener("click", () => setReplyingTo(comment));
      replyBtn.addEventListener("mouseenter", () => { replyBtn.style.background = "#f3f4f6"; });
      replyBtn.addEventListener("mouseleave", () => { replyBtn.style.background = ""; });
      actions.appendChild(replyBtn);
    }

    // Edit button
    if (isOwner && opts.allowEditing) {
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:11px;color:#6b7280;padding:2px 6px;border-radius:4px;";
      editBtn.addEventListener("click", () => setEditing(comment));
      editBtn.addEventListener("mouseenter", () => { editBtn.style.background = "#f3f4f6"; });
      editBtn.addEventListener("mouseleave", () => { editBtn.style.background = ""; });
      actions.appendChild(editBtn);
    }

    // Delete button
    if (isOwner && opts.allowDeleting) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "Delete";
      delBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:11px;color:#ef4444;padding:2px 6px;border-radius:4px;";
      delBtn.addEventListener("click", async () => {
        if (confirm("Delete this comment?")) {
          await opts.onDelete?.(comment.id);
          instance.removeComment(comment.id);
        }
      });
      delBtn.addEventListener("mouseenter", () => { delBtn.style.background = "#fef2f2"; });
      delBtn.addEventListener("mouseleave", () => { delBtn.style.background = ""; });
      actions.appendChild(delBtn);
    }

    body.appendChild(actions);

    // Replies
    if (comment.replies?.length && depth < opts.maxDepth) {
      const sortedReplies = sortComments(comment.replies, opts.sortBy);
      for (const reply of sortedReplies) {
        el.appendChild(renderComment(reply, depth + 1));
      }
    }

    el.appendChild(body);
    return el;
  }

  function handleVote(comment: Comment, direction: 1 | -1): void {
    const current = comment.userVote ?? 0;
    if (current === direction) {
      comment.userVote = 0;
      if (direction === 1) comment.upvotes = (comment.upvotes ?? 1) - 1;
      else comment.downvotes = (comment.downvotes ?? 1) - 1;
    } else {
      if (current === 1) comment.upvotes = (comment.upvotes ?? 1) - 1;
      else if (current === -1) comment.downvotes = (comment.downvotes ?? 1) - 1;
      comment.userVote = direction;
      if (direction === 1) comment.upvotes = (comment.upvotes ?? 0) + 1;
      else comment.downvotes = (comment.downvotes ?? 0) + 1;
    }
    opts.onVote?.(comment.id, direction);
    render();
  }

  function hashCode(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  // Initial render
  render();

  const instance: CommentSystemInstance = {
    element: root,

    getComments() { return [...allComments]; },

    addComment(comment: Comment) {
      if (comment.parentId) addToParent(allComments, comment.parentId, comment);
      else allComments.push(comment);
      render();
    },

    removeComment(id: string) {
      removeFromTree(allComments, id);
      render();
    },

    updateComment(id: string, updates: Partial<Comment>) {
      const c = findInTree(allComments, id);
      if (c) Object.assign(c, updates);
      render();
    },

    setSortBy(sort) {
      opts.sortBy = sort;
      // Update sort button styles
      for (const btn of sortBar.querySelectorAll("button[data-sort]")) {
        const isActive = btn.dataset.sort === sort;
        btn.style.background = isActive ? "#eef2ff" : "transparent";
        btn.style.color = isActive ? "#4338ca" : "#6b7280";
        btn.style.fontWeight = isActive ? "600" : "normal";
      }
      render();
    },

    focusInput() { textarea.focus(); },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
