"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function GitHubCallbackInner() {
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const storedState = sessionStorage.getItem("oauth_state");
    const connectState = localStorage.getItem("github_connect_state");
    const connectAction = localStorage.getItem("github_connect_action");

    if (error) {
      window.opener?.postMessage(
        { type: "OAUTH_ERROR", message: `GitHub OAuth error: ${error}` },
        window.location.origin
      );
      window.close();
      return;
    }
    if (!code) {
      window.opener?.postMessage(
        { type: "OAUTH_ERROR", message: "No authorization code received." },
        window.location.origin
      );
      window.close();
      return;
    }
    
    // Check if this is a connect account flow
    if (connectAction === 'connect_account' && state === connectState) {
      localStorage.removeItem("github_connect_state");
      localStorage.removeItem("github_connect_action");
      
      // Optional token from localStorage; cookie auth is primary
      const authToken = localStorage.getItem("auth_token");

      // Step 2: Exchange code for user data via backend
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developer-portfolio-backend-bu76.onrender.com';
      const redirectUri = `${window.location.origin}/auth/callback/github`;
      fetch(`${API_BASE}/auth/oauth`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, provider: "github", redirect_uri: redirectUri }),
      })
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok || data?.error) {
            throw new Error(data?.detail || data?.error || "GitHub OAuth failed");
          }
          return data;
        })
        .then(async (data) => {
          // Connect the GitHub account
          // The /auth/oauth response nests user info under data.user
          const ghUser = data.user || data;
          const ghUsername = ghUser.login || ghUser.username || ghUser.name;
          const API_BASE2 = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developer-portfolio-backend-bu76.onrender.com';
          const CONNECT_URL = `${API_BASE2}/accounts/connect/github`;

          console.log('🔌 Connecting GitHub account:', { url: CONNECT_URL, username: ghUsername });

          const connectResp = await fetch(CONNECT_URL, {
            method: "POST",
            credentials: "include",
            headers: { 
              "Content-Type": "application/json",
              ...(authToken ? { "Authorization": `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify({ 
              username: ghUsername,
              metadata: { 
                name: ghUser.name || ghUser.username,
                email: ghUser.email,
                avatar_url: ghUser.avatar || ghUser.avatar_url || ghUser.profile_picture_url
              }
            })
          });
          
          const connectData = await connectResp.json();
          
          if (connectResp.ok) {
            console.log('✅ GitHub account connected successfully');
            window.opener?.postMessage(
              { type: "GITHUB_CONNECTED", username: ghUsername },
              window.location.origin
            );
          } else {
            throw new Error(connectData.detail || connectData.error || "Failed to connect GitHub account");
          }
        })
        .catch((err) => {
          console.error('❌ Error connecting GitHub account to backend:', err);
          window.opener?.postMessage(
            { type: "OAUTH_ERROR", message: err.message },
            window.location.origin
          );
        })
        .finally(() => window.close());
      return;
    }
    
    // Regular login flow
    if (state !== storedState) {
      window.opener?.postMessage(
        { type: "OAUTH_ERROR", message: "State mismatch." },
        window.location.origin
      );
      window.close();
      return;
    }

    sessionStorage.removeItem("oauth_state");

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developer-portfolio-backend-bu76.onrender.com';
    const redirectUri = `${window.location.origin}/auth/callback/github`;
    fetch(`${API_BASE}/auth/oauth`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, provider: "github", redirect_uri: redirectUri }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          throw new Error(data?.detail || data?.error || "GitHub OAuth failed");
        }
        return data;
      })
      .then((data) => {
        const u = data.user || data;
        window.opener?.postMessage(
          {
            type: "OAUTH_SUCCESS",
            name: u.name || u.username,
            email: u.email || "",
            avatar: u.avatar || u.avatar_url || u.profile_picture_url || u.picture,
            provider: "github",
          },
          window.location.origin
        );
      })
      .catch((err) => {
        window.opener?.postMessage(
          { type: "OAUTH_ERROR", message: err.message },
          window.location.origin
        );
      })
      .finally(() => window.close());
  }, [params]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "system-ui",
      }}
    >
      Completing GitHub sign-in...
    </div>
  );
}

export default function GitHubCallback() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            fontFamily: "system-ui",
          }}
        >
          Loading...
        </div>
      }
    >
      <GitHubCallbackInner />
    </Suspense>
  );
}