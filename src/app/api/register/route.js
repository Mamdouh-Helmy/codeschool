// app/api/register/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";
import User from "../../models/User";
import Verification from "../../models/Verification";
import { connectDB } from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_]+$/;

function validatePayload({ name, email, password, username }) {
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
  
  // التحقق من الـ username إذا تم تقديمه
  if (username && username.trim() !== "") {
    if (username.length < 3 || username.length > 20) {
      errors.username = "Username must be between 3 and 20 characters";
    } else if (!usernameRegex.test(username)) {
      errors.username = "Username can only contain letters, numbers and underscores";
    }
  }
  
  return errors;
}

// دالة للتحقق من توفر username
async function checkUsernameAvailability(username) {
  if (!username) return { available: true };
  
  const existingUser = await User.findOne({ 
    username: username.toLowerCase().trim() 
  });
  
  return {
    available: !existingUser,
    existingUser: existingUser ? existingUser.email : null
  };
}

// دالة لتوليد username تلقائياً من الاسم
async function generateUsernameFromName(name) {
  const baseUsername = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  
  let username = baseUsername;
  let counter = 1;
  
  // التأكد من أن الـ username فريد
  while (await User.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
    
    // منع loop لا نهائية
    if (counter > 100) {
      throw new Error('Could not generate unique username');
    }
  }
  
  return username;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password, role, username } = body;

    console.log("🚀 Starting registration for:", email, "Username:", username || 'auto-generate');

    // التحقق من القيم
    const errors = validatePayload({ name, email, password, username });
    if (Object.keys(errors).length) {
      return NextResponse.json({ 
        success: false, 
        message: "Validation failed", 
        errors 
      }, { status: 400 });
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
      return NextResponse.json({ 
        success: false, 
        message: "Email already registered" 
      }, { status: 409 });
    }

    // التحقق من توفر username إذا تم تقديمه
    if (username && username.trim() !== "") {
      const usernameCheck = await checkUsernameAvailability(username);
      if (!usernameCheck.available) {
        return NextResponse.json({
          success: false,
          message: "Username is already taken",
          errors: { username: "This username is already registered" }
        }, { status: 409 });
      }
    }

    // تشفير الباسورد
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("🔑 Password hashed, generating user data...");

    // توليد username إذا لم يتم تقديمه
    let finalUsername = username && username.trim() !== "" 
      ? username.toLowerCase().trim() 
      : await generateUsernameFromName(name);

    console.log("✅ Username generated:", finalUsername);

    // توليد QR Code
    let qrCodeImage = "";
    let qrToken = "";

    try {
      const qrData = {
        email: email.toLowerCase(),
        name: name.trim(),
        username: finalUsername,
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

    // إنشاء المستخدم مع جميع البيانات
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      username: finalUsername,
      password: hashedPassword,
      role: role || "student",
      qrCode: qrCodeImage,
      qrCodeData: qrToken,
      profile: {
        jobTitle: "Developer", // قيمة افتراضية
        bio: `Welcome to ${name.trim()}'s portfolio`
      }
    });

    console.log("🎉 User created successfully:", {
      id: newUser._id,
      username: newUser.username,
      hasQRCode: !!newUser.qrCode,
      hasQRData: !!newUser.qrCodeData
    });

    // التأكد من حفظ QR Code إذا فشل في الإنشاء الأولي
    if ((!newUser.qrCode || !newUser.qrCodeData) && qrCodeImage) {
      console.log("🔄 QR code not saved in create, using updateOne...");
      try {
        const updateResult = await User.updateOne(
          { _id: newUser._id },
          { 
            $set: { 
              qrCode: qrCodeImage, 
              qrCodeData: qrToken 
            } 
          }
        );
        
        console.log("📝 QR Code update result:", updateResult);
        
      } catch (updateError) {
        console.error("❌ QR Code update failed:", updateError);
      }
    }

    // لا تُرجع الباسورد في الـ response
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
      qrCode: newUser.qrCode,
      profileUrl: `/portfolio/${newUser.username}`,
      createdAt: newUser.createdAt,
    };

    console.log("✅ Registration completed successfully for:", userResponse.email);
    console.log("🔗 Portfolio URL:", userResponse.profileUrl);

    return NextResponse.json({ 
      success: true, 
      message: "User registered successfully", 
      user: userResponse 
    }, { status: 201 });
    
  } catch (error) {
    console.error("💥 Register error:", error);
    
    // معالجة أخطاء محددة
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'username' 
        ? 'Username is already taken' 
        : 'Email is already registered';
      
      return NextResponse.json({ 
        success: false, 
        message,
        errors: { [field]: message }
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: "Internal server error" 
    }, { status: 500 });
  }
}