// app/api/groups/[id]/remove-instructor/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 },
      );
    }

    const body = await req.json();
    // ✅ forceRemove = true لما الأدمن يأكد إنه عايز يحذف آخر مدرب
    const { instructorId, forceRemove = false } = body;

    if (!instructorId || !mongoose.Types.ObjectId.isValid(instructorId)) {
      return NextResponse.json(
        { success: false, error: "Invalid instructor ID" },
        { status: 400 },
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    const instructorExists = group.instructors.some(
      (entry) => entry.userId?.toString() === instructorId,
    );

    if (!instructorExists) {
      return NextResponse.json(
        { success: false, error: "Instructor is not in this group" },
        { status: 400 },
      );
    }

    // ✅ لو آخر مدرب في مجموعة active → نرجع warning مش error
    // الفرونت يسأل تأكيد ثاني ويبعت forceRemove: true
    if (group.status === "active" && group.instructors.length === 1 && !forceRemove) {
      return NextResponse.json(
        {
          success: false,
          requiresConfirmation: true,   // ← الفرونت بيشوف الفلاج ده
          error: "This is the last instructor in an active group. Are you sure you want to remove them?",
        },
        { status: 200 },  // ← 200 مش 400 عشان مش error حقيقي
      );
    }

    await Group.findByIdAndUpdate(id, {
      $pull: { instructors: { userId: new mongoose.Types.ObjectId(instructorId) } },
      $set:  { updatedAt: new Date() },
    });

    console.log(`✅ Instructor ${instructorId} removed from group ${id}`);

    return NextResponse.json({
      success: true,
      message: "Instructor removed successfully",
    });

  } catch (error) {
    console.error("❌ Error removing instructor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove instructor" },
      { status: 500 },
    );
  }
}