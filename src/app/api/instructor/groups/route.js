// app/api/instructor/groups/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "../../../models/Group";
import Session from "../../../models/Session";

export async function GET(req) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    if (user.role !== "instructor" && user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "هذه الصفحة للمدرسين فقط", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    await connectDB();

    // ── 1. Fetch all groups for this instructor ──────────────────────────
    const groups = await Group.find({
      "instructors.userId": user.id,
      isDeleted: false,
    })
      .populate({
        path: "courseId",
        select: "title description level grade subject duration thumbnail curriculum",
      })
      .populate({
        path: "students",
        select: "_id",
      })
      .lean();

    if (groups.length === 0) {
      return NextResponse.json({ success: true, data: { groups: [], stats: { total: 0, active: 0, completed: 0, draft: 0 } } });
    }

    // ── 2. Get session stats per group ───────────────────────────────────
    const groupIds = groups.map((g) => g._id);
    const sessionAgg = await Session.aggregate([
      { $match: { groupId: { $in: groupIds }, isDeleted: false } },
      {
        $group: {
          _id: "$groupId",
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] } },
          needsAtt:  { $sum: { $cond: [{ $and: [{ $eq: ["$status", "completed"] }, { $eq: ["$attendanceTaken", false] }] }, 1, 0] } },
        },
      },
    ]);

    const sessionMap = {};
    sessionAgg.forEach((s) => { sessionMap[s._id.toString()] = s; });

    // ── 3. Process each group ────────────────────────────────────────────
    const processed = groups.map((group) => {
      const gid       = group._id.toString();
      const sesStats  = sessionMap[gid] || { total: 0, completed: 0, scheduled: 0, needsAtt: 0 };
      const course    = group.courseId || {};
      const totalSess = sesStats.total || 0;
      const doneSess  = sesStats.completed || 0;
      const progress  = totalSess > 0 ? Math.round((doneSess / totalSess) * 100) : 0;

      // instructor's teaching hours for this group
      const instructorEntry = (group.instructors || []).find(
        (i) => i.userId?.toString() === user.id?.toString()
      );
      const teachingHours = instructorEntry?.countTime || 0;

      // curriculum summary: modules + total lessons
      const curriculum = course.curriculum || [];
      const totalModules = curriculum.length;
      const totalLessons = curriculum.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
      // deduplicate lessons per module (same title pattern as sessions page)
      const uniqueLessonsCount = curriculum.reduce((acc, m) => {
        const seen = new Set();
        (m.lessons || []).forEach((l) => seen.add(l.title));
        return acc + seen.size;
      }, 0);

      return {
        _id:          group._id,
        name:         group.name,
        code:         group.code,
        status:       group.status,
        maxStudents:  group.maxStudents,
        currentStudentsCount: group.currentStudentsCount || (group.students?.length || 0),
        schedule:     group.schedule || null,
        firstMeetingLink: group.firstMeetingLink || null,
        teachingHours,
        progress,
        sessions: {
          total:     totalSess,
          completed: doneSess,
          scheduled: sesStats.scheduled || 0,
          remaining: totalSess - doneSess,
          needsAttendance: sesStats.needsAtt || 0,
        },
        course: course._id ? {
          _id:         course._id,
          title:       course.title       || "",
          description: course.description || "",
          level:       course.level       || "",
          grade:       course.grade       || "",
          subject:     course.subject     || "",
          duration:    course.duration    || "",
          thumbnail:   course.thumbnail   || "",
          totalModules,
          totalLessons: uniqueLessonsCount,
          totalSessions: curriculum.reduce((a, m) => a + (m.totalSessions || 3), 0),
        } : null,
      };
    });

    // ── 4. Stats ─────────────────────────────────────────────────────────
    const stats = {
      total:     processed.length,
      active:    processed.filter((g) => g.status === "active").length,
      completed: processed.filter((g) => g.status === "completed").length,
      draft:     processed.filter((g) => g.status === "draft").length,
    };

    return NextResponse.json({ success: true, data: { groups: processed, stats } });

  } catch (error) {
    console.error("❌ [Instructor Groups API]:", error);
    return NextResponse.json(
      { success: false, message: "فشل تحميل المجموعات", error: error.message },
      { status: 500 }
    );
  }
}