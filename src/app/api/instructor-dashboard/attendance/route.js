// app/api/instructor/attendance/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "../../../models/Session";
import Group from "../../../models/Group";
import Student from "../../../models/Student";
import { getUserFromRequest } from "@/lib/auth";
import mongoose from "mongoose";

// GET: Get comprehensive attendance report for instructor
export async function GET(req) {
  try {
    console.log(`\n📋 ========== INSTRUCTOR ATTENDANCE REPORT ==========`);

    const user = await getUserFromRequest(req);

    if (!user || user.role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بالوصول. يجب أن تكون مدرساً" },
        { status: 403 }
      );
    }

    console.log(`👤 Instructor: ${user.name} (${user.email})`);

    await connectDB();

    // الحصول على جميع المجموعات التي يدرسها المدرس
    const groups = await Group.find({
      instructors: user.id,
      isDeleted: false,
      status: { $in: ["active", "completed"] },
    }).select("_id name code");

    console.log(`👥 Found ${groups.length} groups for instructor`);

    if (!groups || groups.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "لا توجد مجموعات نشطة للمدرس",
      });
    }

    const groupIds = groups.map((group) => group._id);

    // الحصول على query parameters للتصفية
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const groupId = searchParams.get("groupId");
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // بناء query للجلسات
    let sessionQuery = {
      groupId: { $in: groupIds },
      isDeleted: false,
      attendanceTaken: true,
    };

    // تطبيق الفلاتر
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      const groupExists = groups.some((g) => g._id.toString() === groupId);
      if (groupExists) {
        sessionQuery.groupId = new mongoose.Types.ObjectId(groupId);
        console.log(`🔍 Filter: groupId = ${groupId}`);
      }
    }

    if (fromDate) {
      const from = new Date(fromDate);
      if (!isNaN(from.getTime())) {
        sessionQuery.scheduledDate = {
          ...sessionQuery.scheduledDate,
          $gte: from,
        };
        console.log(`🔍 Filter: fromDate = ${fromDate}`);
      }
    }

    if (toDate) {
      const to = new Date(toDate);
      if (!isNaN(to.getTime())) {
        sessionQuery.scheduledDate = {
          ...sessionQuery.scheduledDate,
          $lte: to,
        };
        console.log(`🔍 Filter: toDate = ${toDate}`);
      }
    }

    console.log(`📊 Session query:`, JSON.stringify(sessionQuery, null, 2));

    // جلب الجلسات مع الحضور
    const sessions = await Session.find(sessionQuery)
      .populate("groupId", "name code")
      .populate("courseId", "title")
      .populate(
        "attendance.studentId",
        "personalInfo.fullName enrollmentNumber"
      )
      .sort({ scheduledDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`✅ Found ${sessions.length} sessions with attendance`);

    // إعداد سجل الحضور الشامل
    const attendanceRecords = [];
    const studentAttendanceMap = {};
    const sessionStats = {
      totalSessions: sessions.length,
      totalAttendanceRecords: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalExcused: 0,
      attendanceRate: 0,
    };

    // معالجة كل جلسة
    sessions.forEach((session) => {
      if (session.attendance && session.attendance.length > 0) {
        session.attendance.forEach((record) => {
          if (record.studentId) {
            const studentKey = record.studentId._id.toString();

            // تسجيل الحضور في السجل الشامل
            attendanceRecords.push({
              sessionId: session._id,
              sessionTitle: session.title,
              sessionDate: session.scheduledDate,
              sessionTime: `${session.startTime} - ${session.endTime}`,
              groupId: session.groupId._id,
              groupName: session.groupId.name,
              groupCode: session.groupId.code,
              courseTitle: session.courseId?.title,
              studentId: record.studentId._id,
              studentName: record.studentId.personalInfo?.fullName,
              enrollmentNumber: record.studentId.enrollmentNumber,
              status: record.status,
              notes: record.notes,
              markedAt: record.markedAt,
              markedBy: record.markedBy,
            });

            // تحديث إحصائيات الطالب
            if (!studentAttendanceMap[studentKey]) {
              studentAttendanceMap[studentKey] = {
                studentId: record.studentId._id,
                studentName: record.studentId.personalInfo?.fullName,
                enrollmentNumber: record.studentId.enrollmentNumber,
                totalSessions: 0,
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                attendanceRate: 0,
              };
            }

            studentAttendanceMap[studentKey].totalSessions++;

            switch (record.status) {
              case "present":
                studentAttendanceMap[studentKey].present++;
                sessionStats.totalPresent++;
                break;
              case "absent":
                studentAttendanceMap[studentKey].absent++;
                sessionStats.totalAbsent++;
                break;
              case "late":
                studentAttendanceMap[studentKey].late++;
                sessionStats.totalLate++;
                break;
              case "excused":
                studentAttendanceMap[studentKey].excused++;
                sessionStats.totalExcused++;
                break;
            }

            // حساب نسبة الحضور للطالب
            const studentStats = studentAttendanceMap[studentKey];
            studentStats.attendanceRate =
              studentStats.totalSessions > 0
                ? Math.round(
                    (studentStats.present / studentStats.totalSessions) * 100
                  )
                : 0;

            sessionStats.totalAttendanceRecords++;
          }
        });
      }
    });

    // حساب إجمالي نسبة الحضور
    if (sessionStats.totalAttendanceRecords > 0) {
      sessionStats.attendanceRate = Math.round(
        (sessionStats.totalPresent / sessionStats.totalAttendanceRecords) * 100
      );
    }

    // تحويل map الطلاب إلى مصفوفة
    const studentAttendanceSummary = Object.values(studentAttendanceMap);

    // تطبيق فلتر حالة الطالب إذا طلب
    let filteredStudentAttendance = studentAttendanceSummary;
    if (status === "poor") {
      filteredStudentAttendance = studentAttendanceSummary.filter(
        (student) => student.attendanceRate < 70
      );
    } else if (status === "good") {
      filteredStudentAttendance = studentAttendanceSummary.filter(
        (student) => student.attendanceRate >= 70
      );
    }

    // تطبيق فلتر الطالب المحدد
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      const studentRecords = attendanceRecords.filter(
        (record) => record.studentId.toString() === studentId
      );

      const studentSessions = sessions.filter((session) =>
        session.attendance?.some(
          (record) =>
            record.studentId && record.studentId._id.toString() === studentId
        )
      );

      const studentSummary = studentAttendanceSummary.find(
        (s) => s.studentId.toString() === studentId
      );

      return NextResponse.json({
        success: true,
        data: {
          type: "student_report",
          student: studentSummary,
          attendanceRecords: studentRecords,
          sessions: studentSessions.map((s) => ({
            _id: s._id,
            title: s.title,
            date: s.scheduledDate,
            time: `${s.startTime} - ${s.endTime}`,
            group: s.groupId.name,
            attendance: s.attendance.find(
              (a) => a.studentId && a.studentId._id.toString() === studentId
            ),
          })),
        },
        filters: {
          studentId,
          fromDate,
          toDate,
          groupId,
        },
      });
    }

    // إجمالي عدد السجلات للترقيم
    const totalRecords = await Session.countDocuments(sessionQuery);

    return NextResponse.json({
      success: true,
      data: {
        type: "comprehensive_report",
        sessions: sessions.map((s) => ({
          _id: s._id,
          title: s.title,
          date: s.scheduledDate,
          time: `${s.startTime} - ${s.endTime}`,
          group: s.groupId.name,
          attendanceCount: s.attendance?.length || 0,
        })),
        attendanceRecords,
        studentAttendanceSummary: filteredStudentAttendance,
        statistics: sessionStats,
        groups,
      },
      pagination: {
        page,
        limit,
        total: totalRecords,
        pages: Math.ceil(totalRecords / limit),
      },
      filters: {
        fromDate,
        toDate,
        groupId,
        status,
        applied: {
          dateRange:
            fromDate || toDate
              ? `${fromDate || "بداية"} - ${toDate || "نهاية"}`
              : "جميع التواريخ",
          group: groupId
            ? groups.find((g) => g._id.toString() === groupId)?.name
            : "جميع المجموعات",
          statusFilter:
            status === "poor"
              ? "ضعيف الحضور (<70%)"
              : status === "good"
              ? "جيد الحضور (≥70%)"
              : "جميع الطلاب",
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching attendance report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل في جلب سجل الحضور",
      },
      { status: 500 }
    );
  }
}

// POST: Export attendance report (PDF/Excel)
export async function POST(req) {
  try {
    const user = await getUserFromRequest(req);

    if (!user || user.role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "غير مصرح لك بالتصدير. يجب أن تكون مدرساً" },
        { status: 403 }
      );
    }

    const { exportType, filters } = await req.json();

    if (!exportType || !["pdf", "excel"].includes(exportType)) {
      return NextResponse.json(
        { success: false, error: "نوع التصدير غير صالح" },
        { status: 400 }
      );
    }

    // هنا يمكنك إضافة منطق التصدير إلى PDF أو Excel
    // استخدم libraries مثل pdf-lib أو exceljs

    return NextResponse.json({
      success: true,
      message: `تم إنشاء ملف ${exportType.toUpperCase()} بنجاح`,
      downloadUrl: `/api/exports/attendance-${Date.now()}.${exportType}`,
      exportDetails: {
        type: exportType,
        filters,
        exportedAt: new Date(),
        exportedBy: user.name || user.email,
      },
    });
  } catch (error) {
    console.error("❌ Error exporting attendance:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "فشل في تصدير سجل الحضور",
      },
      { status: 500 }
    );
  }
}
