/**
 * About page.
 */

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-10 py-20 text-center mb-16">
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">About UI-as-Code</h1>
          <p className="text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed">
            Empowering everyone to improve the software they use every day
          </p>
          <p className="mt-6 text-sm text-indigo-200 max-w-lg mx-auto">
            We believe that the people who use software every day should have a voice in how it looks, feels, and works. UI-as-Code bridges that gap with AI-powered diff generation and a community-driven PR process.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-12 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            To democratize UI improvement by giving every user — regardless of technical skill — the ability to describe what they want changed and see it happen. We combine natural language understanding with AI code generation to turn frustration into actionable improvements that SaaS vendors can review and adopt.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Vision</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            A world where every user&apos;s voice shapes the software they depend on. Where SaaS products evolve based on real user needs, not just internal roadmaps. Where the feedback loop between users and vendors is fast, transparent, and collaborative.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "👤", title: "User-First", desc: "We build for the people who use software every day, not just those who build it. Every feature starts with a real user pain point." },
            { icon: "🔓", title: "Open & Transparent", desc: "Open source diffs, transparent voting processes, public roadmaps, and community-driven prioritization." },
            { icon: "✨", title: "Quality by Design", desc: "AI-assisted but human-reviewed. Every change goes through sandbox preview and community voting before reaching vendors." },
          ].map((v) => (
            <div key={v.title} className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-3xl mb-3 block">{v.icon}</span>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{v.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="py-12 bg-gray-50 dark:bg-gray-800/50 -mx-4 px-4 sm:-mx-8 sm:px-8 rounded-2xl">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">How It Started</h2>
        <div className="max-w-2xl mx-auto space-y-6 text-gray-600 dark:text-gray-400">
          <p className="text-lg leading-relaxed">
            It started with <strong className="text-gray-900 dark:text-white">frustration</strong>. Our founder was using a popular project management tool daily, and kept running into the same UX issue: a button that was too small to click accurately, form fields that didn&apos;t validate properly, and a navigation menu that collapsed important options behind three clicks.
          </p>
          <p className="leading-relaxed">
            As someone who understood code but wasn&apos;t on the engineering team, there was no good channel to communicate these issues. Bug reports got lost in backlogs. Feature requests were deprioritized. The tool stayed frustrating for millions of users.
          </p>
          <p className="leading-relaxed">
            <strong className="text-gray-900 dark:text-white">UI-as-Code was born from this simple insight:</strong> What if any user could describe a UI improvement in plain language, get an AI-generated code change instantly, preview it live, and submit it as a pull request that the vendor could review and accept?
          </p>

          {/* Timeline */}
          <div className="flex justify-between items-center mt-10 relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
            {[
              { step: "💡", label: "Idea", date: "Jan 2026" },
              { step: "🛠️", label: "MVP", date: "Mar 2026" },
              { step: "🚀", label: "Public Beta", date: "May 2026" },
              { step: "🌟", label: "Growing", date: "Now" },
            ].map((t, i) => (
              <div key={t.label} className="text-center z-10 bg-gray-50 dark:bg-gray-800/50 px-2 py-2">
                <span className="text-2xl block">{t.step}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 block">{t.label}</span>
                <span className="text-[10px] text-gray-400 block">{t.date}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">The Team</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { name: "Alex Rivera", role: "CEO & Founder", initials: "AR", color: "from-indigo-500 to-purple-600", bio: "Former PM at HubSpot. Spent 7 years watching users struggle with tools they couldn't customize." },
            { name: "Sarah Chen", role: "CTO", initials: "SC", color: "from-emerald-500 to-teal-600", bio: "Ex-Google engineer. Built browser extensions at scale. Passionate about developer experience." },
            { name: "Marcus Okonkwo", role: "Lead Designer", initials: "MO", color: "from-pink-500 to-rose-600", bio: "Former designer at Figma and Linear. Believes great UX should be accessible to everyone." },
            { name: "Dr. Lisa Park", role: "Head of AI", initials: "LP", color: "from-amber-500 to-orange-600", bio: "PhD in NLP from Stanford. Previously led ML platform teams at Anthropic and OpenAI." },
          ].map((m) => (
            <div key={m.name} className="text-center group">
              <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-white text-xl font-bold shadow-lg group-hover:scale-105 transition-transform`}>
                {m.initials}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mt-3">{m.name}</h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{m.role}</p>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{m.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-12 bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-indigo-950/20 dark:via-gray-900 dark:to-purple-950/20 -mx-4 px-4 sm:-mx-8 sm:px-8 rounded-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "1,247+", label: "Active Users" },
            { value: "4,500+", label: "Frictions Reported" },
            { value: "1,800+", label: "PRs Submitted" },
            { value: "15+", label: "SaaS Products" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-black text-indigo-600">{s.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Ready to make a difference?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">Join thousands of users who are improving the software they use every day.</p>
        <a href="/getting-started" className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-lg shadow-lg shadow-indigo-200">
          Get Started for Free
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5M9 13l4-4m0 0l4 4" /></svg>
        </a>
      </section>
    </div>
  );
}
