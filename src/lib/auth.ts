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
 */
export async function getUserFromRequest(
  req: Request | { headers: Headers } | { headers: any }
): Promise<SafeUser | null> {
  try {
    const headers: any = "headers" in req ? (req as any).headers : (req as any);

    const getHeader = (name: string) => {
      if (typeof headers.get === "function") return headers.get(name);
      return headers[name?.toLowerCase?.()] || headers[name];
    };

    // Try Authorization header
    const authHeader = getHeader("authorization") || "";
    let token: string | null =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    // Try cookie
    if (!token) {
      const cookieHeader = getHeader("cookie") || "";
      const cookies = parseCookieHeader(cookieHeader);
      token = cookies["token"];
    }

    if (!token) return null;

    // Verify JWT
    const payload: any = jwt.verify(token, JWT_SECRET);
    const userId = payload?.id || payload?._id;
    if (!userId) return null;

    // Get user from DB
    await connectDB();
    const user = await User.findById(userId)
      .select("-password -__v")
      .lean<UserDoc>();

    if (!user) return null;

    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image || null,
    };
  } catch (err) {
    console.error("getUserFromRequest error:", err);
    return null;
  }
}

/**
 * Helper: verify JWT token manually (e.g., in API routes)
 */
export function verifyJwt(token?: string): SafeUser | null {
  try {
    if (!token || typeof token !== "string" || token.trim() === "") {
      return null;
    }

    const payload: any = jwt.verify(token, JWT_SECRET);

    if (!payload?.id) {
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
    console.error("JWT verification error:", err);
    return null;
  }
}
