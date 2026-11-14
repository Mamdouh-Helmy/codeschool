import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";
import { resyncGroupModuleSessions } from "@/utils/sessionGenerator";

const VALID_ASSIGNMENT_MODES = ["first_available", "round_robin"];
const LINK_ERROR_CODES = ["NO_AVAILABLE_LINK", "LINK_CONFLICT"];

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    const adminUser = authCheck.user;

    await connectDB();

    const {
      moduleSelection,
      selectedLinkIds = [],
      linkAssignmentMode: requestedMode = "first_available",
    } = await req.json();

    // ✅ نفس منطق activate/route.js — لو القيمة مش صحيحة نرجع للافتراضي
    const linkAssignmentMode = VALID_ASSIGNMENT_MODES.includes(requestedMode)
      ? requestedMode
      : "first_available";

    if (!moduleSelection?.mode) {
      return NextResponse.json({ success: false, error: "moduleSelection مطلوب" }, { status: 400 });
    }
    if (moduleSelection.mode === "specific" && !moduleSelection.selectedModules?.length) {
      return NextResponse.json({ success: false, error: "اختر موديول واحد على الأقل" }, { status: 400 });
    }

    const group = await Group.findOne({ _id: id, isDeleted: false }).populate("courseId");
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    // ✅ الجروب المؤرشف لازم يتسترجع الأول
    if (group.isArchived) {
      return NextResponse.json(
        { success: false, error: "الجروب مؤرشف — استرجعه من الأرشيف الأول" },
        { status: 400 },
      );
    }

    const result = await resyncGroupModuleSessions(
      id,
      group,
      moduleSelection,
      adminUser.id,
      selectedLinkIds,
      linkAssignmentMode,
    );

    // ✅ لو الـ sync ضاف سيشنات جديدة لجروب كان منتهي (أو رسالة الإتمام اتبعتت)،
    // نفتحه تاني: status → active + تصفير حالة رسالة الإتمام، عشان الرسائل ترجع
    // والكرون يبعت رسالة الإتمام تاني لما الكورس الجديد يخلص.
    let reopened = false;
    if (result?.success) {
      try {
        const fresh = await Group.findById(id);
        if (fresh) {
          const r = await fresh.reopenAfterNewContent();
          reopened = !!r.reopened;
        }
      } catch (reopenErr) {
        // مش حرج: الـ sync نفسه نجح — بنسجل الخطأ بس
        console.error("⚠️ reopenAfterNewContent failed:", reopenErr.message);
      }
    }

    const body = reopened
      ? {
          ...result,
          reopened: true,
          message: `${result.message || "تمت المزامنة"} — الجروب اتفتح تاني وهيرجع يستقبل الرسائل`,
        }
      : { ...result, reopened: false };

    return NextResponse.json(body, { status: result?.success ? 200 : 400 });
  } catch (error) {
    console.error("❌ Error syncing modules:", error);

    // ✅ نفس فلسفة activate/route.js: أخطاء اللينكات (مفيش لينك فاضي / تعارض)
    // بترجع 409 مع التفاصيل، بدل 500 عام
    const isLinkError = LINK_ERROR_CODES.includes(error.code);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        uncoveredDays: error.uncoveredDays,
        linkConflicts: error.linkConflicts,
      },
      { status: isLinkError ? 409 : 500 },
    );
  }
}