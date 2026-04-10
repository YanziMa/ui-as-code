"use client";

import { useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// Section data
// ---------------------------------------------------------------------------

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: (
      <>
        <p>
          By accessing or using UI-as-Code (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you may not use the Service.
        </p>
        <p>
          These Terms apply to all visitors, users, and others who access or use the Service. By accessing or using the Service you represent that you are at least <strong>18 years of age</strong> and have the legal capacity to enter into a binding agreement.
        </p>
        <p>
          We reserve the right to modify or discontinue the Service at any time without prior notice. We shall not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the Service.
        </p>
      </>
    ),
  },
  {
    id: "description",
    title: "2. Description of Service",
    content: (
      <>
        <p>
          UI-as-Code is a web-based platform that enables users to convert visual user interface designs into production-ready code. The Service provides tools for:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Uploading and analyzing UI screenshots, wireframes, and design files</li>
          <li>Generating semantic HTML, CSS, JavaScript, and framework-specific code</li>
          <li>Reviewing and iterating on generated code through an interactive diff interface</li>
          <li>Exporting code in multiple formats and integrating with version control systems</li>
          <li>Collaborating with team members on design-to-code workflows</li>
        </ul>
        <p>
          The Service is provided on a subscription basis. Specific features and availability depend on your chosen plan. We make no warranty that the Service will meet your specific requirements or operate uninterrupted.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "3. User Accounts & Registration",
    content: (
      <>
        <p>
          To access certain features of the Service, you must create an account. When creating an account, you agree to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide accurate, current, and complete information during registration</li>
          <li>Maintain and promptly update your account information</li>
          <li>Maintain the security of your password and accept all risks of unauthorized access</li>
          <li>Notify us immediately of any unauthorized use of your account</li>
          <li>You are solely responsible for all activity that occurs under your account</li>
        </ul>
        <p>
          You may not use another person&apos;s account without permission. Accounts created for automated or bulk usage require prior written approval from UI-as-Code.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "4. Acceptable Use Policy",
    content: (
      <>
        <p className="font-semibold text-red-700 dark:text-red-400">
          You agree NOT to use the Service to:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>Violate any applicable local, state, national, or international law or regulation</li>
          <li>Infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
          <li>Upload malicious code, viruses, or any material of a destructive nature</li>
          <li>Harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate based on gender, sexual orientation, religion, ethnicity, race, age, national origin, or disability</li>
          <li>Submit false or misleading information or impersonate any person or entity</li>
          <li>Use the Service for any purpose that is illegal or prohibited by these Terms</li>
          <li>Attempt to gain unauthorized access to any portion of the Service, other accounts, computer systems, or networks connected to the Service</li>
          <li>Interfere with or disrupt the integrity or performance of the Service or data contained therein</li>
          <li>Reverse engineer, decompile, or disassemble any aspect of the Service</li>
          <li>Use automated systems (bots, scrapers) to access the Service without express written consent</li>
        </ul>
        <p>
          We reserve the right to terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "5. Intellectual Property",
    content: (
      <>
        <p>
          The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of UI-as-Code and its licensors. The Service is protected by copyright, trademark, and other laws.
        </p>
        <div className="bg-slate-50 dark:bg-slate-800 border-l-4 border-blue-500 p-4 my-4 rounded-r-lg">
          <p className="text-sm font-medium mb-1">Ownership of Generated Code</p>
          <p className="text-sm">
            Code generated by the Service from your designs is owned by <strong>you</strong>, the user. You retain full rights to use, modify, distribute, and commercially exploit any code output generated through the Service, subject to your active subscription at the time of generation.
          </p>
        </div>
        <p>
          Our trademarks and trade dress may not be used in connection with any product or service without our prior written consent. You may not frame or utilize framing techniques to enclose any trademark, logo, or other proprietary information of UI-as-Code without our express written consent.
        </p>
      </>
    ),
  },
  {
    id: "user-content",
    title: "6. User-Generated Content",
    content: (
      <>
        <p>
          Our Service allows you to post, upload, and share content including but not limited to:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Design uploads:</strong> Screenshots, images, Figma/Sketch exports, and other visual assets</li>
          <li><strong>Code diffs:</strong> Modifications and annotations made to generated code</li>
          <li><strong>Descriptions:</strong> Text prompts, instructions, and contextual descriptions</li>
          <li><strong>Feedback:</strong> Bug reports, feature requests, and quality ratings</li>
        </ul>
        <p>
          You retain ownership of all content you submit to the Service. By submitting content, you grant UI-as-Code a worldwide, non-exclusive, royalty-free license to use, reproduce, process, adapt, and display such content solely for the purpose of providing and improving the Service.
        </p>
        <p>
          You represent and warrant that: (a) you own or control all rights to your content, (b) your content does not violate these Terms or any applicable law, and (c) your content will not cause injury to any person or entity.
        </p>
        <p>
          We may remove or disable access to any user-generated content that we reasonably believe violates these Terms or applicable law, without notice to you.
        </p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "7. Privacy & Data",
    content: (
      <>
        <p>
          Your privacy is important to us. Please review our{" "}
          <a href="/legal/privacy-v2" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Privacy Policy
          </a>{" "}
          which also governs your use of the Service, to understand how we collect, use, and protect your personal information.
        </p>
        <p>
          Key privacy commitments include:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>We do not sell your personal data to third parties</li>
          <li>Your uploaded designs and generated code are encrypted at rest and in transit</li>
          <li>We retain data only as long as necessary to provide the Service or as required by law</li>
          <li>You can request deletion of your account and associated data at any time</li>
          <li>We implement industry-standard security measures to protect your information</li>
        </ul>
        <p>
          If you are located in the European Economic Area, your data processing is governed by GDPR-compliant mechanisms including appropriate safeguards for international transfers.
        </p>
      </>
    ),
  },
  {
    id: "payment",
    title: "8. Payment & Refunds",
    content: (
      <>
        <h4 className="font-semibold mt-4 mb-2 text-base">Subscription Plans</h4>
        <p>
          UI-as-Code offers both free and paid subscription plans. Paid subscriptions are billed on a recurring monthly or annual basis, depending on the plan selected at checkout. All fees are stated in USD unless otherwise specified.
        </p>

        <h4 className="font-semibold mt-4 mb-2 text-base">Billing & Renewal</h4>
        <p>
          Subscriptions automatically renew at the end of each billing cycle unless cancelled before the renewal date. You authorize us to charge your payment method for all renewal fees until you cancel your subscription.
        </p>

        <h4 className="font-semibold mt-4 mb-2 text-base">Refund Policy</h4>
        <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 p-4 my-4 rounded-r-lg">
          <p className="text-sm font-medium mb-1">Our Refund Commitment</p>
          <ul className="text-sm list-disc pl-5 space-y-1">
            <li><strong>Within 14 days:</strong> Full refund for first-time subscribers, no questions asked</li>
            <li><strong>Billing errors:</strong> Full refund for any incorrect charges upon verification</li>
            <li><strong>Service outages:</strong> Pro-rated credit for downtime exceeding 24 consecutive hours</li>
            <li><strong>No refunds after 14 days</strong> for ongoing subscriptions except as specified above</li>
          </ul>
        </div>
        <p>
          To request a refund, contact our support team at{" "}
          <a href="mailto:support@uiascode.com" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            support@uiascode.com
          </a>{" "}
          with your account email and reason for the request. Refunds are processed within 5–10 business days to the original payment method.
        </p>

        <h4 className="font-semibold mt-4 mb-2 text-base">Price Changes</h4>
        <p>
          We reserve the right to modify subscription prices with 30 days&apos; advance notice. Price changes will not affect existing subscriptions until the next renewal cycle following the notice period.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "9. Termination",
    content: (
      <>
        <p>
          We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will cease immediately.
        </p>
        <h4 className="font-semibold mt-4 mb-2 text-base">Grounds for Termination</h4>
        <ul className="list-disc pl-6 space-y-1">
          <li>Violation of any provision of these Terms</li>
          <li>Conduct that we determine, in our sole discretion, to be harmful to other users, the Service, or third parties</li>
          <li>Prolonged inactivity (no login for more than 12 months)</li>
          <li>Failure to pay subscription fees when due</li>
          <li>Providing false or misleading registration information</li>
        </ul>
        <h4 className="font-semibold mt-4 mb-2 text-base">Effect of Termination</h4>
        <p>
          Upon termination: (a) your right to use the Service ceases immediately, (b) we may delete your account data, (c) provisions of these Terms which by their nature should survive termination shall remain in effect, including Intellectual Property, Limitation of Liability, and Governing Law sections.
        </p>
        <p>
          You may terminate your account at any time by accessing Account Settings and selecting Delete Account. All data will be permanently deleted within 30 days of account closure.
        </p>
      </>
    ),
  },
  {
    id: "limitation",
    title: "10. Limitation of Liability",
    content: (
      <>
        <p>
          In no event shall UI-as-Code, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation loss of profits, data, use, goodwill, or other intangible losses resulting from:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your access to or use of or inability to access or use the Service</li>
          <li>Any conduct or content of any third party on the Service</li>
          <li>Any content obtained from the Service</li>
          <li>Unauthorized access, use, or alteration of your transmissions or content</li>
        </ul>
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-4">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Liability Cap
          </p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">
            Our total aggregate liability arising out of or related to the Service, whether based in contract, tort, negligence, strict liability, or otherwise, shall not exceed the total amount paid by you to UI-as-Code in the twelve (12) months preceding the claim, or $100 USD, whichever is greater.
          </p>
        </div>
        <p>
          Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability, so the above limitations may not fully apply to you.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "11. Changes to Terms",
    content: (
      <>
        <p>
          We reserve the right to update or change these Terms at any time, and such changes will be effective immediately upon posting within the Service. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
        </p>
        <h4 className="font-semibold mt-4 mb-2 text-base">Notification Process</h4>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Email notification</strong> for material changes sent to your registered email address at least 30 days before they take effect</li>
          <li><strong>In-app banner</strong> displayed prominently when logging in after significant updates</li>
          <li><strong>Last updated date</strong> shown at the top of this page reflects the most recent revision</li>
        </ul>
        <p>
          We encourage you to review these Terms periodically. The latest version will always be available at this URL. If you object to any changes, your sole recourse is to discontinue use of the Service and terminate your account.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "12. Governing Law",
    content: (
      <>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
        </p>
        <p>
          Any disputes arising from or relating to these Terms or the Service shall be resolved exclusively in the federal or state courts located in Wilmington, Delaware, and you hereby consent to the personal jurisdiction and venue of such courts.
        </p>
        <h4 className="font-semibold mt-4 mb-2 text-base">Arbitration (Optional)</h4>
        <p>
          Either party may elect to resolve any dispute through binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules. The arbitration shall be conducted in English and take place in Wilmington, Delaware.
        </p>
        <p>
          If any provision of these Terms is held to be invalid or unenforceable, such provision shall be struck and the remaining provisions shall remain in full force and effect.
        </p>
      </>
    ),
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TermsOfServicePage() {
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const [tocOpen, setTocOpen] = useState(false);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(section.id);
          }
        },
        { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    setTocOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* ===== Header ===== */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <li>
                <a href="/" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  Home
                </a>
              </li>
              <li aria-hidden="true">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </li>
              <li>
                <a href="/legal" className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  Legal
                </a>
              </li>
              <li aria-hidden="true">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </li>
              <li className="text-slate-900 dark:text-slate-100 font-medium">
                Terms of Service
              </li>
            </ol>
          </nav>

          {/* Title */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                Terms of Service
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Last updated: April 10, 2026
              </p>
            </div>

            {/* Mobile TOC toggle */}
            <button
              onClick={() => setTocOpen(!tocOpen)}
              className="sm:hidden inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              Table of Contents
            </button>
          </div>
        </div>
      </header>

      {/* ===== Body ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-12">
          {/* ---- Sidebar TOC (desktop sticky) ---- */}
          <aside
            className={`${
              tocOpen ? "block" : "hidden"
            } sm:block w-full sm:w-64 shrink-0`}
          >
            {/* Mobile overlay backdrop */}
            {tocOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm sm:hidden"
                onClick={() => setTocOpen(false)}
              />
            )}

            <nav
              aria-label="Table of contents"
              className={`${
                tocOpen ? "relative z-50" : ""
              } sm:sticky sm:top-24 bg-white dark:bg-slate-950 sm:bg-transparent rounded-xl sm:rounded-none border border-slate-200 dark:border-slate-800 sm:border-0 p-4 sm:p-0 shadow-lg sm:shadow-none max-h-[70vh] overflow-y-auto`}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 hidden sm:block">
                On this page
              </h2>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3 sm:hidden">
                Sections
              </h2>
              <ol className="space-y-1">
                {sections.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollTo(section.id)}
                      className={`w-full text-left text-sm py-1.5 px-3 rounded-md transition-all duration-150 ${
                        activeSection === section.id
                          ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/40 border-l-2 border-blue-500"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          {/* ---- Main content ---- */}
          <article className="flex-1 min-w-0 max-w-3xl">
            <div className="prose prose-slate dark:prose-invert prose-headings:scroll-mt-24 prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-li:leading-relaxed prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900 dark:prose-strong:text-slate-100">
              <p className="lead text-lg text-slate-600 dark:text-slate-400 italic border-b border-slate-200 dark:border-slate-800 pb-6">
                Please read these terms carefully before using UI-as-Code. By using our service,
                you acknowledge that you have read, understood, and agree to be bound by the
                following terms and conditions.
              </p>

              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="group">
                  {/* Section divider */}
                  {index > 0 && (
                    <hr className="my-8 border-slate-200 dark:border-slate-800" />
                  )}
                  <h2>{section.title}</h2>
                  {section.content}
                </section>
              ))}
            </div>

            {/* ---- Footer CTA ---- */}
            <div className="mt-14 mb-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/50 p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/60 mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Questions about these Terms?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-md mx-auto">
                Our legal team is here to help clarify anything. Reach out and we&apos;ll get back to you within 2 business days.
              </p>
              <a
                href="mailto:legal@uiascode.com"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                legal@uiascode.com
              </a>
            </div>
          </article>
        </div>
      </main>

      {/* ===== Page footer ===== */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-xs text-slate-400 dark:text-slate-600">
            &copy; {new Date().getFullYear()} UI-as-Code. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
