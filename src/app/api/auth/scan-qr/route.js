// app/api/auth/scan-qr/route.js
import { NextResponse } from "next/server";
import User from "../../../models/User";
import { connectDB } from "@/lib/mongodb";

export async function POST(req) {
  try {
    const { qrData } = await req.json(); // 🔥 تغيير من qrToken إلى qrData

    if (!qrData) {
      return NextResponse.json(
        {
          success: false,
          message: "QR data is required",
        },
        { status: 400 },
      );
    }

    await connectDB();

    console.log("🔍 Scanning QR with data:", qrData);

    // 🔥 البحث عن المستخدم باستخدام رابط البورتفليو المخزن في qrCodeData
    let scannedUser = null;

    // إذا كان الـ QR data هو رابط بورتفليو
    if (qrData.includes("/portfolio/")) {
      const portfolioId = qrData.split("/portfolio/")[1];

      // جيب الـ portfolio وبعدين الـ user
      const Portfolio = (await import("../../../models/Portfolio")).default;
      const portfolio = await Portfolio.findById(portfolioId);

      if (portfolio) {
        scannedUser = await User.findById(portfolio.userId).select("-password");
      }
    }
    // إذا كان الـ QR data لا يزال توكن (للتوافق مع الإصدارات القديمة)
    else if (qrData.includes("token=")) {
      // معالجة التوكن للتوافق مع الإصدارات القديمة
      const url = new URL(qrData);
      const token = url.searchParams.get("token");
      // يمكنك إضافة فك تشفير التوكن هنا إذا أردت
      return NextResponse.json(
        {
          success: false,
          message: "QR code format outdated. Please generate new QR code.",
        },
        { status: 400 },
      );
    }
    // إذا كان الـ QR data هو username مباشر
    else {
      scannedUser = await User.findOne({
        qrCodeData: qrData,
      }).select("-password");
    }

    if (!scannedUser) {
      console.error("❌ User not found for QR data:", qrData);
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    console.log("✅ User found:", scannedUser.username);

    const userInfo = {
      id: scannedUser._id,
      name: scannedUser.name,
      email: scannedUser.email,
      role: scannedUser.role,
      username: scannedUser.username,
      image: scannedUser.image,
      createdAt: scannedUser.createdAt,
    };

    // رابط البورتفليو
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const Portfolio = (await import("../../../models/Portfolio")).default;
    const portfolio = await Portfolio.findOne({ userId: scannedUser._id });
    const portfolioUrl = portfolio
      ? `${baseUrl}/portfolio/${portfolio._id}`
      : `${baseUrl}/portfolio/${scannedUser.username}`;

    return NextResponse.json(
      {
        success: true,
        message: `مرحباً ${scannedUser.name}`,
        user: userInfo,
        portfolioUrl: portfolioUrl,
        scanType: "portfolio_redirect",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("💥 Scan QR error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to scan QR code: " + error.message,
      },
      { status: 500 },
    );
  }
}
