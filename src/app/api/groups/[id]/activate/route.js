// app/api/groups/[id]/activate/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET  → فحص اللينكات وإرجاع معاينة توزيعها على الجلسات (قبل التفعيل)
// POST → تفعيل المجموعة فعلياً
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import MeetingLink from "../../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";
import {
  onGroupActivated,
  sendInstructorWelcomeMessages,
} from "../../../../services/groupAutomation";
import mongoose from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build simulated session list (title + date) from group config
// WITHOUT writing to DB — purely for preview
// ─────────────────────────────────────────────────────────────────────────────
function previewSessions(group) {
  const course = group.courseId;
  if (!course?.curriculum?.length) return [];

  const moduleSelection = group.moduleSelection || { mode: "all", selectedModules: [] };
  const { startDate, daysOfWeek, timeFrom, timeTo } = group.schedule;

  const dayMap = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6,
  };

  // Which modules to include?
  let modulesToUse = [];
  if (moduleSelection.mode === "all") {
    modulesToUse = course.curriculum.map((m, i) => ({ module: m, origIdx: i }));
  } else {
    modulesToUse = moduleSelection.selectedModules
      .map((i) => ({ module: course.curriculum[i], origIdx: i }))
      .filter((x) => x.module);
  }

  // Build sorted day numbers
  const dayNums = daysOfWeek.map((d) => dayMap[d]).sort((a, b) => a - b);
  const daysPerWeek = dayNums.length;

  // Adjust start to first selected day
  const base = new Date(startDate);
  const firstDay = dayNums[0];
  let diff = firstDay - base.getDay();
  if (diff < 0) diff += 7;
  base.setDate(base.getDate() + diff);

  // Total sessions needed
  let total = modulesToUse.reduce(
    (s, { module: m }) => s + (m.totalSessions || 3),
    0,
  );

  // Generate dates
  const dates = [];
  for (let i = 0; i < total; i++) {
    const dayInCycle = i % daysPerWeek;
    const week = Math.floor(i / daysPerWeek);
    const d = new Date(base);
    d.setDate(base.getDate() + week * 7);
    if (dayInCycle > 0) {
      const delta = dayNums[dayInCycle] - dayNums[0];
      d.setDate(d.getDate() + delta);
    }
    dates.push(d);
  }

  // Build session objects
  const sessions = [];
  let dateIdx = 0;
  for (const { module: m, origIdx } of modulesToUse) {
    const groups = [
      { sessionNumber: 1, lessonIndexes: [0, 1] },
      { sessionNumber: 2, lessonIndexes: [2, 3] },
      { sessionNumber: 3, lessonIndexes: [4, 5] },
    ];
    for (const g of groups) {
      const l1 = m.lessons?.[g.lessonIndexes[0]];
      const l2 = m.lessons?.[g.lessonIndexes[1]];
      if (!l1 || !l2) continue;
      sessions.push({
        title: `${m.title} - جلسة ${g.sessionNumber}: ${l1.title} & ${l2.title}`,
        scheduledDate: dates[dateIdx] ?? null,
        startTime: timeFrom,
        endTime: timeTo,
        moduleIndex: origIdx,
        sessionNumber: g.sessionNumber,
      });
      dateIdx++;
    }
  }
  return sessions;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Preview link distribution BEFORE activation
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID" },
        { status: 400 },
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false }).populate(
      "courseId",
      "title curriculum",
    );

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    // All non-deleted links
    const allLinks = await MeetingLink.find({
      isDeleted: false,
      status: { $in: ["available", "reserved", "in_use"] },
    }).lean();

    const now = new Date();

    // Truly available (no active reservation)
    const availableLinks = allLinks.filter(
      (l) =>
        l.status === "available" ||
        !l.currentReservation?.sessionId ||
        new Date(l.currentReservation?.endTime) < now,
    );

    // Reserved (active reservation)
    const reservedLinks = allLinks.filter(
      (l) =>
        l.currentReservation?.sessionId &&
        new Date(l.currentReservation?.endTime) >= now,
    );

    // Build preview sessions
    const sessions = previewSessions(group);
    const totalSessions = sessions.length;

    const sessionPreviews = sessions.map((s, i) => ({
      session: s,
      assignedLink: i < availableLinks.length ? availableLinks[i] : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalSessions,
        totalLinks:          allLinks.length,
        availableLinksCount: availableLinks.length,
        reservedLinksCount:  reservedLinks.length,
        hasNoLinks:          allLinks.length === 0,
        hasAvailableLinks:   availableLinks.length > 0,
        sessionsWithLinks:   Math.min(totalSessions, availableLinks.length),
        sessionsWithout:     Math.max(0, totalSessions - availableLinks.length),
        sessions:            sessionPreviews,
        availableLinks:      availableLinks,
        reservedLinks:       reservedLinks.map((l) => ({
          id:            l._id,
          name:          l.name,
          platform:      l.platform,
          reservedUntil: l.currentReservation?.endTime,
        })),
      },
    });
  } catch (error) {
    console.error("❌ GET activate error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST: Activate the group
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    const body = await req.json();
    const {
      instructorMessages = {},
      forceActivate = false,
      releaseReserved = false,
    } = body;

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 },
      );
    }

    // ✅ FIX: populate الصح للهيكل الجديد {userId, countTime}
    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate("courseId")
      .populate("instructors.userId", "name email gender profile");

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    // ── Release reserved links if requested ──────────────────────────────
    if (releaseReserved) {
      const reservedLinks = await MeetingLink.find({
        isDeleted: false,
        status: "reserved",
        "currentReservation.sessionId": { $exists: true },
        "currentReservation.endTime": { $gte: new Date() },
      });

      for (const link of reservedLinks) {
        try {
          await link.releaseLink();
          console.log(`🔓 Released link: ${link.name}`);
        } catch (e) {
          console.warn(`⚠️ Could not release link ${link.name}:`, e.message);
        }
      }
      console.log(`✅ Released ${reservedLinks.length} reserved links`);
    }

    // ── Standard validations ─────────────────────────────────────────────
    let isReactivation = false;

    if (group.status === "active") {
      isReactivation = true;
    }
    if (group.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Cannot activate a completed group" },
        { status: 400 },
      );
    }
    if (!group.courseId?.curriculum?.length) {
      return NextResponse.json(
        { success: false, error: "Cannot activate group: Course has no curriculum" },
        { status: 400 },
      );
    }
    if (
      !group.schedule?.startDate ||
      !group.schedule?.daysOfWeek?.length ||
      group.schedule.daysOfWeek.length > 3
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Group must have a valid schedule with 1 to 3 days selected (currently has ${group.schedule?.daysOfWeek?.length || 0} days)`,
        },
        { status: 400 },
      );
    }

    const moduleSelection = group.moduleSelection || {
      mode: "all",
      selectedModules: [],
    };
    if (
      moduleSelection.mode === "specific" &&
      moduleSelection.selectedModules.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "No modules selected for session generation" },
        { status: 400 },
      );
    }

    // ── Update group status ──────────────────────────────────────────────
    const updateData = {
      $set: {
        "metadata.lastModifiedBy": adminUser.id,
        "metadata.updatedAt": new Date(),
      },
    };
    if (!isReactivation) {
      updateData.$set.status = "active";
      updateData.$set["metadata.activatedAt"] = new Date();
    } else {
      updateData.$set["metadata.reactivatedAt"] = new Date();
      updateData.$set["metadata.lastRegeneration"] = new Date();
    }

    await Group.findByIdAndUpdate(id, updateData);

    // ✅ FIX: populate الصح للهيكل الجديد {userId, countTime}
    const updatedGroup = await Group.findById(id)
      .populate("courseId", "title level curriculum")
      .populate("instructors.userId", "name email gender profile");

    // ── Sync indexes ─────────────────────────────────────────────────────
    try {
      await Session.syncIndexes();
    } catch (e) {
      console.warn("⚠️ syncIndexes:", e.message);
    }

    // ── Automation ───────────────────────────────────────────────────────
    try {
      const automationResult = await onGroupActivated(id, adminUser.id);

      let instructorNotificationResult = {
        success: true,
        message: "No instructors",
        instructorsCount: 0,
        notificationsSent: 0,
      };

      // ✅ FIX: التحقق من وجود مدربين بالهيكل الجديد
      if (updatedGroup.instructors?.length > 0) {
        try {
          instructorNotificationResult = await sendInstructorWelcomeMessages(
            id,
            instructorMessages,
          );
        } catch (e) {
          instructorNotificationResult = { success: false, error: e.message };
        }
      }

      // ✅ FIX: normalize الـ instructors في الـ response للفرونت
      const normalizedInstructors = (updatedGroup.instructors || []).map((entry) => ({
        _id:        entry.userId?._id || entry.userId,
        id:         entry.userId?._id || entry.userId,
        name:       entry.userId?.name || "",
        email:      entry.userId?.email || "",
        gender:     entry.userId?.gender || "",
        profile:    entry.userId?.profile || {},
        countTime:  entry.countTime || 0,
      }));

      return NextResponse.json({
        success: true,
        message: isReactivation
          ? "Group reactivated successfully"
          : "Group activated successfully",
        data: {
          id:            updatedGroup._id,
          code:          updatedGroup.code,
          name:          updatedGroup.name,
          status:        updatedGroup.status,
          activatedAt:   updatedGroup.metadata?.activatedAt ?? null,
          reactivatedAt: updatedGroup.metadata?.reactivatedAt ?? null,
          course:        updatedGroup.courseId,
          instructors:   normalizedInstructors,
          sessionsGenerated: true,
          totalSessions:     automationResult.sessionsGenerated,
          isReactivation,
          scheduleInfo: {
            daysPerWeek:  updatedGroup.schedule.daysOfWeek.length,
            selectedDays: updatedGroup.schedule.daysOfWeek,
            startDate:    updatedGroup.schedule.startDate,
          },
          moduleSelection:
            updatedGroup.moduleSelection || { mode: "all", selectedModules: [] },
        },
        automation: {
          sessions: {
            triggered:    true,
            status:       "completed",
            generated:    automationResult.sessionsGenerated,
            details:      automationResult,
            regeneration: automationResult.regeneration || false,
          },
          instructorNotifications: {
            triggered:           updatedGroup.instructors?.length > 0,
            status:              instructorNotificationResult?.success ? "sent" : "failed",
            customMessagesUsed:  Object.keys(instructorMessages).length,
            notificationsSent:   instructorNotificationResult?.notificationsSent || 0,
            notificationsFailed: instructorNotificationResult?.notificationsFailed || 0,
            successRate:         instructorNotificationResult?.successRate || 0,
            results:             instructorNotificationResult,
          },
        },
      });
    } catch (automationError) {
      console.error("❌ Automation failed:", automationError);
      if (!isReactivation) {
        await Group.findByIdAndUpdate(id, {
          $set: { status: "draft", "metadata.updatedAt": new Date() },
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: `Automation failed: ${automationError.message}`,
          suggestion:
            "Group status reverted to draft. Please check the schedule and try again.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("❌ Error activating group:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to activate group" },
      { status: 500 },
    );
  }
}