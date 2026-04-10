import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | UI-as-Code",
  description:
    "Learn how UI-as-Code collects, uses, and protects your personal information. Effective April 10, 2026.",
};

/* ------------------------------------------------------------------ */
/*  Data structures (kept here so the page stays a Server Component)   */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Your Information" },
  { id: "sharing", label: "Information Sharing & Disclosure" },
  { id: "storage-security", label: "Data Storage & Security" },
  { id: "your-rights", label: "Your Rights (GDPR/CCPA)" },
  { id: "cookies", label: "Cookies & Tracking" },
  { id: "third-party", label: "Third-Party Services" },
  { id: "childrens-privacy", label: "Children's Privacy" },
  { id: "international", label: "International Transfers" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Us" },
] as const;

const DATA_COLLECTION_ROWS = [
  {
    category: "Account Information",
    examples: "Email address, display name, avatar image",
    collectedWhen: "When you register for an account or update your profile",
    necessity: "Required for account creation",
  },
  {
    category: "Usage Data",
    examples: "Pages visited, features used, time spent, session duration",
    collectedWhen: "While you interact with the platform",
    necessity: "Anonymized; used for product improvement",
  },
  {
    category: "Content You Create",
    examples: "Diffs, screenshots, descriptions, project configurations",
    collectedWhen: "When you create, save, or share content on the platform",
    necessity: "Required to provide core service functionality",
  },
  {
    category: "Technical Information",
    examples: "IP address, browser type & version, operating system, device identifier",
    collectedWhen: "Automatically on every request",
    necessity: "Essential for security and service delivery",
  },
  {
    category: "Communication Data",
    examples: "Support emails, feedback submissions, survey responses",
    collectedWhen: "When you contact us or participate in feedback programs",
    necessity: "Voluntary; required only if you initiate contact",
  },
] as const;

const USE_CASES = [
  {
    purpose: "Provide and maintain our service",
    description:
      "We use your information to operate, deliver, and improve the UI-as-Code platform, including processing your diffs, storing your projects, and enabling collaboration features.",
  },
  {
    purpose: "Improve and develop new features",
    description:
      "Aggregated and anonymized usage data helps us understand how users interact with the product so we can prioritize features, fix bugs, and enhance user experience.",
  },
  {
    purpose: "Communicate with you about updates",
    description:
      "We may send you service-related notices, security alerts, and (with your consent) promotional communications about new features or offers.",
  },
  {
    purpose: "Protect against fraud and abuse",
    description:
      "We analyze patterns and signals to detect suspicious activity, prevent unauthorized access, and enforce our Terms of Service.",
  },
  {
    purpose: "Comply with legal obligations",
    description:
      "We process your data when necessary to satisfy applicable laws, regulations, legal processes, or governmental requests.",
  },
] as const;

const THIRD_PARTY_SERVICES = [
  {
    name: "Google Analytics",
    purpose: "Anonymized usage statistics and behavioral analytics",
    dataShared: "Anonymized page views, session duration, device category",
    link: "https://policies.google.com/privacy",
  },
  {
    name: "Cloudflare",
    purpose: "Content delivery network (CDN), DDoS protection, and web application firewall",
    dataShared: "IP address, request headers, TLS fingerprints",
    link: "https://www.cloudflare.com/privacypolicy/",
  },
  {
    name: "Supabase",
    purpose: "Database hosting, authentication, and real-time data synchronization",
    dataShared: "Account credentials (hashed), user-generated content, metadata",
    link: "https://supabase.com/privacy",
  },
  {
    name: "Stripe",
    purpose: "Secure payment processing for subscription billing",
    dataShared: "Billing name, email, payment method tokens (stored by Stripe)",
    link: "https://stripe.com/privacy",
  },
] as const;

const RIGHTS = [
  {
    right: "Right of Access",
    summary: "Request a copy of all personal data we hold about you in a portable format.",
  },
  {
    right: "Right to Rectification",
    summary: "Correct inaccurate or incomplete personal data at any time.",
  },
  {
    right: "Right to Erasure ('Right to be Forgotten')",
    summary: "Request deletion of your account and all associated personal data, subject to legal retention requirements.",
  },
  {
    right: "Right to Data Portability",
    summary: "Export your data in a structured, machine-readable format (JSON, CSV).",
  },
  {
    right: "Right to Object",
    summary: "Opt out of processing based on legitimate interests or direct marketing.",
  },
  {
    right: "Right to Restrict Processing",
    summary: "Limit how we process your data while a dispute or verification is underway.",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  SVG icon helpers (inline to avoid client-side dependencies)        */
/* ------------------------------------------------------------------ */

function ShieldIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="text-2xl font-bold text-gray-900 dark:text-white scroll-mt-28">
      {children}
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ---- Header ---- */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
                <ShieldIcon className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  Privacy Policy
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Effective: April 10, 2026 &middot; Version 2.0
                </p>
              </div>
            </div>
            <span className="inline-flex items-center self-start sm:self-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
              In Force
            </span>
          </div>
        </div>
      </header>

      {/* ---- Main layout: TOC sidebar + content ---- */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="flex gap-10 lg:gap-14">
          {/* Table of Contents — sticky sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <nav
              aria-label="Table of contents"
              className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                On this page
              </p>
              <ol className="space-y-1">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors py-1.5 border-l-2 border-transparent hover:border-blue-500 pl-3 -ml-px"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* Article body */}
          <article className="min-w-0 flex-1 space-y-10">
            {/* ---------- INTRODUCTION ---------- */}
            <section id="introduction" aria-labelledby="heading-intro">
              <Card>
                <SectionHeading id="heading-intro">Introduction</SectionHeading>
                <div className="mt-5 space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>
                    <strong className="font-semibold text-gray-900 dark:text-white">
                      UI-as-Code
                    </strong>{" "}
                    (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting
                    and respecting your privacy. This Privacy Policy explains how we collect, use,
 disclose, store, and safeguard your personal information when you visit our website
                    at{" "}
                    <strong className="font-medium">uiascode.dev</strong> and use the UI-as-Code
                    software platform (&ldquo;the Service&rdquo;).
                  </p>
                  <p>
                    By accessing or using the Service, you acknowledge that you have read, understood,
                    and agree to the collection and use of information in accordance with this policy.
                    If you do not agree with the terms of this Privacy Policy, please do not access or
                    use the Service.
                  </p>
                  <p>
                    This policy applies to all visitors, users, and others who access or use the
                    Service. References to &ldquo;personal information&rdquo; or &ldquo;personal
                    data&rdquo; mean any information that identifies or can reasonably be used to
                    identify an individual.
                  </p>
                </div>
              </Card>
            </section>

            {/* ---------- INFORMATION WE COLLECT ---------- */}
            <section id="information-we-collect" aria-labelledby="heading-collect">
              <Card>
                <SectionHeading id="heading-collect">Information We Collect</SectionHeading>
                <p className="mt-3 text-gray-600 dark:text-gray-400">
                  The table below summarizes the categories of information we collect, specific
                  examples, when it is collected, and whether it is required.
                </p>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 rounded-tl-lg">
                          Category
                        </th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Examples
                        </th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Collected When
                        </th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 rounded-tr-lg">
                          Necessity
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {DATA_COLLECTION_ROWS.map((row, idx) => (
                        <tr
                          key={row.category}
                          className={
                            idx % 2 === 0
                              ? "bg-white dark:bg-transparent"
                              : "bg-gray-50/50 dark:bg-gray-700/20"
                          }
                        >
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white align-top border-b border-gray-100 dark:border-gray-700/50">
                            {row.category}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 align-top border-b border-gray-100 dark:border-gray-700/50">
                            {row.examples}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 align-top border-b border-gray-100 dark:border-gray-700/50">
                            {row.collectedWhen}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 align-top border-b border-gray-100 dark:border-gray-700/50">
                            {row.necessity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>

            {/* ---------- HOW WE USE ---------- */}
            <section id="how-we-use" aria-labelledby="heading-use">
              <Card>
                <SectionHeading id="heading-use">How We Use Your Information</SectionHeading>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  {USE_CASES.map((uc) => (
                    <div
                      key={uc.purpose}
                      className="rounded-lg border border-gray-100 dark:border-gray-700/60 p-5 bg-gray-50/50 dark:bg-gray-750/30"
                    >
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                        {uc.purpose}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {uc.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* ---------- SHARING & DISCLOSURE ---------- */}
            <section id="sharing" aria-labelledby="heading-sharing">
              <Card>
                <SectionHeading id="heading-sharing">
                  Information Sharing &amp; Disclosure
                </SectionHeading>
                <div className="mt-5 space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      SaaS Vendor Partnerships
                    </h3>
                    <p>
                      With your explicit consent, we may share the diffs and related metadata you
                      submit with integrated SaaS vendors (e.g., GitHub, GitLab, Figma) solely for the
                      purpose of applying those changes to your connected repositories or design files.
                      We never share your data with SaaS partners without your affirmative action.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      Service Providers
                    </h3>
                    <p>
                      We engage third-party companies and individuals to facilitate our Service, to
                      provide the Service on our behalf, to perform Service-related services, or to
                      assist us in analyzing how our Service is used. These third parties have access
                      to your Personal Data only to perform tasks on our behalf and are obligated not
                      to disclose or use it for any other purpose. Our current service providers
                      include:
                    </p>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <li>
                        <strong>Supabase</strong> &mdash; database hosting and authentication
                      </li>
                      <li>
                        <strong>Vercel</strong> &mdash; application deployment and edge network
                      </li>
                      <li>
                        <strong>Cloudflare</strong> &mdash; CDN, DNS, and DDoS mitigation
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      Legal Requirements
                    </h3>
                    <p>
                      We may disclose your information where we are legally required to do so in order
                      to comply with any applicable law, regulation, legal process, or governmental
                      request, including to meet national security or law enforcement requirements.
                    </p>
                  </div>

                  <div className="rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                      We never sell, rent, or trade your personal data to third parties for marketing
                      or advertising purposes.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* ---------- STORAGE & SECURITY ---------- */}
            <section id="storage-security" aria-labelledby="heading-security">
              <Card>
                <SectionHeading id="heading-security">Data Storage &amp; Security</SectionHeading>
                <div className="mt-5 space-y-5 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>
                    We implement industry-standard technical and organizational measures to protect
                    your personal data against unauthorized access, alteration, disclosure, or
                    destruction.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      {
                        title: "Encryption in Transit",
                        detail: "All data transmitted between your browser and our servers is protected using TLS 1.3 with strong cipher suites.",
                      },
                      {
                        title: "Encryption at Rest",
                        detail: "Data stored in our databases and object storage is encrypted using AES-256 encryption standards.",
                      },
                      {
                        title: "Access Controls",
                        detail: "Role-based access control (RBAC) limits internal access to personal data on a strict need-to-know basis, with audit logging of every access event.",
                      },
                      {
                        title: "Security Assessments",
                        detail: "We conduct regular penetration testing, vulnerability scanning, and code reviews to identify and remediate potential security weaknesses.",
                      },
                      {
                        title: "Employee Training",
                        detail: "All team members with access to systems handling personal data undergo mandatory privacy and security awareness training upon hire and annually thereafter.",
                      },
                      {
                        title: "Incident Response",
                        detail: "We maintain an incident response plan and will notify affected users and relevant authorities within 72 hours of confirming a qualifying breach.",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-lg border border-gray-100 dark:border-gray-700/60 p-4"
                      >
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </section>

            {/* ---------- YOUR RIGHTS ---------- */}
            <section id="your-rights" aria-labelledby="heading-rights">
              <Card>
                <SectionHeading id="heading-rights">Your Rights (GDPR / CCPA)</SectionHeading>
                <p className="mt-3 text-gray-600 dark:text-gray-400">
                  Depending on your jurisdiction, you may have the following rights regarding your
                  personal data. To exercise any of these rights, please contact us using the details
                  in the Contact section below. We will respond within 30 days.
                </p>

                <div className="mt-6 divide-y divide-gray-100 dark:divide-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700/60 overflow-hidden">
                  {RIGHTS.map((r) => (
                    <div key={r.right} className="px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        {r.right}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{r.summary}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-sm text-gray-500 dark:text-gray-400 italic">
                  Note: Certain rights may be limited where processing is necessary for compliance
                  with a legal obligation, the establishment, exercise or defense of legal claims, or
                  the protection of vital interests.
                </p>
              </Card>
            </section>

            {/* ---------- COOKIES ---------- */}
            <section id="cookies" aria-labelledby="heading-cookies">
              <Card>
                <SectionHeading id="heading-cookies">Cookies &amp; Tracking</SectionHeading>
                <div className="mt-5 space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>
                    UI-as-Code uses cookies and similar technologies (such as local storage and web
                    beacons) to enhance your experience, analyze site performance, and deliver
                    personalized content. Cookies are small data files stored on your device that help
                    us recognize you when you return.
                  </p>

                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4">
                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-2">
                      Types of cookies we use
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-amber-900/80 dark:text-amber-300/80">
                      <li>
                        <strong>Essential cookies:</strong> Required for authentication, security, and
                        basic functionality. These cannot be disabled.
                      </li>
                      <li>
                        <strong>Analytics cookies:</strong> Help us understand how visitors interact
                        with the site (e.g., Google Analytics). These are anonymized.
                      </li>
                      <li>
                        <strong>Preference cookies:</strong> Remember your settings such as theme
                        preference (light/dark mode).
                      </li>
                    </ul>
                  </div>

                  <p>
                    For a complete breakdown of each cookie, its purpose, lifespan, and how to manage
                    your preferences, please refer to our full{" "}
                    <a
                      href="/legal/cookies"
                      className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:no-underline font-medium inline-flex items-center gap-1"
                    >
                      Cookie Policy
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </a>
                    .
                  </p>
                </div>
              </Card>
            </section>

            {/* ---------- THIRD-PARTY SERVICES ---------- */}
            <section id="third-party" aria-labelledby="heading-thirdparty">
              <Card>
                <SectionHeading id="heading-thirdparty">Third-Party Services</SectionHeading>
                <p className="mt-3 text-gray-600 dark:text-gray-400">
                  The following third-party services are integrated into the UI-as-Code platform.
                  Each operates under its own privacy policy, linked below.
                </p>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50">
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 rounded-tl-lg">
                          Service
                        </th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Purpose
                        </th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                          Data Shared
                        </th>
                        <th className="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 rounded-tr-lg">
                          Privacy Policy
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {THIRD_PARTY_SERVICES.map((svc, idx) => (
                        <tr
                          key={svc.name}
                          className={
                            idx % 2 === 0
                              ? "bg-white dark:bg-transparent"
                              : "bg-gray-50/50 dark:bg-gray-700/20"
                          }
                        >
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white align-top border-b border-gray-100 dark:border-gray-700/50">
                            {svc.name}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300 align-top border-b border-gray-100 dark:border-gray-700/50">
                            {svc.purpose}
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400 align-top border-b border-gray-100 dark:border-gray-700/50">
                            {svc.dataShared}
                          </td>
                          <td className="px-4 py-3 align-top border-b border-gray-100 dark:border-gray-700/50">
                            <a
                              href={svc.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                            >
                              View
                              <ExternalLinkIcon />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>

            {/* ---------- CHILDREN'S PRIVACY ---------- */}
            <section id="childrens-privacy" aria-labelledby="heading-children">
              <Card>
                <SectionHeading id="heading-children">Children&apos;s Privacy</SectionHeading>
                <div className="mt-5 space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>
                    Our Service is not directed to individuals under the age of 16 (or the minimum age
                    of digital consent in your jurisdiction). We do not knowingly collect personal
                    information from children.
                  </p>
                  <p>
                    If we become aware that we have collected personal data from a child without
                    verification of parental consent, we will take steps to delete that information
                    promptly. If you believe we might have collected information from a child, please
                    contact us immediately using the details below.
                  </p>
                </div>
              </Card>
            </section>

            {/* ---------- INTERNATIONAL TRANSFERS ---------- */}
            <section id="international" aria-labelledby="heading-international">
              <Card>
                <SectionHeading id="heading-international">International Transfers</SectionHeading>
                <div className="mt-5 space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>
                    Your information may be transferred to and processed in countries other than your
                    country of residence. Those countries may have data protection laws different from
                    those of your jurisdiction.
                  </p>
                  <p>
                    When we transfer personal data internationally, we ensure appropriate safeguards
                    are in place, which may include Standard Contractual Clauses (SCCs) approved by
                    the European Commission, reliance on the recipient country&apos;s adequacy
                    determination, or other lawful transfer mechanisms as required by applicable law.
                  </p>
                  <p>
                    Our primary data processing locations are within the United States and the European
                    Union via our infrastructure providers (Supabase, Vercel, Cloudflare).
                  </p>
                </div>
              </Card>
            </section>

            {/* ---------- CHANGES TO THIS POLICY ---------- */}
            <section id="changes" aria-labelledby="heading-changes">
              <Card>
                <SectionHeading id="heading-changes">Changes to This Policy</SectionHeading>
                <div className="mt-5 space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>
                    We may update this Privacy Policy from time to time to reflect changes in our
                    practices, technologies, legal requirements, or other factors. We will notify you
                    of material changes by:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600 dark:text-gray-400">
                    <li>Posting the updated policy on this page with a new &ldquo;Effective&rdquo; date</li>
                    <li>Sending an email notification to registered users at least 30 days before significant changes take effect</li>
                    <li>Displaying a prominent notice within the application dashboard</li>
                  </ul>
                  <p>
                    Your continued use of the Service after any changes constitutes your acceptance of
                    the revised Privacy Policy. We encourage you to review this page periodically.
                  </p>
                </div>
              </Card>
            </section>

            {/* ---------- CONTACT US ---------- */}
            <section id="contact" aria-labelledby="heading-contact">
              <Card>
                <SectionHeading id="heading-contact">Contact Us</SectionHeading>
                <div className="mt-5 space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  <p>
                    If you have questions, concerns, or requests regarding this Privacy Policy or our
                    data practices, please reach out to our Data Protection Officer:
                  </p>

                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60 p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 shrink-0 w-36">
                        Data Protection Officer:
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Alex Chen
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 shrink-0 w-36">
                        Email:
                      </span>
                      <a
                        href="mailto:privacy@uiascode.dev"
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        privacy@uiascode.dev
                      </a>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 shrink-0 w-36">
                        Response Time:
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Within 30 calendar days
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 shrink-0 w-36">
                        Mailing Address:
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        UI-as-Code, Inc.<br />
                        Privacy Compliance Team<br />
                        123 Innovation Drive, Suite 400<br />
                        San Francisco, CA 94105, USA
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    For residents of the European Economic Area (EEA), you also have the right to lodge
                    a complaint with a supervisory authority in your member state of residence or work.
                  </p>
                </div>
              </Card>
            </section>

            {/* ---- Footer timestamp ---- */}
            <footer className="text-center text-xs text-gray-400 dark:text-gray-500 pb-8">
              Last reviewed and updated: April 10, 2026 &middot; UI-as-Code, Inc.
            </footer>
          </article>
        </div>
      </main>
    </div>
  );
}
