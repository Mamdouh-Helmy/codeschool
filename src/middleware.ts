// middleware.ts
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
    "/portfolio/builder",
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // getToken بيقرا الكوكي الصح ويفك التشفير تلقائي، ومش محتاج تحدد اسم الكوكي بنفسك
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (isProtectedRoute) {
    if (!token) {
      const loginUrl = new URL("/signin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = token.role as string;

    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname.startsWith("/marketing") && role !== "marketing") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname.startsWith("/instructor") && role !== "instructor") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (
      pathname.startsWith("/dashboard") &&
      role !== "student" &&
      role !== "user"
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", token.id as string);
    requestHeaders.set("x-user-role", role);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // منع مستخدم مسجل دخول من زيارة صفحات signin/signup
  if (token && (pathname.startsWith("/signin") || pathname.startsWith("/signup"))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/dashboard",
    "/instructor/:path*",
    "/instructor",
    "/profile/:path*",
    "/marketing/:path*",
    "/portfolio/builder",
    "/signin",
    "/signup",
  ],
};