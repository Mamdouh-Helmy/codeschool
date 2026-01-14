import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import Student from "../../../../models/Student";
import Course from "../../../../models/Course";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    console.log("👥 [Instructor Group Details API] Request received for group:", id);

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
      console.log("❌ [Instructor Group Details] Unauthorized - No user found");
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
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
          code: "NOT_INSTRUCTOR"
        },
        { status: 403 }
      );
    }

    await connectDB();

    // جلب المجموعة مع التحقق من أن المدرس معين فيها
    const group = await Group.findOne({
      _id: id,
      instructors: user.id,
      isDeleted: false
    })
      .populate("courseId", "title level description curriculum")
      .populate("instructors", "name email profile")
      .lean();

    if (!group) {
      console.log(`❌ [Instructor Group Details] Group ${id} not found or instructor not assigned`);
      return NextResponse.json(
        { 
          success: false, 
          message: "المجموعة غير موجودة أو غير مصرح لك بالوصول",
          code: "GROUP_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    console.log(`✅ [Instructor Group Details] Found group: ${group.name} (${group.code})`);

    // ==================== جلب جميع الجلسات ====================
    console.log("📅 [Instructor Group Details] Fetching all sessions...");
    
    const allSessions = await Session.find({
      groupId: id,
      isDeleted: false
    })
      .sort({ scheduledDate: 1, startTime: 1 })
      .lean();

    // تجميع الجلسات حسب الموديول
    const sessionsByModule = {};
    allSessions.forEach((session) => {
      const moduleKey = `module_${session.moduleIndex}`;
      if (!sessionsByModule[moduleKey]) {
        sessionsByModule[moduleKey] = {
          moduleIndex: session.moduleIndex,
          moduleNumber: session.moduleIndex + 1,
          sessions: [],
        };
      }
      
      sessionsByModule[moduleKey].sessions.push({
        id: session._id,
        title: session.title,
        scheduledDate: session.scheduledDate,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        sessionNumber: session.sessionNumber,
        lessonIndexes: session.lessonIndexes || [],
        attendanceTaken: session.attendanceTaken || false,
        meetingLink: session.meetingLink || "",
        recordingLink: session.recordingLink || "",
      });
    });

    // تحويل إلى مصفوفة وترتيبها
    const modulesArray = Object.values(sessionsByModule).sort(
      (a, b) => a.moduleIndex - b.moduleIndex
    );

    // ==================== جلب جميع الطلاب ====================
    console.log("👨‍🎓 [Instructor Group Details] Fetching all students...");
    
    const students = await Student.find({
      "academicInfo.groupIds": new mongoose.Types.ObjectId(id),
      isDeleted: false
    })
      .select("personalInfo.fullName personalInfo.email personalInfo.phone personalInfo.whatsappNumber enrollmentNumber guardianInfo attendanceStats")
      .lean();

    console.log(`✅ [Instructor Group Details] Found ${students.length} students`);

    // ✅ FIX: حساب عدد الطلاب الفعلي من قاعدة البيانات
    const studentCount = students.length;

    // ==================== حساب إحصائيات الحضور للطلاب ====================
    console.log("📊 [Instructor Group Details] Calculating attendance statistics...");
    
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        // جلب حضور الطالب في جميع جلسات هذه المجموعة
        const studentSessions = await Session.find({
          groupId: id,
          isDeleted: false,
          attendanceTaken: true
        })
          .select("attendance scheduledDate status")
          .lean();

        let attended = 0;
        let totalSessions = studentSessions.length;
        let lastAttendance = null;
        let attendanceStreak = 0;
        let consecutiveAbsences = 0;

        studentSessions.forEach((session) => {
          const attendanceRecord = session.attendance?.find(
            a => a.studentId.toString() === student._id.toString()
          );

          if (attendanceRecord) {
            if (attendanceRecord.status === "present") {
              attended++;
              attendanceStreak++;
              consecutiveAbsences = 0;
            } else if (attendanceRecord.status === "absent") {
              attendanceStreak = 0;
              consecutiveAbsences++;
            }
            
            if (!lastAttendance || new Date(session.scheduledDate) > new Date(lastAttendance)) {
              lastAttendance = session.scheduledDate;
            }
          }
        });

        const attendanceRate = totalSessions > 0 
          ? Math.round((attended / totalSessions) * 100)
          : 0;

        return {
          id: student._id,
          name: student.personalInfo?.fullName || "غير معروف",
          email: student.personalInfo?.email,
          phone: student.personalInfo?.phone,
          whatsapp: student.personalInfo?.whatsappNumber,
          enrollmentNumber: student.enrollmentNumber,
          guardianInfo: student.guardianInfo || {},
          attendance: {
            rate: attendanceRate,
            attended,
            totalSessions,
            lastAttendance,
            streak: attendanceStreak,
            consecutiveAbsences,
            status: attendanceRate >= 80 ? "good" : 
                   attendanceRate >= 60 ? "warning" : "danger"
          },
          needsAttention: attendanceRate < 70 || consecutiveAbsences >= 2
        };
      })
    );

    // ==================== إحصائيات المجموعة ====================
    console.log("📈 [Instructor Group Details] Calculating group statistics...");
    
    const totalSessions = allSessions.length;
    const completedSessions = allSessions.filter(s => s.status === "completed").length;
    const upcomingSessions = allSessions.filter(s => s.status === "scheduled").length;

    // حساب نسبة الحضور العامة
    const sessionsWithAttendance = allSessions.filter(s => s.attendanceTaken);
    let totalAttendanceRecords = 0;
    let totalPossibleAttendance = 0;

    sessionsWithAttendance.forEach(session => {
      totalAttendanceRecords += session.attendance?.length || 0;
      // ✅ FIX: استخدم studentCount بدلاً من currentStudentsCount
      totalPossibleAttendance += studentCount;
    });

    const overallAttendanceRate = totalPossibleAttendance > 0 
      ? Math.round((totalAttendanceRecords / totalPossibleAttendance) * 100)
      : 0;

    // ✅ FIX: الجلسة التالية مع إضافة meetingLink
    const now = new Date();
    const nextSession = allSessions.find(s => 
      new Date(s.scheduledDate) >= now && s.status === "scheduled"
    );

    // ✅ FIX: الجلسة الأخيرة مع إضافة meetingLink
    const lastSession = allSessions
      .filter(s => s.status === "completed")
      .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))[0];

    // الطلاب المحتاجين متابعة
    const studentsNeedingAttention = studentsWithStats.filter(s => s.needsAttention);

    // ==================== إحصائيات الموديولات ====================
    console.log("📚 [Instructor Group Details] Calculating module statistics...");
    
    const moduleStats = modulesArray.map(module => {
      const moduleSessions = module.sessions;
      const completed = moduleSessions.filter(s => s.status === "completed").length;
      const attendanceTaken = moduleSessions.filter(s => s.attendanceTaken).length;
      
      return {
        moduleNumber: module.moduleNumber,
        totalSessions: moduleSessions.length,
        completedSessions: completed,
        attendanceTaken,
        progress: moduleSessions.length > 0 
          ? Math.round((completed / moduleSessions.length) * 100)
          : 0
      };
    });

    // ==================== إحصائيات الحضور اليومية ====================
    console.log("📆 [Instructor Group Details] Calculating daily attendance...");
    
    const dailyAttendance = {};
    allSessions.forEach(session => {
      if (session.attendanceTaken && session.attendance) {
        const dateKey = new Date(session.scheduledDate).toISOString().split('T')[0];
        if (!dailyAttendance[dateKey]) {
          dailyAttendance[dateKey] = {
            date: dateKey,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            total: 0
          };
        }
        
        session.attendance.forEach(record => {
          dailyAttendance[dateKey][record.status]++;
          dailyAttendance[dateKey].total++;
        });
      }
    });

    const dailyAttendanceArray = Object.values(dailyAttendance)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // ==================== تحضير الرد ====================
    console.log("📦 [Instructor Group Details] Preparing response...");
    
    const response = {
      success: true,
      data: {
        group: {
          id: group._id,
          name: group.name,
          code: group.code,
          status: group.status,
          course: {
            id: group.courseId?._id,
            title: group.courseId?.title || "غير محدد",
            level: group.courseId?.level || "غير محدد",
            description: group.courseId?.description || "",
            curriculum: group.courseId?.curriculum || []
          },
          instructors: group.instructors.map(instructor => ({
            id: instructor._id,
            name: instructor.name,
            email: instructor.email,
            phone: instructor.profile?.phone
          })),
          schedule: {
            startDate: group.schedule?.startDate,
            daysOfWeek: group.schedule?.daysOfWeek || [],
            timeFrom: group.schedule?.timeFrom,
            timeTo: group.schedule?.timeTo,
            timezone: group.schedule?.timezone || "Africa/Cairo"
          },
          pricing: group.pricing || {},
          automation: group.automation || {},
          // ✅ FIX: استخدام studentCount الفعلي
          studentCount: studentCount,
          maxStudents: group.maxStudents || 0,
          metadata: group.metadata || {}
        },
        stats: {
          students: {
            total: studentCount, // ✅ FIX
            active: studentCount, // ✅ FIX
            needingAttention: studentsNeedingAttention.length,
            attendanceRate: overallAttendanceRate
          },
          sessions: {
            total: totalSessions,
            completed: completedSessions,
            upcoming: upcomingSessions,
            cancelled: allSessions.filter(s => s.status === "cancelled").length,
            postponed: allSessions.filter(s => s.status === "postponed").length
          },
          attendance: {
            overallRate: overallAttendanceRate,
            sessionsWithAttendance: sessionsWithAttendance.length,
            totalRecords: totalAttendanceRecords,
            averageDaily: dailyAttendanceArray.length > 0 
              ? Math.round(dailyAttendanceArray.reduce((sum, day) => sum + (day.present / day.total * 100), 0) / dailyAttendanceArray.length)
              : 0
          },
          progress: {
            overall: group.status === "completed" ? 100 : 
                    completedSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
            byModule: moduleStats
          }
        },
        sessions: {
          all: allSessions.map(s => ({
            id: s._id,
            title: s.title,
            scheduledDate: s.scheduledDate,
            startTime: s.startTime,
            endTime: s.endTime,
            status: s.status,
            moduleIndex: s.moduleIndex,
            sessionNumber: s.sessionNumber,
            attendanceTaken: s.attendanceTaken,
            // ✅ FIX: إضافة meetingLink لجميع الجلسات
            meetingLink: s.meetingLink || "",
            recordingLink: s.recordingLink || ""
          })),
          byModule: modulesArray,
          // ✅ FIX: إضافة meetingLink للجلسة التالية
          next: nextSession ? {
            id: nextSession._id,
            title: nextSession.title,
            date: nextSession.scheduledDate,
            time: `${nextSession.startTime} - ${nextSession.endTime}`,
            moduleIndex: nextSession.moduleIndex,
            sessionNumber: nextSession.sessionNumber,
            meetingLink: nextSession.meetingLink || "", // ✅ ADDED
            status: nextSession.status // ✅ ADDED
          } : null,
          // ✅ FIX: إضافة meetingLink للجلسة الأخيرة
          last: lastSession ? {
            id: lastSession._id,
            title: lastSession.title,
            date: lastSession.scheduledDate,
            attendanceCount: lastSession.attendance?.length || 0,
            meetingLink: lastSession.meetingLink || "", // ✅ ADDED
            status: lastSession.status // ✅ ADDED
          } : null
        },
        students: {
          all: studentsWithStats,
          needingAttention: studentsNeedingAttention,
          topPerformers: studentsWithStats
            .filter(s => s.attendance.rate >= 90)
            .sort((a, b) => b.attendance.rate - a.attendance.rate)
            .slice(0, 5),
          attendanceBreakdown: {
            good: studentsWithStats.filter(s => s.attendance.rate >= 80).length,
            warning: studentsWithStats.filter(s => s.attendance.rate >= 60 && s.attendance.rate < 80).length,
            danger: studentsWithStats.filter(s => s.attendance.rate < 60).length
          }
        },
        attendance: {
          daily: dailyAttendanceArray.slice(-7), // آخر 7 أيام
          trends: calculateAttendanceTrends(dailyAttendanceArray)
        },
        moduleProgress: moduleStats
      }
    };

    console.log("✅ [Instructor Group Details] Response ready!");
    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ [Instructor Group Details API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب تفاصيل المجموعة",
        error: error.message,
        code: "GROUP_DETAILS_ERROR"
      },
      { status: 500 }
    );
  }
}

// ==================== دوال مساعدة ====================

function calculateAttendanceTrends(dailyData) {
  if (dailyData.length < 2) {
    return {
      trend: "stable",
      change: 0,
      direction: "none"
    };
  }

  const recentData = dailyData.slice(-7); // آخر أسبوع
  const firstDay = recentData[0];
  const lastDay = recentData[recentData.length - 1];

  if (!firstDay || !lastDay || firstDay.total === 0 || lastDay.total === 0) {
    return {
      trend: "stable",
      change: 0,
      direction: "none"
    };
  }

  const firstRate = (firstDay.present / firstDay.total) * 100;
  const lastRate = (lastDay.present / lastDay.total) * 100;
  const change = lastRate - firstRate;
  const percentageChange = Math.round((change / firstRate) * 100);

  let trend = "stable";
  let direction = "none";

  if (Math.abs(percentageChange) > 10) {
    trend = change > 0 ? "improving" : "declining";
    direction = change > 0 ? "up" : "down";
  }

  return {
    trend,
    change: Math.abs(percentageChange),
    direction,
    currentRate: Math.round(lastRate),
    previousRate: Math.round(firstRate)
  };
}