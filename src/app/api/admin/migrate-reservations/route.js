// app/api/admin/migrate-reservations/route.js
//
// ✅ Migration/Backfill script (شغّلها مرة واحدة بس، بعدين احذف الملف ده)
//
// المشكلة: الجروبات اللي كان عندها سيشنات متولدة *قبل* إضافة نظام
// reservations الجديد على MeetingLink، معندهاش أي entry في
// reservations array بتاع اللينكات اللي بتستخدمها فعليًا — رغم إن
// الـ Sessions نفسها لسه فيها meetingLinkId صحيح.
// السبب: syncGroupLinkReservations بينفّذ بس وقت التوليد الأولي (أو
// resync)، مش بيتفحص على الجروبات القديمة تلقائيًا.
//
// الحل: نلف على كل الـ Sessions الشغالة (مش completed/cancelled/deleted)
// إللي عندها meetingLinkId، نجمعهم حسب (meetingLinkId + groupId)، ونبني
// الـ reservation الصحيح لكل تركيبة على اللينك المناسب، بناءً على جدول
// الجروب الحقيقي (schedule.daysOfWeek / timeFrom / timeTo).
//
// طريقة الاستخدام: GET /api/admin/migrate-reservations?dryRun=true  (معاينة بس)
//                  GET /api/admin/migrate-reservations?dryRun=false (تنفيذ فعلي)

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import Session from "../../../models/Session";
import Group from "../../../models/Group";
import MeetingLink from "../../../models/MeetingLink";
import { requireAdmin } from "@/utils/authMiddleware";

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dryRun") !== "false"; // default: dry run

    console.log(`\n🔧 ========== MIGRATING MEETING LINK RESERVATIONS ==========`);
    console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE (will write to DB)"}`);

    // 1. كل السيشنز الشغالة (status ≠ completed/cancelled) واللي عندها لينك
    const activeSessions = await Session.find({
      isDeleted: false,
      status: { $in: ["scheduled", "postponed"] },
      meetingLinkId: { $ne: null },
    })
      .select("groupId meetingLinkId scheduledDate startTime endTime")
      .lean();

    console.log(`📊 Found ${activeSessions.length} active sessions with meeting links`);

    // 2. نجمعهم حسب (meetingLinkId -> groupId -> representative session)
    const byLinkThenGroup = new Map(); // linkId -> Map(groupId -> {sessionId, count})

    for (const s of activeSessions) {
      if (!s.groupId || !s.meetingLinkId) continue;
      const linkId = s.meetingLinkId.toString();
      const groupId = s.groupId.toString();

      if (!byLinkThenGroup.has(linkId)) byLinkThenGroup.set(linkId, new Map());
      const groupMap = byLinkThenGroup.get(linkId);

      if (!groupMap.has(groupId)) {
        groupMap.set(groupId, { sessionId: s._id, count: 1 });
      } else {
        groupMap.get(groupId).count++;
      }
    }

    console.log(`📊 Unique link→group combinations to sync: ${
      [...byLinkThenGroup.values()].reduce((sum, m) => sum + m.size, 0)
    }`);

    // 3. نجيب بيانات الجروبات كلها اللي محتاجينها (schedule + name/code) مرة واحدة
    const allGroupIds = new Set();
    for (const groupMap of byLinkThenGroup.values()) {
      for (const groupId of groupMap.keys()) allGroupIds.add(groupId);
    }

    const groups = await Group.find({
      _id: { $in: [...allGroupIds] },
      isDeleted: false,
    })
      .select("name code schedule")
      .lean();

    const groupsById = new Map(groups.map((g) => [g._id.toString(), g]));

    console.log(`📊 Loaded ${groups.length} group(s) (of ${allGroupIds.size} referenced — the rest are deleted/missing and will be skipped)`);

    // 4. نجيب كل اللينكات المتأثرة
    const linkIds = [...byLinkThenGroup.keys()];
    const links = dryRun
      ? await MeetingLink.find({ _id: { $in: linkIds } }).select("name reservations").lean()
      : await MeetingLink.find({ _id: { $in: linkIds } });

    const linksById = new Map(links.map((l) => [l._id.toString(), l]));

    // 5. نبني/نطبّق التعديلات
    const report = {
      linksProcessed: 0,
      reservationsAdded: 0,
      reservationsSkippedAlreadyExists: 0,
      groupsSkippedDeleted: 0,
      details: [],
    };

    for (const [linkId, groupMap] of byLinkThenGroup.entries()) {
      const link = linksById.get(linkId);
      if (!link) {
        console.log(`⚠️ Link ${linkId} not found (maybe deleted) — skipping`);
        continue;
      }

      const linkDetail = { linkId, linkName: link.name, groupsAdded: [], groupsSkipped: [] };

      for (const [groupId, info] of groupMap.entries()) {
        const group = groupsById.get(groupId);
        if (!group) {
          report.groupsSkippedDeleted++;
          linkDetail.groupsSkipped.push({ groupId, reason: "group_not_found_or_deleted" });
          continue;
        }

        const existingReservations = dryRun ? (link.reservations || []) : link.reservations;
        const alreadyHasReservation = existingReservations.some(
          (r) => r.groupId?.toString() === groupId,
        );

        if (alreadyHasReservation) {
          report.reservationsSkippedAlreadyExists++;
          linkDetail.groupsSkipped.push({ groupId, groupName: group.name, reason: "already_exists" });
          continue;
        }

        const scheduleInfo = {
          daysOfWeek: group.schedule?.daysOfWeek || [],
          timeFrom: group.schedule?.timeFrom || null,
          timeTo: group.schedule?.timeTo || null,
        };

        if (!scheduleInfo.daysOfWeek.length || !scheduleInfo.timeFrom || !scheduleInfo.timeTo) {
          linkDetail.groupsSkipped.push({ groupId, groupName: group.name, reason: "incomplete_schedule" });
          continue;
        }

        if (dryRun) {
          linkDetail.groupsAdded.push({
            groupId,
            groupName: group.name,
            groupCode: group.code,
            sessionsCount: info.count,
            schedule: scheduleInfo,
          });
          report.reservationsAdded++;
        } else {
          try {
            // ✅ استخدام نفس الميثود المستخدمة في الفلو العادي — بيتأكد من
            // التعارض ولو فيه تعارض حقيقي هيرمي error (هنسجله ونكمل الباقي)
            await link.reserveForSession({
              sessionId: info.sessionId,
              groupId: group._id,
              groupName: group.name,
              groupCode: group.code,
              startTime: null,
              endTime: null,
              scheduleInfo,
              userId: authCheck.user.id,
            });
            linkDetail.groupsAdded.push({
              groupId, groupName: group.name, groupCode: group.code,
              sessionsCount: info.count, schedule: scheduleInfo,
            });
            report.reservationsAdded++;
          } catch (err) {
            console.error(`❌ Failed to reserve link ${link.name} for group ${group.name}:`, err.message);
            linkDetail.groupsSkipped.push({
              groupId, groupName: group.name, reason: `error: ${err.message}`,
            });
          }
        }
      }

      report.linksProcessed++;
      report.details.push(linkDetail);
    }

    console.log(`\n📋 Migration Summary:`);
    console.log(`   Links processed: ${report.linksProcessed}`);
    console.log(`   Reservations ${dryRun ? "to be added" : "added"}: ${report.reservationsAdded}`);
    console.log(`   Skipped (already exists): ${report.reservationsSkippedAlreadyExists}`);
    console.log(`   Skipped (group deleted/missing): ${report.groupsSkippedDeleted}`);
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun
        ? "Dry run complete — no changes were written. Re-run with ?dryRun=false to apply."
        : "Migration complete — reservations have been backfilled.",
      report,
    });
  } catch (error) {
    console.error("❌ Migration error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}