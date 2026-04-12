/**
 * app/api/auth/github/route.ts
 *
 * Exchanges a GitHub OAuth authorization code for user profile data.
 * Runs server-side so the client secret is never exposed to the browser.
 *
 * Required environment variables (add to .env.local):
 *   NEXT_PUBLIC_GITHUB_CLIENT_ID=...
 *   GITHUB_CLIENT_SECRET=...
 */

import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({ error: "GitHub OAuth not configured on server." }, { status: 500 });
    }

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || tokens.error) {
      console.error("GitHub token error:", tokens);
      return NextResponse.json({ error: tokens.error_description || "Token exchange failed" }, { status: 400 });
    }

    // Fetch user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevIQ/1.0",
      },
    });

    const user = await userRes.json();

    if (!userRes.ok) {
      return NextResponse.json({ error: "Failed to fetch GitHub user info" }, { status: 400 });
    }

    // GitHub may not expose email publicly — fetch it explicitly
    let email = user.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DevIQ/1.0",
        },
      });

      if (emailsRes.ok) {
        const emails: { email: string; primary: boolean; verified: boolean }[] = await emailsRes.json();
        const primary = emails.find(e => e.primary && e.verified);
        email = primary?.email ?? emails[0]?.email ?? null;
      }
    }

    return NextResponse.json({
      name: user.name,
      email,
      avatar: user.avatar_url,
      login: user.login,
    });
  } catch (err) {
    console.error("GitHub OAuth API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}