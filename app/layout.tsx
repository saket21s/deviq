import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SPARedirect from "./SPARedirect";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  OG_IMAGE,
  TWITTER_HANDLE,
  websiteJsonLd,
  organizationJsonLd,
  softwareAppJsonLd,
} from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "developer analytics",
    "developer profile",
    "github analytics",
    "leetcode stats",
    "codeforces rating",
    "developer score",
    "coding portfolio",
    "dev score calculator",
    "github stats",
    "leetcode profile",
    "codeforces profile",
    "developer comparison",
    "competitive programming stats",
    "coding heatmap",
    "developer role fit",
    "ai developer insights",
    "github language distribution",
    "developer portfolio analyzer",
    "deviq",
    "developer iq",
    "coding score",
    "programming profile analysis",
    "software engineer analytics",
    "full stack developer score",
  ],
  authors: [{ name: "DevIQ", url: SITE_URL }],
  creator: "DevIQ",
  publisher: "DevIQ",
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
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
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "DevIQ — Developer Analytics Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE],
    creator: TWITTER_HANDLE,
  },
  category: "technology",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  // Verification tokens come from env so no secrets are hard-coded.
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION / NEXT_PUBLIC_BING_SITE_VERIFICATION
  // in hosting env vars after registering Search Console / Webmaster Tools.
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
      : {}),
  },
};

const jsonLdBlocks = [websiteJsonLd(), organizationJsonLd(), softwareAppJsonLd()];
// NOTE: FAQPage schema lives on individual pages (next to the visible
// <FaqSection /> content) instead of globally, so structured data always
// matches visible content.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0A0A0A" />
        {jsonLdBlocks.map((b, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }}
          />
        ))}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SPARedirect />
        {children}
      </body>
    </html>
  );
}
