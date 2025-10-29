// app/api/verify-otp/route.js (مصحح)
import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Verification from "../../models/Verification";

export async function POST(req) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ 
        success: false, 
        message: "Email and OTP are required" 
      }, { status: 400 });
    }

    await connectDB();

    // البحث عن رمز التحقق
    const verification = await Verification.findOne({
      email: email.toLowerCase(),
      otp
    });

    if (!verification) {
      return NextResponse.json({ 
        success: false, 
        message: "Invalid verification code" 
      }, { status: 400 });
    }

    // التحقق من انتهاء الصلاحية
    if (verification.expiresAt < new Date()) {
      // حذف السجل المنتهي
      await Verification.deleteOne({ email: email.toLowerCase() });
      return NextResponse.json({ 
        success: false, 
        message: "Verification code has expired" 
      }, { status: 400 });
    }

    // ✅ حذف سجل التحقق بعد التحقق الناجح
    // هذا هو الجزء المهم الذي يسمح بالتسجيل لاحقاً
    await Verification.deleteOne({ 
      email: email.toLowerCase(),
      otp 
    });

    return NextResponse.json({ 
      success: true, 
      message: "Email verified successfully" 
    });

  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Verification failed" 
    }, { status: 500 });
  }
}