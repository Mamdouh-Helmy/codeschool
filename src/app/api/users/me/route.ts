// app/api/users/me/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/app/models/User";
import { connectDB } from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";

export async function GET(req: Request) {

  try {
    if (!JWT_SECRET) {
      console.error("JWT secret not set");
      return NextResponse.json({ success: false, message: "Server misconfiguration" }, { status: 500 });
    }

    const authHeader = (req.headers.get("authorization") || "");
    let token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      const cookie = req.headers.get("cookie") || "";
      const match = cookie.match(/(?:^|; )token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return NextResponse.json({ success: false, message: "Missing or invalid Authorization header" }, { status: 401 });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("JWT verify error:", err);
      return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
    }

    await connectDB();

    const userPayload = payload as jwt.JwtPayload;
    const userId = (userPayload.id || userPayload._id) as string;
    
    if (!userId) {
      return NextResponse.json({ success: false, message: "Invalid token payload" }, { status: 401 });
    }

    // جلب المستخدم بدون استثناء أي حقول
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    console.log("🔍 User from DB:", {
      id: user._id,
      hasQRCode: !!user.qrCode,
      hasQRData: !!user.qrCodeData,
      qrCodeLength: user.qrCode?.length || 0,
      qrDataLength: user.qrCodeData?.length || 0
    });

    // استثني الباسورد يدوياً
    const { password, __v, ...userResponse } = user.toObject();

    console.log("📤 Sending user response:", {
      ...userResponse,
      qrCode: userResponse.qrCode ? "EXISTS" : "NULL",
      qrCodeData: userResponse.qrCodeData ? "EXISTS" : "NULL"
    });

    return NextResponse.json({ 
      success: true, 
      user: {
        ...userResponse,
        qrCode: userResponse.qrCode || null,
        qrCodeData: userResponse.qrCodeData || null
      }
    }, { status: 200 });
  } catch (err) {
    console.error("Get user by token error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}