import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Verification from "../../models/Verification";
import { sendVerificationEmail } from "../../../lib/emailService";

export async function POST(req) {
  try {
    console.log("📧 Sending verification email...");
    
    const { email } = await req.json();

    if (!email) {
      console.log("❌ Email is required");
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    console.log("🔌 Connecting to database...");
    await connectDB();

    // توليد رمز OTP عشوائي (6 أرقام)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // ينتهي بعد 10 دقائق

    console.log("🔐 Generated OTP:", otp, "Expires at:", expiresAt);

    // حفظ أو تحديث رمز OTP
    const verification = await Verification.findOneAndUpdate(
      { email: email.toLowerCase() },
      { 
        email: email.toLowerCase(), 
        otp, 
        expiresAt,
        verified: false,
        attempts: 0 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log("💾 Verification record saved:", verification._id);

    // إرسال البريد الإلكتروني
    console.log("📤 Sending email to:", email);
    const emailResult = await sendVerificationEmail(email, otp);
    
    if (!emailResult.success) {
      console.error("❌ Failed to send email:", emailResult.error);
      // نحتفظ بسجل OTP لكن نعلم المستخدم
      return NextResponse.json({ 
        success: false, 
        message: "Generated OTP but failed to send email. Please try again." 
      }, { status: 500 });
    }

    console.log("✅ Verification email sent successfully to:", email);

    return NextResponse.json({ 
      success: true, 
      message: "Verification code sent to your email",
      otpSent: true // للاختبار فقط
    });

  } catch (error) {
    console.error("💥 Send verification error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to send verification code" 
    }, { status: 500 });
  }
}