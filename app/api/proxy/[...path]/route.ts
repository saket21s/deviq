import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL || "https://developer-portfolio-backend-bu76.onrender.com";

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

    const r = await fetch(url, fetchOpts);
    const text = await r.text();

    if (r.headers.get("content-type")?.includes("json") && text.startsWith("{")) {
      return NextResponse.json(JSON.parse(text), { status: r.status });
    }
    return NextResponse.json(
      { error: "upstream returned non-json", status: r.status, body: text.slice(0, 200) },
      { status: 502 },
    );
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
