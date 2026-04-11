/**
 * User Card: Profile card component with avatar, name, role, stats,
 * social links, action buttons, verified badge, and multiple layout variants.
 */

// --- Types ---

export type UserCardVariant = "default" | "compact" | "horizontal" | "minimal" | "detailed";
export type UserCardSize = "sm" | "md" | "lg";

export interface UserStats {
  label: string;
  value: string | number;
  icon?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon?: string;
}

export interface UserCardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Display name */
  name: string;
  /** Username/handle */
  handle?: string;
  /** Avatar URL */
  avatar?: string;
  /** Job title / role */
  title?: string;
  /** Organization / company */
  organization?: string;
  /** Bio / description */
  bio?: string;
  /** Location */
  location?: string;
  /** Email */
  email?: string;
  /** Website */
  website?: string;
  /** Join date (ISO or display string) */
  joinDate?: string;
  /** Stats row (followers, posts, etc.) */
  stats?: UserStats[];
  /** Social links */
  socialLinks?: SocialLink[];
  /** Is verified? */
  verified?: boolean;
  /** Card variant */
  variant?: UserCardVariant;
  /** Size */
  size?: UserCardSize;
  /** Primary action button label */
  primaryActionLabel?: string;
  /** On primary action click */
  onPrimaryAction?: () => void;
  /** Secondary action button label */
  secondaryActionLabel?: string;
  /** On secondary action click */
  onSecondaryAction?: () => void;
  /** Avatar click handler */
  onAvatarClick?: () => void;
  /** Theme color accent */
  accentColor?: string;
  /** Custom CSS class */
  className?: string;
}

export interface UserCardInstance {
  element: HTMLElement;
  setName: (name: string) => void;
  setAvatar: (url: string) => void;
  setBio: (bio: string) => void;
  setStats: (stats: UserStats[]) => void;
  setVerified: (verified: boolean) => void;
  destroy: () => void;
}

// --- Helpers ---

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + (parts[1]?.charAt(0) ?? "")).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just joined";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const SOCIAL_ICONS: Record<string, string> = {
  twitter: "\u{1D54F}", github: "\u{1D565}", linkedin: "in", website: "", email: "@",
};

// --- Main Factory ---

export function createUserCard(options: UserCardOptions): UserCardInstance {
  const opts = {
    handle: options.handle ?? "",
    avatar: options.avatar ?? "",
    title: options.title ?? "",
    organization: options.organization ?? "",
    bio: options.bio ?? "",
    location: options.location ?? "",
    email: options.email ?? "",
    website: options.website ?? "",
    joinDate: options.joinDate ?? "",
    stats: options.stats ?? [],
    socialLinks: options.socialLinks ?? [],
    verified: options.verified ?? false,
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    primaryActionLabel: options.primaryActionLabel ?? "Follow",
    secondaryActionLabel: options.secondaryActionLabel ?? "Message",
    accentColor: options.accentColor ?? "#4338ca",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("UserCard: container not found");

  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `user-card uc-${opts.variant} uc-${opts.size} ${opts.className}`;
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";

    const isCompact = opts.variant === "compact";
    const isHorizontal = opts.variant === "horizontal";
    const isMinimal = opts.variant === "minimal";
    const isDetailed = opts.variant === "detailed";

    // Base styles
    root.style.cssText = `
      font-family:-apple-system,sans-serif;color:#374151;
      background:#fff;border-radius:${isDetailed ? "16" : "12"}px;
      border:1px solid #e5e7eb;overflow:hidden;
      box-shadow:0 1px 3px rgba(0,0,0,0.04);transition:box-shadow 0.2s;
      ${isHorizontal
        ? "display:flex;align-items:center;gap:16px;padding:16px;"
        : isMinimal
          ? "display:flex;align-items:center;gap:10px;padding:8px 12px;"
          : "display:flex;flex-direction:column;align-items:center;padding:" + (isCompact ? "16px" : "24px") + ";"}
    `;

    root.addEventListener("mouseenter", () => { root.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; });
    root.addEventListener("mouseleave", () => { root.style.boxShadow = ""; });

    // Avatar section
    const avatarSize = opts.size === "xs" ? 32 : opts.size === "sm" ? 40 : opts.size === "lg" ? 72 : 56;
    const avatarSection = document.createElement("div");
    avatarSection.className = "uc-avatar-section";

    if (isHorizontal || isMinimal) {
      avatarSection.style.cssText = `flex-shrink:0;position:relative;`;
    } else {
      avatarSection.style.cssText = `margin-bottom:${isCompact ? "12" : "16"}px;position:relative;`;
    }

    const avatarEl = document.createElement("div");
    avatarEl.style.cssText = `
      width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:${avatarSize * 0.35}px;color:#fff;
      background:${opts.avatar ? `url(${opts.avatar}) center/cover` : `hsl(${hashCode(options.name)} % 55%, 50%)`};
      cursor:${opts.onAvatarClick ? "pointer" : "default"};
      border:3px solid ${opts.accentColor}20;transition:border-color 0.2s;
    `;
    if (!opts.avatar) avatarEl.textContent = getInitials(options.name);

    if (opts.onAvatarClick) {
      avatarEl.addEventListener("click", opts.onAvatarClick);
    }

    avatarSection.appendChild(avatarEl);

    // Verified badge
    if (opts.verified) {
      const badge = document.createElement("span");
      badge.innerHTML = "&#10003;";
      badge.style.cssText = `
        position:absolute;bottom:0;right:0;width:20px;height:20px;border-radius:50%;
        background:${opts.accentColor};color:#fff;font-size:11px;font-weight:700;
        display:flex;align-items:center;justify-content:center;border:2px solid #fff;
      `;
      avatarSection.appendChild(badge);
    }

    // Online status dot (optional visual)
    const statusDot = document.createElement("span");
    statusDot.style.cssText = `
      position:absolute;bottom:2px;right:2px;width:12px;height:12px;border-radius:50%;
      background:#22c55e;border:2px solid #fff;z-index:1;
    `;
    avatarSection.appendChild(statusDot);

    root.appendChild(avatarSection);

    // Info section
    const infoSection = document.createElement("div");
    infoSection.className = "uc-info";

    if (isHorizontal || isMinimal) {
      infoSection.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;";
    } else {
      infoSection.style.cssText = "text-align:center;width:100%;";
    }

    // Name + handle
    const nameRow = document.createElement("div");
    nameRow.style.cssText = `display:flex;align-items:center;gap:6px;${isMinimal ? "" : "flex-wrap:wrap;"}`;

    const nameEl = document.createElement("span");
    nameEl.style.cssText = `
      font-size:${isMinimal ? "13" : isCompact ? "15" : "17"}px;font-weight:700;color:#111827;line-height:1.2;
    `;
    nameEl.textContent = options.name;
    nameRow.appendChild(nameEl);

    if (opts.handle && !isMinimal) {
      const handleEl = document.createElement("span");
      handleEl.style.cssText = `font-size:${isCompact ? "12" : "13"}px;color:#9ca3af;`;
      handleEl.textContent = `@${opts.handle}`;
      nameRow.appendChild(handleEl);
    }

    infoSection.appendChild(nameRow);

    // Title / Role
    if (opts.title && !isMinimal) {
      const titleEl = document.createElement("div");
      titleEl.style.cssText = `font-size:${isCompact ? "11" : "12"}px;color:${opts.accentColor};font-weight:500;margin-top:2px;`;
      titleEl.textContent = opts.title;
      infoSection.appendChild(titleEl);
    }

    // Organization
    if (opts.organization && !isMinimal && !isCompact) {
      const orgEl = document.createElement("div");
      orgEl.style.cssText = "font-size:12px;color:#6b7280;margin-top:1px;";
      orgEl.textContent = opts.organization;
      infoSection.appendChild(orgEl);
    }

    // Bio
    if (opts.bio && (isDetailed || opts.variant === "default")) {
      const bioEl = document.createElement("p");
      bioEl.style.cssText = `
        font-size:13px;color:#6b7280;line-height:1.5;margin-top:8px;
        max-width:${isHorizontal ? "300px" : "360"}px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
      `;
      bioEl.textContent = opts.bio;
      infoSection.appendChild(bioEl);
    }

    // Meta info (location, join date)
    if ((opts.location || opts.joinDate) && isDetailed) {
      const metaRow = document.createElement("div");
      metaRow.style.cssText = "display:flex;gap:12px;margin-top:8px;font-size:12px;color:#9ca3af;";

      if (opts.location) {
        const loc = document.createElement("span");
        loc.textContent = `\u{1F4CD} ${opts.location}`;
        metaRow.appendChild(loc);
      }
      if (opts.joinDate) {
        const jd = document.createElement("span");
        jd.textContent = `Joined ${timeAgo(opts.joinDate)}`;
        metaRow.appendChild(jd);
      }
      infoSection.appendChild(metaRow);
    }

    // Stats
    if (opts.stats.length > 0 && !isMinimal) {
      const statsRow = document.createElement("div");
      statsRow.style.cssText = `
        display:flex;${isHorizontal ? "gap:16px;" : "gap:20px;justify-content:center;"}
        margin-top:${isCompact ? "6" : isDetailed ? "12" : "10"}px;
      `;
      for (const stat of opts.stats) {
        const statItem = document.createElement("div");
        statItem.style.cssText = "text-align:center;";
        const val = document.createElement("div");
        val.style.cssText = `font-size:${isCompact ? "14" : "16"}px;font-weight:700;color:#111827;`;
        val.textContent = String(stat.value);
        const lbl = document.createElement("div");
        lbl.style.cssText = "font-size:11px;color:#9ca3af;margin-top:1px;text-transform:capitalize;";
        lbl.textContent = stat.label;
        statItem.append(val, lbl);
        statsRow.appendChild(statItem);
      }
      infoSection.appendChild(statsRow);
    }

    // Social links
    if (opts.socialLinks.length > 0 && isDetailed) {
      const socialRow = document.createElement("div");
      socialRow.style.cssText = "display:flex;gap:8px;justify-content:center;margin-top:10px;";
      for (const link of opts.socialLinks) {
        const btn = document.createElement("a");
        btn.href = link.url;
        btn.target = "_blank";
        btn.rel = "noopener noreferrer";
        btn.title = link.platform;
        btn.style.cssText = `
          width:32px;height:32px;border-radius:50%;background:#f3f4f6;display:flex;
          align-items:center;justify-content:center;font-size:13px;color:#6b7280;
          text-decoration:none;transition:all 0.15s;
        `;
        btn.textContent = link.icon ?? SOCIAL_ICONS[link.platform.toLowerCase()] ?? "#";
        btn.addEventListener("mouseenter", () => { btn.style.background = opts.accentColor + "15"; btn.style.color = opts.accentColor; });
        btn.addEventListener("mouseleave", () => { btn.style.background = "#f3f4f6"; btn.style.color = "#6b7280"; });
        socialRow.appendChild(btn);
      }
      infoSection.appendChild(socialRow);
    }

    root.appendChild(infoSection);

    // Action buttons
    if (opts.primaryActionLabel || opts.secondaryActionLabel) {
      const actionsRow = document.createElement("div");
      actionsRow.style.cssText = `
        display:flex;gap:8px;margin-top:${isCompact ? "10" : isDetailed ? "16" : "12"}px;
        ${isHorizontal ? "flex-shrink:0;" : "width:100%;justify-content:center;"}
      `;

      if (opts.secondaryActionLabel) {
        const secBtn = document.createElement("button");
        secBtn.type = "button";
        secBtn.textContent = opts.secondaryActionLabel;
        secBtn.style.cssText = `
          padding:${isCompact ? "5px 14px" : "7px 18px"};border-radius:8px;font-size:13px;font-weight:500;
          background:#fff;color:${opts.accentColor};border:1px solid ${opts.accentColor};
          cursor:pointer;transition:all 0.15s;
        `;
        secBtn.addEventListener("click", () => opts.onSecondaryAction?.());
        secBtn.addEventListener("mouseenter", () => { secBtn.style.background = opts.accentColor + "08"; });
        secBtn.addEventListener("mouseleave", () => { secBtn.style.background = "#fff"; });
        actionsRow.appendChild(secBtn);
      }

      if (opts.primaryActionLabel) {
        const primBtn = document.createElement("button");
        primBtn.type = "button";
        primBtn.textContent = opts.primaryActionLabel;
        primBtn.style.cssText = `
          padding:${isCompact ? "5px 14px" : "7px 18px"};border-radius:8px;font-size:13px;font-weight:500;
          background:${opts.accentColor};color:#fff;border:none;cursor:pointer;
          transition:background 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.1);
        `;
        primBtn.addEventListener("click", () => opts.onPrimaryAction?.());
        primBtn.addEventListener("mouseenter", () => { primBtn.style.background = "#3730a3"; });
        primBtn.addEventListener("mouseleave", () => { primBtn.style.background = opts.accentColor; });
        actionsRow.appendChild(primBtn);
      }

      root.appendChild(actionsRow);
    }
  }

  // Initial render
  render();

  const instance: UserCardInstance = {
    element: root,

    setName(name: string) {
      options.name = name;
      render();
    },

    setAvatar(url: string) {
      options.avatar = url;
      render();
    },

    setBio(bio: string) {
      options.bio = bio;
      render();
    },

    setStats(stats: UserStats[]) {
      options.stats = stats;
      render();
    },

    setVerified(verified: boolean) {
      options.verified = verified;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
