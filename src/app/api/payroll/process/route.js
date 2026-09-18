// app/api/payroll/process/route.js
// بيستخدم لما مدرس مكانش ليه سعر وقت ما السيشن اكتملت، أو لما الأدمن يعدّل
// الوقت الفعلي للسيشن ويحب يعيد التسجيل.
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { processSessionPayroll, cancelSessionPayroll } from "../../../../lib/payroll";
import { requireAdmin } from "@/utils/authMiddleware";

export async function POST(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    const { sessionId, actualStartTime, actualEndTime, recalculate = false } =
      await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "sessionId مطلوب" },
        { status: 400 },
      );
    }

    await connectDB();

    // ✅ إعادة الحساب = إلغاء السطور القديمة الأول، بعدين تسجيل من جديد
    if (recalculate) {
      await cancelSessionPayroll(sessionId, {
        actedBy: authCheck.user.id,
        reason: "إعادة حساب من الأدمن",
      });
    }

    const result = await processSessionPayroll({
      sessionId,
      actualStartTime,
      actualEndTime,
      actedBy: authCheck.user.id,
      source: "manual",
      force: true,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ POST /api/payroll/process:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}