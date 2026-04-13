/**
 * lib/oauth.ts
 *
 * OAuth helpers for Google and GitHub sign-in flows.
 *
 * Key design:
 * - Pending OAuth payloads are cleared BEFORE attempting exchange,
 *   so a failed exchange never causes a retry loop.
 * - exchangeCodeForToken calls /api/auth/google (or /api/auth/github)
 *   which keeps the client secret server-side.
 */

// ─── Storage keys (must match page.tsx and callback pages) ──────────────────
export const AUTH_TOKEN_KEY = "auth_token";
export const USER_KEY = "deviq_user";

const PENDING_OAUTH_KEY = "deviq_pending_oauth";
const PENDING_OAUTH_LOCAL_KEY = "deviq_pending_oauth_local";

// One state key per provider so concurrent flows don't collide
const oauthStateKey = (provider: string) => `oauth_state_local_${provider}`;

// ─── Types ───────────────────────────────────────────────────────────────────
export interface OAuthUser {
  name: string;
  email: string;
  avatar?: string;
  provider?: "google" | "github";
}

export interface ExchangeResult {
  user: OAuthUser;
  /** JWT returned by YOUR backend after you call /auth/oauth */
  token?: string;
}

// ─── State helpers ───────────────────────────────────────────────────────────

function generateState(): string {
  return (
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  );
}

function saveStateForProvider(state: string, provider: string): void {
  try {
    localStorage.setItem(oauthStateKey(provider), state);
  } catch {
    // storage unavailable — best-effort only
  }
}

export function verifyStateForProvider(
  state: string,
  provider: string
): boolean {
  try {
    const stored = localStorage.getItem(oauthStateKey(provider));
    // Always clean up immediately after reading
    localStorage.removeItem(oauthStateKey(provider));
    if (!stored) return true; // no stored state → skip check (popup flows)
    return stored === state;
  } catch {
    return true;
  }
}

// ─── Initiation helpers ──────────────────────────────────────────────────────

export function initiateGoogleLogin(): void {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");

  const state = generateState();
  saveStateForProvider(state, "google");

  const redirectUri = `${window.location.origin}/auth/callback/google`;

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope:
        "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      state,
      access_type: "offline",
      prompt: "select_account consent",
    });

  window.location.assign(url);
}

export function initiateGithubLogin(): void {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GITHUB_CLIENT_ID is not set");

  const state = generateState();
  saveStateForProvider(state, "github");

  const redirectUri = `${window.location.origin}/auth/callback/github`;

  const url =
    "https://github.com/login/oauth/authorize?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state,
    });

  window.location.assign(url);
}

// ─── Code exchange ───────────────────────────────────────────────────────────

/**
 * Exchanges an OAuth authorization code for a user profile.
 *
 * IMPORTANT: This function clears the pending OAuth storage keys BEFORE
 * making the network call. This guarantees that even if the exchange fails,
 * the effect in page.tsx will NOT find a pending payload and retry — which
 * is what causes the redirect loop.
 */
export async function exchangeCodeForToken(
  code: string,
  provider: "google" | "github"
): Promise<ExchangeResult> {
  // ── 1. Clear pending storage FIRST (prevents retry loops) ──────────────
  clearPendingOAuth();

  // ── 2. Call the Next.js API route (keeps secrets server-side) ──────────
  const redirectUri = `${window.location.origin}/auth/callback/${provider}`;

  const apiRoute =
    provider === "google" ? "/api/auth/google" : "/api/auth/github";

  const res = await fetch(apiRoute, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `OAuth exchange failed (${res.status})`);
  }

  const profile = await res.json() as {
    name?: string;
    email?: string;
    avatar?: string;
    picture?: string;
  };

  const user: OAuthUser = {
    name: profile.name || "User",
    email: profile.email || "",
    avatar: profile.avatar || profile.picture,
    provider,
  };

  // ── 3. Optionally register/login with YOUR backend ────────────────────
  // If your backend returns a JWT token, store it here.
  // This is a best-effort call — failures fall back to local session.
  let token: string | undefined;
  try {
    const API =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "https://developer-portfolio-backend-bu76.onrender.com";

    const oauthRes = await fetch(`${API}/auth/oauth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider,
        profile_picture_url: user.avatar,
        user: { name: user.name, email: user.email, picture: user.avatar },
      }),
    });

    if (oauthRes.ok) {
      const data = await oauthRes.json();
      token = data?.access_token;
      if (token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
      }
    }
  } catch {
    // Backend unavailable — local session will be used as fallback
  }

  return { user, token };
}

// ─── Auth storage helpers ────────────────────────────────────────────────────

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): OAuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearPendingOAuth();
    // Remove all provider state keys
    Object.keys(localStorage)
      .filter((k) => k.startsWith("oauth_state_local_"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

function clearPendingOAuth(): void {
  try {
    sessionStorage.removeItem(PENDING_OAUTH_KEY);
    localStorage.removeItem(PENDING_OAUTH_LOCAL_KEY);
  } catch {
    // ignore
  }
}
