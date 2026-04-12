/**
 * app/api/auth/google/route.ts
 *
 * Exchanges a Google OAuth authorization code for user profile data.
 * Runs server-side so the client secret is never exposed to the browser.
 *
 * Required environment variables (add to .env.local):
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
 *   GOOGLE_CLIENT_SECRET=...
 */

import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { code, redirect_uri } = await req.json();

    if (!code || !redirect_uri) {
      return NextResponse.json({ error: "Missing code or redirect_uri" }, { status: 400 });
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({ error: "Google OAuth not configured on server." }, { status: 500 });
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok || tokens.error) {
      console.error("Google token error:", tokens);
      return NextResponse.json({ error: tokens.error_description || "Token exchange failed" }, { status: 400 });
    }

    // Get user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const user = await userRes.json();

    if (!userRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Google user info" }, { status: 400 });
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      avatar: user.picture,
    });
  } catch (err) {
    console.error("Google OAuth API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}