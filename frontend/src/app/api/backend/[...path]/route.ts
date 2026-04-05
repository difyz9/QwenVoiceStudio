import type { NextRequest } from "next/server";

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000";
const RESPONSE_HEADER_ALLOWLIST = [
  "content-type",
  "content-disposition",
  "cache-control",
  "location",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
];

type RouteContext = {
  params: Promise<{ path?: string[] }> | { path?: string[] };
};

async function proxyToBackend(request: NextRequest, context: RouteContext) {
  const { path = [] } = await Promise.resolve(context.params);
  const upstreamUrl = new URL(`/api/${path.join("/")}`, BACKEND_INTERNAL_URL);
  upstreamUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADER_ALLOWLIST) {
    const value = upstreamResponse.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }

  const setCookie = upstreamResponse.headers.get("set-cookie");
  if (setCookie) {
    responseHeaders.set("set-cookie", setCookie);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}