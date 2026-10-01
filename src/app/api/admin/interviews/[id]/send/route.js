// /app/api/admin/interviews/[id]/send/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireAdmin } from "@/utils/authMiddleware";
import {
  sendInterviewWelcome,
  sendInterviewReminder,
  sendInterviewEvaluation,
} from "../../../../../services/interviewAutomation";

export async function POST(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;
    await connectDB();

    const { id } = await params;
    const { action, reminderType, evaluation } = await req.json();

    let result;
    if (action === "welcome") {
      result = await sendInterviewWelcome(id);
    } else if (action === "reminder") {
      result = await sendInterviewReminder(id, reminderType || "24h");
    } else if (action === "evaluation") {
      result = await sendInterviewEvaluation(id, {
        ...evaluation,
        completedBy: authCheck.user.id,
      });
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("❌ interview send:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}