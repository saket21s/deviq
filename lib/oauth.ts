/**
 * Direct OAuth2 implementation without Firebase
 * Handles Google and GitHub OAuth flows
 */

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
export const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "";
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Local storage keys
export const AUTH_TOKEN_KEY = "auth_token";
export const USER_KEY = "deviq_user";

const OAUTH_STATE_SESSION_PREFIX = "oauth_state_session_";
const OAUTH_STATE_LOCAL_PREFIX = "oauth_state_local_";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "google" | "github";
}

/**
 * Get the OAuth callback URL for the current environment
 */
export function getCallbackUrl(provider: "google" | "github"): string {
  if (typeof window === "undefined") return "";
  
  const baseUrl = window.location.origin;
  const path = provider === "google" ? "/auth/callback/google" : "/auth/callback/github";
  return `${baseUrl}${path}`;
}

/**
 * Initiate Google OAuth login
 */
export function initiateGoogleLogin(): void {
  const callbackUrl = getCallbackUrl("google");
  const scope = "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";
  const state = generateRandomState();
  
  // Store in both sessionStorage and localStorage to survive redirect edge cases
  storeOAuthState("google", state);
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope,
    state,
    access_type: "offline",
    prompt: "consent",
  });
  
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Initiate GitHub OAuth login
 */
export function initiateGithubLogin(): void {
  const callbackUrl = getCallbackUrl("github");
  const scope = "user:email";
  const state = generateRandomState();
  
  // Store in both sessionStorage and localStorage to survive redirect edge cases
  storeOAuthState("github", state);
  
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: callbackUrl,
    scope,
    state,
    allow_signup: "true",
  });
  
  window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for token (calls backend)
 */
export async function exchangeCodeForToken(
  code: string,
  provider: "google" | "github"
): Promise<{ token: string; user: AuthUser }> {
  const callbackUrl = getCallbackUrl(provider);

  const endpoint = `${API_BASE}/auth/oauth`;
  let response: Response | null = null;
  let lastNetworkError: unknown = null;

  // Retry transient network failures (common on cold starts / flaky mobile networks).
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          code,
          redirect_uri: callbackUrl,
        }),
      });
      break;
    } catch (err) {
      lastNetworkError = err;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        continue;
      }
    }
  }

  if (!response) {
    const message = lastNetworkError instanceof Error ? lastNetworkError.message : "Network request failed";
    throw new Error(`OAuth network error: ${message}`);
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `OAuth exchange failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  const userInfo = data.user || {};
  
  return {
    token: data.access_token,
    user: {
      id: userInfo.id || userInfo.email,
      name: userInfo.name || userInfo.username,
      email: userInfo.email,
      avatar: userInfo.profile_picture_url || userInfo.picture || userInfo.avatar,
      provider,
    },
  };
}

/**
 * Save authentication to local storage
 */
export function saveAuthToken(token: string, user: AuthUser): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Get authentication from local storage
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Get user from local storage
 */
export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Clear authentication from local storage
 */
export function clearAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Generate random state for OAuth flow
 */
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Verify OAuth state matches
 */
export function verifyState(state: string): boolean {
  // Backward-compatible fallback (older builds used a shared key)
  const stored = sessionStorage.getItem("oauth_state");
  sessionStorage.removeItem("oauth_state");
  return stored === state;
}

export function verifyStateForProvider(state: string, provider: "google" | "github"): boolean {
  if (!state) return false;

  const sessionKey = `${OAUTH_STATE_SESSION_PREFIX}${provider}`;
  const localKey = `${OAUTH_STATE_LOCAL_PREFIX}${provider}`;

  const sessionState = sessionStorage.getItem(sessionKey);
  const localState = localStorage.getItem(localKey);

  // Cleanup state values once read to avoid replay
  sessionStorage.removeItem(sessionKey);
  localStorage.removeItem(localKey);

  return sessionState === state || localState === state;
}

function storeOAuthState(provider: "google" | "github", state: string): void {
  const sessionKey = `${OAUTH_STATE_SESSION_PREFIX}${provider}`;
  const localKey = `${OAUTH_STATE_LOCAL_PREFIX}${provider}`;
  sessionStorage.setItem(sessionKey, state);
  localStorage.setItem(localKey, state);
}

/**
 * Make authenticated API request
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}
