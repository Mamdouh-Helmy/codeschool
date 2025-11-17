// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  const protectedRoutes = [
    "/admin",
    "/dashboard",
    "/profile",
    "/marketing"
  ];

  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    if (!token) {
      const loginUrl = new URL("/signin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload }: any = await jwtVerify(token, JWT_SECRET);
      
      // تحقق من الصلاحيات للإدارة
      if (pathname.startsWith("/admin") && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      // تحقق من الصلاحيات للتسويق
      if (pathname.startsWith("/marketing") && payload.role !== "marketing") {
        return NextResponse.redirect(new URL("/", req.url));
      }
      
      // إضافة بيانات المستخدم للهيدر
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set("x-user-id", payload.id);
      requestHeaders.set("x-user-role", payload.role);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (err) {
      console.error("Invalid token:", err);
      const loginUrl = new URL("/signin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 🔐 منع المستخدم المسجل من زيارة صفحات التسجيل
  if (token && (pathname.startsWith("/signin") || pathname.startsWith("/signup"))) {
    try {
      const { payload }: any = await jwtVerify(token, JWT_SECRET);
      return NextResponse.redirect(new URL("/", req.url));
    } catch (err) {
      // التوكن غير صالح، اتركه يكمل
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
    "/marketing/:path*",
    "/signin",
    "/signup"
  ],
};