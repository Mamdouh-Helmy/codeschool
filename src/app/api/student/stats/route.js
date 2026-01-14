import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../../models/Student";
import Session from "../../../../models/Session";
import Group from "../../../../models/Group";

export async function GET(req) {
  try {
    console.log("📈 [Advanced Stats API] Fetching student statistics");
    
    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log("❌ [Advanced Stats API] Unauthorized - No user found");
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    console.log("✅ [Advanced Stats API] User authenticated:", { 
      id: user.id, 
      role: user.role 
    });

    await connectDB();

    // الحصول على بيانات الطالب المرتبطة بـ User
    const student = await Student.findOne({ authUserId: user.id })
      .select("_id personalInfo.fullName academicInfo.groupIds")
      .lean();

    if (!student) {
      console.log("⚠️ [Advanced Stats API] No student record found");
      return NextResponse.json({
        success: true,
        data: getDefaultStats(user)
      });
    }

    const studentId = student._id;
    const groupIds = student.academicInfo?.groupIds || [];

    console.log(`📊 [Advanced Stats API] Calculating stats for student: ${studentId}, groups: ${groupIds.length}`);

    // حساب إحصائيات متقدمة
    const [
      attendanceStats,
      groupStats,
      monthlyAttendance,
      whatsappStats,
      performanceStats
    ] = await Promise.all([
      calculateAttendanceStats(studentId, groupIds),
      calculateGroupStats(groupIds, studentId),
      calculateMonthlyAttendance(studentId, groupIds),
      calculateWhatsAppStats(studentId),
      calculatePerformanceStats(studentId, groupIds)
    ]);

    const response = {
      success: true,
      data: {
        student: {
          id: studentId,
          name: student.personalInfo?.fullName || user.name || "طالب",
        },
        overview: {
          totalGroups: groupIds.length,
          activeGroups: groupStats.activeGroups,
          completedGroups: groupStats.completedGroups,
          totalSessions: attendanceStats.totalSessions,
          attendanceRate: attendanceStats.attendanceRate,
          totalHours: attendanceStats.totalHours,
          averageAttendance: attendanceStats.averageAttendance,
        },
        attendance: attendanceStats,
        groups: groupStats.groups,
        monthly: monthlyAttendance,
        whatsapp: whatsappStats,
        performance: performanceStats,
        warnings: generateWarnings(attendanceStats, groupStats, performanceStats)
      }
    };

    console.log("✅ [Advanced Stats API] Stats calculated successfully");
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ [Advanced Stats API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل الإحصائيات المتقدمة",
        error: error.message,
        code: "STATS_ERROR"
      },
      { status: 500 }
    );
  }
}

// دالة لحساب إحصائيات الحضور
async function calculateAttendanceStats(studentId, groupIds) {
  try {
    const allSessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
      status: { $in: ["completed", "cancelled"] }
    })
      .select("attendance scheduledDate startTime endTime status")
      .lean();

    let present = 0, absent = 0, late = 0, excused = 0;
    let totalHours = 0;

    allSessions.forEach((session) => {
      if (session.attendance) {
        const attendanceRecord = session.attendance.find(
          (a) => a.studentId.toString() === studentId.toString()
        );
        if (attendanceRecord) {
          switch (attendanceRecord.status) {
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
          }
        }
      }

      // حساب عدد الساعات
      if (session.startTime && session.endTime) {
        const [startHour, startMinute] = session.startTime.split(":").map(Number);
        const [endHour, endMinute] = session.endTime.split(":").map(Number);
        
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        
        const durationHours = (endTotalMinutes - startTotalMinutes) / 60;
        totalHours += Math.max(0, durationHours);
      }
    });

    const totalSessions = allSessions.length;
    const attendanceRate = totalSessions > 0 
      ? Math.round(((present + late + excused) / totalSessions) * 100) 
      : 0;

    // حساب متوسط الحضور
    const averageAttendance = totalSessions > 0
      ? Math.round((present / totalSessions) * 100)
      : 0;

    return {
      total: totalSessions,
      present,
      absent,
      late,
      excused,
      attendanceRate,
      totalHours: Math.round(totalHours * 10) / 10,
      averageAttendance,
      byStatus: {
        present: { count: present, percentage: totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 0 },
        absent: { count: absent, percentage: totalSessions > 0 ? Math.round((absent / totalSessions) * 100) : 0 },
        late: { count: late, percentage: totalSessions > 0 ? Math.round((late / totalSessions) * 100) : 0 },
        excused: { count: excused, percentage: totalSessions > 0 ? Math.round((excused / totalSessions) * 100) : 0 }
      }
    };
  } catch (error) {
    console.error("Error calculating attendance stats:", error);
    return getDefaultAttendanceStats();
  }
}

// دالة لحساب إحصائيات المجموعات
async function calculateGroupStats(groupIds, studentId) {
  try {
    if (groupIds.length === 0) {
      return { activeGroups: 0, completedGroups: 0, groups: [] };
    }

    const groups = await Group.find({
      _id: { $in: groupIds },
      isDeleted: false
    })
      .select("name code status courseId schedule currentStudentsCount maxStudents metadata")
      .populate("courseId", "title level")
      .lean();

    const activeGroups = groups.filter(g => g.status === "active").length;
    const completedGroups = groups.filter(g => g.status === "completed").length;

    // حساب نسبة الحضور لكل مجموعة
    const groupsWithStats = await Promise.all(
      groups.map(async (group) => {
        const groupSessions = await Session.find({
          groupId: group._id,
          isDeleted: false,
          status: { $in: ["completed", "cancelled"] }
        })
          .select("attendance")
          .lean();

        let attendedSessions = 0;
        groupSessions.forEach((session) => {
          if (session.attendance) {
            const attendanceRecord = session.attendance.find(
              (a) => a.studentId.toString() === studentId.toString()
            );
            if (attendanceRecord?.status === "present") {
              attendedSessions++;
            }
          }
        });

        const attendanceRate = groupSessions.length > 0
          ? Math.round((attendedSessions / groupSessions.length) * 100)
          : 0;

        return {
          id: group._id,
          name: group.name,
          code: group.code,
          status: group.status,
          course: group.courseId ? {
            title: group.courseId.title,
            level: group.courseId.level || "غير محدد"
          } : null,
          schedule: group.schedule,
          currentStudents: group.currentStudentsCount || 0,
          maxStudents: group.maxStudents || 0,
          attendanceRate,
          sessionsCount: groupSessions.length,
          attendedSessions,
          completionDate: group.status === "completed" ? group.metadata?.completedAt : null
        };
      })
    );

    return {
      activeGroups,
      completedGroups,
      groups: groupsWithStats
    };
  } catch (error) {
    console.error("Error calculating group stats:", error);
    return { activeGroups: 0, completedGroups: 0, groups: [] };
  }
}

// دالة لحساب الحضور الشهري
async function calculateMonthlyAttendance(studentId, groupIds) {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const sessions = await Session.find({
      groupId: { $in: groupIds },
      scheduledDate: { $gte: sixMonthsAgo },
      isDeleted: false,
      status: { $in: ["completed", "cancelled"] }
    })
      .select("attendance scheduledDate")
      .lean();

    const monthlyStats = {};
    
    // تهيئة الأشهر الستة الأخيرة
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats[monthKey] = { total: 0, present: 0, rate: 0 };
    }

    // حساب الحضور لكل شهر
    sessions.forEach((session) => {
      const sessionDate = new Date(session.scheduledDate);
      const monthKey = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyStats[monthKey]) {
        monthlyStats[monthKey].total++;
        
        if (session.attendance) {
          const attendanceRecord = session.attendance.find(
            (a) => a.studentId.toString() === studentId.toString()
          );
          if (attendanceRecord?.status === "present") {
            monthlyStats[monthKey].present++;
          }
        }
      }
    });

    // حساب النسب المئوية
    Object.keys(monthlyStats).forEach(month => {
      const stats = monthlyStats[month];
      stats.rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    });

    return monthlyStats;
  } catch (error) {
    console.error("Error calculating monthly attendance:", error);
    return {};
  }
}

// دالة لحساب إحصائيات الواتساب
async function calculateWhatsAppStats(studentId) {
  try {
    const student = await Student.findById(studentId)
      .select("whatsappMessages metadata")
      .lean();

    if (!student || !student.whatsappMessages || student.whatsappMessages.length === 0) {
      return getDefaultWhatsAppStats();
    }

    const messages = student.whatsappMessages;
    const stats = {
      total: messages.length,
      sent: messages.filter(msg => msg.status === 'sent').length,
      failed: messages.filter(msg => msg.status === 'failed').length,
      pending: messages.filter(msg => msg.status === 'pending').length,
      byType: {},
      byMonth: {}
    };

    // حساب حسب النوع
    messages.forEach(msg => {
      stats.byType[msg.messageType] = (stats.byType[msg.messageType] || 0) + 1;
      
      // حساب حسب الشهر
      const date = new Date(msg.sentAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      stats.byMonth[monthKey] = (stats.byMonth[monthKey] || 0) + 1;
    });

    // حساب النسب المئوية
    stats.successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;
    stats.failureRate = stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0;

    return stats;
  } catch (error) {
    console.error("Error calculating WhatsApp stats:", error);
    return getDefaultWhatsAppStats();
  }
}

// دالة لحساب إحصائيات الأداء
async function calculatePerformanceStats(studentId, groupIds) {
  try {
    const sessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
      status: "completed"
    })
      .select("scheduledDate attendance")
      .sort({ scheduledDate: 1 })
      .lean();

    if (sessions.length === 0) {
      return {
        streak: 0,
        bestStreak: 0,
        consistency: 0,
        trend: "stable"
      };
    }

    let currentStreak = 0;
    let bestStreak = 0;
    let attendedCount = 0;
    let attendanceHistory = [];

    sessions.forEach((session, index) => {
      let attended = false;
      
      if (session.attendance) {
        const attendanceRecord = session.attendance.find(
          (a) => a.studentId.toString() === studentId.toString()
        );
        attended = attendanceRecord?.status === "present";
      }

      if (attended) {
        currentStreak++;
        attendedCount++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }

      // تسجيل تاريخ الحضور
      attendanceHistory.push({
        date: session.scheduledDate,
        attended,
        sessionNumber: index + 1
      });
    });

    const consistency = sessions.length > 0 ? Math.round((attendedCount / sessions.length) * 100) : 0;

    // حساب الاتجاه (تحسن / ثبات / تراجع)
    let trend = "stable";
    if (sessions.length >= 4) {
      const firstHalf = attendanceHistory.slice(0, Math.floor(sessions.length / 2));
      const secondHalf = attendanceHistory.slice(Math.floor(sessions.length / 2));
      
      const firstHalfRate = firstHalf.filter(h => h.attended).length / firstHalf.length * 100;
      const secondHalfRate = secondHalf.filter(h => h.attended).length / secondHalf.length * 100;
      
      if (secondHalfRate > firstHalfRate + 10) trend = "improving";
      else if (secondHalfRate < firstHalfRate - 10) trend = "declining";
    }

    return {
      streak: currentStreak,
      bestStreak,
      consistency,
      trend,
      attendanceHistory: attendanceHistory.slice(-10) // آخر 10 جلسات فقط
    };
  } catch (error) {
    console.error("Error calculating performance stats:", error);
    return {
      streak: 0,
      bestStreak: 0,
      consistency: 0,
      trend: "stable"
    };
  }
}

// دالة لتوليد التحذيرات
function generateWarnings(attendanceStats, groupStats, performanceStats) {
  const warnings = [];

  // تحذيرات الغياب
  if (attendanceStats.absent >= 3) {
    warnings.push({
      type: "high_absence",
      message: `لديك ${attendanceStats.absent} غياب. انتبه فقد تؤثر على مشاركتك في الدورة`,
      level: attendanceStats.absent >= 5 ? "danger" : "warning",
      action: "تحسين الحضور"
    });
  }

  // تحذيرات نسبة الحضور المنخفضة
  if (attendanceStats.attendanceRate < 80) {
    warnings.push({
      type: "low_attendance",
      message: `نسبة حضورك ${attendanceStats.attendanceRate}% أقل من 80% المطلوبة`,
      level: "warning",
      action: "متابعة الحضور"
    });
  }

  // تحذيرات المجموعات غير النشطة
  if (groupStats.activeGroups === 0 && groupStats.totalGroups > 0) {
    warnings.push({
      type: "no_active_groups",
      message: "ليس لديك مجموعات نشطة حالياً",
      level: "info",
      action: "الانضمام لمجموعات جديدة"
    });
  }

  // تحذيرات الاتجاه التراجعي
  if (performanceStats.trend === "declining") {
    warnings.push({
      type: "declining_performance",
      message: "أداؤك في الحضور يظهر تراجعاً",
      level: "warning",
      action: "مراجعة الجدول"
    });
  }

  return warnings;
}

// دالة للحصول على إحصائيات افتراضية
function getDefaultStats(user) {
  return {
    student: {
      id: user.id,
      name: user.name || "طالب",
    },
    overview: {
      totalGroups: 0,
      activeGroups: 0,
      completedGroups: 0,
      totalSessions: 0,
      attendanceRate: 0,
      totalHours: 0,
      averageAttendance: 0,
    },
    attendance: getDefaultAttendanceStats(),
    groups: {
      activeGroups: 0,
      completedGroups: 0,
      groups: []
    },
    monthly: {},
    whatsapp: getDefaultWhatsAppStats(),
    performance: {
      streak: 0,
      bestStreak: 0,
      consistency: 0,
      trend: "stable"
    },
    warnings: []
  };
}

function getDefaultAttendanceStats() {
  return {
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    attendanceRate: 0,
    totalHours: 0,
    averageAttendance: 0,
    byStatus: {
      present: { count: 0, percentage: 0 },
      absent: { count: 0, percentage: 0 },
      late: { count: 0, percentage: 0 },
      excused: { count: 0, percentage: 0 }
    }
  };
}

function getDefaultWhatsAppStats() {
  return {
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    successRate: 0,
    failureRate: 0,
    byType: {},
    byMonth: {}
  };
}