import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../models/Student";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import Portfolio from "../../../models/Portfolio";
import { wapilotService } from "../../../services/wapilot-service";
import fs from "fs-extra";
import path from "path";
import { buildCertificateHtml } from "../../../../utils/certificateHtml";
import { getBrowser } from "../../../../utils/browserPool";
import { GENERATED_DIR } from "../../../../utils/generatedFilesPaths";
import { uploadToCloudinary } from "@/lib/cloudinary";

// ============================================================
// ✅ حماية زي portfolio-inactivity بالظبط: لازم يبقى معاه CRON_SECRET
// (كـ Authorization: Bearer <secret> أو ?secret=<secret> في الرابط)
// وإلا يترفض. ده بيمنع أي حد يضرب الرابط من برا ويولد/يبعت شهادات.
// ============================================================
function isAuthorizedRequest(req, searchParams) {
  const authHeader = req.headers.get("authorization");
  const querySecret = searchParams.get("secret");
  return (
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    querySecret === process.env.CRON_SECRET
  );
}

// ============================================================
// ✅ بناء قائمة الإنجازات (achievements) للشهادة — بالاعتماد على
// sessionNumber الحقيقي بتاع كل lesson، مش على تطابق نص العنوان.
// ------------------------------------------------------------
// ليه مش .map() بسيطة؟ لأن كل سيشن بيغطي 2 lessons (lessonIndexes
// طولها 2 دايمًا — راجع Session.js)، وده بيخلي كل "سيشن" يظهر مرتين
// في مصفوفة achievements لو استخدمنا map عادية. الحل: نجمّع الدروس
// حسب sessionNumber بتاعها، وناخد عنوان واحد فقط يمثّل كل سيشن —
// فيبقى عدد الإنجازات = عدد السيشنات الفعلية، مش عدد الدروس.
//
// ⚠️ ملحوظة: ده مش اعتماد على تطابق النص بالصدفة (زي [...new Set()])
// اللي ممكن يحذف غلط لو اتفق عنوانين مختلفين فعلاً في نص واحد.
// هنا الاعتماد على العلاقة البنيوية الحقيقية في الداتا.
// ============================================================
function buildAchievementsFromLessons(lessons) {
  if (!lessons?.length) {
    return ["Successfully completed all module requirements."];
  }

  const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);

  const bySession = sortedLessons.reduce((acc, lesson) => {
    const key = lesson.sessionNumber ?? lesson.order;
    if (!acc[key]) {
      acc[key] = lesson.title;
    }
    return acc;
  }, {});

  return Object.values(bySession);
}

// ============================================================
// ✅ توليد صورة الشهادة — بدون React/react-dom/server (متوافق مع
// Route Handlers). راجع src/app/utils/certificateHtml.js للتفاصيل.
// ============================================================
async function generateCertificateImage(browser, data) {
  const { studentName, moduleTitle, achievements, signature, background, date } = data;

  const fullHtml = buildCertificateHtml({
    studentName,
    moduleTitle,
    signatureName: signature,
    date,
    achievements,
    backgroundStyle: background,
  });

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1200, height: 900 });
    await page.setContent(fullHtml, { waitUntil: "load", timeout: 30000 });

    const fileName = `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
    const filePath = path.join(GENERATED_DIR, fileName);
    await fs.ensureDir(GENERATED_DIR);
    await page.screenshot({ path: filePath, fullPage: true });

    return {
      filePath,
      imageUrl: `/api/temp-image/${fileName}`,
    };
  } finally {
    await page.close();
  }
}

// ============================================================
// ✅ رفع الصورة على Cloudinary وتحويلها إلى رابط عام
// ------------------------------------------------------------
// ⚠️ الاستخدام الوحيد لده هو الحفظ في قاعدة البيانات عشان يظهر
// في داشبورد الأدمن، لأن الملف المحلي بيتمسح بعد الإرسال. مالوش
// أي علاقة بإرسال الرسالة على واتساب — ده بيتم بالملف المحلي
// مباشرة عبر sendImageFile (multipart).
// ============================================================
async function uploadCertificateToCloudinary(filePath) {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const base64 = `data:image/png;base64,${fileBuffer.toString("base64")}`;
    const cloudinaryUrl = await uploadToCloudinary(base64, "certificates");
    return cloudinaryUrl;
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);
    return null;
  }
}

// ============================================================
// ✅ مزامنة الشهادة مع بورتفوليو الطالب (قسم certificates) — بدون تكرار.
// ------------------------------------------------------------
// بتشتغل بغض النظر عن نجاح إرسال الواتساب من عدمه (طالما الشهادة
// اتولدت فعلاً)، وبتعتمد على moduleId (course._id-moduleIndex) كمفتاح
// فريد جوه Portfolio.certificates عشان لو الكرون رجع اشتغل تاني على
// نفس الموديول الشهادة متتضافش مرتين.
//
// ⚠️ بتفترض إن عند الطالب حقل `userId` بيربطه بحساب User اللي عليه
// الـ Portfolio. لو الحقل عندك اسمه مختلف، غيّر `student.userId` بس هنا.
// ============================================================
async function syncCertificateToStudentPortfolio(student, moduleId, module, fullImageUrl) {
  const userId = student.userId;
  if (!userId) return { added: false, reason: "NO_LINKED_USER" };

  try {
    const { added } = await Portfolio.addModuleCertificateIfMissing(userId, {
      moduleId,
      title: module.title,
      description: `تم إنجاز موديول "${module.title}" بنجاح`,
      imageUrl: fullImageUrl,
      issuer: module.certificateSignatureName || "Aya Elnagar",
      issueDate: new Date(),
    });

    if (added) {
      console.log(`🗂️  Added certificate to portfolio for ${student.personalInfo.fullName} (${moduleId})`);
    }
    return { added };
  } catch (error) {
    // فشل مزامنة البورتفوليو مايوقفش باقي العملية (الإرسال والتحديث الأساسي)
    console.error(`⚠️ Portfolio sync failed for ${student.personalInfo?.fullName}:`, error.message);
    return { added: false, reason: "ERROR" };
  }
}

// ============================================================
// ✅ إرسال الشهادة عبر واتساب — multipart مباشرة بالملف المحلي
// ------------------------------------------------------------
// ⚠️ ملحوظة تاريخية: كان فيه محاولة إرسال عبر رابط Cloudinary
// (endpoint /send-media) وكانت بترجع "Resource not found or not
// accessible" لأن الـ endpoint ده مش موجود أصلاً في Wapilot API v2.
// الطريقة الصحيحة حسب الوثائق الرسمية هي رفع الملف كـ
// multipart/form-data مباشرة لـ /send-image — وده اللي بيعمله
// wapilotService.sendImageFile دلوقتي.
// ============================================================
async function sendCertificateWithFallback(phoneNumber, filePath, caption, studentName = "") {
  try {
    const result = await wapilotService.sendImageFile(phoneNumber, filePath, caption);

    if (!result?.success) {
      console.warn(`⚠️ Wapilot failed for ${studentName}: ${result?.error}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ sendCertificateWithFallback error:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (!isAuthorizedRequest(request, searchParams)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    console.log("🚀 Running Certificate Cron Job...");

    const students = await Student.find({ isDeleted: false }).lean();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const summary = {
      checked: 0,
      generated: 0,
      studentSent: 0,
      guardianSent: 0,
      pendingNoRecipient: 0,
      cloudinaryUploads: 0,
      portfolioSynced: 0,
      noAttendanceYet: 0, // ✅ جديد — بيتسجل بدل ما الـ continue يبقى صامت
      errors: 0,
    };

    for (const student of students) {
      // ✅ الإصلاح: بدل ما نعتمد على student.academicInfo.groupIds (اللي
      // ممكن يفضل مش متزامن لو الطالب اتضاف من واجهة الجروب مباشرة زي
      // /add-student route)، بندوّر على الجروبات من مصدر الحقيقة الفعلي:
      // أي جروب فيه الطالب ده جوه array الـ students بتاعته.
      const groups = await Group.find({
        students: student._id,
        isDeleted: false,
      })
        .populate("courseId")
        .lean();

      for (const group of groups) {
        const course = group.courseId;
        if (!course || !course.curriculum) continue;

        for (let moduleIndex = 0; moduleIndex < course.curriculum.length; moduleIndex++) {
          const module = course.curriculum[moduleIndex];

          if (!module.hasCertificate) continue;

          const moduleId = `${course._id}-${moduleIndex}`;

          const certRecord = student.issuedCertificates?.find((c) => c.moduleId === moduleId);
          const studentAlreadyDelivered = certRecord?.studentDelivered === true;
          const guardianAlreadyDelivered = certRecord?.guardianDelivered === true;

          if (studentAlreadyDelivered && guardianAlreadyDelivered) continue;

          summary.checked++;

          try {
            const sessions = await Session.find({
              groupId: group._id,
              moduleIndex: moduleIndex,
              isDeleted: false,
            }).lean();

            let hasAttended = false;
            for (const session of sessions) {
              const attendance = session.attendance.find(
                (a) => a.studentId.toString() === student._id.toString()
              );
              if (attendance && ["present", "late", "excused"].includes(attendance.status)) {
                hasAttended = true;
                break;
              }
            }

            if (!hasAttended) {
              summary.noAttendanceYet++;
              console.log(
                `⏭️ ${student.personalInfo.fullName} - ${module.title}: لا يوجد حضور (present/late/excused) في أي سيشن من سيشنات الموديول لسه`
              );
              continue;
            }

            const studentNumber = student.personalInfo?.whatsappNumber;
            const guardianNumber = student.guardianInfo?.whatsappNumber;

            const studentNeedsSend = !!studentNumber && !studentAlreadyDelivered;
            const guardianNeedsSend = !!guardianNumber && !guardianAlreadyDelivered;

            if (!studentNeedsSend && !guardianNeedsSend) {
              summary.pendingNoRecipient++;
              console.log(
                `⏳ ${student.personalInfo.fullName} - ${module.title}: مفيش رقم واتساب متاح حاليًا، هنحاول تاني`
              );
              continue;
            }

            console.log(`🎓 Generating certificate for ${student.personalInfo.fullName} - ${module.title}`);

            // ✅ استخدام الدالة الجديدة اللي بتجمّع الإنجازات حسب sessionNumber
            // بدل ما تاخد title كل lesson لوحده (وده كان بيسبب تكرار كل
            // إنجاز مرتين لأن كل سيشن بيغطي 2 lessons)
            const achievements = buildAchievementsFromLessons(module.lessons);

            const browser = await getBrowser();

            const { filePath, imageUrl } = await generateCertificateImage(browser, {
              studentName: student.personalInfo.fullName,
              moduleTitle: module.title,
              achievements,
              signature: module.certificateSignatureName || "Aya Elnagar",
              background: module.certificateBackground || "navy-orange",
              date: new Date().toLocaleDateString("en-GB"),
            });

            summary.generated++;

            // ✅ ارفع نسخة دائمة على Cloudinary — للحفظ في الداتابيز وعرضها
            // في داشبورد الأدمن (بديل عن الرابط المحلي اللي هيتمسح بعد شوية)
            const cloudinaryUrl = await uploadCertificateToCloudinary(filePath);
            if (cloudinaryUrl) {
              summary.cloudinaryUploads++;
            } else {
              console.warn(
                `⚠️ Cloudinary upload failed for ${student.personalInfo.fullName} - سيبقى الرابط المحلي المؤقت في الداتابيز`
              );
            }
            const fullImageUrl = cloudinaryUrl || `${baseUrl}${imageUrl}`;

            // ✅ مزامنة مع البورتفوليو — مرة واحدة بس لكل moduleId (dedupe
            // جوه الدالة نفسها)، بغض النظر عن نتيجة إرسال الواتساب تحت
            const portfolioResult = await syncCertificateToStudentPortfolio(
              student,
              moduleId,
              module,
              fullImageUrl,
            );
            if (portfolioResult?.added) summary.portfolioSynced++;

            // ✅ اللغة المفضلة بتاعة الطالب
            const preferredLanguage = student.communicationPreferences?.preferredLanguage || "ar";

            let studentDelivered = studentAlreadyDelivered;
            let guardianDelivered = guardianAlreadyDelivered;

            // ✅ إرسال للطالب - multipart بالملف المحلي مباشرة
            if (studentNeedsSend) {
              const caption = await wapilotService.prepareCertificateStudentMessage(
                student.personalInfo.fullName,
                student.personalInfo.gender,
                preferredLanguage,
                module.title,
                student.personalInfo.nickname,
              );

              const result = await sendCertificateWithFallback(
                studentNumber,
                filePath,
                caption,
                student.personalInfo.fullName
              );

              studentDelivered = !!result?.success;
              if (studentDelivered) {
                summary.studentSent++;
              } else {
                console.warn(`⚠️ فشل إرسال الشهادة للطالب ${student.personalInfo.fullName}: ${result?.error}`);
              }
            }

            // ✅ إرسال لولي الأمر - multipart بالملف المحلي مباشرة
            if (guardianNeedsSend) {
              const guardianCaption = await wapilotService.prepareCertificateGuardianMessage(
                student.guardianInfo?.name,
                student.guardianInfo?.relationship,
                student.personalInfo.fullName,
                student.personalInfo.gender,
                preferredLanguage,
                student.guardianInfo?.nickname,
                student.personalInfo?.nickname,
                module.title,
              );

              const result = await sendCertificateWithFallback(
                guardianNumber,
                filePath,
                guardianCaption,
                student.personalInfo.fullName
              );

              guardianDelivered = !!result?.success;
              if (guardianDelivered) {
                summary.guardianSent++;
              } else {
                console.warn(`⚠️ فشل إرسال الشهادة لولي أمر ${student.personalInfo.fullName}: ${result?.error}`);
              }
            }

            const now = new Date();

            // ✅ تحديث قاعدة البيانات
            if (certRecord) {
              await Student.updateOne(
                { _id: student._id, "issuedCertificates.moduleId": moduleId },
                {
                  $set: {
                    "issuedCertificates.$.imageUrl": fullImageUrl,
                    "issuedCertificates.$.studentDelivered": studentDelivered,
                    "issuedCertificates.$.guardianDelivered": guardianDelivered,
                    ...(studentDelivered && !studentAlreadyDelivered
                      ? { "issuedCertificates.$.studentDeliveredAt": now }
                      : {}),
                    ...(guardianDelivered && !guardianAlreadyDelivered
                      ? { "issuedCertificates.$.guardianDeliveredAt": now }
                      : {}),
                  },
                }
              );
            } else {
              await Student.findByIdAndUpdate(student._id, {
                $push: {
                  issuedCertificates: {
                    moduleId,
                    courseId: course._id,
                    imageUrl: fullImageUrl,
                    issuedAt: now,
                    studentDelivered,
                    studentDeliveredAt: studentDelivered ? now : undefined,
                    guardianDelivered,
                    guardianDeliveredAt: guardianDelivered ? now : undefined,
                  },
                },
              });
            }

            // ✅ تنظيف: حذف الملف المحلي بعد الانتهاء من الإرسال والرفع
            try {
              await fs.remove(filePath);
              console.log(`🗑️ Deleted local file: ${path.basename(filePath)}`);
            } catch (cleanupError) {
              // مش مشكلة لو متحذفش - ممكن يكون اتستخدم في مكان تاني
            }

            console.log(
              `✅ ${student.personalInfo.fullName} - ${module.title}: الطالب=${studentDelivered ? "اتبعتله" : "لسه معلّق"}, ولي الأمر=${guardianDelivered ? "اتبعتله" : "لسه معلّق"}`
            );
          } catch (moduleError) {
            summary.errors++;
            console.error(
              `❌ Error with certificate for ${student.personalInfo?.fullName} - ${module?.title}:`,
              moduleError
            );
          }
        }
      }
    }

    console.log("📊 Certificate Cron Summary:", summary);

    return NextResponse.json({ success: true, message: "Cron job completed.", summary });
  } catch (error) {
    console.error("❌ Cron Job Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}