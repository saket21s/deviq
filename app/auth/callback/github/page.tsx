"use client";
import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

function GitHubCallbackInner() {
  const params = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    const storedState = sessionStorage.getItem("oauth_state");

    if (error) {
      window.opener?.postMessage({ type: "OAUTH_ERROR", message: `GitHub OAuth error: ${error}` }, window.location.origin);
      window.close();
      return;
    }

    if (!code) {
      window.opener?.postMessage({ type: "OAUTH_ERROR", message: "No authorization code received." }, window.location.origin);
      window.close();
      return;
    }

    if (state !== storedState) {
      window.opener?.postMessage({ type: "OAUTH_ERROR", message: "State mismatch. Possible CSRF attack." }, window.location.origin);
      window.close();
      return;
    }

    sessionStorage.removeItem("oauth_state");

    fetch("/api/auth/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        const displayName = data.name || data.login || "GitHub User";
        window.opener?.postMessage(
          { type: "OAUTH_SUCCESS", name: displayName, email: data.email, avatar: data.avatar, provider: "github" },
          window.location.origin
        );
      })
      .catch(err => {
        window.opener?.postMessage({ type: "OAUTH_ERROR", message: err.message }, window.location.origin);
      })
      .finally(() => {
        window.close();
      });
  }, [params]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#666" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #E5E5E5", borderTopColor: "#24292e", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 14 }}>Completing GitHub sign-in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function GitHubCallback() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#666" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid #E5E5E5", borderTopColor: "#24292e", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 14 }}>Completing GitHub sign-in…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <GitHubCallbackInner />
    </Suspense>
  );
}