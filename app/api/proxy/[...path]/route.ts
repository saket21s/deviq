import { NextRequest } from "next/server";

const BACKEND_BASE =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://developer-portfolio-backend-bu76.onrender.com";

function buildTargetUrl(req: NextRequest, path: string[]) {
  const joined = path.join("/");
  const url = new URL(req.url);
  const qs = url.search || "";
  return `${BACKEND_BASE}/${joined}${qs}`;
}

async function proxy(req: NextRequest, path: string[]) {
  const target = buildTargetUrl(req, path);

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  const authorization = req.headers.get("authorization");
  const cookie = req.headers.get("cookie");
  const userAgent = req.headers.get("user-agent");

  if (contentType) headers.set("content-type", contentType);
  if (authorization) {
    headers.set("authorization", authorization);
    console.log(`[PROXY] Authorization header: ${authorization.substring(0, 30)}...`);
  } else {
    console.log(`[PROXY] ⚠️ No authorization header in request`);
  }
  if (cookie) headers.set("cookie", cookie);
  if (userAgent) headers.set("user-agent", userAgent);

  const method = req.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await req.text();

  console.log(`[PROXY] ${method} ${target} | Auth: ${authorization ? "yes" : "no"} | Cookie: ${cookie ? "yes" : "no"}`);
  console.log(`[PROXY] All request headers:`, Array.from(req.headers.keys()));

  const resp = await fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
    credentials: "include",
  });

  console.log(`[PROXY] Response: ${resp.status} ${resp.statusText}`);

  const outHeaders = new Headers();
  resp.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-encoding") return;
    outHeaders.append(key, value);
  });

  // Read the full response body to avoid truncation issues with streaming
  const responseBody = await resp.text();
  
  return new Response(responseBody, {
    status: resp.status,
    statusText: resp.statusText,
    headers: outHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
