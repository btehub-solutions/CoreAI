import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output mode — keep as default (server) for full SSR on Vercel
  // output: "standalone", // uncomment only if self-hosting with Docker

  // Allow images from common external domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel.app",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  // Strict production headers via Vercel vercel.json — no duplication needed here

  // Disable x-powered-by header
  poweredByHeader: false,

  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Experimental features
  experimental: {
    // Optimize CSS (requires critters package if enabled)
    // optimizeCss: true,
  },

  // Webpack fallback (disable Turbopack-related issues)
  webpack(config) {
    return config;
  },
};

export default nextConfig;
