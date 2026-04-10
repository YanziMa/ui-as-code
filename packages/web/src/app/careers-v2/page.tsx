"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Job {
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  minSalary: string;
  equity: string;
  emailSubject: string;
}

interface Value {
  icon: string;
  title: string;
  description: string;
}

interface Benefit {
  icon: string;
  title: string;
  description: string;
}

interface Step {
  step: number;
  label: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const JOBS: Job[] = [
  {
    title: "Senior Frontend Engineer",
    department: "Engineering",
    location: "Remote",
    type: "Full-time",
    description:
      "React, TypeScript, Next.js — Build the next generation of UI tooling that developers love.",
    minSalary: "$150k – $200k",
    equity: "0.05% – 0.15%",
    emailSubject: "Application: Senior Frontend Engineer",
  },
  {
    title: "AI/ML Engineer",
    department: "Engineering",
    location: "San Francisco",
    type: "Full-time",
    description:
      "LLMs, diff generation, fine-tuning — Push the boundaries of AI-powered UI generation.",
    minSalary: "$170k – $230k",
    equity: "0.08% – 0.20%",
    emailSubject: "Application: AI/ML Engineer",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Hybrid",
    type: "Full-time",
    description:
      "UI/UX, design systems, Figma — Shape the visual language of our product.",
    minSalary: "$130k – $175k",
    equity: "0.04% – 0.12%",
    emailSubject: "Application: Product Designer",
  },
  {
    title: "DevRel Engineer",
    department: "Marketing",
    location: "Remote",
    type: "Full-time",
    description:
      "Developer experience, SDKs, docs — Empower our community to build amazing things.",
    minSalary: "$140k – $190k",
    equity: "0.05% – 0.14%",
    emailSubject: "Application: DevRel Engineer",
  },
  {
    title: "Full-Stack Engineer",
    department: "Engineering",
    location: "Europe (Remote)",
    type: "Full-time",
    description:
      "Node.js, PostgreSQL, browser extensions — Ship end-to-end features across our stack.",
    minSalary: "$120k – $165k",
    equity: "0.04% – 0.13%",
    emailSubject: "Application: Full-Stack Engineer",
  },
  {
    title: "Growth Marketing Manager",
    department: "Marketing",
    location: "Remote",
    type: "Full-time",
    description:
      "Content, SEO, community — Drive awareness and adoption among developer audiences.",
    minSalary: "$110k – $155k",
    equity: "0.03% – 0.10%",
    emailSubject: "Application: Growth Marketing Manager",
  },
  {
    title: "Technical Writer",
    department: "Marketing",
    location: "Remote",
    type: "Contract",
    description:
      "Docs, tutorials, blog posts — Create world-class content that educates and inspires.",
    minSalary: "$90k – $130k",
    equity: "N/A",
    emailSubject: "Application: Technical Writer",
  },
  {
    title: "Customer Success Manager",
    department: "Product",
    location: "San Francisco",
    type: "Full-time",
    description:
      "Onboarding, support, retention — Ensure every customer achieves their goals with us.",
    minSalary: "$100k – $145k",
    equity: "0.03% – 0.09%",
    emailSubject: "Application: Customer Success Manager",
  },
];

const VALUES: Value[] = [
  {
    icon: "\u{1F4E1}",
    title: "User First",
    description: "We build for the people who use our product. Every decision starts and ends with user impact.",
  },
  {
    icon: "\u{1F680}",
    title: "Ship Fast",
    description: "Move fast, iterate constantly. We value progress over perfection and learn from every release.",
  },
  {
    icon: "\u{1F3AF}",
    title: "Own It",
    description: "Take responsibility, drive outcomes. We trust you to see things through from idea to impact.",
  },
  {
    icon: "\u2764\uFE0F",
    title: "Be Kind",
    description: "Empathy in every interaction. We support each other and treat everyone with respect.",
  },
  {
    icon: "\u{1F9E0}",
    title: "Stay Curious",
    description: "Never stop learning. We encourage exploration, experimentation, and asking \"why\".",
  },
  {
    icon: "\u{1F4AC}",
    title: "Transparency",
    description: "Open communication at all levels. We share context broadly and make decisions together.",
  },
];

const BENEFITS: Benefit[] = [
  { icon: "\u{1F4B0}", title: "Competitive Salary + Equity", description: "Above-market pay with meaningful ownership" },
  { icon: "\u{1F3D6}", title: "Unlimited PTO", description: "Take the time you need to recharge" },
  { icon: "\u{1FA7A}", title: "Health / Dental / Vision", description: "Premium coverage for you and dependents" },
  { icon: "\u{1F4DA}", title: "$2K Learning Budget", description: "Courses, books, conferences — your growth, funded" },
  { icon: "\u{1F3E0}", title: "Home Office Setup", description: "$1,500 stipend to build your ideal workspace" },
  { icon: "\u{1F930}", title: "Parental Leave", description: "16 weeks fully paid leave for all parents" },
  { icon: "\u2708\uFE0F", title: "Team Retreats (2x/year)", description: "All-expenses-paid gatherings around the world" },
  { icon: "\u{1F4BB}", title: "Conference Budget", description: "Attend and speak at industry events" },
];

const STEPS: Step[] = [
  { step: 1, label: "Screen", description: "A casual 30-min call to get to know each other and discuss the role." },
  { step: 2, label: "Technical Challenge", description: "A practical take-home exercise or live coding session relevant to the role." },
  { step: 3, label: "Team Fit", description: "Meet the team you would work with. We want mutual excitement." },
  { step: 4, label: "Reference Check", description: "Quick chat with people who can speak to your work and character." },
  { step: 5, label: "Offer!", description: "We move fast — expect an offer within 48 hours of a positive final decision." },
];

const DEPT_COLORS: Record<string, string> = {
  Engineering: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  Product: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Design: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Marketing: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        {value}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function ValueCard({ item }: { item: Value }) {
  return (
    <div className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-600">
      <span className="text-3xl mb-3 block">{item.icon}</span>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {item.title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        {item.description}
      </p>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <div className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/8 hover:border-indigo-300 dark:hover:border-indigo-600">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {job.title}
        </h3>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${DEPT_COLORS[job.department] ?? "bg-gray-100 text-gray-700"}`}
        >
          {job.department}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-grow">
        {job.description}
      </p>

      {/* Meta row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
          \u{1F4CD} {job.location}
        </span>
        <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
          \u{1F4CB} {job.type}
        </span>
      </div>

      {/* Compensation */}
      <div className="flex items-center gap-4 mb-5 text-sm text-gray-500 dark:text-gray-400">
        <span>\u{1F4B5} {job.minSalary}</span>
        <span>\u{1F3E2} {job.equity}</span>
      </div>

      {/* Apply */}
      <a
        href={`mailto:careers@company.com?subject=${encodeURIComponent(job.emailSubject)}&body=${encodeURIComponent(`Hi team,\n\nI'm interested in the ${job.title} position. Here's a bit about me:\n\n[Your background]\n\nLooking forward to hearing from you!\n`)}`}
        className="mt-auto inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 hover:shadow-md active:scale-[0.98]"
      >
        Apply Now \u2192
      </a>
    </div>
  );
}

function BenefitCard({ benefit }: { benefit: Benefit }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 transition-colors hover:border-indigo-300 dark:hover:border-indigo-600">
      <span className="text-2xl shrink-0 mt-0.5">{benefit.icon}</span>
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
          {benefit.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {benefit.description}
        </p>
      </div>
    </div>
  );
}

function InterviewStep({
  step,
  isActive,
}: {
  step: Step;
  isActive: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center relative">
      {/* Circle */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0 transition-all duration-300 ${
          isActive
            ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-110"
            : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
        }`}
      >
        {step.step}
      </div>
      {/* Label */}
      <h4
        className={`mt-3 font-semibold text-sm ${
          isActive
            ? "text-gray-900 dark:text-white"
            : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {step.label}
      </h4>
      <p
        className={`mt-1.5 text-xs max-w-[180px] leading-relaxed ${
          isActive
            ? "text-gray-500 dark:text-gray-400"
            : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {step.description}
      </p>
    </div>
  );
}

function LifeCard({
  emoji,
  title,
  items,
  gradient,
}: {
  emoji: string;
  title: string;
  items: string[];
  gradient: string;
}) {
  return (
    <div
      className={`rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 ${gradient} p-6 text-white`}
    >
      <span className="text-4xl block mb-3">{emoji}</span>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm opacity-90">
            <span className="mt-0.5 shrink-0">\u2713</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CareersPage() {
  const [activeStep, setActiveStep] = useState(1);

  const stats = [
    { value: "50+", label: "Team Members" },
    { value: "12", label: "Countries" },
    { value: "$8M", label: "Raised" },
    { value: "4.5/5", label: "Glassdoor" },
  ];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ==================== HERO ==================== */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50" />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-purple-200 dark:bg-purple-900/20 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 sm:pt-32 sm:pb-20 text-center">
          <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-6">
            \u{1F31F} We&apos;re hiring!
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
            Join Us in Building{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              the Future of UI
            </span>
          </h1>

          <p className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl text-gray-500 dark:text-gray-400 leading-relaxed">
            We&apos;re a mission-driven team building tools that empower millions of
            developers to create beautiful interfaces faster than ever. If you care
            about craft, collaboration, and making a real impact &mdash; we&apos;d love to meet
            you.
          </p>

          {/* Stats bar */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((s) => (
              <StatItem key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== VALUES ==================== */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Our Values
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              The principles that guide everything we do &mdash; from how we build product
              to how we treat each other.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <ValueCard key={v.title} item={v} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== OPEN POSITIONS ==================== */}
      <section id="positions" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Open Positions
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Find a role where you can do your best work. All roles include
              competitive compensation, equity, and flexible working arrangements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {JOBS.map((job) => (
              <JobCard key={job.title} job={job} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PERKS & BENEFITS ==================== */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Perks &amp; Benefits
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              We invest in our people. Here&apos;s what you can expect when you join the
              team.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b) => (
              <BenefitCard key={b.title} benefit={b} />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== INTERVIEW PROCESS ==================== */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Interview Process
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              A transparent, respectful process designed to let you shine. Hover over
              each step to learn more.
            </p>
          </div>

          {/* Interactive stepper */}
          <div className="max-w-4xl mx-auto">
            {/* Connector line */}
            <div className="relative flex justify-between items-start mb-2">
              <div className="absolute top-7 left-[7%] right-[7%] h-0.5 bg-gray-200 dark:bg-gray-700 -z-10" />

              {STEPS.map((s) => (
                <button
                  key={s.step}
                  onMouseEnter={() => setActiveStep(s.step)}
                  className="flex-1 cursor-pointer focus:outline-none"
                >
                  <InterviewStep step={s} isActive={activeStep === s.step} />
                </button>
              ))}
            </div>

            {/* Detail panel */}
            <div className="mt-8 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 p-6 text-center">
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 text-lg">
                Step {STEPS[activeStep - 1].step}: {STEPS[activeStep - 1].label}
              </h4>
              <p className="mt-2 text-sm text-indigo-700/80 dark:text-indigo-300/80 max-w-lg mx-auto">
                {STEPS[activeStep - 1].description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== LIFE AT COMPANY ==================== */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Life at the Company
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              A glimpse into what day-to-day life looks like when you&apos;re part of our
              team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LifeCard
              emoji="\u2699\uFE0F"
              title="Engineering"
              items={[
                "Monthly hackathons with prizes",
                "Weekly tech talks &amp; brown bags",
                "Pair programming sessions",
                "Open-source contribution time",
              ]}
              gradient="bg-gradient-to-br from-indigo-600 to-indigo-800"
            />
            <LifeCard
              emoji="\u{1F3AE}"
              title="Culture"
              items={[
                "Weekly game nights (online &amp; IRL)",
                "Book clubs &amp; discussion groups",
                "Random coffee chats across teams",
                "Slack channels for every interest",
              ]}
              gradient="bg-gradient-to-br from-purple-600 to-pink-600"
            />
            <LifeCard
              emoji="\u{1F331}"
              title="Growth"
              items={[
                "Quarterly offsites for team bonding",
                "Annual company retreat (global!)",
                "$100/month wellness stipend",
                "Manager 1-on-1s every two weeks",
              ]}
              gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
            />
          </div>
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-indigo-200 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-40" />
          <div className="absolute top-0 right-1/3 w-[400px] h-[400px] bg-purple-200 dark:bg-purple-900/20 rounded-full blur-3xl opacity-40" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Ready to Make an Impact?
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Whether you see a role above or have something else in mind, we&apos;d love
            to hear from you. Great talent finds its place.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#positions"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98]"
            >
              See All Positions \u2192
            </a>
            <a
              href="mailto:careers@company.com?subject=General%20Inquiry&body=Hi%20team%2C%0A%0AI'm%20interested%20in%20joining%20the%20team.%20Here's%20a%20bit%20about%20me%3A%0A%0A%5BYour%20background%5D%0A%0ALooking%20forward%20to%20hearing%20from%20you!"
              className="inline-flex items-center rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-8 py-3.5 text-base font-semibold text-gray-700 dark:text-gray-200 transition-all duration-200 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-[0.98]"
            >
              Don&apos;t See Your Role? Drop Us a Line
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
