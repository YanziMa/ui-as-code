import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for development warnings
  reactStrictMode: true,

  // Turbopack configuration
  turbopack: {
    // Root directory for monorepo
    root: "..",
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Security headers for all responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/home",
        destination: "/",
        permanent: true,
      },
      {
        source: "/help",
        destination: "https://github.com/YanziMa/ui-as-code#readme",
        permanent: false,
        basePath: false,
      },
    ];
  },

  // Experimental features
  experimental: {
    // Optimize package imports for smaller bundles
    optimizePackageImports: ["lucide-react", "recharts", "@supabase/supabase-js"],
  },

  // TypeScript config
  typescript: {
    ignoreBuildErrors: false,
  },

  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
