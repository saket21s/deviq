"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
const PENDING_OAUTH_KEY = "deviq_pending_oauth";
const PENDING_OAUTH_LOCAL_KEY = "deviq_pending_oauth_local";

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code) {
      const payload = JSON.stringify({
        provider: "google",
        code,
        state,
        createdAt: Date.now(),
      });
      sessionStorage.setItem(PENDING_OAUTH_KEY, payload);
      localStorage.setItem(PENDING_OAUTH_LOCAL_KEY, payload);
    }

    // Redirect immediately so users do not wait on this page.
    window.location.replace("/");
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
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

