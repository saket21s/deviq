import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/analyze",  destination: "/" },
      { source: "/compare",  destination: "/" },
      { source: "/profile",  destination: "/" },
      { source: "/settings", destination: "/" },
    ];
  },
};

export default nextConfig;