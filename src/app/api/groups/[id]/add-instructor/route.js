// app/api/groups/[id]/add-instructor/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import User from "../../../../models/User";
import { requireAdmin } from "@/utils/authMiddleware";
import { sendInstructorWelcomeMessages } from "../../../../services/groupAutomation";
import mongoose from "mongoose";

// body: { instructorId, instructorMessages?: { [instructorId]: { message, language } } }
//  - من غير instructorMessages → إضافة عادية بس (من غير إشعار)
//  - مع instructorMessages    → إضافة + إرسال إشعار للمدرس ده بس
//  - لو المدرس متضاف قبل كده ومعاه instructorMessages → بيتخطى الإضافة ويعيد الإرسال (retry)
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

    const { instructorId, instructorMessages = {} } = await req.json();

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

    const user = await User.findOne({ _id: instructorId, role: "instructor" })
      .select("_id name")
      .lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Instructor not found" },
        { status: 404 },
      );
    }

    const alreadyInGroup = group.instructors.some(
      (entry) => entry.userId?.toString() === instructorId,
    );
    const wantsNotify =
      instructorMessages && Object.keys(instructorMessages).length > 0;

    if (alreadyInGroup && !wantsNotify) {
      return NextResponse.json(
        { success: false, error: "Instructor is already in this group" },
        { status: 400 },
      );
    }

    if (!alreadyInGroup) {
      await Group.findByIdAndUpdate(id, {
        $push: {
          instructors: {
            userId: new mongoose.Types.ObjectId(instructorId),
            countTime: 0,
          },
        },
        $set: { updatedAt: new Date() },
      });
      console.log(`✅ Instructor ${instructorId} added to group ${id}`);
    }

    // ── Notification (اختياري) ─────────────────────────────────────────────
    let notification = null;
    if (wantsNotify) {
      try {
        // ⚠️ الـ 3rd param محتاج يتدعم في services/groupAutomation (شوف الشرح)
        notification = await sendInstructorWelcomeMessages(id, instructorMessages, {
          onlyInstructorIds: [instructorId],
        });
      } catch (e) {
        console.error("❌ Instructor notification failed:", e);
        notification = { success: false, error: e.message };
      }
    }

    return NextResponse.json({
      success: true,
      message: "Instructor added successfully",
      alreadyInGroup,
      notification,
    });
  } catch (error) {
    console.error("❌ Error adding instructor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add instructor" },
      { status: 500 },
    );
  }
}