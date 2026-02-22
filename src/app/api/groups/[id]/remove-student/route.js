// app/api/groups/[id]/remove-student/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Student from "../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    console.log(`🗑️ Removing student from group: ${id}`);

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

    const { studentId } = await req.json();

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid student ID" },
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

    // Check if student is in group
    if (!group.students.includes(studentId)) {
      return NextResponse.json(
        { success: false, error: "Student is not in this group" },
        { status: 400 }
      );
    }

    // Remove student from group
    await Group.findByIdAndUpdate(id, {
      $pull: { students: studentId },
      $inc: { currentStudentsCount: -1 },
      $set: { updatedAt: new Date() },
    });

    // Remove group from student's groupIds
    await Student.findByIdAndUpdate(studentId, {
      $pull: { "academicInfo.groupIds": id },
      $set: { "metadata.updatedAt": new Date() },
    });

    console.log(`✅ Student removed from group: ${studentId}`);

    return NextResponse.json({
      success: true,
      message: "Student removed successfully",
    });
  } catch (error) {
    console.error("❌ Error removing student:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove student" },
      { status: 500 }
    );
  }
}