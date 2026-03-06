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
      .then(async (data) => {
        if (data.error) throw new Error(data.error);
        
        // Also register with backend to get session cookie
        const API = process.env.NEXT_PUBLIC_API_BASE_URL || 
          (typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:8000'
            : 'https://developer-portfolio-backend-bu76.onrender.com');
        
        try {
          console.log('🔑 Creating backend session for:', data.email);
          const backendRes = await fetch(`${API}/auth/gmail/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: data.email,
              name: data.name,
              profile_picture_url: data.avatar || data.picture || data.image,
            }),
          });
          
          const backendData = await backendRes.json();
          console.log('📦 Backend response:', backendRes.status, backendData);
          
          if (!backendRes.ok) {
            console.error('❌ Backend session failed:', backendData);
            throw new Error(`Backend session failed: ${backendData.error || backendRes.statusText}`);
          }
          
          console.log('✅ Backend session created successfully');
        } catch (err) {
          console.error('⚠️ Backend session creation failed:', err);
          // Don't fail the whole login, but user will need to re-auth
        }
        
        window.opener?.postMessage(
          {
            type: "OAUTH_SUCCESS",
            name: data.name,
            email: data.email,
            avatar: data.avatar || data.picture || data.image,
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