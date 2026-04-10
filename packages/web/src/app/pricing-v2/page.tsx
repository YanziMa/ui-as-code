"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                   */
/* ------------------------------------------------------------------ */

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.295a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L7.5 12.586l7.29-7.29a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconMinus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}

function IconZap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
    </svg>
  );
}

function IconCreditCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const tiers = [
  {
    name: "Free",
    icon: <IconZap className="h-6 w-6" />,
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for individuals exploring UI-as-code.",
    features: [
      "5 diffs per month", "Community support (Discord)", "Basic visual inspector",
      "1 SaaS site connection", "7-day diff history", "Basic analytics dashboard",
    ],
    cta: "Get Started Free", highlighted: false, badge: null as string | null,
  },
  {
    name: "Pro",
    icon: <IconSparkles className="h-6 w-6" />,
    monthlyPrice: 19, annualPrice: 15,
    description: "For professionals and teams building at scale.",
    features: [
      "Unlimited diffs", "Priority AI generation queue", "Advanced inspector with annotations",
      "10 SaaS site connections", "Full API access & webhooks", "Email support (< 4hr response)",
      "Unlimited history retention", "Team collaboration (up to 5)", "Custom branding on exports",
    ],
    cta: "Start 14-Day Free Trial", highlighted: true, badge: "Most Popular",
  },
  {
    name: "Enterprise",
    icon: <IconBuilding className="h-6 w-6" />,
    monthlyPrice: 99, annualPrice: 79,
    description: "For organizations that need security, scale, and control.",
    features: [
      "Everything in Pro", "Custom integrations & APIs", "Dedicated account manager",
      "99.9% SLA guarantee", "SSO / SAML authentication", "Unlimited SaaS sites",
      "Phone & priority chat support", "On-premise / VPC deployment",
      "Audit logs & compliance reports", "Custom contract & invoicing",
    ],
    cta: "Contact Sales", highlighted: false, badge: null as string | null,
  },
];

const comparisonRows = [
  { feature: "Diff generations", free: "5 / month", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "AI generation priority", free: false, pro: true, enterprise: true },
  { feature: "Visual inspector", free: "Basic", pro: "Advanced + annotations", enterprise: "Advanced + annotations" },
  { feature: "SaaS site connections", free: "1", pro: "10", enterprise: "Unlimited" },
  { feature: "API access", free: false, pro: true, enterprise: true },
  { feature: "Webhooks", free: false, pro: true, enterprise: true },
  { feature: "History retention", free: "7 days", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Team members", free: "1", pro: "Up to 5", enterprise: "Unlimited" },
  { feature: "Support channel", free: "Community Discord", pro: "Email (< 4hr)", enterprise: "Phone + dedicated" },
  { feature: "SSO / SAML", free: false, pro: false, enterprise: true },
  { feature: "SLA guarantee", free: false, pro: false, enterprise: "99.9% uptime" },
  { feature: "On-premise deploy", free: false, pro: false, enterprise: true },
  { feature: "Audit logs", free: false, pro: false, enterprise: true },
  { feature: "Custom integrations", free: false, pro: false, enterprise: true },
];

const faqs = [
  {
    question: "Can I switch between Monthly and Annual billing?",
    answer:
      "Yes, you can switch between billing cycles at any time from your account settings. When switching to annual, you receive an immediate 20% discount on all future bills. Switching back takes effect at the end of your current billing period.",
  },
  {
    question: "What happens when I exceed my Free plan limit?",
    answer:
      "Once you reach 5 diffs in a calendar month, additional generations are paused until the next month. You'll see a friendly prompt to upgrade for unlimited access. We never charge overages or surprise fees.",
  },
  {
    question: "Is there a free trial for Pro or Enterprise?",
    answer:
      "Every Pro subscription includes a 14-day fully-featured free trial with no credit card required. For Enterprise plans, we offer a customized pilot program with a dedicated onboarding session and proof-of-concept evaluation period.",
  },
  {
    question: "Do you offer refunds if I'm not satisfied?",
    answer:
      "We offer a full refund within the first 30 days of your paid subscription, no questions asked. After that, cancel anytime and retain access until the end of your current billing cycle.",
  },
  {
    question: "Can I share my Pro plan with my team?",
    answer:
      "Pro includes team collaboration for up to 5 members at no extra cost. Each member gets their own login and can create diffs independently against the shared quota. Enterprise offers unlimited seats.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for Enterprise plans. All payments are processed securely through Stripe with PCI DSS Level 1 compliance.",
  },
  {
    question: "Are there discounts for startups, nonprofits, or education?",
    answer:
      "We offer 50% off Pro for registered nonprofits, accredited educational institutions, and startups under $5M in funding. Contact sales with verification details to claim your discount code.",
  },
  {
    question: "How does the Enterprise SLA work?",
    answer:
      "Our SLA guarantees 99.9% uptime with financial credits if we fall short. You get a dedicated account manager, P1 incident response within 15 minutes, scheduled maintenance windows, and quarterly business reviews.",
  },
];

const trustBadges = [
  { icon: <IconCreditCard className="h-5 w-5" />, text: "No credit card required" },
  { icon: <IconShield className="h-5 w-5" />, text: "Cancel anytime" },
  { icon: <IconClock className="h-5 w-5" />, text: "14-day Pro trial" },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? <IconCheck className="mx-auto h-5 w-5 text-emerald-600" /> : <IconX className="mx-auto h-5 w-5 text-gray-300" />;
  }
  if (value === "\u2014") return <IconMinus className="mx-auto h-5 w-5 text-gray-300" />;
  return <span className="text-gray-700">{value}</span>;
}

function FAQItem({ faq }: { faq: (typeof faqs)[number] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer">
        <span className="font-semibold text-gray-900">{faq.question}</span>
        <IconChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-6 pb-5 pt-4">
          <p className="text-sm leading-relaxed text-gray-500">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PricingV2Page() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      {/* ===== Hero Section ===== */}
      <section className="relative overflow-hidden pt-20 pb-12 sm:pt-28 sm:pb-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-indigo-100/60 blur-3xl" />
          <div className="absolute -right-40 top-20 h-80 w-80 rounded-full bg-purple-100/50 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200/60">
            <IconSparkles className="h-3.5 w-3.5" /> Updated pricing — more value, same simplicity
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Simple,{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">transparent</span>{" "}
            pricing
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-500">
            No hidden fees, no surprise charges, no per-seat nickel-and-diming.
            Pick the plan that fits your workflow and start shipping faster today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            {trustBadges.map((b) => (
              <div key={b.text} className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-emerald-600">{b.icon}</span>{b.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Billing Toggle ===== */}
      <div className="flex justify-center pb-10">
        <div className="inline-flex items-center rounded-full bg-gray-100 p-1 shadow-inner">
          <button type="button" onClick={() => setAnnual(false)} className={`cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-all ${!annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Monthly
          </button>
          <button type="button" onClick={() => setAnnual(true)} className={`cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-all ${annual ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Annual
            <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Save 20%</span>
          </button>
        </div>
      </div>

      {/* ===== Pricing Cards ===== */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-start lg:gap-6">
          {tiers.map((tier) => {
            const price = annual ? tier.annualPrice : tier.monthlyPrice;
            const h = tier.highlighted;
            return (
              <div key={tier.name} className={`group relative flex flex-col overflow-hidden rounded-2xl border p-8 transition-all duration-300 ${h ? "border-transparent bg-gradient-to-b from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-2xl shadow-indigo-200 md:-mt-4 md:mb-4 md:scale-[1.04]" : "border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300"}`}>
                {tier.badge && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 shadow-sm">{tier.badge}</span>}
                <div className="mb-6">
                  <div className={`mb-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${h ? "bg-white/15 text-white" : "bg-indigo-50 text-indigo-700"}`}>{tier.icon}{tier.name}</div>
                  <div className="flex items-baseline">
                    <span className={`text-5xl font-extrabold tracking-tight ${h ? "text-white" : "text-gray-900"}`}>{price === 0 ? "$0" : `$${price}`}</span>
                    {price > 0 && <span className={`ml-1.5 text-base ${h ? "text-indigo-200" : "text-gray-400"}`}>/mo</span>}
                  </div>
                  {annual && price > 0 && <p className="mt-1 text-xs text-emerald-300">Billed annually (${(price * 12).toLocaleString()}/yr)</p>}
                  {!annual && tier.monthlyPrice !== tier.annualPrice && <p className="mt-1 text-xs text-gray-400">or ${(tier.annualPrice * 12).toLocaleString()}/yr billed annually</p>}
                  <p className={`mt-4 text-sm leading-relaxed ${h ? "text-indigo-100" : "text-gray-500"}`}>{tier.description}</p>
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <IconCheck className={`mt-0.5 h-5 w-5 shrink-0 ${h ? "text-indigo-200" : "text-indigo-600"}`} />
                      <span className={`text-sm ${h ? "text-indigo-50" : "text-gray-600"}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold transition-all ${h ? "bg-white text-indigo-700 shadow-sm hover:bg-indigo-50 hover:shadow-md active:scale-[0.98]" : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-sm hover:shadow-md"}`}>
                  {tier.cta}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Feature Comparison Table ===== */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Compare every{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">feature</span>
          </h2>
          <p className="mt-3 text-gray-500">A side-by-side breakdown so you know exactly what you&apos;re getting.</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="px-6 py-4 font-semibold text-gray-900">Feature</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">Free</th>
                <th className="px-6 py-4 text-center font-semibold text-indigo-600">Pro</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-700">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={row.feature} className={`${i !== comparisonRows.length - 1 ? "border-b border-gray-100" : ""} transition-colors hover:bg-gray-50/50`}>
                  <td className="px-6 py-3.5 font-medium text-gray-800 whitespace-nowrap">{row.feature}</td>
                  <td className="px-6 py-3.5 text-center"><CellValue value={row.free} /></td>
                  <td className="px-6 py-3.5 text-center bg-indigo-50/30"><CellValue value={row.pro} /></td>
                  <td className="px-6 py-3.5 text-center"><CellValue value={row.enterprise} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== FAQ Section ===== */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Frequently asked{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">questions</span>
          </h2>
          <p className="mt-3 text-gray-500">Everything you need to know about our pricing and plans.</p>
        </div>
        <div className="space-y-4">{faqs.map((faq) => <FAQItem key={faq.question} faq={faq} />)}</div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 px-8 py-16 text-center shadow-2xl shadow-indigo-200 sm:px-16">
          <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-purple-300/20 blur-2xl" />
          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Not sure which plan is right?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-100">
              Start free today with full access to all features. Upgrade or downgrade anytime — no commitments, no lock-in.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button className="cursor-pointer rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50 hover:shadow-xl active:scale-[0.98]">Get Started Free</button>
              <button className="cursor-pointer rounded-xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 active:scale-[0.98]">Talk to Sales</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
