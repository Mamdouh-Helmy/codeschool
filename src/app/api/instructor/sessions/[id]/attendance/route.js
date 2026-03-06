// src/app/api/instructor/sessions/[id]/attendance/route.js

import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import {
  getAttendanceTemplatesForFrontend,
  sendAbsenceNotifications,
  sendLowBalanceAlerts,
  disableZeroBalanceNotifications,
} from '../../../../../services/groupAutomation';
import Session from '../../../../../models/Session';
import Student from '../../../../../models/Student';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** الحالات اللي بتسحب credits */
const DEDUCT_STATUSES = ['present', 'late'];

const CREDIT_DEDUCTION = 2;

/**
 * بيحسب إيه اللي المفروض يحصل للـ credits
 * بناءً على الحالة القديمة والجديدة
 *
 * Returns:
 *   'deduct'  → اسحب CREDIT_DEDUCTION ساعات
 *   'refund'  → رجّع CREDIT_DEDUCTION ساعات
 *   'nothing' → متعملش حاجة
 */
function getCreditAction(oldStatus, newStatus) {
  const wasDeducting = oldStatus && DEDUCT_STATUSES.includes(oldStatus);
  const willDeduct   = DEDUCT_STATUSES.includes(newStatus);

  if (!wasDeducting && willDeduct)  return 'deduct';   // غائب/معذور/جديد → حاضر/متأخر
  if (wasDeducting  && !willDeduct) return 'refund';   // حاضر/متأخر → غائب/معذور
  return 'nothing';                                    // حاضر↔متأخر أو غائب↔معذور
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false, message: 'غير مصرح بالوصول', code: 'UNAUTHORIZED' }, { status: 401 });
    if (user.role !== 'instructor' && user.role !== 'admin') return NextResponse.json({ success: false, message: 'هذه الصفحة للمدرسين فقط', code: 'FORBIDDEN' }, { status: 403 });

    await connectDB();
    const { id } = await params;

    const session = await Session.findById(id)
      .populate({ path: 'groupId', select: 'name code students instructors' })
      .lean();

    if (!session) return NextResponse.json({ success: false, message: 'الجلسة غير موجودة' }, { status: 404 });

    if (user.role === 'instructor') {
      const isInstructor = session.groupId?.instructors?.some(
        (i) => i.userId?.toString() === user.id?.toString()
      );
      if (!isInstructor) return NextResponse.json({ success: false, message: 'مش مدرس هذا الجروب', code: 'FORBIDDEN' }, { status: 403 });
    }

    const studentIds = (session.groupId?.students || []).map((s) => s.studentId || s);

    const students = await Student.find({ _id: { $in: studentIds }, isDeleted: false })
      .select(
        '_id enrollmentNumber personalInfo.fullName personalInfo.gender ' +
        'guardianInfo.name guardianInfo.whatsappNumber guardianInfo.phone guardianInfo.relationship ' +
        'guardianInfo.nickname communicationPreferences.preferredLanguage ' +
        'creditSystem.currentPackage.remainingHours creditSystem.status ' +
        'whatsappMessages'
      )
      .lean();

    const existingAttendance = {};
    (session.attendance || []).forEach((a) => {
      existingAttendance[a.studentId?.toString()] = a.status;
    });

    const studentsWithAttendance = students.map((s) => {
      const absenceMessages = (s.whatsappMessages || []).filter(
        (m) => m.messageType === 'absence_notification'
      );
      const remainingHours = s.creditSystem?.currentPackage?.remainingHours ?? 0;

      return {
        _id:                  s._id,
        name:                 s.personalInfo?.fullName || 'بدون اسم',
        enrollmentNumber:     s.enrollmentNumber || '',
        guardianName:         s.guardianInfo?.name || '',
        guardianPhone:        s.guardianInfo?.whatsappNumber || s.guardianInfo?.phone || '',
        guardianRelationship: s.guardianInfo?.relationship || 'father',
        preferredLanguage:    s.communicationPreferences?.preferredLanguage || 'ar',
        credits:              remainingHours,
        creditStatus:         s.creditSystem?.status || 'no_package',
        absenceCount:         absenceMessages.length,
        currentStatus:        existingAttendance[s._id.toString()] || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        session: {
          _id:             session._id,
          title:           session.title,
          status:          session.status,
          scheduledDate:   session.scheduledDate,
          startTime:       session.startTime,
          endTime:         session.endTime,
          attendanceTaken: session.attendanceTaken,
          group: {
            _id:  session.groupId?._id,
            name: session.groupId?.name,
            code: session.groupId?.code,
          },
        },
        students: studentsWithAttendance,
      },
    });
  } catch (error) {
    console.error('❌ [Instructor Attendance GET]:', error);
    return NextResponse.json({ success: false, message: 'فشل في تحميل بيانات الحضور', error: error.message }, { status: 500 });
  }
}

// ─── POST: معاينة الرسالة ──────────────────────────────────────────────────────
export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false, message: 'غير مصرح بالوصول', code: 'UNAUTHORIZED' }, { status: 401 });
    if (user.role !== 'instructor' && user.role !== 'admin') return NextResponse.json({ success: false, message: 'هذه الصفحة للمدرسين فقط', code: 'FORBIDDEN' }, { status: 403 });

    await connectDB();
    const { id } = await params;

    let body = {};
    try {
      const text = await req.text();
      if (text?.trim()) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { attendanceStatus, studentId, extraData = {} } = body;

    if (!attendanceStatus || !studentId)
      return NextResponse.json({ success: false, error: 'attendanceStatus and studentId are required' }, { status: 400 });
    if (!['absent', 'late', 'excused'].includes(attendanceStatus))
      return NextResponse.json({ success: false, error: 'Invalid attendance status' }, { status: 400 });

    const [student, session] = await Promise.all([
      Student.findById(studentId)
        .select('personalInfo guardianInfo communicationPreferences enrollmentNumber creditSystem')
        .lean(),
      Session.findById(id).populate({ path: 'groupId', select: 'name code' }).lean(),
    ]);

    if (!student) return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });

    const templates = await getAttendanceTemplatesForFrontend(attendanceStatus, studentId, extraData);

    if (!templates?.guardian?.content) return NextResponse.json({ success: true, data: templates });

    const lang         = student.communicationPreferences?.preferredLanguage || 'ar';
    const gender       = (student.personalInfo?.gender || 'male').toLowerCase();
    const relationship = (student.guardianInfo?.relationship || 'father').toLowerCase();

    const studentFirstName =
      lang === 'ar'
        ? student.personalInfo?.nickname?.ar?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'الطالب'
        : student.personalInfo?.nickname?.en?.trim() || student.personalInfo?.fullName?.split(' ')[0] || 'Student';

    const guardianFirstName =
      lang === 'ar'
        ? student.guardianInfo?.nickname?.ar?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'ولي الأمر'
        : student.guardianInfo?.nickname?.en?.trim() || student.guardianInfo?.name?.split(' ')[0] || 'Guardian';

    let guardianSalutation = '';
    if (lang === 'ar') {
      if (relationship === 'mother')      guardianSalutation = `عزيزتي السيدة ${guardianFirstName}`;
      else if (relationship === 'father') guardianSalutation = `عزيزي الأستاذ ${guardianFirstName}`;
      else                                guardianSalutation = `عزيزي/عزيزتي ${guardianFirstName}`;
    } else {
      if (relationship === 'mother')      guardianSalutation = `Dear Mrs. ${guardianFirstName}`;
      else if (relationship === 'father') guardianSalutation = `Dear Mr. ${guardianFirstName}`;
      else                                guardianSalutation = `Dear ${guardianFirstName}`;
    }

    const childTitle =
      lang === 'ar'
        ? (gender === 'female' ? 'ابنتك' : 'ابنك')
        : (gender === 'female' ? 'your daughter' : 'your son');

    const statusText =
      attendanceStatus === 'absent' ? (lang === 'ar' ? 'غائب'  : 'absent')  :
      attendanceStatus === 'late'   ? (lang === 'ar' ? 'متأخر' : 'late')    :
                                      (lang === 'ar' ? 'معتذر' : 'excused');

    const sessionDate = session?.scheduledDate
      ? new Date(session.scheduledDate).toLocaleDateString(
          lang === 'ar' ? 'ar-EG' : 'en-US',
          { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        )
      : '';

    const variables = {
      guardianSalutation,
      guardianName:     guardianFirstName,
      studentName:      studentFirstName,
      childTitle,
      status:           statusText,
      sessionName:      session?.title || '',
      date:             sessionDate,
      time:             session ? `${session.startTime || ''} - ${session.endTime || ''}` : '',
      enrollmentNumber: student.enrollmentNumber || '',
    };

    let renderedContent = templates.guardian.content;
    Object.entries(variables).forEach(([key, value]) => {
      renderedContent = renderedContent.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
    });

    return NextResponse.json({
      success: true,
      data: { ...templates, guardian: { ...templates.guardian, content: renderedContent } },
    });
  } catch (error) {
    console.error('❌ [Instructor Attendance POST]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── PATCH: سجّل الحضور + اخصم/رجّع الـ Credits + ابعت الرسائل ──────────────
export async function PATCH(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ success: false, message: 'غير مصرح بالوصول', code: 'UNAUTHORIZED' }, { status: 401 });
    if (user.role !== 'instructor' && user.role !== 'admin') return NextResponse.json({ success: false, message: 'هذه الصفحة للمدرسين فقط', code: 'FORBIDDEN' }, { status: 403 });

    await connectDB();
    const { id } = await params;

    let body = {};
    try {
      const text = await req.text();
      if (text?.trim()) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { attendanceRecords } = body;
    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return NextResponse.json({ success: false, error: 'attendanceRecords array is required' }, { status: 400 });
    }

    const session = await Session.findById(id)
      .populate({ path: 'groupId', select: 'name instructors' });
    if (!session) return NextResponse.json({ success: false, message: 'الجلسة غير موجودة' }, { status: 404 });

    if (user.role === 'instructor') {
      const isInstructor = session.groupId?.instructors?.some(
        (i) => i.userId?.toString() === user.id?.toString()
      );
      if (!isInstructor) return NextResponse.json({ success: false, message: 'مش مدرس هذا الجروب', code: 'FORBIDDEN' }, { status: 403 });
    }

    const results      = [];
    const notifyList   = [];
    const lowBalanceList = []; // رصيد 4 ساعات أو أقل (> 0)
    const zeroBalanceList = []; // رصيد وصل صفر

    for (const record of attendanceRecords) {
      const { studentId, status: newStatus } = record;
      if (!['present', 'absent', 'late', 'excused'].includes(newStatus)) continue;

      // ── 1. جيب الحالة القديمة من الـ Session ─────────────────────────────────
      const existingRecord = session.attendance.find(
        (a) => a.studentId?.toString() === studentId?.toString()
      );
      const oldStatus = existingRecord?.status || null;

      // ── 2. لو نفس الحالة — skip بدون أي تعديل ────────────────────────────────
      if (oldStatus === newStatus) {
        console.log(`⏭️ Student ${studentId}: same status (${newStatus}), skipping`);
        results.push({ studentId, status: newStatus, creditAction: 'nothing', reason: 'same_status' });
        continue;
      }

      // ── 3. حدّث الحضور في الـ Session ────────────────────────────────────────
      if (existingRecord) {
        existingRecord.status   = newStatus;
        existingRecord.markedAt = new Date();
        existingRecord.markedBy = user.id;
      } else {
        session.attendance.push({ studentId, status: newStatus, markedAt: new Date(), markedBy: user.id });
      }

      // ── 4. احسب إيه اللي المفروض يحصل للـ credits ────────────────────────────
      const creditAction = getCreditAction(oldStatus, newStatus);
      let   creditDone   = false;
      let   remainingAfter = null;

      if (creditAction !== 'nothing') {
        try {
          const studentDoc = await Student.findById(studentId)
            .select('creditSystem communicationPreferences')
            .lean();

          if (!studentDoc) {
            console.warn(`⚠️ Student ${studentId} not found for credit update`);
          } else {
            const currentRemaining = studentDoc.creditSystem?.currentPackage?.remainingHours ?? 0;

            if (creditAction === 'deduct') {
              // ── سحب ساعتين (غائب/معذور/جديد → حاضر/متأخر) ──────────────────
              if (currentRemaining >= CREDIT_DEDUCTION) {
                const newRemaining     = currentRemaining - CREDIT_DEDUCTION;
                const newTotalUsed     = (studentDoc.creditSystem?.stats?.totalHoursUsed        || 0) + CREDIT_DEDUCTION;
                const newTotalSessions = (studentDoc.creditSystem?.stats?.totalSessionsAttended || 0) + 1;

                const usageRecord = {
                  sessionId:              id,
                  date:                   new Date(),
                  hoursDeducted:          CREDIT_DEDUCTION,
                  sessionTitle:           session.title || 'Session',
                  attendanceStatus:       newStatus,
                  notes:                  `حضور: ${newStatus} (تغيير من: ${oldStatus || 'جديد'})`,
                  deductedFromExceptions: 0,
                  deductedFromPackage:    CREDIT_DEDUCTION,
                };

                const updateFields = {
                  'creditSystem.currentPackage.remainingHours':   newRemaining,
                  'creditSystem.stats.totalHoursUsed':            newTotalUsed,
                  'creditSystem.stats.totalHoursRemaining':       newRemaining,
                  'creditSystem.stats.totalSessionsAttended':     newTotalSessions,
                  'creditSystem.stats.lastUsageDate':             new Date(),
                };

                // لو الرصيد وصل صفر — وقف الإشعارات
                if (newRemaining === 0) {
                  updateFields['creditSystem.currentPackage.status']                     = 'completed';
                  updateFields['creditSystem.status']                                    = 'expired';
                  updateFields['creditSystem.stats.zeroBalanceDate']                     = new Date();
                  updateFields['communicationPreferences.notificationChannels.whatsapp'] = false;
                  updateFields['creditSystem.stats.notificationsDisabledAt']             = new Date();
                }

                await Student.updateOne(
                  { _id: studentId },
                  { $set: updateFields, $push: { 'creditSystem.usageHistory': usageRecord } }
                );

                creditDone     = true;
                remainingAfter = newRemaining;
                console.log(`✅ DEDUCTED ${CREDIT_DEDUCTION}h from ${studentId} (${oldStatus || 'new'} → ${newStatus}) | remaining: ${newRemaining}`);

                // ── تحديد قائمة التنبيهات حسب الرصيد المتبقي ─────────────────
                if (newRemaining === 0) {
                  // رصيد صفر → تعطيل الإشعارات + رسالة أخيرة
                  zeroBalanceList.push({ studentId });
                } else if (newRemaining <= 2) {
                  // رصيد ساعتين أو أقل → تنبيه عاجل
                  lowBalanceList.push({ studentId, remainingHours: newRemaining });
                } else if (newRemaining <= 4) {
                  // رصيد 4 ساعات أو أقل → تنبيه عادي
                  lowBalanceList.push({ studentId, remainingHours: newRemaining });
                }

              } else {
                console.warn(`⚠️ Insufficient credits for ${studentId}: has ${currentRemaining}h, need ${CREDIT_DEDUCTION}h`);
              }

            } else if (creditAction === 'refund') {
              // ── إرجاع ساعتين (حاضر/متأخر → غائب/معذور) ──────────────────────
              const newRemaining     = currentRemaining + CREDIT_DEDUCTION;
              const newTotalUsed     = Math.max(0, (studentDoc.creditSystem?.stats?.totalHoursUsed        || 0) - CREDIT_DEDUCTION);
              const newTotalSessions = Math.max(0, (studentDoc.creditSystem?.stats?.totalSessionsAttended || 0) - 1);

              const usageRecord = {
                sessionId:              id,
                date:                   new Date(),
                hoursDeducted:          -CREDIT_DEDUCTION,  // سالب = إرجاع
                sessionTitle:           session.title || 'Session',
                attendanceStatus:       'refund',
                notes:                  `استرجاع: تغيير من ${oldStatus} إلى ${newStatus}`,
                deductedFromExceptions: 0,
                deductedFromPackage:    -CREDIT_DEDUCTION,
              };

              const updateFields = {
                'creditSystem.currentPackage.remainingHours':   newRemaining,
                'creditSystem.stats.totalHoursUsed':            newTotalUsed,
                'creditSystem.stats.totalHoursRemaining':       newRemaining,
                'creditSystem.stats.totalSessionsAttended':     newTotalSessions,
                'creditSystem.stats.lastUsageDate':             new Date(),
              };

              // لو الرصيد رجع فوق صفر — أعد تفعيل الإشعارات
              if (currentRemaining === 0 && newRemaining > 0) {
                updateFields['creditSystem.currentPackage.status']                     = 'active';
                updateFields['creditSystem.status']                                    = 'active';
                updateFields['communicationPreferences.notificationChannels.whatsapp'] = true;
              }

              await Student.updateOne(
                { _id: studentId },
                { $set: updateFields, $push: { 'creditSystem.usageHistory': usageRecord } }
              );

              creditDone     = true;
              remainingAfter = newRemaining;
              console.log(`✅ REFUNDED ${CREDIT_DEDUCTION}h to ${studentId} (${oldStatus} → ${newStatus}) | remaining: ${newRemaining}`);
            }
          }
        } catch (err) {
          // non-blocking — مش هنوقف الحضور بسبب مشكلة في الـ credits
          console.error(`❌ Credit update error for ${studentId}:`, err.message);
        }
      } else {
        console.log(`➡️ Student ${studentId}: ${oldStatus} → ${newStatus} (same credit tier, no change)`);
      }

      // ── 5. جمّع الطلاب اللي محتاجين رسائل ────────────────────────────────────
      if (['absent', 'late', 'excused'].includes(newStatus)) {
        notifyList.push({ studentId, status: newStatus });
      }

      results.push({ studentId, oldStatus, status: newStatus, creditAction, creditDone, remainingAfter });
    }

    // ── 6. احفظ الجلسة ────────────────────────────────────────────────────────
    session.attendanceTaken = true;
    if (!session.automationEvents) session.automationEvents = {};
    session.automationEvents.absentNotificationsSent   = true;
    session.automationEvents.absentNotificationsSentAt = new Date();
    await session.save();

    // ── 7. تنبيهات الرصيد المنخفض والصفر ─────────────────────────────────────
    if (lowBalanceList.length > 0 || zeroBalanceList.length > 0) {
      try {
        // جيب الـ student documents كاملة (Mongoose docs مش lean)
        // عشان sendLowBalanceAlerts و disableZeroBalanceNotifications محتاجين student.save()
        const allAlertIds = [
          ...lowBalanceList.map(x => x.studentId),
          ...zeroBalanceList.map(x => x.studentId),
        ];
        const alertStudentDocs = await Student.find({ _id: { $in: allAlertIds } });
        const alertStudentMap  = new Map(alertStudentDocs.map(s => [s._id.toString(), s]));

        // ── تنبيه رصيد منخفض (4 ساعات أو أقل > 0) ────────────────────────────
        if (lowBalanceList.length > 0) {
          const studentsForLowBalance = lowBalanceList
            .map(x => ({
              student:        alertStudentMap.get(x.studentId.toString()),
              remainingHours: x.remainingHours,
              studentId:      x.studentId,
            }))
            .filter(x => x.student);

          if (studentsForLowBalance.length > 0) {
            await sendLowBalanceAlerts(studentsForLowBalance);
            console.log(`⚠️ Low balance alerts sent for ${studentsForLowBalance.length} students`);
          }
        }

        // ── تعطيل إشعارات الرصيد صفر + رسالة أخيرة ───────────────────────────
        if (zeroBalanceList.length > 0) {
          const studentsForZero = zeroBalanceList
            .map(x => ({ student: alertStudentMap.get(x.studentId.toString()) }))
            .filter(x => x.student);

          if (studentsForZero.length > 0) {
            await disableZeroBalanceNotifications(studentsForZero);
            console.log(`🔕 Zero balance notifications disabled for ${studentsForZero.length} students`);
          }
        }
      } catch (alertErr) {
        // non-blocking — مشكلة في التنبيهات متوقفش تسجيل الحضور
        console.error('⚠️ Balance alerts error (non-blocking):', alertErr.message);
      }
    }

    // ── 8. ابعت رسائل الغياب بعد حفظ الجلسة ─────────────────────────────────
    let notificationResult = { sentCount: 0, skippedCount: 0 };
    if (notifyList.length > 0) {
      try {
        notificationResult = await sendAbsenceNotifications(id, notifyList);
        console.log(`📱 Notifications sent: ${notificationResult.sentCount}, skipped: ${notificationResult.skippedCount}`);
      } catch (notifyErr) {
        console.error('⚠️ sendAbsenceNotifications failed (non-blocking):', notifyErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الحضور بنجاح',
      data: {
        results,
        attendanceTaken: true,
        notifications: {
          sent:    notificationResult.sentCount,
          skipped: notificationResult.skippedCount,
        },
        balanceAlerts: {
          lowBalance: lowBalanceList.length,
          zeroBalance: zeroBalanceList.length,
        },
      },
    });
  } catch (error) {
    console.error('❌ [Instructor Attendance PATCH]:', error);
    return NextResponse.json({ success: false, message: 'فشل في تسجيل الحضور', error: error.message }, { status: 500 });
  }
}