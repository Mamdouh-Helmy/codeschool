// app/api/register/route.js (مصحح)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "../../models/User";
import Verification from "../../models/Verification";
import { connectDB } from "../../../lib/mongodb";

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

    // التحقق من القيم
    const errors = validatePayload({ name, email, password });
    if (Object.keys(errors).length) {
      return NextResponse.json({ success: false, message: "Validation failed", errors }, { status: 400 });
    }

    await connectDB();

    // التحقق من أن البريد الإلكتروني تم التحقق منه
    // نتحقق من أن لا يوجد سجل في Verification لهذا البريد
    // لأننا نحذف السجل بعد التحقق الناجح في verify-otp
    const existingVerification = await Verification.findOne({
      email: email.toLowerCase()
    });

    // إذا كان لا يزال هناك سجل تحقق، معناه لم يتم التحقق بعد
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

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "student",
      emailVerified: true,
    });

    // لا تُرجع الباسورد في الـ response
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    return NextResponse.json({ 
      success: true, 
      message: "User registered successfully", 
      user: userResponse 
    }, { status: 201 });
    
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}