export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-32 pb-20 text-center">
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Fix your SaaS UI in 30 minutes.
          <br />
          <span className="text-blue-600">No code required.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          UI-as-Code lets you modify any SaaS interface with natural language.
          AI generates the code, you preview the change, and the best
          improvements flow back to everyone.
        </p>
        <div className="mt-10 flex gap-4">
          <a
            href="#how-it-works"
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            How it Works
          </a>
          <a
            href="#install"
            className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Install Extension
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-zinc-100 bg-zinc-50 px-6 py-24 dark:border-zinc-900 dark:bg-zinc-950">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            From frustration to fix in 4 steps
          </h2>
          <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Select",
                desc: "Alt+Click any element on the page to inspect it",
              },
              {
                step: "2",
                title: "Describe",
                desc: "Tell AI what you want changed in plain language",
              },
              {
                step: "3",
                title: "Preview",
                desc: "See the change in a sandbox before committing",
              },
              {
                step: "4",
                title: "Submit",
                desc: "Adopt the change or submit as a PR for everyone",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Simple pricing
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                period: "/month",
                features: ["5 AI generations / month", "Public PRs", "Community voting"],
              },
              {
                name: "Pro",
                price: "$19",
                period: "/month",
                features: ["Unlimited generations", "Private PRs", "Priority queue"],
                highlight: true,
              },
              {
                name: "Team",
                price: "$49",
                period: "/seat/month",
                features: ["Team collaboration", "Pain point analytics", "Slack integration"],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 ${
                  plan.highlight
                    ? "border-blue-600 ring-2 ring-blue-600"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  {plan.name}
                </h3>
                <p className="mt-4">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                    {plan.price}
                  </span>
                  <span className="text-zinc-500">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <span className="text-blue-600">+</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install CTA */}
      <section id="install" className="border-t border-zinc-100 bg-zinc-50 px-6 py-24 text-center dark:border-zinc-900 dark:bg-zinc-950">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Ready to fix your SaaS?
        </h2>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Install the Chrome extension and start modifying interfaces today.
        </p>
        <a
          href="#"
          className="mt-8 inline-block rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Add to Chrome
        </a>
      </section>
    </div>
  );
}
