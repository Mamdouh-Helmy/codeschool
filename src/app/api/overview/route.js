// app/api/overview/route.js
// ✅ API لصفحة نظرة عامة على المدرسين والطلاب وساعاتهم

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../models/Student";
import Group from "../../models/Group";
import Session from "../../models/Session";
import User from "../../models/User";
import { requireAdmin } from "@/utils/authMiddleware";

const SESSION_HOURS = 2; // كل سيشن = ساعتين

export async function GET(req) {
  try {
    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    await connectDB();

    // =============================================
    // ✅ 1. جلب بيانات الطلاب مع الـ credit system
    // =============================================
    const students = await Student.find({ isDeleted: false })
      .select(
        "enrollmentNumber personalInfo guardianInfo enrollmentInfo academicInfo communicationPreferences creditSystem metadata"
      )
      .lean();

    const formattedStudents = students.map((s) => {
      const pkg = s.creditSystem?.currentPackage || null;
      const stats = s.creditSystem?.stats || {};
      const status = s.creditSystem?.status || "no_package";

      const remainingHours = pkg?.remainingHours ?? 0;
      const usedHours = stats.totalHoursUsed ?? 0;
      const totalHours = pkg?.totalHours ?? 0;
      const usagePct =
        totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;

      const hasActiveFreeze = (s.creditSystem?.exceptions || []).some(
        (e) => e.type === "freeze" && e.status === "active"
      );

      let creditLevel = "no_package";
      if (hasActiveFreeze) creditLevel = "frozen";
      else if (status === "active" && remainingHours > 5) creditLevel = "active";
      else if (remainingHours > 0 && remainingHours <= 5) creditLevel = "low";
      else if (remainingHours <= 0 && totalHours > 0) creditLevel = "expired";

      return {
        _id: s._id,
        enrollmentNumber: s.enrollmentNumber,
        name: s.personalInfo?.fullName || "—",
        nickname: {
          ar: s.personalInfo?.nickname?.ar || "",
          en: s.personalInfo?.nickname?.en || "",
        },
        email: s.personalInfo?.email || "",
        phone: s.personalInfo?.phone || "",
        whatsappNumber: s.personalInfo?.whatsappNumber || "",
        gender: s.personalInfo?.gender || "male",
        guardianName: s.guardianInfo?.name || "",
        enrollmentStatus: s.enrollmentInfo?.status || "Active",
        level: s.academicInfo?.level || "Beginner",
        language: s.communicationPreferences?.preferredLanguage || "ar",
        credit: {
          status: creditLevel,
          systemStatus: status,
          hasPackage: !!pkg,
          packageType: pkg?.packageType || null,
          totalHours,
          usedHours,
          remainingHours,
          usagePct,
          packageStartDate: pkg?.startDate || null,
          packageEndDate: pkg?.endDate || null,
          packagePrice: pkg?.price || 0,
          hasActiveFreeze,
          lastUsageDate: stats.lastUsageDate || null,
          totalSessionsAttended: stats.totalSessionsAttended || 0,
          lowBalanceAlertsSent: stats.lowBalanceAlertsSent || 0,
          activeExceptions: (s.creditSystem?.exceptions || []).filter(
            (e) => e.status === "active"
          ).length,
          recentUsage: (s.creditSystem?.usageHistory || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
            .map((u) => ({
              date: u.date,
              hoursDeducted: u.hoursDeducted,
              sessionTitle: u.sessionTitle,
              groupName: u.groupName,
              attendanceStatus: u.attendanceStatus,
            })),
        },
        groupIds: s.academicInfo?.groupIds || [],
        createdAt: s.metadata?.createdAt || s.createdAt,
      };
    });

    // =============================================
    // ✅ 2. جلب بيانات المجموعات مع المدرسين والـ countTime
    // =============================================
    const groups = await Group.find({ isDeleted: false })
      .select("name code courseId courseSnapshot instructors students status schedule totalSessionsCount")
      .populate("instructors.userId", "name email gender image profile")
      .lean();

    // =============================================
    // ✅ 3. جلب السيشنات المكتملة لكل مجموعة
    // =============================================
    const groupIds = groups.map((g) => g._id);

    const completedSessions = await Session.find({
      groupId: { $in: groupIds },
      status: "completed",
      isDeleted: false,
    })
      .select("groupId moduleIndex sessionNumber title scheduledDate startTime endTime attendanceTaken attendance")
      .lean();

    // ✅ تنظيم السيشنات حسب الـ groupId
    const sessionsByGroup = {};
    completedSessions.forEach((sess) => {
      const gId = sess.groupId.toString();
      if (!sessionsByGroup[gId]) sessionsByGroup[gId] = [];
      sessionsByGroup[gId].push(sess);
    });

    // =============================================
    // ✅ 4. بناء بيانات المدرسين
    // =============================================
    const instructorsMap = {};

    groups.forEach((group) => {
      const groupSessions = sessionsByGroup[group._id.toString()] || [];

      group.instructors?.forEach((inst) => {
        if (!inst.userId) return;

        const userId = inst.userId._id
          ? inst.userId._id.toString()
          : inst.userId.toString();

        if (!instructorsMap[userId]) {
          const userData = inst.userId._id ? inst.userId : null;
          instructorsMap[userId] = {
            _id: userId,
            name: userData?.name || "مدرس",
            email: userData?.email || "",
            gender: userData?.gender || "male",
            image: userData?.image || "",
            jobTitle: userData?.profile?.jobTitle || "مدرس",
            groups: [],
            totalHours: 0,
            totalSessions: 0,
            lastSession: null,
          };
        }

        // ✅ الساعات من countTime في الـ Group (كل سيشن = 2 ساعة)
        const hoursInGroup = inst.countTime || 0;
        const sessionsInGroup = groupSessions.length;

        // ✅ آخر سيشن لهذا المدرس في هذه المجموعة
        const sortedSessions = [...groupSessions].sort(
          (a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate)
        );
        const lastSess = sortedSessions[0] || null;

        instructorsMap[userId].groups.push({
          groupId: group._id,
          groupName: group.name,
          groupCode: group.code,
          courseName:
            group.courseSnapshot?.title ||
            group.courseId?.title ||
            "دورة غير محددة",
          groupStatus: group.status,
          hoursInGroup,
          sessionsCount: sessionsInGroup,
          studentsCount: group.students?.length || 0,
          lastSession: lastSess
            ? {
                title: lastSess.title,
                date: lastSess.scheduledDate,
                moduleIndex: lastSess.moduleIndex,
                sessionNumber: lastSess.sessionNumber,
              }
            : null,
          recentSessions: sortedSessions.slice(0, 3).map((s) => ({
            title: s.title,
            date: s.scheduledDate,
            moduleIndex: s.moduleIndex,
            sessionNumber: s.sessionNumber,
          })),
        });

        instructorsMap[userId].totalHours += hoursInGroup;
        instructorsMap[userId].totalSessions += sessionsInGroup;

        // ✅ تحديث آخر سيشن عام للمدرس
        if (
          lastSess &&
          (!instructorsMap[userId].lastSession ||
            new Date(lastSess.scheduledDate) >
              new Date(instructorsMap[userId].lastSession.date))
        ) {
          instructorsMap[userId].lastSession = {
            title: lastSess.title,
            date: lastSess.scheduledDate,
            groupName: group.name,
            moduleIndex: lastSess.moduleIndex,
            sessionNumber: lastSess.sessionNumber,
          };
        }
      });
    });

    const formattedInstructors = Object.values(instructorsMap).sort(
      (a, b) => b.totalHours - a.totalHours
    );

    // =============================================
    // ✅ 5. إحصائيات عامة
    // =============================================
    const totalStudents = formattedStudents.length;
    const activeStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "active"
    ).length;
    const lowBalanceStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "low"
    ).length;
    const expiredStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "expired"
    ).length;
    const frozenStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "frozen"
    ).length;
    const noPackageStudents = formattedStudents.filter(
      (s) => s.credit.creditLevel === "no_package"
    ).length;
    const totalRemainingHours = formattedStudents.reduce(
      (s, st) => s + st.credit.remainingHours,
      0
    );
    const totalUsedHours = formattedStudents.reduce(
      (s, st) => s + st.credit.usedHours,
      0
    );

    const totalInstructors = formattedInstructors.length;
    const totalInstructorHours = formattedInstructors.reduce(
      (s, i) => s + i.totalHours,
      0
    );
    const totalInstructorSessions = formattedInstructors.reduce(
      (s, i) => s + i.totalSessions,
      0
    );
    const totalCompletedSessions = completedSessions.length;

    const stats = {
      students: {
        total: totalStudents,
        active: formattedStudents.filter(
          (s) => s.enrollmentStatus === "Active"
        ).length,
        graduated: formattedStudents.filter(
          (s) => s.enrollmentStatus === "Graduated"
        ).length,
        suspended: formattedStudents.filter(
          (s) => s.enrollmentStatus === "Suspended"
        ).length,
        dropped: formattedStudents.filter(
          (s) => s.enrollmentStatus === "Dropped"
        ).length,
      },
      credit: {
        totalWithPackage: formattedStudents.filter((s) => s.credit.hasPackage)
          .length,
        active: formattedStudents.filter(
          (s) => s.credit.creditLevel === "active"
        ).length,
        low: lowBalanceStudents,
        expired: expiredStudents,
        frozen: frozenStudents,
        noPackage: noPackageStudents,
        totalRemainingHours,
        totalUsedHours,
      },
      instructors: {
        total: totalInstructors,
        totalHours: totalInstructorHours,
        totalSessions: totalInstructorSessions,
        avgHoursPerInstructor:
          totalInstructors > 0
            ? Math.round(totalInstructorHours / totalInstructors)
            : 0,
      },
      sessions: {
        totalCompleted: totalCompletedSessions,
        totalHours: totalCompletedSessions * SESSION_HOURS,
      },
      groups: {
        total: groups.length,
        active: groups.filter((g) => g.status === "active").length,
        completed: groups.filter((g) => g.status === "completed").length,
        draft: groups.filter((g) => g.status === "draft").length,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          instructors: formattedInstructors,
          students: formattedStudents,
          stats,
          sessionHours: SESSION_HOURS,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Overview API Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب البيانات",
        error: error.message,
      },
      { status: 500 }
    );
  }
}