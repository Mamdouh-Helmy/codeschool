import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this"
);

// ✅ Improved Cache مع size limit و cleanup
class TokenCache {
  private cache = new Map<string, { payload: any; expiry: number }>();
  private maxSize = 500; // ✅ تقليل الحد الأقصى لـ 500 فقط
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // ✅ تنظيف الـ cache كل 30 ثانية بدل دقيقة
    this.cleanupInterval = setInterval(() => this.cleanup(), 30 * 1000);
  }

  get(token: string) {
    const item = this.cache.get(token);
    if (!item || item.expiry <= Date.now()) {
      this.cache.delete(token);
      return null;
    }
    return item.payload;
  }

  set(token: string, payload: any, ttl: number = 2 * 60 * 1000) { // ✅ تقليل TTL لـ 2 دقيقة
    // التحكم في حجم الـ cache
    if (this.cache.size >= this.maxSize) {
      // حذف أقدم عنصر
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    
    this.cache.set(token, {
      payload,
      expiry: Date.now() + ttl
    });
  }

  delete(token: string) {
    this.cache.delete(token);
  }

  cleanup() {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry <= now) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned ${deletedCount} expired tokens from cache`);
    }
  }

  // إضافة دالة للحصول على حجم الـ cache
  getSize() {
    return this.cache.size;
  }
}

const tokenCache = new TokenCache();

// ✅ Rate Limiter لمنع abuse
class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();
  private readonly MAX_REQUESTS = 100; // 100 طلب
  private readonly TIME_WINDOW = 15 * 60 * 1000; // 15 دقيقة

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(ip);

    if (!userRequests) {
      this.requests.set(ip, { count: 1, resetTime: now + this.TIME_WINDOW });
      return true;
    }

    if (now > userRequests.resetTime) {
      this.requests.set(ip, { count: 1, resetTime: now + this.TIME_WINDOW });
      return true;
    }

    if (userRequests.count >= this.MAX_REQUESTS) {
      return false;
    }

    userRequests.count++;
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(ip);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

// ✅ تنظيف الـ rate limiter كل ساعة
setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000);

async function verifyTokenWithCache(token: string) {
  // ✅ التحقق من الـ cache أولاً
  const cached = tokenCache.get(token);
  if (cached) {
    return cached;
  }

  try {
    // ✅ Verify the token
    const { payload }: any = await jwtVerify(token, JWT_SECRET);
    
    // ✅ Cache لمدة 2 دقيقة
    tokenCache.set(token, payload, 2 * 60 * 1000);
    
    return payload;
  } catch (err) {
    console.error("Token verification failed:", err);
    throw err;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  
  // ✅ الحصول على IP العميل
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  // ✅ تطبيق rate limiting على جميع الطلبات
  if (!rateLimiter.isAllowed(ip)) {
    console.warn(`🚨 Rate limit exceeded for IP: ${ip}`);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Too many requests', 
        message: 'Please try again later.' 
      }), 
      { 
        status: 429, 
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': '900' // 15 دقيقة
        } 
      }
    );
  }

  const protectedRoutes = [
    "/admin",
    "/dashboard",
    "/profile",
    "/marketing",
    "/portfolio/builder"
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
      const payload = await verifyTokenWithCache(token);
      
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
      // حذف الـ token الغير صالح من الـ cache
      if (token) {
        tokenCache.delete(token);
      }
      const loginUrl = new URL("/signin", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 🔐 منع المستخدم المسجل من زيارة صفحات التسجيل
  if (token && (pathname.startsWith("/signin") || pathname.startsWith("/signup"))) {
    try {
      const payload = await verifyTokenWithCache(token);
      return NextResponse.redirect(new URL("/", req.url));
    } catch (err) {
      // التوكن غير صالح، امسحه من الـ cache
      if (token) {
        tokenCache.delete(token);
      }
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
    "/portfolio/builder",
    "/signin",
    "/signup"
  ],
};