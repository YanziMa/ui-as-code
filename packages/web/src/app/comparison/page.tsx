import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feature Comparison - UI-as-Code",
  description:
    "Compare UI-as-Code with alternatives: UserFeedback tools, manual development, and browser extensions.",
};

const features = [
  {
    name: "Natural language UI changes",
    uiac: "\u2705",
    feedback: "\u25D0",
    manual: "\u2717",
    extension: "\u2717",
  },
  {
    name: "Visual component inspector (Alt+Click)",
    uiac: "\u2705",
    feedback: "\u2717",
    manual: "\u2717",
    extension: "\u25D0",
  },
  {
    name: "AI-powered diff generation",
    uiac: "\u2705",
    feedback: "\u2717",
    manual: "\u2717",
    extension: "\u2717",
  },
  {
    name: "Live sandbox preview",
    uiac: "\u2705",
    feedback: "\u2717",
    manual: "\u2717",
    extension: "\u2717",
  },
  {
    name: "Direct PR to SaaS vendors",
    uiac: "\u2705",
    feedback: "\u25D0",
    manual: "\u2717",
    extension: "\u2717",
  },
  {
    name: "Community voting on changes",
    uiac: "\u2705",
    feedback: "\u2717",
    manual: "\u2717",
    extension: "\u2717",
  },
  {
    name: "No coding required",
    uiac: "\u2705",
    feedback: "\u2705",
    manual: "\u2717",
    extension: "\u25D0",
  },
  {
    name: "Works with any React SaaS",
    uiac: "\u2705",
    feedback: "\u2717",
    manual: "\u2717",
    extension: "\u25D0",
  },
  {
    name: "Team collaboration",
    uiac: "\u2705",
    feedback: "\u25D0",
    manual: "\u2717",
    extension: "\u2717",
  },
  {
    name: "Analytics & insights",
    uiac: "\u2705",
    feedback: "\u2705",
    manual: "\u2717",
    extension: "\u2717",
  },
  {
    name: "Free tier available",
    uiac: "\u2705",
    feedback: "\u2705",
    manual: "\u2717",
    extension: "\u2705",
  },
  {
    name: "Open source diffs",
    uiac: "\u2705",
    feedback: "\u2717",
    manual: "\u2717",
    extension: "\u2717",
  },
  {
    name: "Browser extension",
    uiac: "\u2705",
    feedback: "\u2717",
    manual: "\u2717",
    extension: "\u2705",
  },
  {
    name: "API access",
    uiac: "\u2705",
    feedback: "\u25D0",
    manual: "\u2717",
    extension: "\u2717",
  },
  {
    name: "Webhook integrations",
    uiac: "\u2705",
    feedback: "\u25D0",
    manual: "\u2717",
    extension: "\u2717",
  },
] as const;

const testimonials = [
  {
    quote:
      "We went from zero to shipping UI improvements in under an hour. Our product team can now propose changes without waiting for engineering sprints.",
    author: "Sarah Chen",
    role: "Head of Product, CloudSync",
  },
  {
    quote:
      "The AI diff generation is a game-changer. It understands our component library and produces clean, reviewable diffs that our engineers actually want to merge.",
    author: "Marcus Rivera",
    role: "CTO, DataFlow Labs",
  },
  {
    quote:
      "Our community loves being able to vote on UI changes. We've shipped 12 community-driven improvements this quarter alone.",
    author: "Aisha Patel",
    role: "Founder, OpenPanel",
  },
];

function CheckIcon() {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold shrink-0">
      &#10003;
    </span>
  );
}

function PartialIcon() {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-sm font-bold shrink-0">
      &#9678;
    </span>
  );
}

function NoneIcon() {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-lg font-light shrink-0">
      &#10005;
    </span>
  );
}

export default function ComparisonPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
            Why UI-as-Code?
          </h1>
          <p className="mt-4 text-xl text-gray-500 font-medium">
            Compare with alternatives
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="overflow-x-auto rounded-2xl shadow-xl border border-gray-200 bg-white">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr>
                <th className="px-6 py-5 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50/80">
                  Feature
                </th>
                <th className="px-6 py-5 text-sm font-semibold text-white uppercase tracking-wider border-b border-indigo-600 bg-indigo-600 text-center">
                  UI-as-Code
                </th>
                <th className="px-6 py-5 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50/80 text-center">
                  UserFeedback Tools
                </th>
                <th className="px-6 py-5 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50/80 text-center">
                  Manual Dev
                </th>
                <th className="px-6 py-5 text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50/80 text-center">
                  Browser Extensions
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr
                  key={feature.name}
                  className={
                    index % 2 === 0
                      ? "bg-white hover:bg-gray-50/60 transition-colors"
                      : "bg-gray-50/40 hover:bg-gray-50/80 transition-colors"
                  }
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-800 whitespace-nowrap border-b border-gray-100 last:border-b-0">
                    {feature.name}
                  </td>
                  <td className="px-6 py-4 text-center border-b border-indigo-100 last:border-b-0 bg-indigo-50/40">
                    {feature.uiac === "\u2705" ? (
                      <CheckIcon />
                    ) : feature.uiac === "\u25D0" ? (
                      <PartialIcon />
                    ) : (
                      <NoneIcon />
                    )}
                  </td>
                  <td className="px-6 py-4 text-center border-b border-gray-100 last:border-b-0">
                    {feature.feedback === "\u2705" ? (
                      <CheckIcon />
                    ) : feature.feedback === "\u25D0" ? (
                      <PartialIcon />
                    ) : (
                      <NoneIcon />
                    )}
                  </td>
                  <td className="px-6 py-4 text-center border-b border-gray-100 last:border-b-0">
                    {feature.manual === "\u2705" ? (
                      <CheckIcon />
                    ) : feature.manual === "\u25D0" ? (
                      <PartialIcon />
                    ) : (
                      <NoneIcon />
                    )}
                  </td>
                  <td className="px-6 py-4 text-center border-b border-gray-100 last:border-b-0">
                    {feature.extension === "\u2705" ? (
                      <CheckIcon />
                    ) : feature.extension === "\u25D0" ? (
                      <PartialIcon />
                    ) : (
                      <NoneIcon />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 justify-center text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <CheckIcon /> Full support
          </span>
          <span className="flex items-center gap-2">
            <PartialIcon /> Partial / Limited
          </span>
          <span className="flex items-center gap-2">
            <NoneIcon /> Not available
          </span>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Trusted by forward-thinking teams
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <article
                key={t.author}
                className="rounded-xl border border-gray-200 p-8 bg-gradient-to-br from-gray-50 to-white shadow-sm hover:shadow-md transition-shadow"
              >
                <blockquote className="relative">
                  <span className="absolute -top-2 -left-1 text-5xl text-indigo-200 leading-none select-none font-serif">
                    &ldquo;
                  </span>
                  <p className="relative z-10 text-gray-700 leading-relaxed pt-4">
                    {t.quote}
                  </p>
                </blockquote>
                <footer className="mt-6 pt-5 border-t border-gray-100">
                  <p className="font-semibold text-gray-900">{t.author}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{t.role}</p>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to transform how your team ships UI changes?
          </h2>
          <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto">
            Join thousands of teams using UI-as-Code to turn user feedback into
            production-ready code in minutes.
          </p>
          <a
            href="/getting-started"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-base font-bold text-indigo-700 shadow-lg hover:bg-indigo-50 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white"
          >
            Get started for free
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="ml-2 h-5 w-5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </section>
    </main>
  );
}
