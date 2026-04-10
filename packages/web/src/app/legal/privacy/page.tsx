import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for the ui-as-code platform.",
};

const LAST_UPDATED = "April 10, 2026";

const sections = [
  { id: "information-we-collect", label: "1. Information We Collect" },
  { id: "how-we-collect", label: "2. How We Collect It" },
  { id: "how-we-use", label: "3. How We Use It" },
  { id: "information-sharing", label: "4. Information Sharing" },
  { id: "data-security", label: "5. Data Security" },
  { id: "your-rights", label: "6. Your Rights (GDPR / CCPA)" },
  { id: "cookies", label: "7. Cookies and Tracking Technologies" },
  { id: "childrens-privacy", label: "8. Children&apos;s Privacy" },
  { id: "changes-to-policy", label: "9. Changes to This Policy" },
  { id: "contact-us", label: "10. Contact Us" },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
        {/* Header */}
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Privacy Policy
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

        {/* Introductory statement */}
        <p className="mb-10 text-gray-700 leading-relaxed">
          At ui-as-code (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), we are
          committed to protecting your privacy. This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you visit our website or use our platform
          (collectively, the &ldquo;Platform&rdquo;). Please read this policy carefully. If you do
          not agree with the terms of this Privacy Policy, please do not access the Platform.
        </p>

        {/* Content */}
        <article className="prose prose-gray max-w-none prose-headings:scroll-mt-24 prose-h2:text-xl prose-h2:font-semibold prose-h2:text-gray-900 prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-ul:my-3 prose-ol:my-3">
          {/* 1. Information We Collect */}
          <section id="information-we-collect">
            <h2>1. Information We Collect</h2>
            <p>We collect information that you provide directly to us, as well as information collected automatically when you use the Platform.</p>

            <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">Personal Information</h3>
            <ul>
              <li><strong>Account information:</strong> Name, email address, password, and optional profile details provided during registration.</li>
              <li><strong>Contact information:</strong> Email address, phone number, or mailing address if you contact us or subscribe to communications.</li>
              <li><strong>Payment information:</strong> Billing name, address, and payment method details processed securely through third-party payment providers. We do not store full credit card numbers on our servers.</li>
              <li><strong>User-generated content:</strong> Text, files, code, configurations, and other materials you create or upload through the Platform.</li>
              <li><strong>Communications:</strong> Records of correspondence with us, including support tickets and feedback submissions.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">Automatically Collected Information</h3>
            <ul>
              <li><strong>Usage data:</strong> Pages visited, features used, time spent, click patterns, and navigation paths within the Platform.</li>
              <li><strong>Device information:</strong> Browser type, operating system, device identifiers, screen resolution, and language settings.</li>
              <li><strong>Log data:</strong> IP address (anonymized where possible), access times, referring URLs, and server interaction records.</li>
              <li><strong>Cookies and similar technologies:</strong> As described in Section 7 below.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">Information from Third Parties</h3>
            <ul>
              <li><strong>Social logins:</strong> Basic profile information (name, email) if you sign up using a third-party authentication provider.</li>
              <li><strong>Analytics providers:</strong> Aggregated demographic and interest-based data from analytics services we use.</li>
            </ul>
          </section>

          {/* 2. How We Collect It */}
          <section id="how-we-collect">
            <h2>2. How We Collect It</h2>
            <p>We collect information through the following methods:</p>
            <ul>
              <li><strong>Directly from you:</strong> When you register an account, fill out forms, communicate with us, or participate in surveys or promotions.</li>
              <li><strong>Automatically:</strong> Through cookies, web beacons, server logs, and similar technologies as you interact with the Platform.</li>
              <li><strong>From third parties:</strong> From service providers that assist us in operating the Platform, analyzing usage, and delivering services.</li>
            </ul>
          </section>

          {/* 3. How We Use It */}
          <section id="how-we-use">
            <h2>3. How We Use It</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li><strong>Providing and maintaining the Platform:</strong> To create and manage your account, deliver services, process transactions, and fulfill your requests.</li>
              <li><strong>Improving the Platform:</strong> To analyze usage patterns, identify bugs, develop new features, and enhance user experience.</li>
              <li><strong>Communication:</strong> To send you important notices about your account, security alerts, product updates, and marketing communications (with your consent).</li>
              <li><strong>Security and fraud prevention:</strong> To detect, prevent, and address technical issues, unauthorized access, fraud, and malicious activity.</li>
              <li><strong>Legal compliance:</strong> To comply with applicable laws, regulations, legal processes, or enforceable governmental requests.</li>
              <li><strong>Analytics and research:</strong> To understand how users interact with the Platform and to improve our products and services.</li>
            </ul>
            <p>
              We will not use your information for purposes materially different from those disclosed in this policy without obtaining your prior consent.
            </p>
          </section>

          {/* 4. Information Sharing */}
          <section id="information-sharing">
            <h2>4. Information Sharing</h2>
            <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
            <ul>
              <li><strong>Service providers:</strong> With trusted third-party vendors who perform services on our behalf, such as hosting, payment processing, analytics, email delivery, and customer support. These providers are contractually bound to protect your data and use it only for the specified purposes.</li>
              <li><strong>Legal requirements:</strong> When required by law, regulation, legal process, or governmental request, or to protect the rights, property, or safety of ui-as-code, our users, or others.</li>
              <li><strong>Business transfers:</strong> In connection with any merger, acquisition, sale of assets, or transfer of all or a portion of our business, in which case your information would be transferred as part of that transaction subject to confidentiality obligations.</li>
              <li><strong>With your consent:</strong> When you explicitly authorize us to share your information for a specific purpose.</li>
            </ul>
            <p>
              We may share aggregated or de-identified information that cannot reasonably be used to identify you for any lawful purpose, such as statistical analysis and industry research.
            </p>
          </section>

          {/* 5. Data Security */}
          <section id="data-security">
            <h2>5. Data Security</h2>
            <p>
              We implement industry-standard administrative, technical, and physical safeguards designed to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul>
              <li>Encryption of data in transit using TLS/SSL protocols;</li>
              <li>Encryption of sensitive data at rest using AES-256 encryption standards;</li>
              <li>Regular security assessments and vulnerability testing;</li>
              <li>Access controls limiting employee access to personal information on a need-to-know basis;</li>
              <li>Secure data center infrastructure with certified cloud providers.</li>
            </ul>
            <p>
              While we strive to protect your information, no method of transmission over the Internet or method of electronic storage is 100% secure. We cannot guarantee absolute security of your data.
            </p>
            <p>
              In the event of a data breach that poses a risk to your rights and freedoms, we will notify affected users and relevant authorities in accordance with applicable legal requirements within 72 hours of becoming aware of the breach.
            </p>
          </section>

          {/* 6. Your Rights (GDPR / CCPA) */}
          <section id="your-rights">
            <h2>6. Your Rights (GDPR / CCPA)</h2>
            <p>Depending on your location, you may have the following rights regarding your personal information:</p>

            <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">General Data Protection Regulation (GDPR) &mdash; EEA Residents</h3>
            <ul>
              <li><strong>Right of Access:</strong> Request a copy of the personal information we hold about you.</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete personal information.</li>
              <li><strong>Right to Erasure (&ldquo;Right to Be Forgotten&rdquo;):</strong> Request deletion of your personal information under certain conditions.</li>
              <li><strong>Right to Restrict Processing:</strong> Request that we limit how we use your personal information.</li>
              <li><strong>Right to Data Portability:</strong> Receive your personal information in a structured, machine-readable format.</li>
              <li><strong>Right to Object:</strong> Object to processing of your personal information based on legitimate interests or for direct marketing purposes.</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw previously given consent at any time, without affecting the lawfulness of processing before withdrawal.</li>
            </ul>
            <p>
              If you reside in the European Economic Area, you also have the right to lodge a complaint with a supervisory authority. Our lead supervisory authority is the Irish Data Protection Commission.
            </p>

            <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">California Consumer Privacy Act (CCPA) &mdash; California Residents</h3>
            <ul>
              <li><strong>Right to Know:</strong> Request disclosure of the categories and specific pieces of personal information we collect, use, disclose, and sell about you.</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information, subject to certain exceptions.</li>
              <li><strong>Right to Opt-Out:</strong> Direct us not to sell your personal information. (Note: We do not sell personal information.)</li>
              <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising your privacy rights.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">How to Exercise Your Rights</h3>
            <p>
              To exercise any of the above rights, please contact us at{" "}
              <a href="mailto:privacy@ui-as-code.dev" className="text-blue-600 hover:underline">
                privacy@ui-as-code.dev
              </a>
              . We will respond to your request within thirty (30) days, or sooner where required by law. We may request verification of your identity before fulfilling your request.
            </p>
          </section>

          {/* 7. Cookies and Tracking Technologies */}
          <section id="cookies">
            <h2>7. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies (such as web beacons and pixel tags) to collect and store information about your interactions with the Platform. A cookie is a small data file placed on your device that helps us provide, protect, and improve the Platform.
            </p>

            <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">Types of Cookies We Use</h3>
            <ul>
              <li><strong>Essential cookies:</strong> Required for the basic functioning of the Platform, such as maintaining your session and remembering preferences. These cannot be disabled.</li>
              <li><strong>Performance cookies:</strong> Help us understand how visitors interact with the Platform by collecting anonymous usage statistics. This allows us to identify and fix issues and improve performance.</li>
              <li><strong>Functionality cookies:</strong> Remember choices you make (such as language preference or theme selection) to provide enhanced, personalized features.</li>
              <li><strong>Marketing cookies:</strong> Used to deliver advertisements relevant to you and measure the effectiveness of our campaigns. These are only placed with your explicit consent.</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">Managing Cookies</h3>
            <p>
              Most web browsers allow you to control cookies through their settings. You can typically refuse or delete cookies, though doing so may affect the functionality of the Platform. For more information about managing cookies, visit{" "}
              <a
                href="https://www.allaboutcookies.org/manage-cookies/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                allaboutcookies.org
              </a>.
            </p>
          </section>

          {/* 8. Children's Privacy */}
          <section id="childrens-privacy">
            <h2>8. Children&apos;s Privacy</h2>
            <p>
              The Platform is not directed to children under the age of 13 (or the age of digital consent in your jurisdiction). We do not knowingly collect personal information from children. If we discover that a child has provided us with personal information, we will take steps to delete such information promptly.
            </p>
            <p>
              If you believe we might have collected information from a child under 13, please contact us immediately at{" "}
              <a href="mailto:privacy@ui-as-code.dev" className="text-blue-600 hover:underline">
                privacy@ui-as-code.dev
              </a>, and we will take appropriate action.
            </p>
            <p>
              If you are a parent or guardian and believe your child has provided us with personal information without your consent, please contact us so that we can delete such information.
            </p>
          </section>

          {/* 9. Changes to This Policy */}
          <section id="changes-to-policy">
            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will post the revised policy on this page with an updated &ldquo;Last updated&rdquo; date.
            </p>
            <p>
              For material changes, we will notify registered users via email or in-platform notification at least thirty (30) days before the changes take effect. We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
            </p>
            <p>
              Your continued use of the Platform after any changes constitute your acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* 10. Contact Us */}
          <section id="contact-us">
            <h2>10. Contact Us</h2>
            <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
            <ul>
              <li><strong>Email:</strong>{" "}
                <a href="mailto:privacy@ui-as-code.dev" className="text-blue-600 hover:underline">
                  privacy@ui-as-code.dev
                </a>
              </li>
              <li><strong>Mailing Address:</strong> ui-as-code Privacy Team, San Francisco, CA, USA</li>
            </ul>
            <p>
              For GDPR-related inquiries, you may also contact our Data Protection Officer at the same email address. We aim to respond to all privacy-related inquiries within thirty (30) days.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
