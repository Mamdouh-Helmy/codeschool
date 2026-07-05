// app/api/overview/student/[studentId]/route.js
// ✅ سجل تفصيلي كامل لطالب واحد: كل الباقات + الاستثناءات + كامل سجل استخدام الساعات

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../../models/Student";
import { requireAdmin } from "@/utils/authMiddleware";

export async function GET(req, { params }) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    const { studentId } = await params;

    const student = await Student.findOne({
      _id: studentId,
      isDeleted: false,
    }).lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "الطالب غير موجود" },
        { status: 404 }
      );
    }

    const creditSystem = student.creditSystem || {};

    // ✅ كل الباقات (الحالية + التاريخية) مرتبة من الأحدث للأقدم
    const allPackages = [
      ...(creditSystem.currentPackage
        ? [{ ...creditSystem.currentPackage, isCurrent: true }]
        : []),
      ...(creditSystem.packagesHistory || []).map((p) => ({
        ...p,
        isCurrent: false,
      })),
    ].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    // ✅ كل الاستثناءات (خصم / إضافة / تجميد) من الأحدث للأقدم
    const allExceptions = [...(creditSystem.exceptions || [])].sort(
      (a, b) => new Date(b.startDate) - new Date(a.startDate)
    );

    // ✅ كامل سجل استخدام الساعات (مش أخر 5 بس زي صفحة overview)
    const fullUsageHistory = [...(creditSystem.usageHistory || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // ✅ إحصائية حضور/غياب مستخرجة من usageHistory
    const attendanceBreakdown = {
      present: fullUsageHistory.filter((u) => u.attendanceStatus === "present").length,
      absent: fullUsageHistory.filter((u) => u.attendanceStatus === "absent").length,
      late: fullUsageHistory.filter((u) => u.attendanceStatus === "late").length,
      excused: fullUsageHistory.filter((u) => u.attendanceStatus === "excused").length,
      refund: fullUsageHistory.filter((u) => u.attendanceStatus === "refund").length,
    };

    const stats = creditSystem.stats || {};

    return NextResponse.json(
      {
        success: true,
        data: {
          studentId: student._id,
          name: student.personalInfo?.fullName || "—",
          enrollmentNumber: student.enrollmentNumber,
          status: creditSystem.status || "no_package",
          stats: {
            totalHoursPurchased: stats.totalHoursPurchased || 0,
            totalHoursUsed: stats.totalHoursUsed || 0,
            totalHoursRemaining: stats.totalHoursRemaining || 0,
            totalSessionsAttended: stats.totalSessionsAttended || 0,
            lastPackagePurchase: stats.lastPackagePurchase || null,
            lastUsageDate: stats.lastUsageDate || null,
          },
          attendanceBreakdown,
          packages: allPackages,
          exceptions: allExceptions,
          usageHistory: fullUsageHistory,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Student History API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب سجل الطالب",
        error: error.message,
      },
      { status: 500 }
    );
  }
}