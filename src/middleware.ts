import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedRoutes = [
    "/admin",
    "/dashboard",
    "/instructor",
    "/profile",
    "/marketing",
    "/guest",
    "/portfolio/builder",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // =========================
  // Protected Routes
  // =========================
  if (isProtectedRoute) {
    // Not logged in
    if (!token) {
      const loginUrl = new URL("/signin", req.url);

      loginUrl.searchParams.set("redirect", pathname);

      return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string;
    const userId = token.id as string;

    // =========================
    // Role Permissions
    // =========================

    // Admin
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Marketing
    if (pathname.startsWith("/marketing") && role !== "marketing") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Instructor
    if (pathname.startsWith("/instructor") && role !== "instructor") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Dashboard
    if (
      pathname.startsWith("/dashboard") &&
      role !== "student" &&
      role !== "user"
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Guest
    if (pathname.startsWith("/guest") && role !== "guest") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // =========================
    // Pass User Information
    // =========================

    const requestHeaders = new Headers(req.headers);

    requestHeaders.set("x-user-id", userId);
    requestHeaders.set("x-user-role", role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // =========================
  // Prevent Logged-in Users
  // from signin/signup
  // =========================

  if (
    token &&
    (pathname.startsWith("/signin") ||
      pathname.startsWith("/signup"))
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/instructor/:path*",
    "/profile/:path*",
    "/marketing/:path*",
    "/guest/:path*",
    "/portfolio/builder",
    "/signin",
    "/signup",
  ],
};