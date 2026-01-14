import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../../../models/Group";
import Student from "../../../../../models/Student";
import Session from "../../../../../models/Session";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    console.log(
      "👨‍🎓 [Instructor Group Students API] Request received for group:",
      id
    );

    // التحقق من صحة الـ ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "معرف المجموعة غير صالح" },
        { status: 400 }
      );
    }

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);

    if (!user) {
      console.log(
        "❌ [Instructor Group Students] Unauthorized - No user found"
      );
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // التحقق من أن المستخدم مدرس
    if (user.role !== "instructor" && user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح - يجب أن تكون مدرساً",
          code: "NOT_INSTRUCTOR",
        },
        { status: 403 }
      );
    }

    await connectDB();

    // التحقق من أن المدرس معين في المجموعة
    const group = await Group.findOne({
      _id: id,
      instructors: user.id,
      isDeleted: false,
    });

    if (!group) {
      return NextResponse.json(
        {
          success: false,
          message: "المجموعة غير موجودة أو غير مصرح لك بالوصول",
          code: "GROUP_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // all, active, at-risk, excellent
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // بناء استعلام الطلاب
    let studentQuery = {
      "academicInfo.groupIds": new mongoose.Types.ObjectId(id),
      isDeleted: false,
    };

    // فلترة حسب البحث
    if (search) {
      studentQuery.$or = [
        { "personalInfo.fullName": { $regex: search, $options: "i" } },
        { "personalInfo.email": { $regex: search, $options: "i" } },
        { enrollmentNumber: { $regex: search, $options: "i" } },
      ];
    }

    console.log(`🔍 [Instructor Group Students] Student query:`, {
      groupId: id,
      search,
      status,
      page,
      limit,
    });

    // جلب الطلاب
    const students = await Student.find(studentQuery)
      .select(
        "personalInfo.fullName personalInfo.email personalInfo.phone personalInfo.whatsappNumber enrollmentNumber guardianInfo communicationPreferences enrollmentInfo"
      )
      .sort({ "personalInfo.fullName": 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log(
      `✅ [Instructor Group Students] Found ${students.length} students`
    );

    // جلب جميع جلسات المجموعة لحساب الإحصائيات
    const groupSessions = await Session.find({
      groupId: id,
      isDeleted: false,
      attendanceTaken: true,
    })
      .select("attendance scheduledDate")
      .lean();

    // حساب إحصائيات الحضور لكل طالب
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        // حساب الحضور
        let attended = 0;
        let totalSessions = groupSessions.length;
        let lastAttendanceDate = null;
        let attendanceRecords = [];

        groupSessions.forEach((session) => {
          const attendanceRecord = session.attendance?.find(
            (a) => a.studentId.toString() === student._id.toString()
          );

          if (attendanceRecord) {
            attendanceRecords.push({
              date: session.scheduledDate,
              status: attendanceRecord.status,
              notes: attendanceRecord.notes,
            });

            if (attendanceRecord.status === "present") {
              attended++;
            }

            if (
              !lastAttendanceDate ||
              new Date(session.scheduledDate) > new Date(lastAttendanceDate)
            ) {
              lastAttendanceDate = session.scheduledDate;
            }
          }
        });

        const attendanceRate =
          totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

        // حساب تسلسل الغياب
        let consecutiveAbsences = 0;
        const sortedRecords = attendanceRecords.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        for (const record of sortedRecords) {
          if (record.status === "absent") {
            consecutiveAbsences++;
          } else {
            break;
          }
        }

        // تحديد حالة الطالب
        let performanceStatus = "good";
        if (attendanceRate < 60) {
          performanceStatus = "danger";
        } else if (attendanceRate < 80) {
          performanceStatus = "warning";
        }

        let attentionStatus = "normal";
        if (consecutiveAbsences >= 3) {
          attentionStatus = "urgent";
        } else if (consecutiveAbsences >= 2) {
          attentionStatus = "warning";
        }

        return {
          id: student._id,
          name: student.personalInfo?.fullName || "غير معروف",
          email: student.personalInfo?.email,
          phone: student.personalInfo?.phone,
          whatsapp: student.personalInfo?.whatsappNumber,
          enrollmentNumber: student.enrollmentNumber,
          guardianInfo: student.guardianInfo || {},
          communicationPreferences: student.communicationPreferences || {},
          enrollmentInfo: student.enrollmentInfo || {},
          attendance: {
            rate: attendanceRate,
            attended,
            totalSessions,
            lastAttendance: lastAttendanceDate,
            consecutiveAbsences,
            records: attendanceRecords.slice(0, 5), // آخر 5 سجلات
            performance: performanceStatus,
            needsAttention: attentionStatus,
          },
          metadata: {
            lastUpdated: new Date(),
          },
        };
      })
    );

    // تطبيق فلترة الحالة إذا كانت موجودة
    let filteredStudents = studentsWithStats;
    if (status && status !== "all") {
      switch (status) {
        case "at-risk":
          filteredStudents = studentsWithStats.filter(
            (s) =>
              s.attendance.needsAttention === "urgent" ||
              s.attendance.performance === "danger"
          );
          break;
        case "warning":
          filteredStudents = studentsWithStats.filter(
            (s) =>
              s.attendance.needsAttention === "warning" ||
              s.attendance.performance === "warning"
          );
          break;
        case "excellent":
          filteredStudents = studentsWithStats.filter(
            (s) =>
              s.attendance.performance === "good" && s.attendance.rate >= 90
          );
          break;
        case "needs-followup":
          filteredStudents = studentsWithStudents.filter(
            (s) =>
              s.attendance.consecutiveAbsences >= 2 || s.attendance.rate < 70
          );
          break;
      }
    }

    // إحصائيات الطلاب
    const stats = {
      total: students.length,
      filtered: filteredStudents.length,
      attendanceBreakdown: {
        excellent: studentsWithStats.filter((s) => s.attendance.rate >= 90)
          .length,
        good: studentsWithStats.filter(
          (s) => s.attendance.rate >= 80 && s.attendance.rate < 90
        ).length,
        warning: studentsWithStats.filter(
          (s) => s.attendance.rate >= 60 && s.attendance.rate < 80
        ).length,
        danger: studentsWithStats.filter((s) => s.attendance.rate < 60).length,
      },
      attentionBreakdown: {
        normal: studentsWithStats.filter(
          (s) => s.attendance.needsAttention === "normal"
        ).length,
        warning: studentsWithStats.filter(
          (s) => s.attendance.needsAttention === "warning"
        ).length,
        urgent: studentsWithStats.filter(
          (s) => s.attendance.needsAttention === "urgent"
        ).length,
      },
      averageAttendance:
        studentsWithStats.length > 0
          ? Math.round(
              studentsWithStats.reduce((sum, s) => sum + s.attendance.rate, 0) /
                studentsWithStats.length
            )
          : 0,
    };

    const response = {
      success: true,
      data: filteredStudents,
      pagination: {
        page,
        limit,
        total: students.length,
        filteredTotal: filteredStudents.length,
        pages: Math.ceil(students.length / limit),
        hasNext: page * limit < students.length,
        hasPrev: page > 1,
      },
      stats,
      filters: {
        search: search || "",
        status: status || "all",
        applied: {
          search: !!search,
          status: status && status !== "all",
        },
      },
      groupInfo: {
        id: group._id,
        name: group.name,
        code: group.code,
        totalSessions: groupSessions.length,
      },
    };

    console.log("✅ [Instructor Group Students] Response ready:", {
      students: filteredStudents.length,
      stats,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Instructor Group Students API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب طلاب المجموعة",
        error: error.message,
        code: "GROUP_STUDENTS_ERROR",
      },
      { status: 500 }
    );
  }
}
