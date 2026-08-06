// app/api/auth/generate-qr/route.js
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import User from "@/app/models/User";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth"; // ✅ next-auth aware helper

export async function POST(req) {
  try {
    await connectDB();

    // ✅ لازم نتأكد مين اللي بيبعت الـ request أصلاً —
    // قبل كده الـ route ده كان بيثق في userId جاي من الـ body من غير أي تحقق،
    // يعني أي حد يقدر يولّد QR code لأي حساب تاني.
    const authUser = await getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 },
      );
    }

    // ✅ منع أي مستخدم من توليد QR code لحساب مش بتاعه
    // (لو عندك دور admin وعايز تسمحله يولّد لأي حد، ضيف استثناء هنا:
    // if (authUser.role !== "admin" && authUser.id !== userId) { ... })
    if (authUser.id !== userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: cannot generate QR code for another user",
        },
        { status: 403 },
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    // 🔥 إنشاء رابط البورتفليو مباشرة باستخدام username
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (!user.username) {
      return NextResponse.json(
        {
          success: false,
          message: "User does not have a username",
        },
        { status: 400 },
      );
    }

    // الرابط المباشر للبورتفليو
    // جيب الـ portfolio id أولاً
    const Portfolio = (await import("../../../models/Portfolio")).default;
    const portfolio = await Portfolio.findOne({ userId: user._id });

    if (!portfolio) {
      return NextResponse.json(
        {
          success: false,
          message: "Portfolio not found for this user",
        },
        { status: 404 },
      );
    }

    const portfolioUrl = `${baseUrl}/portfolio/${portfolio._id}`;

    console.log(
      "🔗 Generating QR Code with direct portfolio URL:",
      portfolioUrl,
    );

    // توليد QR Code يحتوي على رابط البورتفليو مباشرة
    const qrCodeImage = await QRCode.toDataURL(portfolioUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // حفظ في قاعدة البيانات
    const result = await User.updateOne(
      { _id: userId },
      {
        $set: {
          qrCode: qrCodeImage,
          qrCodeData: portfolioUrl, // 🔥 حفظ رابط البورتفليو بدلاً من التوكن
        },
      },
    );

    console.log(
      "✅ QR Code with portfolio URL saved to DB:",
      result.modifiedCount > 0,
    );

    return NextResponse.json(
      {
        success: true,
        qrCode: qrCodeImage,
        portfolioUrl: portfolioUrl,
        message: "QR code generated successfully with portfolio link",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("💥 Generate QR error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate QR code: " + error.message,
      },
      { status: 500 },
    );
  }
}