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

    const result = await resyncGroupModuleSessions(
      id,
      group,
      moduleSelection,
      adminUser.id,
      selectedLinkIds,
      linkAssignmentMode, // 🆕
    );
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
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