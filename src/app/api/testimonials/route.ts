import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Testimonial from "../../models/Testimonial";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET =
  process.env.JWT_SIGN_SECRET || process.env.NEXTAUTH_SECRET || "change_this";
export const revalidate = 60;

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
      .limit(limit);

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
    const body = await request.json();

    const userId = body.userId || body.studentId;
    let validUserId = null;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      validUserId = userId;
    }

    const testimonial = await Testimonial.create({
      userId: validUserId || decoded.id,
      studentName: body.studentName || decoded.name || "Anonymous",
      studentImage: body.studentImage || decoded.image || "",
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

    const body = await request.json();

    const userId = body.userId || body.studentId;
    let validUserId = null;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      validUserId = userId;
    }

    if (!validUserId) {
      validUserId = decoded.id;
    }

    const updateData: any = {
      studentName: body.studentName,
      studentImage: body.studentImage,
      userId: validUserId,
      courseId: body.courseId,
      courseTitle: body.courseTitle,
      rating: body.rating,
      comment: body.comment,
      featured: body.featured,
      isActive: body.isActive,
    };

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
