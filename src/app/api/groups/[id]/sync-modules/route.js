import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import { requireAdmin } from "@/utils/authMiddleware";
import { resyncGroupModuleSessions } from "@/utils/sessionGenerator";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    const adminUser = authCheck.user;

    await connectDB();

    const { moduleSelection, selectedLinkIds = [] } = await req.json();
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

    const result = await resyncGroupModuleSessions(id, group, moduleSelection, adminUser.id, selectedLinkIds);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("❌ Error syncing modules:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}