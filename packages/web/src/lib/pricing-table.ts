/**
 * Pricing Table: Feature comparison / pricing plan cards with toggle (monthly/annual),
 * highlighted "recommended" plan, feature checkmarks, CTA buttons, and responsive layout.
 */

// --- Types ---

export interface PricingFeature {
  /** Feature name */
  name: string;
  /** Tooltip/description */
  description?: string;
  /** Included in all plans? */
  includedInAll?: boolean;
}

export interface PricingPlan {
  /** Plan ID */
  id: string;
  /** Plan name */
  name: string;
  /** Price (monthly) */
  priceMonthly: number | string;
  /** Price (annually) — if different from monthly*12 */
  priceAnnual?: number | string;
  /** Currency symbol */
  currency?: string;
  /** Price suffix (e.g., "/month", "/user") */
  priceSuffix?: string;
  /** Description/subtitle */
  description?: string;
  /** Features list (boolean = included, string = custom text) */
  features: (boolean | string)[];
  /** Highlighted/recommended? */
  popular?: boolean;
  /** Badge text for popular plans (e.g., "Most Popular") */
  badge?: string;
  /** CTA button label */
  ctaLabel?: string;
  /** CTA button variant */
  ctaVariant?: "primary" | "secondary" | "outline";
  /** Custom color accent */
  accentColor?: string;
  /** Disabled state (e.g., "Coming Soon") */
  disabled?: boolean;
  /** Disabled reason text */
  disabledText?: string;
  /** Click handler */
  onCtaClick?: () => void;
}

export interface PricingTableOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Plans to display */
  plans: PricingPlan[];
  /** Shared feature list */
  features?: PricingFeature[];
  /** Show monthly/annual toggle */
  showToggle?: boolean;
  /** Default billing period */
  defaultPeriod?: "monthly" | "annual";
  /** Annual discount text (e.g., "Save 20%") */
  annualDiscount?: string;
  /** Layout direction */
  layout?: "horizontal" | "vertical" | "grid";
  /** Columns per row (for grid layout) */
  columns?: number;
  /** Callback when period toggled */
  onPeriodChange?: (period: "monthly" | "annual") => void;
  /** Callback when plan selected */
  onPlanSelect?: (plan: PricingPlan) => void;
  /** Custom CSS class */
  className?: string;
}

export interface PricingTableInstance {
  element: HTMLElement;
  getPeriod: () => "monthly" | "annual";
  setPeriod: (period: "monthly" | "annual") => void;
  getPlans: () => PricingPlan[];
  setPlans: (plans: PricingPlan[]) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createPricingTable(options: PricingTableOptions): PricingTableInstance {
  const opts = {
    showToggle: options.showToggle ?? true,
    defaultPeriod: options.defaultPeriod ?? "monthly",
    annualDiscount: options.annualDiscount ?? "Save 20%",
    layout: options.layout ?? "horizontal",
    columns: options.columns ?? 3,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("PricingTable: container not found");

  let currentPeriod = opts.defaultPeriod;
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `pricing-table ${opts.className ?? ""}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;
    width:100%;
  `;
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";

    // Toggle
    if (opts.showToggle) {
      const toggleWrap = document.createElement("div");
      toggleWrap.style.cssText = "display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:32px;";

      const monthlyLabel = document.createElement("span");
      monthlyLabel.textContent = "Monthly";
      monthlyLabel.style.cssText = `font-size:14px;font-weight:${currentPeriod === "monthly" ? "600" : "400"};color:${currentPeriod === "monthly" ? "#111827" : "#6b7280"};cursor:pointer;transition:all 0.15s;`;
      monthlyLabel.addEventListener("click", () => instance.setPeriod("monthly"));

      // Toggle switch
      const toggleTrack = document.createElement("button");
      toggleTrack.type = "button";
      toggleTrack.setAttribute("role", "switch");
      toggleTrack.setAttribute("aria-checked", String(currentPeriod === "annual"));
      toggleTrack.style.cssText = `
        position:relative;width:48px;height:26px;border-radius:13px;background:${currentPeriod === "annual" ? "#4338ca" : "#d1d5db"};
        border:none;cursor:pointer;padding:0;transition:background 0.2s;flex-shrink:0;
      `;
      const toggleThumb = document.createElement("span");
      toggleThumb.style.cssText = `
        position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;
        background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.2);
        transition:transform 0.2s ease;${currentPeriod === "annual" ? "transform:translateX(22px);" : ""}
      `;
      toggleTrack.appendChild(toggleThumb);
      toggleTrack.addEventListener("click", () => {
        instance.setPeriod(currentPeriod === "monthly" ? "annual" : "monthly");
      });

      const annualLabel = document.createElement("span");
      annualLabel.textContent = "Annual";
      annualLabel.style.cssText = `font-size:14px;font-weight:${currentPeriod === "annual" ? "600" : "400"};color:${currentPeriod === "annual" ? "#111827" : "#6b7280"};cursor:pointer;transition:all 0.15s;`;
      annualLabel.addEventListener("click", () => instance.setPeriod("annual"));

      if (opts.annualDiscount) {
        const discountBadge = document.createElement("span");
        discountBadge.textContent = opts.annualDiscount;
        discountBadge.style.cssText = "font-size:11px;font-weight:600;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:9999px;";
        toggleWrap.appendChild(discountBadge);
      }

      toggleWrap.append(monthlyLabel, toggleTrack, annualLabel);
      root.appendChild(toggleWrap);
    }

    // Plans grid
    const grid = document.createElement("div");
    grid.style.cssText = opts.layout === "vertical"
      ? "display:flex;flex-direction:column;gap:16px;max-width:640px;margin:0 auto;"
      : `display:grid;grid-template-columns:repeat(${Math.min(opts.columns!, opts.plans.length)},1fr);gap:20px;align-items:start;`;

    for (const plan of opts.plans) {
      grid.appendChild(createPlanCard(plan));
    }

    root.appendChild(grid);
  }

  function createPlanCard(plan: PricingPlan): HTMLElement {
    const isPopular = plan.popular ?? false;
    const accentColor = plan.accentColor ?? (isPopular ? "#4338ca" : "#e5e7eb");

    const card = document.createElement("div");
    card.dataset.planId = plan.id;
    card.style.cssText = `
      background:#fff;border:2px solid ${isPopular ? accentColor : "#e5e7eb"};
      border-radius:16px;padding:28px 24px;position:relative;
      box-shadow:${isPopular ? "0 8px 30px rgba(67,56,202,0.12)" : "0 1px 3px rgba(0,0,0,0.06)"};
      transition:transform 0.2s,box-shadow 0.2s;display:flex;flex-direction:column;
      ${plan.disabled ? "opacity:0.65;" : ""}
    `;

    // Popular badge
    if (plan.badge || isPopular) {
      const badge = document.createElement("div");
      badge.textContent = plan.badge ?? "Most Popular";
      badge.style.cssText = `
        position:absolute;top:-12px;left:50%;transform:translateX(-50%);
        background:${accentColor};color:#fff;font-size:12px;font-weight:600;
        padding:4px 16px;border-radius:9999px;white-space:nowrap;
      `;
      card.appendChild(badge);
    }

    // Plan name
    const nameEl = document.createElement("h3");
    nameEl.textContent = plan.name;
    nameEl.style.cssText = "font-size:18px;font-weight:700;color:#111827;text-align:center;margin:0 0 4px;";
    card.appendChild(nameEl);

    // Description
    if (plan.description) {
      const descEl = document.createElement("p");
      descEl.textContent = plan.description;
      descEl.style.cssText = "font-size:13px;color:#6b7280;text-align:center;margin:0 0 20px;";
      card.appendChild(descEl);
    }

    // Price
    const priceRow = document.createElement("div");
    priceRow.style.cssText = "text-align:center;margin-bottom:24px;";

    const currency = plan.currency ?? "$";
    const priceVal = currentPeriod === "annual"
      ? (plan.priceAnnual ?? typeof plan.priceMonthly === "number"
          ? Math.round(Number(plan.priceMonthly) * 12 * 0.8)
          : plan.priceMonthly)
      : plan.priceMonthly;

    const priceNum = document.createElement("span");
    priceNum.style.cssText = "font-size:42px;font-weight:800;color:#111827;line-height:1;";
    priceNum.textContent = typeof priceVal === "number" ? `${currency}${priceVal}` : String(priceVal);
    priceRow.appendChild(priceNum);

    if (plan.priceSuffix) {
      const suffix = document.createElement("span");
      suffix.textContent = plan.priceSuffix;
      suffix.style.cssText = "font-size:14px;color:#6b7280;margin-left:4px;";
      priceRow.appendChild(suffix);
    }

    card.appendChild(priceRow);

    // Features list
    const featList = document.createElement("ul");
    featList.style.cssText = "list-style:none;padding:0;margin:0 0 24px;flex:1;";

    const features = opts.features ?? [];
    for (let i = 0; i < Math.max(plan.features.length, features.length); i++) {
      const li = document.createElement("li");
      li.style.cssText = "display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f9fafb;font-size:14px;";

      const featValue = plan.features[i];
      const featName = features[i]?.name ?? `Feature ${i + 1}`;

      if (featValue === true) {
        li.innerHTML = `<span style="color:#22c55e;font-size:16px;">&#10003;</span><span>${featName}</span>`;
      } else if (featValue === false) {
        li.innerHTML = `<span style="color:#d1d5db;font-size:16px;">&#10007;</span><span style="color:#9ca3af;">${featName}</span>`;
      } else {
        li.innerHTML = `<span style="color:#6366f1;font-size:14px;">&#8226;</span><span>${String(featValue)}</span>`;
      }

      featList.appendChild(li);
    }
    card.appendChild(featList);

    // CTA Button
    const ctaBtn = document.createElement("button");
    ctaBtn.type = "button";
    ctaBtn.textContent = plan.disabled ? (plan.disabledText ?? "Coming Soon") : (plan.ctaLabel ?? "Get Started");
    ctaBtn.style.cssText = `
      width:100%;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:600;
      cursor:pointer;transition:all 0.15s;font-family:inherit;
      ${plan.disabled
        ? "background:#f3f4f6;color:#9ca3af;border:1px solid #e5e7eb;cursor:not-allowed;"
        : plan.ctaVariant === "outline"
          ? `background:transparent;border:2px solid ${accentColor};color:${accentColor};`
          : plan.ctaVariant === "secondary"
            ? "background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;"
            : `background:${accentColor};color:#fff;border:2px solid ${accentColor};`}
    `;

    if (!plan.disabled) {
      ctaBtn.addEventListener("mouseenter", () => {
        if (plan.ctaVariant !== "outline") ctaBtn.style.opacity = "0.9";
        else { ctaBtn.style.background = accentColor; ctaBtn.style.color = "#fff"; }
      });
      ctaBtn.addEventListener("mouseleave", () => {
        ctaBtn.style.opacity = "";
        if (plan.ctaVariant === "outline") { ctaBtn.style.background = "transparent"; ctaBtn.style.color = accentColor; }
      });
      ctaBtn.addEventListener("click", () => {
        plan.onCtaClick?.();
        opts.onPlanSelect?.(plan);
      });
    }

    card.appendChild(ctaBtn);

    // Hover effect
    if (!plan.disabled) {
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-4px)";
        card.style.boxShadow = isPopular
          ? "0 12px 40px rgba(67,56,202,0.18)"
          : "0 8px 25px rgba(0,0,0,0.1)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.style.boxShadow = isPopular
          ? "0 8px 30px rgba(67,56,202,0.12)"
          : "0 1px 3px rgba(0,0,0,0.06)";
      });
    }

    return card;
  }

  // Initial render
  render();

  const instance: PricingTableInstance = {
    element: root,

    getPeriod() { return currentPeriod; },

    setPeriod(period: "monthly" | "annual") {
      if (currentPeriod === period) return;
      currentPeriod = period;
      render();
      opts.onPeriodChange?.(period);
    },

    getPlans() { return [...opts.plans]; },

    setPlans(plans: PricingPlan[]) {
      opts.plans = plans;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
