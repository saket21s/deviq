import { NextRequest, NextResponse } from "next/server";

const RAW_BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL || "https://deviq-backend-x6a9.onrender.com";
const BACKEND = RAW_BACKEND.includes("developer-portfolio-backend-bu76")
  ? "https://deviq-backend-x6a9.onrender.com"
  : RAW_BACKEND;

const METHODS_WITH_BODY = ["POST", "PUT", "PATCH"];

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const qs = req.nextUrl.searchParams.toString();
    const url = `${BACKEND}/${path.join("/")}${qs ? `?${qs}` : ""}`;

    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      if (["authorization", "x-user-email", "content-type"].includes(k)) {
        headers[k] = v;
      }
    });

    const fetchOpts: RequestInit = { method: req.method, headers };
    if (METHODS_WITH_BODY.includes(req.method)) {
      fetchOpts.body = await req.text();
    }

    // Bound the upstream wait: a sleeping backend should fail fast (502) so
    // the playground can fall back, instead of hanging the serverless fn.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    try {
      fetchOpts.signal = ctrl.signal;
      const r = await fetch(url, fetchOpts);
      const text = await r.text();

      if (r.headers.get("content-type")?.includes("json") && text.startsWith("{")) {
        return NextResponse.json(JSON.parse(text), { status: r.status });
      }
      return NextResponse.json(
        { error: "upstream returned non-json", status: r.status, body: text.slice(0, 200) },
        { status: 502 },
      );
    } finally {
      clearTimeout(t);
    }
  } catch (e) {
    return NextResponse.json(
      { error: `proxy error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const PUT = handler;
