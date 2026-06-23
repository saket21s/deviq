import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable image optimization for serverless
  images: {
    unoptimized: true,
  },

  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;