// /src/app/api/cron/certificates/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../models/Student";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import Portfolio from "../../../models/Portfolio";
import CertificateSettings from "../../../models/CertificateSettings";
import { wapilotService } from "../../../services/wapilot-service";
import fs from "fs-extra";
import path from "path";
import { buildCertificateHtml } from "../../../../utils/certificateHtml";
import { getBrowser } from "../../../../utils/browserPool";
import { GENERATED_DIR } from "../../../../utils/generatedFilesPaths";
import { uploadToCloudinary } from "@/lib/cloudinary";

// ✅ فك أي generation claim قديم اتعلق أكتر من ساعتين
const STALE_CERT_CLAIM_MS = 2 * 60 * 60 * 1000;

// ✅ Fallback آمن لو الكابشن فاضي (title بقى ملغي)
const DEFAULT_CERT_CAPTION = "شهادة إتمام";

// ============================================================
// ✅ حماية بـ CRON_SECRET
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
// ✅ Atomic Claim للشهادة — يمنع التكرار حتى لو الكرون اشتغل بالتوازي
//    بيدعم 3 حالات:
//    1. الطالب مش عنده entry خالص → نضيفها بـ generating
//    2. عنده entry و status = idle → نحوّلها لـ generating
//    3. عنده entry و status = generating → نرفض (حد تاني سبقنا)
// ============================================================
async function claimCertificateGeneration(studentId, moduleId, courseId) {
  const now = new Date();

  try {
    // الحالة 1: مفيش entry خالص → نضيفها بـ generating
    const insertResult = await Student.findOneAndUpdate(
      {
        _id: studentId,
        "issuedCertificates.moduleId": { $ne: moduleId },
      },
      {
        $push: {
          issuedCertificates: {
            moduleId,
            courseId,
            imageUrl: "",
            issuedAt: now,
            studentDelivered: false,
            guardianDelivered: false,
            generationStatus: "generating",
            generationClaimedAt: now,
          },
        },
      },
      { new: true },
    );
    if (insertResult) return true;

    // الحالة 2: موجودة و idle → نحوّلها لـ generating
    const updateResult = await Student.findOneAndUpdate(
      {
        _id: studentId,
        issuedCertificates: {
          $elemMatch: {
            moduleId,
            generationStatus: { $ne: "generating" },
          },
        },
      },
      {
        $set: {
          "issuedCertificates.$.generationStatus": "generating",
          "issuedCertificates.$.generationClaimedAt": now,
        },
      },
      { new: true },
    );
    if (updateResult) return true;

    // الحالة 3: حد تاني بيولّد دلوقتي → نرفض
    return false;
  } catch (err) {
    console.error(
      `❌ claimCertificateGeneration error [${studentId}/${moduleId}]:`,
      err.message,
    );
    return false;
  }
}

// ✅ بعد الإرسال أو الفشل → نفكّ القفل
async function releaseCertificateClaim(studentId, moduleId) {
  try {
    await Student.updateOne(
      {
        _id: studentId,
        issuedCertificates: {
          $elemMatch: { moduleId, generationStatus: "generating" },
        },
      },
      {
        $set: { "issuedCertificates.$.generationStatus": "idle" },
      },
    );
  } catch (err) {
    console.error(
      `⚠️ releaseCertificateClaim error [${studentId}/${moduleId}]:`,
      err.message,
    );
  }
}

// ============================================================
// ✅ حجز الإرسال (Atomic) — يضمن إن الرسالة تتبعت مرة واحدة بس
//    حتى لو أكتر من كرون اشتغلوا في نفس الوقت
//    بترجع true بس لو إحنا اللي غيّرنا الحالة من false → true
// ============================================================
async function reserveDelivery(studentId, moduleId, who) {
  const field = who === "student" ? "studentDelivered" : "guardianDelivered";
  try {
    const result = await Student.updateOne(
      {
        _id: studentId,
        issuedCertificates: {
          $elemMatch: { moduleId, [field]: { $ne: true } },
        },
      },
      {
        $set: {
          [`issuedCertificates.$.${field}`]: true,
          [`issuedCertificates.$.${field}At`]: new Date(),
        },
      },
    );
    return result.modifiedCount === 1;
  } catch (err) {
    console.error(
      `❌ reserveDelivery error [${studentId}/${moduleId}/${who}]:`,
      err.message,
    );
    // لو معرفناش نحجز، الأأمن إننا ما نبعتش
    return false;
  }
}

// ✅ لو الإرسال فشل فعلاً نرجّع الحجز عشان الكرون يحاول تاني
async function revertDelivery(studentId, moduleId, who) {
  const field = who === "student" ? "studentDelivered" : "guardianDelivered";
  try {
    await Student.updateOne(
      { _id: studentId, "issuedCertificates.moduleId": moduleId },
      {
        $set: { [`issuedCertificates.$.${field}`]: false },
        $unset: { [`issuedCertificates.$.${field}At`]: "" },
      },
    );
  } catch (err) {
    console.error(
      `⚠️ revertDelivery error [${studentId}/${moduleId}/${who}]:`,
      err.message,
    );
  }
}

// ✅ الـ revert آمن بس لو الـ API رفض صراحة (يعني الرسالة أكيد ماتبعتتش).
// أي خطأ تاني (timeout / network) ممكن تكون الرسالة وصلت فعلاً → منرجّعش الحجز.
function isDefiniteSendFailure(result) {
  return String(result?.error || "").startsWith("WhatsApp API media error");
}

// ✅ تنظيف الـ claims القديمة (failover لو السيرفر وقع في النص)
async function cleanupStaleCertificateClaims() {
  try {
    const threshold = new Date(Date.now() - STALE_CERT_CLAIM_MS);
    const result = await Student.updateMany(
      { "issuedCertificates.generationStatus": "generating" },
      {
        $set: {
          "issuedCertificates.$[elem].generationStatus": "idle",
        },
      },
      {
        arrayFilters: [
          {
            "elem.generationStatus": "generating",
            "elem.generationClaimedAt": { $lt: threshold },
          },
        ],
      },
    );
    if (result.modifiedCount > 0) {
      console.log(
        `🧹 Cleaned up ${result.modifiedCount} stale certificate claims`,
      );
    }
  } catch (err) {
    console.error("⚠️ cleanupStaleCertificateClaims error:", err.message);
  }
}

// ============================================================
// ✅ توليد صورة الشهادة
// ============================================================
async function generateCertificateImage(browser, data) {
  const { studentName, caption, signature, background, date, assets } = data;

  const fullHtml = await buildCertificateHtml({
    studentName,
    caption,
    signatureName: signature,
    date,
    backgroundStyle: background,
    assets,
  });

  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1200, height: 900 });
    await page.setContent(fullHtml, {
      waitUntil: "load",
      timeout: 30000,
    });

    const fileName = `cert-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}.png`;
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
// ✅ رفع الصورة على Cloudinary
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
// ✅ مزامنة الشهادة مع بورتفوليو الطالب
// ✅ NOTE: الكابشن هو المصدر الوحيد (module.title بقى ملغي)
// ============================================================
async function syncCertificateToStudentPortfolio(
  student,
  moduleId,
  module,
  fullImageUrl,
  certCaption,
) {
  const userId = student.authUserId;
  if (!userId) return { added: false, reason: "NO_LINKED_USER" };

  // ✅ الكابشن هو اللي بيظهر في البورتفوليو (fallback ثابت)
  const displayTitle = certCaption || DEFAULT_CERT_CAPTION;

  try {
    const { added } = await Portfolio.addModuleCertificateIfMissing(userId, {
      moduleId,
      title: displayTitle,
      description: `تم إنجاز "${displayTitle}" بنجاح`,
      imageUrl: fullImageUrl,
      issuer: module.certificateSignatureName || "Aya Elnagar",
      issueDate: new Date(),
    });

    if (added) {
      console.log(
        `🗂️  Added certificate to portfolio for ${student.personalInfo.fullName} (${moduleId})`,
      );
    }
    return { added };
  } catch (error) {
    console.error(
      `⚠️ Portfolio sync failed for ${student.personalInfo?.fullName}:`,
      error.message,
    );
    return { added: false, reason: "ERROR" };
  }
}

// ============================================================
// ✅ إرسال الشهادة عبر واتساب
// ============================================================
async function sendCertificateWithFallback(
  phoneNumber,
  filePath,
  caption,
  studentName = "",
) {
  try {
    const result = await wapilotService.sendImageFile(
      phoneNumber,
      filePath,
      caption,
    );

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
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    await connectDB();
    console.log("🚀 Running Certificate Cron Job...");

    // ✅ فك الـ claims القديمة قبل ما نبدأ
    await cleanupStaleCertificateClaims();

    // ✅ نجيب إعدادات الصور مرة واحدة
    const certSettings = await CertificateSettings.getSingleton();
    const certAssets = {
      badge: certSettings.badge,
      logo: certSettings.logo,
      stem: certSettings.stem,
      iAIDL: certSettings.iAIDL,
      finland: certSettings.finland,
      kidsafe: certSettings.kidsafe,
    };

    const students = await Student.find({ isDeleted: false }).lean();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const summary = {
      checked: 0,
      generated: 0,
      studentSent: 0,
      guardianSent: 0,
      adultGuardianSkipped: 0,
      makeupGroupsSkipped: 0,
      pendingNoRecipient: 0,
      cloudinaryUploads: 0,
      portfolioSynced: 0,
      portfolioSkippedNoUser: 0,
      noAttendanceYet: 0,
      alreadyClaimed: 0,
      alreadyDeliveredDedup: 0, // ✅ اتمنع تكرارها بالـ dedup
      uncertainSends: 0, // ✅ NEW: إرسال غير مؤكد (الحجز اتساب)
      errors: 0,
    };

    for (const student of students) {
      const isAdult = student.studentType === "adults";

      const groups = await Group.find({
        students: student._id,
        isDeleted: false,
        isMakeupGroup: { $ne: true },
      })
        .populate("courseId")
        .lean();

      for (const group of groups) {
        if (group.isMakeupGroup === true) {
          console.log(
            `⏭️ [MAKEUP GUARD] Skipping makeup group ${group._id} for ${student.personalInfo?.fullName}`,
          );
          summary.makeupGroupsSkipped++;
          continue;
        }

        const course = group.courseId;
        if (!course || !course.curriculum) continue;

        for (
          let moduleIndex = 0;
          moduleIndex < course.curriculum.length;
          moduleIndex++
        ) {
          const module = course.curriculum[moduleIndex];

          if (!module.hasCertificate) continue;

          const moduleId = `${course._id}-${moduleIndex}`;

          const certCaption =
            module.certificateCaption?.trim() || DEFAULT_CERT_CAPTION;

          // ✅ فحص أولي سريع من الـ snapshot (بس للتصفية — مش للقرار النهائي)
          const snapshotRecord = student.issuedCertificates?.find(
            (c) => c.moduleId === moduleId,
          );
          if (
            snapshotRecord?.studentDelivered === true &&
            (isAdult || snapshotRecord?.guardianDelivered === true)
          ) {
            continue;
          }

          summary.checked++;

          // ✅ الحجز الـ atomic للتوليد
          const claimed = await claimCertificateGeneration(
            student._id,
            moduleId,
            course._id,
          );

          if (!claimed) {
            summary.alreadyClaimed++;
            console.log(
              `🔒 Certificate already being generated for ${student.personalInfo?.fullName} - ${certCaption}`,
            );
            continue;
          }

          try {
            // 🔄 نقرا الحالة الحقيقية من الداتابيز بعد الـ claim
            // (الـ snapshot ممكن يكون قديم لو كرون تاني خلّص في الوقت ده)
            const freshStudent = await Student.findOne(
              { _id: student._id, "issuedCertificates.moduleId": moduleId },
              { "issuedCertificates.$": 1 },
            ).lean();
            const freshRecord = freshStudent?.issuedCertificates?.[0];

            let studentAlreadyDelivered =
              freshRecord?.studentDelivered === true;
            let guardianAlreadyDelivered =
              freshRecord?.guardianDelivered === true;

            if (
              studentAlreadyDelivered &&
              (isAdult || guardianAlreadyDelivered)
            ) {
              summary.alreadyDeliveredDedup++;
              console.log(
                `🔒 [DEDUP] Already delivered: ${student.personalInfo?.fullName} - ${certCaption}`,
              );
              await releaseCertificateClaim(student._id, moduleId);
              continue;
            }

            const sessions = await Session.find({
              groupId: group._id,
              moduleIndex: moduleIndex,
              isDeleted: false,
            }).lean();

            let hasAttended = false;
            for (const session of sessions) {
              const attendance = session.attendance.find(
                (a) => a.studentId.toString() === student._id.toString(),
              );
              if (
                attendance &&
                ["present", "late", "excused"].includes(attendance.status)
              ) {
                hasAttended = true;
                break;
              }
            }

            if (!hasAttended) {
              summary.noAttendanceYet++;
              console.log(
                `⏭️ ${student.personalInfo.fullName} - ${certCaption}: لا يوجد حضور لسه`,
              );
              await releaseCertificateClaim(student._id, moduleId);
              continue;
            }

            const studentNumber = student.personalInfo?.whatsappNumber;

            const guardianNumber = isAdult
              ? null
              : student.guardianInfo?.whatsappNumber;

            const studentNeedsSend =
              !!studentNumber && !studentAlreadyDelivered;
            const guardianNeedsSend =
              !isAdult && !!guardianNumber && !guardianAlreadyDelivered;

            if (!studentNeedsSend && !guardianNeedsSend) {
              summary.pendingNoRecipient++;
              console.log(
                `⏳ ${student.personalInfo.fullName} - ${certCaption}: مفيش رقم واتساب متاح`,
              );
              await releaseCertificateClaim(student._id, moduleId);
              continue;
            }

            console.log(
              `🎓 Generating certificate for ${student.personalInfo.fullName} - ${certCaption}${isAdult ? " [ADULT]" : ""}`,
            );

            const browser = await getBrowser();

            const { filePath, imageUrl } = await generateCertificateImage(
              browser,
              {
                studentName: student.personalInfo.fullName,
                caption: certCaption,
                signature: module.certificateSignatureName || "Aya Elnagar",
                background: module.certificateBackground || "navy-orange",
                date: new Date().toLocaleDateString("en-GB"),
                assets: certAssets,
              },
            );

            summary.generated++;

            const cloudinaryUrl = await uploadCertificateToCloudinary(filePath);
            if (cloudinaryUrl) {
              summary.cloudinaryUploads++;
            } else {
              console.warn(
                `⚠️ Cloudinary upload failed for ${student.personalInfo.fullName}`,
              );
            }
            const fullImageUrl = cloudinaryUrl || `${baseUrl}${imageUrl}`;

            const portfolioResult = await syncCertificateToStudentPortfolio(
              student,
              moduleId,
              module,
              fullImageUrl,
              certCaption,
            );
            if (portfolioResult?.added) {
              summary.portfolioSynced++;
            } else if (portfolioResult?.reason === "NO_LINKED_USER") {
              summary.portfolioSkippedNoUser++;
            }

            const preferredLanguage =
              student.communicationPreferences?.preferredLanguage || "ar";

            let studentDelivered = studentAlreadyDelivered;
            let guardianDelivered = guardianAlreadyDelivered;

            // ── Student message ─────────────────────────────
            if (studentNeedsSend) {
              const studentCaption =
                await wapilotService.prepareCertificateStudentMessage(
                  student.personalInfo.fullName,
                  student.personalInfo.gender,
                  preferredLanguage,
                  certCaption,
                  student.personalInfo.nickname,
                );

              // 🔒 نحجز قبل الإرسال — لو فشل الحجز يبقى حد بعت بالفعل
              const reserved = await reserveDelivery(
                student._id,
                moduleId,
                "student",
              );

              if (!reserved) {
                summary.alreadyDeliveredDedup++;
                studentDelivered = true;
                console.log(
                  `🔒 [DEDUP] Student cert already sent: ${student.personalInfo.fullName} - ${certCaption}`,
                );
              } else {
                const result = await sendCertificateWithFallback(
                  studentNumber,
                  filePath,
                  studentCaption,
                  student.personalInfo.fullName,
                );

                if (result?.success) {
                  studentDelivered = true;
                  summary.studentSent++;
                } else if (isDefiniteSendFailure(result)) {
                  // الـ API رفض صراحة → الرسالة أكيد ماتبعتتش → نرجّع الحجز
                  await revertDelivery(student._id, moduleId, "student");
                  console.warn(
                    `⚠️ فشل إرسال الشهادة للطالب ${student.personalInfo.fullName}: ${result?.error}`,
                  );
                } else {
                  // فشل غير مؤكد (timeout / network) → نسيب الحجز (ممنوع التكرار)
                  summary.uncertainSends++;
                  studentDelivered = true;
                  console.warn(
                    `❓ إرسال غير مؤكد للطالب ${student.personalInfo.fullName} — الحجز اتساب: ${result?.error}`,
                  );
                }
              }
            }

            // ── Guardian message — يتخطى للـ adults ────────
            if (guardianNeedsSend) {
              const guardianCaption =
                await wapilotService.prepareCertificateGuardianMessage(
                  student.guardianInfo?.name,
                  student.guardianInfo?.relationship,
                  student.personalInfo.fullName,
                  student.personalInfo.gender,
                  preferredLanguage,
                  student.guardianInfo?.nickname,
                  student.personalInfo?.nickname,
                  certCaption,
                );

              const reserved = await reserveDelivery(
                student._id,
                moduleId,
                "guardian",
              );

              if (!reserved) {
                summary.alreadyDeliveredDedup++;
                guardianDelivered = true;
                console.log(
                  `🔒 [DEDUP] Guardian cert already sent: ${student.personalInfo.fullName} - ${certCaption}`,
                );
              } else {
                const result = await sendCertificateWithFallback(
                  guardianNumber,
                  filePath,
                  guardianCaption,
                  student.personalInfo.fullName,
                );

                if (result?.success) {
                  guardianDelivered = true;
                  summary.guardianSent++;
                } else if (isDefiniteSendFailure(result)) {
                  await revertDelivery(student._id, moduleId, "guardian");
                  console.warn(
                    `⚠️ فشل إرسال الشهادة لولي أمر ${student.personalInfo.fullName}: ${result?.error}`,
                  );
                } else {
                  summary.uncertainSends++;
                  guardianDelivered = true;
                  console.warn(
                    `❓ إرسال غير مؤكد لولي أمر ${student.personalInfo.fullName} — الحجز اتساب: ${result?.error}`,
                  );
                }
              }
            } else if (isAdult) {
              summary.adultGuardianSkipped++;
              console.log(
                `   ⏭️ [ADULT] Skipping guardian certificate for ${student.personalInfo.fullName}`,
              );
            }

            // ✅ تحديث الـ entry — من غير ما نكتب فوق studentDelivered/guardianDelivered
            // (اتسجلوا خلاص في reserveDelivery)
            await Student.updateOne(
              { _id: student._id, "issuedCertificates.moduleId": moduleId },
              {
                $set: {
                  "issuedCertificates.$.imageUrl": fullImageUrl,
                  // الطالب البالغ: ولي الأمر مش مطلوب، فنعتبره مسلَّم
                  ...(isAdult
                    ? {
                        "issuedCertificates.$.guardianDelivered": true,
                        "issuedCertificates.$.guardianDeliveredAt": new Date(),
                      }
                    : {}),
                },
              },
            );

            // ✅ نفك القفل بعد الإرسال
            await releaseCertificateClaim(student._id, moduleId);

            // ✅ تنظيف الملف المحلي
            try {
              await fs.remove(filePath);
              console.log(`🗑️ Deleted local file: ${path.basename(filePath)}`);
            } catch (cleanupError) {
              // مش مشكلة لو متحذفش
            }

            console.log(
              `✅ ${student.personalInfo.fullName} - ${certCaption}: الطالب=${
                studentDelivered ? "اتبعتله" : "لسه معلّق"
              }, ولي الأمر=${
                isAdult
                  ? "متخطى (طالب بالغ)"
                  : guardianDelivered
                    ? "اتبعتله"
                    : "لسه معلّق"
              }`,
            );
          } catch (moduleError) {
            summary.errors++;
            console.error(
              `❌ Error with certificate for ${student.personalInfo?.fullName} - ${certCaption}:`,
              moduleError,
            );

            // ✅ نفك القفل حتى لو حصل خطأ
            try {
              await releaseCertificateClaim(student._id, moduleId);
            } catch (_) {}
          }
        }
      }
    }

    console.log("📊 Certificate Cron Summary:", summary);

    return NextResponse.json({
      success: true,
      message: "Cron job completed.",
      summary,
    });
  } catch (error) {
    console.error("❌ Cron Job Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}