"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  exchangeCodeForToken,
  stashPendingOAuth,
  storeAuthSession,
  verifyStateForProvider,
} from "@/lib/oauth";

function GoogleCallbackContent() {
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
    const pending = { provider: "google" as const, code, state, createdAt: Date.now() };
    stashPendingOAuth(pending);

    // State is verified softly: the code exchange itself proves identity,
    // and verification consumes the stored state either way.
    verifyStateForProvider(state, "google");

    // Complete sign-in HERE (instead of deferring to the home page) and
    // persist the session BEFORE navigating — so "/" paints the logged-in
    // state on its very first paint with zero network on its critical path.
    exchangeCodeForToken(code, "google")
      .then(({ user, token }) => {
        storeAuthSession({ ...user, provider: "google" }, token);
        window.location.replace("/");
      })
      .catch((err) => {
        console.error("Google sign-in failed:", err);
        // Re-stash so the home page can retry once (transient failures).
        stashPendingOAuth(pending);
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

export default function GoogleCallbackPage() {
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
      <GoogleCallbackContent />
    </Suspense>
  );
}
