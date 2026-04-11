/**
 * Chat Widget: Floating chat bubble with message history, typing indicators,
 * file attachments, emoji picker, read receipts, presence status, and
 * expandable/collapsible panel.
 */

// --- Types ---

export interface ChatMessage {
  id: string;
  /** Sender ID */
  senderId: string;
  /** Display name */
  senderName: string;
  /** Avatar URL */
  avatar?: string;
  /** Message text (supports HTML) */
  content: string;
  /** Timestamp (ISO or Date) */
  timestamp: Date | string;
  /** Is this from the current user? */
  isOwn?: boolean;
  /** Message status */
  status?: "sending" | "sent" | "delivered" | "read" | "error";
  /** Attachments */
  attachments?: Array<{ name: string; url: string; type: string; size?: number }>;
  /** Replied-to message */
  replyTo?: ChatMessage;
  /** Reactions map: emoji → count */
  reactions?: Record<string, number>;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  status?: "online" | "offline" | "away" | "busy";
  lastSeen?: Date | string;
  /** Typing indicator */
  isTyping?: boolean;
}

export interface ChatWidgetOptions {
  container: HTMLElement | string;
  /** Current user ID */
  currentUserId: string;
  /** Current user display name */
  currentUserName: string;
  /** Initial messages */
  messages?: ChatMessage[];
  /** Other participants */
  participants?: ChatParticipant[];
  /** Widget title */
  title?: string;
  /** Subtitle / status text */
  subtitle?: string;
  /** Placeholder for input */
  placeholder?: string;
  /** Allow file attachments? */
  allowAttachments?: boolean;
  /** Show timestamps? */
  showTimestamps?: boolean;
  /** Show read receipts? */
  showReadReceipts?: boolean;
  /** Show typing indicators? */
  showTypingIndicator?: boolean;
  /** Show online status? */
  showPresence?: boolean;
  /** Max message length */
  maxLength?: number;
  /** Auto-scroll to bottom on new message? */
  autoScroll?: boolean;
  /** Theme color */
  themeColor?: string;
  /** Position of floating button */
  position?: "bottom-right" | "bottom-left";
  /** Initially open? */
  open?: boolean;
  /** Callback on send message */
  onSend?: (message: Omit<ChatMessage, "id">) => void | Promise<ChatMessage>;
  /** Callback on attachment click */
  onAttachmentClick?: (attachment: ChatMessage["attachments"][0]) => void;
  /** Custom render function for messages */
  renderMessage?: (msg: ChatMessage) => HTMLElement | string;
  /** Custom CSS class */
  className?: string;
}

export interface ChatWidgetInstance {
  element: HTMLElement;
  getMessages: () => ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  removeMessage: (id: string) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setTyping: (userId: string, typing: boolean) => void;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  focusInput: () => void;
  destroy: () => void;
}

// --- Helpers ---

function generateId(): string { return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function timeFormat(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDateGroup(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

// --- Main Factory ---

export function createChatWidget(options: ChatWidgetOptions): ChatWidgetInstance {
  const opts = {
    messages: options.messages ?? [],
    participants: options.participants ?? [],
    title: options.title ?? "Chat",
    subtitle: options.subtitle ?? "",
    placeholder: options.placeholder ?? "Type a message...",
    allowAttachments: options.allowAttachments ?? true,
    showTimestamps: options.showTimestamps ?? true,
    showReadReceipts: options.showReadReceipts ?? true,
    showTypingIndicator: options.showTypingIndicator ?? true,
    showPresence: options.showPresence ?? true,
    maxLength: options.maxLength ?? 2000,
    autoScroll: options.autoScroll ?? true,
    themeColor: options.themeColor ?? "#4338ca",
    position: options.position ?? "bottom-right",
    open: options.open ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ChatWidget: container not found");

  let allMessages: ChatMessage[] = [...opts.messages];
  let isOpen = opts.open;
  let destroyed = false;

  // Root floating container
  const root = document.createElement("div");
  root.className = `chat-widget ${opts.className}`;
  root.style.cssText = `
    position:fixed;${opts.position === "bottom-right" ? "right:20px;" : "left:20px;"}bottom:20px;
    z-index:10000;font-family:-apple-system,sans-serif;display:flex;flex-direction:column;
    box-shadow:0 8px 32px rgba(0,0,0,0.15);border-radius:14px;overflow:hidden;
    width:360px;height:520px;background:#fff;border:1px solid #e5e7eb;
    transition:opacity 0.2s,transform 0.2s;${isOpen ? "" : "opacity:0;pointer-events:none;transform:scale(0.95) translateY(10px);"}
  `;
  container.appendChild(root);

  // Header
  const header = document.createElement("div");
  header.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:${opts.themeColor};color:#fff;flex-shrink:0;`;
  root.appendChild(header);

  const headerLeft = document.createElement("div");
  headerLeft.style.display = "flex";
  headerLeft.style.alignItems = "center";
  headerLeft.style.gap = "10px";

  const titleEl = document.createElement("span");
  titleEl.style.cssText = "font-weight:600;font-size:14px;";
  titleEl.textContent = opts.title;
  headerLeft.appendChild(titleEl);

  if (opts.subtitle) {
    const subEl = document.createElement("span");
    subEl.style.cssText = "font-size:11px;opacity:0.85;";
    subEl.textContent = opts.subtitle;
    headerLeft.appendChild(subEl);
  }

  // Online indicator dot
  if (opts.showPresence && opts.participants.length > 0) {
    const anyOnline = opts.participants.some((p) => p.status === "online");
    const dot = document.createElement("span");
    dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${anyOnline ? "#22c55e" : "#9ca3af"};margin-left:4px;`;
    headerLeft.appendChild(dot);
  }

  header.appendChild(headerLeft);

  // Close/minimize button
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "&minus;";
  closeBtn.style.cssText = "background:none;border:none;color:#fff;cursor:pointer;font-size:18px;padding:4px 8px;border-radius:4px;line-height:1;";
  closeBtn.addEventListener("click", () => instance.toggle());
  header.appendChild(closeBtn);

  // Messages area
  const messagesArea = document.createElement("div");
  messagesArea.className = "cw-messages";
  messagesArea.style.cssText = "flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#f9fafb;";
  root.appendChild(messagesArea);

  // Input area
  const inputArea = document.createElement("div");
  inputArea.style.cssText = "display:flex;align-items:flex-end;gap:8px;padding:12px;border-top:1px solid #e5e7eb;background:#fff;flex-shrink:0;";
  root.appendChild(inputArea);

  // Attachment button
  if (opts.allowAttachments) {
    const attachBtn = document.createElement("button");
    attachBtn.type = "button";
    attachBtn.innerHTML = "&#128206;";
    attachBtn.title = "Attach file";
    attachBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:18px;color:#6b7280;padding:4px;border-radius:4px;";
    attachBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = "*/*";
      input.style.display = "none";
      input.addEventListener("change", () => {
        for (const f of Array.from(input.files)) {
          instance.addMessage({
            id: generateId(),
            senderId: opts.currentUserId,
            senderName: opts.currentUserName,
            content: `Shared: ${f.name}`,
            timestamp: new Date(),
            isOwn: true,
            status: "sent",
            attachments: [{ name: f.name, url: URL.createObjectURL(f), type: f.type, size: f.size }],
          });
        }
      });
      document.body.appendChild(input);
      input.click();
      input.remove();
    });
    inputArea.appendChild(attachBtn);
  }

  // Textarea
  const textarea = document.createElement("textarea");
  textarea.placeholder = opts.placeholder;
  textarea.rows = 1;
  textarea.maxLength = opts.maxLength;
  textarea.style.cssText = `
    flex:1;resize:none;outline:none;border:1px solid #d1d5db;border-radius:8px;
    padding:8px 12px;font-size:13px;font-family:inherit;line-height:1.5;max-height:100px;
    transition:border-color 0.15s;
  `;
  textarea.addEventListener("focus", () => { textarea.style.borderColor = opts.themeColor; });
  textarea.addEventListener("blur", () => { textarea.style.borderColor = "#d1d5db"; });
  textarea.addEventListener("input", () => { textarea.style.height = "auto"; textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px"; });
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  inputArea.appendChild(textarea);

  // Send button
  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.innerHTML = "\u27A4";
  sendBtn.title = "Send";
  sendBtn.style.cssText = `
    background:${opts.themeColor};border:none;color:#fff;cursor:pointer;width:34px;height:34px;
    border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;
    flex-shrink:0;transition:background 0.15s;
  `;
  sendBtn.addEventListener("click", handleSend);
  sendBtn.addEventListener("mouseenter", () => { sendBtn.style.background = "#3730a3"; });
  sendBtn.addEventListener("mouseleave", () => { sendBtn.style.background = opts.themeColor; });
  inputArea.appendChild(sendBtn);

  // Floating trigger button (when closed)
  const triggerBtn = document.createElement("button");
  triggerBtn.type = "button";
  triggerBtn.innerHTML = `\uD83D\uDCAC`;
  triggerBtn.style.cssText = `
    position:fixed;${opts.position === "bottom-right" ? "right:20px;" : "left:20px;"}bottom:20px;
    width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;
    background:${opts.themeColor};color:#fff;font-size:24px;z-index:9999;
    box-shadow:0 4px 16px rgba(67,56,202,0.35);transition:transform 0.2s;
    ${isOpen ? "display:none;" : ""}
  `;
  triggerBtn.addEventListener("click", () => instance.toggle());
  triggerBtn.addEventListener("mouseenter", () => { triggerBtn.style.transform = "scale(1.08)"; });
  triggerBtn.addEventListener("mouseleave", () => { triggerBtn.style.transform = ""; });
  document.body.appendChild(triggerBtn);

  // Unread badge
  let unreadCount = 0;
  const badge = document.createElement("span");
  badge.style.cssText = `
    position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;
    background:#ef4444;color:#fff;font-size:11px;font-weight:600;display:flex;
    align-items:center;justify-content:center;padding:0 4px;display:none;
  `;
  triggerBtn.style.position = "relative";
  triggerBtn.appendChild(badge);

  // Typing indicator
  let typingEl: HTMLElement | null = null;

  function showTyping(): void {
    if (!opts.showTypingIndicator || typingEl) return;
    typingEl = document.createElement("div");
    typingEl.className = "cw-typing";
    typingEl.style.cssText = "display:flex;align-items:center;gap:4px;padding:6px 12px;font-size:12px;color:#6b7280;";
    typingEl.innerHTML = `<span style="display:flex;gap:3px;"><span style="width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:bounce 1s infinite 0s;"></span><span style="width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:bounce 1s infinite 0.15s;"></span><span style="width:6px;height:6px;border-radius:50%;background:#9ca3af;animation:bounce 1s infinite 0.3s;"></span></span> Someone is typing...`;
    messagesArea.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTyping(): void {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  // Check if anyone is typing
  function checkTyping(): void {
    const anyoneTyping = opts.participants.some((p) => p.isTyping);
    if (anyoneTyping) showTyping();
    else hideTyping();
  }

  // --- Render ---

  function renderMessages(): void {
    messagesArea.innerHTML = "";

    if (allMessages.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px 16px;color:#9ca3af;font-size:13px;";
      empty.innerHTML = `<div style="font-size:28px;margin-bottom:8px;">\uD83D\uDCAC</div><div>No messages yet</div>`;
      messagesArea.appendChild(empty);
      return;
    }

    let lastDateGroup = "";
    for (const msg of allMessages) {
      const dateGroup = formatDateGroup(msg.timestamp);
      if (dateGroup !== lastDateGroup) {
        lastDateGroup = dateGroup;
        const groupLabel = document.createElement("div");
        groupLabel.style.cssText = "text-align:center;font-size:11px;color:#9ca3af;padding:8px 0 4px;";
        groupLabel.textContent = dateGroup;
        messagesArea.appendChild(groupLabel);
      }
      messagesArea.appendChild(renderMessage(msg));
    }

    checkTyping();
    if (opts.autoScroll) scrollToBottom();
  }

  function renderMessage(msg: ChatMessage): HTMLElement {
    const el = document.createElement("div");
    el.className = `cw-msg ${msg.isOwn ? "cw-msg-own" : ""}`;
    el.dataset.msgId = msg.id;
    el.style.cssText = `display:flex;flex-direction:column;${msg.isOwn ? "align-items:flex-end;" : "align-items:flex-start;"}max-width:80%;`;

    // Sender info (for others' messages)
    if (!msg.isOwn) {
      const senderRow = document.createElement("div");
      senderRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:2px;";

      const avatar = document.createElement("div");
      avatar.style.cssText = `
        width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:10px;font-weight:600;color:#fff;flex-shrink:0;
        background:${msg.avatar ? `url(${msg.avatar}) center/cover` : `hsl(${hashCode(msg.senderName) % 360}, 55%, 55%)`};
      `;
      if (!msg.avatar) avatar.textContent = msg.senderName.charAt(0).toUpperCase();
      senderRow.appendChild(avatar);

      const name = document.createElement("span");
      name.style.cssText = "font-size:11px;font-weight:600;color:#374151;";
      name.textContent = msg.senderName;
      senderRow.appendChild(name);

      el.appendChild(senderRow);
    }

    // Bubble
    const bubble = document.createElement("div");
    bubble.style.cssText = `
      padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.5;word-break:break-word;
      ${msg.isOwn
        ? `background:${opts.themeColor};color:#fff;border-bottom-right-radius:4px;`
        : "background:#fff;color:#374151;border:1px solid #e5e7eb;border-bottom-left-radius:4px;"}
    `;

    if (opts.renderMessage) {
      const custom = opts.renderMessage(msg);
      if (typeof custom === "string") bubble.innerHTML = custom;
      else { bubble.innerHTML = ""; bubble.appendChild(custom); }
    } else {
      bubble.textContent = msg.content;
    }

    // Reply reference
    if (msg.replyTo) {
      const replyRef = document.createElement("div");
      replyRef.style.cssText = `font-size:11px;padding:4px 8px;margin-bottom:4px;border-radius:6px;border-left:3px solid ${msg.isOwn ? "rgba(255,255,255,0.4)" : "#d1d5db"};${msg.isOwn ? "color:rgba(255,255,255,0.75);" : "color:#6b7280;"}`;
      replyRef.textContent = `${msg.replyTo.senderName}: ${msg.replyTo.content.slice(0, 60)}${msg.replyTo.content.length > 60 ? "..." : ""}`;
      bubble.insertBefore(replyRef, bubble.firstChild);
    }

    // Attachments
    if (msg.attachments?.length) {
      const attArea = document.createElement("div");
      attArea.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;";
      for (const att of msg.attachments) {
        const attTag = document.createElement("div");
        attTag.style.cssText = `padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;${msg.isOwn ? "background:rgba(255,255,255,0.2);color:#fff;" : "background:#f3f4f6;color:#4b5563;"}`;
        attTag.textContent = att.name;
        attTag.addEventListener("click", () => opts.onAttachmentClick?.(att));
        attArea.appendChild(attTag);
      }
      bubble.appendChild(attArea);
    }

    el.appendChild(bubble);

    // Meta row: timestamp + status + reactions
    const meta = document.createElement("div");
    meta.style.cssText = `display:flex;align-items:center;gap:6px;margin-top:2px;font-size:10px;${msg.isOwn ? "flex-row-reverse;" : ""}`;

    if (opts.showTimestamps) {
      const ts = document.createElement("span");
      ts.style.color = "#9ca3af";
      ts.textContent = timeFormat(msg.timestamp);
      meta.appendChild(ts);
    }

    if (msg.isOwn && opts.showReadReceipts && msg.status) {
      const statusIcon = document.createElement("span");
      switch (msg.status) {
        case "sending": statusIcon.textContent = "\u23F3"; break;
        case "sent": statusIcon.textContent = "\u2709"; break;
        case "delivered": statusIcon.textContent = "\u2713\u2713"; break;
        case "read": statusIcon.textContent = "\u2713\u2713\u00AE"; break;
        case "error": statusIcon.textContent = "!"; statusIcon.style.color = "#ef4444"; break;
        default: statusIcon.textContent = "";
      }
      if (msg.status !== "error") statusIcon.style.color = "#9ca3af";
      meta.appendChild(statusIcon);
    }

    // Reactions
    if (msg.reactions && Object.keys(msg.reactions).length > 0) {
      for (const [emoji, count] of Object.entries(msg.reactions)) {
        const rTag = document.createElement("span");
        rTag.style.cssText = "background:#f3f4f6;padding:1px 6px;border-radius:10px;font-size:11px;";
        rTag.textContent = `${emoji} ${count}`;
        meta.appendChild(rTag);
      }
    }

    el.appendChild(meta);
    return el;
  }

  function scrollToBottom(): void {
    requestAnimationFrame(() => { messagesArea.scrollTop = messagesArea.scrollHeight; });
  }

  async function handleSend(): Promise<void> {
    const content = textarea.value.trim();
    if (!content) return;

    const msg: Omit<ChatMessage, "id"> = {
      senderId: opts.currentUserId,
      senderName: opts.currentUserName,
      content,
      timestamp: new Date(),
      isOwn: true,
      status: "sending",
    };

    textarea.value = "";
    textarea.style.height = "auto";

    // Optimistic add
    const tempMsg: ChatMessage = { ...msg, id: generateId() };
    allMessages.push(tempMsg);
    renderMessages();

    try {
      const result = await opts.onSend?.(msg);
      if (result) {
        Object.assign(tempMsg, result);
        tempMsg.status = "sent";
      } else {
        tempMsg.status = "sent";
      }
    } catch {
      tempMsg.status = "error";
    }
    renderMessages();
  }

  // Initial render
  renderMessages();

  const instance: ChatWidgetInstance = {
    element: root,

    getMessages() { return [...allMessages]; },

    addMessage(msg: ChatMessage) {
      allMessages.push(msg);
      if (!isOpen) { unreadCount++; badge.textContent = String(unreadCount > 99 ? "99+" : unreadCount); badge.style.display = "flex"; }
      renderMessages();
    },

    removeMessage(id: string) {
      allMessages = allMessages.filter((m) => m.id !== id);
      renderMessages();
    },

    updateMessage(id: string, updates: Partial<ChatMessage>) {
      const m = allMessages.find((msg) => msg.id === id);
      if (m) Object.assign(m, updates);
      renderMessages();
    },

    setTyping(userId: string, typing: boolean) {
      const p = opts.participants.find((p) => p.id === userId);
      if (p) p.isTyping = typing;
      checkTyping();
    },

    setOpen(open: boolean) {
      isOpen = open;
      root.style.opacity = isOpen ? "1" : "0";
      root.style.pointerEvents = isOpen ? "auto" : "none";
      root.style.transform = isOpen ? "" : "scale(0.95) translateY(10px)";
      triggerBtn.style.display = isOpen ? "none" : "";
      if (isOpen) { unreadCount = 0; badge.style.display = "none"; textarea.focus(); }
    },

    toggle() { instance.setOpen(!isOpen); },

    focusInput() { textarea.focus(); },

    destroy() {
      destroyed = true;
      root.remove();
      triggerBtn.remove();
    },
  };

  return instance;
}
