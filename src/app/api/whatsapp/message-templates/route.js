// /src/app/api/whatsapp/message-templates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb"; // ✅ connectDB وليس dbConnect
import MessageTemplate from "../../../models/MessageTemplate";
import { requireAdmin } from "@/utils/authMiddleware";

// ✅ GET: جلب القوالب
export async function GET(request) {
  try {
    await connectDB(); // ✅ إصلاح: كانت dbConnect()
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isDefault = searchParams.get("default") === "true";

    const query = { isActive: true };
    if (type) query.templateType = type;
    if (isDefault) query.isDefault = true;

    const templates = await MessageTemplate.find(query).lean();

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("❌ GET message-templates error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ✅ PUT: تحديث قالب موجود
export async function PUT(request) {
  try {
    await connectDB(); // ✅ إصلاح
    const body = await request.json();
    const { templateType, contentAr, contentEn, _id } = body;

    let template;

    if (_id) {
      // تحديث بالـ ID
      template = await MessageTemplate.findByIdAndUpdate(
        _id,
        {
          $set: {
            contentAr,
            contentEn,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );
    } else {
      // تحديث القالب الافتراضي من هذا النوع
      template = await MessageTemplate.findOneAndUpdate(
        { templateType, isDefault: true },
        {
          $set: {
            contentAr,
            contentEn,
            updatedAt: new Date(),
          },
        },
        { new: true, upsert: false }
      );
    }

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("❌ PUT message-templates error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ✅ POST: إنشاء قالب جديد
export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const adminUser = authCheck.user;
    await connectDB(); // ✅ إصلاح

    const body = await req.json();

    const requiredFields = ["templateType", "name", "contentAr", "contentEn"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Field '${field}' is required` },
          { status: 400 }
        );
      }
    }

    const template = await MessageTemplate.create({
      ...body,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
      variables: body.variables || [],
    });

    return NextResponse.json({
      success: true,
      message: "Template created successfully",
      data: template,
    });
  } catch (error) {
    console.error("❌ POST message-templates error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE: حذف قالب
export async function DELETE(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB(); // ✅ إصلاح

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Template ID is required" },
        { status: 400 }
      );
    }

    const template = await MessageTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    if (template.isDefault) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete default template. Set another template as default first.",
        },
        { status: 400 }
      );
    }

    await template.deleteOne();

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error("❌ DELETE message-templates error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}