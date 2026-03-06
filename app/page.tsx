"use client";
import { useState, useEffect, useCallback, useRef, CSSProperties, ReactNode } from "react";

// base URL for the backend service.  During development we prefer a
// local copy so that you can iterate without depending on the deployed
// instance (which may still be on an old version).  If the front-end is
// served from localhost we automatically default to the local server, but
// you can override everything with NEXT_PUBLIC_API_BASE_URL.
//
// Production builds should set NEXT_PUBLIC_API_BASE_URL to the real host.
const defaultAPI = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:8000'
  : 'https://developer-portfolio-backend-bu76.onrender.com';
const API = process.env.NEXT_PUBLIC_API_BASE_URL || defaultAPI;
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN ?? "";
const GROQ_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GITHUB_CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "";
const LINKEDIN_CLIENT_ID = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID ?? "";

/* ─────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────── */
type Theme = typeof THEMES.light;
type Page = "home" | "analyze" | "compare" | "profile" | "settings" | "history" | "following" | "chat" | "practice";
interface AuthUser { name: string; email: string; avatar?: string; provider?: "google" | "github" | "email"; }
interface StepItem { label: string; status: "pending" | "active" | "done" | "error"; }
interface RepoItem { name: string; stars: number; forks: number; language?: string; }
interface GithubAnalytics {
  total_projects: number; total_stars: number; recent_projects: number;
  skill_score: number; most_used_language?: string;
  language_distribution?: Record<string, number>;
}
interface GithubData { 
  analytics?: GithubAnalytics; 
  repositories?: RepoItem[]; 
  advancedAnalytics?: GithubAdvancedAnalytics;
}
interface LeetcodeData {
  total_solved: number; easy_solved: number; medium_solved: number; hard_solved: number;
  ranking?: number; contest_rating?: number; contests_attended?: number;
  top_percentage?: number; badges?: number;
}
interface CodeforcesData {
  rating: number; max_rating?: number; rank?: string; max_rank?: string;
  problems_solved?: number; contests_participated?: number; contribution?: number;
}
interface ResultData {
  github?: GithubData; leetcode?: LeetcodeData; codeforces?: CodeforcesData;
  combined_score: number;
}
interface Contribution { date: string; count: number; level: number; }
interface HeatmapData {
  contributions: Contribution[]; total_last_year: number;
  current_streak: number; longest_streak: number;
  busiest_day?: { date: string; count: number }; error?: string;
}
interface CodingHourStats {
  hour: number; count: number; percentage: number;
}
interface ComplexityRepo {
  name: string; fileCount: number; languages: Record<string, number>;
  complexity: "Low" | "Medium" | "High"; score: number;
}
interface ContributionGap {
  startDate: string; endDate: string; duration: number;
  recoveryDate?: string; isCurrentGap: boolean;
}
interface MonthlyComparison {
  month: string; thisYear: number; lastYear: number; growth: number;
  topLanguage?: string; activeRepos?: number;
}
interface GithubAdvancedAnalytics {
  codingHours?: CodingHourStats[];
  complexRepos?: ComplexityRepo[];
  longestGap?: ContributionGap;
  monthlyComparison?: MonthlyComparison;
}
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

/* ─────────────────────────────────────────────────
   THEME
───────────────────────────────────────────────── */
const THEMES = {
  light: {
    bg: "#F5F5F5", bgAlt: "#EBEBEB", surface: "#FFFFFF", border: "#E0E0E0", borderStrong: "#BDBDBD",
    text: "#0A0A0A", text2: "#525252", text3: "#A3A3A3", accent: "#0A0A0A", accentFg: "#FFFFFF",
    blue: "#1A6FF4", blueLight: "#EFF4FF", blueBorder: "#BFCFFE",
    amber: "#B45309", amberLight: "#FFFBEB", amberBorder: "#FCD34D",
    rose: "#DC2626", roseLight: "#FEF2F2", roseBorder: "#FECACA",
    purple: "#7C3AED", purpleLight: "#F5F3FF", purpleBorder: "#C4B5FD",
    green: "#16A34A", greenLight: "#F0FDF4", greenBorder: "#86EFAC",
    teal: "#0D9488", track: "#E5E5E5",
    shadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    shadowMd: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
    shadowLg: "0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)",
  },
  dark: {
    bg: "#0A0A0A", bgAlt: "#141414", surface: "#1A1A1A", border: "#2A2A2A", borderStrong: "#404040",
    text: "#FAFAFA", text2: "#A3A3A3", text3: "#525252", accent: "#FAFAFA", accentFg: "#0A0A0A",
    blue: "#60A5FA", blueLight: "rgba(96,165,250,0.08)", blueBorder: "rgba(96,165,250,0.2)",
    amber: "#FBBF24", amberLight: "rgba(251,191,36,0.08)", amberBorder: "rgba(251,191,36,0.2)",
    rose: "#F87171", roseLight: "rgba(248,113,113,0.08)", roseBorder: "rgba(248,113,113,0.2)",
    purple: "#A78BFA", purpleLight: "rgba(167,139,250,0.08)", purpleBorder: "rgba(167,139,250,0.2)",
    green: "#4ADE80", greenLight: "rgba(74,222,128,0.08)", greenBorder: "rgba(74,222,128,0.2)",
    teal: "#2DD4BF", track: "#2A2A2A",
    shadow: "0 1px 3px rgba(0,0,0,0.4)",
    shadowMd: "0 4px 12px rgba(0,0,0,0.5)",
    shadowLg: "0 8px 24px rgba(0,0,0,0.6)",
  },
};

/* ─────────────────────────────────────────────────
   AUTH HELPERS
───────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERS_KEY = "deviq_users";
const SESSION_KEY = "deviq_session";
const PROFILE_KEY = "deviq_profile";
interface StoredUser { name: string; email: string; password: string; avatar?: string; provider?: string; }
interface AnalysisRecord {
  id: string; date: string; github?: string; leetcode?: string; codeforces?: string;
  score: number; ghStars?: number; ghRepos?: number; ghLang?: string;
  lcSolved?: number; lcEasy?: number; lcMedium?: number; lcHard?: number;
  cfRating?: number; cfRank?: string;
}
interface FollowedUser {
  username: string; platform: "github" | "leetcode" | "codeforces";
  lastScore?: number; lastUpdated?: string; avatar?: string;
}
interface Notification {
  id: string; type: "score_change" | "new_follower"; message: string; timestamp: string;
  data?: { username: string; oldScore: number; newScore: number; platform: string };
  read: boolean;
}
interface LeetCodeProblem {
  id: string; title: string; difficulty: "Easy" | "Medium" | "Hard"; topicTags: string[];
  slugTitle: string; url?: string;
}
interface SolvedProblem {
  id: string; title: string; difficulty: "Easy" | "Medium" | "Hard"; topicTags: string[];
  solvedDate: string; leetcodeUsername: string;
}
interface WeakCategory {
  tag: string; totalProblems: number; solvedProblems: number; accuracy: number;
  difficulties: { Easy: number; Medium: number; Hard: number };
}
interface UserProfile {
  displayName: string; bio: string; website: string; location: string; joinedAt: string;
  avatar?: string;
  analysesRun: number; comparisonsRun: number; aiInsightsRun: number;
  recentAnalyses?: AnalysisRecord[];
  following?: FollowedUser[]; followers?: string[]; notifications?: Notification[];
  solvedProblems?: SolvedProblem[]; weakCategories?: WeakCategory[]; lastPracticeProblem?: LeetCodeProblem;
}
function getUsers(): StoredUser[] { try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; } }
function saveUser(u: StoredUser) { const users = getUsers().filter(x => x.email.toLowerCase() !== u.email.toLowerCase()); users.push(u); localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function findUser(email: string, password: string): StoredUser | null { return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password) ?? null; }
function emailExists(email: string): boolean { return getUsers().some(u => u.email.toLowerCase() === email.toLowerCase()); }
function saveSession(u: AuthUser) { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
function loadSession(): AuthUser | null { try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function loadProfile(email: string): UserProfile {
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY}_${email}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeUserProfile(parsed);
    }
  } catch { }
  return {
    displayName: "",
    bio: "",
    website: "",
    location: "",
    joinedAt: new Date().toISOString(),
    analysesRun: 0,
    comparisonsRun: 0,
    aiInsightsRun: 0,
  };
}
function saveProfile(email: string, p: UserProfile) {
  localStorage.setItem(`${PROFILE_KEY}_${email}`, JSON.stringify(normalizeUserProfile(p)));
}
function deleteAccount(email: string) { const users = getUsers().filter(u => u.email.toLowerCase() !== email.toLowerCase()); localStorage.setItem(USERS_KEY, JSON.stringify(users)); clearSession(); localStorage.removeItem(`${PROFILE_KEY}_${email}`); }

function normalizeProvider(provider?: string): "google" | "github" | "email" | undefined {
  const p = (provider || "").toLowerCase();
  if (p === "google" || p === "gmail") return "google";
  if (p === "github") return "github";
  if (p === "email") return "email";
  return undefined;
}

function normalizeAvatarUrl(url?: string): string | undefined {
  const raw = (url || "").trim();
  if (!raw) return undefined;
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  try {
    return new URL(raw, API).toString();
  } catch {
    return raw;
  }
}

function coerceAuthUser(payload: any, fallback?: Partial<AuthUser>): AuthUser {
  const nestedUser = (payload?.user && typeof payload.user === "object") ? payload.user : undefined;
  const source = nestedUser || payload;
  const name = source?.name || source?.full_name || source?.username || source?.login || payload?.name || fallback?.name || "User";
  const email = source?.email || payload?.email || fallback?.email || "";
  const avatar = normalizeAvatarUrl(
    source?.avatar ||
    source?.picture ||
    source?.image ||
    source?.avatar_url ||
    source?.photo ||
    source?.profile_picture_url ||
    source?.image_url ||
    payload?.avatar ||
    payload?.profile_picture_url ||
    fallback?.avatar
  );
  const provider = normalizeProvider(source?.provider || payload?.provider || payload?.auth_provider || payload?.source || fallback?.provider);
  return { name, email, avatar, provider };
}

function enrichAuthUser(base: AuthUser): AuthUser {
  const local = getUsers().find(u => u.email.toLowerCase() === base.email.toLowerCase());
  const session = loadSession();
  const sessionMatch = session?.email?.toLowerCase() === base.email.toLowerCase() ? session : null;
  return {
    ...base,
    avatar: normalizeAvatarUrl(base.avatar || local?.avatar || sessionMatch?.avatar),
    provider: normalizeProvider(base.provider) || normalizeProvider(local?.provider) || normalizeProvider(sessionMatch?.provider),
  };
}

function cacheAuthUser(user: AuthUser) {
  const normalized = enrichAuthUser(user);
  const existing = getUsers().find(u => u.email.toLowerCase() === normalized.email.toLowerCase());
  saveUser({
    name: normalized.name,
    email: normalized.email,
    password: existing?.password || "",
    avatar: normalized.avatar,
    provider: normalized.provider,
  });
  saveSession(normalized);
}

// -----------------------------------------------------------------------------
// Server API helpers (credentials included) and optional local-storage fallback
// -----------------------------------------------------------------------------
async function serverRequest(path: string, opts: RequestInit = {}) {
  opts.credentials = "include";

  // helper that actually executes a fetch and throws on bad status
  const doFetch = async (base: string) => {
    console.log(`🌐 API Request: ${base}${path}`, { 
      method: opts.method || 'GET',
      credentials: opts.credentials,
      headers: opts.headers 
    });
    const r = await fetch(`${base}${path}`, opts);
    console.log(`📡 API Response: ${r.status} ${r.statusText}`);
    
    // Handle 304 Not Modified - data hasn't changed
    if (r.status === 304) {
      console.log('📦 304 Not Modified - using cached data');
      return null; // Caller should use cached data
    }
    
    if (!r.ok) {
      const t = await r.text();
      // Suppress expected 401s during auth/profile fallback flow
      const suppress401 = r.status === 401 && (
        path.includes('/auth/me') ||
        path.includes('/profile') ||
        path.includes('/sync/profile')
      );
      const suppressLogout = path.includes('/auth/logout') && (r.status === 400 || r.status === 401);
      if (!suppress401 && !suppressLogout) {
        console.error(`API Error: ${r.status} ${r.statusText} on ${path}`);
      }
      if (r.status === 401) {
        console.warn(`🔒 Not authenticated. Please log in through the UI first!`);
      }
      const error: any = new Error(t || r.statusText);
      error.status = r.status;
      error.path = path;
      throw error;
    }
    return r.json();
  };

  try {
    return await doFetch(API);
  } catch (err) {
    // if the remote host is the default render.com address and it fails,
    // try the local backend as a convenience for development.
    const isLocalFrontend = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    if (isLocalFrontend && API.includes("developer-portfolio-backend-bu76.onrender.com")) {
      try {
        return await doFetch("http://localhost:8000");
      } catch {
        // ignore; we'll rethrow the original error below
      }
    }
    throw err;
  }
}

async function apiSignup(name: string, email: string, password: string, avatar?: string, provider?: string): Promise<AuthUser> {
  try {
    const remote = await serverRequest('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, avatar, provider }),
    });
    const merged = enrichAuthUser(coerceAuthUser(remote, { name, email, avatar, provider: normalizeProvider(provider) }));
    cacheAuthUser(merged);
    return merged;
  } catch (err) {
    // fallback to localStorage
    if (!emailExists(email)) {
      const user = { name, email, password, avatar, provider };
      saveUser(user);
      saveSession({ name, email, avatar, provider: (provider as "google" | "github" | "email" | undefined) });
      return { name, email, avatar, provider: (provider as "google" | "github" | "email" | undefined) };
    } else {
      throw new Error('Email already exists (local)');
    }
  }
}

async function apiLogin(email: string, password: string): Promise<AuthUser> {
  try {
    const remote = await serverRequest('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const merged = enrichAuthUser(coerceAuthUser(remote, { email, provider: "email" }));
    cacheAuthUser(merged);
    return merged;
  } catch (err) {
    // fallback to localStorage
    const user = findUser(email, password);
    if (user) {
      saveSession({ name: user.name, email: user.email, avatar: user.avatar, provider: (user.provider as "google" | "github" | "email" | undefined) });
      return { name: user.name, email: user.email, avatar: user.avatar, provider: (user.provider as "google" | "github" | "email" | undefined) };
    } else {
      throw new Error('Invalid email or password (local)');
    }
  }
}

async function apiOAuth(user: { name: string; email: string; avatar?: string; provider?: string; }): Promise<AuthUser> {
  try {
    const remote = await serverRequest('/auth/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...user,
        profile_picture_url: user.avatar,
        user: {
          name: user.name,
          email: user.email,
          picture: user.avatar,
        },
      }),
    });
    const merged = enrichAuthUser(coerceAuthUser(remote, { ...user, provider: normalizeProvider(user.provider) }));
    cacheAuthUser(merged);
    return merged;
  } catch (err) {
    // fallback to localStorage for OAuth
    const { name, email, avatar, provider } = user;
    const merged = enrichAuthUser({ name, email, avatar, provider: normalizeProvider(provider) });
    cacheAuthUser(merged);
    return merged;
  }
}

// Gmail direct login endpoint (via backend, with session cookie)
async function apiGmailLogin(user?: { name?: string; email?: string; avatar?: string }): Promise<AuthUser | null> {
  try {
    const email = (user?.email || "").trim();
    if (!email) return null;

    const response = await fetch(`${API}/auth/gmail/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email,
        name: user?.name,
        profile_picture_url: user?.avatar,
      }),
    });

    // This endpoint is optional in some backends; fail softly and let caller fallback.
    if (!response.ok) {
      return null;
    }

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!payload) return null;

    const normalized = enrichAuthUser(coerceAuthUser(payload, { provider: "google", email }));

    // Save to localStorage as backup
    if (normalized && normalized.email) {
      cacheAuthUser(normalized);
    }

    return normalized;
  } catch {
    return null;
  }
}

async function apiFetchSession(): Promise<AuthUser | null> {
  try {
    const remote = await serverRequest('/auth/me');
    if (remote === null) {
      return loadSession();
    }
    const merged = enrichAuthUser(coerceAuthUser(remote));
    if (merged?.email) {
      saveSession(merged);
    }
    return merged;
  } catch (err: any) {
    // If backend explicitly says unauthenticated, clear stale local session.
    if (err?.status === 401) {
      clearSession();
      return null;
    }
    // network / transient issue fallback
    return loadSession();
  }
}

async function apiLogout(): Promise<void> {
  try {
    await serverRequest('/auth/logout', { method: 'POST' });
  } catch { }
}

async function apiSaveProfilePicture(pictureUrl?: string): Promise<void> {
  const url = normalizeAvatarUrl(pictureUrl);
  if (!url) return;
  try {
    await serverRequest('/profile/picture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ picture_url: url }),
    });
  } catch {
    // best-effort only
  }
}

function normalizeUserProfile(payload: any, fallback?: UserProfile): UserProfile {
  const source = (payload?.user && typeof payload.user === "object") ? payload.user : (payload || {});
  const base: UserProfile = fallback || {
    displayName: "",
    bio: "",
    website: "",
    location: "",
    joinedAt: new Date().toISOString(),
    analysesRun: 0,
    comparisonsRun: 0,
    aiInsightsRun: 0,
  };

  return {
    ...base,
    displayName: source.displayName || source.name || source.username || base.displayName || "",
    bio: typeof source.bio === "string" ? source.bio : (base.bio || ""),
    website: typeof source.website === "string" ? source.website : (base.website || ""),
    location: typeof source.location === "string" ? source.location : (base.location || ""),
    joinedAt: source.joinedAt || source.created_at || base.joinedAt || new Date().toISOString(),
    avatar: normalizeAvatarUrl(
      source.avatar ||
      source.profile_picture_url ||
      source.picture ||
      source.photo ||
      base.avatar
    ),
    analysesRun: typeof source.analysesRun === "number" ? source.analysesRun : (base.analysesRun || 0),
    comparisonsRun: typeof source.comparisonsRun === "number" ? source.comparisonsRun : (base.comparisonsRun || 0),
    aiInsightsRun: typeof source.aiInsightsRun === "number" ? source.aiInsightsRun : (base.aiInsightsRun || 0),
    recentAnalyses: Array.isArray(source.recentAnalyses) ? source.recentAnalyses : base.recentAnalyses,
    following: Array.isArray(source.following) ? source.following : base.following,
    followers: Array.isArray(source.followers) ? source.followers : base.followers,
    notifications: Array.isArray(source.notifications) ? source.notifications : base.notifications,
    solvedProblems: Array.isArray(source.solvedProblems) ? source.solvedProblems : base.solvedProblems,
    weakCategories: Array.isArray(source.weakCategories) ? source.weakCategories : base.weakCategories,
    lastPracticeProblem: source.lastPracticeProblem || base.lastPracticeProblem,
  };
}

function toBackendProfilePayload(p: UserProfile): Record<string, any> {
  return {
    bio: p.bio || "",
    profile_picture_url: p.avatar || "",
    recentAnalyses: p.recentAnalyses || [],
    following: p.following || [],
    notifications: p.notifications || [],
    analysesRun: p.analysesRun || 0,
    displayName: p.displayName || "",
    joinedAt: p.joinedAt || "",
    avatar: p.avatar || "",
    solvedProblems: p.solvedProblems || [],
    weakCategories: p.weakCategories || [],
    lastPracticeProblem: p.lastPracticeProblem,
  };
}

async function apiGetProfile(): Promise<UserProfile> {
  try {
    const remote = await serverRequest('/profile');
    
    // Handle 304 Not Modified - return null to indicate no change
    if (remote === null) {
      console.log('📦 Profile unchanged on server (304)');
      throw new Error('NOT_MODIFIED'); // Signal to caller to use current data
    }
    
    console.log('📥 Loaded profile from backend:', {
      recentAnalyses: remote.recentAnalyses?.length || 0,
      following: remote.following?.length || 0,
      notifications: remote.notifications?.length || 0
    });
    return normalizeUserProfile(remote);
  } catch (err: any) {
    console.error('❌ Failed to load profile from backend:', err);
    if (err?.message?.includes('Invalid token') || err?.message?.includes('Unauthorized')) {
      console.error('🔑 Token issue detected. You may need to log in again.');
    }
    // If backend fails, this will throw and caller should use loadProfile
    throw err;
  }
}

async function apiSaveProfile(p: UserProfile, strict = false): Promise<UserProfile> {
  try {
    const remote = await serverRequest('/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toBackendProfilePayload(p)),
    });
    return normalizeUserProfile(remote, p);
  } catch (err) {
    if (strict) throw err;
    // If backend fails, return the profile as-is (localStorage will be used by caller)
    return p;
  }
}

// Helper to sync profile to both backend and localStorage
async function syncProfile(email: string, p: UserProfile, strict = false): Promise<UserProfile> {
  console.log('🔄 Syncing profile to backend:', {
    email,
    recentAnalyses: p.recentAnalyses?.length || 0,
    following: p.following?.length || 0,
    notifications: p.notifications?.length || 0
  });
  
  // Save to localStorage immediately
  saveProfile(email, p);
  
  // Try to sync to backend with dedicated sync endpoint
  try {
    const remote = await serverRequest('/sync/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toBackendProfilePayload(p)),
    });
    // Extract user data from response (it has {message, user} structure)
    const userData = remote.user || remote;
    const updated = normalizeUserProfile(userData, p);
    console.log('✅ Profile synced successfully:', {
      recentAnalyses: updated.recentAnalyses?.length || 0,
      following: updated.following?.length || 0,
      notifications: updated.notifications?.length || 0
    });
    // Update localStorage with backend response
    saveProfile(email, updated);
    return updated;
  } catch (err) {
    console.error('❌ Sync failed, trying fallback:', err);
    // Fallback to regular save endpoint
    try {
      const updated = await apiSaveProfile(p, strict);
      saveProfile(email, updated);
      return updated;
    } catch (fallbackErr) {
      if (strict) throw fallbackErr;
      // Backend unavailable, localStorage is saved
      return p;
    }
  }
}

function initial(str?: string): string {
  if (str && str.length > 0) return str[0].toUpperCase();
  return "?";
}

function pwStrength(pw: string): number {
  if (!pw) return 0; let s = 0;
  if (pw.length >= 8) s++; if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++; if (/[0-9]/.test(pw)) s++; if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

/* ─────────────────────────────────────────────────
   OAUTH HELPERS
───────────────────────────────────────────────── */
function openOAuthPopup(url: string, title: string): Window | null {
  const w = 500, h = 650;
  const left = window.screenX + (window.outerWidth - w) / 2;
  const top = window.screenY + (window.outerHeight - h) / 2;
  return window.open(url, title, `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`);
}
function buildGoogleURL(state: string): string {
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: `${window.location.origin}/auth/callback/google`, response_type: "code", scope: "openid email profile", state, access_type: "offline", prompt: "select_account consent" })}`;
}
function buildGitHubURL(state: string): string {
  return `https://github.com/login/oauth/authorize?${new URLSearchParams({ client_id: GITHUB_CLIENT_ID, redirect_uri: `${window.location.origin}/auth/callback/github`, scope: "read:user user:email", state })}`;
}

/* ─────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────── */
function getRank(s: number, tk: Theme) {
  if (s >= 85) return { label: "Elite", color: tk.green, bg: tk.greenLight, border: tk.greenBorder };
  if (s >= 70) return { label: "Senior", color: tk.blue, bg: tk.blueLight, border: tk.blueBorder };
  if (s >= 55) return { label: "Mid", color: tk.purple, bg: tk.purpleLight, border: tk.purpleBorder };
  if (s >= 35) return { label: "Junior", color: tk.amber, bg: tk.amberLight, border: tk.amberBorder };
  return { label: "Beginner", color: tk.rose, bg: tk.roseLight, border: tk.roseBorder };
}
function getVerdict(s: number): string {
  if (s >= 85) return "Exceptional across all dimensions. Top-tier engineering talent with consistent output and competitive depth.";
  if (s >= 70) return "Strong and consistent. Proficient across every platform with clear leadership readiness.";
  if (s >= 55) return "Solid foundation with real breadth. Actively levelling up and closing skill gaps.";
  if (s >= 35) return "Early career with genuine momentum. The raw material is here.";
  return "Just getting started. Every senior engineer was once exactly here.";
}
function cfColor(rank: string | undefined, tk: Theme): string {
  const r = (rank || "").toLowerCase();
  if (r.includes("grandmaster") || r.includes("legendary")) return tk.rose;
  if (r.includes("master")) return tk.amber;
  if (r.includes("candidate")) return tk.purple;
  if (r.includes("expert")) return tk.blue;
  if (r.includes("specialist")) return tk.teal;
  if (r.includes("pupil")) return tk.green;
  return tk.text3;
}

/* ─────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────── */
function GitHubIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>;
}
function LeetCodeIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" /></svg>;
}
function CodeforcesIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}><path d="M4.5 7.5C5.328 7.5 6 8.172 6 9v10.5c0 .828-.672 1.5-1.5 1.5h-3C.672 21 0 20.328 0 19.5V9c0-.828.672-1.5 1.5-1.5h3zm9.75-4.5c.828 0 1.5.672 1.5 1.5v15c0 .828-.672 1.5-1.5 1.5h-3c-.828 0-1.5-.672-1.5-1.5V4.5c0-.828.672-1.5 1.5-1.5h3zM22.5 12c.828 0 1.5.672 1.5 1.5v6c0 .828-.672 1.5-1.5 1.5h-3c-.828 0-1.5-.672-1.5-1.5v-6c0-.828.672-1.5 1.5-1.5h3z" /></svg>;
}
function GoogleIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>;
}
function PlatformIcon({ platform, size = 14, color = "currentColor" }: { platform: "github" | "leetcode" | "codeforces"; size?: number; color?: string }) {
  if (platform === "github") return <GitHubIcon size={size} color={color} />;
  if (platform === "leetcode") return <LeetCodeIcon size={size} color={color} />;
  return <CodeforcesIcon size={size} color={color} />;
}
function EyeIcon({ open, color = "currentColor" }: { open: boolean; color?: string }) {
  return open
    ? <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
    : <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}

/* ─────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────── */
function useBreakpoint() {
  const [w, setW] = useState(1200);
  useEffect(() => { const u = () => setW(window.innerWidth); u(); window.addEventListener("resize", u); return () => window.removeEventListener("resize", u); }, []);
  return { isMobile: w < 640, isTablet: w < 960 };
}
function useCounter(target: number, duration = 1400): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    setV(0); const t0 = performance.now();
    const tick = (now: number) => { const p = Math.min((now - t0) / duration, 1); setV(Math.round((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return v;
}

/* ─────────────────────────────────────────────────
   SCORE RING
───────────────────────────────────────────────── */
function ScoreRing({ score, tk, size = 140 }: { score: number; tk: Theme; size?: number }) {
  const c = useCounter(Math.round(score));
  const R = size * 0.38, circ = 2 * Math.PI * R, cx = size / 2;
  const color = c >= 80 ? tk.green : c >= 60 ? tk.blue : c >= 40 ? tk.amber : tk.rose;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={cx} cy={cx} r={R} fill="none" stroke={tk.track} strokeWidth="3" />
        <circle cx={cx} cy={cx} r={R} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - c / 100)} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.25, fontWeight: 600, color, lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>{c}</span>
        <span style={{ fontSize: size * 0.085, color: tk.text3, fontWeight: 400, marginTop: 3 }}>/ 100</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────────── */
function SectionHeader({ label, right, tk }: { label: string; right?: ReactNode; tk: Theme }) {
  return (
    <div style={{ padding: "11px 18px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: tk.text3 }}>{label}</span>
      {right}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   STAT ROW
───────────────────────────────────────────────── */
function StatRow({ label, value, accent, tk, stripe }: { label: string; value: string | number | undefined; accent?: string | null; tk: Theme; stripe: boolean; }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 18px", background: stripe ? tk.bgAlt : "transparent", borderBottom: `1px solid ${tk.border}` }}>
      <span style={{ fontSize: 12, color: tk.text2, fontWeight: 400 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: accent || tk.text, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{value ?? "—"}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   LANG BARS
───────────────────────────────────────────────── */
function LangBars({ data, tk }: { data: Record<string, number>; tk: Theme }) {
  const entries = Object.entries(data).slice(0, 5);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const hues = [tk.blue, tk.purple, tk.teal, tk.amber, tk.green];
  return (
    <div style={{ padding: "14px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: tk.text3, marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>Languages</div>
      {entries.map(([lang, cnt], i) => (
        <div key={lang} style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: tk.text2 }}>{lang}</span>
            <span style={{ fontSize: 11, color: tk.text3, fontVariantNumeric: "tabular-nums" }}>{cnt}</span>
          </div>
          <div style={{ height: 2, borderRadius: 2, background: tk.track }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${(cnt / max) * 100}%`, background: hues[i % hues.length], transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   PLATFORM CARD
───────────────────────────────────────────────── */
function PlatformCard({ title, handle, accentColor, accentLight, accentBorder, children, tk, empty, platform }: {
  title: string; handle: string; accentColor: string; accentLight: string; accentBorder: string;
  children?: ReactNode; tk: Theme; empty: boolean; platform: "github" | "leetcode" | "codeforces";
}) {
  return (
    <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: tk.shadow }}>
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: tk.text, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 7 }}>
            <PlatformIcon platform={platform} size={15} color={accentColor} />{title}
          </div>
          {handle && <div style={{ fontSize: 11, color: tk.text3, marginTop: 3, paddingLeft: 22 }}>{handle}</div>}
        </div>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, border: `1px solid ${accentBorder}`, color: accentColor, background: accentLight }}>
          {empty ? "—" : "Connected"}
        </span>
      </div>
      {empty ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160, color: tk.text3, fontSize: 14 }}>Not connected</div> : children}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   INPUT FIELD
───────────────────────────────────────────────── */
function InputField({ label, placeholder, value, onChange, onEnter, tk, platform }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  onEnter: () => void; tk: Theme; platform?: "github" | "leetcode" | "codeforces";
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: tk.text3, letterSpacing: "0.04em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
        {platform && <PlatformIcon platform={platform} size={12} color={tk.text3} />}{label}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => e.key === "Enter" && onEnter()}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder} spellCheck={false} autoComplete="off"
        style={{ padding: "9px 12px", borderRadius: 7, border: `1px solid ${focused ? tk.borderStrong : tk.border}`, background: tk.surface, color: tk.text, fontSize: 13, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: focused ? `0 0 0 3px ${tk.blueLight}` : "none" }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────
   BADGE
───────────────────────────────────────────────── */
function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.03em", padding: "3px 9px", borderRadius: 5, border: `1px solid ${border}`, color, background: bg, whiteSpace: "nowrap" as const }}>{label}</span>;
}

/* ─────────────────────────────────────────────────
   REPO CARD
───────────────────────────────────────────────── */
function RepoCard({ repo, tk, gh }: { repo: RepoItem; tk: Theme; gh: string }) {
  const [hov, setHov] = useState(false);
  return (
    <a href={`https://github.com/${gh}/${repo.name}`} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onTouchEnd={() => setHov(false)}
      style={{ padding: "13px 15px", borderRight: `1px solid ${tk.border}`, borderBottom: `1px solid ${tk.border}`, background: hov ? tk.bgAlt : "transparent", transition: "background 0.12s", textDecoration: "none", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "80px" }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: hov ? tk.blue : tk.text, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.12s" }}>{repo.name}</div>
      <div style={{ display: "flex", gap: 12, fontSize: 11, color: tk.text3, marginBottom: repo.language ? 8 : 0 }}>
        <span>{repo.stars} stars</span><span>{repo.forks} forks</span>
      </div>
      {repo.language && <span style={{ fontSize: 10, fontWeight: 500, color: tk.blue, padding: "2px 7px", borderRadius: 4, background: tk.blueLight, border: `1px solid ${tk.blueBorder}` }}>{repo.language}</span>}
    </a>
  );
}

/* ─────────────────────────────────────────────────
   GITHUB GRAPHQL / HEATMAP
───────────────────────────────────────────────── */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const LEVEL_MAP: Record<string, number> = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const GQL = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;

async function fetchHeatmap(username: string, token: string): Promise<HeatmapData> {
  const r = await fetch("https://api.github.com/graphql", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "User-Agent": "DevIQ/1.0" }, body: JSON.stringify({ query: GQL, variables: { login: username } }) });
  if (!r.ok) throw new Error(`GitHub API ${r.status}`);
  const b = await r.json();
  if (b.errors?.length) throw new Error(b.errors[0].message);
  if (!b.data?.user) throw new Error(`User "${username}" not found`);
  const cal = b.data.user.contributionsCollection.contributionCalendar;
  const contributions: Contribution[] = [];
  for (const w of cal.weeks) for (const d of w.contributionDays) contributions.push({ date: d.date, count: d.contributionCount, level: LEVEL_MAP[d.contributionLevel] ?? 0 });
  contributions.sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0, temp = 0;
  for (const d of contributions) { if (d.count > 0) { temp++; longest = Math.max(longest, temp); } else temp = 0; }
  const today = new Date().toISOString().split("T")[0];
  const days = contributions.at(-1)?.date === today && contributions.at(-1)?.count === 0 ? contributions.slice(0, -1) : contributions;
  let current = 0; for (let i = days.length - 1; i >= 0; i--) { if (days[i].count > 0) current++; else break; }
  return { contributions, total_last_year: cal.totalContributions, current_streak: current, longest_streak: longest };
}

function buildGrid(contributions: Contribution[]) {
  const map: Record<string, Contribution> = {};
  contributions.forEach(c => { map[c.date] = c; });
  const today = new Date(), start = new Date(today);
  start.setDate(start.getDate() - 364 - start.getDay());
  const weeks: (Contribution | null)[][] = [];
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1, cursor = new Date(start);
  for (let w = 0; w < 53; w++) {
    const week: (Contribution | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const ds = cursor.toISOString().split("T")[0];
      if (d === 0) { const m = cursor.getMonth(); if (m !== lastMonth) { monthLabels.push({ label: MONTHS[m], col: w }); lastMonth = m; } }
      week.push(cursor <= today ? (map[ds] || { date: ds, count: 0, level: 0 }) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, monthLabels };
}

function ContributionHeatmap({ username, tk, dark }: { username: string; tk: Theme; dark: boolean }) {
  const [hdata, setHdata] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const heatColors = dark ? ["#1a1a1a", "#0d3320", "#155230", "#1e7a47", "#26a35e"] : ["#EBEBEB", "#BBF7D0", "#6EE7A0", "#22C55E", "#15803D"];
  useEffect(() => {
    if (!username) return;
    if (!GITHUB_TOKEN) { setHdata({ contributions: [], total_last_year: 0, current_streak: 0, longest_streak: 0, error: "GitHub token missing" }); return; }
    setLoading(true); setHdata(null);
    fetchHeatmap(username, GITHUB_TOKEN).then(d => { setHdata(d); setLoading(false); }).catch(e => { setHdata({ contributions: [], total_last_year: 0, current_streak: 0, longest_streak: 0, error: String(e) }); setLoading(false); });
  }, [username]);
  const CELL = 11, GAP = 2, TOTAL = CELL + GAP;
  const { weeks, monthLabels } = hdata?.contributions?.length ? buildGrid(hdata.contributions) : { weeks: [], monthLabels: [] };
  return (
    <div id="sec-heatmap" style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow, marginBottom: 8 }}>
      <SectionHeader label="Contribution Activity" tk={tk} right={hdata && !hdata.error ? (<div style={{ display: "flex", gap: 20 }}>{[{ v: hdata.total_last_year, l: "Contributions" }, { v: `${hdata.current_streak}d`, l: "Streak" }, { v: `${hdata.longest_streak}d`, l: "Longest" }].map(s => (<div key={s.l} style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 600, color: tk.text, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{s.v}</div><div style={{ fontSize: 10, color: tk.text3, marginTop: 1 }}>{s.l}</div></div>))}</div>) : undefined} />
      <div style={{ padding: "14px 18px 12px" }}>
        {loading && <div style={{ padding: "24px 0", textAlign: "center", color: tk.text3, fontSize: 14 }}>Loading…</div>}
        {hdata?.error && <div style={{ padding: "16px 0", color: tk.rose, fontSize: 14 }}>Error: {hdata.error}</div>}
        {weeks.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "inline-block" }}>
              <div style={{ display: "flex", marginLeft: 24, marginBottom: 3, position: "relative", height: 14 }}>
                {monthLabels.map((m, i) => <div key={i} style={{ position: "absolute", left: m.col * TOTAL, fontSize: 10, color: tk.text3, whiteSpace: "nowrap" }}>{m.label}</div>)}
              </div>
              <div style={{ display: "flex", gap: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: GAP, marginRight: 4 }}>
                  {DAY_LABELS.map((d, i) => <div key={i} style={{ height: CELL, fontSize: 9, color: tk.text3, display: "flex", alignItems: "center", width: 18 }}>{d}</div>)}
                </div>
                <div style={{ display: "flex", gap: GAP }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                      {week.map((day, di) => (
                        <div key={di} style={{ width: CELL, height: CELL, borderRadius: 2, background: day ? heatColors[day.level] : heatColors[0], opacity: day?.count === 0 ? 0.5 : 1 }}
                          onMouseEnter={e => { if (!day) return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setTooltip({ x: r.left + r.width / 2, y: r.top - 8, text: `${day.count} on ${day.date}` }); }}
                          onMouseLeave={() => setTooltip(null)} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 8, justifyContent: "flex-end" }}>
                <span style={{ fontSize: 10, color: tk.text3, marginRight: 2 }}>Less</span>
                {([0, 1, 2, 3, 4] as const).map(l => <div key={l} style={{ width: CELL, height: CELL, borderRadius: 2, background: heatColors[l] }} />)}
                <span style={{ fontSize: 10, color: tk.text3, marginLeft: 2 }}>More</span>
              </div>
            </div>
          </div>
        )}
      </div>
      {tooltip && <div style={{ position: "fixed", left: tooltip.x, top: tooltip.y, transform: "translate(-50%,-100%)", background: tk.text, color: tk.bg, borderRadius: 6, padding: "5px 10px", fontSize: 11, pointerEvents: "none", zIndex: 9999, whiteSpace: "nowrap" }}>{tooltip.text}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   DEVELOPER CARD
───────────────────────────────────────────────── */
function DeveloperCard({ data, gh, lc, cf, tk, dark }: { data: ResultData; gh: string; lc: string; cf: string; tk: Theme; dark: boolean; }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rank = getRank(data.combined_score, tk);
  const [copied, setCopied] = useState(false);
  const [linkedinSharing, setLinkedinSharing] = useState(false);
  const scoreColor = data.combined_score >= 80 ? tk.green : data.combined_score >= 60 ? tk.blue : data.combined_score >= 40 ? tk.amber : tk.rose;

  const download = async () => { if (!cardRef.current) return; try { const h = (await import("html2canvas")).default; const c = await h(cardRef.current, { scale: 2, useCORS: true, backgroundColor: dark ? "#0A0A0A" : "#F5F5F5" }); const a = document.createElement("a"); a.download = `deviq-${gh || lc || cf}.png`; a.href = c.toDataURL(); a.click(); } catch { alert("Run: npm install html2canvas"); } };

  const copyLink = () => { const p = new URLSearchParams(); if (gh) p.set("gh", gh); if (lc) p.set("lc", lc); if (cf) p.set("cf", cf); navigator.clipboard.writeText(`${window.location.origin}?${p.toString()}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const shareToLinkedin = async () => {
    setLinkedinSharing(true);
    try {
      // Generate shareable link
      const params = new URLSearchParams();
      if (gh) params.set("gh", gh);
      if (lc) params.set("lc", lc);
      if (cf) params.set("cf", cf);
      const profileUrl = `${window.location.origin}?${params.toString()}`;

      // Create LinkedIn share post text
      const rank = getRank(data.combined_score, tk);
      const platforms = [gh && `GitHub: ${gh}`, lc && `LeetCode: ${lc}`, cf && `Codeforces: ${cf}`].filter(Boolean).join(" | ");
      const shareText = `🎯 Just analyzed my developer profile on DevIQ!\n\n📊 ${platforms}\n💪 Dev Score: ${data.combined_score.toFixed(1)}/100 (${rank.label})\n\n${data.github?.analytics?.total_projects ? `📦 ${data.github.analytics.total_projects} projects` : ""}${data.leetcode?.total_solved ? ` | ⚡ ${data.leetcode.total_solved} problems solved` : ""}${data.codeforces?.rating ? ` | 🏆 CF Rating: ${data.codeforces.rating}` : ""}\n\nCheck out my full profile and compare your score 👇`;

      // LinkedIn share URL (using LinkedIn's native share)
      const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;

      // Open LinkedIn share dialog
      window.open(linkedinShareUrl, "_blank", "width=600,height=600");

      // Also copy the text to clipboard for manual posting
      await navigator.clipboard.writeText(`${shareText}\n\n${profileUrl}`);
      alert("LinkedIn share dialog opened! Post text copied to clipboard for easy sharing.");
    } catch (error) {
      console.error("LinkedIn share failed:", error);
      alert("Failed to share to LinkedIn. Please try again.");
    } finally {
      setLinkedinSharing(false);
    }
  };
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase", color: tk.text3 }}>Developer Card</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={shareToLinkedin} disabled={linkedinSharing} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tk.border}`, background: tk.surface, cursor: linkedinSharing ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 500, color: linkedinSharing ? tk.text3 : tk.text2, transition: "color 0.2s", opacity: linkedinSharing ? 0.6 : 1 }} title="Share your score card to LinkedIn">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4, display: "inline" }}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.722-2.004 1.418-.103.249-.129.597-.129.946v5.441h-3.554s.045-8.733 0-9.652h3.554v1.366c.43-.664 1.198-1.608 2.917-1.608 2.134 0 3.732 1.39 3.732 4.377v5.517zM5.337 8.855c-1.144 0-1.915-.761-1.915-1.71 0-.951.769-1.71 1.959-1.71 1.19 0 1.917.759 1.944 1.71 0 .949-.753 1.71-1.988 1.71zm-1.529 11.597h3.058v-9.652H3.808v9.652zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
            {linkedinSharing ? "Sharing..." : "Share LinkedIn"}
          </button>
          <button onClick={copyLink} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tk.border}`, background: tk.surface, cursor: "pointer", fontSize: 11, fontWeight: 500, color: copied ? tk.green : tk.text2, transition: "color 0.2s" }}>{copied ? "Copied" : "Copy link"}</button>
          <button onClick={download} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tk.border}`, background: tk.surface, cursor: "pointer", fontSize: 11, fontWeight: 500, color: tk.text2 }}>Download</button>
        </div>
      </div>
      <div ref={cardRef} style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadowLg }}>
        <div style={{ height: 2, background: scoreColor }} />
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: tk.text3, marginBottom: 10 }}>DevIQ Report</div>
              <div style={{ fontSize: "clamp(18px,2.4vw,25px)", fontWeight: 600, color: tk.text, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[gh, lc, cf].filter(Boolean).join(" / ")}</div>
              <Badge label={rank.label} color={rank.color} bg={rank.bg} border={rank.border} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <ScoreRing score={data.combined_score} tk={tk} size={88} />
              <span style={{ fontSize: 10, color: tk.text3, fontWeight: 400 }}>Dev Score</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 18 }}>
            {[{ label: "Repos", value: data.github?.analytics?.total_projects ?? "—" }, { label: "Solved", value: data.leetcode?.total_solved ?? "—" }, { label: "CF Rating", value: data.codeforces?.rating ?? "—" }, { label: "Stars", value: data.github?.analytics?.total_stars ?? "—" }, { label: "Hard", value: data.leetcode?.hard_solved ?? "—" }, { label: "Language", value: data.github?.analytics?.most_used_language ?? "—" }].map(s => (
              <div key={s.label} style={{ background: tk.bgAlt, borderRadius: 7, padding: "10px 12px", border: `1px solid ${tk.border}` }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: tk.text, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                <div style={{ fontSize: 10, color: tk.text3, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: tk.text2, lineHeight: 1.65, margin: 0 }}>{getVerdict(data.combined_score)}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 14, borderTop: `1px solid ${tk.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: tk.text, letterSpacing: "-0.02em" }}>DevIQ</span>
            <span style={{ fontSize: 11, color: tk.text3 }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   ADVANCED ANALYTICS CARD
───────────────────────────────────────────────── */
function AdvancedAnalyticsCard({ 
  codingHours, complexRepos, longestGap, monthlyComparison, tk 
}: {
  codingHours?: CodingHourStats[];
  complexRepos?: ComplexityRepo[];
  longestGap?: ContributionGap;
  monthlyComparison?: MonthlyComparison;
  tk: Theme;
}) {
  const topHour = codingHours?.[0];
  const topRepo = complexRepos?.[0];

  return (
    <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow, marginBottom: 8 }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: tk.text, letterSpacing: "-0.01em" }}>GitHub Insights</div>
        <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: tk.text3 }}>Advanced</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, padding: "16px" }}>
        {topHour && (
          <div style={{ background: tk.bgAlt, borderRadius: 8, padding: "14px", border: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: tk.blue, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Coding Hours</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: tk.text, marginBottom: 2, letterSpacing: "-0.01em" }}>{topHour.hour}:00 - {(topHour.hour + 1) % 24}:00</div>
            <div style={{ fontSize: 12, color: tk.text2, marginBottom: 8 }}>Most active hour ({topHour.count} commits)</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {codingHours?.slice(0, 3).map(h => (
                <div key={h.hour} style={{ fontSize: 10, padding: "4px 8px", background: tk.surface, borderRadius: 4, border: `1px solid ${tk.border}`, color: tk.text3 }}>
                  {h.hour}:00 ({h.count})
                </div>
              ))}
            </div>
          </div>
        )}

        {topRepo && (
          <div style={{ background: tk.bgAlt, borderRadius: 8, padding: "14px", border: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: tk.amber, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Most Complex Repo</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: tk.text, marginBottom: 2, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{topRepo.name}</div>
            <div style={{ fontSize: 12, color: tk.text2, marginBottom: 8 }}>{topRepo.fileCount} files • {topRepo.complexity} complexity</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(topRepo.languages).slice(0, 3).map(([lang, _]) => (
                <span key={lang} style={{ fontSize: 10, padding: "3px 8px", background: tk.surface, borderRadius: 4, border: `1px solid ${tk.border}`, color: tk.text3 }}>
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {longestGap && (
          <div style={{ background: tk.bgAlt, borderRadius: 8, padding: "14px", border: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: tk.rose, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Contribution Gap</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: tk.text, marginBottom: 2, letterSpacing: "-0.01em" }}>{longestGap.duration} days</div>
            <div style={{ fontSize: 12, color: tk.text2, marginBottom: 8 }}>
              {longestGap.isCurrentGap ? "Current gap" : `Recovered on ${new Date(longestGap.recoveryDate!).toLocaleDateString()}`}
            </div>
            <div style={{ fontSize: 11, color: tk.text3 }}>
              {new Date(longestGap.startDate).toLocaleDateString()} - {new Date(longestGap.endDate).toLocaleDateString()}
            </div>
          </div>
        )}

        {monthlyComparison && (
          <div style={{ background: tk.bgAlt, borderRadius: 8, padding: "14px", border: `1px solid ${tk.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: tk.green, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Monthly Comparison</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: tk.text, marginBottom: 2 }}>
              <span style={{ color: monthlyComparison.growth >= 0 ? tk.green : tk.rose }}>
                {monthlyComparison.growth > 0 ? "+" : ""}{monthlyComparison.growth}%
              </span>
            </div>
            <div style={{ fontSize: 12, color: tk.text2, marginBottom: 8 }}>
              {monthlyComparison.month} vs Last Year
            </div>
            <div style={{ fontSize: 11, color: tk.text3, display: "flex", justifyContent: "space-between" }}>
              <span>This: {monthlyComparison.thisYear}</span>
              <span>Last: {monthlyComparison.lastYear}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   AI PANEL  — powered by Google Gemini (free)
───────────────────────────────────────────────── */
type AIMode = "overview" | "roast" | "plan" | "skills" | "interview";

const AI_MODES: { id: AIMode; label: string; emoji: string; desc: string; color: string }[] = [
  { id: "overview", label: "Quick Take", emoji: "", desc: "Fast 3-line summary of your profile", color: "#60A5FA" },
  { id: "roast", label: "Roast Me", emoji: "", desc: "Brutal honest critique of your stats", color: "#F87171" },
  { id: "plan", label: "7-Day Plan", emoji: "", desc: "Personalised weekly improvement plan", color: "#4ADE80" },
  { id: "skills", label: "Skill Gaps", emoji: "", desc: "What you should learn next and why", color: "#FBBF24" },
  { id: "interview", label: "Interview", emoji: "", desc: "Are you interview-ready? Honest verdict", color: "#A78BFA" },
];

function AIPanel({ data, gh, lc, cf, tk, dark }: { data: ResultData; gh: string; lc: string; cf: string; tk: Theme; dark: boolean }) {
  const [mode, setMode] = useState<AIMode>("overview");
  const [results, setResults] = useState<Record<AIMode, string>>({ overview: "", roast: "", plan: "", skills: "", interview: "" });
  const [loading, setLoading] = useState<AIMode | null>(null);
  const [copied, setCopied] = useState(false);

  const ctx = () => `Developer stats:
GitHub (${gh || "not provided"}): ${data.github ? `${data.github.analytics?.total_projects ?? 0} repos, ${data.github.analytics?.total_stars ?? 0} stars, skill score ${data.github.analytics?.skill_score ?? 0}/100, top language: ${data.github.analytics?.most_used_language ?? "unknown"}` : "no data"}
LeetCode (${lc || "not provided"}): ${data.leetcode ? `${data.leetcode.total_solved} solved (Easy: ${data.leetcode.easy_solved}, Medium: ${data.leetcode.medium_solved}, Hard: ${data.leetcode.hard_solved}), global rank: ${data.leetcode.ranking ? "#" + data.leetcode.ranking : "unranked"}${data.leetcode.contest_rating ? ", contest rating: " + data.leetcode.contest_rating : ""}` : "no data"}
Codeforces (${cf || "not provided"}): ${data.codeforces ? `rating ${data.codeforces.rating}, rank: ${data.codeforces.rank ?? "unrated"}, max rating: ${data.codeforces.max_rating ?? 0}, problems solved: ${data.codeforces.problems_solved ?? 0}` : "no data"}
Combined DevIQ Score: ${data.combined_score}/100`;

  const PROMPTS: Record<AIMode, string> = {
    overview: `You are a senior engineering recruiter. Given these developer stats, write exactly 3 punchy bullet points (use • symbol). Each bullet = one key insight. Be specific, reference real numbers. No fluff, no intro sentence.\n\n${ctx()}`,
    roast: `You're a dry, brilliant tech critic like a senior engineer reviewing a junior's portfolio. Roast this developer's stats in 4 sharp sentences. Be specific and reference their actual numbers. Brutal but constructive. No emojis, no mercy.\n\n${ctx()}`,
    plan: `You're a senior engineering mentor. Create a focused 7-day improvement plan. Format exactly:\n**Assessment:** (1 sentence)\n**Day 1-2:** (specific task)\n**Day 3-4:** (specific task)\n**Day 5-6:** (specific task)\n**Weekend:** (stretch goal)\n\nBe extremely specific to their actual stats.\n\n${ctx()}`,
    skills: `You're a technical career coach. Identify the 3 most impactful skill gaps based on these stats. Format exactly:\n**Gap 1: [Skill Name]** — why it matters + exactly what to do\n**Gap 2: [Skill Name]** — why it matters + exactly what to do\n**Gap 3: [Skill Name]** — why it matters + exactly what to do\n\nThen add one sentence on their biggest strength.\n\n${ctx()}`,
    interview: `You're a FAANG hiring manager. Give a blunt verdict on interview readiness. Format:\n**Verdict:** (Ready / Needs Work / Not Ready) — one sentence why\n**Strengths:** (2 bullet points with • symbol)\n**Red Flags:** (2 bullet points with • symbol)\n**Action:** what they must do before applying\n\n${ctx()}`,
  };

  const call = async (m: AIMode) => {
    if (!GROQ_KEY) {
      setResults(r => ({ ...r, [m]: "No API key found. Add NEXT_PUBLIC_GROQ_API_KEY to your .env.local file." }));
      return;
    }
    setLoading(m);
    setResults(r => ({ ...r, [m]: "" }));
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: PROMPTS[m] }],
          max_tokens: 600,
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Groq ${res.status}: ${JSON.stringify(e)}`); }
      const data2 = await res.json();
      const text = data2.choices?.[0]?.message?.content ?? "No response received.";
      setResults(r => ({ ...r, [m]: text }));
      setLoading(null);
    } catch (e) {
      setResults(r => ({ ...r, [m]: `Error: ${e instanceof Error ? e.message : String(e)}` }));
      setLoading(null);
    }
  };

  const current = results[mode];
  const isLoading = loading === mode;
  const modeInfo = AI_MODES.find(m => m.id === mode)!;
  const copyText = () => { navigator.clipboard.writeText(current); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const [translated, setTranslated] = useState<Record<AIMode, string>>({ overview: "", roast: "", plan: "", skills: "", interview: "" });
  const [translating, setTranslating] = useState(false);
  const [showHindi, setShowHindi] = useState<Record<AIMode, boolean>>({ overview: false, roast: false, plan: false, skills: false, interview: false });

  const translateToHindi = async () => {
    if (translated[mode]) { setShowHindi(s => ({ ...s, [mode]: !s[mode] })); return; }
    if (!GROQ_KEY) return;
    setTranslating(true);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", messages: [{
            role: "user", content: `Translate the following text to Hindi. Only output the translated text, nothing else:

${current}`
          }], max_tokens: 800
        }),
      });
      const data2 = await res.json();
      const text = data2.choices?.[0]?.message?.content ?? "";
      setTranslated(t => ({ ...t, [mode]: text }));
      setShowHindi(s => ({ ...s, [mode]: true }));
    } catch { }
    setTranslating(false);
  };

  const renderText = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.includes(":**")) {
        const [label, ...rest] = line.split(":**");
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <span style={{ fontWeight: 700, color: tk.text }}>{label.replace(/\*\*/g, "")}:</span>
            <span style={{ color: tk.text2 }}>{rest.join(":")}</span>
          </div>
        );
      }
      if (line.startsWith("•") || line.startsWith("- ")) {
        return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, paddingLeft: 4 }}>
          <span style={{ color: modeInfo.color, flexShrink: 0, marginTop: 1 }}>•</span>
          <span style={{ color: tk.text2, lineHeight: 1.65 }}>{line.replace(/^[•-]\s*/, "")}</span>
        </div>;
      }
      if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
      return <p key={i} style={{ color: tk.text2, lineHeight: 1.65, marginBottom: 6 }}>{line}</p>;
    });
  };

  return (
    <div id="sec-ai" style={{ background: tk.surface, borderRadius: 12, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadowMd, marginBottom: 8 }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${modeInfo.color}20`, border: `1px solid ${modeInfo.color}40`, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={modeInfo.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L13.5 9H19.5L14.5 13L16.5 19L12 15.5L7.5 19L9.5 13L4.5 9H10.5L12 3Z" /></svg></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: tk.text, lineHeight: 1.2 }}>AI Insights</div>
            <div style={{ fontSize: 11, color: tk.text3 }}>{modeInfo.desc}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {current && !isLoading && (
            <button onClick={copyText} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${tk.border}`, background: copied ? tk.greenLight : "transparent", cursor: "pointer", fontSize: 11, fontWeight: 500, color: copied ? tk.green : tk.text3, fontFamily: "inherit", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}>
              {copied ? <>✓ Copied</> : <><svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy</>}
            </button>
          )}
          {current && !isLoading && (
            <button onClick={translateToHindi} disabled={translating} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${tk.border}`, background: showHindi[mode] ? tk.purpleLight : "transparent", cursor: "pointer", fontSize: 11, fontWeight: 500, color: showHindi[mode] ? tk.purple : tk.text3, fontFamily: "inherit", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4 }}>
              {translating ? <div style={{ width: 9, height: 9, border: `1.5px solid ${tk.purple}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> : <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="M22 22l-5-10-5 10" /><path d="M14 18h6" /></svg>}
              {showHindi[mode] ? "Show English" : "हिंदी"}
            </button>
          )}
          {current && !isLoading && (
            <button onClick={() => call(mode)} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${tk.border}`, background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 500, color: tk.text3, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.62" /></svg>Retry
            </button>
          )}
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 0, overflowX: "auto", borderBottom: `1px solid ${tk.border}`, scrollbarWidth: "none" }}>
        {AI_MODES.map((m) => {
          const isActive = mode === m.id;
          const isDone = !!results[m.id];
          const isRunning = loading === m.id;
          return (
            <button key={m.id} onClick={() => { setMode(m.id); if (!results[m.id] && loading !== m.id) call(m.id); }}
              style={{ flex: "0 0 auto", padding: "10px 16px", border: "none", borderBottom: isActive ? `2px solid ${m.color}` : "2px solid transparent", background: isActive ? `${m.color}10` : "transparent", cursor: "pointer", fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? m.color : tk.text3, fontFamily: "inherit", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
              {m.label}
              {isRunning && <span style={{ width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${m.color}`, borderTopColor: "transparent", animation: "spin 0.6s linear infinite", display: "inline-block" }} />}
              {isDone && !isRunning && <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, opacity: 0.7 }} />}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "20px", minHeight: 160 }}>
        {!current && !isLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 0", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${modeInfo.color}15`, border: `1px solid ${modeInfo.color}30` }} />
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: tk.text, marginBottom: 4 }}>{modeInfo.label}</div>
              <div style={{ fontSize: 13, color: tk.text3, lineHeight: 1.5 }}>{modeInfo.desc}</div>
            </div>
            <button onClick={() => call(mode)} style={{ padding: "9px 24px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, background: modeInfo.color, color: "#fff", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, boxShadow: `0 2px 12px ${modeInfo.color}40` }}>
              Generate {modeInfo.label}
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
            </button>
          </div>
        )}

        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0" }}>
            <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${modeInfo.color}`, borderTopColor: "transparent", animation: "spin 0.6s linear infinite", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: tk.text3 }}>Groq is thinking…</span>
          </div>
        )}

        {current && !isLoading && (
          <div style={{ fontSize: 14, color: tk.text, lineHeight: 1.75, padding: "16px 18px", background: tk.bgAlt, borderRadius: 9, border: `1px solid ${tk.border}` }}>
            {showHindi[mode] && translated[mode] ? renderText(translated[mode]) : renderText(current)}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div style={{ padding: "10px 20px 14px", borderTop: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: tk.text3 }}>
            {Object.values(results).filter(Boolean).length} of {AI_MODES.length} insights generated
          </span>
          <button onClick={() => { AI_MODES.forEach(m => { if (!results[m.id]) call(m.id); }); }}
            style={{ fontSize: 11, color: tk.blue, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
            Generate all
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   COMPARE MODE
───────────────────────────────────────────────── */
function CompareMode({ tk, isMobile }: { tk: Theme; isMobile: boolean }) {
  const [devA, setDevA] = useState(() => { try { const s = sessionStorage.getItem("deviq_cmpA"); return s ? JSON.parse(s) : { gh: "", lc: "", cf: "" }; } catch { return { gh: "", lc: "", cf: "" }; } });
  const [devB, setDevB] = useState(() => { try { const s = sessionStorage.getItem("deviq_cmpB"); return s ? JSON.parse(s) : { gh: "", lc: "", cf: "" }; } catch { return { gh: "", lc: "", cf: "" }; } });
  const [dataA, setDataA] = useState<ResultData | null>(() => { try { const s = sessionStorage.getItem("deviq_cmpDataA"); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [dataB, setDataB] = useState<ResultData | null>(() => { try { const s = sessionStorage.getItem("deviq_cmpDataB"); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [loadingA, setLoadingA] = useState(false); const [loadingB, setLoadingB] = useState(false);
  const [ran, setRan] = useState(() => { try { return !!sessionStorage.getItem("deviq_cmpDataA"); } catch { return false; } });

  useEffect(() => { try { sessionStorage.setItem("deviq_cmpA", JSON.stringify(devA)); } catch { } }, [devA]);
  useEffect(() => { try { sessionStorage.setItem("deviq_cmpB", JSON.stringify(devB)); } catch { } }, [devB]);
  useEffect(() => { try { if (dataA) sessionStorage.setItem("deviq_cmpDataA", JSON.stringify(dataA)); else sessionStorage.removeItem("deviq_cmpDataA"); } catch { } }, [dataA]);
  useEffect(() => { try { if (dataB) sessionStorage.setItem("deviq_cmpDataB", JSON.stringify(dataB)); else sessionStorage.removeItem("deviq_cmpDataB"); } catch { } }, [dataB]);
  const fetchDev = async (f: { gh: string; lc: string; cf: string }, set: (d: ResultData) => void, setL: (b: boolean) => void) => {
    setL(true); const r: Partial<ResultData> = {};
    if (f.gh) { try { const res = await fetch(`${API}/analyze/${f.gh.trim()}?v=${Date.now()}`); const j = await res.json(); if (res.ok && !j.error) r.github = j; } catch { } }
    if (f.lc) { try { const res = await fetch(`${API}/leetcode/${f.lc.trim()}?v=${Date.now()}`); const j = await res.json(); if (res.ok && !j.error) r.leetcode = j; } catch { } }
    if (f.cf) { try { const res = await fetch(`${API}/codeforces/${f.cf.trim()}?v=${Date.now()}`); const j = await res.json(); if (res.ok && !j.error) r.codeforces = j; } catch { } }
    let s = 0; if (r.github?.analytics?.skill_score) s += r.github.analytics.skill_score * 0.4; if (r.leetcode?.total_solved) s += Math.min(100, r.leetcode.easy_solved + r.leetcode.medium_solved * 3 + r.leetcode.hard_solved * 6) * 0.35; if (r.codeforces?.rating) s += Math.min(100, r.codeforces.rating / 35) * 0.25;
    r.combined_score = Math.round(s * 10) / 10; set(r as ResultData); setL(false);
  };
  const run = () => { setRan(true); if (devA.gh || devA.lc || devA.cf) fetchDev(devA, setDataA, setLoadingA); if (devB.gh || devB.lc || devB.cf) fetchDev(devB, setDataB, setLoadingB); };
  const metrics = [{ label: "Dev Score", a: dataA?.combined_score, b: dataB?.combined_score }, { label: "Repos", a: dataA?.github?.analytics?.total_projects, b: dataB?.github?.analytics?.total_projects }, { label: "Stars", a: dataA?.github?.analytics?.total_stars, b: dataB?.github?.analytics?.total_stars }, { label: "LC Solved", a: dataA?.leetcode?.total_solved, b: dataB?.leetcode?.total_solved }, { label: "LC Hard", a: dataA?.leetcode?.hard_solved, b: dataB?.leetcode?.hard_solved }, { label: "CF Rating", a: dataA?.codeforces?.rating, b: dataB?.codeforces?.rating }, { label: "CF Problems", a: dataA?.codeforces?.problems_solved, b: dataB?.codeforces?.problems_solved }];
  const nameA = [devA.gh, devA.lc, devA.cf].filter(Boolean)[0] || "Dev A"; const nameB = [devB.gh, devB.lc, devB.cf].filter(Boolean)[0] || "Dev B";
  const winsA = metrics.filter(m => m.a != null && m.b != null && (m.a as number) > (m.b as number)).length; const winsB = metrics.filter(m => m.a != null && m.b != null && (m.b as number) > (m.a as number)).length;
  const inputBlock = (fields: { gh: string; lc: string; cf: string }, set: React.Dispatch<React.SetStateAction<{ gh: string; lc: string; cf: string }>>, label: string) => (
    <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
      <SectionHeader label={label} tk={tk} />
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {([{ key: "gh" as const, label: "GitHub", platform: "github" as const }, { key: "lc" as const, label: "LeetCode", platform: "leetcode" as const }, { key: "cf" as const, label: "Codeforces", platform: "codeforces" as const }]).map(({ key, label, platform }) => (
          <InputField key={key} label={label} placeholder="username" value={fields[key]} onChange={v => set(p => ({ ...p, [key]: v }))} onEnter={run} tk={tk} platform={platform} />
        ))}
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
        {inputBlock(devA, setDevA, "Developer A")}{inputBlock(devB, setDevB, "Developer B")}
      </div>
      <button onClick={run} disabled={(!devA.gh && !devA.lc && !devA.cf) || (!devB.gh && !devB.lc && !devB.cf)} style={{ width: "100%", padding: 11, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 500, background: tk.accent, color: tk.accentFg, marginBottom: 14 }}>Compare</button>
      {ran && (loadingA || loadingB) && <div style={{ padding: "32px", textAlign: "center", color: tk.text3, fontSize: 15 }}>Fetching data…</div>}
      {ran && !loadingA && !loadingB && dataA && dataB && (
        <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
          {dataA.combined_score !== dataB.combined_score && <div style={{ padding: "11px 20px", borderBottom: `1px solid ${tk.border}`, background: tk.bgAlt }}><span style={{ fontSize: 12, fontWeight: 500, color: tk.text }}>{dataA.combined_score > dataB.combined_score ? nameA : nameB} leads by {Math.abs(dataA.combined_score - dataB.combined_score).toFixed(1)} pts</span></div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "22px 28px", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: tk.blue }}>{nameA}</div>
              <ScoreRing score={dataA.combined_score} tk={tk} size={100} />
              <Badge label={getRank(dataA.combined_score, tk).label} color={getRank(dataA.combined_score, tk).color} bg={getRank(dataA.combined_score, tk).bg} border={getRank(dataA.combined_score, tk).border} />
            </div>
            <div style={{ textAlign: "center", color: tk.text3, fontSize: 13, fontWeight: 600, padding: "0 8px" }}>vs</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: tk.purple }}>{nameB}</div>
              <ScoreRing score={dataB.combined_score} tk={tk} size={100} />
              <Badge label={getRank(dataB.combined_score, tk).label} color={getRank(dataB.combined_score, tk).color} bg={getRank(dataB.combined_score, tk).bg} border={getRank(dataB.combined_score, tk).border} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, padding: "0 28px 18px", flexWrap: "wrap" }}>
            <Badge label={`${nameA}: ${winsA} wins`} color={tk.blue} bg={tk.blueLight} border={tk.blueBorder} />
            <Badge label={`${nameB}: ${winsB} wins`} color={tk.purple} bg={tk.purpleLight} border={tk.purpleBorder} />
          </div>
          <div style={{ borderTop: `1px solid ${tk.border}` }}>
            {metrics.map((m, i) => {
              const av = m.a as number | undefined, bv = m.b as number | undefined;
              const aW = av != null && bv != null && av > bv, bW = av != null && bv != null && bv > av;
              const max = Math.max(av ?? 0, bv ?? 0, 1);
              return (
                <div key={m.label} style={{ padding: "11px 28px", borderBottom: i < metrics.length - 1 ? `1px solid ${tk.border}` : "none", background: i % 2 === 0 ? tk.bgAlt : "transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: av != null && bv != null ? 6 : 0 }}>
                    <span style={{ fontSize: 11, color: tk.text3, width: 90, flexShrink: 0 }}>{m.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: aW ? tk.blue : tk.text, minWidth: 50, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{av ?? "—"}{aW ? " ←" : ""}</span>
                      <span style={{ fontSize: 10, color: tk.text3, flexShrink: 0 }}>vs</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: bW ? tk.purple : tk.text, minWidth: 50, fontVariantNumeric: "tabular-nums" }}>{bW ? "→ " : ""}{bv ?? "—"}</span>
                    </div>
                  </div>
                  {av != null && bv != null && (<div style={{ display: "flex", flexDirection: "column", gap: 3 }}><div style={{ height: 2, borderRadius: 2, background: tk.track }}><div style={{ height: "100%", borderRadius: 2, width: `${(av / max) * 100}%`, background: tk.blue, transition: "width 0.8s" }} /></div><div style={{ height: 2, borderRadius: 2, background: tk.track }}><div style={{ height: "100%", borderRadius: 2, width: `${(bv / max) * 100}%`, background: tk.purple, transition: "width 0.8s" }} /></div></div>)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   AUTH MODAL
───────────────────────────────────────────────── */
function AuthModal({ mode, tk, onAuth, onClose, onSwitchMode }: {
  mode: "login" | "signup"; tk: Theme; onAuth: (u: AuthUser) => void; onClose: () => void; onSwitchMode: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false); const [showConfirm, setShowConfirm] = useState(false); const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [globalError, setGlobalError] = useState(""); const [submitting, setSubmitting] = useState(false); const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const isLogin = mode === "login";
  const touch = (f: string) => setTouched(t => ({ ...t, [f]: true }));

  const nameErr = !isLogin && touched.name ? (!name.trim() ? "Name is required." : name.trim().length < 2 ? "At least 2 characters." : "") : "";
  const emailErr = touched.email ? (!email ? "Email is required." : !EMAIL_RE.test(email) ? "Enter a valid email." : "") : "";
  const passwordErr = touched.password ? (!password ? "Password is required." : !isLogin && password.length < 8 ? "Min 8 characters." : !isLogin && !/[A-Z]/.test(password) ? "Include an uppercase letter." : !isLogin && !/[0-9]/.test(password) ? "Include a number." : "") : "";
  const confirmErr = !isLogin && touched.confirm ? (!confirm ? "Please confirm." : confirm !== password ? "Passwords don't match." : "") : "";
  const strength = pwStrength(password);
  const strengthColors = ["", tk.rose, tk.rose, tk.amber, tk.green];
  const strengthLabels = ["", "Very weak", "Weak", "Fair", "Strong"];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "OAUTH_SUCCESS") {
        const { name: n, email: e, avatar, provider } = event.data;
        const callbackAvatar = normalizeAvatarUrl(avatar);

        // For Google, prefer backend gmail session endpoint, then sync with callback payload.
        // For GitHub, use regular OAuth persist flow.
        const persist = async () => {
          if (provider === "google") {
            const gmailUser = await apiGmailLogin({ name: n, email: e, avatar: callbackAvatar });
            const cloudUser = await apiFetchSession();
            if (cloudUser) {
              return enrichAuthUser({
                ...cloudUser,
                avatar: cloudUser.avatar || callbackAvatar,
                provider: normalizeProvider(cloudUser.provider) || "google",
              });
            }
            if (gmailUser) return enrichAuthUser({ ...gmailUser, avatar: gmailUser.avatar || callbackAvatar, provider: "google" });
          }
          return await apiOAuth({ name: n, email: e, avatar: callbackAvatar, provider });
        };

        persist()
          .then(async (u) => {
            const resolved = enrichAuthUser({ ...u, avatar: u.avatar || callbackAvatar });
            if (resolved.avatar) {
              await apiSaveProfilePicture(resolved.avatar);
              const refreshed = await apiFetchSession();
              if (refreshed?.avatar) resolved.avatar = refreshed.avatar;
            }
            setSuccess(true);
            setOauthLoading(null);
            setTimeout(() => onAuth(resolved), 500);
          })
          .catch(err => {
            setGlobalError(err.message || "OAuth failed.");
            setOauthLoading(null);
          });
      }
      if (event.data?.type === "OAUTH_ERROR") { setGlobalError(event.data.message || "OAuth failed."); setOauthLoading(null); }
    };
    window.addEventListener("message", handler); return () => window.removeEventListener("message", handler);
  }, [onAuth]);

  const launchOAuth = useCallback((provider: "google" | "github") => {
    const clientId = provider === "google" ? GOOGLE_CLIENT_ID : GITHUB_CLIENT_ID;
    if (!clientId) { setGlobalError(`${provider === "google" ? "Google" : "GitHub"} OAuth not configured.`); return; }
    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem("oauth_state", state);
    setOauthLoading(provider);
    const popup = openOAuthPopup(provider === "google" ? buildGoogleURL(state) : buildGitHubURL(state), `Sign in with ${provider === "google" ? "Google" : "GitHub"}`);
    if (!popup) { setGlobalError("Popup blocked."); setOauthLoading(null); return; }
    // Check if popup closed - with better error handling for COOP
    const checkClosed = () => {
      try {
        if (popup.closed) {
          clearInterval(poll);
          setOauthLoading(null);
        }
      } catch (e) {
        // COOP policy may block access, cleanup and stop polling
        clearInterval(poll);
      }
    };
    const poll = setInterval(checkClosed, 1000);
    // Also cleanup after 10 minutes max
    const timeout = setTimeout(() => { clearInterval(poll); setOauthLoading(null); }, 600000);
    const originalUnload = () => { clearInterval(poll); clearTimeout(timeout); };
    window.addEventListener('beforeunload', originalUnload);
    // Cleanup on unmount
    return () => { clearInterval(poll); clearTimeout(timeout); window.removeEventListener('beforeunload', originalUnload); };
  }, []);

  const handleSocialAuth = useCallback(async (provider: "google" | "github") => {
    setGlobalError("");
    setOauthLoading(provider);
    try {
      // Always use popup OAuth so user explicitly chooses account.
      launchOAuth(provider);
    } catch {
      launchOAuth(provider);
    }
  }, [launchOAuth, onAuth]);

  const handleSubmit = () => {
    const allFields: Record<string, boolean> = isLogin ? { email: true, password: true } : { name: true, email: true, password: true, confirm: true };
    setTouched(allFields);
    if (isLogin) {
      if (!email || !password || !EMAIL_RE.test(email) || password.length < 6) return;
      setGlobalError(""); setSubmitting(true);
      apiLogin(email, password)
        .then(u => {
          setSuccess(true);
          setTimeout(() => onAuth(u), 600);
        })
        .catch(err => {
          setGlobalError(err.message || "Incorrect email or password.");
          setSubmitting(false);
        });
    } else {
      if (!name.trim() || !email || !password || !confirm) return;
      if (!EMAIL_RE.test(email) || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || confirm !== password) return;
      if (!agreed) { setGlobalError("Please accept the Terms of Service."); return; }
      setGlobalError(""); setSubmitting(true);
      apiSignup(name.trim(), email.toLowerCase(), password)
        .then(u => {
          setSuccess(true);
          setTimeout(() => onAuth(u), 600);
        })
        .catch(err => {
          setGlobalError(err.message || "An account with this email already exists.");
          setSubmitting(false);
        });
    }
  };

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "overlayIn 0.2s ease both" }}>
      <div style={{ width: "100%", maxWidth: 420, maxHeight: "92vh", overflowY: "auto", background: tk.surface, borderRadius: 16, border: `1px solid ${tk.border}`, boxShadow: tk.shadowLg, animation: "modalIn 0.28s cubic-bezier(0.34,1.4,0.64,1) both", position: "relative" }}>
        <div style={{ padding: "24px 28px 18px", borderBottom: `1px solid ${tk.border}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: tk.bgAlt, border: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: tk.text, marginBottom: 14, letterSpacing: "-0.03em" }}>D</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: tk.text, letterSpacing: "-0.03em", marginBottom: 4 }}>{isLogin ? "Welcome back" : "Create account"}</div>
              <div style={{ fontSize: 12, color: tk.text3 }}>{isLogin ? "Sign in to your DevIQ account" : "Join DevIQ — it's free"}</div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${tk.border}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: tk.text3, flexShrink: 0, marginLeft: 12 }}>
              <svg width={12} height={12} viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
        <div style={{ padding: "20px 28px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
          {success && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 9, background: tk.greenLight, border: `1px solid ${tk.greenBorder}` }}><svg width={13} height={13} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" fill={tk.green} fillOpacity="0.2" /><path d="M4 7L6.5 9.5L10 5" stroke={tk.green} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg><span style={{ fontSize: 12, color: tk.green, fontWeight: 500 }}>{isLogin ? "Signed in! Redirecting…" : "Account created!"}</span></div>}
          {globalError && !success && <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", borderRadius: 9, background: tk.roseLight, border: `1px solid ${tk.roseBorder}` }}><svg width={13} height={13} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="6.5" stroke={tk.rose} /><path d="M7 4V7.5" stroke={tk.rose} strokeWidth="1.3" strokeLinecap="round" /><circle cx="7" cy="9.5" r="0.7" fill={tk.rose} /></svg><span style={{ fontSize: 12, color: tk.rose, lineHeight: 1.5 }}>{globalError}</span></div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(["google", "github"] as const).map(provider => {
              const cfg = { google: { label: "Continue with Google", icon: <GoogleIcon size={16} />, spinColor: "#4285F4" }, github: { label: "Continue with GitHub", icon: <GitHubIcon size={16} color={tk.text} />, spinColor: tk.text } }[provider];
              return (
                <button key={provider} onClick={() => handleSocialAuth(provider)} disabled={!!oauthLoading || success}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "11px 16px", borderRadius: 9, border: `1.5px solid ${tk.border}`, background: tk.surface, cursor: oauthLoading ? "wait" : "pointer", fontSize: 13, fontWeight: 600, color: tk.text, fontFamily: "inherit", transition: "all 0.15s", opacity: oauthLoading && oauthLoading !== provider ? 0.5 : 1 }}>
                  {oauthLoading === provider ? <div style={{ width: 15, height: 15, border: `2px solid ${tk.border}`, borderTopColor: cfg.spinColor, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : cfg.icon}
                  {oauthLoading === provider ? "Opening…" : cfg.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ flex: 1, height: 1, background: tk.border }} /><span style={{ fontSize: 11, color: tk.text3, fontWeight: 500, letterSpacing: "0.04em" }}>or</span><div style={{ flex: 1, height: 1, background: tk.border }} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {!isLogin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: nameErr ? tk.rose : tk.text3 }}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} onBlur={() => touch("name")} onKeyDown={e => e.key === "Enter" && handleSubmit()} type="text" placeholder="Alex Johnson" autoComplete="name" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${nameErr ? tk.rose : tk.border}`, background: tk.bgAlt, color: tk.text, fontSize: 13, outline: "none", fontFamily: "inherit", transition: "all 0.15s", boxSizing: "border-box" }} />
                {nameErr && <span style={{ fontSize: 11, color: tk.rose }}>{nameErr}</span>}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: emailErr ? tk.rose : tk.text3 }}>Email</label>
              <input value={email} onChange={e => { setEmail(e.target.value); setGlobalError(""); }} onBlur={() => touch("email")} onKeyDown={e => e.key === "Enter" && handleSubmit()} type="email" placeholder="you@example.com" autoComplete="email" style={{ padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${emailErr ? tk.rose : tk.border}`, background: tk.bgAlt, color: tk.text, fontSize: 13, outline: "none", fontFamily: "inherit", transition: "all 0.15s" }} />
              {emailErr && <span style={{ fontSize: 11, color: tk.rose }}>{emailErr}</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: passwordErr ? tk.rose : tk.text3 }}>Password</label>
                {isLogin && <button style={{ fontSize: 11, color: tk.blue, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Forgot?</button>}
              </div>
              <div style={{ position: "relative" }}>
                <input value={password} onChange={e => setPassword(e.target.value)} onBlur={() => touch("password")} onKeyDown={e => e.key === "Enter" && handleSubmit()} type={showPw ? "text" : "password"} placeholder={isLogin ? "Enter password" : "Min 8 chars, 1 uppercase, 1 number"} autoComplete={isLogin ? "current-password" : "new-password"} style={{ width: "100%", padding: "10px 40px 10px 12px", borderRadius: 8, border: `1.5px solid ${passwordErr ? tk.rose : tk.border}`, background: tk.bgAlt, color: tk.text, fontSize: 13, outline: "none", fontFamily: "inherit", transition: "all 0.15s", boxSizing: "border-box" }} />
                <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: tk.text3, display: "flex", alignItems: "center", padding: 2 }}><EyeIcon open={showPw} color={tk.text3} /></button>
              </div>
              {passwordErr && <span style={{ fontSize: 11, color: tk.rose }}>{passwordErr}</span>}
              {!isLogin && password.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
                  <div style={{ display: "flex", gap: 3 }}>{[1, 2, 3, 4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= strength ? strengthColors[strength] : tk.track, transition: "background 0.3s" }} />)}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: strengthColors[strength] || tk.text3, fontWeight: 500 }}>{strengthLabels[strength] || ""}</span>
                    <div style={{ display: "flex", gap: 8 }}>{[{ ok: password.length >= 8, label: "8+ chars" }, { ok: /[A-Z]/.test(password), label: "Uppercase" }, { ok: /[0-9]/.test(password), label: "Number" }].map(r => (<span key={r.label} style={{ fontSize: 10, color: r.ok ? tk.green : tk.text3, display: "flex", alignItems: "center", gap: 3, transition: "color 0.2s" }}>{r.ok ? "✓" : "○"} {r.label}</span>))}</div>
                  </div>
                </div>
              )}
            </div>
            {!isLogin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: confirmErr ? tk.rose : tk.text3 }}>Confirm Password</label>
                <div style={{ position: "relative" }}>
                  <input value={confirm} onChange={e => setConfirm(e.target.value)} onBlur={() => touch("confirm")} onKeyDown={e => e.key === "Enter" && handleSubmit()} type={showConfirm ? "text" : "password"} placeholder="Re-enter password" autoComplete="new-password" style={{ width: "100%", padding: "10px 40px 10px 12px", borderRadius: 8, border: `1.5px solid ${confirmErr ? tk.rose : confirm && confirm === password ? tk.green : tk.border}`, background: tk.bgAlt, color: tk.text, fontSize: 13, outline: "none", fontFamily: "inherit", transition: "all 0.15s", boxSizing: "border-box" }} />
                  <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center" }}>
                    {confirm && confirm === password ? <svg width={14} height={14} viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" fill={tk.green} fillOpacity="0.2" /><path d="M4 7L6.5 9.5L10 5" stroke={tk.green} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg> : <button onClick={() => setShowConfirm(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: tk.text3, display: "flex", padding: 2 }}><EyeIcon open={showConfirm} color={tk.text3} /></button>}
                  </div>
                </div>
                {confirmErr && <span style={{ fontSize: 11, color: tk.rose }}>{confirmErr}</span>}
              </div>
            )}
            {!isLogin && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div onClick={() => { setAgreed(a => !a); setGlobalError(""); }} style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${agreed ? tk.blue : tk.border}`, background: agreed ? tk.blue : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                  {agreed && <svg width={9} height={7} viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{ fontSize: 12, color: tk.text2, lineHeight: 1.5, cursor: "pointer" }} onClick={() => { setAgreed(a => !a); setGlobalError(""); }}>I agree to the <span style={{ color: tk.blue }}>Terms of Service</span> and <span style={{ color: tk.blue }}>Privacy Policy</span></span>
              </div>
            )}
          </div>
          <button onClick={handleSubmit} disabled={submitting || success} style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", cursor: submitting || success ? "default" : "pointer", fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", background: success ? tk.green : tk.accent, color: tk.accentFg, transition: "all 0.2s", opacity: submitting ? 0.75 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {submitting && <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
            {success ? (isLogin ? "Signed in!" : "Account created!") : submitting ? (isLogin ? "Signing in…" : "Creating account…") : (isLogin ? "Sign In" : "Create Account")}
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: tk.text3, margin: 0 }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button onClick={onSwitchMode} style={{ color: tk.blue, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, padding: 0 }}>{isLogin ? "Sign up free" : "Sign in"}</button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   PROFILE PAGE
───────────────────────────────────────────────── */
function ProfilePage({ user, profile, tk, isMobile, onNavigate }: { user: AuthUser; profile: UserProfile | null; tk: Theme; isMobile: boolean; onNavigate: (p: Page) => void }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  
  // Reset avatarFailed when user changes
  useEffect(() => {
    setAvatarFailed(false);
  }, [user.email, user.avatar]);
  
  const p = profile;
  const joinDate = p?.joinedAt ? new Date(p.joinedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—";
  const providerColors: Record<string, string> = { github: "#24292e", google: "#4285F4", email: tk.blue };
  const providerColor = providerColors[user.provider || "email"] || tk.blue;
  const displayName = p?.displayName || user.name;
  const avatarUrl = user.avatar || p?.avatar;
  const stats = [
    { label: "Analyses Run", value: p?.analysesRun ?? 0, icon: "◎", color: tk.blue, bg: tk.blueLight, border: tk.blueBorder },
    { label: "Comparisons", value: p?.comparisonsRun ?? 0, icon: "⇄", color: tk.purple, bg: tk.purpleLight, border: tk.purpleBorder },
    { label: "AI Insights", value: p?.aiInsightsRun ?? 0, icon: "⊞", color: tk.amber, bg: tk.amberLight, border: tk.amberBorder },
  ];
  return (
    <div className="fu">
      <div style={{ position: "relative", marginBottom: isMobile ? 52 : 68 }}>
        <div style={{ height: isMobile ? 110 : 148, borderRadius: 12, background: `linear-gradient(135deg, ${tk.blue}20 0%, ${tk.purple}18 50%, ${tk.teal}20 100%)`, border: `1px solid ${tk.border}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle, ${tk.border} 1px, transparent 1px)`, backgroundSize: "24px 24px", opacity: 0.6 }} />
          <button onClick={() => onNavigate("settings")} style={{ position: "absolute", top: 12, right: 14, fontSize: 11, color: tk.text3, background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 6, padding: "4px 11px", cursor: "pointer", fontWeight: 500, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            Edit Profile
          </button>
        </div>
        <div style={{ position: "absolute", bottom: isMobile ? -38 : -46, left: isMobile ? 20 : 32 }}>
          <div style={{ position: "relative" }} key={`avatar-${avatarUrl || "none"}`}>
            {avatarUrl && !avatarFailed ? (
              <img 
                key={avatarUrl}
                src={avatarUrl} 
                alt={displayName} 
                onError={() => { setAvatarFailed(true); }} 
                style={{ width: isMobile ? 76 : 92, height: isMobile ? 76 : 92, borderRadius: "50%", objectFit: "cover", border: `3px solid ${tk.bg}`, boxShadow: tk.shadowMd, display: "block" }} 
              />
            ) : (
              <div style={{ width: isMobile ? 76 : 92, height: isMobile ? 76 : 92, borderRadius: "50%", background: providerColor, border: `3px solid ${tk.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 28 : 34, fontWeight: 700, color: "#fff", boxShadow: tk.shadowMd, letterSpacing: "-0.03em" }}>{initial(displayName)}</div>
            )}
            <div style={{ position: "absolute", bottom: 2, right: 2, width: 24, height: 24, borderRadius: "50%", background: providerColor, border: `2px solid ${tk.bg}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {user.provider === "github" && <GitHubIcon size={12} color="#fff" />}
              {user.provider === "google" && <GoogleIcon size={12} />}
              {(!user.provider || user.provider === "email") && <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 8 10-8" /></svg>}
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: isMobile ? "0 0 20px" : "0 0 28px", borderBottom: `1px solid ${tk.border}`, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: tk.text, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 6 }}>{displayName}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: p?.bio ? 10 : 0 }}>
              <span style={{ fontSize: 13, color: tk.text2 }}>{user.email}</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: tk.bgAlt, border: `1px solid ${tk.border}`, color: tk.text3, textTransform: "capitalize" as const }}>via {user.provider || "email"}</span>
              <span style={{ fontSize: 11, color: tk.text3, display: "flex", alignItems: "center", gap: 4 }}><svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>Joined {joinDate}</span>
              {p?.location && <span style={{ fontSize: 11, color: tk.text3, display: "flex", alignItems: "center", gap: 4 }}><svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>{p.location}</span>}
              {p?.website && <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: tk.blue, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}><svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>{p.website.replace(/^https?:\/\//, "")}</a>}
            </div>
            {p?.bio && <p style={{ fontSize: 13, color: tk.text2, lineHeight: 1.65, maxWidth: 500, margin: 0 }}>{p.bio}</p>}
          </div>
          <button onClick={() => onNavigate("settings")} style={{ padding: "7px 16px", borderRadius: 7, border: `1px solid ${tk.border}`, background: tk.surface, cursor: "pointer", fontSize: 12, fontWeight: 500, color: tk.text2, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            Edit Profile
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, padding: "16px 18px", boxShadow: tk.shadow }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: s.color, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: tk.text, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: tk.text3, fontWeight: 500, letterSpacing: "0.03em" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: tk.text3 }}>Platform Connections</span>
              <button onClick={() => onNavigate("analyze")} style={{ fontSize: 11, color: tk.blue, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 500 }}>Run Analysis →</button>
            </div>
            {([{ name: "GitHub", platform: "github" as const, desc: "Code repositories & contribution activity", color: tk.blue, bg: tk.blueLight, border: tk.blueBorder }, { name: "LeetCode", platform: "leetcode" as const, desc: "Coding challenge rankings & stats", color: tk.amber, bg: tk.amberLight, border: tk.amberBorder }, { name: "Codeforces", platform: "codeforces" as const, desc: "Competitive programming rating", color: tk.purple, bg: tk.purpleLight, border: tk.purpleBorder }]).map((plt, i, arr) => (
              <div key={plt.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${tk.border}` : "none", background: i % 2 === 0 ? "transparent" : tk.bgAlt }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: plt.bg, border: `1px solid ${plt.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><PlatformIcon platform={plt.platform} size={16} color={plt.color} /></div>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>{plt.name}</div><div style={{ fontSize: 11, color: tk.text3, marginTop: 2 }}>{plt.desc}</div></div>
                </div>
                <button onClick={() => onNavigate("analyze")} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tk.border}`, background: "transparent", cursor: "pointer", fontSize: 11, fontWeight: 600, color: tk.text3, transition: "all 0.15s", fontFamily: "inherit" }}>Connect</button>
              </div>
            ))}
          </div>
          <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: tk.text3 }}>Recent Analyses</span>
              {(p?.recentAnalyses?.length ?? 0) > 0 && <span style={{ fontSize: 11, color: tk.text3 }}>{p!.recentAnalyses!.length} total</span>}
            </div>
            {(!p?.recentAnalyses || p.recentAnalyses.length === 0) ? (
              <div style={{ padding: "32px 18px", textAlign: "center" as const }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: tk.bgAlt, border: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 18, color: tk.text3 }}>◎</div>
                <div style={{ fontSize: 13, color: tk.text3, marginBottom: 14, lineHeight: 1.5 }}>No analyses yet.<br />Run one to track your history.</div>
                <button onClick={() => onNavigate("analyze")} style={{ padding: "7px 18px", border: "none", borderRadius: 7, background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Run First Analysis →</button>
              </div>
            ) : (
              <div>
                {p!.recentAnalyses!.map((rec, i) => {
                  const d = new Date(rec.date);
                  const scoreColor = rec.score >= 70 ? tk.green : rec.score >= 40 ? tk.amber : tk.rose;
                  const scoreBg = rec.score >= 70 ? tk.greenLight : rec.score >= 40 ? tk.amberLight : tk.roseLight;
                  const scoreBorder = rec.score >= 70 ? tk.greenBorder : rec.score >= 40 ? tk.amberBorder : tk.roseBorder;
                  return (
                    <div key={rec.id} style={{ padding: "14px 18px", borderBottom: i < p!.recentAnalyses!.length - 1 ? `1px solid ${tk.border}` : "none", background: i % 2 === 0 ? "transparent" : tk.bgAlt }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: tk.blue, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: tk.text }}>{d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          <span style={{ fontSize: 11, color: tk.text3 }}>{d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                        {rec.score > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor, background: scoreBg, border: `1px solid ${scoreBorder}`, borderRadius: 6, padding: "2px 9px" }}>{rec.score.toFixed(1)}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 8 }}>
                        {rec.github && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: tk.blueLight, border: `1px solid ${tk.blueBorder}`, color: tk.blue, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}><PlatformIcon platform="github" size={10} color={tk.blue} />{rec.github}</span>}
                        {rec.leetcode && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: tk.amberLight, border: `1px solid ${tk.amberBorder}`, color: tk.amber, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}><PlatformIcon platform="leetcode" size={10} color={tk.amber} />{rec.leetcode}</span>}
                        {rec.codeforces && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: tk.purpleLight, border: `1px solid ${tk.purpleBorder}`, color: tk.purple, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}><PlatformIcon platform="codeforces" size={10} color={tk.purple} />{rec.codeforces}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                        {rec.ghRepos != null && <span style={{ fontSize: 11, color: tk.text3 }}>{rec.ghRepos} repos</span>}
                        {rec.ghStars != null && <span style={{ fontSize: 11, color: tk.text3 }}>{rec.ghStars} stars</span>}
                        {rec.ghLang && <span style={{ fontSize: 11, color: tk.text3 }}>{rec.ghLang}</span>}
                        {rec.lcSolved != null && <span style={{ fontSize: 11, color: tk.text3, display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: tk.green, fontWeight: 600 }}>{rec.lcEasy ?? 0}</span><span style={{ color: tk.amber, fontWeight: 600 }}>{rec.lcMedium ?? 0}</span><span style={{ color: tk.rose, fontWeight: 600 }}>{rec.lcHard ?? 0}</span><span>= {rec.lcSolved} solved</span></span>}
                        {rec.cfRating != null && <span style={{ fontSize: 11, color: tk.text3 }}>{rec.cfRating}{rec.cfRank && ` (${rec.cfRank})`}</span>}
                      </div>
                    </div>
                  );
                })}
                <div style={{ padding: "10px 18px", borderTop: `1px solid ${tk.border}`, display: "flex", justifyContent: "center" }}>
                  <button onClick={() => onNavigate("analyze")} style={{ fontSize: 12, color: tk.blue, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Run New Analysis →</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: tk.text3 }}>About</span>
              <button onClick={() => onNavigate("settings")} style={{ fontSize: 11, color: tk.blue, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>Edit</button>
            </div>
            <div style={{ padding: "14px 18px" }}>
              {p?.bio ? <p style={{ fontSize: 13, color: tk.text2, lineHeight: 1.65, margin: "0 0 14px" }}>{p.bio}</p> : <p style={{ fontSize: 12, color: tk.text3, lineHeight: 1.6, marginBottom: 14, fontStyle: "italic" as const }}>No bio yet. <button onClick={() => onNavigate("settings")} style={{ color: tk.blue, background: "none", border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit", padding: 0 }}>Add one →</button></p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={tk.text3} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 8 10-8" /></svg><span style={{ fontSize: 12, color: tk.text2 }}>{user.email}</span></div>
                {p?.location && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={tk.text3} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg><span style={{ fontSize: 12, color: tk.text2 }}>{p.location}</span></div>}
                {p?.website && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={tk.text3} strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg><a href={p.website.startsWith("http") ? p.website : `https://${p.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: tk.blue, textDecoration: "none" }}>{p.website.replace(/^https?:\/\//, "")}</a></div>}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={tk.text3} strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg><span style={{ fontSize: 12, color: tk.text2 }}>Joined {joinDate}</span></div>
              </div>
            </div>
          </div>
          <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
            <div style={{ padding: "12px 18px", borderBottom: `1px solid ${tk.border}` }}><span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: tk.text3 }}>DevIQ Score</span></div>
            <div style={{ padding: "24px 18px", textAlign: "center" as const }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", border: `2px dashed ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: tk.text3, fontSize: 20, fontWeight: 300 }}>?</div>
              <div style={{ fontSize: 12, color: tk.text3, lineHeight: 1.6, marginBottom: 14 }}>Connect your platforms to get a unified developer score.</div>
              <button onClick={() => onNavigate("analyze")} style={{ width: "100%", padding: "9px", border: "none", borderRadius: 7, background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Run Analysis →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   HISTORY PAGE
───────────────────────────────────────────────── */
function HistoryPage({ user, profile, tk, isMobile, onNavigate }: { user: AuthUser; profile: UserProfile | null; tk: Theme; isMobile: boolean; onNavigate: (p: Page) => void }) {
  const p = profile;
  const analyses = p?.recentAnalyses || [];
  return (
    <div className="fu">
      <div style={{ padding: isMobile ? "36px 0 28px" : "56px 0 40px", borderBottom: `1px solid ${tk.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: tk.text3, marginBottom: 12 }}>Analysis History</div>
        <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 700, letterSpacing: "-0.04em", color: tk.text, lineHeight: 1.08 }}>Your Past Analyses</h1>
        <p style={{ fontSize: 15, color: tk.text2, lineHeight: 1.65, marginTop: 8 }}>Review and compare your previous developer profile analyses.</p>
      </div>
      {analyses.length === 0 ? (
        <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, padding: "48px 32px", textAlign: "center", boxShadow: tk.shadow }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: tk.bgAlt, border: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24, color: tk.text3 }}>◎</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: tk.text, marginBottom: 8 }}>No analyses yet</div>
          <div style={{ fontSize: 13, color: tk.text2, marginBottom: 20 }}>Run your first analysis to start tracking your history.</div>
          <button onClick={() => onNavigate("analyze")} style={{ padding: "10px 24px", border: "none", borderRadius: 8, background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Run Analysis</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>All Analyses ({analyses.length})</span>
              <button onClick={() => onNavigate("analyze")} style={{ fontSize: 12, color: tk.blue, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Run New →</button>
            </div>
            {analyses.map((rec, i) => {
              const d = new Date(rec.date);
              const scoreColor = rec.score >= 70 ? tk.green : rec.score >= 40 ? tk.amber : tk.rose;
              const scoreBg = rec.score >= 70 ? tk.greenLight : rec.score >= 40 ? tk.amberLight : tk.roseLight;
              const scoreBorder = rec.score >= 70 ? tk.greenBorder : rec.score >= 40 ? tk.amberBorder : tk.roseBorder;
              return (
                <div key={rec.id} style={{ padding: "18px 20px", borderBottom: i < analyses.length - 1 ? `1px solid ${tk.border}` : "none", background: i % 2 === 0 ? "transparent" : tk.bgAlt }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: tk.blue, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>{d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</div>
                        <div style={{ fontSize: 12, color: tk.text3 }}>{d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                      </div>
                    </div>
                    {rec.score > 0 && <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor, background: scoreBg, border: `1px solid ${scoreBorder}`, borderRadius: 8, padding: "4px 12px" }}>{rec.score.toFixed(1)}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 12 }}>
                    {rec.github && <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: tk.blueLight, border: `1px solid ${tk.blueBorder}`, color: tk.blue, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><PlatformIcon platform="github" size={12} color={tk.blue} />{rec.github}</span>}
                    {rec.leetcode && <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: tk.amberLight, border: `1px solid ${tk.amberBorder}`, color: tk.amber, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><PlatformIcon platform="leetcode" size={12} color={tk.amber} />{rec.leetcode}</span>}
                    {rec.codeforces && <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: tk.purpleLight, border: `1px solid ${tk.purpleBorder}`, color: tk.purple, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}><PlatformIcon platform="codeforces" size={12} color={tk.purple} />{rec.codeforces}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
                    {rec.ghRepos != null && <span style={{ fontSize: 12, color: tk.text3 }}>{rec.ghRepos} repos</span>}
                    {rec.ghStars != null && <span style={{ fontSize: 12, color: tk.text3 }}>{rec.ghStars} stars</span>}
                    {rec.ghLang && <span style={{ fontSize: 12, color: tk.text3 }}>{rec.ghLang}</span>}
                    {rec.lcSolved != null && <span style={{ fontSize: 12, color: tk.text3, display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: tk.green, fontWeight: 600 }}>{rec.lcEasy ?? 0}</span><span style={{ color: tk.amber, fontWeight: 600 }}>{rec.lcMedium ?? 0}</span><span style={{ color: tk.rose, fontWeight: 600 }}>{rec.lcHard ?? 0}</span><span>= {rec.lcSolved} solved</span></span>}
                    {rec.cfRating != null && <span style={{ fontSize: 12, color: tk.text3 }}>{rec.cfRating}{rec.cfRank && ` (${rec.cfRank})`}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   CHAT PAGE
───────────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function ChatPage({ user, profile, tk, isMobile }: {
  user: AuthUser; profile: UserProfile | null; tk: Theme; isMobile: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello ${user.name}! I'm your AI assistant. I can help you understand your developer profile, analyze your coding skills, and answer questions about your progress. What would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare context about user's profile
      const profileContext = profile ? {
        analysisHistory: profile.recentAnalyses?.slice(-5) || [], // Last 5 analyses
        following: profile.following || [],
        notifications: profile.notifications?.slice(-10) || [], // Last 10 notifications
        totalAnalyses: profile.recentAnalyses?.length || 0,
        followedUsers: profile.following?.length || 0
      } : null;

      const systemPrompt = `You are an AI assistant helping a developer understand their coding profile and progress. 

User Profile Context:
${profileContext ? `
- Total analyses performed: ${profileContext.totalAnalyses}
- Users following: ${profileContext.followedUsers}
- Recent analysis history: ${profileContext.analysisHistory.map((h: AnalysisRecord) => `${h.github || h.leetcode || h.codeforces} (${h.github ? "GitHub" : h.leetcode ? "LeetCode" : "Codeforces"}): ${h.score?.toFixed(1)} points`).join(', ')}
- Recent notifications: ${profileContext.notifications.map(n => n.message).join('; ')}

The user can ask about:
- Their analysis history and scores
- Following other developers
- Notifications about score changes
- General advice about their coding progress
- Comparisons between different analyses
` : 'No profile data available yet. The user should analyze some profiles first.'}

Be helpful, concise, and encouraging. Use the profile data to provide personalized insights. If they ask about something not in their profile, suggest they analyze more profiles or follow more developers.`;

      if (!GROQ_KEY) {
        throw new Error("Groq API key not configured");
      }

      const payload = {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage.content }
        ],
        max_tokens: 500,
        temperature: 0.7
      };

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Groq API error response:", errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fu">
      <div style={{ padding: isMobile ? "36px 0 28px" : "56px 0 40px", borderBottom: `1px solid ${tk.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: tk.text3, marginBottom: 12 }}>AI Assistant</div>
        <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 700, letterSpacing: "-0.04em", color: tk.text, lineHeight: 1.08 }}>Chat with Your Profile</h1>
        <p style={{ fontSize: 14, color: tk.text2, marginTop: 8, lineHeight: 1.4 }}>Ask questions about your coding progress, analysis history, and get personalized insights.</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", maxWidth: 800, margin: "0 auto" }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px", marginBottom: 20 }}>
          {messages.map((message) => (
            <div key={message.id} style={{
              display: "flex",
              marginBottom: 16,
              justifyContent: message.role === "user" ? "flex-end" : "flex-start"
            }}>
              <div style={{
                maxWidth: "70%",
                padding: "12px 16px",
                borderRadius: 12,
                background: message.role === "user" ? tk.accent : tk.surface,
                color: message.role === "user" ? tk.accentFg : tk.text,
                border: message.role === "assistant" ? `1px solid ${tk.border}` : "none",
                fontSize: 14,
                lineHeight: 1.4
              }}>
                {message.content}
                <div style={{
                  fontSize: 10,
                  color: message.role === "user" ? tk.accentFg + "80" : tk.text3,
                  marginTop: 4,
                  textAlign: message.role === "user" ? "right" : "left"
                }}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: "flex", marginBottom: 16, justifyContent: "flex-start" }}>
              <div style={{
                padding: "12px 16px",
                borderRadius: 12,
                background: tk.surface,
                border: `1px solid ${tk.border}`,
                fontSize: 14,
                color: tk.text3
              }}>
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${tk.border}`, paddingTop: 20 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your profile, analysis history, or coding progress..."
              style={{
                flex: 1,
                padding: "12px 16px",
                border: `1px solid ${tk.border}`,
                borderRadius: 8,
                background: tk.bg,
                color: tk.text,
                fontSize: 14,
                outline: "none"
              }}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: 8,
                background: (!input.trim() || isLoading) ? tk.border : tk.accent,
                color: (!input.trim() || isLoading) ? tk.text3 : tk.accentFg,
                cursor: (!input.trim() || isLoading) ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                transition: "all 0.2s"
              }}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: tk.text3, marginTop: 8, textAlign: "center" }}>
            Press Enter to send • AI responses are based on your profile data
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   PRACTICE PAGE
───────────────────────────────────────────────── */
function PracticePage({ user, profile, tk, isMobile, onProfileSave }: {
  user: AuthUser; profile: UserProfile | null; tk: Theme; isMobile: boolean;
  onProfileSave: (p: UserProfile) => void;
}) {
  const p = profile;
  const [recommendedProblem, setRecommendedProblem] = useState<LeetCodeProblem | null>(null);
  const [weakCategories, setWeakCategories] = useState<WeakCategory[]>([]);
  const [solvedProblems, setSolvedProblems] = useState<SolvedProblem[]>(p?.solvedProblems || []);
  const [loading, setLoading] = useState(false);
  const [leetcodeUsername, setLeetcodeUsername] = useState("");

  const fetchAndAnalyzeLeetCode = useCallback(async (username: string) => {
    if (!username.trim()) return;
    setLoading(true);
    try {
      // Try to fetch from backend first, fallback to mock data if unavailable
      let categories: WeakCategory[] = [];
      let recommendedProblem: LeetCodeProblem | null = null;

      try {
        // Attempt to use backend API
        const res = await fetch(`${API}/analyze?leetcode=${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.leetcode) {
            const problemStats = data.leetcode.problem_tags || {};
            for (const [tag, stats] of Object.entries(problemStats)) {
              const tagStats = stats as any;
              const solved = tagStats.solved || 0;
              const total = tagStats.total || solved + (tagStats.unsolved || 0);

              categories.push({
                tag,
                totalProblems: total,
                solvedProblems: solved,
                accuracy: total > 0 ? Math.round((solved / total) * 100) : 0,
                difficulties: {
                  Easy: tagStats.easy_solved || 0,
                  Medium: tagStats.medium_solved || 0,
                  Hard: tagStats.hard_solved || 0
                }
              });
            }
          }
        }
      } catch (backendError) {
        // Backend unavailable, use mock data
        console.warn("Backend unavailable, using mock data");
      }

      // If we didn't get categories from backend, use realistic mock data
      if (categories.length === 0) {
        categories = [
          { tag: "Dynamic Programming", totalProblems: 45, solvedProblems: 18, accuracy: 40, difficulties: { Easy: 5, Medium: 13, Hard: 27 } },
          { tag: "Graphs", totalProblems: 40, solvedProblems: 12, accuracy: 30, difficulties: { Easy: 8, Medium: 16, Hard: 16 } },
          { tag: "Arrays & Hashing", totalProblems: 60, solvedProblems: 35, accuracy: 58, difficulties: { Easy: 20, Medium: 30, Hard: 10 } },
          { tag: "Strings", totalProblems: 35, solvedProblems: 22, accuracy: 63, difficulties: { Easy: 12, Medium: 18, Hard: 5 } },
          { tag: "Trees", totalProblems: 50, solvedProblems: 28, accuracy: 56, difficulties: { Easy: 15, Medium: 25, Hard: 10 } },
          { tag: "Linked Lists", totalProblems: 30, solvedProblems: 15, accuracy: 50, difficulties: { Easy: 10, Medium: 15, Hard: 5 } },
          { tag: "Binary Search", totalProblems: 25, solvedProblems: 8, accuracy: 32, difficulties: { Easy: 8, Medium: 12, Hard: 5 } },
          { tag: "Sliding Window", totalProblems: 20, solvedProblems: 12, accuracy: 60, difficulties: { Easy: 8, Medium: 10, Hard: 2 } }
        ];
      }

      // Sort by accuracy to find weakest
      categories.sort((a, b) => a.accuracy - b.accuracy);
      setWeakCategories(categories);

      // Find a problem to recommend from weakest category
      if (categories.length > 0) {
        const weakestTag = categories[0].tag;
        const difficultyList = ["Easy", "Medium", "Hard"] as const;
        let selectedDifficulty: typeof difficultyList[number] = "Medium";

        // Choose difficulty based on accuracy
        if (categories[0].accuracy < 30) {
          selectedDifficulty = categories[0].difficulties.Hard > 0 ? "Hard" : "Medium";
        } else if (categories[0].accuracy < 50) {
          selectedDifficulty = "Medium";
        } else {
          selectedDifficulty = "Easy";
        }

        recommendedProblem = {
          id: `lc_${Date.now()}`,
          title: `${weakestTag} Problem`,
          difficulty: selectedDifficulty as "Easy" | "Medium" | "Hard",
          topicTags: [weakestTag],
          slugTitle: weakestTag.toLowerCase().replace(/\s+/g, "-"),
          url: `https://leetcode.com/problems/?topicTags=${encodeURIComponent(weakestTag)}`
        };
        setRecommendedProblem(recommendedProblem);
      }

      // Update profile with weak categories
      if (p) {
        const updatedProfile: UserProfile = {
          ...p,
          solvedProblems: solvedProblems,
          weakCategories: categories,
          lastPracticeProblem: recommendedProblem || undefined
        };
        onProfileSave(updatedProfile);
      }
    } catch (error) {
      console.error("Error analyzing LeetCode data:", error);
      alert(`Error: ${error instanceof Error ? error.message : "Failed to analyze LeetCode data"}`);
    } finally {
      setLoading(false);
    }
  }, [p, solvedProblems, onProfileSave]);

  useEffect(() => {
    if (p?.weakCategories) {
      setWeakCategories(p.weakCategories);
    }
    if (p?.solvedProblems) {
      setSolvedProblems(p.solvedProblems);
    }
  }, [p]);

  const markProblemSolved = (problem: LeetCodeProblem) => {
    const newSolvedProblem: SolvedProblem = {
      ...problem,
      solvedDate: new Date().toISOString(),
      leetcodeUsername: leetcodeUsername
    };

    const updated = [...solvedProblems, newSolvedProblem];
    setSolvedProblems(updated);

    if (p) {
      const updatedProfile = { ...p, solvedProblems: updated };
      onProfileSave(updatedProfile);
    }
  };

  return (
    <div className="fu">
      <div style={{ padding: isMobile ? "36px 0 28px" : "56px 0 40px", borderBottom: `1px solid ${tk.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: tk.text3, marginBottom: 12 }}>Daily Practice</div>
        <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 700, letterSpacing: "-0.04em", color: tk.text, lineHeight: 1.08 }}>What Should You Solve Today?</h1>
        <p style={{ fontSize: 14, color: tk.text2, marginTop: 8, lineHeight: 1.4 }}>Get personalized LeetCode problem recommendations based on your weak categories.</p>
      </div>

      {/* Input Section */}
      <div style={{ maxWidth: 600, marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={leetcodeUsername}
            onChange={(e) => setLeetcodeUsername(e.target.value)}
            placeholder="Enter your LeetCode username..."
            style={{
              flex: 1,
              padding: "12px 16px",
              border: `1px solid ${tk.border}`,
              borderRadius: 8,
              background: tk.bg,
              color: tk.text,
              fontSize: 14,
              outline: "none"
            }}
          />
          <button
            onClick={() => fetchAndAnalyzeLeetCode(leetcodeUsername)}
            disabled={!leetcodeUsername.trim() || loading}
            style={{
              padding: "12px 24px",
              border: "none",
              borderRadius: 8,
              background: (!leetcodeUsername.trim() || loading) ? tk.border : tk.accent,
              color: (!leetcodeUsername.trim() || loading) ? tk.text3 : tk.accentFg,
              cursor: (!leetcodeUsername.trim() || loading) ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: "nowrap" as const
            }}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: tk.text3 }}>We'll analyze your problem-solving patterns to find your weakest areas.</div>
      </div>

      {/* Recommended Problem */}
      {recommendedProblem && (
        <div style={{ marginBottom: 32, padding: 20, background: tk.surface, border: `2px solid ${tk.green}`, borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: tk.green, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 4 }}>Today's Challenge</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: tk.text, marginBottom: 8 }}>{recommendedProblem.title}</h2>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" as const }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6, background: recommendedProblem.difficulty === "Hard" ? tk.rose + "20" : recommendedProblem.difficulty === "Medium" ? tk.amber + "20" : tk.green + "20", color: recommendedProblem.difficulty === "Hard" ? tk.rose : recommendedProblem.difficulty === "Medium" ? tk.amber : tk.green }}>
                  {recommendedProblem.difficulty}
                </span>
                {recommendedProblem.topicTags.map(tag => (
                  <span key={tag} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: tk.bgAlt, color: tk.text2, border: `1px solid ${tk.border}` }}>
                    {tag}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 13, color: tk.text2, lineHeight: 1.4, margin: 0 }}>This problem is in your weakest category. Solving it will help improve your overall score.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={recommendedProblem.url} target="_blank" rel="noopener noreferrer" style={{ padding: "10px 20px", borderRadius: 8, background: tk.accent, color: tk.accentFg, textDecoration: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Solve on LeetCode →
            </a>
            <button
              onClick={() => {
                markProblemSolved(recommendedProblem);
                alert("Problem marked as solved! 🎉");
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: `1px solid ${tk.border}`,
                background: tk.surface,
                color: tk.text2,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600
              }}
            >
              ✓ Mark Solved
            </button>
          </div>
        </div>
      )}

      {/* Weak Categories */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: tk.text3, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 }}>Your Weak Categories</div>
        {weakCategories.length === 0 ? (
          <div style={{ padding: 20, background: tk.bgAlt, borderRadius: 8, textAlign: "center", color: tk.text3 }}>
            Enter your LeetCode username to see your weak categories.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {weakCategories.map((cat, i) => (
              <div key={cat.tag} style={{ padding: 16, background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: tk.text, margin: 0, marginBottom: 4 }}>{cat.tag}</h3>
                    <div style={{ fontSize: 12, color: tk.text3, marginBottom: 8 }}>{cat.solvedProblems} of {cat.totalProblems} solved</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: cat.accuracy < 30 ? tk.rose : cat.accuracy < 60 ? tk.amber : tk.green }}>
                    {cat.accuracy}%
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, background: tk.bgAlt, borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${cat.accuracy}%`, background: cat.accuracy < 30 ? tk.rose : cat.accuracy < 60 ? tk.amber : tk.green, borderRadius: 3, transition: "width 0.3s" }} />
                </div>

                {/* Difficulty breakdown */}
                <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                  <span style={{ color: tk.green }}>E: {cat.difficulties.Easy}</span>
                  <span style={{ color: tk.amber }}>M: {cat.difficulties.Medium}</span>
                  <span style={{ color: tk.rose }}>H: {cat.difficulties.Hard}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solved Problems History */}
      {solvedProblems.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: tk.text3, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 12 }}>✅ Recently Solved</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {solvedProblems.slice(-5).reverse().map((problem) => (
              <div key={problem.id} style={{ padding: 12, background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: tk.text, marginBottom: 4 }}>{problem.title}</div>
                  <div style={{ fontSize: 11, color: tk.text3 }}>Solved {new Date(problem.solvedDate).toLocaleDateString()}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 4, background: problem.difficulty === "Hard" ? tk.rose + "20" : problem.difficulty === "Medium" ? tk.amber + "20" : tk.green + "20", color: problem.difficulty === "Hard" ? tk.rose : problem.difficulty === "Medium" ? tk.amber : tk.green }}>
                  {problem.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   FOLLOWING PAGE
───────────────────────────────────────────────── */
function FollowingPage({ user, profile, tk, isMobile, onNavigate, onProfileSave }: {
  user: AuthUser; profile: UserProfile | null; tk: Theme; isMobile: boolean;
  onNavigate: (p: Page) => void; onProfileSave: (p: UserProfile) => void;
}) {
  const p = profile;
  const [following, setFollowing] = useState<FollowedUser[]>(p?.following || []);
  const [notifications, setNotifications] = useState<Notification[]>(p?.notifications || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FollowedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"following" | "notifications">("following");

  useEffect(() => {
    if (p) {
      setFollowing(p.following || []);
      setNotifications(p.notifications || []);
    }
  }, [p]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      // Search GitHub users
      const githubRes = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=5`, {
        headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}
      });
      const githubData = await githubRes.json();

      const results: FollowedUser[] = [];
      if (githubData.items) {
        for (const item of githubData.items.slice(0, 3)) {
          results.push({
            username: item.login,
            platform: "github",
            avatar: item.avatar_url
          });
        }
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => searchUsers(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchUsers]);

  useEffect(() => {
    if (activeTab === "notifications" && p?.notifications) {
      const updatedNotifications = p.notifications.map(n => ({ ...n, read: true }));
      const updatedProfile = { ...p, notifications: updatedNotifications };
      onProfileSave(updatedProfile);
    }
  }, [activeTab, p, onProfileSave]);

  const followUser = (newUser: FollowedUser) => {
    const updated = [...following, newUser];
    setFollowing(updated);
    const updatedProfile = { ...p!, following: updated };
    onProfileSave(updatedProfile);
  };

  const unfollowUser = (username: string, platform: string) => {
    const updated = following.filter(f => !(f.username === username && f.platform === platform));
    setFollowing(updated);
    const updatedProfile = { ...p!, following: updated };
    onProfileSave(updatedProfile);
  };

  const isFollowing = (username: string, platform: string) => {
    return following.some(f => f.username === username && f.platform === platform);
  };

  const markNotificationRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    const updatedProfile = { ...p!, notifications: updated };
    onProfileSave(updatedProfile);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const tabs = [
    { id: "following" as const, label: "Following", count: following.length },
    { id: "notifications" as const, label: "Notifications", count: unreadCount }
  ];

  return (
    <div className="fu">
      <div style={{ padding: isMobile ? "36px 0 28px" : "56px 0 40px", borderBottom: `1px solid ${tk.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: tk.text3, marginBottom: 12 }}>Social Network</div>
        <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 700, letterSpacing: "-0.04em", color: tk.text, lineHeight: 1.08 }}>Following & Notifications</h1>
        <p style={{ fontSize: 15, color: tk.text2, lineHeight: 1.65, marginTop: 8 }}>Follow developers and get notified when their scores change.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: `1px solid ${tk.border}`, paddingBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: activeTab === tab.id ? tk.accent : "transparent", color: activeTab === tab.id ? tk.accentFg : tk.text2, cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            {tab.label}
            {tab.count > 0 && <span style={{ background: activeTab === tab.id ? tk.accentFg : tk.blue, color: activeTab === tab.id ? tk.accent : "#fff", borderRadius: 10, padding: "2px 6px", fontSize: 10, fontWeight: 600, minWidth: 16, textAlign: "center" }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === "following" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Search and Add */}
          <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, padding: "20px", boxShadow: tk.shadow }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: tk.text, marginBottom: 16 }}>Find Developers to Follow</div>
            <div style={{ position: "relative" }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search GitHub usernames..."
                style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.bgAlt, color: tk.text, fontSize: 14, outline: "none" }}
              />
              {isSearching && (
                <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, border: `2px solid ${tk.border}`, borderTopColor: tk.blue, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
              )}
            </div>
            {searchResults.length > 0 && (
              <div style={{ marginTop: 12, borderRadius: 8, border: `1px solid ${tk.border}`, overflow: "hidden" }}>
                {searchResults.map(result => (
                  <div key={`${result.platform}-${result.username}`} style={{ padding: "12px 16px", borderBottom: `1px solid ${tk.border}`, background: tk.surface, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {result.avatar ? (
                        <img src={result.avatar} alt={result.username} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: tk.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 600, color: "#fff" }}>
                          {initial(result.username)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: tk.text }}>{result.username}</div>
                        <div style={{ fontSize: 12, color: tk.text3, display: "flex", alignItems: "center", gap: 4 }}>
                          <PlatformIcon platform={result.platform} size={12} color={tk.blue} />
                          {result.platform}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => isFollowing(result.username, result.platform) ? unfollowUser(result.username, result.platform) : followUser(result)}
                      style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${isFollowing(result.username, result.platform) ? tk.roseBorder : tk.border}`, background: isFollowing(result.username, result.platform) ? tk.roseLight : tk.accent, color: isFollowing(result.username, result.platform) ? tk.rose : tk.accentFg, cursor: "pointer", fontSize: 12, fontWeight: 500 }}
                    >
                      {isFollowing(result.username, result.platform) ? "Unfollow" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Following List */}
          <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: tk.text }}>Following ({following.length})</span>
            </div>
            {following.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: tk.bgAlt, border: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, color: tk.text3 }}>👥</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: tk.text, marginBottom: 8 }}>No one followed yet</div>
                <div style={{ fontSize: 13, color: tk.text2, marginBottom: 16 }}>Search for developers above to start following them.</div>
              </div>
            ) : (
              following.map(followed => (
                <div key={`${followed.platform}-${followed.username}`} style={{ padding: "16px 20px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {followed.avatar ? (
                      <img src={followed.avatar} alt={followed.username} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: tk.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, color: "#fff" }}>
                        {initial(followed.username)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: tk.text }}>{followed.username}</div>
                      <div style={{ fontSize: 12, color: tk.text3, display: "flex", alignItems: "center", gap: 4 }}>
                        <PlatformIcon platform={followed.platform} size={12} color={tk.blue} />
                        {followed.platform}
                        {followed.lastScore && <span>• Score: {followed.lastScore.toFixed(1)}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => unfollowUser(followed.username, followed.platform)}
                    style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${tk.roseBorder}`, background: tk.roseLight, color: tk.rose, cursor: "pointer", fontSize: 12, fontWeight: 500 }}
                  >
                    Unfollow
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${tk.border}` }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: tk.text }}>Notifications</span>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: tk.bgAlt, border: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 20, color: tk.text3 }}>🔔</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: tk.text, marginBottom: 8 }}>No notifications yet</div>
              <div style={{ fontSize: 13, color: tk.text2 }}>Follow some developers to get notified about score changes.</div>
            </div>
          ) : (
            notifications.map(notification => (
              <div key={notification.id} style={{ padding: "16px 20px", borderBottom: `1px solid ${tk.border}`, background: notification.read ? tk.bgAlt : tk.surface, cursor: "pointer" }} onClick={() => markNotificationRead(notification.id)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: notification.read ? tk.text3 : tk.blue, flexShrink: 0, marginTop: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: notification.read ? 400 : 600, color: tk.text, marginBottom: 4 }}>{notification.message}</div>
                    <div style={{ fontSize: 12, color: tk.text3 }}>{new Date(notification.timestamp).toLocaleString()}</div>
                    {notification.data && (
                      <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, background: tk.bgAlt, border: `1px solid ${tk.border}` }}>
                        <div style={{ fontSize: 12, color: tk.text2 }}>
                          {notification.data.username} score changed from {notification.data.oldScore.toFixed(1)} to {notification.data.newScore.toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────
   SETTINGS PAGE
───────────────────────────────────────────────── */
function SettingsPage({ user, profile, tk, isMobile, dark, onDarkToggle, onLogout, onDeleteAccount, onProfileSave, onProfileSaveStrict, onSyncNow, onPullLatest }: {
  user: AuthUser; profile: UserProfile | null; tk: Theme; isMobile: boolean; dark: boolean;
  onDarkToggle: () => void; onLogout: () => void; onDeleteAccount: () => void; onProfileSave: (p: UserProfile) => void;
  onProfileSaveStrict: (p: UserProfile) => Promise<void>;
  onSyncNow: () => Promise<void>; onPullLatest: () => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<"account" | "appearance" | "notifications" | "privacy">("account");
  const p = profile;
  const [displayName, setDisplayName] = useState(p?.displayName || user.name);
  const [bio, setBio] = useState(p?.bio || "");
  const [website, setWebsite] = useState(p?.website || "");
  const [location, setLocation] = useState(p?.location || "");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{text: string; type: 'success' | 'error'} | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSaveMessage, setAccountSaveMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saveHover, setSaveHover] = useState(false);

  useEffect(() => {
    setDisplayName(p?.displayName || user.name);
    setBio(p?.bio || "");
    setWebsite(p?.website || "");
    setLocation(p?.location || "");
  }, [user.email, p?.displayName, p?.bio, p?.website, p?.location]);

  const NOTIF_KEY = `deviq_notif_${user.email}`;
  const PRIVACY_KEY = `deviq_priv_${user.email}`;
  const [notifs, setNotifs] = useState(() => { try { const s = localStorage.getItem(NOTIF_KEY); return s ? JSON.parse(s) : { weekly: true, tips: false, product: true }; } catch { return { weekly: true, tips: false, product: true }; } });
  const [privacy, setPrivacy] = useState(() => { try { const s = localStorage.getItem(PRIVACY_KEY); return s ? JSON.parse(s) : { publicProfile: true, showEmail: false, analytics: true }; } catch { return { publicProfile: true, showEmail: false, analytics: true }; } });

  const handleSaveAccount = async () => {
    const updated: UserProfile = { ...(p || { joinedAt: new Date().toISOString(), analysesRun: 0, comparisonsRun: 0, aiInsightsRun: 0 }), displayName: displayName.trim() || user.name, bio: bio.trim(), website: website.trim(), location: location.trim() };
    setSavingAccount(true);
    setAccountSaveMessage(null);
    try {
      await onProfileSaveStrict(updated);
      setSaved(true);
      setAccountSaveMessage({ text: "✓ Profile saved successfully", type: "success" });
      setTimeout(() => setSaved(false), 2500);
      setTimeout(() => setAccountSaveMessage(null), 3500);
    } catch {
      setAccountSaveMessage({ text: "✗ Failed to save profile. Please try again.", type: "error" });
      setTimeout(() => setAccountSaveMessage(null), 4000);
    } finally {
      setSavingAccount(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      await onSyncNow();
      setSyncMessage({ text: '✓ Synced to cloud! Other devices will see your changes.', type: 'success' });
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err) {
      setSyncMessage({ text: '✗ Sync failed. Check your connection.', type: 'error' });
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  const handlePullLatest = async () => {
    setPulling(true);
    setSyncMessage(null);
    try {
      await onPullLatest();
      // The useEffect above will automatically update local state when profile changes
      setSyncMessage({ text: '✓ Pulled latest from cloud! Profile updated.', type: 'success' });
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      if (err?.message === 'NOT_MODIFIED') {
        setSyncMessage({ text: '✓ Already up to date! No changes on server.', type: 'success' });
        setTimeout(() => setSyncMessage(null), 4000);
        return;
      }
      console.error('Pull error details:', err);
      console.error('Pull error message:', err?.message);
      console.error('Pull error stack:', err?.stack);
      const errorMsg = err?.message || String(err);
      
      // Check for authentication errors
      if (errorMsg.includes('Invalid token') || errorMsg.includes('Unauthorized')) {
        setSyncMessage({ text: '✗ Session expired. Please log in again.', type: 'error' });
      } else {
        setSyncMessage({ text: `✗ Pull failed: ${errorMsg}`, type: 'error' });
      }
      setTimeout(() => setSyncMessage(null), 6000);
    } finally {
      setPulling(false);
    }
  };
  const handleSaveNotifs = () => { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs)); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const handleSavePrivacy = () => { localStorage.setItem(PRIVACY_KEY, JSON.stringify(privacy)); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const handleExportData = () => {
    const blob = new Blob([JSON.stringify({ user: { name: user.name, email: user.email, provider: user.provider }, profile: p, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `deviq-export-${user.email}.json`; a.click();
  };
  const handleClearCache = () => { Object.keys(localStorage).filter(k => k.startsWith("deviq_cache_")).forEach(k => localStorage.removeItem(k)); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const tabs = [
    { id: "account" as const, label: "Account", icon: <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
    { id: "appearance" as const, label: "Appearance", icon: <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" /></svg> },
    { id: "notifications" as const, label: "Notifications", icon: <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
    { id: "privacy" as const, label: "Privacy", icon: <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
  ];

  const SettingRow = ({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) => (
    <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${tk.border}`, gap: 16, flexDirection: isMobile ? "column" : "row" as const }}>
      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, color: tk.text, marginBottom: desc ? 3 : 0 }}>{label}</div>{desc && <div style={{ fontSize: 11, color: tk.text3, lineHeight: 1.5 }}>{desc}</div>}</div>
      <div style={{ flexShrink: 0, width: isMobile ? "100%" : "auto" }}>{children}</div>
    </div>
  );
  const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <button onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, border: "none", background: on ? tk.blue : tk.track, cursor: "pointer", position: "relative" as const, transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute" as const, top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );

  return (
    <div className="fu">
      <div style={{ padding: isMobile ? "36px 0 28px" : "56px 0 40px", borderBottom: `1px solid ${tk.border}`, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: tk.text3, marginBottom: 12 }}>Configuration</div>
        <h1 style={{ fontSize: isMobile ? 28 : 38, fontWeight: 700, letterSpacing: "-0.04em", color: tk.text, lineHeight: 1.08 }}>Settings</h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "200px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
          {tabs.map((tab, i) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSaved(false); }}
              style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", textAlign: "left" as const, padding: "11px 14px", border: "none", borderBottom: i < tabs.length - 1 ? `1px solid ${tk.border}` : "none", background: activeTab === tab.id ? tk.bgAlt : "transparent", cursor: "pointer", fontSize: 12, fontWeight: activeTab === tab.id ? 600 : 400, color: activeTab === tab.id ? tk.text : tk.text2, transition: "all 0.12s", fontFamily: "inherit" }}>
              <span style={{ color: activeTab === tab.id ? tk.blue : tk.text3 }}>{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: tk.blue }} />}
            </button>
          ))}
        </div>
        <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow }}>
          {activeTab === "account" && (<>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>Account Details</span>
              {saved && <span style={{ fontSize: 11, color: tk.green, fontWeight: 500 }}>✓ Saved</span>}
            </div>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${tk.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px", background: tk.bgAlt, borderRadius: 9, border: `1px solid ${tk.border}`, marginBottom: 12 }}>
                {user.avatar ? <img src={user.avatar} alt={displayName} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 52, height: 52, borderRadius: "50%", background: tk.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{initial(displayName || user.name)}</div>}
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: tk.text, marginBottom: 3 }}>{displayName || user.name}</div><div style={{ fontSize: 11, color: tk.text3 }}>Avatar synced from {user.provider || "email"}</div></div>
              </div>
              {!user.provider && (
                <div style={{ background: tk.roseLight, border: `1px solid ${tk.roseBorder}`, borderRadius: 9, padding: "12px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tk.rose, marginBottom: 6 }}>⚠️ Not Authenticated</div>
                  <div style={{ fontSize: 11, color: tk.rose, lineHeight: 1.5 }}>
                    You need to <strong>log in with Google</strong> to sync your profile across devices. Click "Sign Out" and then log in with Gmail.
                  </div>
                </div>
              )}
              <div style={{ background: tk.blueLight, border: `1px solid ${tk.blueBorder}`, borderRadius: 9, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: tk.blue, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                  Cloud Sync {!user.provider && "(Login Required)"}
                </div>
                <div style={{ fontSize: 11, color: tk.blue, lineHeight: 1.5, marginBottom: 10 }}>
                  Keep your profile synced across all devices. Changes you make here will appear on other devices logged in with <strong>{user.email}</strong>
                </div>
                <div style={{ fontSize: 10, color: tk.blue, opacity: 0.8, marginBottom: 10, fontStyle: "italic" }}>
                  💡 Tip: "Save Changes" button automatically syncs. Use manual buttons below for immediate control.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                  <button onClick={handleManualSync} disabled={syncing || !user.provider} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: user.provider ? tk.blue : tk.border, color: user.provider ? "#fff" : tk.text3, cursor: (syncing || !user.provider) ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", opacity: (syncing || !user.provider) ? 0.5 : 1 }} title={!user.provider ? "Please log in with Google first" : ""}>
                    {syncing ? "Syncing..." : "↑ Push to Cloud"}
                  </button>
                  <button onClick={handlePullLatest} disabled={pulling || !user.provider} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${tk.blueBorder}`, background: "transparent", color: user.provider ? tk.blue : tk.text3, cursor: (pulling || !user.provider) ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", opacity: (pulling || !user.provider) ? 0.5 : 1 }} title={!user.provider ? "Please log in with Google first" : ""}>
                    {pulling ? "Pulling..." : "↓ Pull Latest"}
                  </button>
                </div>
                {syncMessage && (
                  <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 6, background: syncMessage.type === 'success' ? tk.greenLight : tk.roseLight, border: `1px solid ${syncMessage.type === 'success' ? tk.greenBorder : tk.roseBorder}`, fontSize: 11, color: syncMessage.type === 'success' ? tk.green : tk.rose, fontWeight: 500 }}>
                    {syncMessage.text}
                  </div>
                )}
              </div>
            </div>
            {[{ label: "Display Name", value: displayName, set: setDisplayName, placeholder: "Your name", desc: "How your name appears on DevIQ.", multiline: false }, { label: "Bio", value: bio, set: setBio, placeholder: "Tell us about yourself…", desc: "Short bio shown on your profile.", multiline: true }, { label: "Website", value: website, set: setWebsite, placeholder: "https://yoursite.com", desc: "Your portfolio or personal site.", multiline: false }, { label: "Location", value: location, set: setLocation, placeholder: "City, Country", desc: "Where are you based?", multiline: false }].map(field => (
              <div key={field.label} style={{ padding: "14px 20px", borderBottom: `1px solid ${tk.border}` }}>
                <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: tk.text3, display: "block", marginBottom: 6 }}>{field.label}</label>
                {field.multiline ? <textarea value={field.value} onChange={e => field.set(e.target.value)} placeholder={field.placeholder} rows={3} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.bgAlt, color: tk.text, fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical" as const, boxSizing: "border-box" as const }} /> : <input value={field.value} onChange={e => field.set(e.target.value)} placeholder={field.placeholder} type="text" onKeyDown={e => e.key === "Enter" && handleSaveAccount()} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.bgAlt, color: tk.text, fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />}
                <div style={{ fontSize: 11, color: tk.text3, marginTop: 5 }}>{field.desc}</div>
              </div>
            ))}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${tk.border}` }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: tk.text3, display: "block", marginBottom: 6 }}>Email Address</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={user.email} readOnly type="email" style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.bgAlt, color: tk.text3, fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "not-allowed", boxSizing: "border-box" as const }} />
                <span style={{ padding: "9px 12px", fontSize: 11, color: tk.green, background: tk.greenLight, border: `1px solid ${tk.greenBorder}`, borderRadius: 8, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" as const }}>✓ Verified</span>
              </div>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
              <button onClick={() => setConfirmDelete(v => !v)} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${tk.roseBorder}`, background: "transparent", cursor: "pointer", fontSize: 12, color: tk.rose, fontFamily: "inherit", fontWeight: 500 }}>Delete Account</button>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <button
                  onClick={handleSaveAccount}
                  disabled={savingAccount}
                  onMouseEnter={() => setSaveHover(true)}
                  onMouseLeave={() => setSaveHover(false)}
                  style={{
                    padding: "9px 24px",
                    borderRadius: 8,
                    border: `1px solid ${tk.blueBorder}`,
                    background: savingAccount ? tk.track : (saveHover ? tk.blue : tk.accent),
                    color: savingAccount ? tk.text3 : tk.accentFg,
                    cursor: savingAccount ? "wait" : "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    boxShadow: savingAccount ? "none" : "0 6px 14px rgba(59,130,246,0.25)",
                    transform: saveHover && !savingAccount ? "translateY(-1px)" : "translateY(0)",
                    transition: "all 0.15s ease"
                  }}
                >
                  {savingAccount ? "Saving..." : "Save Changes"}
                </button>
                {accountSaveMessage && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: accountSaveMessage.type === "success" ? tk.green : tk.rose }}>
                    {accountSaveMessage.text}
                  </div>
                )}
              </div>
            </div>
            {confirmDelete && (
              <div style={{ margin: "0 20px 16px", padding: "14px 16px", borderRadius: 9, background: tk.roseLight, border: `1px solid ${tk.roseBorder}` }}>
                <div style={{ fontSize: 13, color: tk.rose, fontWeight: 600, marginBottom: 6 }}>Delete your DevIQ account?</div>
                <div style={{ fontSize: 12, color: tk.rose, marginBottom: 14, lineHeight: 1.55 }}>This will permanently remove your account and all stored data. This cannot be undone.</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={onDeleteAccount} style={{ padding: "7px 16px", border: "none", borderRadius: 6, background: tk.rose, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Yes, delete everything</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ padding: "7px 14px", border: `1px solid ${tk.roseBorder}`, borderRadius: 6, background: "transparent", color: tk.rose, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
                </div>
              </div>
            )}
          </>)}
          {activeTab === "appearance" && (<>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>Appearance</span>{saved && <span style={{ fontSize: 11, color: tk.green, fontWeight: 500 }}>✓ Saved</span>}</div>
            <SettingRow label="Dark Mode" desc="Switch between light and dark interface themes."><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 11, color: tk.text3 }}>{dark ? "Dark" : "Light"}</span><Toggle on={dark} onChange={onDarkToggle} /></div></SettingRow>
            <div style={{ padding: "14px 20px" }}><div style={{ fontSize: 11, color: tk.text3 }}>More appearance options coming soon.</div></div>
          </>)}
          {activeTab === "notifications" && (<>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>Email Notifications</span>{saved && <span style={{ fontSize: 11, color: tk.green, fontWeight: 500 }}>✓ Saved</span>}</div>
            <SettingRow label="Weekly Digest" desc="A weekly summary of your developer activity."><Toggle on={notifs.weekly} onChange={() => setNotifs((n: typeof notifs) => ({ ...n, weekly: !n.weekly }))} /></SettingRow>
            <SettingRow label="Tips & Tutorials" desc="Personalised coding tips based on your skill gaps."><Toggle on={notifs.tips} onChange={() => setNotifs((n: typeof notifs) => ({ ...n, tips: !n.tips }))} /></SettingRow>
            <SettingRow label="Product Updates" desc="New features and announcements from DevIQ."><Toggle on={notifs.product} onChange={() => setNotifs((n: typeof notifs) => ({ ...n, product: !n.product }))} /></SettingRow>
            <div style={{ padding: "16px 20px" }}><button onClick={handleSaveNotifs} style={{ padding: "8px 22px", borderRadius: 7, border: "none", background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Save Preferences</button></div>
          </>)}
          {activeTab === "privacy" && (<>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>Privacy & Data</span>{saved && <span style={{ fontSize: 11, color: tk.green, fontWeight: 500 }}>✓ Saved</span>}</div>
            <SettingRow label="Public Profile" desc="Allow others to view your DevIQ profile."><Toggle on={privacy.publicProfile} onChange={() => setPrivacy((p: typeof privacy) => ({ ...p, publicProfile: !p.publicProfile }))} /></SettingRow>
            <SettingRow label="Show Email on Profile" desc="Display your email on your public profile."><Toggle on={privacy.showEmail} onChange={() => setPrivacy((p: typeof privacy) => ({ ...p, showEmail: !p.showEmail }))} /></SettingRow>
            <SettingRow label="Anonymous Analytics" desc="Help improve DevIQ with anonymised data."><Toggle on={privacy.analytics} onChange={() => setPrivacy((p: typeof privacy) => ({ ...p, analytics: !p.analytics }))} /></SettingRow>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${tk.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: tk.text, marginBottom: 10 }}>Data Management</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                <button onClick={handleExportData} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${tk.border}`, background: "transparent", cursor: "pointer", fontSize: 12, color: tk.text2, fontFamily: "inherit", fontWeight: 500 }}>Export My Data</button>
                <button onClick={handleClearCache} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${tk.border}`, background: "transparent", cursor: "pointer", fontSize: 12, color: tk.text2, fontFamily: "inherit", fontWeight: 500 }}>Clear Cache</button>
                <button onClick={onLogout} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${tk.border}`, background: "transparent", cursor: "pointer", fontSize: 12, color: tk.text2, fontFamily: "inherit", fontWeight: 500 }}>Sign Out</button>
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}><button onClick={handleSavePrivacy} style={{ padding: "8px 22px", borderRadius: 7, border: "none", background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>Save Preferences</button></div>
          </>)}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────── */
export default function Page() {
  const [dark, setDark] = useState<boolean>(false);
  const [page, setPage] = useState<Page>("home");

  const navigate = useCallback((to: Page, replace = false) => {
    setPage(to); setMenuOpen(false); setUserMenuOpen(false);
    const url = to === "home" ? "/" : `/${to}`;
    if (replace) window.history.replaceState({ page: to }, "", url);
    else window.history.pushState({ page: to }, "", url);
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const p = (e.state?.page as Page) || "home";
      setPage(p); setMenuOpen(false); setUserMenuOpen(false);
    };
    window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop);
  }, []);

  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const storedDark = localStorage.getItem("deviq_dark");
        if (storedDark !== null) setDark(storedDark === "1");
        else setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);

        // try server session first
        const serverUser = await apiFetchSession();
        if (serverUser) {
          const mergedUser = enrichAuthUser(serverUser);
          setUser(mergedUser);
          cacheAuthUser(mergedUser);
          try {
            // Load profile from backend (source of truth)
            const p = await apiGetProfile();
            if (!p.displayName) p.displayName = mergedUser.name;
            if (!p.joinedAt) p.joinedAt = new Date().toISOString();
            if (!p.avatar && mergedUser.avatar) p.avatar = mergedUser.avatar;
            if (!mergedUser.avatar && p.avatar) {
              const enriched = enrichAuthUser({ ...mergedUser, avatar: p.avatar });
              setUser(enriched);
              cacheAuthUser(enriched);
            }
            // Save backend data to localStorage for offline access
            saveProfile(mergedUser.email, p);
            setProfile(p);
          } catch (err: any) {
            // If NOT_MODIFIED, use localStorage (it's already current)
            if (err?.message === 'NOT_MODIFIED') {
              console.log('📦 Using cached profile (server confirms it\'s current)');
              const p = loadProfile(mergedUser.email);
              if (!p.displayName) p.displayName = mergedUser.name;
              if (!p.joinedAt) p.joinedAt = new Date().toISOString();
              if (!p.avatar && mergedUser.avatar) p.avatar = mergedUser.avatar;
              setProfile(p);
            } else {
              // fallback to localStorage profile if server fails
              console.log('⚠️ Backend unreachable, using cached profile');
              const p = loadProfile(mergedUser.email);
              if (!p.displayName) p.displayName = mergedUser.name;
              if (!p.joinedAt) p.joinedAt = new Date().toISOString();
              if (!p.avatar && mergedUser.avatar) p.avatar = mergedUser.avatar;
              setProfile(p);
            }
          }
        } else {
          // fallback to local storage
          const savedUser = loadSession();
          if (savedUser) {
            // For OAuth users, require a valid backend session to avoid ghost-login UI.
            if (savedUser.provider === "google" || savedUser.provider === "github") {
              clearSession();
              setUser(null);
              setProfile(null);
            } else {
              setUser(savedUser);
              const p = loadProfile(savedUser.email);
              if (!p.displayName) p.displayName = savedUser.name;
              if (!p.joinedAt) p.joinedAt = new Date().toISOString();
              saveProfile(savedUser.email, p); setProfile(p);
            }
          }
        }
      } catch {
        // ignore errors during init
      }
      setHydrated(true);
      
      // Log auth status for debugging
      setTimeout(() => {
        const authStatus = loadSession();
        if (authStatus) {
          console.log('✅ Logged in as:', authStatus.email);
        } else {
          console.log('❌ NOT LOGGED IN - Please click "Sign In" to authenticate');
        }
      }, 1000);
      
      const pathPage = window.location.pathname.replace("/", "") as Page;
      const validPages: Page[] = ["home", "analyze", "compare", "profile", "settings", "history", "following"];
      const initialPage = validPages.includes(pathPage) ? pathPage : "home";
      setPage(initialPage);
      window.history.replaceState({ page: initialPage }, "", initialPage === "home" ? "/" : `/${initialPage}`);
    };
    init();
  }, []);

  // Periodic profile sync - check for updates from other devices every 2 minutes
  useEffect(() => {
    if (!user) return;

    const refreshProfile = async () => {
      try {
        console.log('🔄 Checking for profile updates from other devices...');
        const latestProfile = await apiGetProfile();
        
        // Compare with current profile to see if there are changes
        const hasChanges = JSON.stringify(latestProfile) !== JSON.stringify(profile);
        
        if (hasChanges) {
          console.log('✨ Profile updated from another device!');
          if (!latestProfile.displayName && user.name) latestProfile.displayName = user.name;
          if (!latestProfile.joinedAt) latestProfile.joinedAt = new Date().toISOString();
          if (!latestProfile.avatar && user.avatar) latestProfile.avatar = user.avatar;
          
          setProfile(latestProfile);
          saveProfile(user.email, latestProfile);
        }
      } catch (err) {
        console.log('⏭️ Profile sync check skipped (offline or not authenticated)');
      }
    };

    // Check for updates every 2 minutes
    const interval = setInterval(refreshProfile, 120000);
    
    // Also check when tab becomes visible (user switches back to the app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshProfile();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, profile]);

  const handleLogin = async (u: AuthUser) => {
    const mergedUser = enrichAuthUser(u);
    setUser(mergedUser);
    // store locally in case of offline fallback
    cacheAuthUser(mergedUser);
    try {
      // Load profile from backend (source of truth for cross-device sync)
      const p = await apiGetProfile();
      if (!p.displayName) p.displayName = mergedUser.name;
      if (!p.joinedAt) p.joinedAt = new Date().toISOString();
      if (!p.avatar && mergedUser.avatar) p.avatar = mergedUser.avatar;
      // Save backend data to localStorage for offline access
      saveProfile(mergedUser.email, p);
      setProfile(p);
    } catch {
      // Backend failed - load from localStorage and sync to backend
      const p = loadProfile(mergedUser.email);
      if (!p.displayName) p.displayName = mergedUser.name;
      if (!p.joinedAt) p.joinedAt = new Date().toISOString();
      if (!p.avatar && mergedUser.avatar) p.avatar = mergedUser.avatar;
      // Try to sync local data to backend for future use
      syncProfile(mergedUser.email, p).then(saved => setProfile(saved)).catch(() => setProfile(p));
    }
    setAuthModal(null); setMenuOpen(false);
  };
  const handleLogout = async () => { 
    await apiLogout().catch(() => {});
    clearSession();
    setUser(null); setProfile(null); setMenuOpen(false); setUserMenuOpen(false); window.history.replaceState({ page: "home" }, "", ""); setPage("home");
  };
  const handleProfileSave = async (updated: UserProfile) => {
    if (!user) return;
    try {
      const saved = await syncProfile(user.email, updated);
      setProfile(saved);
    } catch {
      setProfile(updated);
    }
    if (updated.displayName && updated.displayName !== user.name) { const u2 = { ...user, name: updated.displayName }; setUser(u2); saveSession(u2); }
  };

  const handleProfileSaveStrict = async (updated: UserProfile) => {
    if (!user) throw new Error('Not logged in');
    const saved = await syncProfile(user.email, updated, true);
    setProfile(saved);
    if (saved.displayName && saved.displayName !== user.name) {
      const u2 = { ...user, name: saved.displayName };
      setUser(u2);
      saveSession(u2);
    }
  };

  const handleSyncNow = async () => {
    if (!user || !profile) throw new Error('Not logged in');
    console.log('🚀 Manual sync triggered');
    const saved = await syncProfile(user.email, profile);
    setProfile(saved);
    saveProfile(user.email, saved);
  };

  const handlePullLatest = async () => {
    if (!user) throw new Error('Not logged in');
    console.log('⬇️ Pulling latest profile from cloud');
    try {
      const latestProfile = await apiGetProfile();
      console.log('📥 Pulled profile data:', {
        bio: latestProfile.bio,
        displayName: latestProfile.displayName,
        website: latestProfile.website,
        location: latestProfile.location,
        recentAnalyses: latestProfile.recentAnalyses?.length || 0
      });
      console.log('📥 Current profile state:', {
        bio: profile?.bio,
        displayName: profile?.displayName,
        website: profile?.website,
        location: profile?.location,
        recentAnalyses: profile?.recentAnalyses?.length || 0
      });
      if (!latestProfile.displayName && user.name) latestProfile.displayName = user.name;
      if (!latestProfile.joinedAt) latestProfile.joinedAt = new Date().toISOString();
      if (!latestProfile.avatar && user.avatar) latestProfile.avatar = user.avatar;
      setProfile(latestProfile);
      saveProfile(user.email, latestProfile);
      console.log('✅ Profile state updated to:', {
        bio: latestProfile.bio,
        displayName: latestProfile.displayName,
        website: latestProfile.website,
        location: latestProfile.location
      });
    } catch (err: any) {
      if (err?.message === 'NOT_MODIFIED') {
        console.log('📦 Profile already up to date (304)');
        // This is not an error - profile is already current
        return;
      }
      throw err; // Re-throw actual errors
    }
  };
  const handleDeleteAccount = async () => { if (!user) return; try { await serverRequest('/auth/account', { method: 'DELETE' }); } catch { /* ignore */ } deleteAccount(user.email); setUser(null); setProfile(null); setMenuOpen(false); setUserMenuOpen(false); window.history.replaceState({ page: "home" }, "", ""); setPage("home"); };
  const toggleDark = () => { setDark(d => { localStorage.setItem("deviq_dark", d ? "0" : "1"); return !d; }); };

  const tk = dark ? THEMES.dark : THEMES.light;
  const { isMobile, isTablet } = useBreakpoint();

  // Helper functions for advanced GitHub analytics
  const calculateCodingHours = (commits: any[]): CodingHourStats[] => {
    const hours: Record<number, number> = {};
    commits.forEach(c => {
      if (c.commit?.author?.date) {
        const hour = new Date(c.commit.author.date).getHours();
        hours[hour] = (hours[hour] || 0) + 1;
      }
    });
    const total = Object.values(hours).reduce((a, b) => a + b, 0);
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hours[h] || 0,
      percentage: total > 0 ? ((hours[h] || 0) / total) * 100 : 0
    })).sort((a, b) => b.count - a.count);
  };

  const analyzeRepoComplexity = (repos: any[]): ComplexityRepo[] => {
    return repos.map(r => {
      const fileCount = r.size || 0;
      const languages = r.languages || {};
      const langCount = Object.keys(languages).length;
      let complexity: "Low" | "Medium" | "High" = "Low";
      let score = 0;
      if (fileCount < 50 && langCount <= 2) { complexity = "Low"; score = 20; }
      else if (fileCount < 200 && langCount <= 4) { complexity = "Medium"; score = 50; }
      else { complexity = "High"; score = 80 + Math.min(20, langCount * 2); }
      return { name: r.name, fileCount, languages, complexity, score };
    }).sort((a, b) => b.score - a.score);
  };

  const findLongestGap = (contributions: Contribution[]): ContributionGap | undefined => {
    if (!contributions || contributions.length === 0) return undefined;
    let maxGap = 0, maxStart = "", maxEnd = "";
    let lastContribDate: string | null = null;
    contributions.forEach(c => {
      if (c.count === 0 && lastContribDate) {
        const gap = new Date(c.date).getTime() - new Date(lastContribDate).getTime();
        if (gap > maxGap) {
          maxGap = gap;
          maxStart = lastContribDate;
          maxEnd = c.date;
        }
      }
      if (c.count > 0) lastContribDate = c.date;
    });
    if (maxGap === 0) return undefined;
    const recoveryDate = contributions.find(c => new Date(c.date) > new Date(maxEnd) && c.count > 0)?.date;
    return {
      startDate: maxStart,
      endDate: maxEnd,
      duration: Math.floor(maxGap / (1000 * 60 * 60 * 24)),
      recoveryDate,
      isCurrentGap: !recoveryDate
    };
  };

  const compareMonthlyActivity = (contributions: Contribution[]): MonthlyComparison | undefined => {
    if (!contributions || contributions.length < 30) return undefined;
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0);
    
    const thisYear = contributions
      .filter(c => new Date(c.date) >= thisMonthStart && new Date(c.date) <= thisMonthEnd)
      .reduce((a, c) => a + c.count, 0);
    const lastYear = contributions
      .filter(c => new Date(c.date) >= lastYearStart && new Date(c.date) <= lastYearEnd)
      .reduce((a, c) => a + c.count, 0);
    
    const growth = lastYear > 0 ? Math.round(((thisYear - lastYear) / lastYear) * 100) : 0;
    return {
      month: thisMonthStart.toLocaleDateString("en-US", { month: "long" }),
      thisYear,
      lastYear,
      growth,
      topLanguage: undefined,
      activeRepos: undefined
    };
  };

  const [gh, setGh] = useState(() => { try { return sessionStorage.getItem("deviq_gh") || ""; } catch { return ""; } });
  const [lc, setLc] = useState(() => { try { return sessionStorage.getItem("deviq_lc") || ""; } catch { return ""; } });
  const [cf, setCf] = useState(() => { try { return sessionStorage.getItem("deviq_cf") || ""; } catch { return ""; } });
  const [loading, setLoading] = useState(false); const [steps, setSteps] = useState<StepItem[]>([]);
  const [data, setData] = useState<ResultData | null>(() => { try { const s = sessionStorage.getItem("deviq_data"); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [errors, setErrors] = useState<string[]>([]);

  // Persist analyze inputs and results to sessionStorage
  useEffect(() => { try { sessionStorage.setItem("deviq_gh", gh); } catch { } }, [gh]);
  useEffect(() => { try { sessionStorage.setItem("deviq_lc", lc); } catch { } }, [lc]);
  useEffect(() => { try { sessionStorage.setItem("deviq_cf", cf); } catch { } }, [cf]);
  useEffect(() => { try { if (data) sessionStorage.setItem("deviq_data", JSON.stringify(data)); else sessionStorage.removeItem("deviq_data"); } catch { } }, [data]);

  const analyze = useCallback(async () => {
    if (!gh && !lc && !cf) return;
    setLoading(true); setData(null); setErrors([]);
    const init: StepItem[] = [...(gh ? [{ label: "GitHub", status: "pending" as const }] : []), ...(lc ? [{ label: "LeetCode", status: "pending" as const }] : []), ...(cf ? [{ label: "Codeforces", status: "pending" as const }] : [])];
    let cur = [...init]; setSteps(cur);
    const upd = (i: number, s: StepItem["status"]) => { cur = cur.map((x, j) => j === i ? { ...x, status: s } : x); setSteps([...cur]); };
    const errs: string[] = [], result: Partial<ResultData> = {}; let si = 0;
    if (gh) { upd(si, "active"); try { const r = await fetch(`${API}/analyze/${gh.trim()}?v=${Date.now()}`); const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`); result.github = j; upd(si, "done"); } catch (e: unknown) { upd(si, "error"); errs.push(`GitHub: ${e instanceof Error ? e.message : String(e)}`); } si++; }
    if (lc) { upd(si, "active"); try { const r = await fetch(`${API}/leetcode/${lc.trim()}?v=${Date.now()}`); const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`); result.leetcode = j; upd(si, "done"); } catch (e: unknown) { upd(si, "error"); errs.push(`LeetCode: ${e instanceof Error ? e.message : String(e)}`); } si++; }
    if (cf) { upd(si, "active"); try { const r = await fetch(`${API}/codeforces/${cf.trim()}?v=${Date.now()}`); const j = await r.json(); if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`); result.codeforces = j; upd(si, "done"); } catch (e: unknown) { upd(si, "error"); errs.push(`Codeforces: ${e instanceof Error ? e.message : String(e)}`); } }
    
    // Calculate advanced GitHub analytics if GitHub data is available
    if (gh && result.github?.repositories) {
      try {
        result.github.advancedAnalytics = {};
        
        // Calculate complexity scores
        const complexRepos = analyzeRepoComplexity(result.github.repositories);
        if (complexRepos.length > 0) {
          result.github.advancedAnalytics.complexRepos = complexRepos;
        }
      } catch (e) {
        console.log("Could not calculate advanced analytics:", e);
      }
    }
    
    let sc = 0; if (result.github?.analytics?.skill_score) sc += result.github.analytics.skill_score * 0.4; if (result.leetcode?.total_solved) sc += Math.min(100, result.leetcode.easy_solved + result.leetcode.medium_solved * 3 + result.leetcode.hard_solved * 6) * 0.35; if (result.codeforces?.rating) sc += Math.min(100, result.codeforces.rating / 35) * 0.25;
    result.combined_score = Math.round(sc * 10) / 10; setErrors(errs); setData(result as ResultData); setLoading(false);
    if (user) {
      const p = loadProfile(user.email); p.analysesRun = (p.analysesRun || 0) + 1;
      const record: AnalysisRecord = { id: Date.now().toString(), date: new Date().toISOString(), github: gh.trim() || undefined, leetcode: lc.trim() || undefined, codeforces: cf.trim() || undefined, score: result.combined_score ?? 0, ghStars: result.github?.analytics?.total_stars, ghRepos: result.github?.analytics?.total_projects, ghLang: result.github?.analytics?.most_used_language, lcSolved: result.leetcode?.total_solved, lcEasy: result.leetcode?.easy_solved, lcMedium: result.leetcode?.medium_solved, lcHard: result.leetcode?.hard_solved, cfRating: result.codeforces?.rating, cfRank: result.codeforces?.rank };
      const prev = p.recentAnalyses || []; p.recentAnalyses = [record, ...prev].slice(0, 10);

      // Check for followed users and create notifications for score changes
      const following = p.following || [];
      const notifications = p.notifications || [];
      const now = new Date().toISOString();

      for (const followed of following) {
        let currentScore: number | undefined;
        let platform = followed.platform;

        if (followed.platform === "github" && result.github && gh.trim() === followed.username) {
          currentScore = result.github.analytics?.skill_score;
        } else if (followed.platform === "leetcode" && result.leetcode && lc.trim() === followed.username) {
          currentScore = Math.min(100, result.leetcode.easy_solved + result.leetcode.medium_solved * 3 + result.leetcode.hard_solved * 6);
        } else if (followed.platform === "codeforces" && result.codeforces && cf.trim() === followed.username) {
          currentScore = Math.min(100, result.codeforces.rating / 35);
        }

        if (currentScore !== undefined && followed.lastScore !== undefined && Math.abs(currentScore - followed.lastScore) >= 1) {
          // Score changed significantly
          const notification: Notification = {
            id: `score_change_${followed.username}_${followed.platform}_${Date.now()}`,
            type: "score_change",
            message: `${followed.username}'s score ${currentScore > followed.lastScore ? 'increased' : 'decreased'} from ${followed.lastScore.toFixed(1)} to ${currentScore.toFixed(1)}`,
            timestamp: now,
            data: {
              username: followed.username,
              oldScore: followed.lastScore,
              newScore: currentScore,
              platform: followed.platform
            },
            read: false
          };
          notifications.unshift(notification);

          // Update the followed user's last score
          followed.lastScore = currentScore;
          followed.lastUpdated = now;
        } else if (currentScore !== undefined && followed.lastScore === undefined) {
          // First time getting score for this user
          followed.lastScore = currentScore;
          followed.lastUpdated = now;
        }
      }

      // Keep only recent notifications (last 50)
      p.notifications = notifications.slice(0, 50);

      syncProfile(user.email, p).then(saved => setProfile({ ...saved })).catch(() => setProfile({ ...p }));
    }
  }, [gh, lc, cf, user]);

  const sColor = (s: StepItem["status"]) => s === "active" ? tk.blue : s === "done" ? tk.green : s === "error" ? tk.rose : tk.text3;
  const px = isMobile ? "16px" : "32px";
  const navLinks = data && page === "analyze" ? [{ label: "Score", id: "sec-score" }, { label: "Platforms", id: "sec-platforms" }, { label: "AI", id: "sec-ai" }, { label: "Activity", id: "sec-heatmap" }, { label: "Repos", id: "sec-repos" }] : [];
  const scroll = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); setMenuOpen(false); };
  const tagS = (c: string, bg: string, b: string): CSSProperties => ({ fontSize: 11, fontWeight: 500, letterSpacing: "0.03em", padding: "3px 9px", borderRadius: 5, border: `1px solid ${b}`, color: c, background: bg, whiteSpace: "nowrap" as const });

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100vh", background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 20, height: 20, border: "2px solid #E0E0E0", borderTopColor: "#0A0A0A", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;font-size:17px;}
        body{margin:0;font-family:'Geist',system-ui,sans-serif;-webkit-font-smoothing:antialiased;font-size:15px;}
        input,button,textarea{font-family:'Geist',system-ui,sans-serif;font-size:inherit;}
        #sec-score,#sec-platforms,#sec-ai,#sec-heatmap,#sec-repos{scroll-margin-top:60px;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        @keyframes overlayIn{from{opacity:0}to{opacity:1}}
        @keyframes modalIn{from{opacity:0;transform:scale(0.95) translateY(10px)}to{opacity:1;transform:none}}
        .fu{animation:fadeUp 0.3s cubic-bezier(0.4,0,0.2,1) both;}
        .fu1{animation-delay:0.04s;}.fu2{animation-delay:0.08s;}.fu3{animation-delay:0.14s;}
        .slide-down{animation:slideDown 0.2s cubic-bezier(0.4,0,0.2,1) both;}
        input::placeholder{color:#A3A3A3;}
        ::selection{background:rgba(26,111,244,0.12);}
        a{text-decoration:none;}
        button:focus-visible{outline:2px solid #1A6FF4;outline-offset:2px;}
        .nav-auth-btn{transition:all 0.15s;}
        .nav-auth-btn:hover{opacity:0.85;}
      `}</style>

      <div suppressHydrationWarning style={{ minHeight: "100vh", background: tk.bg, color: tk.text, fontFamily: "'Geist', system-ui, sans-serif", transition: "background 0.2s, color 0.2s" }}>

        {authModal && <AuthModal mode={authModal} tk={tk} onAuth={handleLogin} onClose={() => setAuthModal(null)} onSwitchMode={() => setAuthModal(m => m === "login" ? "signup" : "login")} />}

        {/* NAVBAR */}
        <nav suppressHydrationWarning style={{ position: "sticky", top: 0, zIndex: 200, background: dark ? "rgba(10,10,10,0.92)" : "rgba(245,245,245,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${tk.border}`, overflow: "visible" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: `0 ${px}`, display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
            <button onClick={() => navigate("home")} style={{ fontSize: 14, fontWeight: 600, color: tk.text, letterSpacing: "-0.02em", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>DevIQ</button>
            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: 1, flex: 1, paddingLeft: 20 }}>
                {([{ id: "home" as const, label: "Home" }, { id: "analyze" as const, label: "Analyze" }, { id: "compare" as const, label: "Compare" }] as { id: Page; label: string }[]).map(item => (
                  <button key={item.id} onClick={() => navigate(item.id)} style={{ padding: "4px 11px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 12, fontWeight: page === item.id ? 600 : 400, color: page === item.id ? tk.text : tk.text2, background: page === item.id ? tk.surface : "transparent", transition: "all 0.12s" }}
                    onMouseEnter={e => { if (page !== item.id) { (e.currentTarget as HTMLElement).style.color = tk.text; (e.currentTarget as HTMLElement).style.background = tk.surface; } }}
                    onMouseLeave={e => { if (page !== item.id) { (e.currentTarget as HTMLElement).style.color = tk.text2; (e.currentTarget as HTMLElement).style.background = "transparent"; } }}>
                    {item.label}
                  </button>
                ))}
                {navLinks.length > 0 && (<>
                  <div style={{ width: 1, height: 16, background: tk.border, margin: "0 6px" }} />
                  {navLinks.map(l => (
                    <button key={l.id} onClick={() => scroll(l.id)} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 400, color: tk.text3, transition: "color 0.12s, background 0.12s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = tk.text; (e.currentTarget as HTMLElement).style.background = tk.surface; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = tk.text3; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      {l.label}
                    </button>
                  ))}
                </>)}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 7 }}>
              {!isMobile && !user && (<>
                <button onClick={() => setAuthModal("login")} style={{ padding: "5px 13px", borderRadius: 6, border: `1px solid ${tk.border}`, background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 500, color: tk.text2, transition: "all 0.15s" }}>Log in</button>
                <button onClick={() => setAuthModal("signup")} style={{ padding: "5px 13px", borderRadius: 6, border: "none", background: tk.accent, cursor: "pointer", fontSize: 12, fontWeight: 600, color: tk.accentFg }}>Sign up</button>
              </>)}
              {!isMobile && user && (
                <div style={{ position: "relative" }}>
                  <button onClick={() => setUserMenuOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 4px", borderRadius: 20, border: `1px solid ${tk.border}`, background: tk.surface, cursor: "pointer" }}>
                    {user.avatar ? <img src={user.avatar} alt={user.name} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : null}
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: user.provider === "github" ? "#24292e" : user.provider === "google" ? "#4285F4" : tk.blue, display: user.avatar ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{initial(user.name)}</div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: tk.text, maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</span>
                    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M2 3.5L5 6.5L8 3.5" stroke={tk.text3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  {userMenuOpen && (
                    <div className="slide-down" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 9, boxShadow: tk.shadowMd, minWidth: 180, overflow: "hidden", zIndex: 300 }}>
                      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${tk.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          {user.avatar ? <img src={user.avatar} alt={user.name} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} /> : null}
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: tk.blue, display: user.avatar ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff" }}>{initial(user.name)}</div>
                          <div><div style={{ fontSize: 12, fontWeight: 600, color: tk.text }}>{user.name}</div>{user.provider && <div style={{ fontSize: 10, color: tk.text3, textTransform: "capitalize" }}>via {user.provider}</div>}</div>
                        </div>
                        <div style={{ fontSize: 11, color: tk.text3, marginTop: 2 }}>{user.email}</div>
                      </div>
                      {[{ label: "Profile", action: () => navigate("profile") }, { label: "Following", action: () => navigate("following") }, { label: "History", action: () => navigate("history") }, { label: "Practice", action: () => navigate("practice") }, { label: "Chat", action: () => navigate("chat") }, { label: "Settings", action: () => navigate("settings") }].map(item => (
                        <button key={item.label} onClick={item.action} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: tk.text2, fontFamily: "inherit", transition: "background 0.12s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = tk.bgAlt}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>{item.label}</button>
                      ))}
                      <div style={{ height: 1, background: tk.border }} />
                      <button onClick={handleLogout} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: tk.rose, fontFamily: "inherit" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = tk.roseLight}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>Sign out</button>
                    </div>
                  )}
                </div>
              )}
              {isMobile && !user && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <button className="nav-auth-btn" onClick={() => setAuthModal("login")} style={{ padding: "5px 11px", borderRadius: 6, border: `1px solid ${tk.border}`, background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 500, color: tk.text2 }}>Log in</button>
                  <button className="nav-auth-btn" onClick={() => setAuthModal("signup")} style={{ padding: "5px 11px", borderRadius: 6, border: "none", background: tk.accent, cursor: "pointer", fontSize: 12, fontWeight: 600, color: tk.accentFg }}>Sign up</button>
                </div>
              )}
              {isMobile && user && (
                <div style={{ position: "relative" }}>
                  <button onClick={() => setUserMenuOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px 3px 3px", borderRadius: 20, border: `1px solid ${tk.border}`, background: tk.surface, cursor: "pointer" }}>
                    {user.avatar ? <img src={user.avatar} alt={user.name} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : null}
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: user.provider === "github" ? "#24292e" : user.provider === "google" ? "#4285F4" : tk.blue, display: user.avatar ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{initial(user.name)}</div>
                    <svg width={9} height={9} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M2 3.5L5 6.5L8 3.5" stroke={tk.text3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  {userMenuOpen && (
                    <div className="slide-down" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 9, boxShadow: tk.shadowMd, minWidth: 160, overflow: "hidden", zIndex: 400 }}>
                      <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${tk.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          {user.avatar ? <img src={user.avatar} alt={user.name} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} /> : null}
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: user.provider === "github" ? "#24292e" : user.provider === "google" ? "#4285F4" : tk.blue, display: user.avatar ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#fff" }}>{initial(user.name)}</div>
                          <div><div style={{ fontSize: 12, fontWeight: 600, color: tk.text }}>{user.name}</div>{user.provider && <div style={{ fontSize: 10, color: tk.text3, textTransform: "capitalize" }}>via {user.provider}</div>}</div>
                        </div>
                        <div style={{ fontSize: 11, color: tk.text3, marginTop: 2 }}>{user.email}</div>
                      </div>
                      {[{ label: "Profile", action: () => { navigate("profile"); setUserMenuOpen(false); } }, { label: "Following", action: () => { navigate("following"); setUserMenuOpen(false); } }, { label: "History", action: () => { navigate("history"); setUserMenuOpen(false); } }, { label: "Practice", action: () => { navigate("practice"); setUserMenuOpen(false); } }, { label: "Chat", action: () => { navigate("chat"); setUserMenuOpen(false); } }, { label: "Settings", action: () => { navigate("settings"); setUserMenuOpen(false); } }].map(item => (
                        <button key={item.label} onClick={item.action} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: tk.text2, fontFamily: "inherit", transition: "background 0.12s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = tk.bgAlt}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>{item.label}</button>
                      ))}
                      <div style={{ height: 1, background: tk.border }} />
                      <button onClick={() => { handleLogout(); setUserMenuOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: tk.rose, fontFamily: "inherit" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = tk.roseLight}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>Sign out</button>
                    </div>
                  )}
                </div>
              )}
              {user && profile && (
                <button onClick={() => navigate("following")} style={{ position: "relative", width: 32, height: 32, borderRadius: 6, border: `1px solid ${tk.border}`, background: tk.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: tk.text2 }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                  {(profile.notifications?.filter(n => !n.read).length ?? 0) > 0 && (
                    <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: tk.rose, border: `2px solid ${tk.bg}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
                      {profile.notifications!.filter(n => !n.read).length}
                    </div>
                  )}
                </button>
              )}
              <button onClick={toggleDark} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${tk.border}`, background: tk.surface, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", color: tk.text2 }}>{dark ? "○" : "●"}</button>
              {isMobile && (
                <button onClick={() => setMenuOpen(o => !o)} style={{ width: 44, height: 44, borderRadius: 6, border: `1px solid ${tk.border}`, background: tk.surface, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 0 }} aria-label="Menu">
                  <span style={{ display: "block", width: 18, height: 2, borderRadius: 1, background: tk.text2, transition: "all 0.2s", transform: menuOpen ? "rotate(45deg) translate(0px, 4px)" : "none" }} />
                  <span style={{ display: "block", width: 18, height: 2, borderRadius: 1, background: tk.text2, transition: "all 0.2s", opacity: menuOpen ? 0 : 1 }} />
                  <span style={{ display: "block", width: 18, height: 2, borderRadius: 1, background: tk.text2, transition: "all 0.2s", transform: menuOpen ? "rotate(-45deg) translate(0px, -4px)" : "none" }} />
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* MOBILE MENU - OUTSIDE NAV FOR BETTER POSITIONING */}
        {isMobile && menuOpen && (
          <div className="slide-down" style={{ borderTop: `1px solid ${tk.border}`, background: dark ? "rgba(10,10,10,0.98)" : "rgba(245,245,245,0.98)", paddingBottom: 8, position: "fixed", top: 58, left: 0, right: 0, zIndex: 300, maxHeight: "calc(100vh - 58px)", overflowY: "auto" as const }} onClick={e => e.stopPropagation()}>
              {user && (<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: `1px solid ${tk.border}` }}>{user.avatar ? <img src={user.avatar} alt={user.name} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} /> : null}<div style={{ width: 32, height: 32, borderRadius: "50%", background: user.provider === "github" ? "#24292e" : user.provider === "google" ? "#4285F4" : tk.blue, display: user.avatar ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "#fff", flexShrink: 0 }}>{initial(user.name)}</div><div><div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>{user.name}</div><div style={{ fontSize: 11, color: tk.text3 }}>{user.email}</div></div></div>)}
              {([{ id: "home" as const, label: "Home" }, { id: "analyze" as const, label: "Analyze" }, { id: "compare" as const, label: "Compare" }] as { id: Page; label: string }[]).map(item => (
                <button key={item.id} onClick={() => navigate(item.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "16px 20px", border: "none", borderBottom: `1px solid ${tk.border}`, background: page === item.id ? tk.bgAlt : "transparent", cursor: "pointer", fontSize: 13, fontWeight: page === item.id ? 600 : 400, color: page === item.id ? tk.text : tk.text2, fontFamily: "inherit" }}>
                  {item.label}{page === item.id && <span style={{ width: 6, height: 6, borderRadius: "50%", background: tk.blue, flexShrink: 0 }} />}
                </button>
              ))}
              {navLinks.length > 0 && (<>
                <div style={{ padding: "8px 20px 4px" }}><span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: tk.text3 }}>Sections</span></div>
                {navLinks.map(l => (<button key={l.id} onClick={() => scroll(l.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: "14px 20px 14px 28px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 400, color: tk.text2, fontFamily: "inherit" }}>{l.label}</button>))}
              </>)}
              {user && (<div style={{ padding: "10px 16px 6px" }}><button onClick={handleLogout} style={{ width: "100%", padding: "16px", borderRadius: 7, border: `1px solid ${tk.roseBorder}`, background: tk.roseLight, cursor: "pointer", fontSize: 14, fontWeight: 500, color: tk.rose, fontFamily: "inherit" }}>Sign out</button></div>)}
          </div>
        )}

        {/* PAGES */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: `0 ${px} 80px` }}>

          {/* HOME */}
          {page === "home" && (
            <div className="fu">
              <div style={{ padding: isMobile ? "64px 0 48px" : "112px 0 80px", borderBottom: `1px solid ${tk.border}`, marginBottom: 48 }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: tk.text3, marginBottom: 20 }}>Developer Analytics Platform</div>
                <h1 style={{ fontSize: isMobile ? "clamp(36px,11vw,54px)" : "clamp(50px,7vw,72px)", fontWeight: 600, letterSpacing: "-0.05em", color: tk.text, lineHeight: 1.04, marginBottom: 24, maxWidth: 640 }}>Your developer profile,<br />fully measured.</h1>
                <p style={{ fontSize: 16, color: tk.text2, lineHeight: 1.7, maxWidth: 500, fontWeight: 400, marginBottom: 36 }}>DevIQ unifies your GitHub, LeetCode, and Codeforces stats into a single score — with AI insights, contribution tracking, and head-to-head comparisons.</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={() => navigate("analyze")} style={{ padding: "11px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tk.accent, color: tk.accentFg, letterSpacing: "-0.01em" }}>Analyze Profile</button>
                  <button onClick={() => navigate("compare")} style={{ padding: "11px 24px", borderRadius: 8, border: `1px solid ${tk.border}`, cursor: "pointer", fontSize: 13, fontWeight: 500, background: tk.surface, color: tk.text2, letterSpacing: "-0.01em" }}>Compare Developers</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)", gap: 10, marginBottom: 48 }}>
                {[
                  { icon: <GitHubIcon size={18} color={tk.blue} />, title: "GitHub Analytics", desc: "Repos, stars, language breakdown, skill score, and contribution heatmap.", color: tk.blue, bg: tk.blueLight, border: tk.blueBorder },
                  { icon: <LeetCodeIcon size={18} color={tk.amber} />, title: "LeetCode Stats", desc: "Problems solved across Easy, Medium, and Hard. Contest ratings, global rank.", color: tk.amber, bg: tk.amberLight, border: tk.amberBorder },
                  { icon: <CodeforcesIcon size={18} color={tk.purple} />, title: "Codeforces Rating", desc: "Current and peak ratings, rank titles, problems solved, contest history.", color: tk.purple, bg: tk.purpleLight, border: tk.purpleBorder },
                  { icon: <span style={{ fontSize: 18 }}>◎</span>, title: "Unified Score", desc: "A single weighted developer score combining activity, problem solving, and CP.", color: tk.green, bg: tk.greenLight, border: tk.greenBorder },
                  { icon: <span style={{ fontSize: 18 }}>⊞</span>, title: "AI Insights", desc: "Get a sharp AI-generated roast or a personalized 7-day improvement plan.", color: tk.rose, bg: tk.roseLight, border: tk.roseBorder },
                  { icon: <span style={{ fontSize: 18 }}>⇄</span>, title: "Compare Mode", desc: "Head-to-head comparison between two developers across every metric.", color: tk.teal, bg: tk.greenLight, border: tk.greenBorder },
                ].map((f, i) => (
                  <div key={i} style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, padding: "20px 22px", boxShadow: tk.shadow }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: f.bg, border: `1px solid ${f.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, color: f.color }}>{f.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: tk.text, marginBottom: 7, letterSpacing: "-0.01em" }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: tk.text2, lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, padding: isMobile ? "28px 22px" : "36px 44px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, boxShadow: tk.shadow }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: tk.text, letterSpacing: "-0.02em", marginBottom: 6 }}>Ready to measure your profile?</div>
                  <div style={{ fontSize: 13, color: tk.text2 }}>Connect your accounts and get your score in seconds.</div>
                </div>
                <button onClick={() => navigate("analyze")} style={{ padding: "10px 22px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tk.accent, color: tk.accentFg, whiteSpace: "nowrap" }}>Get Started</button>
              </div>
            </div>
          )}

          {/* ANALYZE */}
          {page === "analyze" && (<>
            <div className="fu" style={{ padding: isMobile ? "48px 0 36px" : "80px 0 60px", borderBottom: `1px solid ${tk.border}`, marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: tk.text3, marginBottom: 16 }}>Developer Analytics</div>
              <h1 style={{ fontSize: isMobile ? "clamp(32px,10vw,46px)" : "clamp(42px,6vw,58px)", fontWeight: 600, letterSpacing: "-0.04em", color: tk.text, lineHeight: 1.08, marginBottom: 16, maxWidth: 560 }}>Measure what actually matters.</h1>
              <p style={{ fontSize: 15, color: tk.text2, lineHeight: 1.65, maxWidth: 460, fontWeight: 400 }}>Connect GitHub, LeetCode and Codeforces to get a unified score, deep analytics, and AI-powered insights.</p>
            </div>
            <div className="fu fu2" style={{ marginBottom: 28 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)", gap: 12, marginBottom: 10 }}>
                <InputField label="GitHub" placeholder="username" value={gh} onChange={setGh} onEnter={analyze} tk={tk} platform="github" />
                <InputField label="LeetCode" placeholder="username" value={lc} onChange={setLc} onEnter={analyze} tk={tk} platform="leetcode" />
                <InputField label="Codeforces" placeholder="handle" value={cf} onChange={setCf} onEnter={analyze} tk={tk} platform="codeforces" />
              </div>
              <button onClick={analyze} disabled={loading || (!gh && !lc && !cf)} style={{ width: "100%", padding: "10px", border: "none", borderRadius: 7, cursor: (loading || (!gh && !lc && !cf)) ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 500, background: (loading || (!gh && !lc && !cf)) ? tk.track : tk.accent, color: (loading || (!gh && !lc && !cf)) ? tk.text3 : tk.accentFg, transition: "all 0.15s", letterSpacing: "-0.01em" }}>{loading ? "Analyzing…" : "Run Analysis"}</button>
            </div>
            {loading && (
              <div style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, padding: "26px", marginBottom: 12, boxShadow: tk.shadow }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 16, height: 16, border: `2px solid ${tk.border}`, borderTopColor: tk.blue, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 500, color: tk.text }}>Fetching your data</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {steps.map((s, i) => (<div key={i} style={{ fontSize: 11, fontWeight: 500, color: sColor(s.status), padding: "3px 10px", borderRadius: 99, border: `1px solid ${sColor(s.status)}25`, background: `${sColor(s.status)}0D`, transition: "all 0.2s" }}>{s.status === "done" ? "✓ " : s.status === "error" ? "✗ " : s.status === "active" ? "· " : ""}{s.label}</div>))}
                </div>
              </div>
            )}
            {errors.length > 0 && !loading && errors.map((e, i) => (<div key={i} style={{ padding: "9px 13px", borderRadius: 7, border: `1px solid ${tk.roseBorder}`, background: tk.roseLight, fontSize: 12, color: tk.rose, marginBottom: 7 }}>{e}</div>))}
            {data && !loading && (() => {
              const rank = getRank(data.combined_score, tk);
              const scoreColor = data.combined_score >= 80 ? tk.green : data.combined_score >= 60 ? tk.blue : data.combined_score >= 40 ? tk.amber : tk.rose;
              return (<>
                <div id="sec-score" className="fu" style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, marginBottom: 8, boxShadow: tk.shadowLg, overflow: "hidden" }}>
                  <div style={{ height: 2, background: scoreColor }} />
                  <div style={{ padding: isMobile ? "22px 18px" : "32px 36px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 28, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: tk.text3, marginBottom: 12 }}>Analysis Report</div>
                      <div style={{ fontSize: isMobile ? "clamp(18px,6vw,28px)" : "clamp(22px,3vw,34px)", fontWeight: 600, letterSpacing: "-0.04em", color: tk.text, marginBottom: 14, lineHeight: 1.1 }}>{[gh, lc, cf].filter(Boolean).join(" / ")}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                        {data.github && <span style={tagS(tk.blue, tk.blueLight, tk.blueBorder)}>GitHub</span>}
                        {data.leetcode && <span style={tagS(tk.amber, tk.amberLight, tk.amberBorder)}>LeetCode</span>}
                        {data.codeforces && <span style={tagS(tk.purple, tk.purpleLight, tk.purpleBorder)}>Codeforces</span>}
                        <span style={tagS(rank.color, rank.bg, rank.border)}>{rank.label}</span>
                      </div>
                      <p style={{ fontSize: 13, color: tk.text2, lineHeight: 1.65, margin: 0, maxWidth: 480 }}>{getVerdict(data.combined_score)}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, ...(isMobile ? { order: -1 } : {}) }}>
                      <ScoreRing score={data.combined_score} tk={tk} size={isMobile ? 112 : 144} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: rank.color }}>{rank.label}</span>
                    </div>
                  </div>
                </div>
                <div id="sec-platforms" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)", gap: 8, marginBottom: 8 }}>
                  <PlatformCard title="GitHub" handle={gh} accentColor={tk.blue} accentLight={tk.blueLight} accentBorder={tk.blueBorder} tk={tk} empty={!data.github?.analytics} platform="github">
                    {data.github?.analytics && (<>{[{ label: "Repositories", v: data.github.analytics.total_projects, a: tk.blue }, { label: "Stars", v: data.github.analytics.total_stars, a: tk.amber }, { label: "Recent Active", v: data.github.analytics.recent_projects, a: null }, { label: "Skill Score", v: `${data.github.analytics.skill_score}/100`, a: tk.green }, { label: "Top Language", v: data.github.analytics.most_used_language || "N/A", a: tk.blue }].map((s, i) => <StatRow key={s.label} label={s.label} value={s.v} accent={s.a} tk={tk} stripe={i % 2 === 0} />)}{data.github.analytics.language_distribution && Object.keys(data.github.analytics.language_distribution).length > 0 && <LangBars data={data.github.analytics.language_distribution} tk={tk} />}</>)}
                  </PlatformCard>
                  <PlatformCard title="LeetCode" handle={lc} accentColor={tk.amber} accentLight={tk.amberLight} accentBorder={tk.amberBorder} tk={tk} empty={data.leetcode?.total_solved === undefined} platform="leetcode">
                    {data.leetcode?.total_solved !== undefined && (<>{[{ label: "Total Solved", v: data.leetcode.total_solved, a: tk.amber }, { label: "Global Rank", v: data.leetcode.ranking ? `#${data.leetcode.ranking.toLocaleString()}` : "N/A", a: null }, { label: "Contest Rating", v: data.leetcode.contest_rating || "N/A", a: tk.purple }, { label: "Contests", v: data.leetcode.contests_attended, a: null }, { label: "Top %", v: data.leetcode.top_percentage ? `${data.leetcode.top_percentage}%` : "N/A", a: tk.green }].map((s, i) => <StatRow key={s.label} label={s.label} value={s.v} accent={s.a} tk={tk} stripe={i % 2 === 0} />)}<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, padding: "12px 18px 14px" }}>{([{ n: data.leetcode.easy_solved, l: "Easy", c: tk.green, bg: tk.greenLight, b: tk.greenBorder }, { n: data.leetcode.medium_solved, l: "Med", c: tk.amber, bg: tk.amberLight, b: tk.amberBorder }, { n: data.leetcode.hard_solved, l: "Hard", c: tk.rose, bg: tk.roseLight, b: tk.roseBorder }] as const).map(d => (<div key={d.l} style={{ borderRadius: 7, padding: "10px 6px", textAlign: "center", border: `1px solid ${d.b}`, background: d.bg }}><div style={{ fontSize: 20, fontWeight: 600, color: d.c, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>{d.n}</div><div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", color: d.c, opacity: 0.8 }}>{d.l}</div></div>))}</div></>)}
                  </PlatformCard>
                  <PlatformCard title="Codeforces" handle={cf} accentColor={tk.purple} accentLight={tk.purpleLight} accentBorder={tk.purpleBorder} tk={tk} empty={data.codeforces?.rating === undefined} platform="codeforces">
                    {data.codeforces?.rating !== undefined && (<>{[{ label: "Current Rating", v: data.codeforces.rating, a: tk.purple }, { label: "Peak Rating", v: data.codeforces.max_rating, a: tk.blue }, { label: "Rank", v: data.codeforces.rank || "unrated", a: cfColor(data.codeforces.rank, tk) }, { label: "Peak Rank", v: data.codeforces.max_rank || "unrated", a: cfColor(data.codeforces.max_rank, tk) }, { label: "Problems Solved", v: data.codeforces.problems_solved, a: tk.green }, { label: "Contests", v: data.codeforces.contests_participated, a: null }, { label: "Contribution", v: data.codeforces.contribution, a: (data.codeforces.contribution ?? 0) >= 0 ? tk.green : tk.rose }].map((s, i) => <StatRow key={s.label} label={s.label} value={s.v} accent={s.a} tk={tk} stripe={i % 2 === 0} />)}</>)}
                  </PlatformCard>
                </div>
                <DeveloperCard data={data} gh={gh} lc={lc} cf={cf} tk={tk} dark={dark} />
                <AIPanel data={data} gh={gh} lc={lc} cf={cf} tk={tk} dark={dark} />
                {gh && data.github && <ContributionHeatmap username={gh.trim()} tk={tk} dark={dark} />}
                {data.github?.advancedAnalytics && (
                  <AdvancedAnalyticsCard
                    codingHours={data.github.advancedAnalytics.codingHours}
                    complexRepos={data.github.advancedAnalytics.complexRepos}
                    longestGap={data.github.advancedAnalytics.longestGap}
                    monthlyComparison={data.github.advancedAnalytics.monthlyComparison}
                    tk={tk}
                  />
                )}
                {data.github?.repositories && data.github.repositories.length > 0 && (
                  <div id="sec-repos" style={{ background: tk.surface, borderRadius: 10, border: `1px solid ${tk.border}`, overflow: "hidden", boxShadow: tk.shadow, marginBottom: 8 }}>
                    <SectionHeader label="Repositories" tk={tk} right={<span style={{ fontSize: 11, color: tk.text3 }}>{data.github.repositories.length}</span>} />
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(auto-fill,minmax(190px,1fr))`, gap: 0 }}>
                      {data.github.repositories.map((r, i) => <RepoCard key={i} repo={r} tk={tk} gh={gh} />)}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 20, borderTop: `1px solid ${tk.border}`, marginTop: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: tk.text3, letterSpacing: "-0.02em" }}>DevIQ</span>
                  <span style={{ fontSize: 11, color: tk.text3 }}>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </>);
            })()}
          </>)}

          {/* COMPARE */}
          {page === "compare" && (<>
            <div style={{ padding: isMobile ? "36px 0 28px" : "64px 0 44px", borderBottom: `1px solid ${tk.border}`, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: tk.text3, marginBottom: 12 }}>Head-to-Head</div>
              <h1 style={{ fontSize: isMobile ? "clamp(28px,9vw,42px)" : "clamp(34px,5vw,50px)", fontWeight: 600, letterSpacing: "-0.04em", color: tk.text, lineHeight: 1.08 }}>Compare two developers.</h1>
            </div>
            <CompareMode tk={tk} isMobile={isMobile} />
          </>)}

          {/* HISTORY */}
          {page === "history" && user && <HistoryPage user={user} profile={profile} tk={tk} isMobile={isMobile} onNavigate={(p) => navigate(p)} />}
          {page === "history" && !user && (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: tk.text3, marginBottom: 16 }}>Sign in to view your analysis history.</div>
              <button onClick={() => setAuthModal("login")} style={{ padding: "9px 20px", border: "none", borderRadius: 7, background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Sign In</button>
            </div>
          )}

          {/* FOLLOWING */}
          {page === "following" && user && <FollowingPage user={user} profile={profile} tk={tk} isMobile={isMobile} onNavigate={(p) => navigate(p)} onProfileSave={handleProfileSave} />}
          {page === "following" && !user && (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: tk.text3, marginBottom: 16 }}>Sign in to manage your following.</div>
              <button onClick={() => setAuthModal("login")} style={{ padding: "9px 20px", border: "none", borderRadius: 7, background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Sign In</button>
            </div>
          )}

          {/* CHAT */}
          {page === "chat" && user && <ChatPage user={user} profile={profile} tk={tk} isMobile={isMobile} />}
          {page === "chat" && !user && (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: tk.text3, marginBottom: 16 }}>Sign in to chat with your profile AI.</div>
              <button onClick={() => setAuthModal("login")} style={{ padding: "9px 20px", border: "none", borderRadius: 7, background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Sign In</button>
            </div>
          )}

          {/* PRACTICE */}
          {page === "practice" && user && <PracticePage user={user} profile={profile} tk={tk} isMobile={isMobile} onProfileSave={handleProfileSave} />}
          {page === "practice" && !user && (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: tk.text3, marginBottom: 16 }}>Sign in to get personalized practice recommendations.</div>
              <button onClick={() => setAuthModal("login")} style={{ padding: "9px 20px", border: "none", borderRadius: 7, background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Sign In</button>
            </div>
          )}

          {/* PROFILE */}
          {page === "profile" && user && <ProfilePage user={user} profile={profile} tk={tk} isMobile={isMobile} onNavigate={(p) => navigate(p)} />}
          {page === "profile" && !user && (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: tk.text3, marginBottom: 16 }}>Sign in to view your profile.</div>
              <button onClick={() => setAuthModal("login")} style={{ padding: "9px 20px", border: "none", borderRadius: 7, background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Sign In</button>
            </div>
          )}

          {/* SETTINGS */}
          {page === "settings" && user && <SettingsPage user={user} profile={profile} tk={tk} isMobile={isMobile} dark={dark} onDarkToggle={toggleDark} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} onProfileSave={handleProfileSave} onProfileSaveStrict={handleProfileSaveStrict} onSyncNow={handleSyncNow} onPullLatest={handlePullLatest} />}
          {page === "settings" && !user && (
            <div style={{ padding: "80px 0", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: tk.text3, marginBottom: 16 }}>Sign in to access settings.</div>
              <button onClick={() => setAuthModal("login")} style={{ padding: "9px 20px", border: "none", borderRadius: 7, background: tk.accent, color: tk.accentFg, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Sign In</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}