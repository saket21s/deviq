import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during Vercel builds (prevents build failures)
  eslint: {
    ignoreDuringBuilds: true,
  },

  async rewrites() {
    return [
      { source: "/analyze", destination: "/" },
      { source: "/compare", destination: "/" },
      { source: "/profile", destination: "/" },
      { source: "/settings", destination: "/" },
    ];
  },
};

export default nextConfig;