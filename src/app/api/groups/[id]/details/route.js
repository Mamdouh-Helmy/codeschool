// app/api/groups/[id]/details/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Group from "../../../../models/Group";
import Session from "../../../../models/Session";
import { requireAdmin } from "@/utils/authMiddleware";
import mongoose from "mongoose";

export async function GET(req, { params }) {
  try {
    const { id: groupId } = await params;

    const authCheck = await requireAdmin(req);
    if (!authCheck.authorized) return authCheck.response;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ success: false, error: "Invalid group ID" }, { status: 400 });
    }

    await connectDB();

    // ══════════════════════════════════════════════
    // 1. جلب بيانات المجموعة
    // ══════════════════════════════════════════════
    const group = await Group.findOne({ _id: groupId, isDeleted: false })
      .populate({ path: "instructors", select: "name email gender profile" })
      .populate({ path: "students",    select: "personalInfo.fullName personalInfo.whatsappNumber enrollmentNumber" })
      .populate({ path: "courseId",    select: "title level" })
      .lean();

    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    // ══════════════════════════════════════════════
    // 2. جلب كل الحصص مع الحضور الكامل
    // ══════════════════════════════════════════════
    // attendance في الـ Session Model هو array من { studentId: ObjectId, status: String }
    const sessions = await Session.find({
      groupId: new mongoose.Types.ObjectId(groupId),
      isDeleted: false,
    })
      .populate({
        path:   "attendance.studentId",
        select: "personalInfo.fullName enrollmentNumber",
      })
      .sort({ scheduledDate: 1 })
      .lean();

    // ══════════════════════════════════════════════
    // 3. إحصائيات الحصص
    // ══════════════════════════════════════════════
    const total     = sessions.length;
    const completed = sessions.filter(s => s.status === "completed").length;
    const scheduled = sessions.filter(s => s.status === "scheduled").length;
    const cancelled = sessions.filter(s => s.status === "cancelled").length;
    const postponed = sessions.filter(s => s.status === "postponed").length;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // متوسط حضور المجموعة (من الحصص المكتملة التي رُصد فيها الحضور)
    const sessionsWithAtt = sessions.filter(
      s => s.status === "completed" && s.attendanceTaken && s.attendance?.length > 0
    );
    let avgAttPct = 0;
    if (sessionsWithAtt.length > 0) {
      const total_att_sum = sessionsWithAtt.reduce((acc, s) => {
        const presentCount = s.attendance.filter(
          a => a.status === "present" || a.status === "late"
        ).length;
        return acc + (s.attendance.length > 0 ? (presentCount / s.attendance.length) * 100 : 0);
      }, 0);
      avgAttPct = Math.round(total_att_sum / sessionsWithAtt.length);
    }

    // ══════════════════════════════════════════════
    // 4. بناء قائمة الحصص بشكل مناسب للعرض
    // ══════════════════════════════════════════════
    const sessionsList = sessions.map(s => {
      const d   = new Date(s.scheduledDate);
      const att = s.attendance || [];
      return {
        id:            s._id.toString(),
        title:         s.title || `حصة ${s.sessionNumber}`,
        moduleNumber:  (s.moduleIndex ?? 0) + 1,
        sessionNumber: s.sessionNumber,
        date:          d.toISOString().split("T")[0],
        dayName:       d.toLocaleDateString("en-US", { weekday: "long" }),
        startTime:     s.startTime || "",
        endTime:       s.endTime   || "",
        status:        s.status,
        attendanceTaken: !!s.attendanceTaken,
        meetingLink:   s.meetingLink  || null,
        recordingLink: s.recordingLink || null,
        summary: {
          total:   att.length,
          present: att.filter(a => a.status === "present").length,
          absent:  att.filter(a => a.status === "absent").length,
          late:    att.filter(a => a.status === "late").length,
          excused: att.filter(a => a.status === "excused").length,
        },
        // كل سجل حضور بيشمل studentId كـ string
        attendanceRecords: att.map(a => ({
          studentId: (a.studentId?._id || a.studentId || "").toString(),
          status:    a.status,
          notes:     a.notes || "",
        })),
      };
    });

    // ══════════════════════════════════════════════
    // 5. إحصائيات كل طالب بشكل دقيق
    // ══════════════════════════════════════════════
    // الحصص المكتملة التي رُصد فيها الحضور فعلاً
    const doneSessions = sessionsList.filter(
      s => s.status === "completed" && s.attendanceTaken
    );

    const studentsData = (group.students || []).map(student => {
      const sid     = student._id.toString();
      let present   = 0;
      let absent    = 0;
      let late      = 0;
      let excused   = 0;

      // سجل كل حصة للطالب
      const log = [];

      // ─ الحصص المكتملة (رُصد فيها الحضور)
      doneSessions.forEach(sess => {
        // ابحث عن سجل الطالب في هذه الحصة
        const record = sess.attendanceRecords.find(r => r.studentId === sid);
        // لو مفيش سجل = غائب تلقائياً
        const status = record ? record.status : "absent";

        if      (status === "present") present++;
        else if (status === "absent")  absent++;
        else if (status === "late")    late++;
        else if (status === "excused") excused++;

        log.push({
          sessionId:     sess.id,
          title:         sess.title,
          moduleNumber:  sess.moduleNumber,
          sessionNumber: sess.sessionNumber,
          date:          sess.date,
          dayName:       sess.dayName,
          startTime:     sess.startTime,
          status,                      // حالة الطالب في الحصة
          sessionStatus: sess.status,  // حالة الحصة نفسها
        });
      });

      // ─ الحصص الملغية والمؤجلة (بدون حضور)
      sessionsList
        .filter(s => s.status === "cancelled" || s.status === "postponed")
        .forEach(sess => {
          log.push({
            sessionId:     sess.id,
            title:         sess.title,
            moduleNumber:  sess.moduleNumber,
            sessionNumber: sess.sessionNumber,
            date:          sess.date,
            dayName:       sess.dayName,
            startTime:     sess.startTime,
            status:        sess.status,  // "cancelled" أو "postponed"
            sessionStatus: sess.status,
          });
        });

      // ─ الحصص القادمة
      sessionsList
        .filter(s => s.status === "scheduled")
        .forEach(sess => {
          log.push({
            sessionId:     sess.id,
            title:         sess.title,
            moduleNumber:  sess.moduleNumber,
            sessionNumber: sess.sessionNumber,
            date:          sess.date,
            dayName:       sess.dayName,
            startTime:     sess.startTime,
            status:        "upcoming",
            sessionStatus: sess.status,
          });
        });

      // ترتيب بالتاريخ
      log.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

      const totalDone    = present + absent + late + excused;
      const attended     = present + late; // متأخر = حضر
      const attendancePct = totalDone > 0 ? Math.round((attended / totalDone) * 100) : 0;

      return {
        id:         sid,
        name:       student.personalInfo?.fullName   || "بدون اسم",
        enrollment: student.enrollmentNumber          || "—",
        whatsapp:   student.personalInfo?.whatsappNumber || null,
        attendance: { present, absent, late, excused, totalDone, attended, attendancePct },
        log,
      };
    });

    // ══════════════════════════════════════════════
    // 6. الرد
    // ══════════════════════════════════════════════
    return NextResponse.json({
      success: true,
      data: {
        group: {
          id:          group._id.toString(),
          name:        group.name,
          code:        group.code,
          status:      group.status,
          maxStudents: group.maxStudents,
          currentStudentsCount: group.currentStudentsCount || 0,
          course: {
            title:         group.courseId?.title         || group.courseSnapshot?.title         || "—",
            level:         group.courseId?.level         || group.courseSnapshot?.level         || "—",
            modulesCount:  group.courseSnapshot?.curriculumModulesCount || 0,
            totalLessons:  group.courseSnapshot?.totalLessons           || 0,
            totalSessions: group.courseSnapshot?.totalSessions          || 0,
          },
          schedule: {
            startDate:  group.schedule?.startDate  || null,
            daysOfWeek: group.schedule?.daysOfWeek || [],
            timeFrom:   group.schedule?.timeFrom   || "",
            timeTo:     group.schedule?.timeTo     || "",
          },
          instructors: (group.instructors || []).map(i => ({
            id:     i._id.toString(),
            name:   i.name,
            email:  i.email  || "",
            gender: i.gender || "male",
            phone:  i.profile?.phone || null,
          })),
        },

        stats: {
          sessions: { total, completed, scheduled, cancelled, postponed, progressPct },
          attendance: { avgPct: avgAttPct, sessionsWithAttendance: sessionsWithAtt.length },
          students:   { total: group.students?.length || 0, maxSlots: group.maxStudents },
        },

        sessions: sessionsList,
        students: studentsData,
      },
    });

  } catch (error) {
    console.error("❌ /api/groups/[id]/details error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}