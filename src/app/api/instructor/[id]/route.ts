// app/api/instructor/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../../models/User";
import bcrypt from "bcryptjs";

// GET - جلب مدرس واحد
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const instructor = await User.findOne({
      _id: id,
      role: "instructor",
    }).select(
      "_id name email username image gender profile isActive createdAt"
    );

    if (!instructor) {
      return NextResponse.json(
        { success: false, message: "Instructor not found" },
        { status: 404 }
      );
    }

    console.log("✅ Instructor fetched:", instructor);

    return NextResponse.json({
      success: true,
      data: instructor,
    });
  } catch (error) {
    console.error("❌ Error fetching instructor:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch instructor",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT - تحديث بيانات المدرس
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const body = await request.json();
    const { name, phone, image, password, username, gender } = body;

    console.log("📝 Update data received:", {
      id,
      name: name || "no change",
      phone: phone !== undefined ? phone : "no change",
      image: image !== undefined ? image : "no change",
      gender: gender !== undefined ? gender : "no change",
      username: username || "no change",
      password: password ? "***" : "no change",
    });

    // التحقق من وجود المدرس
    const instructor = await User.findOne({
      _id: id,
      role: "instructor",
    });

    if (!instructor) {
      return NextResponse.json(
        { success: false, message: "Instructor not found" },
        { status: 404 }
      );
    }

    // تحديث البيانات الأساسية
    const updateData: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (username && username.trim()) {
      // التحقق من أن username فريد
      const existingUser = await User.findOne({
        username: username.toLowerCase().trim(),
        _id: { $ne: id },
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: "Username already exists" },
          { status: 400 }
        );
      }

      updateData.username = username.toLowerCase().trim();
    }

    // تحديث الصورة
    if (image !== undefined) {
      updateData.image =
        image && image.trim() ? image.trim() : "/images/default-avatar.jpg";
    }

    // تحديث رقم الهاتف
    if (phone !== undefined) {
      updateData["profile.phone"] = phone && phone.trim() ? phone.trim() : "";
    }

    // تحديث النوع
    if (gender !== undefined) {
      if (gender === null || gender === "") {
        updateData.gender = undefined;
      } else if (gender === "male" || gender === "female") {
        updateData.gender = gender;
      }
    }

    // تحديث كلمة المرور إذا تم إدخالها
    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          {
            success: false,
            message: "Password must be at least 6 characters",
          },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    console.log("📦 Update data to apply:", updateData);

    // تنفيذ التحديث
    const updatedInstructor = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("_id name email username image gender profile isActive");

    console.log("✅ Instructor updated successfully:", updatedInstructor);
    console.log("📋 Updated data verification:", {
      gender: updatedInstructor.gender,
      image: updatedInstructor.image,
      phone: updatedInstructor.profile?.phone,
    });

    return NextResponse.json({
      success: true,
      message: "Instructor updated successfully",
      data: updatedInstructor,
    });
  } catch (error) {
    console.error("❌ Error updating instructor:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update instructor",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف المدرس
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const instructor = await User.findOneAndDelete({
      _id: id,
      role: "instructor",
    });

    if (!instructor) {
      return NextResponse.json(
        { success: false, message: "Instructor not found" },
        { status: 404 }
      );
    }

    console.log("✅ Instructor deleted:", instructor._id);

    return NextResponse.json({
      success: true,
      message: "Instructor deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting instructor:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete instructor",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}