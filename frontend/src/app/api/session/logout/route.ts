import { NextResponse } from "next/server";

const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    await fetch(`${BACKEND_INTERNAL_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: request.headers.get("cookie")
        ? {
            cookie: request.headers.get("cookie") ?? "",
          }
        : undefined,
      cache: "no-store",
    });
  } catch {
    // Best effort: always clear the frontend cookie even if backend logout is unavailable.
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: "access_token",
    value: "",
    path: "/",
    httpOnly: true,
    maxAge: 0,
    expires: new Date(0),
    sameSite: "lax",
  });
  return response;
}