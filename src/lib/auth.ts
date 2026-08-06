// lib/auth.ts - FIXED VERSION (next-auth aware)
import { getToken } from "next-auth/jwt";
import { connectDB } from "./mongodb";
import User from "@/app/models/User";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

export interface SafeUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string | null;
}

interface UserDoc {
  _id: any;
  name?: string;
  email?: string;
  role?: string;
  image?: string | null;
  isActive?: boolean;
}

/**
 * ✅ الطريقة الصح للتعامل مع next-auth JWT في App Router API routes.
 * getToken بتفك تشفير next-auth session token صح (JWE) بدل jwt.verify العادي.
 */
export async function getUserFromRequest(req: Request): Promise<SafeUser | null> {
  try {
    console.log("🔐 [Auth] getUserFromRequest called");

    const token = await getToken({
      req: req as any,
      secret: NEXTAUTH_SECRET,
    });

    if (!token) {
      console.log("❌ [Auth] No next-auth session token found");
      return null;
    }

    const userId = token.id as string;
    if (!userId) {
      console.error("❌ [Auth] No user ID in next-auth token");
      return null;
    }

    console.log(`👤 [Auth] Looking for user ID: ${userId}`);

    try {
      await connectDB();
    } catch (dbError) {
      console.error("❌ [Auth] Database connection failed:", dbError);
      return null;
    }

    let user: UserDoc | null;
    try {
      user = await User.findById(userId)
        .select("_id name email role image isActive")
        .lean<UserDoc>();

      console.log("✅ [Auth] User query completed:", user ? "Found" : "Not found");
    } catch (dbError) {
      console.error("❌ [Auth] Database query failed:", dbError);
      return null;
    }

    if (!user) {
      console.error("❌ [Auth] User not found in database");
      return null;
    }

    if (user.isActive === false) {
      console.error("❌ [Auth] User account is inactive");
      return null;
    }

    console.log("✅ [Auth] User authenticated successfully:", {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      email: user.email,
    });

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image || null,
    };
  } catch (err) {
    console.error("❌ [Auth] Unexpected error in getUserFromRequest:", err);
    return null;
  }
}

/**
 * NEW: Helper function for API responses
 */
export function createAuthResponse(user: SafeUser | null) {
  if (!user) {
    return {
      success: false,
      message: "Authentication required",
      code: "AUTH_REQUIRED",
    };
  }

  return {
    success: true,
    user,
    permissions: getUserPermissions(user.role),
  };
}

/**
 * NEW: Get user permissions based on role
 */
function getUserPermissions(role?: string) {
  const permissions = {
    admin: ["read", "write", "delete", "manage_users", "manage_courses", "manage_groups"],
    marketing: ["read", "write", "manage_campaigns", "view_analytics"],
    instructor: ["read", "write_student_evaluations", "manage_sessions"],
    student: ["read"],
  };

  return permissions[role as keyof typeof permissions] || ["read"];
}