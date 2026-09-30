// app/api/groups/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../models/Group";
import User from "../../../models/User";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Tag from "../../../models/Tag";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ✅ الجروب إما أطفال أو بالغين (مفيش mixed)
const VALID_GROUP_TYPES = ["kids", "adults"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getInstructorsData(instructorsArray) {
  if (!instructorsArray || instructorsArray.length === 0) return [];
  try {
    const instructorIds = instructorsArray
      .map((i) => i?.userId || i)
      .filter(Boolean);
    if (instructorIds.length === 0) return [];
    const users = await User.find({
      _id: { $in: instructorIds },
    }).select("name email gender language profile");
    return users.map((user) => {
      const obj = user.toObject({ getters: true });
      const gender = obj.gender ? String(obj.gender).toLowerCase().trim() : null;
      const phone = obj.profile?.phone ? String(obj.profile.phone).trim() || null : null;
      const language = obj.language || "ar";
      const entry = instructorsArray.find(
        (i) => (i?.userId?.toString() || i?.toString()) === obj._id.toString(),
      );
      const countTime = entry?.countTime || 0;
      return {
        _id: obj._id,
        name: obj.name,
        email: obj.email,
        gender,
        language,
        phone,
        countTime,
      };
    });
  } catch (error) {
    console.error("❌ Error fetching instructors:", error);
    return [];
  }
}

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
    return firstSession?.meetingLink || null;
  } catch (error) {
    console.error("❌ Error fetching first session meeting link:", error);
    return null;
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────
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
      .populate("tags")
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
      // ✅ null للجروبات القديمة اللي لسه ملهاش نوع (الأدمن يحدده من الفورم)
      groupType: VALID_GROUP_TYPES.includes(group.groupType)
        ? group.groupType
        : null,
      instructors: instructorsData,
      firstMeetingLink: firstMeetingLink || null,
    };

    console.log(`✅ Group fetched: ${group.name}`);
    return NextResponse.json({ success: true, data: groupObj });
  } catch (error) {
    console.error("❌ Error fetching group:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
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

    // ✅ Normalize instructors structure
    if (updateData.instructors) {
      updateData.instructors = updateData.instructors.map((i) => ({
        userId: i?.userId || i,
        countTime: i?.countTime || 0,
      }));
    }

    // ✅ نوع الجروب: لو اتبعت لازم يكون kids أو adults، وإلا 400
    if (
      updateData.groupType !== undefined &&
      !VALID_GROUP_TYPES.includes(updateData.groupType)
    ) {
      return NextResponse.json(
        { success: false, error: "نوع الجروب لازم يكون أطفال أو بالغين" },
        { status: 400 },
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

    if (!updatePayload.tags) updatePayload.tags = [];

    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    )
      .populate("courseId", "title level")
      .populate("instructors.userId", "name email gender language profile")
      .populate("students", "personalInfo.fullName enrollmentNumber")
      .populate("tags")
      .lean();

    if (!updatedGroup) {
      return NextResponse.json(
        { success: false, error: "Failed to update group" },
        { status: 500 },
      );
    }

    // ═════════════════════════════════════════════════════════════════════
    // ✅ FIX: مزامنة deliveryMode مع كل السيشنات اللي لسه مش Completed.
    //    السبب: لما الأدمن يعدّل نوع الجروب من Online → Offline (أو العكس)،
    //    الجروب بيتحدّث صح لكن السيشنات القديمة بتفضل بالـ mode القديم،
    //    فالكرون بعد كده يصنّفها غلط ويبعت نوع قوالب مختلف عن الجروب.
    // ═════════════════════════════════════════════════════════════════════
    const deliveryModeChanged =
      updateData.deliveryMode !== undefined &&
      ["online", "offline"].includes(updateData.deliveryMode) &&
      updateData.deliveryMode !== (existingGroup.deliveryMode || "online");

    let sessionsSynced = 0;
    if (deliveryModeChanged) {
      const syncResult = await Session.updateMany(
        {
          groupId: id,
          isDeleted: false,
          status: { $ne: "completed" },
        },
        {
          $set: {
            deliveryMode: updateData.deliveryMode,
          },
        },
      );
      sessionsSynced = syncResult.modifiedCount || 0;
      console.log(
        `🔄 [Sync] Synced deliveryMode="${updateData.deliveryMode}" to ${sessionsSynced} sessions`,
      );
    }

    const responseData = {
      ...updatedGroup,
      groupType: VALID_GROUP_TYPES.includes(updatedGroup.groupType)
        ? updatedGroup.groupType
        : null,
      instructors: (updatedGroup.instructors || []).map((i) => ({
        _id: i.userId?._id || i.userId,
        name: i.userId?.name || "",
        email: i.userId?.email || "",
        gender: i.userId?.gender || null,
        language: i.userId?.language || "ar",
        countTime: i.countTime || 0,
      })),
    };

    console.log(`✅ Group updated: ${updatedGroup.code}`);
    return NextResponse.json({
      success: true,
      message: "Group updated successfully",
      deliveryModeSynced: deliveryModeChanged,
      sessionsSynced,
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

// ─── DELETE ──────────────────────────────────────────────────────────────────
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

    const MeetingLink = (await import("../../../models/MeetingLink")).default;
    const linkedSessions = await Session.find({
      groupId: id,
      isDeleted: false,
      meetingLinkId: { $ne: null },
    })
      .select("meetingLinkId")
      .lean();

    const linkIdsUsed = [
      ...new Set(linkedSessions.map((s) => s.meetingLinkId.toString())),
    ];
    for (const linkId of linkIdsUsed) {
      try {
        const link = await MeetingLink.findById(linkId);
        if (link) await link.releaseReservation(id);
      } catch (e) {
        console.warn(
          `⚠️ Could not release link ${linkId} before group delete:`,
          e.message,
        );
      }
    }

    const deletedGroup = await Group.findByIdAndDelete(id);
    await Session.deleteMany({ groupId: id });
    await Student.updateMany(
      { "academicInfo.groupIds": new mongoose.Types.ObjectId(id) },
      { $pull: { "academicInfo.groupIds": new mongoose.Types.ObjectId(id) } },
    );

    console.log(
      `✅ Group permanently deleted: ${deletedGroup?.code || id} (released ${linkIdsUsed.length} link reservation(s))`,
    );
    return NextResponse.json({
      success: true,
      message: "Group permanently deleted from database",
      data: {
        id: deletedGroup?._id || id,
        name: deletedGroup?.name,
        code: deletedGroup?.code,
        linksReleased: linkIdsUsed.length,
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