import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },

  compress: true,
  poweredByHeader: false,

  eslint: {
    ignoreDuringBuilds: true,
  },

  async headers() {
    // Pragmatic CSP: the app uses inline styles/scripts heavily, so
    // 'unsafe-inline' is required there, and the Monaco code editor needs
    // 'unsafe-eval' for its web workers (blocking it breaks the playground).
    // Monaco itself loads its scripts, workers, icon font, AND stylesheet
    // from the pinned jsDelivr CDN (see components/CodeEditor.tsx), so that
    // origin is allowlisted below — and nowhere else. Blocking any one of
    // these leaves a half-styled editor with broken overlays that eat clicks.
    // Documented limitation: the policy still blocks all other external
    // scripts, plugins, frames, and constrains network/image targets to
    // reduce exfiltration paths.
    const MONACO_CDN = "https://cdn.jsdelivr.net";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${MONACO_CDN}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      `font-src 'self' https://fonts.gstatic.com data: ${MONACO_CDN}`,
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://api.github.com http://localhost:* https://*.onrender.com https://cdn.jsdelivr.net",
      `worker-src 'self' blob: ${MONACO_CDN}`,
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};

export default nextConfig;
