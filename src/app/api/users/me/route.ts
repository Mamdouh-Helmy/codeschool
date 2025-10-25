// app/api/auth/user/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "../../../models/User";
import { connectDB } from "../../../../lib/mongodb";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET;

export async function GET(req: Request) {
  try {
    if (!JWT_SECRET) {
      console.error("JWT secret not set");
      return NextResponse.json({ success: false, message: "Server misconfiguration" }, { status: 500 });
    }

    // نحاول نقرأ من Authorization header ثم من الـ cookie
    // In Next.js route, req is a Request — to access cookies on the server side you may need to use NextRequest in middleware,
    // but for API route we can parse cookie from header.
    const authHeader = (req.headers.get("authorization") || "");
    let token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      // fallback to cookie
      const cookie = req.headers.get("cookie") || "";
      const match = cookie.match(/(?:^|; )token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return NextResponse.json({ success: false, message: "Missing or invalid Authorization header" }, { status: 401 });
    }

    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("JWT verify error:", err);
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
    }

    await connectDB();

    const userId = payload?.id || payload?._id;
    if (!userId) {
      return NextResponse.json({ success: false, message: "Invalid token payload" }, { status: 401 });
    }

    const user = await User.findById(userId).select("-password -__v");
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image || null,
    };

    return NextResponse.json({ success: true, user: userResponse }, { status: 200 });
  } catch (err) {
    console.error("Get user by token error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
