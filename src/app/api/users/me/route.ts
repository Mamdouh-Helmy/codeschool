// app/api/users/me/route.js
import { NextResponse } from "next/server";
import User from "@/app/models/User";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth"; // ✅ next-auth aware helper

export async function GET(req: Request) {
  try {
    await connectDB();

    // ✅ next-auth session cookie بدل Bearer header / كوكي "token" اليدوية
    const authUser = await getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // جلب المستخدم كامل من الداتابيز (getUserFromRequest بترجع نسخة مختصرة بس)
    const user = await User.findById(authUser.id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    console.log("🔍 User from DB:", {
      id: user._id,
      hasQRCode: !!user.qrCode,
      hasQRData: !!user.qrCodeData,
      qrCodeLength: user.qrCode?.length || 0,
      qrDataLength: user.qrCodeData?.length || 0,
    });

    // استثني الباسورد يدوياً
    const { password, __v, ...userResponse } = user.toObject();

    console.log("📤 Sending user response:", {
      ...userResponse,
      qrCode: userResponse.qrCode ? "EXISTS" : "NULL",
      qrCodeData: userResponse.qrCodeData ? "EXISTS" : "NULL",
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          ...userResponse,
          qrCode: userResponse.qrCode || null,
          qrCodeData: userResponse.qrCodeData || null,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Get user by token error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}