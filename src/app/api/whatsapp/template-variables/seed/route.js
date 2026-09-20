// app/api/whatsapp/template-variables/seed/route.js
// ═══════════════════════════════════════════════════════════════════════════
// ✅ Route لـseed المتغيرات الجديدة
// ═══════════════════════════════════════════════════════════════════════════
//
// GET بدون أي حاجة → معاينة (مش بيضيف)
// GET ?confirm=yes → يضيف المتغيرات الناقصة فعلًا
// POST → يضيف برضو (للتوافق مع أي كود قديم)
//
// آمن: يستخدم فحص مسبق لكل متغير — بيضيف الجديد بس، مش بيلمس الموجود.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TemplateVariable, {
  getDefaultVariables,
} from "../../../../models/TemplateVariable";
import { requireAdmin } from "@/utils/authMiddleware";

// ─── Helper: ينفّذ الـseed الفعلي ─────────────────────────────────────────
async function runSeed() {
  const defaults = getDefaultVariables();
  const results = {
    created: [],
    skipped: [],
    errors: [],
  };

  for (const variable of defaults) {
    try {
      const existing = await TemplateVariable.findOne({
        key: variable.key,
      }).lean();

      if (existing) {
        results.skipped.push({
          key: variable.key,
          reason: "already_exists",
        });
        continue;
      }

      await TemplateVariable.create(variable);
      results.created.push({
        key: variable.key,
        labelAr: variable.labelAr,
        group: variable.group,
        icon: variable.icon,
      });
    } catch (err) {
      results.errors.push({
        key: variable.key,
        error: err.message,
      });
    }
  }

  console.log(
    `✅ [TemplateVariable Seed] Created: ${results.created.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`,
  );

  return results;
}

// ─── GET ─────────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const confirm = searchParams.get("confirm");

    // ✅ لو مش confirm → نعرض بس (preview)
    if (confirm !== "yes") {
      const defaults = getDefaultVariables();
      const existing = await TemplateVariable.find({}).select("key").lean();
      const existingKeys = new Set(existing.map((v) => v.key));

      const missing = defaults.filter((v) => !existingKeys.has(v.key));
      const makeupMissing = missing.filter((v) => v.group === "makeup");

      return NextResponse.json({
        success: true,
        mode: "preview",
        message:
          "دي معاينة بس. عشان تنفّذ الإضافة ضيف ?confirm=yes على الـURL",
        hint: `افتح: ${new URL(req.url).origin}${new URL(req.url).pathname}?confirm=yes`,
        data: {
          totalInDefaults: defaults.length,
          totalInDb: existing.length,
          missingCount: missing.length,
          makeupMissingCount: makeupMissing.length,
          missingVariables: missing.map((v) => ({
            key: v.key,
            labelAr: v.labelAr,
            labelEn: v.labelEn,
            group: v.group,
            icon: v.icon,
            valueAr: v.valueAr,
            valueEn: v.valueEn,
          })),
        },
      });
    }

    // ✅ confirm=yes → ننفّذ الـseed
    const results = await runSeed();

    return NextResponse.json({
      success: true,
      mode: "executed",
      message:
        results.created.length > 0
          ? `✅ تمت إضافة ${results.created.length} متغير جديد`
          : "مفيش متغيرات جديدة — كل حاجة موجودة بالفعل",
      data: {
        createdCount: results.created.length,
        skippedCount: results.skipped.length,
        errorCount: results.errors.length,
        created: results.created,
        errors: results.errors,
      },
    });
  } catch (error) {
    console.error("❌ [TemplateVariable Seed GET]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// ─── POST (للتوافق مع أي كود قديم بيستخدم POST) ──────────────────────────
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const results = await runSeed();

    return NextResponse.json({
      success: true,
      mode: "executed",
      message:
        results.created.length > 0
          ? `✅ تمت إضافة ${results.created.length} متغير جديد`
          : "مفيش متغيرات جديدة — كل حاجة موجودة بالفعل",
      data: {
        createdCount: results.created.length,
        skippedCount: results.skipped.length,
        errorCount: results.errors.length,
        created: results.created,
        errors: results.errors,
      },
    });
  } catch (error) {
    console.error("❌ [TemplateVariable Seed POST]:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}