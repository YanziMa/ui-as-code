"use client";

import { useState } from "react";
import {
  Check,
  ArrowRight,
  Mail,
  Calendar,
  Quote,
  Users,
  DollarSign,
  Megaphone,
  Wrench,
} from "lucide-react";

const partnerTiers = [
  {
    name: "Technology Partners",
    description: "Cloud providers, CI/CD platforms, and monitoring tools that power modern development workflows.",
    benefits: ["Co-marketing campaigns", "Technical integration support", "Joint webinars & events", "Dedicated partner portal"],
    logos: ["AWS", "Google Cloud", "Vercel", "Netlify", "Datadog", "Sentry"],
    color: "from-indigo-500 to-blue-600",
    borderColor: "border-indigo-200",
    accentBg: "bg-indigo-50",
    accentText: "text-indigo-700",
  },
  {
    name: "Solution Partners",
    description: "SaaS companies that integrate UI-as-Code into their products to deliver enhanced value.",
    benefits: ["Revenue share program", "Dedicated support channel", "Early access to new features", "Co-selling opportunities"],
    logos: ["HubSpot", "Salesforce", "Notion", "Linear", "Figma"],
    color: "from-purple-500 to-violet-600",
    borderColor: "border-purple-200",
    accentBg: "bg-purple-50",
    accentText: "text-purple-700",
  },
  {
    name: "Community Partners",
    description: "Developer communities, educational institutions, and content creators who champion UI-as-Code.",
    benefits: ["Free Pro licenses for members", "Swag & branded merchandise", "Co-branded content creation", "Event sponsorship"],
    logos: [],
    color: "from-pink-500 to-rose-600",
    borderColor: "border-pink-200",
    accentBg: "bg-pink-50",
    accentText: "text-pink-700",
  },
];

const whyPartnerBenefits = [
  {
    icon: Users,
    title: "Reach Millions of Users",
    description:
      "Access our rapidly growing user base of developers, designers, and engineering teams actively seeking better UI tooling.",
  },
  {
    icon: DollarSign,
    title: "Revenue Sharing",
    description:
      "Earn competitive commissions on every referral and integration sale. Our top partners generate six-figure ARR through the program.",
  },
  {
    icon: Megaphone,
    title: "Co-Marketing",
    description:
      "Amplify your brand through joint case studies, co-authored blog posts, shared webinars, and cross-promotion across all channels.",
  },
  {
    icon: Wrench,
    title: "Technical Support",
    description:
      "Get a dedicated engineering liaison who ensures smooth integrations, provides API guidance, and fast-tracks feature requests.",
  },
];

const successStories = [
  {
    company: "CloudStack Labs",
    logo: "CS",
    quote:
      "Integrating UI-as-Code into our CI pipeline reduced design-to-deploy time by 40%. Our customers love the visual diff capabilities.",
    executive: "Sarah Chen, CTO",
    metric: "40% faster dev cycle",
    partnerSince: "Q2 2024",
  },
  {
    company: "DesignFlow Inc.",
    logo: "DF",
    quote:
      "The revenue share model has been transformative. We've seen a significant uptick in enterprise deals since launching our joint offering.",
    executive: "Marcus Rivera, VP Partnerships",
    metric: "$50k ARR increase",
    partnerSince: "Q4 2023",
  },
  {
    company: "DevEd Academy",
    logo: "DA",
    quote:
      "As an education partner, we've been able to teach thousands of students modern UI workflows using UI-as-Code as the foundation.",
    executive: "Priya Sharma, Founder",
    metric: "12k+ students trained",
    partnerSince: "Q1 2024",
  },
];

const existingPartners = [
  "Acme Corp", "BitForge", "CloudNine", "DataPulse", "EdgeWorks",
  "FluxLabs", "Grid Systems", "HexaTech", "Innovate.io", "Jupiter Dev",
  "Kinetix", "LambdaSoft", "MetaBuild", "NexusAI", "OmniStack",
  "Prism Labs", "QuantumUI", "RapidScale", "SynthWave", "TerraformX",
];

export default function PartnersPage() {
  const [formData, setFormData] = useState({
    companyName: "",
    website: "",
    contactName: "",
    email: "",
    partnerType: "",
    companySize: "",
    useCase: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white/15 text-sm font-medium text-indigo-100 backdrop-blur-sm mb-6 border border-white/20">
            Ecosystem Program
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
            Partner With Us
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-indigo-100 leading-relaxed">
            Build the future of UI customization together. Join a growing ecosystem
            of technology leaders, solution providers, and community champions who are
            shaping how teams build interfaces.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#apply"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/30"
            >
              Apply Now
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#tiers"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Explore Tiers
            </a>
          </div>
        </div>
      </section>

      {/* Partner Tiers Section */}
      <section id="tiers" className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Partner Tiers
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-gray-600">
            Choose the partnership level that aligns with your business goals.
            Each tier offers unique benefits tailored to your organization type.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {partnerTiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border ${tier.borderColor} bg-white p-8 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${tier.accentBg} ${tier.accentText} mb-4`}>
                {tier.name}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                {tier.description}
              </p>

              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                  Benefits
                </h4>
                <ul className="space-y-2.5">
                  {tier.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className={`w-4 h-4 ${tier.accentText} mt-0.5 flex-shrink-0`} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {tier.logos.length > 0 && (
                <div className="pt-6 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Featured Partners
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {tier.logos.map((logo) => (
                      <div
                        key={logo}
                        className="flex items-center justify-center h-12 rounded-lg bg-gray-50 border border-gray-100 text-xs font-semibold text-gray-500"
                      >
                        {logo}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Why Partner Section */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Why Partner With Us
            </h2>
            <p className="max-w-2xl mx-auto text-lg text-gray-600">
              We are committed to our partners&apos; success. Here is what you gain when you join our ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyPartnerBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-5">
                  <benefit.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Partner Success Stories
          </h2>
          <p className="max-w-2xl mx-auto text-lg text-gray-600">
            Hear from organizations that have grown their business through our partnership program.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {successStories.map((story) => (
            <div
              key={story.company}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <Quote className="absolute top-6 right-6 w-10 h-10 text-indigo-100" />
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {story.logo}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{story.company}</h4>
                  <p className="text-xs text-gray-500">Partner since {story.partnerSince}</p>
                </div>
              </div>
              <blockquote className="text-gray-700 text-sm leading-relaxed mb-5 italic">
                &ldquo;{story.quote}&rdquo;
              </blockquote>
              <div className="pt-5 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">{story.executive}</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                  {story.metric}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Existing Partners Logos Wall */}
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-lg text-gray-600">
              Over 200 companies have joined our partner ecosystem worldwide.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {existingPartners.map((partner) => (
              <div
                key={partner}
                className="flex items-center justify-center h-20 rounded-xl bg-white border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-default group"
              >
                <span className="text-sm font-semibold text-gray-400 group-hover:text-indigo-600 transition-colors tracking-tight">
                  {partner}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Application Form */}
      <section id="apply" className="max-w-7xl mx-auto px-6 py-20 sm:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Become a Partner
            </h2>
            <p className="text-lg text-gray-600">
              Fill out the form below and our partnerships team will reach out within 48 hours.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Application Received</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Thank you for your interest in partnering with us. Our team will review your application and get back to you within 48 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-10 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Company Name *
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Your company name"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Website *
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    required
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://yourcompany.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contact Name *
                  </label>
                  <input
                    id="contactName"
                    name="contactName"
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={handleChange}
                    placeholder="Full name"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Work Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="partnerType" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Partner Type *
                  </label>
                  <select
                    id="partnerType"
                    name="partnerType"
                    required
                    value={formData.partnerType}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow appearance-none bg-white"
                  >
                    <option value="">Select a partner type</option>
                    <option value="technology">Technology Partner</option>
                    <option value="solution">Solution Partner</option>
                    <option value="community">Community Partner</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Company Size *
                  </label>
                  <select
                    id="companySize"
                    name="companySize"
                    required
                    value={formData.companySize}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow appearance-none bg-white"
                  >
                    <option value="">Select company size</option>
                    <option value="1-10">1 - 10 employees</option>
                    <option value="11-50">11 - 50 employees</option>
                    <option value="51-200">51 - 200 employees</option>
                    <option value="201-1000">201 - 1,000 employees</option>
                    <option value="1000+">1,000+ employees</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="useCase" className="block text-sm font-medium text-gray-700 mb-1.5">
                  How do you plan to use UI-as-Code? *
                </label>
                <textarea
                  id="useCase"
                  name="useCase"
                  rows={4}
                  required
                  value={formData.useCase}
                  onChange={handleChange}
                  placeholder="Describe your integration idea, target audience, or how you envision the partnership..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-y"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                Submit Application
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Partner?
          </h2>
          <p className="max-w-xl mx-auto text-lg text-indigo-100 mb-10">
            Have questions before applying? Our partnerships team is happy to discuss how we can work together.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:partners@uiascode.com"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
            >
              <Mail className="w-4 h-4" />
              partners@uiascode.com
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg border border-white/30 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Schedule a Call
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
