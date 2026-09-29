// /api/admin/certificates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../models/Student";
import Group from "../../../models/Group";
import Session from "../../../models/Session";

// ✅ Fallback آمن لو الكابشن فاضي (title بقى ملغي)
const DEFAULT_CERT_CAPTION = "شهادة إتمام";

// ============================================================
// GET /api/admin/certificates
//
// بيرجع للأدمن:
//  - issued: كل سجلات الشهادات اللي اتعملها (issuedCertificates) — مع صورة
//    الشهادة وحالة التسليم للطالب/ولي الأمر ورقم كل واحد منهم (لو موجود)
//  - notGenerated: طلبة أهل لشهادة (حضروا الموديول ومعندهمش سجل شهادة خالص)
//    لأنه وقت شغل الـ cron ماكانش عند أي منهم (لا الطالب ولا ولي الأمر) رقم
//    واتساب خالص، فالـ cron ماولدش الصورة أصلاً
//
// ✅ الحقل moduleTitle بقى بيرجع الكابشن (certificateCaption) لو موجود،
// وإلا بيرجع default ثابت — نفس منطق الكرون.
//
// ✅ NEW: Kids/Adults guard — لو الطالب adults:
//   - نعتبر شهادة ولي الأمر "مسلّمة" تلقائيًا (skipped_adult_student)
//   - مايتحسبش in pending
//   - notGenerated بيتخطى بالكامل للـ adults
//
// ملاحظة: نفس منطق الأهلية (حضور + hasCertificate) اللي في الـ cron job،
// لكن هنا للعرض فقط — من غير توليد صور ولا إرسال رسائل.
// ============================================================
export async function GET() {
  try {
    await connectDB();

    const students = await Student.find({ isDeleted: false }).lean();

    const issued = [];
    const notGenerated = [];

    const summary = {
      totalCertificateRecords: 0,
      fullyDelivered: 0,
      partiallyDelivered: 0,
      pendingNoPhone: 0, // مفيش رقم لأي طرف لسه معلق
      notGeneratedCount: 0, // أهل للشهادة بس معندوش سجل خالص (مفيش رقم من الأول)
      adultGuardianSkipped: 0, // ✅ NEW: شهادات اتخطى فيها ولي الأمر (طالب بالغ)
    };

    for (const student of students) {
      const groupIds = student.academicInfo?.groupIds || [];
      if (!groupIds.length) continue;

      // ✅ NEW: هل الطالب بالغ؟ (مرة واحدة لكل طالب)
      const isAdult = student.studentType === "adults";

      const groups = await Group.find({ _id: { $in: groupIds }, isDeleted: false })
        .populate("courseId")
        .lean();

      const studentNumber = student.personalInfo?.whatsappNumber || "";

      // ✅ لو adult → مفيش ولي أمر
      const guardianNumber = isAdult
        ? ""
        : student.guardianInfo?.whatsappNumber || "";

      for (const group of groups) {
        const course = group.courseId;
        if (!course || !course.curriculum) continue;

        for (let moduleIndex = 0; moduleIndex < course.curriculum.length; moduleIndex++) {
          const module = course.curriculum[moduleIndex];
          if (!module.hasCertificate) continue;

          const moduleId = `${course._id}-${moduleIndex}`;

          // ✅ الكابشن هو المصدر الوحيد — fallback ثابت
          const displayTitle =
            module.certificateCaption?.trim() || DEFAULT_CERT_CAPTION;

          const certRecord = student.issuedCertificates?.find(
            (c) => c.moduleId === moduleId
          );

          // ═══════════════════════════════════════════════════════
          // ✅ الحالة 1: فيه سجل شهادة اتعمل بالفعل (صورة موجودة)
          // ═══════════════════════════════════════════════════════
          if (certRecord) {
            summary.totalCertificateRecords++;

            // ✅ student reason
            const studentReason = certRecord.studentDelivered
              ? null
              : studentNumber
                ? "send_failed_or_pending"
                : "no_student_phone";

            // ✅ guardian reason — للـ adults → "skipped_adult_student"
            const guardianReason = isAdult
              ? "skipped_adult_student"
              : certRecord.guardianDelivered
                ? null
                : guardianNumber
                  ? "send_failed_or_pending"
                  : "no_guardian_phone";

            // ✅ للـ adults: نعتبر شهادة ولي الأمر "متخطية" عشان مايتحسبش pending
            const effectiveGuardianDelivered = isAdult
              ? true
              : certRecord.guardianDelivered;

            const fullyDelivered =
              certRecord.studentDelivered && effectiveGuardianDelivered;

            const partiallyDelivered =
              !fullyDelivered &&
              (certRecord.studentDelivered || certRecord.guardianDelivered);

            if (fullyDelivered) {
              summary.fullyDelivered++;
              if (isAdult) summary.adultGuardianSkipped++;
            } else if (partiallyDelivered) {
              summary.partiallyDelivered++;
            } else {
              summary.pendingNoPhone++;
            }

            issued.push({
              studentId: student._id,
              studentName: student.personalInfo?.fullName || "",
              studentGender: student.personalInfo?.gender || "male",
              isAdult, // ✅ NEW
              groupId: group._id,
              groupName: group.name,
              courseId: course._id,
              courseTitle: course.title,
              moduleId,
              moduleIndex,
              moduleTitle: displayTitle,
              imageUrl: certRecord.imageUrl,
              issuedAt: certRecord.issuedAt,
              student: {
                phone: studentNumber || null,
                delivered: !!certRecord.studentDelivered,
                deliveredAt: certRecord.studentDeliveredAt || null,
                pendingReason: studentReason,
              },
              guardian: isAdult
                ? {
                    // ✅ للـ adults: متخطى بالكامل
                    phone: null,
                    delivered: true,
                    deliveredAt: null,
                    pendingReason: "skipped_adult_student",
                    skipped: true,
                  }
                : {
                    phone: guardianNumber || null,
                    delivered: !!certRecord.guardianDelivered,
                    deliveredAt: certRecord.guardianDeliveredAt || null,
                    pendingReason: guardianReason,
                    skipped: false,
                  },
            });
            continue;
          }

          // ═══════════════════════════════════════════════════════
          // ✅ الحالة 2: مفيش سجل خالص
          // ═══════════════════════════════════════════════════════

          // لو فيه رقم لأي طرف، الـ cron هيولد الشهادة في الدورة الجاية
          // ✅ NEW: للـ adults — يكفي إن عنده رقم طالب (مش محتاج رقم ولي أمر)
          const hasAnyRecipient = isAdult
            ? !!studentNumber
            : !!(studentNumber || guardianNumber);

          if (hasAnyRecipient) continue;

          // ✅ نتأكد إنه فعلاً أهل للشهادة (حضر)
          const sessions = await Session.find({
            groupId: group._id,
            moduleIndex,
            isDeleted: false,
          }).lean();

          let hasAttended = false;
          for (const session of sessions) {
            const attendance = session.attendance?.find(
              (a) => a.studentId.toString() === student._id.toString()
            );
            if (
              attendance &&
              ["present", "late", "excused"].includes(attendance.status)
            ) {
              hasAttended = true;
              break;
            }
          }

          if (!hasAttended) continue;

          summary.notGeneratedCount++;

          notGenerated.push({
            studentId: student._id,
            studentName: student.personalInfo?.fullName || "",
            studentGender: student.personalInfo?.gender || "male",
            isAdult, // ✅ NEW
            groupId: group._id,
            groupName: group.name,
            courseId: course._id,
            courseTitle: course.title,
            moduleId,
            moduleIndex,
            moduleTitle: displayTitle,
            student: {
              phone: null,
              delivered: false,
              pendingReason: "no_student_phone",
            },
            guardian: isAdult
              ? {
                  // ✅ للـ adults: متخطى بالكامل
                  phone: null,
                  delivered: false,
                  pendingReason: "skipped_adult_student",
                  skipped: true,
                }
              : {
                  phone: null,
                  delivered: false,
                  pendingReason: "no_guardian_phone",
                  skipped: false,
                },
          });
        }
      }
    }

    issued.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));

    return NextResponse.json({
      success: true,
      data: { issued, notGenerated },
      summary,
    });
  } catch (error) {
    console.error("❌ Error fetching admin certificates:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}