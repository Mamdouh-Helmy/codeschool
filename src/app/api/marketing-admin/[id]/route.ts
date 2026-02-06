// app/api/marketing/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../../models/User";
import bcrypt from "bcryptjs";

// GET - جلب موظف تسويق واحد
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // ✅ Next.js 15: await params before using
    const { id } = await params;

    const marketingUser = await User.findOne({
      _id: id,
      role: "marketing",
    }).select("_id name email username image profile isActive createdAt");

    if (!marketingUser) {
      return NextResponse.json(
        { success: false, message: "Marketing user not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: marketingUser,
    });
  } catch (error) {
    console.error("❌ Error fetching marketing user:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch marketing user",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - تحديث بيانات موظف التسويق
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // ✅ Next.js 15: await params before using
    const { id } = await params;

    const body = await request.json();
    const { name, phone, image, password, username } = body;

    // التحقق من وجود موظف التسويق
    const marketingUser = await User.findOne({
      _id: id,
      role: "marketing",
    });

    if (!marketingUser) {
      return NextResponse.json(
        { success: false, message: "Marketing user not found" },
        { status: 404 }
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
          { status: 400 }
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
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // تنفيذ التحديث
    const updatedMarketing = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("_id name email username image profile isActive");

    console.log("✅ Marketing user updated:", updatedMarketing._id);

    return NextResponse.json({
      success: true,
      message: "Marketing user updated successfully",
      data: updatedMarketing,
    });
  } catch (error) {
    console.error("❌ Error updating marketing user:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update marketing user",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف موظف التسويق
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // ✅ Next.js 15: await params before using
    const { id } = await params;

    const marketingUser = await User.findOneAndDelete({
      _id: id,
      role: "marketing",
    });

    if (!marketingUser) {
      return NextResponse.json(
        { success: false, message: "Marketing user not found" },
        { status: 404 }
      );
    }

    console.log("✅ Marketing user deleted:", marketingUser._id);

    return NextResponse.json({
      success: true,
      message: "Marketing user deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting marketing user:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete marketing user",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}