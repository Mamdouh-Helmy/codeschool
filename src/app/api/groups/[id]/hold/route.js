// app/api/groups/[id]/hold/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

// ─── GET: حالة الـ Hold + السيشنات المتاحة للاختيار ──────────────────────
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID" },
        { status: 400 },
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false })
      .select("name code status hold holdHistory")
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    // ✅ السيشنات المجدولة (scheduled/postponed) المتاحة للاختيار
    const upcomingSessions = await Session.find({
      groupId: id,
      isDeleted: false,
      status: { $in: ["scheduled", "postponed"] },
    })
      .sort({ scheduledDate: 1, sessionNumber: 1 })
      .select(
        "_id title scheduledDate startTime endTime moduleIndex sessionNumber status",
      )
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        name: group.name,
        code: group.code,
        status: group.status,
        hold: group.hold || null,
        holdHistory: group.holdHistory || [],
        upcomingSessions: upcomingSessions.map((s) => ({
          _id: s._id,
          title: s.title,
          scheduledDate: s.scheduledDate,
          startTime: s.startTime,
          endTime: s.endTime,
          moduleIndex: s.moduleIndex,
          sessionNumber: s.sessionNumber,
          status: s.status,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error in GET /hold:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ─── POST: تفعيل Hold ──────────────────────────────────────────────────────
export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID" },
        { status: 400 },
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 },
      );
    }

    const {
      holdType = "duration",
      holdDays = 7,
      holdSessionsCount = 1,
      holdUntilSessionId = null, // ✅ جديد
      reason = "",
      shiftSessions = true,
    } = body;

    // ✅ validation صريح قبل ما ندخل على الموديل
    if (!["duration", "sessions", "until_session", "indefinite"].includes(holdType)) {
      return NextResponse.json(
        { success: false, error: "holdType غير صالح" },
        { status: 400 },
      );
    }

    if (holdType === "until_session" && !holdUntilSessionId) {
      return NextResponse.json(
        { success: false, error: "لازم تحدد السيشن المستهدفة" },
        { status: 400 },
      );
    }

    if (holdType === "duration" && (!holdDays || holdDays <= 0)) {
      return NextResponse.json(
        { success: false, error: "لازم تحدد عدد أيام صحيحة" },
        { status: 400 },
      );
    }

    if (holdType === "sessions" && (!holdSessionsCount || holdSessionsCount <= 0)) {
      return NextResponse.json(
        { success: false, error: "لازم تحدد عدد سيشنات صحيح" },
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

    const result = await group.holdGroup({
      holdType,
      holdDays,
      holdSessionsCount,
      holdUntilSessionId,
      reason,
      userId: authCheck.user.id,
      shiftSessions,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم تفعيل الـ Hold على الجروب",
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Error in POST /hold:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ─── DELETE: فكّ الـ Hold ──────────────────────────────────────────────────
export async function DELETE(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID" },
        { status: 400 },
      );
    }

    const url = new URL(req.url);
    const reason = url.searchParams.get("reason") || "";

    const group = await Group.findOne({ _id: id, isDeleted: false });
    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    const result = await group.releaseGroup({
      userId: authCheck.user.id,
      reason,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم فكّ الـ Hold",
      data: result.data,
    });
  } catch (error) {
    console.error("❌ Error in DELETE /hold:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}