// lib/auth.js - FIXED VERSION
import jwt from "jsonwebtoken";
import { connectDB } from "./mongodb";
import User from "@/app/models/User";

const JWT_SECRET =
  process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";

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
  isActive?: boolean; // ADDED THIS LINE
}

/**
 * Parse cookie header string into object form.
 */
function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.split("=");
      return [k?.trim(), decodeURIComponent(v.join("="))];
    })
  );
}

/**
 * Get user information from Request (either via Authorization header or cookie)
 * UPDATED for Next.js App Router compatibility
 */
export async function getUserFromRequest(req: Request): Promise<SafeUser | null> {
  try {
    console.log("🔐 [Auth] getUserFromRequest called");
    
    // Get headers from Request object
    const headers = req.headers;
    const authHeader = headers.get('authorization') || '';
    
    // Try Authorization header first
    let token: string | null = null;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
      console.log("🔐 [Auth] Token from Authorization header");
    }
    
    // Try cookie if no Authorization header
    if (!token) {
      const cookieHeader = headers.get('cookie') || '';
      const cookies = parseCookieHeader(cookieHeader);
      token = cookies["token"] || cookies["auth-token"];
      console.log("🔐 [Auth] Token from cookies:", token ? "Found" : "Not found");
    }
    
    // Try next-auth cookie
    if (!token) {
      const cookieHeader = headers.get('cookie') || '';
      const cookies = parseCookieHeader(cookieHeader);
      const nextAuthCookie = cookies["next-auth.session-token"] || 
                            cookies["__Secure-next-auth.session-token"];
      
      if (nextAuthCookie) {
        console.log("🔐 [Auth] Next-auth cookie found");
        // يمكنك معالجة next-auth token هنا إذا كنت تستخدم next-auth
        token = nextAuthCookie;
      }
    }

    if (!token) {
      console.log("❌ [Auth] No token found in request");
      return null;
    }

    // Verify JWT
    console.log("🔐 [Auth] Verifying JWT token...");
    let payload: any;
    
    try {
      payload = jwt.verify(token, JWT_SECRET);
      console.log("✅ [Auth] JWT verified successfully");
    } catch (jwtError: any) {
      console.error("❌ [Auth] JWT verification failed:", jwtError.message);
      return null;
    }
    
    const userId = payload?.id || payload?.userId || payload?.sub || payload?._id;
    if (!userId) {
      console.error("❌ [Auth] No user ID in JWT payload");
      return null;
    }

    console.log(`👤 [Auth] Looking for user ID: ${userId}`);

    // Get user from DB
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

    // Check if user is active
    if (user.isActive === false) {
      console.error("❌ [Auth] User account is inactive");
      return null;
    }

    console.log("✅ [Auth] User authenticated successfully:", {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      email: user.email
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
 * Helper: verify JWT token manually (e.g., in API routes)
 */
export function verifyJwt(token?: string): SafeUser | null {
  try {
    console.log("🔐 [Auth] verifyJwt called");
    
    if (!token || typeof token !== "string" || token.trim() === "") {
      console.error("❌ [Auth] No token provided to verifyJwt");
      return null;
    }

    console.log("🔐 [Auth] Verifying token...");
    const payload: any = jwt.verify(token, JWT_SECRET);
    console.log("✅ [Auth] Token verified");

    if (!payload?.id) {
      console.error("❌ [Auth] No user ID in JWT payload");
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      image: payload.image || null,
    };
  } catch (err) {
    console.error("❌ [Auth] JWT verification error:", err);
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
      code: "AUTH_REQUIRED"
    };
  }

  return {
    success: true,
    user,
    permissions: getUserPermissions(user.role)
  };
}

/**
 * NEW: Get user permissions based on role
 */
function getUserPermissions(role?: string) {
  const permissions = {
    admin: ['read', 'write', 'delete', 'manage_users', 'manage_courses', 'manage_groups'],
    marketing: ['read', 'write', 'manage_campaigns', 'view_analytics'],
    instructor: ['read', 'write_student_evaluations', 'manage_sessions'],
    student: ['read']
  };

  return permissions[role as keyof typeof permissions] || ['read'];
}