import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Verification from "../../models/Verification";

export async function POST(req) {
  try {
    console.log("🔐 Verifying OTP...");
    
    const { email, otp } = await req.json();

    if (!email || !otp) {
      console.log("❌ Missing email or OTP");
      return NextResponse.json({ 
        success: false, 
        message: "Email and OTP are required" 
      }, { status: 400 });
    }

    console.log("🔌 Connecting to database...");
    await connectDB();

    // البحث عن رمز التحقق
    console.log("🔎 Looking for verification record:", { email: email.toLowerCase() });
    const verification = await Verification.findOne({
      email: email.toLowerCase(),
      otp
    });

    if (!verification) {
      console.log("❌ Invalid verification code");
      return NextResponse.json({ 
        success: false, 
        message: "Invalid verification code" 
      }, { status: 400 });
    }

    // التحقق من انتهاء الصلاحية
    if (verification.expiresAt < new Date()) {
      console.log("❌ Verification code expired");
      // حذف السجل المنتهي
      await Verification.deleteOne({ email: email.toLowerCase() });
      return NextResponse.json({ 
        success: false, 
        message: "Verification code has expired" 
      }, { status: 400 });
    }

    // تحديث حالة التحقق
    verification.verified = true;
    verification.attempts += 1;
    await verification.save();

    console.log("✅ Email verified successfully for:", email);

    // ✅ لا نحذف سجل التحقق الآن، سنحذفه بعد التسجيل الناجح
    // await Verification.deleteOne({ email: email.toLowerCase() });

    return NextResponse.json({ 
      success: true, 
      message: "Email verified successfully",
      verified: true
    });

  } catch (error) {
    console.error("💥 Verify OTP error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Verification failed" 
    }, { status: 500 });
  }
}