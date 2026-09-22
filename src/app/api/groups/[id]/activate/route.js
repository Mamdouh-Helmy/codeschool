// app/api/groups/[id]/activate/route.js

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
import {
  findScheduleConflict,
  pruneOrphanedReservations,
} from "@/utils/checkMeetingLinks";

const LINK_ERROR_CODES = ["NO_AVAILABLE_LINK", "LINK_CONFLICT"];
const VALID_ASSIGNMENT_MODES = ["first_available", "round_robin"];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build simulated session list for preview (no DB writes)
// ─────────────────────────────────────────────────────────────────────────────
function previewSessions(group) {
  const course = group.courseId;
  if (!course?.curriculum?.length) return [];

  const moduleSelection = group.moduleSelection || {
    mode: "all",
    selectedModules: [],
  };
  const { startDate, daysOfWeek, timeFrom, timeTo } = group.schedule;

  const dayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  let modulesToUse = [];
  if (moduleSelection.mode === "all") {
    modulesToUse = course.curriculum.map((m, i) => ({
      module: m,
      origIdx: i,
    }));
  } else {
    modulesToUse = moduleSelection.selectedModules
      .map((i) => ({ module: course.curriculum[i], origIdx: i }))
      .filter((x) => x.module);
  }

  const dayNums = daysOfWeek.map((d) => dayMap[d]).sort((a, b) => a - b);
  const daysPerWeek = dayNums.length;

  const base = new Date(startDate);
  const firstDay = dayNums[0];
  let diff = firstDay - base.getDay();
  if (diff < 0) diff += 7;
  base.setDate(base.getDate() + diff);

  let total = modulesToUse.reduce(
    (s, { module: m }) => s + (m.totalSessions || 3),
    0,
  );

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
// Helper: build maps link for offline
// ─────────────────────────────────────────────────────────────────────────────
function buildMapsLink(group) {
  const loc = group?.locationDetails || {};
  if (loc.lat != null && loc.lng != null) {
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  }
  if (loc.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      loc.address,
    )}`;
  }
  if (loc.placeName || group?.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      loc.placeName || group.location,
    )}`;
  }
  return "";
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

    // ✅ Offline Groups مش محتاجة أي لينكات خالص — المدرس بيروح المكان
    if (group.deliveryMode === "offline") {
      const sessions = previewSessions(group);
      const totalSessions = sessions.length;

      return NextResponse.json({
        success: true,
        data: {
          isOffline: true,
          isMakeupGroup: !!group.isMakeupGroup,
          totalSessions,
          totalLinks: 0,
          availableLinksCount: 0,
          reservedLinksCount: 0,
          hasNoLinks: false,
          hasAvailableLinks: false,
          sessionsWithLinks: 0,
          sessionsWithout: 0,
          sessions,
          availableLinks: [],
          reservedLinks: [],
          preselectedLinks: [],
          preselectedLinkIds: [],
          locationInfo: {
            placeName: group.locationDetails?.placeName || "",
            address: group.locationDetails?.address || "",
            lat: group.locationDetails?.lat ?? null,
            lng: group.locationDetails?.lng ?? null,
            mapsLink: buildMapsLink(group),
          },
        },
      });
    }

    // ── Online Flow ──────────────────────────────────────────────────────
    let allLinks = await MeetingLink.find({
      isDeleted: false,
      status: { $in: ["available", "reserved", "in_use"] },
    })
      .sort({ "stats.totalUses": 1 })
      .lean();

    allLinks = await pruneOrphanedReservations(allLinks);

    const { daysOfWeek, timeFrom, timeTo } = group.schedule;
    const newSchedule = { daysOfWeek, timeFrom, timeTo };

    const availableLinks = [];
    const reservedLinks = [];

    for (const link of allLinks) {
      const conflict = findScheduleConflict(link, newSchedule, group._id);

      if (conflict) {
        reservedLinks.push({
          id: link._id,
          name: link.name,
          platform: link.platform,
          link: link.link,
          reservedDays: conflict.conflictingDays || [],
          reservedTime: conflict.conflictingTime,
          reservedFor: { groupId: conflict.conflictingGroupId },
        });
      } else {
        availableLinks.push(link);
      }
    }

    const sessions = previewSessions(group);
    const totalSessions = sessions.length;

    // ✅ اللينكات المختارة مسبقًا من فورم الحصة التعويضية
    const preselectedLinkIds = (group.metadata?.selectedLinkIds || []).map(
      (lid) => lid.toString(),
    );

    let preselectedLinks = [];
    let finalAvailableLinks = availableLinks;

    if (preselectedLinkIds.length > 0) {
      const preselDocs = await MeetingLink.find({
        _id: { $in: preselectedLinkIds },
        isDeleted: false,
      }).lean();

      preselectedLinks = preselDocs.map((l) => ({
        _id: l._id,
        id: l._id,
        name: l.name,
        platform: l.platform,
        link: l.link,
      }));

      const preselSet = new Set(preselectedLinkIds);
      finalAvailableLinks = availableLinks.filter(
        (l) => !preselSet.has(l._id.toString()),
      );

      console.log(
        `🔗 [Activate Preview] Found ${preselectedLinks.length} preselected link(s) from metadata`,
      );
    }

    const hasAnyLink =
      finalAvailableLinks.length > 0 || preselectedLinks.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        isOffline: false,
        isMakeupGroup: !!group.isMakeupGroup,
        totalSessions,
        totalLinks: allLinks.length,
        availableLinksCount: finalAvailableLinks.length,
        reservedLinksCount: reservedLinks.length,
        hasNoLinks: allLinks.length === 0,
        hasAvailableLinks: finalAvailableLinks.length > 0,
        sessionsWithLinks: hasAnyLink ? totalSessions : 0,
        sessionsWithout: hasAnyLink ? 0 : totalSessions,
        sessions,
        availableLinks: finalAvailableLinks,
        reservedLinks,
        preselectedLinks,
        preselectedLinkIds,
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
      selectedLinkIds = [],
      linkAssignmentMode: requestedMode = "first_available",
    } = body;

    // ✅ نتأكد إن الـ mode قيمة مسموحة، وغير كده نرجع للافتراضي
    const linkAssignmentMode = VALID_ASSIGNMENT_MODES.includes(requestedMode)
      ? requestedMode
      : "first_available";

    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid group ID format" },
        { status: 400 },
      );
    }

    const group = await Group.findOne({ _id: id, isDeleted: false })
      .populate("courseId")
      .populate("instructors.userId", "name email gender profile");

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 },
      );
    }

    const isOffline = group.deliveryMode === "offline";

    console.log(`\n🎯 Activating group ${group.code}`);
    console.log(
      `   Delivery Mode: ${group.deliveryMode} (isOffline: ${isOffline}) | Link mode: ${linkAssignmentMode}`,
    );

    // ── Release reserved links if requested (Online Only) ────────────────
    if (!isOffline && releaseReserved) {
      const freshGroup = await Group.findById(id).select("schedule");
      const allLinks = await MeetingLink.find({
        isDeleted: false,
        status: "reserved",
      });
      let released = 0;

      for (const link of allLinks) {
        const conflict = findScheduleConflict(link, freshGroup.schedule, id);
        if (conflict?.conflictingGroupId) {
          try {
            await link.releaseReservation(conflict.conflictingGroupId);
            released++;
          } catch (e) {
            console.warn(`⚠️ Could not release link ${link.name}:`, e.message);
          }
        }
      }
      console.log(`✅ Released ${released} conflicting reservation(s)`);
    }

    // ── Validations ──────────────────────────────────────────────────────
    let isReactivation = false;

    if (group.status === "active") isReactivation = true;
    if (group.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Cannot activate a completed group" },
        { status: 400 },
      );
    }
    if (!group.courseId?.curriculum?.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot activate group: Course has no curriculum",
        },
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
          error: `Group must have a valid schedule with 1 to 3 days selected (currently has ${
            group.schedule?.daysOfWeek?.length || 0
          } days)`,
        },
        { status: 400 },
      );
    }

    // ✅ Offline لازم يكون فيه مكان محدد قبل التفعيل
    if (isOffline) {
      const loc = group.locationDetails || {};
      const hasLocation =
        loc?.placeName?.trim() ||
        loc?.address?.trim() ||
        (loc?.lat != null && loc?.lng != null) ||
        group.location?.trim();

      if (!hasLocation) {
        return NextResponse.json(
          {
            success: false,
            error:
              "جروب الأوفلاين لازم يكون فيه مكان محدد (placeName/address/coordinates) قبل التفعيل",
          },
          { status: 400 },
        );
      }
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
        {
          success: false,
          error: "No modules selected for session generation",
        },
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
      // لو الفرونت مبعتش selectedLinkIds (زي الـ Make-up Group) نقراها من الـ metadata
      const selectedLinkIdsFromMetadata =
        updatedGroup.metadata?.selectedLinkIds || [];

      const finalSelectedLinkIds =
        selectedLinkIds.length > 0
          ? selectedLinkIds
          : selectedLinkIdsFromMetadata;

      const linkSource =
        selectedLinkIds.length > 0
          ? "frontend"
          : selectedLinkIdsFromMetadata.length > 0
            ? "metadata"
            : "none";

      console.log(
        `   🔗 Links source: ${linkSource} (${finalSelectedLinkIds.length}) | mode: ${linkAssignmentMode}`,
      );

      // ✅ للـ Offline بنمرر [] عشان الـ sessionGenerator ماتحاولش تحجز أي لينك
      const automationResult = await onGroupActivated(
        id,
        adminUser.id,
        isOffline ? [] : finalSelectedLinkIds,
        { linkAssignmentMode },
      );

      let instructorNotificationResult = {
        success: true,
        message: "No instructors",
        instructorsCount: 0,
        notificationsSent: 0,
      };

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

      const normalizedInstructors = (updatedGroup.instructors || []).map(
        (entry) => ({
          _id: entry.userId?._id || entry.userId,
          id: entry.userId?._id || entry.userId,
          name: entry.userId?.name || "",
          email: entry.userId?.email || "",
          gender: entry.userId?.gender || "",
          profile: entry.userId?.profile || {},
          countTime: entry.countTime || 0,
        }),
      );

      // ✅ اللينكات اللي اتحجزت فعليًا (مش كل المختار)
      const usedLinkIds = isOffline
        ? []
        : (automationResult.meetingLinks?.linksUsed ?? finalSelectedLinkIds);

      return NextResponse.json({
        success: true,
        message: isReactivation
          ? isOffline
            ? "Group reactivated successfully (Offline)"
            : "Group reactivated successfully"
          : isOffline
            ? "Group activated successfully (Offline)"
            : "Group activated successfully",
        data: {
          id: updatedGroup._id,
          code: updatedGroup.code,
          name: updatedGroup.name,
          status: updatedGroup.status,
          deliveryMode: updatedGroup.deliveryMode,
          isOffline,
          isMakeupGroup: !!updatedGroup.isMakeupGroup,
          activatedAt: updatedGroup.metadata?.activatedAt ?? null,
          reactivatedAt: updatedGroup.metadata?.reactivatedAt ?? null,
          course: updatedGroup.courseId,
          instructors: normalizedInstructors,
          sessionsGenerated: true,
          totalSessions: automationResult.sessionsGenerated,
          isReactivation,
          scheduleInfo: {
            daysPerWeek: updatedGroup.schedule.daysOfWeek.length,
            selectedDays: updatedGroup.schedule.daysOfWeek,
            startDate: updatedGroup.schedule.startDate,
          },
          moduleSelection: updatedGroup.moduleSelection || {
            mode: "all",
            selectedModules: [],
          },
          usedLinkIds,
          linkSource,
          linkAssignmentMode,
        },
        automation: {
          sessions: {
            triggered: true,
            status: "completed",
            generated: automationResult.sessionsGenerated,
            details: automationResult,
            regeneration: automationResult.regeneration || false,
          },
          instructorNotifications: {
            triggered: updatedGroup.instructors?.length > 0,
            status: instructorNotificationResult?.success ? "sent" : "failed",
            customMessagesUsed: Object.keys(instructorMessages).length,
            notificationsSent:
              instructorNotificationResult?.notificationsSent || 0,
            notificationsFailed:
              instructorNotificationResult?.notificationsFailed || 0,
            successRate: instructorNotificationResult?.successRate || 0,
            results: instructorNotificationResult,
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

      const isLinkError = LINK_ERROR_CODES.includes(automationError.code);

      return NextResponse.json(
        {
          success: false,
          error: isLinkError
            ? automationError.message
            : `Automation failed: ${automationError.message}`,
          code: automationError.code,
          uncoveredDays: automationError.uncoveredDays,
          linkConflicts: automationError.linkConflicts,
          suggestion:
            "Group status reverted to draft. اختار لينكات تانية أو فك الحجز وحاول تاني.",
        },
        { status: isLinkError ? 409 : 500 },
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