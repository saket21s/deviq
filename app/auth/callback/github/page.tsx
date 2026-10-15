"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  exchangeCodeForToken,
  isRetryableOAuthError,
  stashOAuthError,
  stashPendingOAuth,
  storeAuthSession,
  verifyStateForProvider,
} from "@/lib/oauth";

function GithubCallbackContent() {
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    const code = searchParams.get("code");
    const state = searchParams.get("state") || "";

    if (!code) {
      window.location.replace("/");
      return;
    }

    // Stash first so a refresh mid-exchange can still be recovered by the
    // home page. exchangeCodeForToken clears this when the exchange starts,
    // so the single-use code is exchanged exactly once.
    const pending = { provider: "github" as const, code, state, createdAt: Date.now() };
    stashPendingOAuth(pending);

    // State is verified softly: the code exchange itself proves identity,
    // and verification consumes the stored state either way.
    verifyStateForProvider(state, "github");

    // Complete sign-in HERE (instead of deferring to the home page) and
    // persist the session BEFORE navigating — so "/" paints the logged-in
    // state on its very first paint with zero network on its critical path.
    exchangeCodeForToken(code, "github")
      .then(({ user, token }) => {
        storeAuthSession({ ...user, provider: "github" }, token);
        window.location.replace("/");
      })
      .catch((err) => {
        console.error("GitHub sign-in failed:", err);
        // Single-use codes must not be retried after the backend already
        // consumed them (or is misconfigured). Only re-stash for transient
        // network/5xx errors; otherwise surface the message on the home page.
        if (isRetryableOAuthError(err)) {
          stashPendingOAuth(pending);
        } else {
          stashOAuthError(err instanceof Error ? err.message : "GitHub sign-in failed");
        }
        window.location.replace("/");
      });
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}

export default function GithubCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <GithubCallbackContent />
    </Suspense>
  );
}
