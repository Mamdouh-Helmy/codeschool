// app/api/register/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import User from "@/app/models/User";
import Verification from "@/app/models/Verification";
import { connectDB } from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePayload({ name, email, password }) {
  const errors = {};
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    errors.name = "Name is required and must be at least 2 characters";
  }
  if (!email || !emailRegex.test(email)) {
    errors.email = "A valid email is required";
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }
  return errors;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    console.log("🚀 Starting registration for:", email);

    // التحقق من القيم
    const errors = validatePayload({ name, email, password });
    if (Object.keys(errors).length) {
      return NextResponse.json({ success: false, message: "Validation failed", errors }, { status: 400 });
    }

    await connectDB();

    // التحقق من أن البريد الإلكتروني تم التحقق منه
    const existingVerification = await Verification.findOne({
      email: email.toLowerCase()
    });

    if (existingVerification) {
      return NextResponse.json({ 
        success: false, 
        message: "Email not verified. Please complete verification first." 
      }, { status: 400 });
    }

    // تحقق من وجود إيميل سابقًا
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ success: false, message: "Email already registered" }, { status: 409 });
    }

    // تشفير الباسورد
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("🔑 Password hashed, generating QR code...");

    // توليد QR Code أولاً
    let qrCodeImage = "";
    let qrToken = "";

    try {
      const qrData = {
        email: email.toLowerCase(),
        name: name.trim(),
        role: role || "student",
        timestamp: new Date().toISOString()
      };

      qrToken = jwt.sign(qrData, JWT_SECRET, { expiresIn: "1y" });
      
      // توليد QR Code
      qrCodeImage = await QRCode.toDataURL(qrToken, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      console.log("✅ QR Code generated successfully");

    } catch (qrError) {
      console.error("❌ QR generation failed:", qrError);
      // نستمر في إنشاء المستخدم حتى لو فشل توليد QR
    }

    // إنشاء المستخدم مع الـ QR Code
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "student",
      qrCode: qrCodeImage,
      qrCodeData: qrToken
    });

    console.log("🎉 User created successfully:", {
      id: newUser._id,
      hasQRCode: !!newUser.qrCode,
      hasQRData: !!newUser.qrCodeData,
      qrCodeLength: newUser.qrCode?.length || 0,
      qrDataLength: newUser.qrCodeData?.length || 0
    });

    // إذا الـ QR Code مش متخزن، استخدم updateOne
    if (!newUser.qrCode || !newUser.qrCodeData) {
      console.log("🔄 QR code not saved in create, using updateOne...");
      const updateResult = await User.updateOne(
        { _id: newUser._id },
        { 
          $set: { 
            qrCode: qrCodeImage, 
            qrCodeData: qrToken 
          } 
        }
      );
      
      console.log("📝 Update result:", updateResult);
      
      // جلب المستخدم المحدث
      const updatedUser = await User.findById(newUser._id);
      console.log("✅ After update verification:", {
        hasQRCode: !!updatedUser.qrCode,
        hasQRData: !!updatedUser.qrCodeData
      });
    }

    // لا تُرجع الباسورد في الـ response
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      qrCode: newUser.qrCode,
      createdAt: newUser.createdAt,
    };

    return NextResponse.json({ 
      success: true, 
      message: "User registered successfully", 
      user: userResponse 
    }, { status: 201 });
    
  } catch (error) {
    console.error("💥 Register error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}