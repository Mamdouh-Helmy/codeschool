import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Testimonial from "../../models/Testimonial";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";
export const revalidate = 60;

// زيادة حجم الـ body limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // زيادة من القيمة الافتراضية
    },
  },
};

// دالة مساعدة لتحليل الـ response بشكل آمن
async function safeJsonResponse(response: Response) {
  try {
    const text = await response.text();
    if (!text) {
      return { success: false, message: "Empty response" };
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing JSON response:", error);
    return { success: false, message: "Invalid JSON response" };
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB (Testimonials API)");

    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured") === "true";
    const limit = parseInt(searchParams.get("limit") || "10");

    const query: any = { isActive: true };
    if (featured) query.featured = true;

    const testimonials = await Testimonial.find(query)
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit)
      .lean(); // استخدام lean() لأداء أفضل

    console.log("📦 Found testimonials:", testimonials.length);

    return NextResponse.json({
      success: true,
      data: testimonials,
      source: "database",
    });
  } catch (error) {
    console.error("❌ Error fetching testimonials:", error);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

// دالة مساعدة لتحسين معالجة الصور
function optimizeImageData(imageData: string): string {
  if (!imageData) return "";
  
  // إذا كانت صورة base64 كبيرة جداً، نقوم بضغطها
  if (imageData.startsWith('data:image') && imageData.length > 100000) {
    console.log("Large image detected, consider compressing before upload");
    // هنا يمكن إضافة منطق لضغط الصورة
    // للآن نرجعها كما هي لكن مع تحذير
    return imageData;
  }
  
  return imageData;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    
    // قراءة الـ body مرة واحدة فقط
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const userId = body.userId || body.studentId;
    let validUserId = null;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      validUserId = userId;
    }

    // تحسين معالجة الصور
    const optimizedStudentImage = optimizeImageData(body.studentImage || "");

    const testimonial = await Testimonial.create({
      userId: validUserId || decoded.id,
      studentName: body.studentName || decoded.name || "Anonymous",
      studentImage: optimizedStudentImage,
      courseId: body.courseId || "",
      courseTitle: body.courseTitle || "",
      rating: body.rating || 5,
      comment: body.comment,
      featured: body.featured || false,
      isActive: body.isActive ?? true,
    });

    return NextResponse.json({
      success: true,
      data: testimonial,
      message: "Testimonial created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error creating testimonial:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create testimonial" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const userId = body.userId || body.studentId;
    let validUserId = null;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      validUserId = userId;
    }

    if (!validUserId) {
      validUserId = decoded.id;
    }

    // تحسين معالجة الصور
    const optimizedStudentImage = optimizeImageData(body.studentImage || "");

    const updateData: any = {
      studentName: body.studentName,
      studentImage: optimizedStudentImage,
      userId: validUserId,
      courseId: body.courseId,
      courseTitle: body.courseTitle,
      rating: body.rating,
      comment: body.comment,
      featured: body.featured,
      isActive: body.isActive,
    };

    // إزالة الحقول الفارغة
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedTestimonial) {
      return NextResponse.json(
        { success: false, message: "Testimonial not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedTestimonial,
      message: "Testimonial updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error updating testimonial:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update testimonial" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }

    const deletedTestimonial = await Testimonial.findByIdAndDelete(id);

    if (!deletedTestimonial) {
      return NextResponse.json(
        { success: false, message: "Testimonial not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Testimonial deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete testimonial" },
      { status: 500 }
    );
  }
}