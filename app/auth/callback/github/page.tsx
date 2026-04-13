"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForToken, verifyStateForProvider } from "@/lib/oauth";

const SESSION_KEY = "deviq_session";
const AUTH_TOKEN_KEY = "auth_token";

function GithubCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code) {
          const errorParam = searchParams.get("error");
          const errorDesc = searchParams.get("error_description");
          setError(errorDesc || errorParam || "No authorization code received");
          setLoading(false);
          return;
        }

        // Verify state
        if (!verifyStateForProvider(state || "", "github")) {
          setError("Invalid state parameter - potential CSRF attack");
          setLoading(false);
          return;
        }

        // Exchange code for token
        const { token, user } = await exchangeCodeForToken(code, "github");

        // Save auth -compatible with existing code
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));

        // Redirect to home
        router.push("/");
      } catch (err: any) {
        console.error("OAuth callback error:", err);
        setError(err.message || "Authentication failed");
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return null;
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
