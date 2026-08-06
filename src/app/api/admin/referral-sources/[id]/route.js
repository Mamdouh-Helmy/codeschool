// app/api/admin/referral-sources/[id]/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import ReferralSource from "../../../../models/ReferralSource";
import { connectDB } from "@/lib/mongodb";
// ⚠️ نفس ملاحظة الحماية اللي فوق
// import { requireAdmin } from "@/lib/auth";

export async function PATCH(req, context) {
  try {
    await connectDB();
    // await requireAdmin(req);

    const { params } = context;
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const updates = {};
    if (body.label !== undefined) updates.label = body.label.trim();
    if (body.value !== undefined) updates.value = body.value.trim().toLowerCase();
    if (body.order !== undefined) updates.order = body.order;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const source = await ReferralSource.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!source) {
      return NextResponse.json(
        { success: false, message: "Referral source not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, source });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "This value already exists" },
        { status: 409 }
      );
    }
    console.error("❌ Update referral source error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  try {
    await connectDB();
    // await requireAdmin(req);

    const { params } = context;
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid ID" },
        { status: 400 }
      );
    }

    const source = await ReferralSource.findByIdAndDelete(id);
    if (!source) {
      return NextResponse.json(
        { success: false, message: "Referral source not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("❌ Delete referral source error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}