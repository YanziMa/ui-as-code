import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for the ui-as-code platform.",
};

const LAST_UPDATED = "April 10, 2026";

const sections = [
  { id: "acceptance", label: "1. Acceptance of Terms" },
  { id: "account-terms", label: "2. Account Terms" },
  { id: "license", label: "3. License to Use" },
  { id: "acceptable-use", label: "4. Acceptable Use Policy" },
  { id: "intellectual-property", label: "5. Intellectual Property" },
  { id: "privacy", label: "6. Privacy" },
  { id: "limitation-of-liability", label: "7. Limitation of Liability" },
  { id: "termination", label: "8. Termination" },
  { id: "changes", label: "9. Changes to Terms" },
  { id: "governing-law", label: "10. Governing Law" },
] as const;

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        {/* Table of Contents */}
        <nav aria-label="Table of contents" className="mb-14 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Table of Contents</h2>
          <ol className="space-y-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-sm text-blue-600 underline-offset-2 hover:text-blue-800 hover:underline transition-colors"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Content */}
        <article className="prose prose-gray max-w-none prose-headings:scroll-mt-24 prose-h2:text-xl prose-h2:font-semibold prose-h2:text-gray-900 prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-ul:my-3 prose-ol:my-3">
          {/* 1. Acceptance of Terms */}
          <section id="acceptance">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the ui-as-code platform (&ldquo;the Platform&rdquo;), operated by
              ui-as-code (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be
              bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these
              Terms, you may not use the Platform.
            </p>
            <p>
              These Terms apply to all visitors, users, and others who access or use the Platform.
              If you are using the Platform on behalf of an organization, you represent that you have
              the authority to bind that organization to these Terms.
            </p>
          </section>

          {/* 2. Account Terms */}
          <section id="account-terms">
            <h2>2. Account Terms</h2>
            <p>To use certain features of the Platform, you must create an account.</p>
            <ul>
              <li>
                <strong>Accuracy.</strong> You must provide accurate, current, and complete
                information during registration and keep it updated.
              </li>
              <li>
                <strong>Security.</strong> You are responsible for safeguarding your account
                credentials and for all activities that occur under your account.
              </li>
              <li>
                <strong>Eligibility.</strong> You must be at least 13 years of age (or the age of
                majority in your jurisdiction) to create an account. If you are under 18, you
                represent that a parent or legal guardian has reviewed and agreed to these Terms on
                your behalf.
              </li>
              <li>
                <strong>One account per person.</strong> Unless explicitly authorized, each user may
                maintain only one personal account.
              </li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts that violate these requirements
              or that appear to be fraudulent or abusive.
            </p>
          </section>

          {/* 3. License to Use */}
          <section id="license">
            <h2>3. License to Use</h2>
            <p>
              Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
              non-transferable, revocable license to access and use the Platform for its intended
              purposes. This license does not include:
            </p>
            <ul>
              <li>The right to copy, modify, or distribute any part of the Platform;</li>
              <li>
                The right to reverse-engineer, decompile, or disassemble the Platform or attempt to
                derive its source code;
              </li>
              <li>
                The right to rent, lease, lend, sell, redistribute, or sublicense any portion of the
                Platform;
              </li>
              <li>
                The right to use the Platform in any manner that could damage, disable, overburden,
                or impair its operation.
              </li>
            </ul>
            <p>
              All rights not expressly granted herein are reserved by us and our licensors.
            </p>
          </section>

          {/* 4. Acceptable Use Policy */}
          <section id="acceptable-use">
            <h2>4. Acceptable Use Policy</h2>
            <p>You agree not to use the Platform to:</p>
            <ul>
              <li>
                Violate any applicable local, state, national, or international law or regulation;
              </li>
              <li>Infringe upon or misappropriate the intellectual property rights of others;</li>
              <li>
                Transmit malware, viruses, worms, Trojan horses, or other harmful code or material;
              </li>
              <li>
                Engage in harassment, abuse, threats, or conduct that is defamatory, obscene,
                offensive, or otherwise objectionable;
              </li>
              <li>
                Attempt to gain unauthorized access to any part of the Platform, other users&rsquo;
                accounts, or any systems or networks connected to the Platform;
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the Platform or the data
                contained therein;
              </li>
              <li>
                Use automated scripts, bots, scrapers, or similar tools to access the Platform
                without our prior written consent;
              </li>
              <li>
                Misrepresent your identity or affiliation, or impersonate any person or entity.
              </li>
            </ul>
            <p>
              We reserve the right to investigate and take appropriate legal action against anyone
              who violates this policy, including removing content and terminating accounts.
            </p>
          </section>

          {/* 5. Intellectual Property */}
          <section id="intellectual-property">
            <h2>5. Intellectual Property</h2>
            <p>
              The Platform and all original content, features, and functionality (including but not
              limited to text, graphics, logos, icons, images, audio clips, software, and the
              compilation thereof) are owned by us or our licensors and are protected by copyright,
              trademark, and other intellectual property laws.
            </p>
            <p>
              <strong>Your Content.</strong> You retain ownership of any content you submit, post,
              or display on or through the Platform (&ldquo;Your Content&rdquo;). By submitting Your
              Content, you grant us a worldwide, non-exclusive, royalty-free license to use,
              reproduce, modify, adapt, publish, translate, distribute, and display Your Content
              solely for the purpose of providing and improving the Platform. This license ends when
              Your Content is removed from the Platform.
            </p>
            <p>
              You represent and warrant that (a) you own or control all rights in Your Content or
              have the necessary rights, licenses, consents, and permissions to grant the license set
              forth above, and (b) Your Content does not and will not violate any applicable law or
              infringe upon the rights of any third party.
            </p>
          </section>

          {/* 6. Privacy */}
          <section id="privacy">
            <h2>6. Privacy</h2>
            <p>
              Your privacy is important to us. Our collection and use of personal information in
              connection with the Platform is described in our{" "}
              <a href="/legal/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
              , which is incorporated into these Terms by reference. By using the Platform, you also
              agree to our Privacy Policy.
            </p>
          </section>

          {/* 7. Limitation of Liability */}
          <section id="limitation-of-liability">
            <h2>7. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
              LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING
              FROM:
            </p>
            <ul>
              <li>Your access to or use of or inability to access or use the Platform;</li>
              <li>
                Any conduct or content of any third party on or through the Platform;
              </li>
              <li>
                Any content obtained from or through the Platform; or
              </li>
              <li>
                Unauthorized ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.
              </li>
            </ul>
            <p>
              IN NO EVENT SHALL OUR TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR
              RELATING TO THE USE OF THE PLATFORM EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12)
              MONTHS PRECEDING THE EVENT GIVING RISE TO THE LIABILITY, OR ONE HUNDRED U.S. DOLLARS
              ($100.00), WHICHEVER IS GREATER.
            </p>
            <p>
              SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES OR THE LIMITATION
              OF LIABILITY, SO THE ABOVE LIMITATIONS MAY NOT FULLY APPLY TO YOU.
            </p>
          </section>

          {/* 8. Termination */}
          <section id="termination">
            <h2>8. Termination</h2>
            <p>We may terminate or suspend your account and access to the Platform:</p>
            <ul>
              <li>
                Immediately, without prior notice or liability, for any reason, including if you
                breach these Terms;
              </li>
              <li>
                Upon your request, at which point your account and associated data will be deleted in
                accordance with our data retention practices.
              </li>
            </ul>
            <p>
              Upon termination, your right to use the Platform will immediately cease. All provisions
              of these Terms which by their nature should survive termination shall survive,
              including but not limited to ownership provisions, warranty disclaimers, indemnity, and
              limitations of liability.
            </p>
          </section>

          {/* 9. Changes to Terms */}
          <section id="changes">
            <h2>9. Changes to Terms</h2>
            <p>
              We may revise these Terms from time to time. The most current version will always be
              available at this page with an updated &ldquo;Last updated&rdquo; date. We will make
              reasonable efforts to notify registered users of material changes via email or through
              in-platform notification at least thirty (30) days before they take effect.
            </p>
            <p>
              Your continued use of the Platform after any changes become effective constitutes your
              acceptance of the revised Terms. If you do not agree to the revised Terms, you must
              discontinue using the Platform.
            </p>
          </section>

          {/* 10. Governing Law */}
          <section id="governing-law">
            <h2>10. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State
              of California, United States, without regard to its conflict of law principles.
            </p>
            <p>
              Any disputes arising out of or relating to these Terms or the Platform shall be
              resolved exclusively in the state or federal courts located in San Francisco County,
              California, and you consent to the personal jurisdiction of such courts.
            </p>
          </section>

          {/* Footer note */}
          <hr className="my-12 border-gray-200" />
          <p className="text-sm text-gray-500">
            Questions about these Terms? Please contact us at{" "}
            <a href="mailto:legal@ui-as-code.dev" className="text-blue-600 hover:underline">
              legal@ui-as-code.dev
            </a>
            .
          </p>
        </article>
      </div>
    </main>
  );
}
