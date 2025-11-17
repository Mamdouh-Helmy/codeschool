import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BlogSubscriber from "../../../models/BlogSubscriber";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Valid email is required" },
        { status: 400 }
      );
    }

    // التحقق إذا كان الإيميل مشترك مسبقاً
    const existingSubscriber = await BlogSubscriber.findOne({ email });
    if (existingSubscriber) {
      return NextResponse.json(
        { success: false, message: "Email already subscribed" },
        { status: 400 }
      );
    }

    // إنشاء مشترك جديد
    const newSubscriber = await BlogSubscriber.create({
      email,
      subscribedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to newsletter",
      data: newSubscriber,
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to subscribe" },
      { status: 500 }
    );
  }
}