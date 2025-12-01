// app/api/webinars/register/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WebinarRegistration from "../../../models/WebinarRegistration";
import Webinar from "../../../models/Webinar";
import User from "../../../models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || "change_this";

// دالة للتحقق من التوكن
async function verifyToken(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    let token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      const cookie = request.headers.get("cookie") || "";
      const match = cookie.match(/(?:^|; )token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return null;
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.id || payload._id;

    await connectDB();
    const user = await User.findById(userId);
    return user;
  } catch (error) {
    return null;
  }
}

export async function POST(request) {
  try {
    await connectDB();

    // التحقق من المستخدم المسجل دخول
    const user = await verifyToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { webinarId, name, email, phone, questions } = body;

    if (!webinarId) {
      return NextResponse.json(
        { success: false, message: "Webinar ID is required" },
        { status: 400 }
      );
    }

    // التحقق من وجود الويبنار
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return NextResponse.json(
        { success: false, message: "Webinar not found" },
        { status: 404 }
      );
    }

    // التحقق إذا كان المستخدم مسجل بالفعل
    const existingRegistration = await WebinarRegistration.findOne({
      webinar: webinarId,
      $or: [{ user: user._id }, { email: email.toLowerCase() }],
    });

    if (existingRegistration) {
      return NextResponse.json(
        {
          success: false,
          message: "You are already registered for this webinar",
        },
        { status: 400 }
      );
    }

    // التحقق من السعة المتاحة
    if (webinar.currentAttendees >= webinar.maxAttendees) {
      return NextResponse.json(
        { success: false, message: "Webinar is full" },
        { status: 400 }
      );
    }

    // إنشاء التسجيل
    const registration = await WebinarRegistration.create({
      webinar: webinarId,
      user: user._id,
      name: name || user.name,
      email: email || user.email,
      phone: phone || "",

      questions: questions || "",
    });

    // تحديث عدد المسجلين في الويبنار
    await Webinar.findByIdAndUpdate(webinarId, {
      $inc: { currentAttendees: 1 },
    });

    return NextResponse.json({
      success: true,
      data: registration,
      message: "Successfully registered for the webinar",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/webinars/register error:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "You are already registered for this webinar",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Registration failed" },
      { status: 500 }
    );
  }
}
