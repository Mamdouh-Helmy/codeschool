// app/api/groups/[id]/route.js - الإصدار النهائي مع الحذف الفعلي

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

    const group = await Group.findOne({ _id: id })
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

    const existingGroup = await Group.findById(id);

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // ✅ FIXED: بناء metadata بشكل صحيح
    const metadata = existingGroup.metadata || {};
    
    const updatePayload = {
      ...updateData,
      metadata: {
        ...metadata,
        updatedBy: adminUser.id,
        updatedAt: new Date(),
      },
      updatedAt: new Date(),
    };

    // ✅ إزالة metadata من updateData إذا كانت موجودة لتفادي التضارب
    if (updateData.metadata) {
      delete updatePayload.metadata; // نترك الـ metadata الذي بنيناه
    }

    console.log("🔄 Executing database update with payload:", updatePayload);

    const updatedGroup = await Group.findByIdAndUpdate(
      id,
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
    console.error("❌ Error details:", error.stack);

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

// DELETE: Hard delete group from database
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    console.log(`🔥 Hard deleting group from database: ${id}`);

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

    // تحقق إذا كان العنصر موجوداً
    const existingGroup = await Group.findById(id);
    
    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // ❗ HARD DELETE - حذف فعلي من الداتابيس
    const deletedGroup = await Group.findByIdAndDelete(id);

    // حذف الجلسات المرتبطة أيضاً
    await Session.deleteMany({ groupId: id });

    // إزالة المجموعة من الطلاب المرتبطين
    await Student.updateMany(
      { groups: id },
      { $pull: { groups: id } }
    );

    console.log(`✅ Group permanently deleted: ${deletedGroup?.code || id}`);
    console.log(`✅ Related sessions deleted`);
    
    return NextResponse.json({
      success: true,
      message: "Group permanently deleted from database",
      data: {
        id: deletedGroup?._id || id,
        name: deletedGroup?.name,
        code: deletedGroup?.code,
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