// app/api/groups/[id]/route.js - FIXED VERSION
// ✅ الإصلاحات:
// 1. جلب الـ instructors بـ User.find() منفصل مع toObject({ getters: true })
// 2. إضافة firstMeetingLink من أول session
// 3. إصلاح الـ duplicate index warnings في User.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../models/Group";
import User from "../../../models/User";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ============================================================
// ✅ HELPER: جلب بيانات المدرسين صح مع gender وphone
// ============================================================
async function getInstructorsData(instructorIds) {
  if (!instructorIds || instructorIds.length === 0) return [];

  try {
    // ✅ استخدام User.find() بدون lean() عشان الـ getters تشتغل
    const instructors = await User.find({
      _id: { $in: instructorIds },
    }).select("name email gender profile");

    // ✅ استخدام toObject({ getters: true }) لضمان تطبيق الـ getters
    return instructors.map((inst) => {
      const obj = inst.toObject({ getters: true });
      
      const gender = obj.gender 
        ? String(obj.gender).toLowerCase().trim()
        : null;
        
      const phone = obj.profile?.phone
        ? String(obj.profile.phone).trim() || null
        : null;

      console.log(`   ✅ Instructor loaded: ${obj.name}`);
      console.log(`      gender raw: "${obj.gender}" → normalized: "${gender}"`);
      console.log(`      phone raw: "${obj.profile?.phone}" → normalized: "${phone}"`);

      return {
        _id: obj._id,
        name: obj.name,
        email: obj.email,
        gender: gender,
        phone: phone,
      };
    });
  } catch (error) {
    console.error("❌ Error fetching instructors:", error);
    return [];
  }
}

// ============================================================
// ✅ HELPER: جلب رابط أول session
// ============================================================
async function getFirstSessionMeetingLink(groupId) {
  try {
    const firstSession = await Session.findOne({
      groupId: groupId,
      isDeleted: false,
      status: { $in: ["scheduled", "completed"] },
      meetingLink: { $exists: true, $ne: null, $ne: "" },
    })
      .sort({ scheduledDate: 1 })
      .select("meetingLink scheduledDate title")
      .lean();

    const link = firstSession?.meetingLink || null;
    console.log(`   🔗 First meeting link: ${link || "NOT FOUND"}`);
    return link;
  } catch (error) {
    console.error("❌ Error fetching first session meeting link:", error);
    return null;
  }
}

// ============================================================
// GET: Fetch single group by ID
// ============================================================
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    console.log(`\n📥 Fetching group: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    // ✅ Step 1: جلب المجموعة بدون populate للـ instructors
    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate("courseId", "title level curriculum")
      .populate("students", "personalInfo.fullName enrollmentNumber")
      .populate("createdBy", "name email")
      .lean(); // ✅ lean() كويس هنا للباقي

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    // ✅ Step 2: جلب الـ instructors منفصل مع الـ getters
    const instructorIds = group.instructors || [];
    console.log(`📋 Fetching ${instructorIds.length} instructors separately...`);
    const instructorsData = await getInstructorsData(instructorIds);

    // ✅ Step 3: جلب رابط أول session
    console.log(`🔗 Fetching first session meeting link...`);
    const firstMeetingLink = await getFirstSessionMeetingLink(id);

    // ✅ Step 4: تجميع البيانات
    const groupObj = {
      ...group,
      instructors: instructorsData,
      firstMeetingLink: firstMeetingLink || null,
    };

    console.log(`✅ Group fetched: ${group.name}`);
    console.log(`📋 Instructors: ${instructorsData.length}`);
    instructorsData.forEach((inst, i) => {
      console.log(`   Instructor ${i + 1}:`, {
        name: inst.name,
        email: inst.email,
        gender: inst.gender || "NOT SET IN DB",
        phone: inst.phone || "NOT SET IN DB",
      });
    });
    console.log(`🔗 First Meeting Link: ${firstMeetingLink || "NONE"}`);

    return NextResponse.json({
      success: true,
      data: groupObj,
    });
  } catch (error) {
    console.error("❌ Error fetching group:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT: Update group
// ============================================================
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    console.log(`✏️ Updating group: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const updateData = await req.json();
    const existingGroup = await Group.findById(id);

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

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

    if (updateData.metadata) delete updatePayload.metadata;

    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .populate("courseId", "title level")
      .populate("instructors", "name email gender profile")
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
        { success: false, error: "Validation failed", details: messages },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update group" },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE: Hard delete group
// ============================================================
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    console.log(`🔥 Hard deleting group: ${id}`);

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const existingGroup = await Group.findById(id);
    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      );
    }

    const deletedGroup = await Group.findByIdAndDelete(id);
    await Session.deleteMany({ groupId: id });
    await Student.updateMany({ groups: id }, { $pull: { groups: id } });

    console.log(`✅ Group permanently deleted: ${deletedGroup?.code || id}`);

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
      { success: false, error: error.message || "Failed to delete group" },
      { status: 500 }
    );
  }
}