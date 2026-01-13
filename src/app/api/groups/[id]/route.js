// app/api/groups/[id]/route.js - الإصدار المصحح

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../models/Group";
import Course from "../../../models/Course";  
import User from "../../../models/User";      
import Student from "../../../models/Student"; 
import Session from "../../../models/Session"; 
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// GET: Fetch single group by ID
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    console.log(`🔍 GET Group Request: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`❌ Invalid group ID format: ${id}`);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid group ID format",
          received: id,
          type: typeof id,
        },
        { status: 400 }
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate("courseId", "title level")
      .populate("instructors", "name email profile")
      .populate("students", "personalInfo.fullName enrollmentNumber")
      .lean();

    if (!group) {
      console.error(`❌ Group not found: ${id}`);
      return NextResponse.json(
        {
          success: false,
          error: "Group not found",
        },
        { status: 404 }
      );
    }

    console.log(`✅ Group found: ${group.name}`);
    console.log(`   ID: ${group._id}`);
    console.log(`   Instructors: ${group.instructors?.length || 0}`);

    // Format response
    const formattedGroup = {
      id: group._id,
      _id: group._id,
      name: group.name,
      code: group.code,
      status: group.status,
      course: {
        id: group.courseId?._id,
        title: group.courseId?.title,
        level: group.courseId?.level,
      },
      courseSnapshot: group.courseSnapshot,
      instructors: (group.instructors || []).map((inst) => ({
        id: inst._id,
        _id: inst._id,
        name: inst.name,
        email: inst.email,
        profile: inst.profile,
      })),
      students: (group.students || []).map((std) => ({
        id: std._id,
        _id: std._id,
        name: std.personalInfo?.fullName,
        enrollmentNumber: std.enrollmentNumber,
      })),
      studentsCount: group.currentStudentsCount,
      maxStudents: group.maxStudents,
      availableSeats: group.maxStudents - group.currentStudentsCount,
      isFull: group.currentStudentsCount >= group.maxStudents,
      schedule: group.schedule,
      pricing: group.pricing,
      automation: group.automation,
      sessionsGenerated: group.sessionsGenerated,
      totalSessions: group.totalSessionsCount,
      currentStudentsCount: group.currentStudentsCount,
      metadata: group.metadata,
    };

    return NextResponse.json({
      success: true,
      data: formattedGroup,
    });
  } catch (error) {
    console.error("❌ Error fetching group:", error);
    console.error("❌ Error details:", {
      name: error.name,
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack })
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch group",
        ...(process.env.NODE_ENV === "development" && { stack: error.stack })
      },
      { status: 500 }
    );
  }
}

// PUT: Update group
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    console.log(`✏️ Updating group: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const updateData = await req.json();
    console.log("📥 Update data:", JSON.stringify(updateData, null, 2));

    const existingGroup = await Group.findOne({ _id: id, isDeleted: false });

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // Prevent updating if sessions are generated and group is active
    if (existingGroup.sessionsGenerated && existingGroup.status === "active") {
      const restrictedFields = ["schedule", "courseId"];
      const hasRestrictedChanges = restrictedFields.some(
        (field) => updateData[field] !== undefined
      );

      if (hasRestrictedChanges) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Cannot modify schedule or course for active groups with generated sessions",
            suggestion: "Cancel and recreate the group, or regenerate sessions",
          },
          { status: 400 }
        );
      }
    }

    // Build update payload correctly
    const updatePayload = {
      ...updateData,
      metadata: {
        ...existingGroup.metadata.toObject(),
        updatedBy: adminUser.id,
        updatedAt: new Date(),
      },
    };

    const updatedGroup = await Group.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updatePayload },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("courseId", "title level")
      .populate("instructors", "name email")
      .populate("students", "personalInfo.fullName enrollmentNumber");

    if (!updatedGroup) {
      return NextResponse.json(
        { success: false, error: "Failed to update group" },
        { status: 500 }
      );
    }

    console.log(`✅ Group updated: ${updatedGroup.code}`);

    return NextResponse.json({
      success: true,
      message: "Group updated successfully",
      data: updatedGroup,
    });
  } catch (error) {
    console.error("❌ Error updating group:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {})
        .map((err) => err.message)
        .join("; ");

      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: messages,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update group",
      },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete group
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    console.log(`🗑️ Soft deleting group: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const existingGroup = await Group.findOne({ _id: id, isDeleted: false });

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // Soft delete the group
    const deletedGroup = await Group.findOneAndUpdate(
      { _id: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: "cancelled",
          "metadata.updatedBy": adminUser.id,
          "metadata.updatedAt": new Date(),
        },
      },
      { new: true }
    );

    // Also soft delete all related sessions
    await Session.updateMany(
      { groupId: id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: "cancelled",
        },
      }
    );

    console.log(`✅ Group deleted: ${deletedGroup.code}`);

    return NextResponse.json({
      success: true,
      message: "Group deleted successfully (soft delete)",
      data: {
        id: deletedGroup._id,
        code: deletedGroup.code,
        name: deletedGroup.name,
        deletedAt: deletedGroup.deletedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting group:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete group",
      },
      { status: 500 }
    );
  }
}