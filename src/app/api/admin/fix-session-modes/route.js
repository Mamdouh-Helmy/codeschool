// /src/app/api/admin/fix-session-modes/route.js
// ⚠️ ملف مؤقت — استخدمه مرة واحدة ثم احذفه

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../models/Session";
import Group from "../../../models/Group";

// ============================================================
// GET /api/admin/fix-session-modes
// ============================================================
// إصلاح session.deliveryMode عشان يتوافق مع group.deliveryMode
//
// Query params:
//   secret=CRON_SECRET   → مطلوب للمصادقة
//   dryRun=true          → يعرض الأرقام فقط بدون تعديل (موصى به أول مرة)
//
// أمثلة:
//   1. Dry run (معاينة):
//      curl "http://localhost:3000/api/admin/fix-session-modes?secret=XXX&dryRun=true"
//   2. تنفيذ فعلي:
//      curl "http://localhost:3000/api/admin/fix-session-modes?secret=XXX"
// ============================================================

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // ✅ مصادقة
    if (searchParams.get("secret") !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const dryRun = searchParams.get("dryRun") === "true";

    await connectDB();

    console.log(
      `\n🔧 [FIX-SESSION-MODES] Starting ${dryRun ? "DRY RUN" : "ACTUAL FIX"}...`
    );

    // جيب كل الجروبات النشطة
    const groups = await Group.find({ isDeleted: false })
      .select("_id name deliveryMode")
      .lean();

    console.log(`📋 Total groups: ${groups.length}`);

    const results = [];
    let totalFixed = 0;
    let groupsAffected = 0;

    for (const g of groups) {
      if (!g.deliveryMode) continue; // الجروب مش محدد → نتخطى

      // عدد السيشنات اللي عندها deliveryMode مختلف عن الجروب
      const mismatchedCount = await Session.countDocuments({
        groupId: g._id,
        isDeleted: false,
        deliveryMode: { $ne: g.deliveryMode },
      });

      if (mismatchedCount === 0) continue;

      if (dryRun) {
        // ✅ Dry run → بس نعرض
        results.push({
          groupId: g._id.toString(),
          groupName: g.name,
          groupMode: g.deliveryMode,
          wouldFix: mismatchedCount,
        });
        totalFixed += mismatchedCount;
        groupsAffected++;
      } else {
        // ✅ تعديل فعلي
        const updateResult = await Session.updateMany(
          {
            groupId: g._id,
            isDeleted: false,
            deliveryMode: { $ne: g.deliveryMode },
          },
          { $set: { deliveryMode: g.deliveryMode } }
        );

        results.push({
          groupId: g._id.toString(),
          groupName: g.name,
          groupMode: g.deliveryMode,
          fixed: updateResult.modifiedCount,
        });
        totalFixed += updateResult.modifiedCount;
        groupsAffected++;
      }
    }

    console.log(
      `\n✅ [FIX-SESSION-MODES] Done. ${
        dryRun ? "Would fix" : "Fixed"
      }: ${totalFixed} sessions across ${groupsAffected} groups.`
    );

    return NextResponse.json({
      success: true,
      mode: dryRun ? "dryRun" : "actual",
      summary: {
        totalGroupsScanned: groups.length,
        groupsAffected,
        sessionsFixed: totalFixed,
      },
      results,
    });
  } catch (err) {
    console.error("❌ [FIX-SESSION-MODES] error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}