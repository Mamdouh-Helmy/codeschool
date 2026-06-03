// app/api/marketing/[id]/route.ts
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

    const marketingUser = await User.findOne({ _id: id, role: "marketing" })
      .select("_id name email username image profile isActive createdAt");

    if (!marketingUser) {
      return NextResponse.json(
        { success: false, message: "Marketing user not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: marketingUser });
  } catch (error) {
    console.error("❌ Error fetching marketing user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch marketing user", error: error instanceof Error ? error.message : "Unknown error" },
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
    const { name, phone, image, password, username } = body;

    const marketingUser = await User.findOne({ _id: id, role: "marketing" });
    if (!marketingUser) {
      return NextResponse.json(
        { success: false, message: "Marketing user not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (name && name.trim()) updateData.name  = name.trim();
    if (image !== undefined) updateData.image = image && image.trim() ? image.trim() : "/images/default-avatar.jpg";
    if (phone !== undefined) updateData["profile.phone"] = phone && phone.trim() ? phone.trim() : "";

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
      updateData.username = username.toLowerCase().trim();
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedMarketing = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("_id name email username image profile isActive");

    return NextResponse.json({
      success: true,
      message: "Marketing user updated successfully",
      data: updatedMarketing,
    });
  } catch (error) {
    console.error("❌ Error updating marketing user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update marketing user", error: error instanceof Error ? error.message : "Unknown error" },
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

    const marketingUser = await User.findOneAndDelete({ _id: id, role: "marketing" });
    if (!marketingUser) {
      return NextResponse.json(
        { success: false, message: "Marketing user not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Marketing user deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting marketing user:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete marketing user", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}