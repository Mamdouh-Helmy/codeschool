import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../models/User";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // ✅ جلب جميع المستخدمين من نوع "student"
    const students = await User.find({ role: "student" })
      .select("_id name email role")
      .sort({ name: 1 });

    console.log("✅ Students from DB:", students.length);

    return NextResponse.json({
      success: true,
      data: students,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    
    // التحقق من نوع error قبل الوصول إلى message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch students",
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}