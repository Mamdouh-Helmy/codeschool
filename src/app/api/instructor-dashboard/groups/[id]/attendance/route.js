// app/api/instructor-dashboard/groups/[id]/attendance/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../../../models/Group";
import Student from "../../../../../models/Student";
import Session from "../../../../../models/Session";
import Course from "../../../../../models/Course";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("student");
    const filterType = searchParams.get("filter") || "all";
    const moduleFilter = searchParams.get("module");
    const statusFilter = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    console.log("📊 [Group Attendance API] Request received for group:", id, "student:", studentId);

    // التحقق من صحة الـ IDs
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "معرف المجموعة غير صالح" },
        { status: 400 }
      );
    }

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);

    if (!user) {
      console.log("❌ [Group Attendance] Unauthorized - No user found");
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
    }).populate("courseId", "title level");

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

    // إذا كان هناك طالب محدد، التحقق من وجوده في المجموعة
    let student = null;
    if (studentId) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return NextResponse.json(
          { success: false, message: "معرف الطالب غير صالح" },
          { status: 400 }
        );
      }

      student = await Student.findOne({
        _id: studentId,
        "academicInfo.groupIds": new mongoose.Types.ObjectId(id),
        isDeleted: false,
      })
        .select("personalInfo.fullName personalInfo.email enrollmentNumber guardianInfo")
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
    }

    // بناء استعلام الجلسات
    let sessionQuery = {
      groupId: id,
      isDeleted: false,
    };

    // تطبيق الفلاتر
    if (moduleFilter && moduleFilter !== "all") {
      sessionQuery.moduleIndex = parseInt(moduleFilter);
    }

    if (statusFilter && statusFilter !== "all") {
      sessionQuery.status = statusFilter;
    }

    if (dateFrom) {
      sessionQuery.scheduledDate = { ...sessionQuery.scheduledDate, $gte: new Date(dateFrom) };
    }

    if (dateTo) {
      sessionQuery.scheduledDate = { ...sessionQuery.scheduledDate, $lte: new Date(dateTo) };
    }

    // جلب الجلسات مع الترحيل
    const totalSessions = await Session.countDocuments(sessionQuery);
    const sessions = await Session.find(sessionQuery)
      .select("title scheduledDate startTime endTime status moduleIndex sessionNumber attendance attendanceTaken lessonIndexes")
      .sort({ scheduledDate: -1, startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // معالجة بيانات الجلسات
    const processedSessions = sessions.map(session => {
      let studentAttendance = null;
      let studentAttendanceStatus = "not_marked";
      
      if (studentId && session.attendance) {
        const attendanceRecord = session.attendance.find(
          a => a.studentId.toString() === studentId.toString()
        );
        
        if (attendanceRecord) {
          studentAttendance = attendanceRecord;
          studentAttendanceStatus = attendanceRecord.status;
        } else if (session.attendanceTaken) {
          studentAttendanceStatus = "not_recorded";
        }
      }

      return {
        id: session._id,
        title: session.title,
        date: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        moduleIndex: session.moduleIndex,
        sessionNumber: session.sessionNumber,
        lessonIndexes: session.lessonIndexes || [],
        attendanceTaken: session.attendanceTaken,
        studentAttendance: studentAttendance,
        studentAttendanceStatus: studentAttendanceStatus,
        totalAttendance: session.attendance?.length || 0,
        presentCount: session.attendance?.filter(a => a.status === "present").length || 0,
        absentCount: session.attendance?.filter(a => a.status === "absent").length || 0,
      };
    });

    // جلب إحصائيات الحضور العامة للمجموعة
    const allSessions = await Session.find({
      groupId: id,
      isDeleted: false,
      attendanceTaken: true,
    })
      .select("attendance")
      .lean();

    // حساب إحصائيات المجموعة
    let groupStats = {
      totalSessions: allSessions.length,
      sessionsWithAttendance: 0,
      totalAttendanceRecords: 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      excusedCount: 0,
    };

    allSessions.forEach(session => {
      if (session.attendance && session.attendance.length > 0) {
        groupStats.sessionsWithAttendance++;
        groupStats.totalAttendanceRecords += session.attendance.length;
        
        session.attendance.forEach(record => {
          switch (record.status) {
            case "present":
              groupStats.presentCount++;
              break;
            case "absent":
              groupStats.absentCount++;
              break;
            case "late":
              groupStats.lateCount++;
              break;
            case "excused":
              groupStats.excusedCount++;
              break;
          }
        });
      }
    });

    // إذا كان هناك طالب محدد، حساب إحصائياته
    let studentStats = null;
    if (studentId) {
      studentStats = {
        totalSessions: allSessions.length,
        attended: 0,
        attendanceRate: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        lastAttendance: null,
        consecutiveAbsences: 0,
        attendanceRecords: [],
      };

      const studentAttendanceRecords = [];
      
      allSessions.forEach(session => {
        if (session.attendance) {
          const attendanceRecord = session.attendance.find(
            a => a.studentId.toString() === studentId.toString()
          );
          
          if (attendanceRecord) {
            studentAttendanceRecords.push({
              sessionId: session._id,
              status: attendanceRecord.status,
              date: session.scheduledDate,
              notes: attendanceRecord.notes,
            });

            switch (attendanceRecord.status) {
              case "present":
                studentStats.presentCount++;
                studentStats.attended++;
                break;
              case "absent":
                studentStats.absentCount++;
                break;
              case "late":
                studentStats.lateCount++;
                studentStats.attended++; // يعتبر متأخر حاضر
                break;
              case "excused":
                studentStats.excusedCount++;
                break;
            }

            // تحديث آخر حضور
            if (!studentStats.lastAttendance || new Date(session.scheduledDate) > new Date(studentStats.lastAttendance)) {
              studentStats.lastAttendance = session.scheduledDate;
            }
          }
        }
      });

      // حساب نسبة الحضور
      studentStats.attendanceRate = allSessions.length > 0 
        ? Math.round((studentStats.attended / allSessions.length) * 100) 
        : 0;

      // حساب الغياب المتتالي
      const sortedRecords = studentAttendanceRecords.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      for (const record of sortedRecords) {
        if (record.status === "absent") {
          studentStats.consecutiveAbsences++;
        } else {
          break;
        }
      }

      studentStats.attendanceRecords = studentAttendanceRecords;
    }

    // جلب قائمة الموديولات المتاحة
    const availableModules = await Session.aggregate([
      {
        $match: {
          groupId: new mongoose.Types.ObjectId(id),
          isDeleted: false,
        }
      },
      {
        $group: {
          _id: "$moduleIndex",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const response = {
      success: true,
      data: {
        groupInfo: {
          id: group._id,
          name: group.name,
          code: group.code,
          course: group.courseId ? {
            title: group.courseId.title,
            level: group.courseId.level,
          } : null,
        },
        student: student ? {
          id: student._id,
          name: student.personalInfo?.fullName || "غير معروف",
          email: student.personalInfo?.email,
          enrollmentNumber: student.enrollmentNumber,
          guardianInfo: student.guardianInfo,
        } : null,
        sessions: processedSessions,
        groupStats,
        studentStats,
        filters: {
          current: {
            student: studentId || null,
            filterType,
            moduleFilter: moduleFilter || "all",
            statusFilter: statusFilter || "all",
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
          },
          availableModules: availableModules.map(m => ({
            moduleIndex: m._id,
            moduleNumber: m._id + 1,
            sessionCount: m.count,
          })),
          availableStatuses: [
            { value: "all", label: "جميع الحالات" },
            { value: "scheduled", label: "مجدولة" },
            { value: "completed", label: "مكتملة" },
            { value: "cancelled", label: "ملغاة" },
            { value: "postponed", label: "مؤجلة" },
          ],
        },
        pagination: {
          page,
          limit,
          total: totalSessions,
          pages: Math.ceil(totalSessions / limit),
          hasNext: page * limit < totalSessions,
          hasPrev: page > 1,
        },
      },
    };

    console.log("✅ [Group Attendance] Response ready:", {
      sessions: processedSessions.length,
      studentStats: studentStats ? "available" : "not available",
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Group Attendance API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب بيانات الحضور",
        error: error.message,
        code: "GROUP_ATTENDANCE_ERROR",
      },
      { status: 500 }
    );
  }
}