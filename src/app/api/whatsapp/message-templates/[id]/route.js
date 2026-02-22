// /src/app/api/message-templates/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import MessageTemplate from "../../../../models/MessageTemplate";
import { requireAdmin } from "@/utils/authMiddleware";

// ✅ GET: جلب قالب محدد
export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params;

    const template = await MessageTemplate.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("❌ Error fetching template:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ✅ PUT: تحديث قالب محدد
export async function PUT(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const adminUser = authCheck.user;
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const template = await MessageTemplate.findById(id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: "Template not found" },
        { status: 404 }
      );
    }

    // إذا كان سيتم تعيينه كافتراضي، قم بإزالة الافتراضي من القوالب الأخرى
    if (body.isDefault && !template.isDefault) {
      await MessageTemplate.updateMany(
        { templateType: template.templateType, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    // تحديث القالب
    Object.assign(template, body);
    template.updatedBy = adminUser.id;
    await template.save();

    return NextResponse.json({
      success: true,
      message: "Template updated successfully",
      data: template,
    });
  } catch (error) {
    console.error("❌ Error updating template:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE: حذف قالب محدد
export async function DELETE(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    const { id } = await params;

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
          error: "Cannot delete default template. Set another template as default first." 
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
    console.error("❌ Error deleting template:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}