/**
 * Result Page: Full-page result display for success/error/403/404/500 states
 * with SVG illustrations, descriptions, action buttons, extra content area,
 * and configurable layouts.
 */

// --- Types ---

export type ResultStatus = "success" | "error" | "info" | "warning" | "403" | "404" | "500";

export interface ResultPageOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Result status type */
  status?: ResultStatus;
  /** Title text (overrides default) */
  title?: string;
  /** Description/subtitle text */
  description?: string;
  /** Primary button label */
  primaryLabel?: string;
  /** Primary button callback */
  onPrimary?: () => void;
  /** Secondary button label */
  secondaryLabel?: string;
  /** Secondary button callback */
  onSecondary?: () => void;
  /** Extra content below actions (string or HTMLElement) */
  extraContent?: string | HTMLElement;
  /** Show back-to-home link? */
  showHomeLink?: boolean;
  /** Home link URL or callback */
  homeLink?: string | (() => void);
  /** Illustration size in px */
  illustrationSize?: number;
  /** Full page / centered mode? */
  fullPage?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface ResultPageInstance {
  element: HTMLElement;
  setStatus: (status: ResultStatus) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  destroy: () => void;
}

// --- Config ---

const STATUS_CONFIG: Record<ResultStatus, {
  title: string;
  description: string;
  color: string;
  bg: string;
  icon: string;
}> = {
  success: {
    title: "Operation Successful",
    description: "Your request has been processed successfully.",
    color: "#22c55e",
    bg: "#f0fdf4",
    icon: `<svg viewBox="0 0 200 160" fill="none"><circle cx="100" cy="72" r="48" fill="#dcfce7"/><circle cx="100" cy="72" r="36" fill="#bbf7d0"/><path d="M82 72l12 12 24-24" stroke="#16a34a" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  },
  error: {
    title: "Operation Failed",
    description: "Something went wrong. Please try again later.",
    color: "#ef4444",
    bg: "#fef2f2",
    icon: `<svg viewBox="0 0 200 160" fill="none"><circle cx="100" cy="70" r="46" fill="#fee2e2"/><circle cx="100" cy="70" r="34" fill="#fecaca"/><path d="M86 56l28 28M114 56l-28 28" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  info: {
    title: "Information",
    description: "Here is some additional information you may need.",
    color: "#3b82f6",
    bg: "#eff6ff",
    icon: `<svg viewBox="0 0 200 160" fill="none"><circle cx="100" cy="70" r="46" fill="#dbeafe"/><circle cx="100" cy="70" r="34" fill="#bfdbfe"/><text x="100" y="82" text-anchor="middle" font-size="36" font-weight="bold" fill="#2563eb">i</text></svg>`,
  },
  warning: {
    title: "Warning",
    description: "Please review the information below before proceeding.",
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: `<svg viewBox="0 0 200 160" fill="none"><path d="M100 30 L170 140 L30 140 Z" fill="#fef3c7" stroke="#fcd34d" stroke-width="3" stroke-linejoin="round"/><text x="100" y="115" text-anchor="middle" font-size="44" font-weight="bold" fill="#d97706">!</text></svg>`,
  },
  "403": {
    title: "403 Forbidden",
    description: "Sorry, you do not have permission to access this page.",
    color: "#ef4444",
    bg: "#fef2f2",
    icon: `<svg viewBox="0 0 200 160" fill="none"><rect x="50" y="35" width="100" height="80" rx="8" fill="#fee2e2" stroke="#fecaca" stroke-width="2"/><circle cx="100" cy="65" r="14" fill="#fecaca"/><rect x="88" y="78" width="24" height="20" rx="3" fill="#fecaca"/><line x1="145" y1="25" x2="175" y2="55" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/><line x1="175" y1="25" x2="145" y2="55" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/><text x="100" y="148" text-anchor="middle" font-size="22" font-weight="bold" fill="#dc2626">403</text></svg>`,
  },
  "404": {
    title: "404 Not Found",
    description: "The page you are looking for does not exist or has been moved.",
    color: "#6366f1",
    bg: "#eef2ff",
    icon: `<svg viewBox="0 0 200 160" fill="none"><circle cx="75" cy="65" r="38" fill="#e0e7ff"/><text x="75" y="78" text-anchor="middle" font-size="32" font-weight="bold" fill="#4338ca">?</text><circle cx="135" cy="95" r="25" fill="#c7d2fe"/><path d="M125 95l10 10 10-10" stroke="#4338ca" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="108" y1="45" x2="155" y2="85" stroke="#a5b4fc" stroke-width="2" stroke-dasharray="5 5"/></svg>`,
  },
  "500": {
    title: "500 Server Error",
    description: "The server encountered an internal error. Please try again later.",
    color: "#ef4444",
    bg: "#fef2f2",
    icon: `<svg viewBox="0 0 200 160" fill="none"><rect x="45" y="30" width="110" height="90" rx="8" fill="#fee2e2" stroke="#fecaca" stroke-width="2"/><line x1="60" y1="52" x2="140" y2="52" stroke="#fca5a5" stroke-width="3" stroke-linecap="round"/><line x1="60" y1="68" x2="120" y2="68" stroke="#fca5a5" stroke-width="3" stroke-linecap="round"/><line x1="60" y1="84" x2="100" y2="84" stroke="#fca5a5" stroke-width="3" stroke-linecap="round"/><circle cx="165" cy="40" r="18" fill="#fecaca"/><text x="165" y="47" text-anchor="middle" font-size="18" font-weight="bold" fill="#dc2626">!</text><text x="100" y="142" text-anchor="middle" font-size="22" font-weight="bold" fill="#dc2626">500</text></svg>`,
  },
};

// --- Main Class ---

export class ResultPageManager {
  create(options: ResultPageOptions): ResultPageInstance {
    const opts = {
      status: options.status ?? "404",
      illustrationSize: options.illustrationSize ?? 180,
      fullPage: options.fullPage ?? true,
      showHomeLink: options.showHomeLink ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ResultPage: container not found");

    let destroyed = false;
    const sc = STATUS_CONFIG[opts.status];

    // Root
    container.className = `result-page result-${opts.status} ${opts.className ?? ""}`;
    container.style.cssText = opts.fullPage
      ? `display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:400px;padding:48px 24px;text-align:center;`
      : `display:flex;flex-direction:column;align-items:center;padding:48px 24px;text-align:center;`;

    // Inner wrapper
    const inner = document.createElement("div");
    inner.className = "result-inner";
    inner.style.cssText = `
      display:flex;flex-direction:column;align-items:center;max-width:480px;
      animation:resultFadeIn 0.5s ease both;
    `;
    container.appendChild(inner);

    // Inject keyframes
    if (!document.getElementById("result-page-styles")) {
      const style = document.createElement("style");
      style.id = "result-page-styles";
      style.textContent = `
        @keyframes resultFadeIn{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
      `;
      document.head.appendChild(style);
    }

    // Illustration
    const illEl = document.createElement("div");
    illEl.className = "result-illustration";
    illEl.style.cssText = `
      width:${opts.illustrationSize}px;height:auto;margin-bottom:24px;opacity:0.9;
    `;
    illEl.innerHTML = sc.icon;
    inner.appendChild(illEl);

    // Title
    const titleEl = document.createElement("h1");
    titleEl.className = "result-title";
    titleEl.style.cssText = `
      font-size:24px;font-weight:700;color:#111827;margin:0 0 8px;line-height:1.3;
    `;
    titleEl.textContent = options.title ?? sc.title;
    inner.appendChild(titleEl);

    // Description
    const descEl = document.createElement("p");
    descEl.className = "result-description";
    descEl.style.cssText = `
      font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 28px;max-width:420px;
    `;
    descEl.textContent = options.description ?? sc.description;
    inner.appendChild(descEl);

    // Actions row
    const actionsRow = document.createElement("div");
    actionsRow.className = "result-actions";
    actionsRow.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;justify-content:center;";
    inner.appendChild(actionsRow);

    // Primary button
    if (opts.primaryLabel && opts.onPrimary) {
      const priBtn = document.createElement("button");
      priBtn.type = "button";
      priBtn.textContent = opts.primaryLabel;
      priBtn.style.cssText = `
        padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;
        background:${sc.color};color:#fff;border:none;cursor:pointer;
        transition:background 0.15s,transform 0.1s;box-shadow:0 2px 8px ${sc.color}33;
      `;
      priBtn.addEventListener("click", () => opts.onPrimary?.());
      priBtn.addEventListener("mouseenter", () => { priBtn.style.opacity = "0.9"; });
      priBtn.addEventListener("mouseleave", () => { priBtn.style.opacity = "1"; });
      actionsRow.appendChild(priBtn);
    }

    // Secondary button
    if (opts.secondaryLabel && opts.onSecondary) {
      const secBtn = document.createElement("button");
      secBtn.type = "button";
      secBtn.textContent = opts.secondaryLabel;
      secBtn.style.cssText = `
        padding:10px 24px;border-radius:8px;font-size:14px;font-weight:500;
        background:#fff;color:#4b5563;border:1px solid #d1d5db;cursor:pointer;
        transition:border-color 0.15s;
      `;
      secBtn.addEventListener("click", () => opts.onSecondary?.());
      secBtn.addEventListener("mouseenter", () => { secBtn.style.borderColor = "#9ca3af"; secBtn.style.background = "#f9fafb"; });
      secBtn.addEventListener("mouseleave", () => { secBtn.style.borderColor = "#d1d5db"; secBtn.style.background = "#fff"; });
      actionsRow.appendChild(secBtn);
    }

    // Home link
    if (opts.showHomeLink) {
      const homeLinkEl = document.createElement("a");
      homeLinkEl.className = "result-home-link";
      homeLinkEl.style.cssText = `
        display:inline-block;margin-top:20px;font-size:13px;color:${sc.color};
        text-decoration:none;font-weight:500;transition:color 0.15s;
      `;
      homeLinkEl.textContent = "Back to Home";

      if (typeof opts.homeLink === "function") {
        homeLinkEl.href = "#";
        homeLinkEl.addEventListener("click", (e) => { e.preventDefault(); opts.homeLink!(); });
      } else {
        homeLinkEl.href = opts.homeLink ?? "/";
      }

      homeLinkEl.addEventListener("mouseenter", () => { homeLinkEl.style.color = `${sc.color}99`; });
      homeLinkEl.addEventListener("mouseleave", () => { homeLinkEl.style.color = sc.color; });
      inner.appendChild(homeLinkEl);
    }

    // Extra content
    if (opts.extraContent) {
      const extraEl = document.createElement("div");
      extraEl.className = "result-extra";
      extraEl.style.cssText = "margin-top:28px;width:100%;max-width:420px;";
      if (typeof opts.extraContent === "string") {
        extraEl.innerHTML = opts.extraContent;
      } else {
        extraEl.appendChild(opts.extraContent);
      }
      inner.appendChild(extraEl);
    }

    // Instance
    const instance: ResultPageInstance = {
      element: container,

      setStatus(status: ResultStatus): void {
        opts.status = status;
        const cfg = STATUS_CONFIG[status];
        illEl.innerHTML = cfg.icon;
        if (!options.title) titleEl.textContent = cfg.title;
        if (!options.description) descEl.textContent = cfg.description;
        titleEl.style.color = "#111827";

        // Update primary button color if exists
        const priBtn = actionsRow.querySelector("button:first-child") as HTMLButtonElement | null;
        if (priBtn) {
          priBtn.style.background = cfg.color;
          priBtn.style.boxShadow = `0 2px 8px ${cfg.color}33`;
        }
      },

      setTitle(title: string): void {
        titleEl.textContent = title;
      },

      setDescription(desc: string): void {
        descEl.textContent = desc;
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a result page */
export function createResultPage(options: ResultPageOptions): ResultPageInstance {
  return new ResultPageManager().create(options);
}
