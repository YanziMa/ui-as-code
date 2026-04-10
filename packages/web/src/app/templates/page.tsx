"use client";

import { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Template {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  techStack: string[];
  stars: number;
  forks: number;
  downloads: number;
  gradient: string;
  icon: string;
  featured: boolean;
}

type TemplateCategory =
  | "SaaS Dashboards"
  | "E-commerce"
  | "Marketing Pages"
  | "Documentation"
  | "Admin Panels"
  | "Landing Pages"
  | "Portfolios"
  | "Blogs";

type SortOption = "newest" | "popular" | "stars" | "updated";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const CATEGORIES: TemplateCategory[] = [
  "SaaS Dashboards",
  "E-commerce",
  "Marketing Pages",
  "Documentation",
  "Admin Panels",
  "Landing Pages",
  "Portfolios",
  "Blogs",
];

const TECH_STACK_OPTIONS = [
  "React",
  "Next.js",
  "Tailwind CSS",
  "TypeScript",
  "Prisma",
  "tRPC",
  "MDX",
  "shadcn/ui",
  "Framer Motion",
  "Zustand",
];

const TEMPLATES: Template[] = [
  {
    id: "saas-analytics",
    title: "SaaS Analytics Dashboard",
    description:
      "A full-featured analytics dashboard with charts, KPI cards, real-time data streams, and team management. Built for SaaS products that need to surface metrics to their users.",
    category: "SaaS Dashboards",
    techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "shadcn/ui"],
    stars: 4820,
    forks: 612,
    downloads: 28400,
    gradient: "from-violet-600 via-purple-500 to-fuchsia-400",
    icon: "\u{1F4CA}",
    featured: true,
  },
  {
    id: "saas-billing",
    title: "Subscription Billing Portal",
    description:
      "Complete billing and subscription management UI with plan comparison, usage meters, invoice history, and payment method settings.",
    category: "SaaS Dashboards",
    techStack: ["React", "Next.js", "Tailwind CSS", "Prisma", "tRPC"],
    stars: 3150,
    forks: 398,
    downloads: 19200,
    gradient: "from-emerald-600 via-teal-500 to-cyan-400",
    icon: "\u{1F4B0}",
    featured: false,
  },
  {
    id: "saas-team",
    title: "Team Collaboration Hub",
    description:
      "Team workspace with member directory, role-based access controls, activity feed, and notification center for multi-tenant SaaS apps.",
    category: "SaaS Dashboards",
    techStack: ["Next.js", "React", "TypeScript", "Zustand", "Tailwind CSS"],
    stars: 2780,
    forks: 341,
    downloads: 15800,
    gradient: "from-blue-600 via-indigo-500 to-violet-400",
    icon: "\u{1F465}",
    featured: false,
  },
  {
    id: "ecommerce-product",
    title: "E-commerce Product Page",
    description:
      "Rich product detail page with image gallery, variant selector, reviews section, related products carousel, and add-to-cart flow.",
    category: "E-commerce",
    techStack: ["React", "Next.js", "Tailwind CSS", "Framer Motion"],
    stars: 5100,
    forks: 720,
    downloads: 35200,
    gradient: "from-orange-600 via-amber-500 to-yellow-400",
    icon: "\u{1F6D2}",
    featured: true,
  },
  {
    id: "ecommerce-checkout",
    title: "Multi-step Checkout Flow",
    description:
      "Optimized checkout experience with address form, shipping options, payment integration, order summary sidebar, and progress indicator.",
    category: "E-commerce",
    techStack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "shadcn/ui"],
    stars: 3890,
    forks: 485,
    downloads: 24600,
    gradient: "from-rose-600 via-pink-500 to-red-400",
    icon: "\u{1F6CB}",
    featured: false,
  },
  {
    id: "ecommerce-storefront",
    title: "Modern Storefront",
    description:
      "Full e-commerce storefront with product grid, search & filters, wishlist, cart drawer, and responsive navigation.",
    category: "E-commerce",
    techStack: ["React", "Next.js", "Prisma", "Tailwind CSS", "tRPC"],
    stars: 4320,
    forks: 567,
    downloads: 29800,
    gradient: "from-sky-600 via-blue-500 to-indigo-400",
    icon: "\u{1F3EA}",
    featured: true,
  },
  {
    id: "marketing-launch",
    title: "Product Launch Page",
    description:
      "High-converting landing page for product launches with hero, feature showcase, testimonials, pricing table, and email capture.",
    category: "Marketing Pages",
    techStack: ["Next.js", "React", "Tailwind CSS", "Framer Motion"],
    stars: 3650,
    forks: 442,
    downloads: 21300,
    gradient: "from-fuchsia-600 via-pink-500 to-rose-400",
    icon: "\u{1F680}",
    featured: false,
  },
  {
    id: "marketing-pricing",
    title: "Pricing Page Suite",
    description:
      "Beautiful pricing page with toggle between monthly/annual, feature comparison matrix, FAQ accordion, and enterprise CTA.",
    category: "Marketing Pages",
    techStack: ["React", "Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui"],
    stars: 2940,
    forks: 367,
    downloads: 17400,
    gradient: "from-lime-600 via-green-500 to-emerald-400",
    icon: "\u{1F4B2}",
    featured: false,
  },
  {
    id: "docs-site",
    title: "Documentation Site",
    description:
      "Developer docs layout with sidebar navigation, search, code block syntax highlighting, table of contents, and version switcher.",
    category: "Documentation",
    techStack: ["Next.js", "React", "MDX", "Tailwind CSS", "TypeScript"],
    stars: 5890,
    forks: 834,
    downloads: 42100,
    gradient: "from-slate-700 via-zinc-600 to-neutral-500",
    icon: "\u{1F4D6}",
    featured: true,
  },
  {
    id: "docs-api-ref",
    title: "API Reference Explorer",
    description:
      "Interactive API reference with endpoint listing, request/response examples, try-it-out panel, and authentication helpers.",
    category: "Documentation",
    techStack: ["React", "Next.js", "TypeScript", "Tailwind CSS", "tRPC"],
    stars: 2460,
    forks: 298,
    downloads: 14200,
    gradient: "from-cyan-600 via-teal-500 to-green-400",
    icon: "\u{1F527}",
    featured: false,
  },
  {
    id: "admin-crud",
    title: "Admin CRUD Dashboard",
    description:
      "Generic admin panel with data tables, create/edit modals, bulk actions, pagination, and role-based view switching.",
    category: "Admin Panels",
    techStack: ["Next.js", "React", "Prisma", "Tailwind CSS", "shadcn/ui"],
    stars: 4560,
    forks: 591,
    downloads: 31400,
    gradient: "from-gray-700 via-slate-600 to-zinc-500",
    icon: "\u{1F5C4}",
    featured: false,
  },
  {
    id: "admin-settings",
    title: "Settings & Configuration Panel",
    description:
      "Comprehensive settings UI organized into tabs: general, security, integrations, notifications, and billing preferences.",
    category: "Admin Panels",
    techStack: ["React", "Next.js", "TypeScript", "Zustand", "Tailwind CSS"],
    stars: 2180,
    forks: 267,
    downloads: 12100,
    gradient: "from-stone-700 via-neutral-600 to-gray-500",
    icon: "\u{2699}\uFE0F",
    featured: false,
  },
  {
    id: "landing-agency",
    title: "Creative Agency Landing",
    description:
      "Bold agency landing page with animated sections, portfolio grid, client logos marquee, contact form, and case study previews.",
    category: "Landing Pages",
    techStack: ["Next.js", "React", "Framer Motion", "Tailwind CSS"],
    stars: 3370,
    forks: 415,
    download: 19800,
    gradient: "from-red-600 via-orange-500 to-amber-400",
    icon: "\u{1F3A8}",
    featured: false,
  },
  {
    id: "landing-saas",
    title: "SaaS Landing Page",
    description:
      "Clean and minimal SaaS landing with feature highlights, social proof bar, integrations showcase, and conversion-focused CTA.",
    category: "Landing Pages",
    techStack: ["React", "Next.js", "Tailwind CSS", "TypeScript"],
    stars: 4010,
    forks: 503,
    downloads: 25700,
    gradient: "from-indigo-600 via-blue-500 to-cyan-400",
    icon: "\u{1F310}",
    featured: false,
  },
  {
    id: "portfolio-dev",
    title: "Developer Portfolio",
    description:
      "Personal developer portfolio with project cards, skill tags, experience timeline, blog preview, and dark/light theme toggle.",
    category: "Portfolios",
    techStack: ["Next.js", "React", "Tailwind CSS", "MDX", "TypeScript"],
    stars: 3680,
    forks: 476,
    downloads: 22400,
    gradient: "from-violet-700 via-purple-600 to-indigo-500",
    icon: "\u{1F4BB}",
    featured: false,
  },
  {
    id: "portfolio-designer",
    title: "Designer Showcase",
    description:
      "Visual designer portfolio with masonry gallery, project detail lightbox, about section, and contact form with validation.",
    category: "Portfolios",
    techStack: ["React", "Next.js", "Framer Motion", "Tailwind CSS"],
    stars: 2540,
    forks: 312,
    downloads: 15600,
    gradient: "from-pink-600 via-rose-500 to-orange-400",
    icon: "\u{1F3A8}",
    featured: false,
  },
  {
    id: "blog-mdx",
    title: "Blog with MDX",
    description:
      "Full-featured blog engine supporting MDX posts, syntax highlighting, table of contents, reading time estimate, and RSS feed.",
    category: "Blogs",
    techStack: ["Next.js", "React", "MDX", "Tailwind CSS", "TypeScript"],
    stars: 5340,
    forks: 689,
    downloads: 37600,
    gradient: "from-amber-600 via-yellow-500 to-lime-400",
    icon: "\u{1F4DD}",
    featured: false,
  },
  {
    id: "blog-newsletter",
    title: "Newsletter & Publication",
    description:
      "Publication-style blog with author profiles, subscription widget, curated topic pages, and email digest integration.",
    category: "Blogs",
    techStack: ["React", "Next.js", "Prisma", "Tailwind CSS", "tRPC"],
    stars: 1920,
    forks: 234,
    downloads: 10800,
    gradient: "from-green-600 via-emerald-500 to-teal-400",
    icon: "\u{270F}\uFE0F}",
    featured: false,
  },
];

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  popular: "Most Popular",
  stars: "Most Stars",
  updated: "Recently Updated",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function getCategoryColor(cat: TemplateCategory): string {
  const map: Record<TemplateCategory, string> = {
    "SaaS Dashboards": "bg-violet-500/15 text-violet-400 border-violet-500/30",
    E-commerce: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    "Marketing Pages": "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
    Documentation: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    "Admin Panels": "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    "Landing Pages": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    Portfolios: "bg-pink-500/15 text-pink-400 border-pink-500/30",
    Blogs: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  };
  return map[cat];
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative w-full max-w-xl">
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-text)]/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        placeholder="Search templates..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-12 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text)]/35 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-colors"
      />
    </div>
  );
}

function CategoryPills({
  active,
  onSelect,
}: {
  active: TemplateCategory | "All";
  onSelect: (c: TemplateCategory | "All") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect("All")}
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all border ${
          active === "All"
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
            : "border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:border-[var(--color-text)]/30"
        }`}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all border ${
            active === cat
              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
              : "border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:border-[var(--color-text)]/30"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

function TechFilter({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (tech: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--color-text)]/60 mr-1">
        Tech:
      </span>
      {TECH_STACK_OPTIONS.map((tech) => (
        <button
          key={tech}
          onClick={() => onToggle(tech)}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-all border cursor-pointer ${
            selected.includes(tech)
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
              : "border-[var(--color-border)] bg-transparent text-[var(--color-text)]/60 hover:text-[var(--color-text)] hover:border-[var(--color-text)]/25"
          }`}
        >
          {tech}
        </button>
      ))}
    </div>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (v: SortOption) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-medium text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 cursor-pointer"
    >
      {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
        <option key={key} value={key}>
          {SORT_LABELS[key]}
        </option>
      ))}
    </select>
  );
}

function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 hover:border-[var(--color-primary)]/30">
      {/* Preview thumbnail */}
      <div
        className={`relative flex h-48 items-center justify-center bg-gradient-to-br ${template.gradient}`}
      >
        <span className="text-5xl">{template.icon}</span>
        {template.featured && (
          <span className="absolute top-3 right-3 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-[11px] font-semibold text-white">
            Featured
          </span>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg transition-transform hover:scale-105 cursor-pointer">
            Use Template
          </button>
          <button className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-transform hover:scale-105 hover:bg-white/20 cursor-pointer">
            Preview
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={`inline-block rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${getCategoryColor(
              template.category
            )}`}
          >
            {template.category}
          </span>
        </div>

        <h3 className="mb-1.5 text-base font-semibold text-[var(--color-text)]">
          {template.title}
        </h3>
        <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-[var(--color-text)]/55">
          {template.description}
        </p>

        {/* Tech stack tags */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {template.techStack.map((tech) => (
            <span
              key={tech}
              className="rounded-md bg-[var(--color-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text)]/60 border border-[var(--color-border)]/50"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Stats + Actions */}
        <div className="mt-auto flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-text)]/45">
            <span className="flex items-center gap-1" title="Stars">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {formatCount(template.stars)}
            </span>
            <span className="flex items-center gap-1" title="Forks">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v18M16 3v18M8 12h8M8 7h5M8 17h5" />
              </svg>
              {formatCount(template.forks)}
            </span>
            <span className="flex items-center gap-1" title="Downloads">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {formatCount(template.downloads)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer">
              Use
            </button>
            <button className="text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer">
              Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedCarousel({ templates }: { templates: Template[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="mb-16">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">
            Featured Templates
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text)]/50">
            Hand-picked by our team for quality and popularity
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {templates.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                i === activeIndex
                  ? "w-6 bg-[var(--color-primary)]"
                  : "w-2 bg-[var(--color-border)]"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {templates.map((tpl, i) => (
          <div
            key={tpl.id}
            className={`${i === activeIndex ? "ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-bg)]" : ""} transition-all duration-300`}
            onMouseEnter={() => setActiveIndex(i)}
          >
            <TemplateCard template={tpl} />
          </div>
        ))}
      </div>

      {/* Mobile dots */}
      <div className="mt-6 flex sm:hidden items-center justify-center gap-2">
        {templates.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              i === activeIndex
                ? "w-6 bg-[var(--color-primary)]"
                : "w-2 bg-[var(--color-border)]"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] py-20 text-center">
      <svg
        className="mb-4 h-16 w-16 text-[var(--color-text)]/20"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
        No templates found
      </h3>
      <p className="mb-6 max-w-sm text-sm text-[var(--color-text)]/45">
        Try adjusting your search query or filters to find what you are looking
        for.
      </p>
      <button
        onClick={onReset}
        className="rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
      >
        Clear all filters
      </button>
    </div>
  );
}

function BuildCTA() {
  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-bg)] p-10 text-center md:p-16">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-2xl">
        \u{1F680}
      </div>
      <h2 className="mb-3 text-3xl font-bold text-[var(--color-text)]">
        Build your own
      </h2>
      <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-[var(--color-text)]/55">
        Can not find the perfect template? Start from scratch with our powerful
        visual editor. Drag, drop, and ship production-ready UI in minutes.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button className="w-full rounded-xl bg-[var(--color-primary)] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--color-primary)]/20 transition-all hover:brightness-110 sm:w-auto cursor-pointer">
          Start building free
        </button>
        <button className="w-full rounded-xl border border-[var(--color-border)] px-8 py-3 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-text)]/30 sm:w-auto cursor-pointer">
          View documentation
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function TemplatesPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    TemplateCategory | "All"
  >("All");
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("popular");

  /* ---- Derived state ---- */
  const featuredTemplates = useMemo(
    () => TEMPLATES.filter((t) => t.featured),
    []
  );

  const filteredTemplates = useMemo(() => {
    let result = [...TEMPLATES];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.techStack.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (activeCategory !== "All") {
      result = result.filter((t) => t.category === activeCategory);
    }

    // Tech stack filter
    if (selectedTech.length > 0) {
      result = result.filter((t) =>
        selectedTech.every((st) => t.techStack.includes(st))
      );
    }

    // Sort
    switch (sort) {
      case "newest":
        // Simulate: reverse ID order as a proxy for newest
        result.reverse();
        break;
      case "popular":
        result.sort((a, b) => b.downloads - a.downloads);
        break;
      case "stars":
        result.sort((a, b) => b.stars - a.stars);
        break;
      case "updated":
        // Simulate: sort by fork count as proxy for recent activity
        result.sort((a, b) => b.forks - a.forks);
        break;
    }

    return result;
  }, [search, activeCategory, selectedTech, sort]);

  /* ---- Handlers ---- */
  const toggleTech = (tech: string) => {
    setSelectedTech((prev) =>
      prev.includes(tech)
        ? prev.filter((t) => t !== tech)
        : [...prev, tech]
    );
  };

  const resetFilters = () => {
    setSearch("");
    setActiveCategory("All");
    setSelectedTech([]);
    setSort("popular");
  };

  /* ---- Render ---- */
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* ===== Hero Section ===== */}
      <section className="relative overflow-hidden border-b border-[var(--color-border)] pb-16 pt-20 md:pt-28">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[var(--color-primary)]/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[var(--color-primary)]/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-4 inline-block rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-1 text-xs font-semibold text-[var(--color-primary)]">
              \u{1F4E6} 18+ Production-Ready Templates
            </span>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-5xl lg:text-6xl">
              Start with a{" "}
              <span className="bg-gradient-to-r from-[var(--color-primary)] to-purple-400 bg-clip-text text-transparent">
                template
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-[var(--color-text)]/55 sm:text-lg">
              Skip the blank canvas. Choose from a curated collection of
              starter kits built with modern best practices, then customize
              everything in our visual editor.
            </p>

            {/* Search bar */}
            <SearchBar value={search} onChange={setSearch} />

            {/* Category pills */}
            <div className="mt-6 flex justify-center">
              <CategoryPills
                active={activeCategory}
                onSelect={setActiveCategory}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== Content ===== */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Featured carousel */}
        {!search && activeCategory === "All" && selectedTech.length === 0 && (
          <FeaturedCarousel templates={featuredTemplates} />
        )}

        {/* Toolbar: tech filter + sort */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TechFilter selected={selectedTech} onToggle={toggleTech} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text)]/40">
              {filteredTemplates.length} template
              {filteredTemplates.length !== 1 ? "s" : ""}
            </span>
            <SortSelect value={sort} onChange={setSort} />
          </div>
        </div>

        {/* Grid or empty state */}
        {filteredTemplates.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTemplates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} />
            ))}
          </div>
        ) : (
          <EmptyState onReset={resetFilters} />
        )}

        {/* CTA Section */}
        <div className="mt-20">
          <BuildCTA />
        </div>
      </div>

      {/* Footer spacer */}
      <div className="h-16" />
    </main>
  );
}
