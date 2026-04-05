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

export async function proxyDocsResponse(upstreamPath: string) {
  const upstreamResponse = await fetch(new URL(upstreamPath, BACKEND_INTERNAL_URL), {
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

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export async function buildOpenApiProxyResponse() {
  const upstreamResponse = await fetch(new URL("/api/openapi.json", BACKEND_INTERNAL_URL), {
    cache: "no-store",
  });

  const payload = (await upstreamResponse.json()) as {
    paths?: Record<string, unknown>;
    servers?: Array<{ url: string; description?: string }>;
  };

  const rewrittenPaths = Object.fromEntries(
    Object.entries(payload.paths ?? {}).map(([path, value]) => {
      const nextPath = path.startsWith("/api/") ? path.replace(/^\/api/, "") : path;
      return [nextPath, value];
    }),
  );

  return Response.json({
    ...payload,
    servers: [
      {
        url: "/api/backend",
        description: "Project-integrated backend proxy",
      },
    ],
    paths: rewrittenPaths,
  });
}