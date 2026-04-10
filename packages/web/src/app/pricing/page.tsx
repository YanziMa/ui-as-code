import { Check } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "For individuals getting started with UI-as-code.",
    features: [
      "50 diff generations/month",
      "1 SaaS connection",
      "Community support",
      "7-day history",
      "Basic analytics",
    ],
    cta: "Get Started",
    highlighted: false,
    badge: null,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For growing teams that need more power and flexibility.",
    features: [
      "Unlimited diff generations",
      "10 SaaS connections",
      "Priority support",
      "Unlimited history",
      "Advanced analytics",
      "Team collaboration (up to 5)",
      "Webhook access",
      "API access",
    ],
    cta: "Start Free Trial",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations that need security, scale, and control.",
    features: [
      "Everything in Pro",
      "Unlimited everything",
      "SSO/SAML",
      "Dedicated support",
      "Custom SLA",
      "On-premise option",
      "Audit logs",
    ],
    cta: "Contact Sales",
    highlighted: false,
    badge: null,
  },
];

const comparisonRows = [
  {
    feature: "Diff generations",
    free: "50 / month",
    pro: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    feature: "SaaS connections",
    free: "1",
    pro: "10",
    enterprise: "Unlimited",
  },
  {
    feature: "History retention",
    free: "7 days",
    pro: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    feature: "Analytics",
    free: "Basic",
    pro: "Advanced",
    enterprise: "Advanced + custom reports",
  },
  {
    feature: "Team members",
    free: "1",
    pro: "Up to 5",
    enterprise: "Unlimited",
  },
  {
    feature: "Support",
    free: "Community",
    pro: "Priority",
    enterprise: "Dedicated account manager",
  },
  {
    feature: "API & Webhooks",
    free: "\u2014",
    pro: "Included",
    enterprise: "Included + custom integrations",
  },
  {
    feature: "SSO / SAML",
    free: "\u2014",
    pro: "\u2014",
    enterprise: "Included",
  },
  {
    feature: "Custom SLA",
    free: "\u2014",
    pro: "\u2014",
    enterprise: "Included",
  },
  {
    feature: "On-premise deployment",
    free: "\u2014",
    pro: "\u2014",
    enterprise: "Available",
  },
  {
    feature: "Audit logs",
    free: "\u2014",
    pro: "\u2014",
    enterprise: "Included",
  },
];

const faqs = [
  {
    question: "Can I switch plans at any time?",
    answer:
      "Yes. You can upgrade or downgrade your plan at any time from your dashboard. When upgrading, you'll be charged the prorated difference immediately. When downgrading, the new rate takes effect at the start of your next billing cycle.",
  },
  {
    question: "What counts as a diff generation?",
    answer:
      "A diff generation is created every time you compare two versions of a UI component or page. This includes automated diffs from CI/CD pipelines, manual comparisons in the editor, and webhook-triggered diffs from connected SaaS tools.",
  },
  {
    question: "Is there a free trial for Pro?",
    answer:
      "Yes. Every new Pro plan starts with a 14-day free trial. No credit card is required to start. You'll have full access to all Pro features during the trial period.",
  },
  {
    question: "Do you offer discounts for startups or nonprofits?",
    answer:
      "We offer special pricing for qualified startups (under $5M funding) and registered nonprofit organizations. Contact our sales team with details about your organization to learn more about discounted rates.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="pt-24 pb-16 px-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
          Pricing
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
          Simple, transparent pricing
        </p>
      </section>

      {/* Pricing Tiers */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                tier.highlighted
                  ? "border-transparent bg-gradient-to-b from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200 scale-[1.02]"
                  : "border-gray-200 bg-white shadow-sm"
              }`}
            >
              {tier.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold ${
                    tier.highlighted
                      ? "bg-white text-indigo-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {tier.badge}
                </span>
              )}

              <div>
                <h3
                  className={`text-lg font-semibold ${
                    tier.highlighted ? "text-white" : "text-gray-900"
                  }`}
                >
                  {tier.name}
                </h3>
                <div className="mt-4 flex items-baseline">
                  <span
                    className={`text-4xl font-bold tracking-tight ${
                      tier.highlighted ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span
                      className={`ml-1 text-base ${
                        tier.highlighted
                          ? "text-indigo-200"
                          : "text-gray-500"
                      }`}
                    >
                      {tier.period}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-3 text-sm leading-relaxed ${
                    tier.highlighted ? "text-indigo-100" : "text-gray-500"
                  }`}
                >
                  {tier.description}
                </p>
              </div>

              <ul className="mt-8 space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check
                      className={`shrink-0 mt-0.5 h-5 w-5 ${
                        tier.highlighted
                          ? "text-indigo-200"
                          : "text-indigo-600"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        tier.highlighted ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`mt-8 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                  tier.highlighted
                    ? "bg-white text-indigo-700 hover:bg-indigo-50"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
          Compare features
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 font-semibold text-gray-900">
                  Feature
                </th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-center">
                  Free
                </th>
                <th className="px-6 py-4 font-semibold text-indigo-600 text-center">
                  Pro
                </th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-center">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={row.feature}
                  className={
                    i !== comparisonRows.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }
                >
                  <td className="px-6 py-3.5 text-gray-700">{row.feature}</td>
                  <td className="px-6 py-3.5 text-center text-gray-600">
                    {row.free}
                  </td>
                  <td className="px-6 py-3.5 text-center text-gray-900 font-medium">
                    {row.pro}
                  </td>
                  <td className="px-6 py-3.5 text-center text-gray-600">
                    {row.enterprise}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 pb-32">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-xl border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
