// /src/app/api/whatsapp/template-variables/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TemplateVariable, { getDefaultVariables } from "../../../models/TemplateVariable";
import { requireAdmin } from "@/utils/authMiddleware";

// ============================================================
// GET — جلب كل المتغيرات (أو متغير واحد بالـ key)
// ============================================================
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const key   = searchParams.get("key");
    const group = searchParams.get("group");
    const seed  = searchParams.get("seed") === "true";

    // ── seed ─────────────────────────────────────────────────
    if (seed) {
      const results = await TemplateVariable.seedDefaults();
      const created = results.filter((r) => r.action === "created").length;
      return NextResponse.json({
        success: true,
        message: `seed done — ${created} created, ${results.length - created} already exist`,
        data: results,
      });
    }

    // ── جلب متغير واحد ───────────────────────────────────────
    if (key) {
      const variable = await TemplateVariable.findOne({ key, isActive: true }).lean();
      if (!variable)
        return NextResponse.json({ success: false, message: `Variable '${key}' not found` }, { status: 404 });
      return NextResponse.json({ success: true, data: variable });
    }

    // ── جلب الكل ─────────────────────────────────────────────
    const query = { isActive: true };
    if (group) query.group = group;

    let variables = await TemplateVariable.find(query).sort({ group: 1, key: 1 }).lean();

    // ── auto-seed لو فاضية ───────────────────────────────────
    if (variables.length === 0) {
      await TemplateVariable.seedDefaults();
      variables = await TemplateVariable.find({ isActive: true }).sort({ group: 1, key: 1 }).lean();
      return NextResponse.json({ success: true, data: variables, count: variables.length, seeded: true });
    }

    return NextResponse.json({ success: true, data: variables, count: variables.length });
  } catch (error) {
    console.error("❌ GET template-variables error:", error);
    const fallback = getDefaultVariables();
    return NextResponse.json({
      success: true,
      data: fallback.map((v) => ({ ...v, _id: v.key, isFallback: true })),
      count: fallback.length,
      isFallback: true,
    });
  }
}

// ============================================================
// PUT — تعديل متغير موجود
// ============================================================
export async function PUT(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const {
      key, _id,
      valueAr, valueEn,
      valueMaleAr, valueMaleEn, valueFemaleAr, valueFemaleEn,
      valueFatherAr, valueFatherEn, valueMotherAr, valueMotherEn,
      labelAr, labelEn, icon, description,
    } = body;

    if (!key && !_id)
      return NextResponse.json({ success: false, message: "يلزم تمرير key أو _id" }, { status: 400 });

    const filter   = _id ? { _id } : { key };
    const variable = await TemplateVariable.findOne(filter);

    if (!variable)
      return NextResponse.json({ success: false, message: `المتغير '${key || _id}' غير موجود` }, { status: 404 });

    if (valueAr      !== undefined) variable.valueAr      = valueAr;
    if (valueEn      !== undefined) variable.valueEn      = valueEn;
    if (valueMaleAr  !== undefined) variable.valueMaleAr  = valueMaleAr;
    if (valueMaleEn  !== undefined) variable.valueMaleEn  = valueMaleEn;
    if (valueFemaleAr !== undefined) variable.valueFemaleAr = valueFemaleAr;
    if (valueFemaleEn !== undefined) variable.valueFemaleEn = valueFemaleEn;
    if (valueFatherAr !== undefined) variable.valueFatherAr = valueFatherAr;
    if (valueFatherEn !== undefined) variable.valueFatherEn = valueFatherEn;
    if (valueMotherAr !== undefined) variable.valueMotherAr = valueMotherAr;
    if (valueMotherEn !== undefined) variable.valueMotherEn = valueMotherEn;
    if (labelAr      !== undefined) variable.labelAr      = labelAr;
    if (labelEn      !== undefined) variable.labelEn      = labelEn;
    if (icon         !== undefined) variable.icon         = icon;
    if (description  !== undefined) variable.description  = description;

    variable.updatedBy = adminUser.id;
    await variable.save();

    return NextResponse.json({
      success: true,
      data: variable,
      message: `✅ تم تحديث المتغير '${variable.key}'`,
    });
  } catch (error) {
    console.error("❌ PUT template-variables error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ============================================================
// PATCH — bulk update
// ============================================================
export async function PATCH(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const { variables } = await req.json();

    if (!Array.isArray(variables) || variables.length === 0)
      return NextResponse.json({ success: false, message: "يلزم تمرير مصفوفة variables" }, { status: 400 });

    const results = [];

    for (const item of variables) {
      const {
        key, valueAr, valueEn,
        valueMaleAr, valueMaleEn, valueFemaleAr, valueFemaleEn,
        valueFatherAr, valueFatherEn, valueMotherAr, valueMotherEn,
        labelAr, labelEn, icon,
      } = item;
      if (!key) continue;

      const updated = await TemplateVariable.findOneAndUpdate(
        { key },
        {
          $set: {
            ...(valueAr       !== undefined && { valueAr }),
            ...(valueEn       !== undefined && { valueEn }),
            ...(valueMaleAr   !== undefined && { valueMaleAr }),
            ...(valueMaleEn   !== undefined && { valueMaleEn }),
            ...(valueFemaleAr !== undefined && { valueFemaleAr }),
            ...(valueFemaleEn !== undefined && { valueFemaleEn }),
            ...(valueFatherAr !== undefined && { valueFatherAr }),
            ...(valueFatherEn !== undefined && { valueFatherEn }),
            ...(valueMotherAr !== undefined && { valueMotherAr }),
            ...(valueMotherEn !== undefined && { valueMotherEn }),
            ...(labelAr       !== undefined && { labelAr }),
            ...(labelEn       !== undefined && { labelEn }),
            ...(icon          !== undefined && { icon }),
            updatedBy: adminUser.id,
          },
        },
        { new: true, upsert: false }
      );

      results.push({ key, success: !!updated, action: updated ? "updated" : "not_found" });
    }

    const updatedCount = results.filter((r) => r.success).length;
    return NextResponse.json({
      success: true,
      message: `✅ تم تحديث ${updatedCount} من ${variables.length} متغير`,
      data: results,
    });
  } catch (error) {
    console.error("❌ PATCH template-variables error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ============================================================
// POST — إنشاء متغير جديد
// ============================================================
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB();

    const body = await req.json();
    const {
      key, labelAr, labelEn, valueAr, valueEn,
      valueMaleAr, valueMaleEn, valueFemaleAr, valueFemaleEn,
      valueFatherAr, valueFatherEn, valueMotherAr, valueMotherEn,
      icon, group, description, hasGender, genderType,
    } = body;

    if (!key || !labelAr || !labelEn)
      return NextResponse.json({ success: false, message: "الحقول المطلوبة: key, labelAr, labelEn" }, { status: 400 });

    const existing = await TemplateVariable.findOne({ key });
    if (existing)
      return NextResponse.json({ success: false, message: `المتغير '${key}' موجود بالفعل` }, { status: 409 });

    const variable = await TemplateVariable.create({
      key, labelAr, labelEn,
      valueAr: valueAr || "", valueEn: valueEn || "",
      valueMaleAr: valueMaleAr || "", valueMaleEn: valueMaleEn || "",
      valueFemaleAr: valueFemaleAr || "", valueFemaleEn: valueFemaleEn || "",
      valueFatherAr: valueFatherAr || "", valueFatherEn: valueFatherEn || "",
      valueMotherAr: valueMotherAr || "", valueMotherEn: valueMotherEn || "",
      icon: icon || "📝",
      group: group || "common",
      description: description || "",
      hasGender: hasGender || false,
      genderType: genderType || null,
      updatedBy: adminUser.id,
    });

    return NextResponse.json({ success: true, data: variable, message: `✅ تم إنشاء المتغير '${key}'` });
  } catch (error) {
    console.error("❌ POST template-variables error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ============================================================
// DELETE — حذف ناعم
// ============================================================
export async function DELETE(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key)
      return NextResponse.json({ success: false, message: "يلزم تمرير key" }, { status: 400 });

    const variable = await TemplateVariable.findOneAndUpdate(
      { key },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!variable)
      return NextResponse.json({ success: false, message: `المتغير '${key}' غير موجود` }, { status: 404 });

    return NextResponse.json({ success: true, message: `✅ تم حذف المتغير '${key}'` });
  } catch (error) {
    console.error("❌ DELETE template-variables error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}