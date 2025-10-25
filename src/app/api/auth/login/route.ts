import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/app/models/User";
import { connectDB } from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        success: false, 
        message: "البريد الإلكتروني وكلمة المرور مطلوبان" 
      }, { status: 400 });
    }

    await connectDB();


    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: "المستخدم غير موجود" 
      }, { status: 404 });
    }

 
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ 
        success: false, 
        message: "كلمة المرور غير صحيحة" 
      }, { status: 401 });
    }

  
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

   
    const response = NextResponse.json({
      success: true,
      accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image || null,
      },
    }, { status: 200 });

   
    response.cookies.set("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, 
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ 
      success: false, 
      message: "خطأ في الخادم" 
    }, { status: 500 });
  }
}