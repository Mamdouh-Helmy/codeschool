// app/api/groups/[id]/remove-instructor/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    console.log(`🗑️ Removing instructor from group: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const { instructorId } = await req.json();

    if (!instructorId || !mongoose.Types.ObjectId.isValid(instructorId)) {
      return NextResponse.json(
        { success: false, error: "Invalid instructor ID" },
        { status: 400 }
      );
    }

    // Find group
    const group = await Group.findOne({ _id: id, isDeleted: false });

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // Check if instructor is in group
    if (!group.instructors.some(inst => inst.toString() === instructorId)) {
      return NextResponse.json(
        { success: false, error: "Instructor is not in this group" },
        { status: 400 }
      );
    }

    // Prevent removing last instructor if group is active
    if (group.status === "active" && group.instructors.length === 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot remove the last instructor from an active group",
        },
        { status: 400 }
      );
    }

    // Remove instructor from group
    await Group.findByIdAndUpdate(id, {
      $pull: { instructors: instructorId },
      $set: { updatedAt: new Date() },
    });

    console.log(`✅ Instructor removed from group: ${instructorId}`);

    return NextResponse.json({
      success: true,
      message: "Instructor removed successfully",
    });
  } catch (error) {
    console.error("❌ Error removing instructor:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to remove instructor",
      },
      { status: 500 }
    );
  }
}