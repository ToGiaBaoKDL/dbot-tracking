import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow NextAuth API routes and static assets unconditionally
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const hasToken = !!token?.accessToken;
  const isExpired =
    hasToken &&
    typeof token.accessTokenExpires === "number" &&
    Date.now() > token.accessTokenExpires;

  if (pathname === "/login" && hasToken && !isExpired) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname !== "/login" && (!hasToken || isExpired)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Prevent non-admin users from accessing admin routes
  if (pathname.startsWith("/admin") && token?.isAdmin !== true) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
