/**
 * Careers / Jobs page.
 */

export default function CareersPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium mb-4">
          We're hiring!
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">Join the Team</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Help us build the future of user-driven software improvement</p>
      </div>

      {/* Culture */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-8">Our Culture</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "🏠", title: "Remote-First", desc: "Work from anywhere in the world. We're distributed across 6 time zones and communicate asynchronously." },
            { icon: "✍️", title: "Write Over Meetings", desc: "We value deep work over constant meetings. Most communication happens via async written updates." },
            { icon: "📚", title: "Continuous Learning", desc: "$2,000/year learning budget for courses, books, conferences, and certifications." },
            { icon: "⚖️", title: "Work-Life Balance", desc: "Flexible hours, unlimited PTO, and genuine respect for personal time." },
          ].map((v) => (
            <div key={v.title} className="p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <span className="text-2xl block mb-2">{v.icon}</span>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">{v.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open Positions */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-8">Open Positions</h2>
        <div className="space-y-4">
          {[
            {
              title: "Senior Frontend Engineer",
              type: "Engineering",
              location: "Remote (Global)",
              desc: ["Build the web dashboard with Next.js 16 + React 19", "Design component library with Tailwind CSS v4", "Optimize performance with Web Vitals focus", "3+ years React/Next.js experience required"],
            },
            {
              title: "AI/ML Engineer — Diff Generation",
              type: "Engineering",
              location: "Remote (US/EU preferred)",
              desc: ["Improve our AI diff generation pipeline using Claude API", "Work on prompt engineering and output quality", "Implement evaluation metrics and A/B testing frameworks", "Experience with LLMs and NLP required"],
            },
            {
              title: "Browser Extension Developer",
              type: "Engineering",
              location: "Remote (Global)",
              desc: ["Build Chrome extension with Plasmo framework", "Implement DOM inspector with React fiber detection", "Work on screenshot capture and sandbox preview", "Manifest V3 extension experience preferred"],
            },
            {
              title: "Product Designer",
              type: "Design",
              location: "Remote or SF Bay Area",
              desc: ["Design the UI-as-Code product interface", "Create design system tokens and components", "Conduct user research and usability testing", "Figma proficiency required"],
            },
            {
              title: "DevOps Engineer",
              type: "Operations",
              location: "Remote (US timezones)",
              desc: ["Manage Vercel deployment pipelines and CI/CD", "Set up monitoring, alerting, and observability", "Infrastructure as code with Terraform/Pulumi", "AWS/GCP experience required"],
            },
            {
              title: "Community Manager",
              type: "Community",
              location: "Remote (Part-time)",
              desc: ["Grow and engage our Discord community of 1,200+ members", "Organize events, AMAs, and contributor spotlights", "Create content: tutorials, blog posts, case studies", "Previous community management experience preferred"],
            },
          ].map((job) => (
            <div key={job.title} className="group p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{job.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      job.type === "Engineering" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      job.type === "Design" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}>{job.type}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 111-11.314 0z" /></svg>
                      {job.location}
                    </span>
                  </div>
                </div>
                <a href="mailto:careers@uiascode.dev" className="shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-700">
                  Apply
                </a>
              </div>
              <ul className="space-y-1">
                {job.desc.map((d) => (
                  <li key={d} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">·</span> {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Perks */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-8">Perks & Benefits</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { icon: "💰", title: "Competitive Salary", sub: "+ meaningful equity" },
            { icon: "🏥", title: "Health Insurance", sub: "Dental, vision included (US)" },
            { icon: "📚", title: "Learning Budget", sub: "$2,000 / year" },
            { icon: "🖥️", title: "Home Office", sub: "$1,000 setup budget" },
            { icon: "🏖️", title: "Unlimited PTO", sub: "No accrual caps" },
            { icon: "✈️", title: "Team Retreats", sub: "Twice yearly, global" },
            { icon: "💻", title: "Latest Gear", sub: "MacBook Pro provided" },
            { icon: "🎮", title: "Conference Budget", sub: "1 conference / year" },
          ].map((perk) => (
            <div key={perk.title} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 text-center">
              <span className="text-2xl block mb-1">{perk.icon}</span>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{perk.title}</p>
              <p className="text-xs text-gray-500">{perk.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* General Application */}
      <section className="text-center p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/30">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Don't see your fit?</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">We're always looking for talented people. Send us an open application.</p>
        <a href="mailto:careers@uiascode.dev" className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-xl font-medium text-sm border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 transition-colors">
          careers@uiascode.dev
        </a>
      </section>
    </div>
  );
}
