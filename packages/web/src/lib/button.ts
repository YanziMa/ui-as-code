/**
 * Button: Versatile button component with variants (primary/secondary/ghost/link/danger),
 * sizes, loading state, icon support, disabled state, button groups,
 * full-width mode, and accessible semantics.
 */

// --- Types ---

export type ButtonVariant = "default" | "primary" | "secondary" | "ghost" | "link" | "danger" | "success";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonOptions {
  /** Text content */
  text?: string;
  /** HTML content (overrides text) */
  html?: string;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Icon SVG string (left side) */
  iconLeft?: string;
  /** Icon SVG string (right side) */
  iconRight?: string;
  /** Loading state */
  loading?: boolean;
  /** Loading text (replaces normal text) */
  loadingText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Full width (block) */
  fullWidth?: boolean;
  /** Button type attribute */
  type?: "button" | "submit" | "reset";
  /** HTML tag to render as */
  as?: "button" | "a";
  /** Href for anchor tags */
  href?: string;
  /** Target for anchor tags */
  target?: string;
  /** Click handler */
  onClick?: (e: MouseEvent) => void;
  /** Custom CSS class */
  className?: string;
}

// --- Config ---

const VARIANT_STYLES: Record<ButtonVariant, {
  bg: string; color: string; border: string; hoverBg: string; hoverBorder: string; activeBg: string;
}> = {
  default:   { bg: "#fff", color: "#374151", border: "#d1d5db", hoverBg: "#f9fafb", hoverBorder: "#d1d5db", activeBg: "#f3f4f6" },
  primary:   { bg: "#4338ca", color: "#fff", border: "#4338ca", hoverBg: "#3730a3", hoverBorder: "#3730a3", activeBg: "#312e81" },
  secondary: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db", hoverBg: "#e5e7eb", hoverBorder: "#d1d5db", activeBg: "#d1d5db" },
  ghost:     { bg: "transparent", color: "#374151", border: "transparent", hoverBg: "#f3f4f6", hoverBorder: "transparent", activeBg: "#e5e7eb" },
  link:      { bg: "transparent", color: "#4338ca", border: "transparent", hoverBg: "transparent", hoverBorder: "transparent", activeBg: "#c7d2fe" },
  danger:    { bg: "#ef4444", color: "#fff", border: "#ef4444", hoverBg: "#dc2626", hoverBorder: "#dc2626", activeBg: "#b91c1c" },
  success:   { bg: "#22c55e", color: "#fff", border: "#22c55e", hoverBg: "#16a34a", hoverBorder: "#16a34a", activeBg: "#15803d" },
};

const SIZE_STYLES: Record<ButtonSize, { padding: string; fontSize: number; borderRadius: number; gap: number }> = {
  xs: { padding: "4px 10px", fontSize: 11, borderRadius: 4, gap: 4 },
  sm: { padding: "6px 14px", fontSize: 12, borderRadius: 6, gap: 5 },
  md: { padding: "8px 18px", fontSize: 13, borderRadius: 8, gap: 6 },
  lg: { padding: "11px 24px", fontSize: 15, borderRadius: 8, gap: 7 },
  xl: { padding: "14px 32px", fontSize: 17, borderRadius: 10, gap: 8 },
};

const LOADING_SPINNER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>`;

// --- Main Factory ---

export function createButton(options: ButtonOptions = {}): HTMLElement {
  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    loading: options.loading ?? false,
    disabled: options.disabled ?? false,
    fullWidth: options.fullWidth ?? false,
    type: options.type ?? "button",
    as: options.as ?? "button",
    className: options.className ?? "",
    ...options,
  };

  const v = VARIANT_STYLES[opts.variant];
  const s = SIZE_STYLES[opts.size];

  // Create element
  const el = opts.as === "a"
    ? document.createElement("a")
    : document.createElement("button");

  el.className = `btn btn-${opts.variant} btn-${opts.size} ${opts.className}`;
  if (opts.as === "a") {
    (el as HTMLAnchorElement).href = opts.href ?? "#";
    if (opts.target) (el as HTMLAnchorElement).target = opts.target;
  } else {
    (el as HTMLButtonElement).type = opts.type;
  }

  if (opts.disabled || opts.loading) {
    el.setAttribute("disabled", "");
    el.setAttribute("aria-disabled", "true");
  }

  el.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;gap:${s.gap}px;
    padding:${s.padding};font-size:${s.fontSize}px;font-weight:500;
    font-family:-apple-system,sans-serif;line-height:1.4;
    border-radius:${s.borderRadius}px;border:1.5px solid ${v.border};
    background:${v.bg};color:${v.color};
    cursor:${(opts.disabled || opts.loading) ? "not-allowed" : "pointer"};
    user-select:none;text-decoration:none;white-space:nowrap;
    transition:all 0.15s ease;position:relative;
    ${opts.fullWidth ? "width:100%;" : ""}
    ${(opts.disabled || opts.loading) ? "opacity:0.6;" : ""}
  `;

  // Content slot
  let contentSlot: HTMLElement;

  if (opts.loading) {
    contentSlot = document.createElement("span");
    contentSlot.style.cssText = "display:inline-flex;align-items:center;gap:6px;";
    const spinner = document.createElement("span");
    spinner.innerHTML = LOADING_SPINNER;
    spinner.style.animation = "spin 0.8s linear infinite";
    contentSlot.appendChild(spinner);
    const txt = document.createElement("span");
    txt.textContent = opts.loadingText ?? opts.text ?? "Loading...";
    contentSlot.appendChild(txt);
  } else {
    contentSlot = document.createElement("span");
    contentSlot.style.cssText = "display:inline-flex;align-items:center;gap:${s.gap}px;";

    if (opts.iconLeft) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = opts.iconLeft;
      iconEl.style.cssText = "display:flex;align-items:center;flex-shrink:0;";
      contentSlot.appendChild(iconEl);
    }

    if (opts.html) {
      const htmlWrap = document.createElement("span");
      htmlWrap.innerHTML = opts.html;
      contentSlot.appendChild(htmlWrap);
    } else if (opts.text !== undefined) {
      const txt = document.createElement("span");
      txt.textContent = opts.text;
      contentSlot.appendChild(txt);
    }

    if (opts.iconRight) {
      const iconEl = document.createElement("span");
      iconEl.innerHTML = opts.iconRight;
      iconEl.style.cssText = "display:flex;align-items:center;flex-shrink:0;";
      contentSlot.appendChild(iconEl);
    }
  }

  el.appendChild(contentSlot);

  // Hover / Active effects
  if (!opts.disabled && !opts.loading) {
    el.addEventListener("mouseenter", () => {
      el.style.background = v.hoverBg;
      el.style.borderColor = v.hoverBorder;
    });
    el.addEventListener("mouseleave", () => {
      el.style.background = v.bg;
      el.style.borderColor = v.border;
    });
    el.addEventListener("mousedown", () => {
      el.style.background = v.activeBg;
    });
    el.addEventListener("mouseup", () => {
      el.style.background = v.hoverBg;
    });
  }

  // Click handler
  if (opts.onClick && !opts.disabled && !opts.loading) {
    el.addEventListener("click", (e: MouseEvent) => opts.onClick!(e));
  }

  return el;
}

// --- Button Group ---

export interface ButtonGroupOptions {
  container: HTMLElement | string;
  buttons: Array<Omit<ButtonOptions, "fullWidth"> & { key?: string }>;
  orientation?: "horizontal" | "vertical";
  /** Allow multiple selected? (toggle group) */
  multiSelect?: boolean;
  /** Selected key(s) initially */
  selected?: string[];
  /** Variant when selected */
  selectedVariant?: ButtonVariant;
  onChange?: (selected: string[]) => void;
  className?: string;
}

export interface ButtonGroupInstance {
  element: HTMLElement;
  getSelected: () => string[];
  setSelected: (keys: string[]) => void;
  destroy: () => void;
}

export function createButtonGroup(options: ButtonGroupOptions): ButtonGroupInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ButtonGroup: container not found");

  const wrapper = document.createElement("div");
  wrapper.className = `btn-group ${options.orientation === "vertical" ? "btn-group-vertical" : ""} ${options.className ?? ""}`;
  wrapper.style.cssText = `
    display:inline-flex;${options.orientation === "vertical"
      ? "flex-direction:column;"
      : "flex-direction:row;"}
    ${options.orientation === "horizontal" ? "& > * + *{margin-left:-1px;}" : ""}
  `;
  container.appendChild(wrapper);

  let selectedKeys = new Set(options.selected ?? []);
  const btnEls: Map<string, HTMLElement> = new Map();
  const selVariant = options.selectedVariant ?? "primary";

  for (const btnOpts of options.buttons) {
    const key = btnOpts.key ?? btnOpts.text ?? String(Math.random());
    const isSelected = selectedKeys.has(key);

    const btn = createButton({
      ...btnOpts,
      variant: isSelected ? selVariant : (btnOpts.variant ?? "secondary"),
      onClick() {
        if (options.multiSelect) {
          if (selectedKeys.has(key)) selectedKeys.delete(key);
          else selectedKeys.add(key);
        } else {
          selectedKeys.clear();
          selectedKeys.add(key);
        }
        updateVisuals();
        options.onChange?.([...selectedKeys]);
      },
    });

    // Rounded edges for first/last in horizontal
    if (options.orientation === "horizontal") {
      const idx = options.buttons.indexOf(btnOpts);
      if (idx === 0) btn.style.borderTopRightRadius = "0"; // Actually keep left rounded
      if (idx === options.buttons.length - 1) btn.style.borderTopLeftRadius = "0";
      // Simplified: just use negative margin approach
    }

    btnEls.set(key, btn);
    wrapper.appendChild(btn);
  }

  function updateVisuals(): void {
    for (const [k, el] of btnEls) {
      const isSelected = selectedKeys.has(k);
      el.style.background = isSelected ? VARIANT_STYLES[selVariant].bg : "";
      el.style.color = isSelected ? VARIANT_STYLES[selVariant].color : "";
      el.style.borderColor = isSelected ? VARIANT_STYLES[selVariant].border : "";
    }
  }

  return {
    element: wrapper,
    getSelected: () => [...selectedKeys],
    setSelected(keys: string[]) {
      selectedKeys = new Set(keys);
      updateVisuals();
    },
    destroy() { wrapper.remove(); },
  };
}
