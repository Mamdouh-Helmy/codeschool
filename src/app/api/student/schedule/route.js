// /api/student/schedule/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Student from "../../../models/Student";
import Session from "../../../models/Session";
import Group from "../../../models/Group";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findOne({ authUserId: user.id })
      .select("_id academicInfo.groupIds")
      .lean();

    if (!student) {
      return NextResponse.json({
        success: true,
        data: { sessions: [], groups: [], stats: { total: 0, completed: 0, upcoming: 0, today: 0 } }
      });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "month"; // month | week | list
    const dateParam = searchParams.get("date") || new Date().toISOString();
    const groupFilter = searchParams.get("group") || "all";
    const statusFilter = searchParams.get("status") || "all";

    const targetDate = new Date(dateParam);
    const groupIds = student.academicInfo?.groupIds || [];

    // Build date range based on view
    let startDate, endDate;
    if (view === "week") {
      const day = targetDate.getDay();
      startDate = new Date(targetDate);
      startDate.setDate(targetDate.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (view === "list") {
      // Same as month - respect the selected date from frontend
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // month
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Build query
    const query = {
      groupId: { $in: groupIds },
      scheduledDate: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    };

    if (statusFilter !== "all") query.status = statusFilter;

    let sessions = await Session.find(query)
      .populate("groupId", "name code courseId")
      .populate({ path: "groupId", populate: { path: "courseId", select: "title level" } })
      .select("title scheduledDate startTime endTime status attendanceTaken attendance meetingLink recordingLink moduleIndex sessionNumber groupId lessonIndexes meetingPlatform")
      .sort({ scheduledDate: 1, startTime: 1 })
      .lean();

    if (groupFilter !== "all") {
      sessions = sessions.filter(s => s.groupId?._id?.toString() === groupFilter);
    }

    const studentId = student._id.toString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formattedSessions = sessions.map(session => {
      const sessionDate = new Date(session.scheduledDate);
      const isToday = sessionDate.toDateString() === new Date().toDateString();
      const isPast = session.status === "completed";
      const isUpcoming = session.status === "scheduled" && sessionDate >= new Date();

      // Get student attendance for this session
      const attendanceRecord = session.attendance?.find(
        a => a.studentId?.toString() === studentId
      );

      const attendanceStatus = attendanceRecord?.status || null;

      const courseTitle = session.groupId?.courseId?.title || session.groupId?.name || "دورة";
      const groupName = session.groupId?.name || "مجموعة";
      const groupCode = session.groupId?.code || "";

      // Pick color per group
      const groupColors = {
        default: { gradient: "from-purple-500 to-indigo-600", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", dot: "bg-purple-500" },
        0: { gradient: "from-blue-500 to-cyan-500", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
        1: { gradient: "from-green-400 to-emerald-500", bg: "bg-green-50", border: "border-green-200", text: "text-green-700", dot: "bg-green-500" },
        2: { gradient: "from-pink-500 to-rose-500", bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700", dot: "bg-pink-500" },
        3: { gradient: "from-amber-400 to-orange-500", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
      };

      const groupIndex = groupIds.findIndex(id => id.toString() === session.groupId?._id?.toString());
      const colorScheme = groupColors[groupIndex] || groupColors.default;

      return {
        _id: session._id,
        title: session.title,
        courseTitle,
        groupName,
        groupCode,
        groupId: session.groupId?._id,
        scheduledDate: session.scheduledDate,
        dateStr: sessionDate.toISOString().split("T")[0],
        startTime: session.startTime,
        endTime: session.endTime,
        formattedDate: sessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        formattedDateAr: sessionDate.toLocaleDateString("ar-EG", { month: "long", day: "numeric", year: "numeric" }),
        dayName: sessionDate.toLocaleDateString("en-US", { weekday: "long" }),
        dayNameAr: sessionDate.toLocaleDateString("ar-EG", { weekday: "long" }),
        status: session.status,
        attendanceTaken: session.attendanceTaken,
        attendanceStatus,
        meetingLink: session.meetingLink,
        recordingLink: session.recordingLink,
        moduleIndex: session.moduleIndex,
        sessionNumber: session.sessionNumber,
        meetingPlatform: session.meetingPlatform,
        isToday,
        isPast,
        isUpcoming,
        colorScheme,
        lessonIndexes: session.lessonIndexes || [],
      };
    });

    // Stats
    const allStudentSessions = await Session.find({
      groupId: { $in: groupIds },
      isDeleted: false,
    }).select("status scheduledDate attendance").lean();

    const todayStr = new Date().toDateString();
    const stats = {
      total: allStudentSessions.length,
      completed: allStudentSessions.filter(s => s.status === "completed").length,
      upcoming: allStudentSessions.filter(s => s.status === "scheduled" && new Date(s.scheduledDate) >= new Date()).length,
      today: allStudentSessions.filter(s => new Date(s.scheduledDate).toDateString() === todayStr && s.status === "scheduled").length,
      cancelled: allStudentSessions.filter(s => s.status === "cancelled").length,
    };

    // Groups for filter
    const groups = await Group.find({ _id: { $in: groupIds }, isDeleted: false })
      .populate("courseId", "title")
      .select("name code courseId status")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        sessions: formattedSessions,
        groups: groups.map(g => ({
          _id: g._id,
          name: g.name,
          code: g.code,
          courseTitle: g.courseId?.title || g.name,
          status: g.status,
        })),
        stats,
        dateRange: { start: startDate, end: endDate },
        view,
      }
    });
  } catch (error) {
    console.error("❌ [Schedule API] Error:", error);
    return NextResponse.json({ success: false, message: "فشل في تحميل الجدول", error: error.message }, { status: 500 });
  }
}