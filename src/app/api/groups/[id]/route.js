// app/api/groups/[id]/route.js
// ✅ متوافق مع هيكل instructors الجديد: [{userId: ObjectId, countTime: Number}]

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../models/Group";
import User from "../../../models/User";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ============================================================
// ✅ HELPER: جلب بيانات المدرسين صح مع gender وphone و language
// ============================================================
async function getInstructorsData(instructorsArray) {
  if (!instructorsArray || instructorsArray.length === 0) return [];

  try {
    const instructorIds = instructorsArray
      .map((i) => i?.userId || i)
      .filter(Boolean);

    if (instructorIds.length === 0) return [];

    // ✅ FIX: أضفنا language للـ select
    const users = await User.find({
      _id: { $in: instructorIds },
    }).select("name email gender language profile");

    return users.map((user) => {
      const obj = user.toObject({ getters: true });

      const gender = obj.gender
        ? String(obj.gender).toLowerCase().trim()
        : null;

      const phone = obj.profile?.phone
        ? String(obj.profile.phone).trim() || null
        : null;

      // ✅ FIX: استخرج language (default: "ar")
      const language = obj.language || "ar";

      const entry = instructorsArray.find(
        (i) =>
          (i?.userId?.toString() || i?.toString()) === obj._id.toString(),
      );
      const countTime = entry?.countTime || 0;

      return {
        _id: obj._id,
        name: obj.name,
        email: obj.email,
        gender,
        language,   // ✅ FIX: مضافة
        phone,
        countTime,
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

    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate("courseId", "title level curriculum")
      .populate("students", "personalInfo.fullName enrollmentNumber")
      .populate("createdBy", "name email")
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    const instructorsArray = group.instructors || [];
    console.log(`📋 Fetching ${instructorsArray.length} instructors separately...`);
    const instructorsData = await getInstructorsData(instructorsArray);

    console.log(`🔗 Fetching first session meeting link...`);
    const firstMeetingLink = await getFirstSessionMeetingLink(id);

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
        gender: inst.gender || "NOT SET",
        language: inst.language,       // ✅ FIX: في الـ log
        phone: inst.phone || "NOT SET",
        countTime: inst.countTime,
      });
    });

    return NextResponse.json({ success: true, data: groupObj });
  } catch (error) {
    console.error("❌ Error fetching group:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
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
        { status: 400 },
      );
    }

    const updateData = await req.json();
    const existingGroup = await Group.findById(id);

    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    if (updateData.instructors) {
      updateData.instructors = updateData.instructors.map((i) => ({
        userId: i?.userId || i,
        countTime: i?.countTime || 0,
      }));
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
      { new: true, runValidators: true },
    )
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email gender language profile") // ✅ FIX: language
      .populate("students", "personalInfo.fullName enrollmentNumber")
      .lean();

    if (!updatedGroup) {
      return NextResponse.json(
        { success: false, error: "Failed to update group" },
        { status: 500 },
      );
    }

    const responseData = {
      ...updatedGroup,
      instructors: (updatedGroup.instructors || []).map((i) => ({
        _id: i.userId?._id || i.userId,
        name: i.userId?.name || "",
        email: i.userId?.email || "",
        gender: i.userId?.gender || null,
        language: i.userId?.language || "ar",  // ✅ FIX: language في الـ PUT response
        countTime: i.countTime || 0,
      })),
    };

    console.log(`✅ Group updated: ${updatedGroup.code}`);
    return NextResponse.json({
      success: true,
      message: "Group updated successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Error updating group:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {})
        .map((err) => err.message)
        .join("; ");
      return NextResponse.json(
        { success: false, error: "Validation failed", details: messages },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update group" },
      { status: 500 },
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
        { status: 400 },
      );
    }

    const existingGroup = await Group.findById(id);
    if (!existingGroup) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    const deletedGroup = await Group.findByIdAndDelete(id);
    await Session.deleteMany({ groupId: id });
    await Student.updateMany(
  { "academicInfo.groupIds": new mongoose.Types.ObjectId(id) },
  { $pull: { "academicInfo.groupIds": new mongoose.Types.ObjectId(id) } }
);

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
      { status: 500 },
    );
  }
}