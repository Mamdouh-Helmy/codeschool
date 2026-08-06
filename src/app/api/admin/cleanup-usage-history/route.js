// app/api/admin/cleanup-usage-history/route.js
//
// ✅ Migration/Cleanup script (شغّلها مرة واحدة بس، بعدين احذف الملف ده)
//
// المشكلة: usageHistory فيها نوعين من السجلات الفاسدة:
//   1) مدد زمنية مستحيلة (زي 50520 دقيقة) — من باگ حجز بيتكتب فوق بعضه
//   2) سجلات groupId بتاعتها لجروب اتمسح خالص (Unknown group) — حتى لو
//      مدتها طبيعية (120 دقيقة مثلاً)، دي مفيش فايدة من وجودها لأننا
//      مش هنعرف نربطها بحاجة تاني، والفرونت هيفضل يعرضها "Unknown group"
//
// 🔧 FIX: قبل كده كان الفحص بيعتمد على المدة بس، فأي سجل groupId بتاعه
// اتمسح لكن مدته منطقية (120 دقيقة) كان بيفضل موجود. دلوقتي بنجيب كل
// الـ Group IDs الموجودة فعليًا، وأي entry بيشاور على groupId مش موجود
// بيتشال برضو (بجانب فحص المدة الأصلي).
//
// طريقة الاستخدام:
//   GET /api/admin/cleanup-usage-history?dryRun=true
//   GET /api/admin/cleanup-usage-history?dryRun=false
//   GET /api/admin/cleanup-usage-history?dryRun=false&maxDurationMinutes=480
//   GET /api/admin/cleanup-usage-history?dryRun=false&removeOrphanedGroups=false  (لو عايز توقف الفحص ده بس)

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MeetingLink from "../../../models/MeetingLink";
import Group from "../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dryRun") !== "false";
    const maxDurationMinutes = parseInt(searchParams.get("maxDurationMinutes") || "480");
    // ✅ NEW — افتراضيًا شغال، وبيشيل أي سجل groupId بتاعه لجروب متمسوح
    const removeOrphanedGroups = searchParams.get("removeOrphanedGroups") !== "false";

    console.log(`\n🧹 ========== CLEANING UP USAGE HISTORY ==========`);
    console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE (will write to DB)"}`);
    console.log(`Max sane duration: ${maxDurationMinutes} minutes`);
    console.log(`Remove orphaned groups: ${removeOrphanedGroups}`);

    // ✅ NEW — كل الـ Group IDs الموجودة فعلاً دلوقتي
    const existingGroupIds = new Set(
      (await Group.find({}).select("_id").lean()).map((g) => g._id.toString()),
    );
    console.log(`📋 Existing groups in DB: ${existingGroupIds.size}`);

    const links = await MeetingLink.find({ isDeleted: false }).select(
      "name usageHistory stats",
    );

    const report = {
      linksProcessed: 0,
      linksAffected: 0,
      entriesRemoved: 0,
      entriesKept: 0,
      removedByReason: { badDuration: 0, orphanedGroup: 0 },
      details: [],
    };

    for (const link of links) {
      const original = link.usageHistory || [];
      if (original.length === 0) {
        report.linksProcessed++;
        continue;
      }

      const kept = [];
      const removed = [];

      for (const entry of original) {
        const duration = entry.duration;
        const hasBadDuration =
          duration !== null &&
          duration !== undefined &&
          (duration > maxDurationMinutes || duration <= 0);

        // ✅ NEW — groupId موجود بس مش موجود في الـ Group collection فعليًا
        const isOrphanedGroup =
          removeOrphanedGroups &&
          !!entry.groupId &&
          !existingGroupIds.has(entry.groupId.toString());

        if (hasBadDuration) {
          removed.push({ ...entry.toObject?.() ?? entry, _reason: "badDuration" });
        } else if (isOrphanedGroup) {
          removed.push({ ...entry.toObject?.() ?? entry, _reason: "orphanedGroup" });
        } else {
          kept.push(entry);
        }
      }

      if (removed.length === 0) {
        report.linksProcessed++;
        continue;
      }

      // ✅ إعادة حساب الـ stats من السجلات السليمة بس
      const totalUses = kept.length;
      const totalHours = kept.reduce((sum, e) => sum + (e.duration || 0), 0) / 60;
      const averageUsageDuration =
        totalUses > 0 ? Math.round((totalHours * 60) / totalUses) : 0;
      const lastUsed =
        kept.length > 0
          ? kept.reduce(
              (latest, e) =>
                !latest || new Date(e.usedAt) > new Date(latest) ? e.usedAt : latest,
              null,
            )
          : null;

      const badDurationCount = removed.filter((e) => e._reason === "badDuration").length;
      const orphanedGroupCount = removed.filter((e) => e._reason === "orphanedGroup").length;

      const detail = {
        linkId: link._id,
        linkName: link.name,
        originalCount: original.length,
        keptCount: kept.length,
        removedCount: removed.length,
        removedByReason: { badDuration: badDurationCount, orphanedGroup: orphanedGroupCount },
        removedSample: removed.slice(0, 5).map((e) => ({
          reason: e._reason,
          groupId: e.groupId,
          groupName: e.groupName || "Unknown group",
          duration: e.duration,
          usedAt: e.usedAt,
        })),
        statsBefore: {
          totalUses: link.stats?.totalUses,
          totalHours: link.stats?.totalHours,
          averageUsageDuration: link.stats?.averageUsageDuration,
        },
        statsAfter: { totalUses, totalHours, averageUsageDuration },
      };

      report.details.push(detail);
      report.entriesRemoved += removed.length;
      report.entriesKept += kept.length;
      report.removedByReason.badDuration += badDurationCount;
      report.removedByReason.orphanedGroup += orphanedGroupCount;
      report.linksAffected++;
      report.linksProcessed++;

      if (!dryRun) {
        link.usageHistory = kept;
        link.stats.totalUses = totalUses;
        link.stats.totalHours = totalHours;
        link.stats.averageUsageDuration = averageUsageDuration;
        if (lastUsed) link.stats.lastUsed = lastUsed;
        link.metadata.updatedAt = new Date();
        await link.save();
      }
    }

    console.log(`\n📋 Cleanup Summary:`);
    console.log(`   Links processed: ${report.linksProcessed}`);
    console.log(`   Links affected: ${report.linksAffected}`);
    console.log(`   Entries removed: ${report.entriesRemoved} (bad duration: ${report.removedByReason.badDuration}, orphaned group: ${report.removedByReason.orphanedGroup})`);
    console.log(`   Entries kept: ${report.entriesKept}`);
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      dryRun,
      maxDurationMinutes,
      removeOrphanedGroups,
      message: dryRun
        ? "Dry run complete — no changes were written. Re-run with ?dryRun=false to apply."
        : "Cleanup complete — corrupted/orphaned usage history entries removed and stats recalculated.",
      report,
    });
  } catch (error) {
    console.error("❌ Cleanup error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}