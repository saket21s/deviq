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
      
      fetch("/api/auth/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok || data?.error) {
            throw new Error(data?.error || "GitHub OAuth failed");
          }
          return data;
        })
        .then(async (data) => {
          // Connect the GitHub account
          const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
          const connectResp = await fetch(`${BACKEND}/accounts/connect/github`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              username: data.login || data.name,
              access_token: data.access_token,
              metadata: { 
                name: data.name,
                email: data.email,
                avatar_url: data.avatar || data.avatar_url
              }
            })
          });
          
          if (connectResp.ok) {
            window.opener?.postMessage(
              { type: "GITHUB_CONNECTED", username: data.login || data.name },
              window.location.origin
            );
          } else {
            throw new Error("Failed to connect GitHub account");
          }
        })
        .catch((err) => {
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

    fetch("/api/auth/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data?.error) {
          throw new Error(data?.error || "GitHub OAuth failed");
        }
        return data;
      })
      .then((data) => {
        window.opener?.postMessage(
          {
            type: "OAUTH_SUCCESS",
            name: data.name,
            email: data.email,
            avatar: data.avatar || data.avatar_url || data.picture,
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