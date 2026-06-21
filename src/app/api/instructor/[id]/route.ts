// app/api/instructor/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../../models/User";
import bcrypt from "bcryptjs";

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const instructor = await User.findOne({ _id: id, role: "instructor" })
      .select("_id name email username image gender language profile isActive createdAt");

    if (!instructor) {
      return NextResponse.json(
        { success: false, message: "Instructor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: instructor });
  } catch (error) {
    console.error("❌ Error fetching instructor:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch instructor", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const { name, phone, image, password, username, gender, language } = body;

    const instructor = await User.findOne({ _id: id, role: "instructor" });
    if (!instructor) {
      return NextResponse.json(
        { success: false, message: "Instructor not found" },
        { status: 404 }
      );
    }

    // ── تحديث الـ fields مباشرة على الـ document ──────────────────────────
    if (name && name.trim())    instructor.name     = name.trim();
    if (language !== undefined) instructor.language = language === "en" ? "en" : "ar";
    if (image !== undefined)    instructor.image    = image?.trim() || "/images/default-avatar.jpg";

    // phone جوا profile
    if (phone !== undefined) {
      instructor.profile        = instructor.profile || {};
      instructor.profile.phone  = phone?.trim() || "";
    }

    // gender
    if (gender === "" || gender === null) {
      instructor.gender = undefined;
    } else if (gender === "male" || gender === "female") {
      instructor.gender = gender;
    }

    // username
    if (username && username.trim()) {
      const existing = await User.findOne({
        username: username.toLowerCase().trim(),
        _id: { $ne: id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, message: "Username already exists" },
          { status: 400 }
        );
      }
      instructor.username = username.toLowerCase().trim();
    }

    // password
    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      instructor.password = await bcrypt.hash(password, 10);
    }

    // ── حفظ مباشر بدون runValidators عشان الـ nested fields ──────────────
    instructor.markModified("profile");
    await instructor.save({ validateBeforeSave: false });

    // ── جيب البيانات المحدثة ──────────────────────────────────────────────
    const updatedInstructor = await User.findById(id)
      .select("_id name email username image gender language profile isActive");

    return NextResponse.json({
      success: true,
      message: "Instructor updated successfully",
      data: updatedInstructor,
    });
  } catch (error) {
    console.error("❌ Error updating instructor:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update instructor", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const instructor = await User.findOneAndDelete({ _id: id, role: "instructor" });
    if (!instructor) {
      return NextResponse.json(
        { success: false, message: "Instructor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Instructor deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting instructor:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete instructor", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}