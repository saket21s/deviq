import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SPARedirect from "./SPARedirect";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://deviq.online";
const SITE_NAME = "DevIQ";
const TITLE = "DevIQ — Developer Analytics Platform | GitHub, LeetCode & Codeforces Score";
const DESCRIPTION =
  "Analyze your developer profile across GitHub, LeetCode, and Codeforces. Get a unified dev score, AI insights, role-fit analysis, contribution heatmaps, head-to-head comparisons, and personalized improvement plans — all in one place.";
const KEYWORDS = [
  "developer analytics", "developer profile", "github analytics", "leetcode stats",
  "codeforces rating", "developer score", "coding portfolio", "dev score calculator",
  "github stats", "leetcode profile", "codeforces profile", "developer comparison",
  "competitive programming stats", "coding heatmap", "developer role fit",
  "ai developer insights", "github language distribution", "developer portfolio analyzer",
  "deviq", "developer iq", "coding score", "programming profile analysis",
  "software engineer analytics", "full stack developer score",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: KEYWORDS,
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
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@deviq_online",
  },
  category: "technology",
  other: {
    "google-site-verification": "",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "GitHub repository analytics and language distribution",
    "LeetCode problem solving statistics",
    "Codeforces competitive programming rating tracker",
    "Unified developer score across platforms",
    "AI-powered developer insights and improvement plans",
    "Developer role-fit analysis",
    "Head-to-head developer comparison",
    "Contribution heatmap and streak tracking",
    "Company-tagged practice problems",
    "Shareable developer profile cards",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is DevIQ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "DevIQ is a free developer analytics platform that combines your GitHub, LeetCode, and Codeforces profiles into a single developer score with AI-powered insights, role-fit analysis, and improvement plans.",
      },
    },
    {
      "@type": "Question",
      name: "How is the DevIQ score calculated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The DevIQ score is a weighted combination of your GitHub activity (repositories, stars, contributions), LeetCode problem-solving stats (easy, medium, hard), and Codeforces competitive programming rating.",
      },
    },
    {
      "@type": "Question",
      name: "Is DevIQ free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, DevIQ is completely free. Just enter your GitHub, LeetCode, or Codeforces usernames to instantly analyze your developer profile.",
      },
    },
    {
      "@type": "Question",
      name: "What developer roles can DevIQ detect?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "DevIQ analyzes your repositories, languages, and stats to suggest roles including Frontend Developer, Backend Developer, Full-Stack Developer, Mobile Developer, Application Developer, ML/Data Engineer, DevOps/Cloud Engineer, Game Developer, Security Engineer, Embedded/IoT Developer, Blockchain Developer, and Competitive Programmer.",
      },
    },
    {
      "@type": "Question",
      name: "Can I compare my profile with another developer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, DevIQ has a head-to-head comparison mode where you can compare two developer profiles side-by-side across all metrics including score, repositories, problems solved, and ratings.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href={SITE_URL} />
        <meta name="theme-color" content="#0A0A0A" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
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
