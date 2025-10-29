// app/api/send-verification/route.js (معدل)
import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/mongodb";
import Verification from "../../models/Verification";
import { sendVerificationEmail } from "../../../lib/emailService";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required" }, { status: 400 });
    }

    await connectDB();

    // توليد رمز OTP عشوائي (6 أرقام)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // ينتهي بعد 10 دقائق

    // حفظ أو تحديث رمز OTP
    await Verification.findOneAndUpdate(
      { email: email.toLowerCase() },
      { 
        email: email.toLowerCase(), 
        otp, 
        expiresAt,
        verified: false, // تأكد من تعيينها كـ false
        attempts: 0 
      },
      { upsert: true, new: true }
    );

    // إرسال البريد الإلكتروني
    await sendVerificationEmail(email, otp);

    return NextResponse.json({ 
      success: true, 
      message: "Verification code sent to your email" 
    });

  } catch (error) {
    console.error("Send verification error:", error);
    return NextResponse.json({ 
      success: false, 
      message: "Failed to send verification code" 
    }, { status: 500 });
  }
}