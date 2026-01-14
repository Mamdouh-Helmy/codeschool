import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Group from "../../../models/Group";
import Course from "../../../models/Course";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    console.log("📊 [API Dashboard Attendance] GET request received");
    
    await connectDB();

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const month = searchParams.get("month");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status"); // "all", "completed", "scheduled"

    console.log("📋 [API Dashboard Attendance] Params:", {
      groupId, 
      month, 
      page, 
      limit,
      status
    });

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log("❌ [API Dashboard Attendance] Unauthorized - No user found");
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    console.log("✅ [API Dashboard Attendance] User authenticated:", {
      id: user.id,
      name: user.name,
      role: user.role,
    });

    // جلب الطالب المرتبط بالمستخدم
    const student = await Student.findOne({ authUserId: user.id })
      .select("_id academicInfo.groupIds")
      .lean();

    if (!student) {
      console.log("⚠️ [API Dashboard Attendance] No student found for user:", user.id);
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0,
          upcomingCount: 0,
          groups: [],
        },
        warnings: [],
        metadata: {
          message: "لا توجد جلسات للطالب"
        }
      });
    }

    const studentId = student._id;
    const allGroupIds = student.academicInfo?.groupIds || [];

    let groupIds = allGroupIds;
    if (groupId && groupId !== "all") {
      if (allGroupIds.some(gId => gId.toString() === groupId)) {
        groupIds = [new mongoose.Types.ObjectId(groupId)];
      } else {
        console.log("⚠️ [API Dashboard Attendance] Student not in selected group");
        return NextResponse.json({
          success: true,
          data: [],
          summary: {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendanceRate: 0,
            upcomingCount: 0,
            groups: [],
          },
          warnings: [],
        });
      }
    } else {
      // تحويل جميع IDs إلى ObjectId
      groupIds = groupIds.map(id => new mongoose.Types.ObjectId(id));
    }

    if (groupIds.length === 0) {
      console.log("⚠️ [API Dashboard Attendance] Student has no groups");
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          attendanceRate: 0,
          upcomingCount: 0,
          groups: [],
        },
        warnings: [],
      });
    }

    console.log("📊 [API Dashboard Attendance] Student group IDs:", groupIds.length);

    // ========== جلب الجلسات المكتملة فقط ==========
    console.log("🔍 [API Dashboard Attendance] Fetching completed sessions...");
    
    let completedSessionsQuery = {
      groupId: { $in: groupIds },
      isDeleted: false,
      status: "completed", // فقط الجلسات المكتملة
      attendanceTaken: true // فقط الجلسات اللي اتعمل فيها أخذ حضور
    };

    // فلترة حسب الشهر للجلسات المكتملة
    if (month && month !== "all") {
      const [year, monthNum] = month.split('-');
      if (year && monthNum) {
        const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
        
        completedSessionsQuery.scheduledDate = {
          $gte: startDate,
          $lte: endDate
        };
      }
    }

    // جلب الجلسات المكتملة
    const completedSessions = await Session.find(completedSessionsQuery)
      .populate({
        path: "groupId",
        model: Group,
        select: "name code"
      })
      .populate({
        path: "courseId",
        model: Course,
        select: "title"
      })
      .sort({ scheduledDate: -1 })
      .lean();

    console.log("✅ [API Dashboard Attendance] Completed sessions found:", completedSessions.length);

    // ========== حساب إحصائيات الحضور للجلسات المكتملة فقط ==========
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    
    const completedFormattedSessions = completedSessions.map((session) => {
      let attendanceStatus = "لم يتم التسجيل";
      let attendanceNotes = "";
      let markedAt = "";
      
      // البحث عن سجل حضور الطالب
      if (session.attendance) {
        const attendanceRecord = session.attendance.find(
          (a) => a.studentId.toString() === studentId.toString()
        );
        if (attendanceRecord) {
          attendanceStatus = attendanceRecord.status;
          attendanceNotes = attendanceRecord.notes || "";
          markedAt = attendanceRecord.markedAt || "";
          
          // تحديث الإحصائيات
          switch (attendanceStatus) {
            case "present":
              present++;
              break;
            case "absent":
              absent++;
              break;
            case "late":
              late++;
              break;
            case "excused":
              excused++;
              break;
            default:
              absent++;
          }
        } else {
          // إذا مفيش سجل حضور للطالب في جلسة مكتملة → غائب
          attendanceStatus = "absent";
          absent++;
        }
      } else {
        // إذا مفيش حضور في جلسة مكتملة → غائب
        attendanceStatus = "absent";
        absent++;
      }

      return {
        id: session._id.toString(),
        title: session.title,
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: "completed", // تأكيد حالة الجلسة
        moduleIndex: session.moduleIndex,
        sessionNumber: session.sessionNumber,
        lessonIndexes: session.lessonIndexes || [],
        attendanceStatus: attendanceStatus,
        attendanceNotes: attendanceNotes,
        markedAt: markedAt,
        meetingLink: session.meetingLink || "",
        recordingLink: session.recordingLink || "",
        group: {
          id: session.groupId?._id?.toString() || "",
          name: session.groupId?.name || "غير محدد",
          code: session.groupId?.code || "غير محدد",
        },
        course: {
          title: session.courseId?.title || "غير محدد",
        },
      };
    });

    // ========== جلب الجلسات المجدولة فقط ==========
    console.log("🔍 [API Dashboard Attendance] Fetching upcoming sessions...");
    
    const now = new Date();
    const upcomingSessionsQuery = {
      groupId: { $in: groupIds },
      isDeleted: false,
      status: "scheduled", // الجلسات المجدولة فقط
      scheduledDate: { $gte: now } // في المستقبل فقط
    };

    // فلترة حسب الشهر للجلسات المجدولة
    if (month && month !== "all") {
      const [year, monthNum] = month.split('-');
      if (year && monthNum) {
        const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
        
        upcomingSessionsQuery.scheduledDate = {
          $gte: startDate,
          $lte: endDate
        };
      }
    }

    const upcomingSessions = await Session.find(upcomingSessionsQuery)
      .populate({
        path: "groupId",
        model: Group,
        select: "name code"
      })
      .populate({
        path: "courseId",
        model: Course,
        select: "title"
      })
      .sort({ scheduledDate: 1 }) // الأقرب أولاً
      .lean();

    console.log("✅ [API Dashboard Attendance] Upcoming sessions found:", upcomingSessions.length);

    // ========== تنسيق الجلسات المجدولة ==========
    const upcomingFormattedSessions = upcomingSessions.map((session) => {
      return {
        id: session._id.toString(),
        title: session.title,
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: "scheduled", // تأكيد حالة الجلسة
        moduleIndex: session.moduleIndex,
        sessionNumber: session.sessionNumber,
        lessonIndexes: session.lessonIndexes || [],
        attendanceStatus: "لم يبدأ بعد", // حالة خاصة للجلسات المجدولة
        attendanceNotes: "الجلسة لم تبدأ بعد",
        markedAt: "",
        meetingLink: session.meetingLink || "",
        recordingLink: "",
        group: {
          id: session.groupId?._id?.toString() || "",
          name: session.groupId?.name || "غير محدد",
          code: session.groupId?.code || "غير محدد",
        },
        course: {
          title: session.courseId?.title || "غير محدد",
        },
      };
    });

    // ========== دمج وتصفية النتائج حسب فلتر الحالة ==========
    let allSessions = [];
    
    if (status === "all" || !status) {
      // عرض كل الجلسات (المكتملة + المجدولة)
      allSessions = [...upcomingFormattedSessions, ...completedFormattedSessions];
    } else if (status === "completed") {
      // عرض الجلسات المكتملة فقط
      allSessions = completedFormattedSessions;
    } else if (status === "scheduled") {
      // عرض الجلسات المجدولة فقط
      allSessions = upcomingFormattedSessions;
    }

    // ========== تطبيق الباجينيشن ==========
    const totalSessions = allSessions.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSessions = allSessions.slice(startIndex, endIndex);

    // ========== حساب نسبة الحضور (فقط على الجلسات المكتملة) ==========
    const totalCompletedSessions = present + absent + late + excused;
    const attendanceRate = totalCompletedSessions > 0 
      ? Math.round(((present + late + excused) / totalCompletedSessions) * 100)
      : 0;

    console.log("📊 [API Dashboard Attendance] Attendance Stats:", {
      completedSessions: totalCompletedSessions,
      present,
      absent,
      late,
      excused,
      attendanceRate: `${attendanceRate}%`,
      calculation: `(${present}+${late}+${excused})/${totalCompletedSessions}`,
      upcomingSessions: upcomingSessions.length
    });

    // ========== جلب قائمة المجموعات للفلتر ==========
    const groups = await Group.find({
      _id: { $in: allGroupIds.map(id => new mongoose.Types.ObjectId(id)) },
      isDeleted: false,
    })
    .select("name code status")
    .lean();

    console.log("✅ [API Dashboard Attendance] Groups found:", groups.length);

    // ========== إنشاء تحذيرات ==========
    const warnings = [];
    if (totalCompletedSessions > 0 && attendanceRate < 80) {
      warnings.push({
        type: "low_attendance",
        message: `⚠️ انتبه! نسبة حضورك ${attendanceRate}% - يجب أن تكون 80% على الأقل`,
        level: "danger"
      });
    }

    if (absent > 0) {
      warnings.push({
        type: "absences",
        message: `⚠️ لديك ${absent} غياب في الجلسات المكتملة`,
        level: "warning"
      });
    }

    if (totalCompletedSessions === 0 && upcomingSessions.length === 0) {
      warnings.push({
        type: "no_sessions",
        message: "لا توجد جلسات لعرضها",
        level: "warning"
      });
    }

    // ========== بناء الرد النهائي ==========
    const response = {
      success: true,
      data: paginatedSessions,
      summary: {
        total: totalCompletedSessions, // ✅ فقط الجلسات المكتملة
        present,
        absent,
        late,
        excused,
        attendanceRate,
        upcomingCount: upcomingSessions.length, // ✅ عدد الجلسات المجدولة
        groups: groups.map(g => ({
          id: g._id.toString(),
          name: g.name,
          code: g.code,
          status: g.status
        })),
      },
      warnings,
      pagination: {
        page,
        limit,
        total: totalSessions,
        pages: Math.ceil(totalSessions / limit),
        hasNext: endIndex < totalSessions,
        hasPrev: page > 1
      },
      metadata: {
        message: `عرض ${paginatedSessions.length} جلسة من ${totalSessions}`,
        filters: {
          group: groupId,
          month,
          status,
          dateRange: month ? `شهر ${month}` : "جميع الأشهر"
        },
        stats: {
          completed: totalCompletedSessions,
          upcoming: upcomingSessions.length,
          all: totalSessions
        }
      }
    };

    console.log("✅ [API Dashboard Attendance] Response ready");
    return NextResponse.json(response);
    
  } catch (error) {
    console.error("❌ [API Dashboard Attendance] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب سجل الحضور",
        error: error.message,
        details: error.stack?.split('\n')[0] || "No stack trace"
      },
      { status: 500 }
    );
  }
}