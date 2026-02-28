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
    const { instructorId } = body;

    // ✅ DEBUG: شوف إيه اللي جاي من الفرونت
    console.log("🔍 REQUEST BODY:", JSON.stringify(body));
    console.log("🔍 instructorId received:", instructorId);
    console.log("🔍 instructorId type:", typeof instructorId);
    console.log("🔍 isValid ObjectId:", mongoose.Types.ObjectId.isValid(instructorId));

    if (!instructorId || !mongoose.Types.ObjectId.isValid(instructorId)) {
      return NextResponse.json(
        { success: false, error: `Invalid instructor ID: "${instructorId}"` },
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

    // ✅ DEBUG: شوف إيه اللي في الـ DB فعلاً
    console.log("🔍 group.instructors from DB:", JSON.stringify(group.instructors));
    console.log("🔍 instructors count:", group.instructors.length);

    group.instructors.forEach((entry, i) => {
      console.log(`  [${i}] userId: ${entry.userId?.toString()} | countTime: ${entry.countTime}`);
      console.log(`       match with instructorId? ${entry.userId?.toString() === instructorId}`);
    });

    const instructorExists = group.instructors.some(
      (entry) => entry.userId?.toString() === instructorId,
    );

    console.log("🔍 instructorExists:", instructorExists);

    if (!instructorExists) {
      return NextResponse.json(
        {
          success: false,
          error: "Instructor is not in this group",
          debug: {
            instructorIdReceived: instructorId,
            instructorsInGroup: group.instructors.map(e => e.userId?.toString()),
          }
        },
        { status: 400 },
      );
    }

    if (group.status === "active" && group.instructors.length === 1) {
      return NextResponse.json(
        { success: false, error: "Cannot remove the last instructor from an active group" },
        { status: 400 },
      );
    }

    await Group.findByIdAndUpdate(id, {
      $pull: { instructors: { userId: new mongoose.Types.ObjectId(instructorId) } },
      $set:  { updatedAt: new Date() },
    });

    // ✅ DEBUG: تأكد إن الحذف اتعمل
    const afterGroup = await Group.findById(id);
    console.log("🔍 instructors AFTER delete:", afterGroup.instructors.length);

    return NextResponse.json({ success: true, message: "Instructor removed successfully" });

  } catch (error) {
    console.error("❌ Error removing instructor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove instructor" },
      { status: 500 },
    );
  }
}