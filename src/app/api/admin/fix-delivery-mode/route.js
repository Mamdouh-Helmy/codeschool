// /src/app/api/cron/fix-delivery-mode/route.js
// ═══════════════════════════════════════════════════════════════════════════
// 🛠️ أداة صيانة: تزامن deliveryMode بين كل الجروبات وسيشناتها
//
//   GET ?secret=XXX                → تنفيذ فعلي (بيصلّح كل حاجة)
//   GET ?secret=XXX&dryRun=true    → معاينة فقط (مفيش أي تعديل)
//   GET ?secret=XXX&includeCompleted=false → تجاهل السيشنات المكتملة
//   GET ?secret=XXX&includeDeleted=false   → تجاهل السيشنات المحذوفة
//
// الجروب = Source of Truth. أي سيشن مختلفة عنه بتتصلّح.
// ═══════════════════════════════════════════════════════════════════════════
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../models/Group";
import Session from "../../../models/Session";

const CRON_SECRET = process.env.CRON_SECRET || "your-secret-key-change-this";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const authHeader = req.headers.get("authorization");

    if (secret !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const dryRun = searchParams.get("dryRun") === "true";
    const includeCompleted = searchParams.get("includeCompleted") !== "false";
    const includeDeleted = searchParams.get("includeDeleted") !== "false";

    await connectDB();

    // ✅ كل الجروبات (حتى المحذوفة) — عشان أي سيشن يتيمة تتصلّح برضه
    const groups = await Group.find({})
      .select("_id name code deliveryMode isDeleted status")
      .lean();

    const groupIds = new Set(groups.map((g) => String(g._id)));

    let totalFixed = 0;
    let totalChecked = 0;
    const details = [];
    const groupsWithInvalidMode = [];

    for (const g of groups) {
      // لو الجروب نفسه deliveryMode بتاعه فاضي/غلط → بنعتبره online ونصلّحه كمان
      const validMode = g.deliveryMode === "offline" || g.deliveryMode === "online";
      const mode = g.deliveryMode === "offline" ? "offline" : "online";

      if (!validMode) {
        groupsWithInvalidMode.push({
          group: g.name,
          code: g.code,
          found: g.deliveryMode ?? null,
          setTo: mode,
        });
        if (!dryRun) {
          await Group.updateOne({ _id: g._id }, { $set: { deliveryMode: mode } });
        }
      }

      const filter = { groupId: g._id };
      if (!includeDeleted) filter.isDeleted = false;
      if (!includeCompleted) filter.status = { $ne: "completed" };

      // ⚠️ Session.find عليه pre-hook بيفلتر isDeleted:false، بس
      // countDocuments/updateMany مش بيتأثروا بيه — فالعد صحيح.
      const mismatchFilter = {
        ...filter,
        $or: [
          { deliveryMode: { $ne: mode } },
          { deliveryMode: null },
          { deliveryMode: { $exists: false } },
        ],
      };

      const total = await Session.countDocuments(filter);
      totalChecked += total;

      const mismatched = await Session.countDocuments(mismatchFilter);
      if (mismatched === 0) continue;

      if (!dryRun) {
        await Session.updateMany(mismatchFilter, {
          $set: { deliveryMode: mode },
        });
      }

      totalFixed += mismatched;
      details.push({
        group: g.name,
        code: g.code,
        groupMode: mode,
        sessionsTotal: total,
        sessionsFixed: mismatched,
        groupDeleted: !!g.isDeleted,
      });
    }

    // ✅ سيشنات يتيمة (groupId مش موجود في أي جروب) — بنبلّغ عنها بس
    const orphanAgg = await Session.aggregate([
      { $group: { _id: "$groupId", count: { $sum: 1 } } },
    ]);
    const orphans = orphanAgg
      .filter((o) => o._id && !groupIds.has(String(o._id)))
      .map((o) => ({ missingGroupId: o._id, sessions: o.count }));

    return NextResponse.json({
      success: true,
      dryRun,
      options: { includeCompleted, includeDeleted },
      groupsScanned: groups.length,
      sessionsScanned: totalChecked,
      totalFixed,
      groupsWithInvalidMode,
      orphanSessions: orphans,
      details,
      note: dryRun
        ? "ده dry-run: مفيش حاجة اتعدلت. شيل dryRun=true للتنفيذ الفعلي."
        : "تم التنفيذ الفعلي.",
    });
  } catch (error) {
    console.error("❌ fix-delivery-mode error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}