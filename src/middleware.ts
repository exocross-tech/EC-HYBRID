import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/",
  "/employees",
  "/clients",
  "/projects",
  "/tasks",
  "/calendar",
  "/leave",
  "/payroll",
  "/invoices",
  "/reports",
  "/social",
  "/settings",
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("ec_auth_token")?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname.startsWith(route);
  });

  // Redirect unauthenticated user to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated user away from login page
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/login
     * - api/auth/logout
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.png (public branding image)
     * - file.svg, globe.svg, next.svg, vercel.svg, window.svg
     */
    "/((?!api/auth/login|api/auth/logout|_next/static|_next/image|favicon.ico|logo.png|.*\\.svg).*)",
  ],
};
