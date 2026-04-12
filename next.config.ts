import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Only enable static export for production builds (GitHub Pages)
  // In development, use the default Next.js server for proper routing
  ...(isProd ? { output: 'export' } : {}),

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Trailing slash for better GitHub Pages compatibility (production only)
  ...(isProd ? { trailingSlash: true } : {}),

  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;