// lib/auth.ts
import { cache } from "react";
import { cookies, headers } from "next/headers";
import mongoose from "mongoose";
import { getToken, type JWT } from "next-auth/jwt";
import { connectDB } from "./mongodb";
import User from "@/app/models/User";
import { resolveAvatar } from "./avatar";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const IS_DEV = process.env.NODE_ENV !== "production";
const log = (...args: unknown[]) => {
  if (IS_DEV) console.log(...args);
};

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

/** يحوّل الـ token لـ user من الداتابيز: id ← sub (لو ObjectId) ← email */
async function userFromToken(token: JWT | null): Promise<SafeUser | null> {
  if (!token) return null;

  const rawId = (token.id ?? token.sub) as string | undefined;
  const email =
    typeof token.email === "string" ? token.email.toLowerCase() : null;

  let query: Record<string, unknown>;
  if (rawId && mongoose.isValidObjectId(rawId)) query = { _id: rawId };
  else if (email) query = { email };
  else {
    console.error("❌ [Auth] token has neither a valid id nor an email");
    return null;
  }

  await connectDB();
  const user = await User.findOne(query)
    .select("_id name email role image isActive")
    .lean<UserDoc>();

  if (!user || user.isActive === false) return null;

  log("✅ [Auth] user resolved:", String(user._id));

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    image: resolveAvatar(user.image),
  };
}

/** للـ API routes (بياخد Request) */
export async function getUserFromRequest(
  req: Request,
): Promise<SafeUser | null> {
  try {
    const token = await getToken({ req: req as any, secret: NEXTAUTH_SECRET });
    return await userFromToken(token);
  } catch (err) {
    console.error("❌ [Auth] getUserFromRequest failed:", err);
    return null;
  }
}

/** للـ Server Components والـ layouts (من غير Request). cache = استعلام واحد لكل render */
export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  try {
    const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);

    const req = {
      headers: Object.fromEntries(headerStore.entries()),
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value]),
      ),
    };

    const token = await getToken({ req: req as any, secret: NEXTAUTH_SECRET });
    return await userFromToken(token);
  } catch (err) {
    console.error("❌ [Auth] getCurrentUser failed:", err);
    return null;
  }
});