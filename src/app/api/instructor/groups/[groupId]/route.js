// app/api/instructor/groups/[groupId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import Group from "@/app/models/Group";
import Session from "@/app/models/Session";
import Student from "@/app/models/Student";

export async function GET(req, { params }) {
  try {
    const { groupId } = await params;

    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "غير مصرح بالوصول", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    await connectDB();

    // ── 1. Fetch group ───────────────────────────────────────────────────
    const group = await Group.findOne({
      _id: groupId,
      "instructors.userId": user.id,
      isDeleted: false,
    })
      .populate({
        path: "courseId",
        select: "title description level grade subject duration thumbnail curriculum",
      })
      .lean();

    if (!group) {
      return NextResponse.json(
        { success: false, message: "المجموعة غير موجودة أو غير مصرح لك" },
        { status: 404 }
      );
    }

    // ── 2. Sessions ──────────────────────────────────────────────────────
    const sessions = await Session.find({ groupId, isDeleted: false })
      .select("title status scheduledDate startTime endTime moduleIndex sessionNumber lessonIndexes attendanceTaken attendance meetingLink recordingLink")
      .sort({ scheduledDate: 1 })
      .lean();

    const now        = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

    const course     = group.courseId || {};
    const curriculum = course.curriculum || [];

    const processedSessions = sessions.map((s) => {
      const moduleData = curriculum[s.moduleIndex] || {};
      // deduplicated lessons
      const seen    = new Set();
      const lessons = (moduleData.lessons || [])
        .filter((l) => l.sessionNumber === s.sessionNumber)
        .filter((l) => { if (seen.has(l.title)) return false; seen.add(l.title); return true; })
        .map((l) => ({ title: l.title, description: l.description, duration: l.duration, order: l.order }));

      const sessionDate = new Date(s.scheduledDate);
      const isToday     = sessionDate >= todayStart && sessionDate <= todayEnd;
      const [eH = 23, eM = 59] = (s.endTime || "23:59").split(":").map(Number);
      const endDt = new Date(sessionDate); endDt.setHours(eH, eM, 0, 0);

      const presentCount = (s.attendance || []).filter((a) => a.status === "present").length;
      const absentCount  = (s.attendance || []).filter((a) => a.status === "absent").length;
      const lateCount    = (s.attendance || []).filter((a) => a.status === "late").length;
      const totalMarked  = s.attendance?.length || 0;
      const attRate = totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : null;

      return {
        _id:             s._id,
        title:           s.title,
        status:          s.status,
        scheduledDate:   s.scheduledDate,
        startTime:       s.startTime,
        endTime:         s.endTime,
        moduleIndex:     s.moduleIndex,
        moduleName:      moduleData.title || `الوحدة ${s.moduleIndex + 1}`,
        sessionNumber:   s.sessionNumber,
        lessons,
        attendanceTaken: s.attendanceTaken,
        meetingLink:     s.meetingLink  || null,
        recordingLink:   s.recordingLink || null,
        isToday,
        showJoinButton: s.status === "scheduled" && isToday && endDt > now && !!s.meetingLink,
        stats: { presentCount, absentCount, lateCount, totalMarked, attRate },
      };
    });

    // group sessions by module
    const byModule = {};
    processedSessions.forEach((s) => {
      const key = `module_${s.moduleIndex}`;
      if (!byModule[key]) {
        const md = curriculum[s.moduleIndex] || {};
        byModule[key] = {
          moduleIndex:  s.moduleIndex,
          moduleNumber: s.moduleIndex + 1,
          title:        md.title       || `الوحدة ${s.moduleIndex + 1}`,
          description:  md.description || "",
          presentationUrls: (md.sessions || []).map((ms) => ({
            sessionNumber: ms.sessionNumber,
            url: ms.presentationUrl || "",
          })).filter((p) => p.url),
          projects: md.projects || [],
          blogBodyAr: md.blogBodyAr || "",
          blogBodyEn: md.blogBodyEn || "",
          sessions: [],
        };
      }
      byModule[key].sessions.push(s);
    });

    const modules = Object.values(byModule).sort((a, b) => a.moduleIndex - b.moduleIndex);

    // ── 3. Students summary ──────────────────────────────────────────────
    const students = await Student.find({
      _id: { $in: group.students || [] },
      isDeleted: false,
    })
      .select("personalInfo.fullName personalInfo.whatsappNumber guardianInfo.name creditSystem.currentPackage enrollmentInfo.status")
      .lean();

    const studentsData = students.map((s) => ({
      _id:    s._id,
      name:   s.personalInfo?.fullName || "—",
      phone:  s.personalInfo?.whatsappNumber || "",
      guardian: s.guardianInfo?.name || "",
      credits: s.creditSystem?.currentPackage?.remainingHours ?? null,
      status: s.enrollmentInfo?.status || "Active",
    }));

    // ── 4. Group stats ───────────────────────────────────────────────────
    const totalSess     = processedSessions.length;
    const completedSess = processedSessions.filter((s) => s.status === "completed").length;
    const scheduledSess = processedSessions.filter((s) => s.status === "scheduled").length;
    const progress      = totalSess > 0 ? Math.round((completedSess / totalSess) * 100) : 0;

    const instructorEntry = (group.instructors || []).find(
      (i) => i.userId?.toString() === user.id?.toString()
    );

    // deduplicated unique lessons count
    const uniqueLessonsCount = curriculum.reduce((acc, m) => {
      const seen = new Set();
      (m.lessons || []).forEach((l) => seen.add(l.title));
      return acc + seen.size;
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        group: {
          _id:          group._id,
          name:         group.name,
          code:         group.code,
          status:       group.status,
          maxStudents:  group.maxStudents,
          currentStudentsCount: group.currentStudentsCount || students.length,
          schedule:     group.schedule || null,
          firstMeetingLink: group.firstMeetingLink || null,
          automation:   group.automation || {},
          teachingHours: instructorEntry?.countTime || 0,
          progress,
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
          totalModules: curriculum.length,
          totalLessons: uniqueLessonsCount,
          totalSessions: curriculum.reduce((a, m) => a + (m.totalSessions || 3), 0),
          // ✅ Full curriculum for Course tab display
          curriculum: curriculum.map((mod) => ({
            title:       mod.title       || "",
            description: mod.description || "",
            order:       mod.order,
            totalSessions: mod.totalSessions || 3,
            blogBodyAr:  mod.blogBodyAr  || "",
            blogBodyEn:  mod.blogBodyEn  || "",
            projects:    mod.projects    || [],
            sessions:    (mod.sessions || []).map((s) => ({
              sessionNumber:   s.sessionNumber,
              presentationUrl: s.presentationUrl || "",
            })),
            lessons: mod.lessons || [], // raw, frontend will deduplicate
          })),
        } : null,
        sessions: {
          all:       processedSessions,
          byModule:  modules,
          stats: {
            total:     totalSess,
            completed: completedSess,
            scheduled: scheduledSess,
            remaining: totalSess - completedSess,
            needsAttendance: processedSessions.filter((s) => s.status === "completed" && !s.attendanceTaken).length,
            overallAttRate: (() => {
              const allAtt = processedSessions.flatMap((s) => []);
              const comp   = processedSessions.filter((s) => s.stats?.totalMarked > 0);
              if (!comp.length) return null;
              return Math.round(comp.reduce((a, s) => a + (s.stats?.attRate || 0), 0) / comp.length);
            })(),
          },
        },
        students: studentsData,
      },
    });

  } catch (error) {
    console.error("❌ [Instructor Group Detail API]:", error);
    return NextResponse.json(
      { success: false, message: "فشل تحميل تفاصيل المجموعة", error: error.message },
      { status: 500 }
    );
  }
}