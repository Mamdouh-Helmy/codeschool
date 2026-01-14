import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import Group from "../../../models/Group";
import Session from "../../../models/Session";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    // الحصول على بيانات الطالب المرتبطة بـ User
    const student = await Student.findOne({ authUserId: user.id })
      .select("_id academicInfo.groupIds personalInfo.fullName")
      .lean();

    if (!student) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        stats: {
          total: 0,
          active: 0,
          completed: 0,
        },
      });
    }

    const studentId = student._id;
    const groupIds = student.academicInfo?.groupIds || [];

    if (groupIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        stats: {
          total: 0,
          active: 0,
          completed: 0,
        },
      });
    }

    // بناء الاستعلام
    let query = {
      _id: { $in: groupIds },
      isDeleted: false,
    };

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    // جلب المجموعات
    const groups = await Group.find(query)
      .populate("courseId", "title level")
      .populate("instructors", "name email")
      .sort({ "schedule.startDate": -1 })
      .lean();

    // حساب الإحصائيات
    const totalGroups = groupIds.length;
    const activeGroups = groups.filter(g => g.status === "active").length;
    const completedGroups = groups.filter(g => g.status === "completed").length;

    // حساب عدد الجلسات لكل مجموعة
    const groupsWithSessions = await Promise.all(
      groups.map(async (group) => {
        const sessionsCount = await Session.countDocuments({
          groupId: group._id,
          isDeleted: false,
        });

        const completedSessions = await Session.countDocuments({
          groupId: group._id,
          status: "completed",
          isDeleted: false,
        });

        // حساب نسبة الحضور لهذه المجموعة
        const groupSessions = await Session.find({
          groupId: group._id,
          isDeleted: false,
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

        const groupAttendanceRate = groupSessions.length > 0
          ? Math.round((attendedSessions / groupSessions.length) * 100)
          : 0;

        return {
          _id: group._id,
          name: group.name,
          code: group.code,
          status: group.status,
          course: {
            title: group.courseId?.title || "غير محدد",
            level: group.courseId?.level || "غير محدد",
          },
          instructors: group.instructors || [],
          currentStudentsCount: group.currentStudentsCount || 0,
          maxStudents: group.maxStudents || 0,
          schedule: group.schedule,
          pricing: group.pricing,
          automation: group.automation,
          sessionsGenerated: group.sessionsGenerated || false,
          totalSessions: sessionsCount,
          completedSessions: completedSessions,
          attendanceRate: groupAttendanceRate,
          metadata: group.metadata || {},
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: groupsWithSessions,
      count: groupsWithSessions.length,
      stats: {
        total: totalGroups,
        active: activeGroups,
        completed: completedGroups,
      },
    });
  } catch (error) {
    console.error("Error fetching student groups:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في جلب مجموعات الطالب",
        error: error.message,
      },
      { status: 500 }
    );
  }
}