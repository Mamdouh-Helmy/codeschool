// app/api/groups/[id]/fix-links/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import MeetingLink from "../../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";
import { findScheduleConflict, pruneOrphanedReservations } from "@/utils/checkMeetingLinks";
import mongoose from "mongoose";

async function getBrokenSessions(groupId) {
  const sessions = await Session.find({
    groupId,
    isDeleted: false,
    status: { $ne: "completed" },
    deliveryMode: { $ne: "offline" },
  })
    .select("_id title scheduledDate startTime endTime meetingLink meetingLinkId")
    .sort({ scheduledDate: 1 })
    .lean();

  const referencedIds = [
    ...new Set(sessions.filter((s) => s.meetingLinkId).map((s) => s.meetingLinkId.toString())),
  ];
  const existingSet = referencedIds.length
    ? new Set(
        (await MeetingLink.find({ _id: { $in: referencedIds }, isDeleted: false }).select("_id").lean())
          .map((l) => l._id.toString()),
      )
    : new Set();

  return sessions.filter((s) => {
    if (s.meetingLinkId) return !existingSet.has(s.meetingLinkId.toString());
    return !s.meetingLink;
  }).map((s) => ({
    id: s._id,
    title: s.title,
    scheduledDate: s.scheduledDate,
    startTime: s.startTime,
    endTime: s.endTime,
    issue: s.meetingLinkId ? "orphaned" : "missing", // ✅ لينك اتمسح / مفيش لينك أصلاً
  }));
}

// ─── GET: عرض السيشنات المعطوبة + اللينكات المتاحة فعليًا ──────────────────
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 });
    }

    const group = await Group.findOne({ _id: id, isDeleted: false }).select("schedule name code");
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const brokenSessions = await getBrokenSessions(id);

    let candidateLinks = await MeetingLink.find({
      isDeleted: false,
      status: { $in: ["available", "reserved"] },
    })
      .sort({ "stats.totalUses": 1 })
      .lean();

    // ✅ تنضيف حجوزات جروبات اتمسحت قبل أي فحص
    candidateLinks = await pruneOrphanedReservations(candidateLinks);

    const availableLinks = [];
    const reservedLinks = [];
    const { daysOfWeek, timeFrom, timeTo } = group.schedule;

    for (const link of candidateLinks) {
      // ✅ فحص دقيق: يقارن مع كل حجز نشط على اللينك (أيام + من/لـ)، ومستثنى
      // منه نفس الجروب ده (لو أصلاً بيستخدم اللينك في سيشنات تانية سليمة)
      const conflict = findScheduleConflict(
        link,
        { daysOfWeek, timeFrom, timeTo },
        id,
      );
      if (conflict) {
        reservedLinks.push({
          id: link._id,
          name: link.name,
          platform: link.platform,
          link: link.link,
          reservedDays: conflict.conflictingDays || [],
          reservedTime: conflict.conflictingTime,
        });
      } else {
        availableLinks.push(link);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        groupName: group.name,
        groupCode: group.code,
        totalBroken: brokenSessions.length,
        brokenSessions,
        hasNoLinks: candidateLinks.length === 0,
        totalLinks: candidateLinks.length,
        availableLinks,
        reservedLinks,
      },
    });
  } catch (error) {
    console.error("❌ GET fix-links error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── POST: تطبيق الإصلاح — توزيع اللينكات المختارة على السيشنات المعطوبة بس ──
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    const adminUser = authCheck.user;

    const body = await req.json();
    const { selectedLinkIds = [] } = body;

    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 });
    }

    const group = await Group.findOne({ _id: id, isDeleted: false });
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const brokenSessions = await getBrokenSessions(id); // نفس المصدر الوحيد للحقيقة

    if (brokenSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "لا توجد سيشنات محتاجة إصلاح",
        fixedCount: 0,
      });
    }

    let fixedCount = 0;
    const failures = [];

    if (selectedLinkIds.length > 0) {
      // ✅ نفس دالة الإصلاح اللي بيستخدمها الأدمن وهو بيغيّر لينك سيشن
      // واحدة يدويًا — بتعمل فحص تعارض دفاعي كمان قبل الحجز الفعلي
      const { manuallyAssignMeetingLink } = await import("@/utils/sessionGenerator");

      // ✅ لكل سيشن معطوبة، نجرب اللينكات المختارة بالترتيب لحد ما نلاقي
      // واحد فاضي في يوم السيشن دي بالذات — مش round-robin ثابت. لو الأول
      // مشغول نجرب اللي بعده، وهكذا؛ لو محدش فاضي نسجل فشل السيشن دي بس
      // ونكمل الباقي (كل سيشن مستقلة، ليها يومها وميعادها بالفعل).
      for (const session of brokenSessions) {
        let assigned = false;
        let lastError = "لا يوجد لينك فاضي من المختارة لهذا الميعاد";

        for (const linkId of selectedLinkIds) {
          try {
            const result = await manuallyAssignMeetingLink(session.id, linkId, adminUser.id);
            if (result.success) {
              assigned = true;
              fixedCount++;
              break;
            }
            lastError = result.error || lastError;
          } catch (e) {
            lastError = e.message || lastError;
          }
        }

        if (!assigned) {
          failures.push({ sessionId: session.id, error: lastError });
        }
      }
    } else {
      // ✅ مفيش لينكات مختارة — بس ننضف مراجع اللينكات اليتيمة (orphaned)
      // عشان متفضلش السيشن شايلة meetingLinkId لحاجة اتمسحت من الداتابيز
      const orphanedIds = brokenSessions
        .filter((s) => s.issue === "orphaned")
        .map((s) => s.id);

      if (orphanedIds.length > 0) {
        await Session.updateMany(
          { _id: { $in: orphanedIds } },
          {
            $set: {
              meetingLink: null,
              meetingLinkId: null,
              meetingCredentials: null,
              meetingPlatform: null,
              "automationEvents.meetingLinkAssigned": false,
            },
          },
        );
      }
      fixedCount = brokenSessions.length;
    }

    return NextResponse.json({
      success: true,
      message: `تم إصلاح ${fixedCount} من أصل ${brokenSessions.length} سيشن`,
      fixedCount,
      totalNeeded: brokenSessions.length,
      failures,
    });
  } catch (error) {
    console.error("❌ POST fix-links error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}