/**
 * Price Tag Utilities: Price displays, comparison tags, discount badges,
 * currency formatting, tiered pricing, subscription badges, and
 * price animation utilities.
 */

// --- Types ---

export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "KRW" | "INR" | "BRL" | "CAD" | "AUD";
export type PriceStyle = "standard" | "compact" | "striking" | "highlight" | "minimal";
export type DiscountType = "percentage" | "fixed" | "label";
export type PeriodUnit = "month" | "year" | "week" | "day" | "lifetime" | "once";

export interface CurrencyConfig {
  /** Symbol placement: before or after */
  symbolPlacement: "before" | "after";
  /** Currency symbol */
  symbol: string;
  /** Decimal separator */
  decimalSeparator: string;
  /** Thousands separator */
  thousandsSeparator: string;
  /** Decimal places */
  decimals: number;
}

export interface PriceTagOptions {
  /** Current price */
  current: number;
  /** Original price (for strikethrough) */
  original?: number;
  /** Currency code */
  currency?: CurrencyCode;
  /** Custom currency config (overrides code) */
  currencyConfig?: CurrencyConfig;
  /** Display style */
  style?: PriceStyle;
  /** Size: sm/md/lg/xl */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show savings amount */
  showSavings?: boolean;
  /** Savings label text */
  savingsLabel?: string;
  /** Highlight color for current price */
  highlightColor?: string;
  /** Subscription period */
  period?: PeriodUnit;
  /** Period label override */
  periodLabel?: string;
  /** Per-unit label (e.g., "/user", "/seat") */
  perUnit?: string;
  /** Discount badge */
  discount?: { type: DiscountType; value: number; label?: string };
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface PriceTagInstance {
  /** Root element */
  el: HTMLElement;
  /** Update price values */
  updatePrice: (current: number, original?: number) => void;
  /** Set discount */
  setDiscount: (discount?: { type: DiscountType; value: number; label?: string }) => void;
  /** Animate price change (count-up effect) */
  animateTo: (target: number, duration?: number) => void;
  /** Destroy */
  destroy: () => void;
}

export interface TieredPrice {
  /** Tier name */
  name: string;
  /** Price per unit at this tier */
  price: number;
  /** Minimum quantity for this tier */
  minQty: number;
  /** Maximum quantity (null = unlimited) */
  maxQty: number | null;
  /** Popular/best-value badge? */
  popular?: boolean;
  /** Features list */
  features?: string[];
  /** CTA button label */
  cta?: string;
  /** CTA click handler */
  onCtaClick?: () => void;
}

export interface TieredPricingOptions {
  /** Pricing tiers */
  tiers: TieredPrice[];
  /** Currency */
  currency?: CurrencyCode;
  /** Selected tier index (0-based) */
  selectedIndex?: number;
  /** Unit label */
  unitLabel?: string;
  /** On tier change callback */
  onTierChange?: (tier: TieredPrice, index: number) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface TieredPricingInstance {
  /** Root element */
  el: HTMLElement;
  /** Get selected tier index */
  getSelectedIndex: () => number;
  /** Select a tier programmatically */
  selectTier: (index: number) => void;
  /** Update tier data */
  updateTier: (index: number, updates: Partial<TieredPrice>) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Currency Registry ---

const CURRENCY_MAP: Record<CurrencyCode, CurrencyConfig> = {
  USD: { symbolPlacement: "before", symbol: "$", decimalSeparator: ".", thousandsSeparator: ",", decimals: 2 },
  EUR: { symbolPlacement: "before", symbol: "\u20AC", decimalSeparator: ".", thousandsSeparator: ",", decimals: 2 },
  GBP: { symbolPlacement: "before", symbol: "\u00A3", decimalSeparator: ".", thousandsSeparator: ",", decimals: 2 },
  JPY: { symbolPlacement: "before", symbol: "\u00A5", decimalSeparator: "", thousandsSeparator: ",", decimals: 0 },
  CNY: { symbolPlacement: "before", symbol: "\u00A5", decimalSeparator: ".", thousandsSeparator: ",", decimals: 2 },
  KRW: { symbolPlacement: "before", symbol: "\u20A9", decimalSeparator: "", thousandsSeparator: ",", decimals: 0 },
  INR: { symbolPlacement: "before", symbol: "\u20B9", decimalSeparator: ".", thousandsSeparator: ",", decimals: 2 },
  BRL: { symbolPlacement: "before", symbol: "R$", decimalSeparator: ",", thousandsSeparator: ".", decimals: 2 },
  CAD: { symbolPlacement: "before", symbol: "CA$", decimalSeparator: ".", thousandsSeparator: ",", decimals: 2 },
  AUD: { symbolPlacement: "before", symbol: "A$", decimalSeparator: ".", thousandsSeparator: ",", decimals: 2 },
};

// --- Formatting ---

/**
 * Format a number as currency string.
 *
 * @example
 * ```ts
 * formatCurrency(1299.95, "USD"); // "$1,299.95"
 * formatCurrency(89, "JPY");     // "\u00A589"
 * ```
 */
export function formatCurrency(amount: number, code: CurrencyCode = "USD"): string {
  const cfg = CURRENCY_MAP[code];
  const fixed = amount.toFixed(cfg.decimals);
  const parts = fixed.split(cfg.decimalSeparator);
  const intPart = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, cfg.thousandsSeparator);
  const decPart = parts.length > 1 ? cfg.decimalSeparator + parts[1] : "";

  const formatted = intPart + decPart;
  return cfg.symbolPlacement === "before"
    ? cfg.symbol + formatted
    : formatted + " " + cfg.symbol;
}

/**
 * Calculate savings between original and current price.
 */
export function calculateSavings(original: number, current: number): {
  saved: number;
  percent: number;
  formattedSaved: string;
  formattedPercent: string;
} {
  const saved = Math.max(0, original - current);
  const percent = original > 0 ? (saved / original) * 100 : 0;
  return {
    saved,
    percent: Math.round(percent * 10) / 10,
    formattedSaved: formatCurrency(saved),
    formattedPercent: `${Math.round(percent)}%`,
  };
}

// --- Size Config ---

const PRICE_SIZE_STYLES: Record<string, {
  currentFontSize: string; currentWeight: string;
  originalFontSize: string; periodFontSize: string;
  lineHeight: string;
}> = {
  sm: { currentFontSize: "16px", currentWeight: "600", originalFontSize: "11px", periodFontSize: "10px", lineHeight: "1.2" },
  md: { currentFontSize: "24px", currentWeight: "700", originalFontSize: "13px", periodFontSize: "12px", lineHeight: "1.25" },
  lg: { currentFontSize: "32px", currentWeight: "700", originalFontSize: "16px", periodFontSize: "14px", lineHeight: "1.3" },
  xl: { currentFontSize: "44px", currentWeight: "800", originalFontSize: "20px", periodFontSize: "16px", lineHeight: "1.2" },
};

// --- Core Factory: Price Tag ---

/**
 * Create a price tag display element.
 *
 * @example
 * ```ts
 * const tag = createPriceTag({
 *   current: 29,
 *   original: 49,
 *   currency: "USD",
 *   period: "month",
 *   showSavings: true,
 *   style: "highlight",
 * });
 * ```
 */
export function createPriceTag(options: PriceTagOptions): PriceTagInstance {
  const {
    current,
    original,
    currency = "USD",
    currencyConfig,
    style = "standard",
    size = "md",
    showSavings = false,
    savingsLabel = "Save",
    highlightColor = "#111827",
    period,
    periodLabel,
    perUnit,
    discount,
    className,
    container,
  } = options;

  const cfg = currencyConfig ?? CURRENCY_MAP[currency];
  const ss = PRICE_SIZE_STYLES[size];

  const root = document.createElement("div");
  root.className = `price-tag ${style} ${size} ${className ?? ""}`.trim();

  // Build based on style
  switch (style) {
    case "compact":
      _renderCompact(root, current, original, cfg, ss, period, perUnit);
      break;
    case "striking":
      _renderStriking(root, current, original, cfg, ss, highlightColor, period, perUnit);
      break;
    case "highlight":
      _renderHighlight(root, current, original, cfg, ss, highlightColor, period, perUnit);
      break;
    case "minimal":
      _renderMinimal(root, current, original, cfg, ss, period, perUnit);
      break;
    default:
      _renderStandard(root, current, original, cfg, ss, highlightColor, period, perUnit, discount, showSavings, savingsLabel);
  }

  (container ?? document.body).appendChild(root);

  // --- Internal renderers ---

  function _fmt(n: number): string {
    return formatCurrencyWithConfig(n, cfg);
  }

  function formatCurrencyWithConfig(amount: number, c: CurrencyConfig): string {
    const fixed = amount.toFixed(c.decimals);
    const parts = fixed.split(c.decimalSeparator);
    const intPart = parts[0]!.replace(/\B(?=(\d{3})+(?!\d))/g, c.thousandsSeparator);
    const decPart = parts.length > 1 ? c.decimalSeparator + parts[1] : "";
    const formatted = intPart + decPart;
    return c.symbolPlacement === "before" ? c.symbol + formatted : formatted + " " + c.symbol;
  }

  function _periodStr(): string {
    if (!period) return "";
    const pl = periodLabel ?? period;
    const pu = perUnit ? `/${perUnit}` : "";
    return `<span class="price-period" style="font-size:${ss.periodFontSize};color:#9ca3af;font-weight:400;">/${pl}${pu}</span>`;
  }

  function _renderStandard(
    el: HTMLElement, cur: number, orig: number | undefined,
    c: CurrencyConfig, s: typeof ss, hColor: string,
    p?: PeriodUnit, pu?: string,
    disc?: PriceTagOptions["discount"], showSv?: boolean, svLabel?: string,
  ): void {
    el.style.cssText = "display:inline-flex;flex-direction:column;gap:2px;align-items:flex-start;";

    // Discount badge
    if (disc) {
      const db = _createDiscountBadge(disc);
      el.appendChild(db);
    }

    const mainRow = document.createElement("div");
    mainRow.className = "price-main-row";
    mainRow.style.cssText = "display:inline-flex;align-items:baseline;gap:6px;flex-wrap:wrap;";

    // Current price
    const curEl = document.createElement("span");
    curEl.className = "price-current";
    curEl.textContent = _fmt(cur);
    curEl.style.cssText =
      `font-size:${s.currentFontSize};font-weight:${s.currentWeight};` +
      `color:${hColor};line-height:${s.lineHeight};letter-spacing:-0.02em;`;
    curEl.dataset.value = String(cur);
    mainRow.appendChild(curEl);

    // Period
    if (p) {
      const pEl = document.createElement("span");
      pEl.innerHTML = _periodStr();
      mainRow.appendChild(pEl);
    }

    el.appendChild(mainRow);

    // Original price (strikethrough)
    if (orig !== undefined && orig > cur) {
      const origRow = document.createElement("div");
      origRow.className = "price-original-row";
      origRow.style.cssText = "display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;";

      const origEl = document.createElement("span");
      origEl.className = "price-original";
      origEl.textContent = _fmt(orig);
      origEl.style.cssText =
        `font-size:${s.originalFontSize};color:#9ca3af;text-decoration:line-through;text-decoration-color:#ef4444;`;
      origRow.appendChild(origEl);

      if (showSv) {
        const sv = calculateSavings(orig, cur);
        const svEl = document.createElement("span");
        svEl.className = "price-savings";
        svEl.textContent = `${svLabel} ${sv.formattedPercent}`;
        svEl.style.cssText =
          "font-size:11px;font-weight:600;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:9999px;";
        origRow.appendChild(svEl);
      }

      el.appendChild(origRow);
    }
  }

  function _renderCompact(
    el: HTMLElement, cur: number, orig: number | undefined,
    c: CurrencyConfig, s: typeof ss, p?: PeriodUnit, pu?: string,
  ): void {
    el.style.cssText = "display:inline-flex;align-items:baseline;gap:4px;";

    const curEl = document.createElement("span");
    curEl.className = "price-current";
    curEl.textContent = _fmt(cur);
    curEl.style.cssText =
      `font-size:${s.currentFontSize};font-weight:${s.currentWeight};color:#111827;`;
    curEl.dataset.value = String(cur);
    el.appendChild(curEl);

    if (orig !== undefined && orig > cur) {
      const origEl = document.createElement("span");
      origEl.className = "price-original";
      origEl.textContent = _fmt(orig);
      origEl.style.cssText =
        `font-size:${s.originalFontSize};color:#9ca3af;text-decoration:line-through;margin-left:4px;`;
      el.appendChild(origEl);
    }

    if (p) {
      const pEl = document.createElement("span");
      pEl.innerHTML = _periodStr();
      el.appendChild(pEl);
    }
  }

  function _renderStriking(
    el: HTMLElement, cur: number, orig: number | undefined,
    c: CurrencyConfig, s: typeof ss, hColor: string,
    p?: PeriodUnit, pu?: string,
  ): void {
    el.style.cssText = "display:inline-flex;flex-direction:column;gap:4px;align-items:flex-start;";

    if (orig !== undefined && orig > cur) {
      const origEl = document.createElement("span");
      origEl.className = "price-original";
      origEl.textContent = _fmt(orig);
      origEl.style.cssText =
        `font-size:${s.currentFontSize};color:#9ca3af;text-decoration:line-through;` +
        "text-decoration-thickness:2px;text-decoration-color:#ef4444;";
      el.appendChild(origEl);
    }

    const curEl = document.createElement("span");
    curEl.className = "price-current";
    curEl.textContent = _fmt(cur);
    curEl.style.cssText =
      `font-size:${parseFloat(s.currentFontSize) * 1.3}px;font-weight:800;` +
      `color:${hColor};letter-spacing:-0.03em;`;
    curEl.dataset.value = String(cur);
    el.appendChild(curEl);

    if (p) {
      const pEl = document.createElement("span");
      pEl.innerHTML = _periodStr();
      el.appendChild(pEl);
    }
  }

  function _renderHighlight(
    el: HTMLElement, cur: number, orig: number | undefined,
    c: CurrencyConfig, s: typeof ss, hColor: string,
    p?: PeriodUnit, pu?: string,
  ): void {
    el.style.cssText =
      `display:inline-flex;align-items:center;gap:8px;padding:8px 16px;` +
      `border-radius:10px;background:${hColor}08;border:1px solid ${hColor}20;`;

    const curEl = document.createElement("span");
    curEl.className = "price-current";
    curEl.textContent = _fmt(cur);
    curEl.style.cssText =
      `font-size:${s.currentFontSize};font-weight:${s.currentWeight};` +
      `color:${hColor};`;
    curEl.dataset.value = String(cur);
    el.appendChild(curEl);

    if (p) {
      const pEl = document.createElement("span");
      pEl.innerHTML = _periodStr();
      el.appendChild(pEl);
    }

    if (orig !== undefined && orig > cur) {
      const sv = calculateSavings(orig, cur);
      const svEl = document.createElement("span");
      svEl.className = "price-savings-badge";
      svEl.textContent = `-${sv.formattedPercent}`;
      svEl.style.cssText =
        "font-size:11px;font-weight:700;color:#fff;background:#16a34a;" +
        "padding:2px 8px;border-radius:9999px;";
      el.appendChild(svEl);
    }
  }

  function _renderMinimal(
    el: HTMLElement, cur: number, orig: number | undefined,
    c: CurrencyConfig, s: typeof ss, p?: PeriodUnit, pu?: string,
  ): void {
    el.style.cssText = "display:inline-flex;align-items:baseline;gap:2px;";

    const sym = document.createElement("span");
    sym.textContent = c.symbol;
    sym.style.cssText =
      `font-size:${parseFloat(s.currentFontSize) * 0.65}px;font-weight:${s.currentWeight};` +
      "vertical-align:super;margin-right:1px;";
    el.appendChild(sym);

    const curEl = document.createElement("span");
    curEl.className = "price-current";
    curEl.textContent = cur.toFixed(cfg.decimals);
    curEl.style.cssText =
      `font-size:${s.currentFontSize};font-weight:${s.currentWeight};color:#111827;` +
      "font-variant-numeric:tabular-nums;";
    curEl.dataset.value = String(cur);
    el.appendChild(curEl);

    if (p) {
      const pEl = document.createElement("span");
      pEl.innerHTML = _periodStr();
      el.appendChild(pEl);
    }
  }

  function _createDiscountBadge(disc: NonNullable<PriceTagOptions["discount"]>): HTMLElement {
    const b = document.createElement("span");
    b.className = "price-discount-badge";

    switch (disc.type) {
      case "percentage":
        b.textContent = disc.label ?? `-${disc.value}% OFF`;
        break;
      case "fixed":
        b.textContent = disc.label ?? `-${formatCurrencyWithConfig(disc.value, cfg)} OFF`;
        break;
      case "label":
        b.textContent = disc.label ?? disc.value.toString();
        break;
    }

    b.style.cssText =
      "display:inline-block;font-size:10px;font-weight:700;color:#fff;" +
      "background:linear-gradient(135deg,#f59e0b,#ef4444);" +
      "padding:2px 8px;border-radius:9999px;letter-spacing:0.03em;text-transform:uppercase;";
    return b;
  }

  // --- Methods ---

  function updatePrice(newCurrent: number, newOriginal?: number): void {
    const curEl = root.querySelector(".price-current") as HTMLElement;
    if (curEl) {
      curEl.textContent = _fmt(newCurrent);
      curEl.dataset.value = String(newCurrent);
    }

    // Re-render original/savings if changed
    if (newOriginal !== undefined) {
      const origSection = root.querySelector(".price-original-row") || root.querySelector(".price-original");
      if (origSection) {
        // Simple approach: just update text
        if (origSection.classList.contains("price-original")) {
          (origSection as HTMLElement).textContent = _fmt(newOriginal);
        }
      }
    }
  }

  function setDiscount(disc?: PriceTagOptions["discount"]): void {
    const existing = root.querySelector(".price-discount-badge");
    if (existing) existing.remove();
    if (disc) {
      const db = _createDiscountBadge(disc);
      const firstChild = root.firstChild;
      if (firstChild) root.insertBefore(db, firstChild);
      else root.appendChild(db);
    }
  }

  function animateTo(target: number, duration = 800): void {
    const curEl = root.querySelector(".price-current") as HTMLElement;
    if (!curEl) return;

    const startVal = parseFloat(curEl.dataset.value ?? "0");
    const startTime = performance.now();

    function step(now: number): void {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = startVal + (target - startVal) * eased;
      curEl.textContent = _fmt(val);
      curEl.dataset.value = String(val);

      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function destroy(): void {
    root.remove();
  }

  return { el: root, updatePrice, setDiscount, animateTo, destroy };
}

// --- Core Factory: Tiered Pricing ---

/**
 * Create a tiered pricing table/cards display.
 *
 * @example
 * ```ts
 * const tp = createTieredPricing({
 *   tiers: [
 *     { name: "Starter", price: 9, minQty: 1, maxQty: 10, features: ["Basic support"] },
 *     { name: "Pro", price: 29, minQty: 11, maxQty: 50, popular: true, features: ["Priority support", "API access"] },
 *     { name: "Enterprise", price: 99, minQty: 51, maxQty: null, features: ["Dedicated support", "SLA"] },
 *   ],
 *   onTierChange: (tier, i) => console.log("Selected:", tier.name),
 * });
 * ```
 */
export function createTieredPricing(options: TieredPricingOptions): TieredPricingInstance {
  const {
    tiers,
    currency = "USD",
    selectedIndex = 0,
    unitLabel = "",
    onTierChange,
    className,
    container,
  } = options;

  let _selected = selectedIndex;

  const root = document.createElement("div");
  root.className = `tiered-pricing ${className ?? ""}`.trim();
  root.style.cssText =
    "display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));" +
    "gap:16px;width:100%;";

  const cardEls: HTMLElement[] = [];

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i]!;
    const isSelected = i === _selected;
    const isPop = tier.popular ?? false;

    const card = document.createElement("div");
    card.className = `pricing-tier-card ${isSelected ? "selected" : ""}`;
    card.style.cssText =
      `position:relative;padding:24px 20px;border-radius:14px;border:2px solid ` +
      (isSelected ? "#3b82f6" : isPop ? "#f59e0b" : "#e5e7eb") + ";" +
      `background:${isSelected ? "#eff6ff" : "#fff"};` +
      "cursor:pointer;transition:all 0.2s ease;display:flex;flex-direction:column;gap:12px;";

    card.addEventListener("click", () => selectTier(i));

    // Popular badge
    if (isPop) {
      const popBadge = document.createElement("div");
      popBadge.textContent = "Most Popular";
      popBadge.style.cssText =
        "position:absolute;top:-10px;left:50%;transform:translateX(-50%);" +
        "background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;" +
        "font-size:10px;font-weight:700;padding:3px 14px;border-radius:9999px;" +
        "white-space:nowrap;letter-spacing:0.03em;text-transform:uppercase;";
      card.appendChild(popBadge);
    }

    // Name
    const nameEl = document.createElement("h4");
    nameEl.className = "tier-name";
    nameEl.textContent = tier.name;
    nameEl.style.cssText = "margin:0;font-size:16px;font-weight:700;color:#111827;";
    card.appendChild(nameEl);

    // Price
    const priceEl = document.createElement("div");
    priceEl.className = "tier-price";
    priceEl.style.cssText = "display:flex;align-items:baseline;gap:2px;";

    const sym = document.createElement("span");
    sym.textContent = CURRENCY_MAP[currency].symbol;
    sym.style.cssText = "font-size:18px;font-weight:600;color:#111827;";
    priceEl.appendChild(sym);

    const val = document.createElement("span");
    val.textContent = String(tier.price);
    val.style.cssText = "font-size:36px;font-weight:800;color:#111827;letter-spacing:-0.03em;line-height:1;";
    priceEl.appendChild(val);

    if (unitLabel) {
      const ul = document.createElement("span");
      ul.textContent = `/${unitLabel}`;
      ul.style.cssText = "font-size:13px;color:#6b7280;";
      priceEl.appendChild(ul);
    }

    card.appendChild(priceEl);

    // Quantity range
    const rangeEl = document.createElement("div");
    rangeEl.className = "tier-range";
    rangeEl.textContent = tier.maxQty
      ? `${tier.minQty}\u2013${tier.maxQty} ${unitLabel || "units"}`
      : `${tier.minQty}+ ${unitLabel || "units"}`;
    rangeEl.style.cssText = "font-size:12px;color:#9ca3af;";
    card.appendChild(rangeEl);

    // Features
    if (tier.features && tier.features.length > 0) {
      const featList = document.createElement("ul");
      featList.className = "tier-features";
      featList.style.cssText = "list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;flex:1;";

      for (const f of tier.features) {
        const li = document.createElement("li");
        li.style.cssText = "display:flex;align-items:center;gap:6px;font-size:13px;color:#374151;";
        li.innerHTML = `<span style="color:#16a34a;font-size:14px;">&#10003;</span>${f}`;
        featList.appendChild(li);
      }

      card.appendChild(featList);
    }

    // CTA button
    if (tier.cta) {
      const ctaBtn = document.createElement("button");
      ctaBtn.type = "button";
      ctaBtn.textContent = tier.cta;
      ctaBtn.style.cssText =
        `width:100%;padding:10px;border-radius:8px;border:none;font-size:14px;font-weight:600;` +
        (isSelected || isPop
          ? "background:#3b82f6;color:#fff;"
          : "background:#f3f4f6;color:#374151;") +
        "cursor:pointer;transition:all 0.15s;margin-top:auto;";
      ctaBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        tier.onCtaClick?.();
      });
      card.appendChild(ctaBtn);
    }

    cardEls.push(card);
    root.appendChild(card);
  }

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function selectTier(index: number): void {
    if (index < 0 || index >= tiers.length) return;
    _selected = index;

    for (let i = 0; i < cardEls.length; i++) {
      const card = cardEls[i]!;
      const tier = tiers[i]!;
      const isSel = i === index;
      card.classList.toggle("selected", isSel);
      card.style.borderColor = isSel ? "#3b82f6" : (tier.popular ? "#f59e0b" : "#e5e7eb");
      card.style.background = isSel ? "#eff6ff" : "#fff";

      // Update CTA button style
      const cta = card.querySelector("button") as HTMLElement;
      if (cta) {
        cta.style.background = isSel || tier.popular ? "#3b82f6" : "#f3f4f6";
        cta.style.color = isSel || tier.popular ? "#fff" : "#374151";
      }
    }

    onTierChange?.(tiers[index]!, index);
  }

  function getSelectedIndex(): number { return _selected; }

  function updateTier(index: number, updates: Partial<TieredPrice>): void {
    if (index < 0 || index >= tiers.length) return;
    Object.assign(tiers[index], updates);
    // Full rebuild would be needed for complex changes — simplified:
    const card = cardEls[index];
    if (!card) return;

    if (updates.price !== undefined) {
      const valEl = card.querySelector(".tier-price span:nth-child(2)") as HTMLElement;
      if (valEl) valEl.textContent = String(updates.price);
    }
    if (updates.name !== undefined) {
      const nameEl = card.querySelector(".tier-name") as HTMLElement;
      if (nameEl) nameEl.textContent = updates.name;
    }
  }

  function destroy(): void {
    root.remove();
  }

  return { el: root, getSelectedIndex, selectTier, updateTier, destroy };
}
