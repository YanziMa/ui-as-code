import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { ErrorBoundary } from "@/components/error-boundary";
import { ToastProvider } from "@/components/toast";
import { ErrorMonitor } from "@/components/error-monitor";
import { BackToTop } from "@/components/back-to-top";
import { EmbedBadge } from "@/components/embed-badge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ui-as-code-web.vercel.app"),
  title: {
    default: "UI-as-Code — Fix your SaaS UI in 30 minutes",
    template: "%s | UI-as-Code",
  },
  description:
    "Modify any SaaS interface with natural language. AI generates the code, you preview the change, and improvements flow back to everyone.",
  keywords: [
    "SaaS",
    "UI modification",
    "AI code generation",
    "no-code",
    "browser extension",
    "unified diff",
    "pull request",
  ],
  authors: [{ name: "UI-as-Code Team" }],
  creator: "UI-as-Code",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ui-as-code-web.vercel.app",
    siteName: "UI-as-Code",
    title: "UI-as-Code — Fix your SaaS UI in 30 minutes",
    description:
      "Modify any SaaS interface with natural language. AI generates the code diff, you preview it in a sandbox, and submit improvements as PRs.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "UI-as-Code - AI-powered SaaS UI modification",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "UI-as-Code — Fix your SaaS UI in 30 minutes",
    description:
      "Modify any SaaS interface with natural language. AI generates the code, you preview the change.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <a
        href="#main-content"
        className="skip-link"
      >
        Skip to main content
      </a>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <ErrorMonitor />
          <ErrorBoundary>
            <Navbar />
            <main id="main-content" className="flex-1">{children}</main>
            <footer className="border-t border-zinc-200 bg-zinc-50 py-8 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <p className="text-sm text-zinc-500">
                    &copy; {new Date().getFullYear()} UI-as-Code. All rights reserved.
                  </p>
                  <div className="flex gap-6 text-sm text-zinc-500">
                    <a href="/dashboard" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Dashboard</a>
                    <a href="/pr" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">PR Dashboard</a>
                    <a href="/api-docs" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">API Docs</a>
                    <a href="/changelog" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Changelog</a>
                    <a href="/status" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Status</a>
                    <a href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Privacy</a>
                    <a href="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Terms</a>
                    <a href="/getting-started" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Guide</a>
                    <a
                      href="https://github.com/yanzima/ui-as-code"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                    >
                      GitHub
                    </a>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <EmbedBadge compact />
                  </div>
                </div>
              </div>
            </footer>
          </ErrorBoundary>
          <BackToTop />
        </ToastProvider>
      </body>
    </html>
  );
}
