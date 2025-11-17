// app/api/auth/generate-qr/route.js
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import User from "@/app/models/User";
import { connectDB } from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET;

export async function POST(req) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: "User ID is required" 
      }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: "User not found" 
      }, { status: 404 });
    }

    // إنشاء رابط مباشر للمسح - تأكد من أن الرابط صحيح
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    
    // إنشاء بيانات الـ QR
    const qrData = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      timestamp: new Date().toISOString()
    };

    // توقيع البيانات بـ JWT
    const qrToken = jwt.sign(qrData, JWT_SECRET, { expiresIn: "1y" });

    // الرابط الكامل مع التوكن - تأكد من الصيغة
    const fullQrUrl = `${baseUrl}/scanner?token=${encodeURIComponent(qrToken)}`;

    console.log("🔗 QR URL to generate:", fullQrUrl);

    // توليد QR Code يحتوي على الرابط
    const qrCodeImage = await QRCode.toDataURL(fullQrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // حفظ في قاعدة البيانات
    const result = await User.updateOne(
      { _id: userId },
      { 
        $set: { 
          qrCode: qrCodeImage, 
          qrCodeData: qrToken 
        } 
      }
    );

    console.log("✅ QR Code with URL saved to DB:", result.modifiedCount > 0);

    return NextResponse.json({
      success: true,
      qrCode: qrCodeImage,
      qrData: qrToken,
      qrUrl: fullQrUrl
    }, { status: 200 });

  } catch (error) {
    console.error("💥 Generate QR error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to generate QR code: " + error.message 
    }, { status: 500 });
  }
}