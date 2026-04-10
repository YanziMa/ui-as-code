/**
 * Structured data utilities: JSON-LD generation, schema.org types, Open Graph,
 * Twitter Cards, RSS/Atom feed generation, sitemap XML.
 */

// --- JSON-LD / Schema.org ---

export interface JsonLdContext {
  "@context": "https://schema.org";
  [key: string]: unknown;
}

/** Generate JSON-LD for a WebSite */
export function generateWebsiteSchema(options: {
  name: string;
  url: string;
  description?: string;
  searchActionUrl?: string;
  logo?: string;
  sameAs?: string[];
}): JsonLdContext {
  const schema: JsonLdContext = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: options.name,
    url: options.url,
  };

  if (options.description) schema.description = options.description;
  if (options.logo) schema.logo = options.logo;
  if (options.sameAs?.length) schema.sameAs = options.sameAs;

  if (options.searchActionUrl) {
    schema.potentialAction = {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: options.searchActionUrl,
      },
      "query-input": "required name=search_term_string",
    };
  }

  return schema;
}

/** Generate JSON-LD for an Article/BlogPost */
export function generateArticleSchema(options: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  publisherName: string;
  publisherLogo?: string;
}): JsonLdContext {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.title,
    description: options.description,
    url: options.url,
    ...(options.image ? { image: { "@type": "ImageObject", url: options.image } } : {}),
    datePublished: options.datePublished,
    ...(options.dateModified ? { dateModified: options.dateModified } : {}),
    author: {
      "@type": "Person",
      name: options.authorName,
      ...(options.authorUrl ? { url: options.authorUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: options.publisherName,
      ...(options.publisherLogo
        ? { logo: { "@type": "ImageObject", url: options.publisherLogo } }
        : {}),
    },
  };
}

/** Generate JSON-LD for BreadcrumbList */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>): JsonLdContext {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** Generate JSON-LD for Organization */
export function generateOrganizationSchema(options: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  contactEmail?: string;
  socialProfiles?: string[];
  foundingDate?: string;
  numberOfEmployees?: string;
}): JsonLdContext {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: options.name,
    url: options.url,
    ...(options.logo ? { logo: options.logo } : {}),
    ...(options.description ? { description: options.description } : {}),
    ...(options.contactEmail ? { email: options.contactEmail } : {}),
    ...(options.socialProfiles?.length ? { sameAs: options.socialProfiles } : {}),
    ...(options.foundingDate ? { foundingDate: options.foundingDate } : {}),
    ...(options.numberOfEmployees ? { numberOfEmployees: options.numberOfEmployees } : {}),
  };
}

/** Generate JSON-LD for FAQ page */
export function generateFaqSchema(faqs: Array<{ question: string; answer: string }>): JsonLdContext {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/** Generate JSON-LD for SoftwareApplication */
export function generateSoftwareSchema(options: {
  name: string;
  url: string;
  description: string;
  operatingSystem?: string;
  applicationCategory?: string;
  offers?: { price: string; currency: string };
  aggregateRating?: { ratingValue: number; ratingCount: number };
  screenshot?: string;
}): JsonLdContext {
  const schema: JsonLdContext = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: options.name,
    url: options.url,
    description: options.description,
    ...(options.operatingSystem ? { operatingSystem: options.operatingSystem } : {}),
    ...(options.applicationCategory ? { applicationCategory: options.applicationCategory } : {}),
    ...(options.offers ? { offers: { "@type": "Offer", ...options.offers } } : {}),
    ...(options.aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ...options.aggregateRating,
          },
        }
      : {}),
    ...(options.screenshot ? { screenshot: options.screenshot } : {}),
  };

  return schema;
}

// --- Open Graph ---

export interface OpenGraphData {
  title: string;
  description: string;
  url: string;
  siteName?: string;
  type?: "website" | "article" | "product" | "profile";
  image?: string;
  imageAlt?: string;
  locale?: string;
  /** For article type */
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
  tags?: string[];
}

/** Generate Open Graph meta tags as HTML string */
export function generateOpenGraph(og: OpenGraphData): string {
  const tags: string[] = [
    `<meta property="og:title" content="${escapeAttr(og.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(og.description)}" />`,
    `<meta property="og:url" content="${escapeAttr(og.url)}" />`,
    `<meta property="og:type" content="${og.type ?? "website"}" />`,
  ];

  if (og.siteName) tags.push(`<meta property="og:site_name" content="${escapeAttr(og.siteName)}" />`);
  if (og.image) tags.push(`<meta property="og:image" content="${escapeAttr(og.image)}" />`);
  if (og.imageAlt) tags.push(`<meta property="og:image:alt" content="${escapeAttr(og.imageAlt)}" />`);
  if (og.locale) tags.push(`<meta property="og:locale" content="${escapeAttr(og.locale)}" />`);

  // Article-specific
  if (og.type === "article") {
    if (og.publishedTime) tags.push(`<meta property="article:published_time" content="${og.publishedTime}" />`);
    if (og.modifiedTime) tags.push(`<meta property="article:modified_time" content="${og.modifiedTime}" />`);
    for (const author of og.authors ?? []) {
      tags.push(`<meta property="article:author" content="${escapeAttr(author)}" />`);
    }
    if (og.section) tags.push(`<meta property="article:section" content="${escapeAttr(og.section)}" />`);
    for (const tag of og.tags ?? []) {
      tags.push(`<meta property="article:tag" content="${escapeAttr(tag)}" />`);
    }
  }

  return tags.join("\n");
}

// --- Twitter Cards ---

export interface TwitterCardData {
  card: "summary" | "summary_large_image" | "app" | "player";
  title: string;
  description: string;
  image?: string;
  site?: string;         // @username of website
  creator?: string;       // @username of content creator
}

/** Generate Twitter Card meta tags */
export function generateTwitterCard(tc: TwitterCardData): string {
  const tags: string[] = [
    `<meta name="twitter:card" content="${tc.card}" />`,
    `<meta name="twitter:title" content="${escapeAttr(tc.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(tc.description)}" />`,
  ];
  if (tc.image) tags.push(`<meta name="twitter:image" content="${escapeAttr(tc.image)}" />`);
  if (tc.site) tags.push(`<meta name="twitter:site" content="@${tc.site.replace("@", "")}" />`);
  if (tc.creator) tags.push(`<meta name="twitter:creator" content="@${tc.creator.replace("@", "")}" />`);
  return tags.join("\n");
}

// --- RSS Feed ---

export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: Date | string;
  guid?: string;
  author?: string;
  categories?: string[];
  enclosure?: { url: string; length: number; type: string };
}

export interface RssFeedOptions {
  title: string;
  link: string;
  description: string;
  language?: string;
  copyright?: string;
  managingEditor?: string;
  webMaster?: string;
  lastBuildDate?: Date | string;
  ttl?: number; // minutes
  items: RssItem[];
}

/** Generate RSS 2.0 XML */
export function generateRssFeed(options: RssFeedOptions): string {
  const formatDate = (d: Date | string): string => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toUTCString();
  };

  const itemsXml = options.items
    .map((item) => `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>${escapeXml(item.link)}</link>
    <description><![CDATA[${item.description}]]></description>
    ${item.pubDate ? `    <pubDate>${formatDate(item.pubDate)}</pubDate>` : ""}
    ${item.guid ? `    <guid isPermaLink="false">${escapeXml(item.guid)}</guid>` : ""}
    ${item.author ? `    <author>${escapeXml(item.author)}</author>` : ""}
    ${(item.categories ?? []).map((c) => `    <category>${escapeXml(c)}</category>`).join("\n")}
    ${item.enclosure ? `    <enclosure url="${escapeXml(item.enclosure.url)}" length="${item.enclosure.length}" type="${escapeXml(item.enclosure.type)}" />` : ""}
  </item>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(options.title)}</title>
    <link>${escapeXml(options.link)}</link>
    <description>${escapeXml(options.description)}</description>
    ${options.language ? `    <language>${options.language}</language>` : ""}
    ${options.copyright ? `    <copyright>${escapeXml(options.copyright)}</copyright>` : ""}
    ${options.managingEditor ? `    <managingEditor>${escapeXml(options.managingEditor)}</managingEditor>` : ""}
    ${options.webMaster ? `    <webMaster>${escapeXml(options.webMaster)}</webMaster>` : ""}
    ${options.lastBuildDate ? `    <lastBuildDate>${formatDate(options.lastBuildDate)}</lastBuildDate>` : ""}
    ${options.ttl ? `    <ttl>${options.ttl}</ttl>` : ""}
    <atom:link href="${escapeXml(options.link)}/rss" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}

// --- Sitemap ---

export interface SitemapEntry {
  loc: string;
  lastmod?: Date | string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number; // 0.0 to 1.0
}

/** Generate sitemap XML */
export function generateSitemap(entries: SitemapEntry[]): string {
  const formatDate = (d: Date | string): string => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toISOString().split("T")[0]!;
  };

  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    ${entry.lastmod ? `    <lastmod>${formatDate(entry.lastmod)}</lastmod>` : ""}
    ${entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : ""}
    ${entry.priority !== undefined ? `    <priority>${entry.priority.toFixed(1)}</priority>` : ""}
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/** Generate sitemap index for multiple sitemaps */
export function generateSitemapIndex(sitemaps: Array<{ loc: string; lastmod?: Date | string }>): string {
  const formatDate = (d: Date | string): string => {
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toISOString().split("T")[0]!;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((s) => `  <sitemap>
    <loc>${escapeXml(s.loc)}</loc>
    ${s.lastmod ? `    <lastmod>${formatDate(s.lastmod)}</lastmod>` : ""}
  </sitemap>`).join("\n")}
</sitemapindex>`;
}

// --- robots.txt ---

export interface RobotsTxtRules {
  userAgent: string | "*";
  allow: string[];
  disallow: string[];
  sitemap?: string;
  crawlDelay?: number;
}

/** Generate robots.txt content */
export function generateRobotsTxt(rules: RobotsTxtRules[]): string {
  return rules
    .map((rule) => [
      `User-agent: ${rule.userAgent}`,
      ...rule.allow.map((p) => `Allow: ${p}`),
      ...rule.disallow.map((p) => `Disallow: ${p}`),
      rule.crawlDelay ? `Crawl-delay: ${rule.crawlDelay}` : "",
      rule.sitemap ? `Sitemap: ${rule.sitemap}` : "",
      "",
    ].filter(Boolean).join("\n"))
    .join("\n")
    .trim() + "\n";
}

// --- Manifest (Web App) ---

export interface WebAppManifest {
  name: string;
  short_name: string;
  start_url: string;
  display: "fullscreen" | "standalone" | "minimal-ui" | "browser";
  background_color: string;
  theme_color: string;
  description?: string;
  icons?: Array<{ src: string; sizes: string; type: string }>;
  orientation?: "portrait" | "landscape" | "any";
  categories?: string[];
}

/** Generate web app manifest JSON */
export function generateManifest(manifest: WebAppManifest): string {
  return JSON.stringify(manifest, null, 2);
}

// --- Helpers ---

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Inject structured data into document head */
export function injectStructuredData(data: Record<string, unknown>, id?: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  if (id) script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
  return script;
}

/** Remove structured data from head by ID */
export function removeStructuredData(id: string): void {
  const el = document.querySelector(`script[type="application/ld+json"]#${id}`);
  el?.remove();
}
