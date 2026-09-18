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
// Session / user-cache keys (must match the helpers in app/page.tsx)
export const SESSION_KEY = "deviq_session";
export const USERS_KEY = "deviq_users";

export const PENDING_OAUTH_KEY = "deviq_pending_oauth";
export const PENDING_OAUTH_LOCAL_KEY = "deviq_pending_oauth_local";

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
  // Cryptographically strong CSRF token (OAuth state must be unpredictable).
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Non-secure fallback (should never happen in browsers).
    return (
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36)
    );
  }
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

// ─── Backend resolution ──────────────────────────────────────────────────────
// Mirrors resolveBackend() in app/page.tsx so the OAuth exchange always hits
// the same backend the rest of the app talks to (local dev vs. hosted).
const RENDER_BACKEND = "https://deviq-backend-x6a9.onrender.com";
const LOCAL_BACKEND = "http://localhost:8000";

export function resolveApiBase(): string {
  try {
    const env = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
    if (env) return env;
  } catch {
    // ignore — fall through
  }
  try {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h === "localhost" || h === "127.0.0.1") return LOCAL_BACKEND;
    }
  } catch {
    // SSR — fall through to hosted backend
  }
  return RENDER_BACKEND;
}

/**
 * Fire-and-forget backend warm-up.
 *
 * The hosted backend sleeps when idle, so the first request after a lull can
 * take seconds. Call this right BEFORE redirecting the user to Google/GitHub:
 * while they spend 10–30s on the provider's consent screen, the backend wakes
 * up — so the code exchange when they return hits a warm server (~300ms
 * instead of seconds). Uses sendBeacon/keepalive so the ping survives the
 * navigation that follows immediately after.
 */
export function warmBackend(): void {
  try {
    const url = `${resolveApiBase()}/health`;
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        navigator.sendBeacon(url);
      } catch {
        // fall through to fetch below
      }
    }
    if (typeof fetch !== "undefined") {
      fetch(url, { method: "GET", keepalive: true, mode: "no-cors" }).catch(() => {});
    }
  } catch {
    // best-effort only — never break the login flow
  }
}

export function initiateGoogleLogin(): void {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");

  const state = generateState();
  saveStateForProvider(state, "google");

  // Wake the backend while the user is on Google's consent screen, so the
  // code exchange on return is fast.
  warmBackend();

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

  // Wake the backend while the user is on GitHub's consent screen.
  warmBackend();

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

  // ── 2. Exchange code with backend (keeps secrets server-side) ──────────
  const API = resolveApiBase();
  const redirectUri = `${window.location.origin}/auth/callback/${provider}`;

  const res = await fetch(`${API}/auth/oauth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri,
      provider,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any));
    const detail =
      typeof body?.detail === "string"
        ? body.detail
        : Array.isArray(body?.detail)
          ? body.detail.map((d: any) => d?.msg || JSON.stringify(d)).join(", ")
          : undefined;
    throw new Error(
      body?.error || detail || body?.message || `OAuth exchange failed (${res.status})`
    );
  }

  const data = await res.json();

  const user: OAuthUser = {
    name: data.name || data.user?.name || "User",
    email: data.email || data.user?.email || "",
    avatar:
      data.avatar ||
      data.user?.avatar ||
      data.user?.picture ||
      data.profile_picture_url,
    provider,
  };

  // Store token if backend returned one
  let token: string | undefined;
  const accessToken = data?.access_token;
  if (accessToken && typeof accessToken === "string") {
    token = accessToken;
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
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

export interface PendingOAuth {
  provider?: "google" | "github";
  code?: string;
  state?: string;
  createdAt?: number;
}

/**
 * Atomically claim the pending OAuth payload (read + clear).
 *
 * Clearing first guarantees a single-use authorization code is exchanged
 * exactly once, even if the callback page and the home page (or two tabs)
 * race to process it.
 */
export function claimPendingOAuth(): PendingOAuth | null {
  try {
    const raw =
      sessionStorage.getItem(PENDING_OAUTH_KEY) ||
      localStorage.getItem(PENDING_OAUTH_LOCAL_KEY);
    if (!raw) return null;
    clearPendingOAuth();
    try {
      return JSON.parse(raw) as PendingOAuth;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/** Re-store a pending payload (used only to let the home page retry after a
 *  transient network failure in the callback page). */
export function stashPendingOAuth(pending: PendingOAuth): void {
  try {
    const payload = JSON.stringify(pending);
    sessionStorage.setItem(PENDING_OAUTH_KEY, payload);
    localStorage.setItem(PENDING_OAUTH_LOCAL_KEY, payload);
  } catch {
    // ignore
  }
}

/**
 * Persist a signed-in user synchronously so the home page renders the
 * logged-in state on its very first paint — with zero network on the
 * critical path. Writes the same keys app/page.tsx reads on init
 * (deviq_session, auth_token, deviq_user, deviq_users).
 */
export function storeAuthSession(user: OAuthUser, token?: string): void {
  const name = (user.name || "").trim() || "User";
  const email = (user.email || "").trim();
  const avatar = (user.avatar || "").trim() || undefined;
  const provider = user.provider;
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    const session = JSON.stringify({ name, email, avatar, provider });
    localStorage.setItem(SESSION_KEY, session);
    localStorage.setItem(USER_KEY, session);
    if (email) {
      try {
        const raw = localStorage.getItem(USERS_KEY) || "[]";
        const users = JSON.parse(raw) as Record<string, unknown>[];
        const rest = Array.isArray(users)
          ? users.filter(
              (u) => ((u?.email as string) || "").toLowerCase() !== email.toLowerCase()
            )
          : [];
        // Never persist passwords in the browser.
        rest.push({ name, email, avatar, provider });
        localStorage.setItem(USERS_KEY, JSON.stringify(rest));
      } catch {
        // user-cache write is best-effort only
      }
    }
  } catch {
    // ignore — callers fall back to the pending-payload retry path
  }
}
