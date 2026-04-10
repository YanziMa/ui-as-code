/**
 * Chat Bubble: Messaging UI component with sent/received bubbles,
 * timestamps, read receipts, typing indicator, avatar support,
 * message grouping, and action menus.
 */

// --- Types ---

export type MessageRole = "sent" | "received";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** ISO timestamp */
  timestamp: string;
  /** Sender name (for received) */
  senderName?: string;
  /** Sender avatar URL */
  senderAvatar?: string;
  /** Read receipts: array of reader IDs who've seen it */
  readBy?: string[];
  /** Status: sending, sent, delivered, read, failed */
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  /** Attachments (URLs or data URIs) */
  attachments?: Array<{ url: string; name?: string; type?: string }>;
  /** Is this the start of a group? (for visual grouping) */
  isGroupStart?: boolean;
  /** Custom render function */
  customRender?: (msg: ChatMessage) => HTMLElement | null;
}

export interface ChatBubbleOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Messages to display */
  messages?: ChatMessage[];
  /** Current user ID (to determine "sent") */
  currentUserId?: string;
  /** Show avatars? */
  showAvatars?: boolean;
  /** Show timestamps on each message? */
  showTimestamps?: boolean;
  /** Show read receipts / delivery status? */
  showStatus?: boolean;
  /** Show sender names for received? */
  showSenderNames?: boolean;
  /** Group consecutive messages from same sender? */
  groupMessages?: boolean;
  /** Bubble max width (CSS value) */
  bubbleMaxWidth?: string;
  /** Auto-scroll to bottom on new message? */
  autoScroll?: boolean;
  /** Callback on message click */
  onMessageClick?: (message: ChatMessage) => void;
  /** Callback on message long-press/right-click */
  onMessageContextMenu?: (message: ChatMessage, e: MouseEvent) => void;
  /** Format timestamp */
  formatTime?: (ts: string) => string;
  /** Custom CSS class */
  className?: string;
}

export interface ChatBubbleInstance {
  element: HTMLElement;
  getMessages: () => ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  removeMessage: (id: string) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setMessages: (messages: ChatMessage[]) => void;
  showTypingIndicator: (senderName?: string, avatarUrl?: string) => () => void;
  scrollToBottom: () => void;
  clear: () => void;
  destroy: () => void;
}

// --- Helpers ---

function formatTimeDefault(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}

// --- Main Class ---

export class ChatBubbleManager {
  create(options: ChatBubbleOptions): ChatBubbleInstance {
    const opts = {
      showAvatars: options.showAvatars ?? true,
      showTimestamps: options.showTimestamps ?? true,
      showStatus: options.showStatus ?? true,
      showSenderNames: options.showSenderNames ?? true,
      groupMessages: options.groupMessages ?? true,
      bubbleMaxWidth: options.bubbleMaxWidth ?? "70%",
      autoScroll: options.autoScroll ?? true,
      formatTime: options.formatTime ?? formatTimeDefault,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ChatBubble: container not found");

    container.className = `chat-bubble-container ${opts.className ?? ""}`;
    container.style.cssText = `
      display:flex;flex-direction:column;gap:4px;padding:16px;
      overflow-y:auto;min-height:200px;
    `;
    let messages: ChatMessage[] = opts.messages ?? [];
    let destroyed = false;

    // Typing indicator ref
    let typingEl: HTMLElement | null = null;

    function render(): void {
      container.innerHTML = "";

      if (opts.groupMessages) {
        const groups = groupMessages(messages);
        for (const group of groups) {
          for (let i = 0; i < group.messages.length; i++) {
            const msg = group.messages[i]!;
            const isFirstInGroup = i === 0;
            const el = renderMessage(msg, isFirstInGroup);
            container.appendChild(el);
          }
          // Group separator
          if (group.messages.length > 1) {
            const sep = document.createElement("div");
            sep.style.cssText = "height:8px;";
            container.appendChild(sep);
          }
        }
      } else {
        for (const msg of messages) {
          container.appendChild(renderMessage(msg, true));
        }
      }

      // Re-append typing indicator if active
      if (typingEl) container.appendChild(typingEl);

      if (opts.autoScroll) scrollToBottom();
    }

    function groupMessages(msgs: ChatMessage[]): { role: MessageRole; messages: ChatMessage[] }[] {
      const groups: { role: MessageRole; messages: ChatMessage[] }[] = [];
      let currentGroup: typeof groups[0] | null = null;

      for (const msg of msgs) {
        if (!currentGroup || currentGroup.role !== msg.role) {
          currentGroup = { role: msg.role, messages: [] };
          groups.push(currentGroup);
        }
        currentGroup.messages.push({ ...msg, isGroupStart: currentGroup.messages.length === 0 });
      }

      return groups;
    }

    function renderMessage(msg: ChatMessage, showMeta: boolean): HTMLElement {
      const isSent = msg.role === "sent";
      const row = document.createElement("div");
      row.className = `chat-message chat-message-${isSent ? "sent" : "received"}`;
      row.dataset.id = msg.id;
      row.style.cssText = `
        display:flex;flex-direction:${isSent ? "row-reverse" : "row"};
        align-items:flex-end;gap:6px;max-width:100%;
        ${!showMeta && opts.groupMessages ? "margin-bottom:2px;" : "margin-bottom:12px;"}
      `;

      // Avatar
      if (showMeta && opts.showAvatars) {
        const avatar = document.createElement("div");
        avatar.style.cssText = `width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;background:hsl(${hashCode(msg.senderName ?? msg.id) % 360}, 65%, 55%);overflow:hidden;`;
        if (msg.senderAvatar) {
          avatar.style.background = "";
          avatar.innerHTML = `<img src="${msg.senderAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
        } else {
          avatar.textContent = (msg.senderName || "U").charAt(0).toUpperCase();
        }
        row.appendChild(avatar);
      } else if (showMeta && !opts.showAvatars) {
        const spacer = document.createElement("div");
        spacer.style.cssText = "width:32px;flex-shrink:0;";
        row.appendChild(spacer);
      }

      // Bubble wrapper
      const bubbleWrap = document.createElement("div");
      bubbleWrap.style.cssText = `display:flex;flex-direction:${isSent ? "row-reverse" : "row"};align-items:flex-end;max-width:${opts.bubbleMaxWidth};flex:1;min-width:0;`;

      // Sender name
      if (showMeta && !isSent && opts.showSenderNames && msg.senderName) {
        const nameEl = document.createElement("div");
        nameEl.style.cssText = "font-size:11px;font-weight:600;color:#6b7280;margin-bottom:2px;";
        nameEl.textContent = msg.senderName;
        bubbleWrap.appendChild(nameEl);
      }

      // Bubble
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble chat-bubble-${isSent ? "sent" : "received"}`;

      // Custom renderer
      if (msg.customRender) {
        const custom = msg.customRender(msg);
        if (custom) {
          bubble.appendChild(custom);
        } else {
          bubble.appendChild(createDefaultContent(msg));
        }
      } else {
        bubble.appendChild(createDefaultContent(msg));
      }

      bubble.style.cssText = `
        padding:8px 14px;border-radius:${isSent ? "16px 4px 16px 16px" : "4px 16px 16px 16px"};
        font-size:14px;line-height:1.5;word-break:break-word;
        background:${isSent
          ? "linear-gradient(135deg,#6366f1,#4f46e5)"
          : "#f3f4f6"};
        color:${isSent ? "#fff" : "#111827"};
        position:relative;cursor:pointer;
        transition:opacity 0.15s;
        box-shadow:0 1px 2px rgba(0,0,0,0.05);
      `;

      bubble.addEventListener("mouseenter", () => { bubble.style.opacity = "0.9"; });
      bubble.addEventListener("mouseleave", () => { bubble.style.opacity = ""; });
      bubble.addEventListener("click", () => opts.onMessageClick?.(msg));
      bubble.addEventListener("contextmenu", (e) => { e.preventDefault(); opts.onMessageContextMenu?.(msg, e); });

      bubbleWrap.appendChild(bubble);

      // Status + timestamp below bubble
      if (showMeta) {
        const metaRow = document.createElement("div");
        metaRow.style.cssText = `display:flex;align-items:center;gap:4px;margin-top:2px;${isSent ? "justify-content:flex-end" : ""};font-size:10px;color:#9ca3af;`;

        if (opts.showTimestamps) {
          const ts = document.createElement("span");
          ts.textContent = opts.formatTime(msg.timestamp);
          metaRow.appendChild(ts);
        }

        if (isSent && opts.showStatus && msg.status) {
          const statusIcon = getStatusIcon(msg.status);
          if (statusIcon) {
            const icon = document.createElement("span");
            icon.innerHTML = statusIcon;
            icon.title = msg.status;
            metaRow.appendChild(icon);
          }
        }

        bubbleWrap.appendChild(metaRow);
      }

      row.appendChild(bubbleWrap);
      return row;
    }

    function createDefaultContent(msg: ChatMessage): HTMLElement {
      const wrapper = document.createElement("div");

      // Text content
      if (msg.content) {
        const textEl = document.createElement("div");
        textEl.innerHTML = escapeHtml(msg.content).replace(/\n/g, "<br>");
        wrapper.appendChild(textEl);
      }

      // Attachments
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          const isImage = att.type?.startsWith("image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.url);
          if (isImage) {
            const img = document.createElement("img");
            img.src = att.url;
            img.alt = att.name ?? "Attachment";
            img.style.cssText = "max-width:100%;max-height:240px;border-radius:8px;margin-top:6px;cursor:pointer;";
            img.loading = "lazy";
            wrapper.appendChild(img);
          } else {
            const fileLink = document.createElement("a");
            fileLink.href = att.url;
            fileLink.target = "_blank";
            fileLink.style.cssText = "display:inline-flex;align-items:center;gap:6px;padding:6px 10px;background:rgba(255,255,255,0.1);border-radius:6px;margin-top:6px;font-size:13px;text-decoration:none;";
            fileLink.innerHTML = `<span>&#128206;</span> ${escapeHtml(att.name ?? att.url.split("/").pop() ?? "File")}`;
            wrapper.appendChild(fileLink);
          }
        }
      }

      return wrapper;
    }

    function getStatusIcon(status: string): string {
      switch (status) {
        case "sending": return "&#9679;"; // filled circle
        case "sent": return "&#10003;"; // checkmark
        case "delivered": return "&#10003;&#10003;"; // double check
        case "read": return "<span style='color:#60a5fa'>&#10003;&#10003;</span>"; // blue double check
        case "failed": return "<span style='color:#ef4444'>!</span>";
        default: return "";
      }
    }

    function scrollToBottomFn(): void {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }

    // Initial render
    render();

    const instance: ChatBubbleInstance = {
      element: container,

      getMessages() { return [...messages]; },

      setMessages(newMessages: ChatMessage[]) {
        messages = newMessages;
        render();
      },

      addMessage(msg: ChatMessage) {
        messages.push(msg);
        render();
      },

      removeMessage(id: string) {
        messages = messages.filter((m) => m.id !== id);
        render();
      },

      updateMessage(id: string, updates: Partial<ChatMessage>) {
        const idx = messages.findIndex((m) => m.id === id);
        if (idx >= 0) messages[idx] = { ...messages[idx]!, ...updates };
        render();
      },

      showTypingIndicator(senderName?: string, avatarUrl?: string): () => void {
        if (typingEl) typingEl.remove();

        typingEl = document.createElement("div");
        typingEl.className = "chat-typing-indicator";
        typingEl.style.cssText = "display:flex;align-items:flex-end;gap:6px;padding:8px 0;";

        if (opts.showAvatars) {
          const avatar = document.createElement("div");
          avatar.style.cssText = `width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#fff;background:hsl(${hashCode(senderName ?? "typing") % 360}, 65%, 55%);overflow:hidden;flex-shrink:0;`;
          if (avatarUrl) {
            avatar.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="">`;
          } else {
            avatar.textContent = (senderName || "...").charAt(0).toUpperCase();
          }
          typingEl.appendChild(avatar);
        }

        const bubble = document.createElement("div");
        bubble.style.cssText = `
          padding:10px 16px;background:#f3f4f6;border-radius:4px 16px 16px 16px;
          display:flex;align-items:center;gap:4px;
        `;

        for (let i = 0; i < 3; i++) {
          const dot = document.createElement("span");
          dot.style.cssText = `
            width:7px;height:7px;border-radius:50%;background:#9ca3af;
            animation:typingBounce 1.4s ease-in-out infinite;
            animation-delay:${i * 0.16}s;
          `;
          bubble.appendChild(dot);
        }

        typingEl.appendChild(bubble);

        // Add keyframe if not present
        if (!document.getElementById("chat-typing-styles")) {
          const s = document.createElement("style");
          s.id = "chat-typing-styles";
          s.textContent = "@keyframes typingBounce{0%,80%,100%{transform:scale(0.6);opacity:0.5;}40%{transform:scale(1);opacity:1;}}";
          document.head.appendChild(s);
        }

        container.appendChild(typingEl);
        if (opts.autoScroll) scrollToBottomFn();

        // Return dismiss function
        return () => {
          typingEl?.remove();
          typingEl = null;
        };
      },

      scrollToBottom: scrollToBottomFn,

      clear() {
        messages = [];
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a chat bubble container */
export function createChatBubble(options: ChatBubbleOptions): ChatBubbleInstance {
  return new ChatBubbleManager().create(options);
}
