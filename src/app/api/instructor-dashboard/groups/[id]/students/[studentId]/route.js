// app/api/instructor-dashboard/groups/[id]/students/[studentId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../../../../models/Group";
import Student from "../../../../../../models/Student";
import Session from "../../../../../../models/Session";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    const { id, studentId } = await params;
    console.log("👨‍🎓 [Student Details API] Request received for student:", studentId, "in group:", id);

    // التحقق من صحة الـ IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json(
        { success: false, message: "معرف غير صالح" },
        { status: 400 }
      );
    }

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);

    if (!user) {
      console.log("❌ [Student Details] Unauthorized - No user found");
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

    // جلب بيانات الطالب
    const student = await Student.findOne({
      _id: studentId,
      "academicInfo.groupIds": new mongoose.Types.ObjectId(id),
      isDeleted: false,
    })
      .select("-__v -isDeleted -deletedAt -whatsappMessages -sessionReminders")
      .lean();

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "الطالب غير موجود في هذه المجموعة",
          code: "STUDENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // جلب جميع جلسات المجموعة لحساب الإحصائيات
    const groupSessions = await Session.find({
      groupId: id,
      isDeleted: false,
      attendanceTaken: true,
    })
      .select("title scheduledDate startTime endTime status moduleIndex sessionNumber attendance")
      .sort({ scheduledDate: -1 })
      .lean();

    // حساب إحصائيات الحضور
    let totalSessions = groupSessions.length;
    let attended = 0;
    let attendanceRecords = [];
    let attendanceByDate = {};
    let lastAttendanceDate = null;
    let consecutiveAbsences = 0;

    // حساب تسلسل الحضور الحالي (Current Streak)
    let currentStreak = 0;
    
    groupSessions.forEach((session) => {
      const attendanceRecord = session.attendance?.find(
        (a) => a.studentId.toString() === studentId.toString()
      );

      if (attendanceRecord) {
        attendanceRecords.push({
          sessionId: session._id,
          title: session.title,
          date: session.scheduledDate,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
          moduleIndex: session.moduleIndex,
          sessionNumber: session.sessionNumber,
          attendanceStatus: attendanceRecord.status,
          notes: attendanceRecord.notes,
          markedAt: attendanceRecord.markedAt,
        });

        if (attendanceRecord.status === "present") {
          attended++;
        }

        const dateKey = new Date(session.scheduledDate).toISOString().split('T')[0];
        attendanceByDate[dateKey] = attendanceRecord.status;

        if (!lastAttendanceDate || new Date(session.scheduledDate) > new Date(lastAttendanceDate)) {
          lastAttendanceDate = session.scheduledDate;
        }
      }
    });

    // حساب تسلسل الغياب
    const sortedRecords = attendanceRecords.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    for (const record of sortedRecords) {
      if (record.attendanceStatus === "absent") {
        consecutiveAbsences++;
      } else {
        break;
      }
    }

    // حساب تسلسل الحضور الحالي (Current Streak)
    const sortedByDate = attendanceRecords.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    
    for (const record of sortedByDate) {
      if (record.attendanceStatus === "present") {
        currentStreak++;
      } else {
        break;
      }
    }

    const attendanceRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

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

    // إحصائيات الحضور
    const presentCount = attendanceRecords.filter(r => r.attendanceStatus === "present").length;
    const absentCount = attendanceRecords.filter(r => r.attendanceStatus === "absent").length;
    const lateCount = attendanceRecords.filter(r => r.attendanceStatus === "late").length;
    const excusedCount = attendanceRecords.filter(r => r.attendanceStatus === "excused").length;

    const response = {
      success: true,
      data: {
        student: {
          id: student._id,
          personalInfo: student.personalInfo || {},
          guardianInfo: student.guardianInfo || {},
          enrollmentInfo: student.enrollmentInfo || {},
          communicationPreferences: student.communicationPreferences || {},
          enrollmentNumber: student.enrollmentNumber,
          metadata: student.metadata || {},
        },
        attendance: {
          rate: attendanceRate,
          attended,
          totalSessions,
          lastAttendance: lastAttendanceDate,
          consecutiveAbsences,
          performance: performanceStatus,
          needsAttention: attentionStatus,
          records: attendanceRecords,
          byDate: attendanceByDate,
        },
        groupInfo: {
          id: group._id,
          name: group.name,
          code: group.code,
          totalSessions: groupSessions.length,
          course: null, // يمكن إضافة معلومات الكورس إذا كانت موجودة
        },
        stats: {
          totalAttendanceRecords: attendanceRecords.length,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          attendanceTrends: calculateAttendanceTrends(attendanceRecords),
          currentStreak: currentStreak,
        },
      },
    };

    console.log("✅ [Student Details] Response ready");
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Student Details API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب بيانات الطالب",
        error: error.message,
        code: "STUDENT_DETAILS_ERROR",
      },
      { status: 500 }
    );
  }
}

function calculateAttendanceTrends(attendanceRecords) {
  if (attendanceRecords.length < 2) {
    return {
      trend: "stable",
      change: 0,
      direction: "none",
    };
  }

  // تحليل الاتجاه من آخر 10 سجلات
  const recentRecords = attendanceRecords.slice(0, 10);
  let presentCount = 0;
  
  recentRecords.forEach(record => {
    if (record.attendanceStatus === "present") {
      presentCount++;
    }
  });

  const attendancePercentage = (presentCount / recentRecords.length) * 100;
  
  // حساب نسبة التغير
  let change = 0;
  let direction = "none";
  let trend = "stable";
  
  if (attendancePercentage >= 80) {
    trend = "improving";
    direction = "up";
    change = 10; // يمكن حساب نسبة التغير الفعلية
  } else if (attendancePercentage >= 60) {
    trend = "stable";
    direction = "stable";
    change = 0;
  } else {
    trend = "declining";
    direction = "down";
    change = 10; // يمكن حساب نسبة التغير الفعلية
  }

  return {
    trend,
    change,
    direction,
    recentAttendance: attendancePercentage,
  };
}