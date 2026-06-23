import type { NextConfig } from "next";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL || "https://developer-portfolio-backend-bu76.onrender.com";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${BACKEND}/:path*`,
      },
    ];
  },
};

export default nextConfig;