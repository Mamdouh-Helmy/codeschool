import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "../../../models/Student";
import Group from "../../../models/Group";
import Session from "../../../models/Session";
import { wapilotService } from "../../../services/wapilot-service";
import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";
import { buildCertificateHtml } from "../../../utils/certificateHtml";

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
// ✅ توليد صورة الشهادة — بدون React/react-dom/server (متوافق مع
// Route Handlers). راجع src/app/utils/certificateHtml.js للتفاصيل.
// ============================================================
async function generateCertificateImage(browser, data) {
  const { studentName, moduleTitle, achievements, signature, background, date, baseUrl } = data;

  const fullHtml = buildCertificateHtml({
    studentName,
    moduleTitle,
    signatureName: signature,
    date,
    achievements,
    backgroundStyle: background,
    baseUrl,
  });

  const page = await browser.newPage();
  try {
    await page.setContent(fullHtml, { waitUntil: "networkidle0" });

    const fileName = `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`;
    const filePath = path.join(process.cwd(), "public", "temp", fileName);
    await fs.ensureDir(path.dirname(filePath));
    await page.screenshot({ path: filePath, fullPage: true });

    return `/temp/${fileName}`;
  } finally {
    await page.close();
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (!isAuthorizedRequest(request, searchParams)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let browser = null;

  try {
    await connectDB();
    console.log("🚀 Running Certificate Cron Job...");

    const students = await Student.find({ isDeleted: false }).lean();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const summary = {
      checked: 0,
      generated: 0,
      studentSent: 0,
      guardianSent: 0,
      pendingNoRecipient: 0,
      errors: 0,
    };

    for (const student of students) {
      const groups = await Group.find({ _id: { $in: student.academicInfo.groupIds }, isDeleted: false })
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

            if (!hasAttended) continue;

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

            const achievements = module.lessons?.length
              ? module.lessons.map((l) => l.title)
              : ["Successfully completed all module requirements."];

            if (!browser) {
              browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
            }

            const imagePath = await generateCertificateImage(browser, {
              studentName: student.personalInfo.fullName,
              moduleTitle: module.title,
              achievements,
              signature: module.certificateSignatureName || "Aya Elnagar",
              background: module.certificateBackground || "navy-orange",
              date: new Date().toLocaleDateString("en-GB"),
              baseUrl,
            });

            summary.generated++;

            const fullImageUrl = `${baseUrl}${imagePath}`;

            // ✅ اللغة المفضلة بتاعة الطالب — بتحكم في لغة رسالتي الطالب وولي الأمر
            const preferredLanguage = student.communicationPreferences?.preferredLanguage || "ar";

            let studentDelivered = studentAlreadyDelivered;
            let guardianDelivered = guardianAlreadyDelivered;

            if (studentNeedsSend) {
              const caption = await wapilotService.prepareCertificateStudentMessage(
                student.personalInfo.fullName,
                student.personalInfo.gender,
                preferredLanguage,
                module.title,
                student.personalInfo.nickname,
              );
              const result = await wapilotService.sendMediaMessage(studentNumber, fullImageUrl, caption);
              studentDelivered = !!result?.success;
              if (studentDelivered) {
                summary.studentSent++;
              } else {
                console.warn(`⚠️ فشل إرسال الشهادة للطالب ${student.personalInfo.fullName}: ${result?.error}`);
              }
            }

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
              const result = await wapilotService.sendMediaMessage(guardianNumber, fullImageUrl, guardianCaption);
              guardianDelivered = !!result?.success;
              if (guardianDelivered) {
                summary.guardianSent++;
              } else {
                console.warn(`⚠️ فشل إرسال الشهادة لولي أمر ${student.personalInfo.fullName}: ${result?.error}`);
              }
            }

            const now = new Date();

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
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}