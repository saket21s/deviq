import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/github
 *
 * Exchanges an OAuth authorization code (from frontend) for a GitHub user profile.
 * The client_secret is kept server-side here, not exposed to the browser.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, redirect_uri } = body;

    if (!code || !redirect_uri) {
      return NextResponse.json(
        { error: "Missing code or redirect_uri" },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("GitHub OAuth not configured");
      return NextResponse.json(
        { error: "GitHub OAuth not configured" },
        { status: 500 }
      );
    }

    // Step 1: Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("GitHub token exchange failed:", errorText);
      return NextResponse.json(
        { error: "GitHub token exchange failed" },
        { status: 400 }
      );
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token from GitHub" },
        { status: 400 }
      );
    }

    // Step 2: Fetch user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "DevIQ-Frontend",
      },
    });

    if (!userRes.ok) {
      console.error("GitHub profile fetch failed");
      return NextResponse.json(
        { error: "Failed to fetch GitHub profile" },
        { status: 400 }
      );
    }

    const user = await userRes.json();
    let email = user.email;

    // GitHub may not return email in user profile; fetch separately
    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "DevIQ-Frontend",
        },
      });

      if (emailRes.ok) {
        const emails = await emailRes.json();
        const primary = emails.find((e: any) => e.primary);
        const verified = emails.find((e: any) => e.verified);
        email = primary?.email || verified?.email || emails[0]?.email;
      }
    }

    return NextResponse.json({
      name: user.name || user.login || "GitHub User",
      email,
      avatar: user.avatar_url,
    });
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
