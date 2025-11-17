// app/api/auth/scan-qr/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "../../../models/User";
import { connectDB } from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET;

export async function POST(req) {
  try {
    const { qrToken, scannedBy } = await req.json();

    if (!qrToken) {
      return NextResponse.json(
        {
          success: false,
          message: "QR token is required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // فك تشفير الـ QR token
    let decoded;
    try {
      decoded = jwt.verify(qrToken, JWT_SECRET);
      console.log("✅ Token decoded:", decoded);
    } catch (err) {
      console.error("❌ Token verification failed:", err);
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired QR code",
        },
        { status: 401 }
      );
    }

    // البحث عن المستخدم الماسوح
    const scannedUser = await User.findById(decoded.userId).select("-password");
    if (!scannedUser) {
      console.error("❌ User not found with ID:", decoded.userId);
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // التحقق من أن الـ QR code صالح
    if (scannedUser.qrCodeData !== qrToken) {
      console.error(
        "❌ QR code mismatch - stored:",
        scannedUser.qrCodeData?.substring(0, 20),
        "received:",
        qrToken.substring(0, 20)
      );
      return NextResponse.json(
        {
          success: false,
          message: "QR code is no longer valid",
        },
        { status: 401 }
      );
    }

    const userInfo = {
      id: scannedUser._id,
      name: scannedUser.name,
      email: scannedUser.email,
      role: scannedUser.role,
      image: scannedUser.image,
      createdAt: scannedUser.createdAt,
    };

    // إذا كان في scanner ID، يبقى في محاولة تسجيل حضور
    if (scannedBy && scannedBy !== "anonymous") {
      const scannerUser = await User.findById(scannedBy);

      if (scannerUser) {
        // التحقق من صلاحيات المسح
        const allowedRoles = ["admin", "marketing", "instructor"];
        if (allowedRoles.includes(scannerUser.role)) {
          console.log("✅ Scanner has permission to record attendance");

          // تسجيل الحضور (بدون استخدام Attendance model)
          const attendanceData = {
            id: new Date().getTime().toString(),
            time: new Date().toISOString(),
            scannedBy: scannerUser.name,
            scanType: "attendance",
          };

          return NextResponse.json(
            {
              success: true,
              message: `تم تسجيل حضور ${scannedUser.name} بنجاح`,
              user: userInfo,
              attendance: attendanceData,
              scanType: "attendance",
            },
            { status: 200 }
          );
        } else {
          console.log(
            "❌ Scanner doesn't have permission. Role:",
            scannerUser.role
          );
        }
      } else {
        console.log("❌ Scanner user not found with ID:", scannedBy);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `مرحباً ${scannedUser.name}`,
        user: userInfo,
        scanType: scannedBy === decoded.userId ? "self-scan" : "info-only",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("💥 Scan QR error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to scan QR code: " + error.message,
      },
      { status: 500 }
    );
  }
}
