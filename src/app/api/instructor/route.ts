import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../models/User";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // ✅ جلب جميع المستخدمين من نوع "student"
    const instructor = await User.find({ role: "instructor" })
      .select("_id name email role")
      .sort({ name: 1 });

    console.log("✅ instructor from DB:", instructor.length);

    return NextResponse.json({
      success: true,
      data: instructor,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error fetching instructor:", error);
    
    // التحقق من نوع error قبل الوصول إلى message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch instructor",
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
