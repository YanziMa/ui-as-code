"use client";

import { useState, useMemo } from "react";

/* ─────────────────────────── Data ─────────────────────────── */

const STEPS = [
  {
    step: 1,
    title: "Share Your Link",
    description:
      "Get a unique referral link and share it via email, social media, or your website.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    ),
  },
  {
    step: 2,
    title: "Friends Sign Up",
    description:
      "Your friends get a 14-day Pro trial completely free when they sign up through your link.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    step: 3,
    title: "Earn Rewards",
    description:
      "Earn up to 35% commission on every first payment. Payouts are sent monthly via PayPal or bank transfer.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

const TIERS = [
  { tier: "Starter", referrals: "0 - 10", commission: "20%" },
  { tier: "Pro", referrals: "11 - 50", commission: "25%" },
  { tier: "Elite", referrals: "51 - 200", commission: "30%" },
  { tier: "VIP", referrals: "201 +", commission: "35% + dedicated support" },
];

const FAQS = [
  {
    q: "How do I get paid?",
    a: "Affiliates are paid monthly via PayPal, Wise, or direct bank transfer. Payments are processed by the 15th of each month for the previous month's earnings. Minimum payout threshold is $50.",
  },
  {
    q: "Is there a limit on how much I can earn?",
    a: "No! There is no cap on earnings. The more you refer, the more you earn. Top affiliates earn five-figure commissions every month.",
  },
  {
    q: "How long does the cookie last?",
    a: "Your referral cookie lasts for 90 days. If someone clicks your link and signs up within that window, you'll receive credit for the referral.",
  },
  {
    q: "Can I promote UI-as-Code on any platform?",
    a: "Yes, as long as the platform complies with our terms of service. You may use your link on blogs, YouTube, Twitter/X, newsletters, and more. Spam or misleading promotion is not allowed.",
  },
  {
    q: "What counts as a qualified referral?",
    a: "A qualified referral is a new user who signs up for a paid plan (Pro or Team) within 90 days of clicking your unique affiliate link. Free sign-ups do not earn commission.",
  },
  {
    q: "How do I track my performance?",
    a: "You get access to a real-time dashboard showing clicks, conversions, earnings, and payment history. We also send weekly summary emails.",
  },
  {
    q: "Can I upgrade my tier mid-month?",
    a: "Tier upgrades are applied at the start of the next billing cycle based on your total lifetime referrals. Once upgraded, all future commissions are calculated at the higher rate.",
  },
  {
    q: "Is there an approval process to join?",
    a: "Most applications are approved within 24 hours. We review each application to ensure quality alignment with our brand. You will receive an email once approved.",
  },
];

const MONTHLY_DATA = [
  { month: "Nov", value: 420 },
  { month: "Dec", value: 680 },
  { month: "Jan", value: 540 },
  { month: "Feb", value: 892 },
  { month: "Mar", value: 720 },
  { month: "Apr", value: 892 },
];
const MAX_BAR = Math.max(...MONTHLY_DATA.map((d) => d.value));

/* ────────────────────── Sub-components ────────────────────── */

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-12">
      <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">{subtitle}</p>}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function AccordionItem({
  item,
  open,
  onToggle,
}: {
  item: (typeof FAQS)[number];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 px-1 text-left font-semibold text-gray-900 hover:text-emerald-600 transition-colors"
      >
        {item.q}
        <svg
          className={`ml-4 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <p className="text-gray-500 leading-relaxed px-1">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════ Page ════════════════════════ */

export default function AffiliatePage() {
  /* ---- Calculator state ---- */
  const [referralsPerMonth, setReferralsPerMonth] = useState(15);
  const [avgPrice, setAvgPrice] = useState(29);

  /* ---- FAQ state ---- */
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* ---- CTA form state ---- */
  const [form, setForm] = useState({ name: "", email: "", platform: "" });

  /* Derived values */
  const monthlyEarnings = useMemo(
    () => Math.round(referralsPerMonth * avgPrice * 0.3 * 100) / 100,
    [referralsPerMonth, avgPrice]
  );
  const annualEarnings = useMemo(() => Math.round(monthlyEarnings * 12 * 100) / 100, [monthlyEarnings]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/60 to-white">
      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* background decoration */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-200/30 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Affiliate Program
            </span>

            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Earn With{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                UI-as-Code
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-500 leading-relaxed">
              Share UI-as-Code with your audience and earn up to <strong className="text-gray-700">35% commission</strong> on
              every paying customer you refer. It&apos;s free to join and takes less than a minute.
            </p>
          </div>

          {/* Referral card mockup */}
          <div className="mx-auto mt-14 max-w-lg">
            <Card className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-full opacity-60" />
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Your Referral Link</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm text-emerald-400 font-mono select-all">
                  uiascode.com/r/YOUR_CODE
                </code>
                <button className="shrink-0 rounded-lg bg-emerald-600 p-3 text-white hover:bg-emerald-700 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                </button>
              </div>
              <p className="mt-4 text-xs text-gray-400">Earn 30% commission on every referred customer</p>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="How It Works"
            subtitle="Three simple steps to start earning passive income with UI-as-Code."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <Card key={s.step} className="relative p-8 text-center group hover:shadow-md transition-shadow">
                {/* connector line (desktop only) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-emerald-200" />
                )}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {s.icon}
                </div>
                <div className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                  Step {s.step}
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-gray-500 leading-relaxed">{s.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Commission Tiers ═══ */}
      <section className="py-20 bg-gray-50/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Commission Tiers"
            subtitle="The more you refer, the more you earn. Climb the tiers and unlock bigger rewards."
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-6 text-sm font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-500 uppercase tracking-wider">Referrals Required</th>
                  <th className="py-4 px-6 text-sm font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t.tier} className="border-b border-gray-100 hover:bg-emerald-50/50 transition-colors">
                    <td className="py-5 px-6">
                      <span className="inline-flex items-center gap-2 font-bold text-gray-900">
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${
                            t.tier === "VIP"
                              ? "bg-yellow-400"
                              : t.tier === "Elite"
                              ? "bg-purple-500"
                              : t.tier === "Pro"
                              ? "bg-blue-500"
                              : "bg-gray-400"
                          }`}
                        />
                        {t.tier}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-gray-600">{t.referrals}</td>
                    <td className="py-5 px-6">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                        {t.commission}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══ Earnings Calculator ═══ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Earnings Calculator"
            subtitle="Estimate how much you could earn with the UI-as-Code affiliate program."
          />

          <Card className="max-w-2xl mx-auto p-8 sm:p-10">
            <div className="space-y-8">
              {/* Referrals slider */}
              <div>
                <label className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900">Referrals per month</span>
                  <span className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                    {referralsPerMonth}
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={referralsPerMonth}
                  onChange={(e) => setReferralsPerMonth(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 accent-emerald-600"
                />
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                  <span>1</span>
                  <span>100</span>
                </div>
              </div>

              {/* Average price input */}
              <div>
                <label htmlFor="avg-price" className="block font-semibold text-gray-900 mb-2">
                  Average plan price ($)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    id="avg-price"
                    type="number"
                    min={9}
                    max={99}
                    value={avgPrice}
                    onChange={(e) => setAvgPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 pl-8 pr-4 py-3 text-lg font-semibold text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                  />
                </div>
              </div>

              {/* Results */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 text-center">
                  <p className="text-sm text-emerald-600 font-medium">Monthly Earnings</p>
                  <p className="mt-1 text-3xl font-extrabold text-emerald-700">${monthlyEarnings.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-5 text-center">
                  <p className="text-sm text-gray-500 font-medium">Annual Projection</p>
                  <p className="mt-1 text-3xl font-extrabold text-gray-800">${annualEarnings.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-center text-gray-400">
                * Estimates assume Elite-tier rate (30%). Actual earnings depend on conversion rates and active tiers.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* ═══ Rewards Dashboard Preview ═══ */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Your Rewards Dashboard"
            subtitle="Track clicks, conversions, and earnings in real time."
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stat cards */}
            {[
              { label: "Total Earned", value: "$2,847.50", accent: true },
              { label: "Pending", value: "$420.00" },
              { label: "This Month", value: "$892.00", accent: true },
              { label: "Total Referrals", value: "47" },
              { label: "Conversion Rate", value: "34%" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl p-6 ${stat.accent ? "bg-emerald-600/20 border border-emerald-500/30" : "bg-white/5 border border-white/10"}`}
              >
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className={`mt-1 text-2xl font-extrabold ${stat.accent ? "text-emerald-400" : "text-white"}`}>
                  {stat.value}
                </p>
              </div>
            ))}

            {/* Mini bar chart */}
            <div className="lg:col-span-3 rounded-2xl bg-white/5 border border-white/10 p-6">
              <p className="text-sm text-gray-400 mb-5">Last 6 Months Earnings</p>
              <div className="flex items-end gap-4 h-40">
                {MONTHLY_DATA.map((d) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-gray-400">${d.value}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all"
                      style={{ height: `${(d.value / MAX_BAR) * 100}%` }}
                    />
                    <span className="text-xs text-gray-500">{d.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Marketing Assets ═══ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Marketing Assets"
            subtitle="Everything you need to promote UI-as-Code effectively."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "125 x 125 Banner", size: "Square" },
              { name: "300 x 250 Banner", size: "Medium Rectangle" },
              { name: "728 x 90 Banner", size: "Leaderboard" },
              { name: "Social Templates", size: "Twitter / LinkedIn" },
              { name: "Email Swipe Copy", size: "Ready-to-send" },
              { name: "Logo Pack", size: "SVG & PNG" },
              { name: "Product Screenshots", size: "High-res" },
              { name: "Video Bumper", size: "15 sec" },
            ].map((asset) => (
              <Card key={asset.name} className="p-5 hover:shadow-md transition-shadow group cursor-pointer">
                <div className="flex h-20 items-center justify-center rounded-xl bg-gray-100 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                </div>
                <p className="mt-3 font-semibold text-gray-900 text-sm">{asset.name}</p>
                <p className="text-xs text-gray-400">{asset.size}</p>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-gray-800 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Full Asset Kit
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-20 bg-gray-50/80">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Frequently Asked Questions" />

          <Card className="divide-y divide-gray-200">
            {FAQS.map((faq, idx) => (
              <AccordionItem
                key={idx}
                item={faq}
                open={openFaq === idx}
                onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
              />
            ))}
          </Card>
        </div>
      </section>

      {/* ═══ CTA / Sign Up ═══ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Left: copy */}
              <div className="p-10 sm:p-14 flex flex-col justify-center bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
                <h2 className="text-3xl sm:text-4xl font-extrabold">Start Earning Today</h2>
                <p className="mt-4 text-emerald-100 leading-relaxed">
                  Join thousands of creators, developers, and marketers who are already earning with
                  UI-as-Code. Sign up takes under a minute.
                </p>
                <ul className="mt-6 space-y-3">
                  {["Free to join — no upfront cost", "30% base commission", "Real-time dashboard & tracking", "Monthly payouts"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-emerald-100">
                      <svg className="h-5 w-5 shrink-0 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: form */}
              <div className="p-10 sm:p-14">
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="space-y-5"
                >
                  <div>
                    <label htmlFor="cta-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="cta-name"
                      type="text"
                      placeholder="Jane Doe"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cta-email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="cta-email"
                      type="email"
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cta-platform" className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Website / Platform
                    </label>
                    <input
                      id="cta-platform"
                      type="url"
                      placeholder="https://your-blog.com"
                      value={form.platform}
                      onChange={(e) => setForm({ ...form, platform: e.target.value })}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
                  >
                    Apply to Join the Program
                  </button>
                  <p className="text-xs text-center text-gray-400">
                    By applying, you agree to our Affiliate Terms of Service.
                  </p>
                </form>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
