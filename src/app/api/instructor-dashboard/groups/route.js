import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import Student from "../../../models/Student";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    console.log("👥 [Instructor Groups API] Request received");

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log("❌ [Instructor Groups] Unauthorized - No user found");
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

    console.log("✅ [Instructor Groups] User authenticated:", {
      id: user.id,
      name: user.name,
      role: user.role
    });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // بناء الاستعلام
    let query = {
      instructors: user.id,
      isDeleted: false
    };

    // فلترة حسب الحالة
    if (status && status !== "all") {
      query.status = status;
    }

    // فلترة حسب البحث
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } }
      ];
    }

    console.log(`🔍 [Instructor Groups] Query:`, {
      instructorId: user.id,
      status,
      search,
      page,
      limit
    });

    // حساب العدد الإجمالي
    const total = await Group.countDocuments(query);
    console.log(`📊 [Instructor Groups] Total groups found: ${total}`);

    // جلب المجموعات مع البوبيوليت
    const groups = await Group.find(query)
      .populate("courseId", "title level")
      .populate("instructors", "name email profile")
      .select("name code status currentStudentsCount maxStudents schedule pricing totalSessionsCount automation metadata")
      .sort({ "schedule.startDate": -1, "metadata.createdAt": -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log(`✅ [Instructor Groups] Fetched ${groups.length} groups`);

    // جلب إحصائيات إضافية لكل مجموعة
    const groupsWithStats = await Promise.all(
      groups.map(async (group) => {
        // جلب عدد الجلسات المكتملة
        const completedSessions = await Session.countDocuments({
          groupId: group._id,
          isDeleted: false,
          status: "completed"
        });

        // جلب الجلسة التالية
        const now = new Date();
        const nextSession = await Session.findOne({
          groupId: group._id,
          scheduledDate: { $gte: now },
          isDeleted: false,
          status: "scheduled"
        })
          .select("title scheduledDate startTime endTime")
          .sort({ scheduledDate: 1 })
          .lean();

        // جلب نسبة الحضور
        const sessionsWithAttendance = await Session.find({
          groupId: group._id,
          isDeleted: false,
          attendanceTaken: true
        })
          .select("attendance")
          .lean();

        let totalAttendanceRecords = 0;
        let totalPossibleAttendance = 0;

        sessionsWithAttendance.forEach(session => {
          totalAttendanceRecords += session.attendance?.length || 0;
          // حساب العدد المتوقع (عدد الطلاب × عدد الجلسات)
          totalPossibleAttendance += group.currentStudentsCount || 0;
        });

        const attendanceRate = totalPossibleAttendance > 0 
          ? Math.round((totalAttendanceRecords / totalPossibleAttendance) * 100)
          : 0;

        // جلب الطلاب المحتاجين متابعة (غياب متكرر)
        const allSessions = await Session.find({
          groupId: group._id,
          isDeleted: false,
          attendanceTaken: true
        })
          .select("attendance")
          .lean();

        const studentsAttendance = {};
        allSessions.forEach(session => {
          if (session.attendance) {
            session.attendance.forEach(record => {
              const studentId = record.studentId.toString();
              if (!studentsAttendance[studentId]) {
                studentsAttendance[studentId] = {
                  present: 0,
                  absent: 0,
                  late: 0,
                  excused: 0,
                  total: 0
                };
              }
              studentsAttendance[studentId][record.status]++;
              studentsAttendance[studentId].total++;
            });
          }
        });

        const studentsAtRisk = Object.entries(studentsAttendance)
          .filter(([_, stats]) => {
            const attendancePercentage = (stats.present + stats.late + stats.excused) / stats.total * 100;
            return attendancePercentage < 70 && stats.total >= 3; // أقل من 70% حضور وله 3 جلسات على الأقل
          })
          .length;

        return {
          id: group._id,
          name: group.name,
          code: group.code,
          status: group.status,
          course: {
            title: group.courseId?.title || "غير محدد",
            level: group.courseId?.level || "غير محدد"
          },
          instructors: group.instructors || [],
          schedule: {
            startDate: group.schedule?.startDate,
            daysOfWeek: group.schedule?.daysOfWeek || [],
            timeFrom: group.schedule?.timeFrom,
            timeTo: group.schedule?.timeTo,
            timezone: group.schedule?.timezone || "Africa/Cairo"
          },
          studentCount: group.currentStudentsCount || 0,
          maxStudents: group.maxStudents || 0,
          pricing: group.pricing || {},
          automation: group.automation || {},
          stats: {
            totalSessions: group.totalSessionsCount || 0,
            completedSessions,
            upcomingSessions: (group.totalSessionsCount || 0) - completedSessions,
            attendanceRate,
            studentsAtRisk,
            studentCapacity: group.currentStudentsCount && group.maxStudents 
              ? `${group.currentStudentsCount}/${group.maxStudents}`
              : "0/0"
          },
          nextSession: nextSession ? {
            title: nextSession.title,
            date: nextSession.scheduledDate,
            time: `${nextSession.startTime} - ${nextSession.endTime}`
          } : null,
          progress: group.status === "completed" ? 100 : 
                   completedSessions > 0 ? Math.round((completedSessions / (group.totalSessionsCount || 1)) * 100) : 0,
          metadata: group.metadata || {},
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        };
      })
    );

    // حساب الإحصائيات الإجمالية
    const totalStats = {
      totalGroups: total,
      activeGroups: groups.filter(g => g.status === "active").length,
      completedGroups: groups.filter(g => g.status === "completed").length,
      totalStudents: groups.reduce((sum, g) => sum + (g.currentStudentsCount || 0), 0),
      averageAttendance: groupsWithStats.reduce((sum, g) => sum + g.stats.attendanceRate, 0) / (groupsWithStats.length || 1),
      totalStudentsAtRisk: groupsWithStats.reduce((sum, g) => sum + g.stats.studentsAtRisk, 0)
    };

    const response = {
      success: true,
      data: groupsWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      stats: totalStats,
      filters: {
        search: search || "",
        status: status || "all",
        applied: {
          search: !!search,
          status: status && status !== "all"
        }
      }
    };

    console.log("✅ [Instructor Groups] Response ready:", {
      groups: groupsWithStats.length,
      totalStats
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ [Instructor Groups API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب مجموعات المدرس",
        error: error.message,
        code: "GROUPS_ERROR"
      },
      { status: 500 }
    );
  }
}