"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function GoogleCallbackInner() {
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const storedState = sessionStorage.getItem("oauth_state");

    if (error) {
      window.opener?.postMessage(
        { type: "OAUTH_ERROR", message: `Google OAuth error: ${error}` },
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
    if (state !== storedState) {
      window.opener?.postMessage(
        { type: "OAUTH_ERROR", message: "State mismatch." },
        window.location.origin
      );
      window.close();
      return;
    }

    sessionStorage.removeItem("oauth_state");

    fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirect_uri: `${window.location.origin}/auth/callback/google`,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        window.opener?.postMessage(
          {
            type: "OAUTH_SUCCESS",
            name: data.name,
            email: data.email,
            avatar: data.avatar,
            provider: "google",
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
      Completing Google sign-in...
    </div>
  );
}

export default function GoogleCallback() {
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
      <GoogleCallbackInner />
    </Suspense>
  );
}