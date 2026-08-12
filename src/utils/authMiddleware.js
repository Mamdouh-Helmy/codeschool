import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

/**
 * التحقق من وجود مستخدم مسجل دخول
 */
export async function requireAuth(req) {
  const session = await getServerSession(authOptions);

  // لا توجد جلسة
  if (!session) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Authentication required",
        },
        { status: 401 }
      ),
    };
  }

  // المستخدم مسجل دخول
  return {
    authorized: true,
    user: session.user,
  };
}

/**
 * التحقق من صلاحية الأدمن
 */
export async function requireAdmin(req) {
  const authCheck = await requireAuth(req);

  // غير مسجل دخول
  if (!authCheck.authorized) {
    return authCheck;
  }

  // ليس Admin
  if (authCheck.user.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      ),
    };
  }

  // Admin
  return {
    authorized: true,
    user: authCheck.user,
  };
}