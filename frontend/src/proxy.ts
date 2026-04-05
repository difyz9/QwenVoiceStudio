import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const isLoginPath = request.nextUrl.pathname === "/login";

  if (!accessToken && !isLoginPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_nextjs|favicon.ico|sitemap.xml|robots.txt).*)"],
};