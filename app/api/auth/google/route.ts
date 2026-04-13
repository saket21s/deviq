import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/google
 *
 * Exchanges an OAuth authorization code (from frontend) for a Google user profile.
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

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Google OAuth not configured");
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 }
      );
    }

    // Step 1: Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Google token exchange failed:", errorText);
      return NextResponse.json(
        { error: "Google token exchange failed" },
        { status: 400 }
      );
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token from Google" },
        { status: 400 }
      );
    }

    // Step 2: Fetch user profile
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!profileRes.ok) {
      console.error("Google profile fetch failed");
      return NextResponse.json(
        { error: "Failed to fetch Google profile" },
        { status: 400 }
      );
    }

    const profile = await profileRes.json();

    return NextResponse.json({
      name: profile.name || profile.given_name || "User",
      email: profile.email,
      avatar: profile.picture,
    });
  } catch (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
