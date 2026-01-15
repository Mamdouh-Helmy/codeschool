import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import Student from "../../../models/Student";
import StudentEvaluation from "../../../models/StudentEvaluation";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    console.log("📊 [Instructor Analytics] Fetching analytics data");

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "instructor" && user.role !== "admin")) {
      console.log("❌ [Instructor Analytics] Unauthorized access");
      return NextResponse.json(
        { success: false, message: "غير مصرح" },
        { status: 401 }
      );
    }

    await connectDB();

    // جلب جميع مجموعات المدرس
    const groups = await Group.find({
      instructors: user.id,
      isDeleted: false,
    })
      .populate("courseId", "title level")
      .lean();

    console.log(
      `📊 [Instructor Analytics] Found ${groups.length} groups for instructor ${user.id}`
    );

    if (groups.length === 0) {
      return NextResponse.json({
        success: true,
        message: "لا توجد بيانات إحصائية متاحة",
        data: {
          overview: getEmptyOverview(),
          groups: getEmptyGroupsStats(),
          students: getEmptyStudentsStats(),
          attendance: getEmptyAttendanceStats(),
          evaluations: getEmptyEvaluationStats(),
          timeSeries: getEmptyTimeSeries(),
        },
      });
    }

    const groupIds = groups.map((g) => g._id);

    // جلب جميع الجلسات للمجموعات
    const sessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    }).lean();

    // جلب جميع الطلاب في المجموعات
    const students = await Student.find({
      "academicInfo.groupIds": { $in: groupIds },
      isDeleted: false,
    }).lean();

    // جلب جميع التقييمات
    const evaluations = await StudentEvaluation.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    }).lean();

    // حساب الإحصائيات
    const analytics = {
      overview: calculateOverview(groups, sessions, students, evaluations),
      groups: calculateGroupsStats(groups, sessions, students),
      students: calculateStudentsStats(
        students,
        sessions,
        evaluations,
        groupIds
      ),
      attendance: calculateAttendanceStats(sessions, students, groupIds),
      evaluations: calculateEvaluationStats(evaluations, groups, students),
      timeSeries: calculateTimeSeries(sessions, evaluations, groups),
    };

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("❌ [Instructor Analytics] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل البيانات الإحصائية",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// ============== دوال حساب الإحصائيات ==============

function calculateOverview(groups, sessions, students, evaluations) {
  const now = new Date();
  const last30Days = new Date(now.setDate(now.getDate() - 30));

  const completedSessions = sessions.filter(
    (s) => s.status === "completed"
  ).length;
  const activeGroups = groups.filter((g) => g.status === "active").length;
  const completedGroups = groups.filter((g) => g.status === "completed").length;

  // جلسات الشهر الماضي
  const recentSessions = sessions.filter(
    (s) => new Date(s.scheduledDate) >= last30Days
  );

  const recentCompleted = recentSessions.filter(
    (s) => s.status === "completed"
  ).length;
  const recentAttendance = recentSessions.reduce((sum, session) => {
    return sum + (session.attendance?.length || 0);
  }, 0);

  // تقييمات الشهر الماضي
  const recentEvaluations = evaluations.filter(
    (e) => new Date(e.metadata.evaluatedAt) >= last30Days
  );

  return {
    totalGroups: groups.length,
    activeGroups,
    completedGroups,
    totalStudents: students.length,
    totalSessions: sessions.length,
    completedSessions,
    completionRate:
      sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0,

    averageAttendance:
      sessions.length > 0
        ? sessions.reduce((sum, session) => {
            const attendanceCount =
              session.attendance?.filter(
                (a) => a.status === "present" || a.status === "late"
              ).length || 0;
            const totalStudents =
              groups.find(
                (g) => g._id.toString() === session.groupId.toString()
              )?.currentStudentsCount || 0;
            return (
              sum +
              (totalStudents > 0 ? (attendanceCount / totalStudents) * 100 : 0)
            );
          }, 0) / sessions.length
        : 0,

    studentsAtRisk: calculateStudentsAtRisk(students, sessions, groups),
    evaluatedStudents: evaluations.length,
    evaluationRate:
      students.length > 0 ? (evaluations.length / students.length) * 100 : 0,

    // مؤشرات أداء الشهر الماضي
    monthlyPerformance: {
      sessionsCompleted: recentCompleted,
      totalSessions: recentSessions.length,
      attendanceRate:
        recentSessions.length > 0
          ? (recentAttendance / (recentSessions.length * 25)) * 100
          : 0,
      evaluationsCompleted: recentEvaluations.length,
      successRate:
        recentEvaluations.length > 0
          ? (recentEvaluations.filter((e) => e.finalDecision === "pass")
              .length /
              recentEvaluations.length) *
            100
          : 0,
    },
  };
}

function calculateGroupsStats(groups, sessions, students) {
  const statsByLevel = {};
  const statsByStatus = {
    active: { count: 0, students: 0, sessions: 0, attendance: 0 },
    completed: { count: 0, students: 0, sessions: 0, attendance: 0 },
    draft: { count: 0, students: 0, sessions: 0, attendance: 0 },
  };

  groups.forEach((group) => {
    // حسب المستوى
    const level = group.courseSnapshot?.level || "unknown";
    if (!statsByLevel[level]) {
      statsByLevel[level] = {
        count: 0,
        students: 0,
        sessions: 0,
        attendance: 0,
      };
    }
    statsByLevel[level].count++;
    statsByLevel[level].students += group.currentStudentsCount || 0;

    // حسب الحالة
    const status = group.status || "draft";
    statsByStatus[status].count++;
    statsByStatus[status].students += group.currentStudentsCount || 0;

    // جلسات المجموعة
    const groupSessions = sessions.filter(
      (s) => s.groupId.toString() === group._id.toString()
    );

    statsByLevel[level].sessions += groupSessions.length;
    statsByStatus[status].sessions += groupSessions.length;

    // حساب متوسط الحضور للمجموعة
    const attendanceRate =
      groupSessions.length > 0
        ? groupSessions.reduce((sum, session) => {
            const presentCount =
              session.attendance?.filter(
                (a) => a.status === "present" || a.status === "late"
              ).length || 0;
            return (
              sum + (presentCount / (group.currentStudentsCount || 1)) * 100
            );
          }, 0) / groupSessions.length
        : 0;

    statsByLevel[level].attendance += attendanceRate;
    statsByStatus[status].attendance += attendanceRate;
  });

  // حساب المتوسطات
  Object.keys(statsByLevel).forEach((level) => {
    if (statsByLevel[level].count > 0) {
      statsByLevel[level].attendance /= statsByLevel[level].count;
    }
  });

  Object.keys(statsByStatus).forEach((status) => {
    if (statsByStatus[status].count > 0) {
      statsByStatus[status].attendance /= statsByStatus[status].count;
    }
  });

  // أفضل 5 مجموعات حسب الحضور
  const topGroupsByAttendance = groups
    .map((group) => {
      const groupSessions = sessions.filter(
        (s) => s.groupId.toString() === group._id.toString()
      );
      const attendanceRate =
        groupSessions.length > 0
          ? groupSessions.reduce((sum, session) => {
              const presentCount =
                session.attendance?.filter(
                  (a) => a.status === "present" || a.status === "late"
                ).length || 0;
              return (
                sum + (presentCount / (group.currentStudentsCount || 1)) * 100
              );
            }, 0) / groupSessions.length
          : 0;

      return {
        id: group._id,
        name: group.name,
        code: group.code,
        level: group.courseSnapshot?.level || "unknown",
        status: group.status,
        students: group.currentStudentsCount || 0,
        sessions: groupSessions.length,
        attendanceRate,
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, 5);

  return {
    byLevel: statsByLevel,
    byStatus: statsByStatus,
    topGroupsByAttendance,
    distribution: {
      beginner: groups.filter((g) => g.courseSnapshot?.level === "beginner")
        .length,
      intermediate: groups.filter(
        (g) => g.courseSnapshot?.level === "intermediate"
      ).length,
      advanced: groups.filter((g) => g.courseSnapshot?.level === "advanced")
        .length,
    },
  };
}

function calculateStudentsStats(students, sessions, evaluations, groupIds) {
  // أفضل الطلاب حسب الحضور
  const studentsWithAttendance = students.map((student) => {
    const studentGroups = student.academicInfo?.groupIds || [];
    const relevantGroups = studentGroups.filter((gid) =>
      groupIds.some((g) => g.toString() === gid.toString())
    );

    // حساب الحضور للطالب في المجموعات الخاصة بالمدرس
    let totalSessions = 0;
    let attendedSessions = 0;

    sessions.forEach((session) => {
      if (
        relevantGroups.some(
          (gid) => gid.toString() === session.groupId.toString()
        )
      ) {
        totalSessions++;
        if (session.attendance) {
          const attendanceRecord = session.attendance.find(
            (a) => a.studentId.toString() === student._id.toString()
          );
          if (
            attendanceRecord &&
            (attendanceRecord.status === "present" ||
              attendanceRecord.status === "late")
          ) {
            attendedSessions++;
          }
        }
      }
    });

    const attendanceRate =
      totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

    // تقييم الطالب
    const studentEvaluation = evaluations.find(
      (e) => e.studentId.toString() === student._id.toString()
    );

    return {
      id: student._id,
      name: student.personalInfo?.fullName || "غير معروف",
      enrollmentNumber: student.enrollmentNumber,
      groupsCount: relevantGroups.length,
      attendanceRate,
      totalSessions,
      attendedSessions,
      evaluation: studentEvaluation
        ? {
            score: studentEvaluation.calculatedStats?.overallScore || 0,
            decision: studentEvaluation.finalDecision,
          }
        : null,
    };
  });

  // أفضل 10 طلاب حسب الحضور
  const topStudentsByAttendance = [...studentsWithAttendance]
    .sort((a, b) => b.attendanceRate - a.attendanceRate)
    .slice(0, 10);

  // أفضل 10 طلاب حسب التقييم (إذا كانوا مقيمين)
  const evaluatedStudents = studentsWithAttendance.filter((s) => s.evaluation);
  const topStudentsByEvaluation = [...evaluatedStudents]
    .sort((a, b) => (b.evaluation?.score || 0) - (a.evaluation?.score || 0))
    .slice(0, 10);

  // الطلاب المحتاجين متابعة (حضور أقل من 60%)
  const studentsNeedingAttention = studentsWithAttendance
    .filter((s) => s.attendanceRate < 60 && s.totalSessions > 0)
    .sort((a, b) => a.attendanceRate - b.attendanceRate);

  // توزيع الطلاب حسب مستوى الحضور
  const attendanceDistribution = {
    excellent: studentsWithAttendance.filter((s) => s.attendanceRate >= 90)
      .length,
    good: studentsWithAttendance.filter(
      (s) => s.attendanceRate >= 70 && s.attendanceRate < 90
    ).length,
    average: studentsWithAttendance.filter(
      (s) => s.attendanceRate >= 60 && s.attendanceRate < 70
    ).length,
    poor: studentsWithAttendance.filter(
      (s) => s.attendanceRate < 60 && s.totalSessions > 0
    ).length,
    noData: studentsWithAttendance.filter((s) => s.totalSessions === 0).length,
  };

  return {
    total: students.length,
    topStudentsByAttendance,
    topStudentsByEvaluation,
    studentsNeedingAttention,
    attendanceDistribution,
    averageAttendance:
      studentsWithAttendance.length > 0
        ? studentsWithAttendance.reduce((sum, s) => sum + s.attendanceRate, 0) /
          studentsWithAttendance.length
        : 0,
    evaluatedCount: evaluatedStudents.length,
    evaluationRate:
      students.length > 0
        ? (evaluatedStudents.length / students.length) * 100
        : 0,
  };
}

function calculateAttendanceStats(sessions, students, groupIds) {
  // تجميع الحضور حسب الشهر
  const monthlyAttendance = {};
  const dailyAttendance = {};
  const attendanceReasons = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
  };

  sessions.forEach((session) => {
    if (session.attendance) {
      const monthYear = new Date(session.scheduledDate).toLocaleDateString(
        "ar-EG",
        {
          year: "numeric",
          month: "short",
        }
      );

      const day = new Date(session.scheduledDate).toLocaleDateString("ar-EG", {
        weekday: "short",
      });

      if (!monthlyAttendance[monthYear]) {
        monthlyAttendance[monthYear] = { present: 0, total: 0 };
      }

      if (!dailyAttendance[day]) {
        dailyAttendance[day] = { present: 0, total: 0 };
      }

      session.attendance.forEach((record) => {
        // التحقق من أن الطالب ينتمي لمجموعة المدرس
        const student = students.find(
          (s) => s._id.toString() === record.studentId.toString()
        );

        if (
          student &&
          student.academicInfo?.groupIds?.some((gid) =>
            groupIds.some((g) => g.toString() === gid.toString())
          )
        ) {
          monthlyAttendance[monthYear].total++;
          dailyAttendance[day].total++;

          if (record.status === "present" || record.status === "late") {
            monthlyAttendance[monthYear].present++;
            dailyAttendance[day].present++;
          }

          attendanceReasons[record.status] =
            (attendanceReasons[record.status] || 0) + 1;
        }
      });
    }
  });

  // تحويل البيانات لمخططات
  const monthlyChart = Object.entries(monthlyAttendance).map(
    ([month, data]) => ({
      month,
      attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
      present: data.present,
      total: data.total,
    })
  );

  const dailyChart = Object.entries(dailyAttendance).map(([day, data]) => ({
    day,
    attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
    present: data.present,
    total: data.total,
  }));

  // نسب الحضور حسب الوقت من اليوم
  const timeSlots = {
    morning: { present: 0, total: 0 },
    afternoon: { present: 0, total: 0 },
    evening: { present: 0, total: 0 },
  };

  sessions.forEach((session) => {
    const hour = parseInt(session.startTime?.split(":")[0] || 12);
    let timeSlot = "evening";

    if (hour < 12) timeSlot = "morning";
    else if (hour < 17) timeSlot = "afternoon";

    if (session.attendance) {
      session.attendance.forEach((record) => {
        const student = students.find(
          (s) => s._id.toString() === record.studentId.toString()
        );

        if (
          student &&
          student.academicInfo?.groupIds?.some((gid) =>
            groupIds.some((g) => g.toString() === gid.toString())
          )
        ) {
          timeSlots[timeSlot].total++;
          if (record.status === "present" || record.status === "late") {
            timeSlots[timeSlot].present++;
          }
        }
      });
    }
  });

  const timeSlotChart = Object.entries(timeSlots).map(([slot, data]) => ({
    slot,
    attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
    present: data.present,
    total: data.total,
  }));

  return {
    monthly: monthlyChart,
    daily: dailyChart,
    timeSlots: timeSlotChart,
    reasons: attendanceReasons,
    trends: calculateAttendanceTrends(monthlyChart),
  };
}

function calculateEvaluationStats(evaluations, groups, students) {
  // توزيع القرارات النهائية
  const decisionDistribution = {
    pass: 0,
    review: 0,
    repeat: 0,
  };

  // متوسط الدرجات حسب المعيار
  const criteriaAverages = {
    understanding: 0,
    commitment: 0,
    attendance: 0,
    participation: 0,
    overall: 0,
  };

  evaluations.forEach((evaluation) => {
    decisionDistribution[evaluation.finalDecision]++;

    if (evaluation.criteria) {
      Object.keys(criteriaAverages).forEach((key) => {
        if (key === "overall") {
          criteriaAverages[key] +=
            evaluation.calculatedStats?.overallScore || 0;
        } else if (evaluation.criteria[key]) {
          criteriaAverages[key] += evaluation.criteria[key];
        }
      });
    }
  });

  // حساب المتوسطات
  const totalEvaluations = evaluations.length;
  Object.keys(criteriaAverages).forEach((key) => {
    criteriaAverages[key] =
      totalEvaluations > 0 ? criteriaAverages[key] / totalEvaluations : 0;
  });

  // تقييمات حسب المجموعة
  const evaluationsByGroup = {};
  groups.forEach((group) => {
    const groupEvaluations = evaluations.filter(
      (e) => e.groupId.toString() === group._id.toString()
    );

    if (groupEvaluations.length > 0) {
      const avgScore =
        groupEvaluations.reduce(
          (sum, e) => sum + (e.calculatedStats?.overallScore || 0),
          0
        ) / groupEvaluations.length;

      const passRate =
        (groupEvaluations.filter((e) => e.finalDecision === "pass").length /
          groupEvaluations.length) *
        100;

      evaluationsByGroup[group.code] = {
        groupName: group.name,
        evaluationsCount: groupEvaluations.length,
        averageScore: avgScore,
        passRate,
        decisions: {
          pass: groupEvaluations.filter((e) => e.finalDecision === "pass")
            .length,
          review: groupEvaluations.filter((e) => e.finalDecision === "review")
            .length,
          repeat: groupEvaluations.filter((e) => e.finalDecision === "repeat")
            .length,
        },
      };
    }
  });

  // أفضل وأسوأ الطلاب في التقييم
  const studentEvaluations = evaluations.map((evaluation) => {
    const student = students.find(
      (s) => s._id.toString() === evaluation.studentId.toString()
    );
    return {
      studentName: student?.personalInfo?.fullName || "غير معروف",
      enrollmentNumber: student?.enrollmentNumber,
      groupName:
        groups.find((g) => g._id.toString() === evaluation.groupId.toString())
          ?.name || "غير معروف",
      score: evaluation.calculatedStats?.overallScore || 0,
      decision: evaluation.finalDecision,
      criteria: evaluation.criteria,
    };
  });

  const topEvaluations = [...studentEvaluations]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const bottomEvaluations = [...studentEvaluations]
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  return {
    totalEvaluations,
    decisionDistribution,
    criteriaAverages,
    evaluationsByGroup,
    topEvaluations,
    bottomEvaluations,
    completionRate:
      students.length > 0 ? (totalEvaluations / students.length) * 100 : 0,
  };
}

function calculateTimeSeries(sessions, evaluations, groups) {
  // بيانات لآخر 12 شهر
  const months = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
      })
    );
  }

  // تجميع البيانات الشهرية
  const monthlyData = {};
  months.forEach((month) => {
    monthlyData[month] = {
      sessions: 0,
      completedSessions: 0,
      attendance: 0,
      totalAttendanceRecords: 0,
      evaluations: 0,
      averageScore: 0,
    };
  });

  // جلسات شهرية
  sessions.forEach((session) => {
    const monthYear = new Date(session.scheduledDate).toLocaleDateString(
      "ar-EG",
      {
        year: "numeric",
        month: "short",
      }
    );

    if (monthlyData[monthYear]) {
      monthlyData[monthYear].sessions++;
      if (session.status === "completed") {
        monthlyData[monthYear].completedSessions++;
      }

      if (session.attendance) {
        const presentCount = session.attendance.filter(
          (a) => a.status === "present" || a.status === "late"
        ).length;
        monthlyData[monthYear].attendance += presentCount;
        monthlyData[monthYear].totalAttendanceRecords +=
          session.attendance.length;
      }
    }
  });

  // تقييمات شهرية
  evaluations.forEach((evaluation) => {
    const evaluatedAt = evaluation.metadata?.evaluatedAt;
    if (evaluatedAt) {
      const monthYear = new Date(evaluatedAt).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
      });

      if (monthlyData[monthYear]) {
        monthlyData[monthYear].evaluations++;
        monthlyData[monthYear].averageScore +=
          evaluation.calculatedStats?.overallScore || 0;
      }
    }
  });

  // حساب المتوسطات
  months.forEach((month) => {
    if (monthlyData[month].evaluations > 0) {
      monthlyData[month].averageScore /= monthlyData[month].evaluations;
    }
  });

  // تحويل للصيغة المناسبة للرسوم البيانية
  const sessionsChart = months.map((month) => ({
    month,
    sessions: monthlyData[month]?.sessions || 0,
    completed: monthlyData[month]?.completedSessions || 0,
  }));

  const attendanceChart = months.map((month) => ({
    month,
    attendanceRate:
      monthlyData[month]?.totalAttendanceRecords > 0
        ? (monthlyData[month].attendance /
            monthlyData[month].totalAttendanceRecords) *
          100
        : 0,
    records: monthlyData[month]?.totalAttendanceRecords || 0,
  }));

  const evaluationsChart = months.map((month) => ({
    month,
    evaluations: monthlyData[month]?.evaluations || 0,
    averageScore: monthlyData[month]?.averageScore || 0,
  }));

  // إحصائيات الأداء التراكمي
  const cumulativeStats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter((s) => s.status === "completed").length,
    completionRate:
      sessions.length > 0
        ? (sessions.filter((s) => s.status === "completed").length /
            sessions.length) *
          100
        : 0,

    totalAttendance: sessions.reduce(
      (sum, session) => sum + (session.attendance?.length || 0),
      0
    ),
    presentAttendance: sessions.reduce(
      (sum, session) =>
        sum +
        (session.attendance?.filter(
          (a) => a.status === "present" || a.status === "late"
        ).length || 0),
      0
    ),
    attendanceRate:
      sessions.reduce((sum, session) => {
        const total = session.attendance?.length || 0;
        const present =
          session.attendance?.filter(
            (a) => a.status === "present" || a.status === "late"
          ).length || 0;
        return sum + (total > 0 ? (present / total) * 100 : 0);
      }, 0) / (sessions.length || 1),

    totalEvaluations: evaluations.length,
    averageEvaluationScore:
      evaluations.length > 0
        ? evaluations.reduce(
            (sum, e) => sum + (e.calculatedStats?.overallScore || 0),
            0
          ) / evaluations.length
        : 0,
    passRate:
      evaluations.length > 0
        ? (evaluations.filter((e) => e.finalDecision === "pass").length /
            evaluations.length) *
          100
        : 0,
  };

  return {
    sessions: sessionsChart,
    attendance: attendanceChart,
    evaluations: evaluationsChart,
    cumulative: cumulativeStats,
  };
}

function calculateStudentsAtRisk(students, sessions, groups) {
  let atRiskCount = 0;

  students.forEach((student) => {
    const studentGroups = student.academicInfo?.groupIds || [];

    // حساب الحضور للطالب
    let totalSessions = 0;
    let attendedSessions = 0;

    sessions.forEach((session) => {
      if (
        studentGroups.some(
          (gid) => gid.toString() === session.groupId.toString()
        )
      ) {
        totalSessions++;
        if (session.attendance) {
          const attendanceRecord = session.attendance.find(
            (a) => a.studentId.toString() === student._id.toString()
          );
          if (
            attendanceRecord &&
            (attendanceRecord.status === "present" ||
              attendanceRecord.status === "late")
          ) {
            attendedSessions++;
          }
        }
      }
    });

    const attendanceRate =
      totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

    // الطالب في خطر إذا كان حضوره أقل من 60% وكان لديه أكثر من 3 جلسات
    if (attendanceRate < 60 && totalSessions > 3) {
      atRiskCount++;
    }
  });

  return atRiskCount;
}

function calculateAttendanceTrends(monthlyChart) {
  if (monthlyChart.length < 2) return { trend: "stable", percentage: 0 };

  const recent = monthlyChart.slice(-2);
  const current = recent[1]?.attendanceRate || 0;
  const previous = recent[0]?.attendanceRate || 0;

  const change = current - previous;
  const percentage = previous > 0 ? (change / previous) * 100 : 0;

  let trend = "stable";
  if (change > 5) trend = "improving";
  else if (change < -5) trend = "declining";

  return { trend, percentage: Math.abs(percentage) };
}

// دوال للبيانات الفارغة
function getEmptyOverview() {
  return {
    totalGroups: 0,
    activeGroups: 0,
    completedGroups: 0,
    totalStudents: 0,
    totalSessions: 0,
    completedSessions: 0,
    completionRate: 0,
    averageAttendance: 0,
    studentsAtRisk: 0,
    evaluatedStudents: 0,
    evaluationRate: 0,
    monthlyPerformance: {
      sessionsCompleted: 0,
      totalSessions: 0,
      attendanceRate: 0,
      evaluationsCompleted: 0,
      successRate: 0,
    },
  };
}

function getEmptyGroupsStats() {
  return {
    byLevel: {},
    byStatus: {
      active: { count: 0, students: 0, sessions: 0, attendance: 0 },
      completed: { count: 0, students: 0, sessions: 0, attendance: 0 },
      draft: { count: 0, students: 0, sessions: 0, attendance: 0 },
    },
    topGroupsByAttendance: [],
    distribution: {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    },
  };
}

function getEmptyStudentsStats() {
  return {
    total: 0,
    topStudentsByAttendance: [],
    topStudentsByEvaluation: [],
    studentsNeedingAttention: [],
    attendanceDistribution: {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
      noData: 0,
    },
    averageAttendance: 0,
    evaluatedCount: 0,
    evaluationRate: 0,
  };
}

function getEmptyAttendanceStats() {
  return {
    monthly: [],
    daily: [],
    timeSlots: [],
    reasons: {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    },
    trends: {
      trend: "stable",
      percentage: 0,
    },
  };
}

function getEmptyEvaluationStats() {
  return {
    totalEvaluations: 0,
    decisionDistribution: {
      pass: 0,
      review: 0,
      repeat: 0,
    },
    criteriaAverages: {
      understanding: 0,
      commitment: 0,
      attendance: 0,
      participation: 0,
      overall: 0,
    },
    evaluationsByGroup: {},
    topEvaluations: [],
    bottomEvaluations: [],
    completionRate: 0,
  };
}

function getEmptyTimeSeries() {
  const months = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
      })
    );
  }

  return {
    sessions: months.map((month) => ({ month, sessions: 0, completed: 0 })),
    attendance: months.map((month) => ({
      month,
      attendanceRate: 0,
      records: 0,
    })),
    evaluations: months.map((month) => ({
      month,
      evaluations: 0,
      averageScore: 0,
    })),
    cumulative: {
      totalSessions: 0,
      completedSessions: 0,
      completionRate: 0,
      totalAttendance: 0,
      presentAttendance: 0,
      attendanceRate: 0,
      totalEvaluations: 0,
      averageEvaluationScore: 0,
      passRate: 0,
    },
  };
}
