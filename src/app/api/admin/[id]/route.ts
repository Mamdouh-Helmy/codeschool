// app/api/admin/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../../models/User";
import bcrypt from "bcryptjs";

// GET - جلب مسؤول واحد
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    // ✅ Next.js 15: await params before using
    const { id } = await params;

    const admin = await User.findOne({
      _id: id,
      role: "admin",
    }).select("_id name email username image profile isActive createdAt");

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("❌ Error fetching admin:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch admin",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PUT - تحديث بيانات المسؤول
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    // ✅ Next.js 15: await params before using
    const { id } = await params;

    const body = await request.json();
    const { name, phone, image, password, username } = body;

    // التحقق من وجود المسؤول
    const admin = await User.findOne({
      _id: id,
      role: "admin",
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 },
      );
    }

    // تحديث البيانات الأساسية
    const updateData: any = {};

    if (name) updateData.name = name.trim();
    if (username) {
      // التحقق من أن username فريد
      const existingUser = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: id },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "Username already exists" },
          { status: 400 },
        );
      }

      updateData.username = username.toLowerCase();
    }
    if (image) updateData.image = image;
    if (phone) updateData["profile.phone"] = phone;

    // تحديث كلمة المرور إذا تم إدخالها
    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password must be at least 6 characters" },
          { status: 400 },
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // تنفيذ التحديث
    const updatedAdmin = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).select("_id name email username image profile isActive");

    console.log("✅ Admin updated:", updatedAdmin._id);

    return NextResponse.json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    console.error("❌ Error updating admin:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update admin",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// DELETE - حذف المسؤول
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectDB();

    // ✅ Next.js 15: await params before using
    const { id } = await params;

    const admin = await User.findOneAndDelete({
      _id: id,
      role: "admin",
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 },
      );
    }

    console.log("✅ Admin deleted:", admin._id);

    return NextResponse.json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting admin:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete admin",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
