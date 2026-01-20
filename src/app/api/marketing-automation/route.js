import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import {
  triggerEvaluationFollowup,
  onGroupCompletedMarketing,
  getMarketingStats,
} from "../../services/marketingAutomation";
import MarketingLead from "../../models/MarketingLead";
import StudentEvaluation from "../../models/StudentEvaluation";

export async function POST(req) {
  try {
    console.log("🤖 [Marketing Automation API] Trigger received");

    const user = await getUserFromRequest(req);

    if (!user || (user.role !== "marketing" && user.role !== "admin")) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بتشغيل الأتمتة",
          code: "UNAUTHORIZED",
        },
        { status: 401 },
      );
    }

    await connectDB();

    const body = await req.json();
    const { eventType, data } = body;

    if (!eventType) {
      return NextResponse.json(
        {
          success: false,
          message: "نوع الحدث مطلوب",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    let result;

    switch (eventType) {
      case "student_evaluation_completed":
        if (!data?.evaluationId) {
          return NextResponse.json(
            {
              success: false,
              message: "معرف التقييم مطلوب",
              code: "VALIDATION_ERROR",
            },
            { status: 400 },
          );
        }
        result = await triggerEvaluationFollowup(data.evaluationId, user.id);
        break;

      case "group_completed":
        if (!data?.groupId) {
          return NextResponse.json(
            {
              success: false,
              message: "معرف المجموعة مطلوب",
              code: "VALIDATION_ERROR",
            },
            { status: 400 },
          );
        }
        result = await onGroupCompletedMarketing(data.groupId, user.id);
        break;

      case "lead_created":
        if (!data?.leadId) {
          return NextResponse.json(
            {
              success: false,
              message: "معرف الـ Lead مطلوب",
              code: "VALIDATION_ERROR",
            },
            { status: 400 },
          );
        }
        result = await handleNewLeadAutomation(data.leadId, user.id);
        break;

      case "high_attendance_detected":
        if (!data?.studentId || !data?.groupId) {
          return NextResponse.json(
            {
              success: false,
              message: "معرف الطالب والمجموعة مطلوبان",
              code: "VALIDATION_ERROR",
            },
            { status: 400 },
          );
        }
        result = await handleHighAttendanceAutomation(
          data.studentId,
          data.groupId,
          user.id,
        );
        break;

      case "student_at_risk":
        if (!data?.studentId || !data?.groupId) {
          return NextResponse.json(
            {
              success: false,
              message: "معرف الطالب والمجموعة مطلوبان",
              code: "VALIDATION_ERROR",
            },
            { status: 400 },
          );
        }
        result = await handleAtRiskStudentAutomation(
          data.studentId,
          data.groupId,
          user.id,
        );
        break;

      case "bulk_upsell_campaign":
        result = await triggerBulkUpsellCampaign(data, user.id);
        break;

      case "re_enrollment_campaign":
        result = await triggerReEnrollmentCampaign(data, user.id);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            message: "نوع الحدث غير معروف",
            code: "UNKNOWN_EVENT",
          },
          { status: 400 },
        );
    }

    console.log(
      `✅ [Marketing Automation] ${eventType} completed successfully`,
    );

    return NextResponse.json({
      success: true,
      message: `تم تنفيذ الأتمتة بنجاح: ${eventType}`,
      eventType,
      result,
      triggeredBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("❌ [Marketing Automation API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تشغيل الأتمتة التسويقية",
        error: error.message,
        code: "AUTOMATION_ERROR",
      },
      { status: 500 },
    );
  }
}

// Helper: Handle new lead automation
async function handleNewLeadAutomation(leadId, userId) {
  try {
    console.log(`🤖 [Lead Automation] Processing new lead: ${leadId}`);

    const lead = await MarketingLead.findById(leadId)
      .populate("assignedTo", "name email")
      .lean();

    if (!lead) {
      throw new Error("Lead not found");
    }

    // تحديد استراتيجية المتابعة بناءً على مصدر الـ Lead
    let followupStrategy;
    switch (lead.source) {
      case "landing_page":
        followupStrategy = {
          immediateWhatsApp: true,
          followupEmail: true,
          scheduleCall: false,
          priority: "high",
        };
        break;
      case "contact_form":
        followupStrategy = {
          immediateWhatsApp: true,
          followupEmail: true,
          scheduleCall: true,
          priority: "medium",
        };
        break;
      case "referral":
        followupStrategy = {
          immediateWhatsApp: true,
          followupEmail: false,
          scheduleCall: true,
          priority: "high",
        };
        break;
      default:
        followupStrategy = {
          immediateWhatsApp: true,
          followupEmail: false,
          scheduleCall: false,
          priority: "low",
        };
    }

    // إرسال رسالة WhatsApp ترحيبية
    const whatsappMessage = `🎉 أهلاً ${lead.fullName}!

شكراً لتواصلك مع Code School 💻

نقدم دورات برمجة احترافية:
• تطوير الويب
• تطبيقات الموبايل
• الذكاء الاصطناعي
• قواعد البيانات

هل لديك أي استفسار عن أي كورس معين؟`;

    // تحديث الـ Lead
    await MarketingLead.findByIdAndUpdate(leadId, {
      $set: {
        status: "contacted",
        "metadata.lastContacted": new Date(),
        "metadata.nextFollowUp": new Date(Date.now() + 24 * 60 * 60 * 1000), // بعد 24 ساعة
        "whatsappStatus.lastMessage": whatsappMessage,
        "whatsappStatus.lastMessageAt": new Date(),
        "whatsappStatus.conversationStage": "initial",
      },
      $push: {
        communicationHistory: {
          channel: "whatsapp",
          message: whatsappMessage,
          direction: "outbound",
          status: "pending",
          notes: "Welcome message automation",
        },
      },
    });

    return {
      success: true,
      leadId,
      followupStrategy,
      actionsTaken: ["whatsapp_welcome_sent", "lead_status_updated"],
      nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  } catch (error) {
    console.error(`❌ [Lead Automation] Error:`, error);
    throw error;
  }
}

// Helper: Handle high attendance automation
async function handleHighAttendanceAutomation(studentId, groupId, userId) {
  try {
    console.log(
      `🤖 [High Attendance Automation] Student: ${studentId}, Group: ${groupId}`,
    );

    // جلب بيانات الطالب والمجموعة
    const [student, group, evaluations] = await Promise.all([
      Student.findById(studentId)
        .select("personalInfo.fullName personalInfo.whatsappNumber")
        .lean(),
      Group.findById(groupId).populate("courseId", "title level").lean(),
      StudentEvaluation.find({ studentId, groupId, isDeleted: false }).lean(),
    ]);

    if (!student || !group) {
      throw new Error("Student or group not found");
    }

    // حساب نسبة الحضور
    const sessions = await Session.find({
      groupId,
      isDeleted: false,
      status: "completed",
    }).lean();
    const attendanceRecords = sessions.flatMap(
      (session) =>
        session.attendance?.filter(
          (att) => att.studentId.toString() === studentId.toString(),
        ) || [],
    );

    const presentCount = attendanceRecords.filter(
      (att) => att.status === "present",
    ).length;
    const attendancePercentage =
      sessions.length > 0
        ? Math.round((presentCount / sessions.length) * 100)
        : 0;

    if (attendancePercentage < 90) {
      return {
        success: false,
        message: `Attendance percentage ${attendancePercentage}% is below threshold`,
        attendancePercentage,
        threshold: 90,
      };
    }

    // إذا كان الحضور ممتازاً، إنشاء عرض ترقية
    const evaluation = evaluations[0];
    if (evaluation?.finalDecision === "pass") {
      // الطالب مؤهل للترقية بالفعل
      return {
        success: true,
        message: "Student already eligible for upsell",
        attendancePercentage,
        alreadyEligible: true,
      };
    }

    // إنشاء إجراء ترقية استناداً للحضور الممتاز
    const course = group.courseId;
    const targetCourse = await Course.findOne({
      level: course?.level === "beginner" ? "intermediate" : "advanced",
      isActive: true,
    })
      .select("title price")
      .lean();

    if (!targetCourse) {
      return {
        success: true,
        message: "No advanced course available for upsell",
        attendancePercentage,
        upsellPossible: false,
      };
    }

    const upsellMessage = `🎉 مبروك ${student.personalInfo?.fullName}!

نسبة حضورك في ${course?.title} وصلت لـ ${attendancePercentage}%! 👏💪

بسبب التزامك المميز، نقدم لك عرضاً خاصاً للتسجيل في:
**${targetCourse.title}**

خصم 15% فقط لطلابنا الملتزمين!

🎯 للاستفادة من العرض، رد بكلمة "نعم" أو اتصل بنا.

مع تحيات فريق Code School 💻✨`;

    // هنا يمكن إضافة منطق إرسال الرسالة عبر wapilotService

    return {
      success: true,
      attendancePercentage,
      upsellCreated: true,
      targetCourse: targetCourse.title,
      discountPercentage: 15,
      message: upsellMessage,
      nextSteps: [
        "send_whatsapp_message",
        "track_response",
        "follow_up_3_days",
      ],
    };
  } catch (error) {
    console.error(`❌ [High Attendance Automation] Error:`, error);
    throw error;
  }
}

// Helper: Handle at-risk student automation
async function handleAtRiskStudentAutomation(studentId, groupId, userId) {
  try {
    console.log(
      `🤖 [At-Risk Automation] Student: ${studentId}, Group: ${groupId}`,
    );

    // جلب بيانات الطالب والتقييم
    const [student, evaluation] = await Promise.all([
      Student.findById(studentId)
        .select(
          "personalInfo.fullName personalInfo.whatsappNumber personalInfo.email",
        )
        .lean(),
      StudentEvaluation.findOne({ studentId, groupId, isDeleted: false })
        .populate("groupId", "name code courseId")
        .populate({
          path: "groupId",
          populate: {
            path: "courseId",
            select: "title level",
          },
        })
        .lean(),
    ]);

    if (!student || !evaluation) {
      throw new Error("Student or evaluation not found");
    }

    const group = evaluation.groupId;
    const course = group.courseId;

    // تحديد نوع الإجراء بناءً على فئة الطالب
    let actionType, message, supportPackage, discountPercentage;

    switch (evaluation.marketing?.studentCategory) {
      case "at_risk":
        actionType = "support";
        discountPercentage = 30;
        supportPackage = "intensive_support_package";
        message = `🔔 ${student.personalInfo?.fullName}، نلاحظ أنك تحتاج دعم إضافي في ${course?.title}!

نقترح عليك:
✅ جلسات دعم مكثفة (3 جلسات)
✅ مراجعة جميع المشاريع
✅ خصم ${discountPercentage}% للاستمرار معنا

🎯 هدفنا نوصل معاك لـ 100% استفادة!
📞 رد علينا عشان نبدأ خطة الدعم.`;
        break;

      case "needs_repeat":
        actionType = "re_enroll";
        discountPercentage = 40;
        supportPackage = "repeat_with_support";
        message = `🔄 ${student.personalInfo?.fullName}، علشان تستفيد 100% من ${course?.title}

بنقترح إعادة الكورس مع:
✅ دعم شخصي (جلسة أسبوعياً)
✅ خصم ${discountPercentage}% على الإعادة
✅ متابعة مع المدرب

💪 المستوى الجاي بتكون أقوى ومستعد 100%!
💰 السعر بعد الخصم: [${course?.price || 0} × ${100 - discountPercentage}%]
📞 رد علشان نحجز مكانك!`;
        break;

      case "needs_support":
      default:
        actionType = "support";
        discountPercentage = 25;
        supportPackage = "basic_support_package";
        message = `👋 ${student.personalInfo?.fullName}، أداؤك في ${course?.title} جيد!

لكن محتاج تدعيم بسيط في بعض النقاط.

عندنا:
✅ جلسات دعم مجانية
✅ خصم ${discountPercentage}% للاستمرار
✅ مراجعة المشاريع

🆓 جرب أول جلسة مجاناً!
📞 تواصل معنا للتفاصيل.`;
    }

    // حساب نقاط الضعف
    const weakPoints = evaluation.weakPoints || [];
    const weakPointsAr = weakPoints.map((wp) => {
      const map = {
        understanding: "الفهم النظري",
        practice: "الممارسة العملية",
        attendance: "الحضور",
        participation: "المشاركة",
        homework: "الواجبات",
        projects: "المشاريع",
      };
      return map[wp] || wp;
    });

    if (weakPointsAr.length > 0) {
      message += `\n\nنركز معاك على: ${weakPointsAr.join("، ")}`;
    }

    return {
      success: true,
      studentCategory: evaluation.marketing?.studentCategory,
      actionType,
      supportPackage,
      discountPercentage,
      message,
      communicationPlan: {
        immediate: ["whatsapp_retention_message"],
        after_24h: ["follow_up_call"],
        after_72h: ["email_reminder"],
        after_7d: ["final_offer"],
      },
      expectedOutcome: "retention_with_support",
      estimatedSuccessRate: 60,
    };
  } catch (error) {
    console.error(`❌ [At-Risk Automation] Error:`, error);
    throw error;
  }
}

// Helper: Trigger bulk upsell campaign
// Helper: Trigger bulk upsell campaign
async function triggerBulkUpsellCampaign(data, userId) {
  try {
    console.log(`🤖 [Bulk Upsell Campaign] Starting...`);

    const { groupIds, studentIds, courseId, discountPercentage, deadlineDays } =
      data;

    // دعم كلا الطريقتين: groupIds أو studentIds
    let eligibleEvaluations = [];

    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      // الطريقة الأصلية: عن طريق المجموعات
      console.log(`📊 Using groupIds: ${groupIds.length} groups`);
      eligibleEvaluations = await StudentEvaluation.find({
        groupId: { $in: groupIds },
        isDeleted: false,
        finalDecision: "pass",
        "marketing.studentCategory": {
          $in: ["star_student", "ready_for_next_level"],
        },
      })
        .populate(
          "studentId",
          "personalInfo.fullName personalInfo.whatsappNumber personalInfo.email",
        )
        .populate("groupId", "name code courseId")
        .populate({
          path: "groupId",
          populate: {
            path: "courseId",
            select: "title level",
          },
        })
        .lean();
    } else if (
      studentIds &&
      Array.isArray(studentIds) &&
      studentIds.length > 0
    ) {
      // الطريقة الجديدة: عن طريق الطلاب مباشرة
      console.log(`📊 Using studentIds: ${studentIds.length} students`);
      eligibleEvaluations = await StudentEvaluation.find({
        studentId: { $in: studentIds },
        isDeleted: false,
        finalDecision: "pass",
      })
        .populate(
          "studentId",
          "personalInfo.fullName personalInfo.whatsappNumber personalInfo.email",
        )
        .populate("groupId", "name code courseId")
        .populate({
          path: "groupId",
          populate: {
            path: "courseId",
            select: "title level",
          },
        })
        .lean();
    } else {
      throw new Error("يجب توفير معرفات المجموعات أو معرفات الطلاب");
    }

    if (!courseId) {
      throw new Error("معرف الكورس المستهدف مطلوب");
    }

    // جلب الكورس المستهدف
    const targetCourse = await Course.findById(courseId).lean();
    if (!targetCourse) {
      throw new Error("الكورس المستهدف غير موجود");
    }

    if (eligibleEvaluations.length === 0) {
      return {
        success: false,
        message: "لا توجد تقييمات مؤهلة للترقية",
        totalEligible: 0,
      };
    }

    console.log(
      `📊 Found ${eligibleEvaluations.length} eligible students for bulk upsell`,
    );

    // إنشاء إجراءات ترقية جماعية
    const actions = [];
    const skipped = [];
    let messagesSent = 0;

    for (const evaluation of eligibleEvaluations) {
      try {
        // التحقق من وجود بيانات الطالب
        if (!evaluation.studentId) {
          skipped.push({
            evaluationId: evaluation._id,
            reason: "بيانات الطالب غير موجودة",
          });
          continue;
        }

        // التحقق من عدم وجود عرض سابق
        const existingAction = await MarketingAction.findOne({
          targetStudent: evaluation.studentId._id,
          actionType: "upsell",
          status: { $in: ["pending", "in_progress"] },
        });

        if (existingAction) {
          skipped.push({
            studentId: evaluation.studentId._id,
            studentName: evaluation.studentId.personalInfo?.fullName,
            reason: "يوجد عرض ترقية سابق",
          });
          continue;
        }

        // حساب السعر بعد الخصم
        const discountedPrice = Math.round(
          targetCourse.price * (1 - (discountPercentage || 15) / 100),
        );

        // إنشاء الرسالة الافتراضية
        const message = `🎉 مبروك ${evaluation.studentId.personalInfo?.fullName || "طالبنا العزيز"}!

بناءً على أدائك المتميز، نقدم لك عرضاً خاصاً للتسجيل في:
**${targetCourse.title}**

🏆 **عرض التميز:**
• الخصم: ${discountPercentage || 15}% للطلاب المتفوقين
• السعر الأصلي: ${targetCourse.price} ج.م
• السعر بعد الخصم: ${discountedPrice} ج.م فقط!
• العرض ساري حتى: ${new Date(Date.now() + (deadlineDays || 7) * 24 * 60 * 60 * 1000).toLocaleDateString("ar-EG")}

📞 للاستفادة من العرض، رد بكلمة "نعم" أو اتصل بنا مباشرة.

مع تحيات فريق Code School 💻✨`;

        // إرسال الرسالة عبر WhatsApp
        let whatsappSent = false;
        if (evaluation.studentId.personalInfo?.whatsappNumber) {
          try {
            const sendResult = await wapilotService.sendAndLogMessage({
              studentId: evaluation.studentId._id,
              phoneNumber: evaluation.studentId.personalInfo.whatsappNumber,
              messageContent: message,
              messageType: "bulk_upsell_offer",
              language: "ar",
              metadata: {
                studentName: evaluation.studentId.personalInfo.fullName,
                currentCourse:
                  evaluation.groupId?.courseId?.title || "كورس سابق",
                targetCourse: targetCourse.title,
                discountPercentage: discountPercentage || 15,
                campaignType: "bulk_upsell",
                createdBy: userId,
              },
            });

            if (sendResult.success) {
              whatsappSent = true;
              messagesSent++;
            }
          } catch (whatsappError) {
            console.error(
              `❌ WhatsApp error for ${evaluation.studentId.personalInfo?.fullName}:`,
              whatsappError.message,
            );
          }
        }

        // إنشاء إجراء الترقية
        const upsellAction = await MarketingAction.create({
          actionType: "upsell",
          targetStudent: evaluation.studentId._id,
          targetGroup: evaluation.groupId?._id,
          evaluationId: evaluation._id,
          actionData: {
            currentCourse: evaluation.groupId?.courseId?.title,
            targetCourse: targetCourse.title,
            currentLevel: evaluation.groupId?.courseId?.level,
            targetLevel: targetCourse.level,
            discountPercentage: discountPercentage || 15,
            originalPrice: targetCourse.price,
            discountedPrice: discountedPrice,
            deadline: new Date(
              Date.now() + (deadlineDays || 7) * 24 * 60 * 60 * 1000,
            ),
            customMessage: message,
            aiGenerated: true,
            generatedAt: new Date(),
            isBulkCampaign: true,
            campaignId: `bulk-upsell-${Date.now()}`,
          },
          communicationChannels: {
            whatsapp: whatsappSent,
            email: evaluation.studentId.personalInfo?.email ? true : false,
            sms: false,
          },
          status: "completed",
          results: {
            messageSent: whatsappSent,
            sentAt: new Date(),
            responseReceived: false,
            conversion: false,
          },
          metadata: {
            createdBy: userId,
            createdAt: new Date(),
            campaignType: "bulk_upsell",
            priority: "medium",
            batchId: `batch-${Date.now()}`,
            sourceType: studentIds ? "selected_students" : "selected_groups",
          },
        });

        actions.push({
          actionId: upsellAction._id,
          studentId: evaluation.studentId._id,
          studentName: evaluation.studentId.personalInfo?.fullName,
          whatsappNumber: evaluation.studentId.personalInfo?.whatsappNumber,
          currentCourse: evaluation.groupId?.courseId?.title,
          targetCourse: targetCourse.title,
          discountPercentage: discountPercentage || 15,
          deadline: upsellAction.actionData.deadline,
          whatsappSent,
        });
      } catch (error) {
        console.error(
          `❌ Error creating upsell for student ${evaluation.studentId?._id}:`,
          error.message,
        );
        skipped.push({
          studentId: evaluation.studentId?._id,
          studentName: evaluation.studentId?.personalInfo?.fullName,
          reason: `خطأ: ${error.message}`,
        });
      }
    }

    console.log(
      `✅ Created ${actions.length} upsell actions, sent ${messagesSent} messages, skipped ${skipped.length}`,
    );

    return {
      success: true,
      campaignType: "bulk_upsell",
      targetCourse: targetCourse.title,
      discountPercentage: discountPercentage || 15,
      deadlineDays: deadlineDays || 7,
      totalEligible: eligibleEvaluations.length,
      actionsCreated: actions.length,
      messagesSent: messagesSent,
      skippedCount: skipped.length,
      actions,
      skipped,
      estimatedRevenue: actions.length * discountedPrice,
      nextSteps: [
        "مراجعة الإجراءات المنشأة",
        "متابعة الردود",
        "تحويل الطلاب الراغبين",
        "متابعة غير المستجيبين",
      ],
    };
  } catch (error) {
    console.error(`❌ [Bulk Upsell Campaign] Error:`, error);
    throw error;
  }
}

// Helper: Generate bulk upsell message
function generateBulkUpsellMessage(
  evaluation,
  targetCourse,
  discountPercentage,
  deadlineDays,
) {
  const studentName =
    evaluation.studentId.personalInfo?.fullName || "طالبنا العزيز";
  const currentCourse = evaluation.groupId.courseId?.title || "الكورس الحالي";
  const deadline = new Date(
    Date.now() + (deadlineDays || 7) * 24 * 60 * 60 * 1000,
  );

  return `🎉 مبروك ${studentName}!

بناءً على أدائك المتميز في ${currentCourse}، نقدم لك عرضاً خاصاً للتسجيل في:
**${targetCourse.title}**

🏆 **عرض التميز:**
• الخصم: ${discountPercentage || 15}% للطلاب المتفوقين
• السعر الأصلي: ${targetCourse.price} ج.م
• السعر بعد الخصم: ${Math.round(targetCourse.price * (1 - (discountPercentage || 15) / 100))} ج.م فقط!
• العرض ساري حتى: ${deadline.toLocaleDateString("ar-EG")}

🚀 **لماذا ${targetCourse.title}؟**
• مستوى متقدم يناسب مهاراتك
• مشاريع واقعية واحترافية
• شهادة معتمدة معترف بها
• فرص عمل في كبرى الشركات

📞 للاستفادة من العرض، رد بكلمة "نعم" أو اتصل بنا مباشرة.

*هذا العرض خاص بالطلاب المتفوقين فقط*

مع تحيات فريق Code School 💻✨`;
}

// Helper: Trigger re-enrollment campaign
async function triggerReEnrollmentCampaign(data, userId) {
  try {
    console.log(`🤖 [Re-Enrollment Campaign] Starting...`);

    const { groupIds, discountPercentage, deadlineDays, includeSupport } = data;

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      throw new Error("Group IDs array required");
    }

    // جلب الطلاب الذين يحتاجون إعادة
    const repeatEvaluations = await StudentEvaluation.find({
      groupId: { $in: groupIds },
      isDeleted: false,
      finalDecision: "repeat",
      "marketing.studentCategory": "needs_repeat",
    })
      .populate(
        "studentId",
        "personalInfo.fullName personalInfo.whatsappNumber",
      )
      .populate("groupId", "name code courseId")
      .populate({
        path: "groupId",
        populate: {
          path: "courseId",
          select: "title price",
        },
      })
      .lean();

    if (repeatEvaluations.length === 0) {
      return {
        success: false,
        message: "No students needing re-enrollment found",
        totalEligible: 0,
      };
    }

    console.log(
      `📊 Found ${repeatEvaluations.length} students needing re-enrollment`,
    );

    // إنشاء إجراءات إعادة التسجيل
    const actions = [];
    const skipped = [];

    for (const evaluation of repeatEvaluations) {
      try {
        const course = evaluation.groupId.courseId;
        if (!course) {
          skipped.push({
            studentId: evaluation.studentId._id,
            studentName: evaluation.studentId.personalInfo?.fullName,
            reason: "Course not found",
          });
          continue;
        }

        // التحقق من عدم وجود عرض سابق
        const existingAction = await MarketingAction.findOne({
          targetStudent: evaluation.studentId._id,
          actionType: "re_enroll",
          status: { $in: ["pending", "in_progress"] },
        });

        if (existingAction) {
          skipped.push({
            studentId: evaluation.studentId._id,
            studentName: evaluation.studentId.personalInfo?.fullName,
            reason: "Existing re-enrollment action found",
          });
          continue;
        }

        // إنشاء إجراء إعادة التسجيل
        const reEnrollAction = await MarketingAction.create({
          actionType: "re_enroll",
          targetStudent: evaluation.studentId._id,
          targetGroup: evaluation.groupId._id,
          evaluationId: evaluation._id,
          actionData: {
            courseName: course.title,
            discountPercentage: discountPercentage || 40,
            originalPrice: course.price,
            discountedPrice: Math.round(
              course.price * (1 - (discountPercentage || 40) / 100),
            ),
            includeSupport: includeSupport !== false,
            supportSessions: includeSupport !== false ? 3 : 0,
            deadline: new Date(
              Date.now() + (deadlineDays || 30) * 24 * 60 * 60 * 1000,
            ),
            customMessage: generateReEnrollmentMessage(
              evaluation,
              course,
              discountPercentage,
              deadlineDays,
              includeSupport,
            ),
            aiGenerated: true,
            generatedAt: new Date(),
            isBulkCampaign: true,
            campaignId: `re-enroll-${Date.now()}`,
          },
          communicationChannels: {
            whatsapp: true,
            email: evaluation.studentId.personalInfo?.email ? true : false,
            sms: false,
          },
          status: "pending",
          metadata: {
            createdBy: userId,
            createdAt: new Date(),
            campaignType: "re_enrollment",
            priority: "high",
            batchId: `batch-${Date.now()}`,
          },
        });

        actions.push({
          actionId: reEnrollAction._id,
          studentId: evaluation.studentId._id,
          studentName: evaluation.studentId.personalInfo?.fullName,
          whatsappNumber: evaluation.studentId.personalInfo?.whatsappNumber,
          courseName: course.title,
          discountPercentage: discountPercentage || 40,
          includeSupport: includeSupport !== false,
          deadline: reEnrollAction.actionData.deadline,
        });
      } catch (error) {
        console.error(
          `❌ Error creating re-enrollment for student ${evaluation.studentId._id}:`,
          error.message,
        );
        skipped.push({
          studentId: evaluation.studentId._id,
          studentName: evaluation.studentId.personalInfo?.fullName,
          reason: `Error: ${error.message}`,
        });
      }
    }

    console.log(
      `✅ Created ${actions.length} re-enrollment actions, skipped ${skipped.length}`,
    );

    return {
      success: true,
      campaignType: "re_enrollment",
      discountPercentage: discountPercentage || 40,
      includeSupport: includeSupport !== false,
      deadlineDays: deadlineDays || 30,
      totalEligible: repeatEvaluations.length,
      actionsCreated: actions.length,
      skippedCount: skipped.length,
      actions,
      skipped,
      estimatedRetentionRate: 50, // تقدير معدل الاحتفاظ
      nextSteps: [
        "send_personalized_messages",
        "offer_support_sessions",
        "track_acceptances",
        "schedule_re_enrollment",
      ],
    };
  } catch (error) {
    console.error(`❌ [Re-Enrollment Campaign] Error:`, error);
    throw error;
  }
}

// Helper: Generate re-enrollment message
function generateReEnrollmentMessage(
  evaluation,
  course,
  discountPercentage,
  deadlineDays,
  includeSupport,
) {
  const studentName =
    evaluation.studentId.personalInfo?.fullName || "طالبنا العزيز";
  const deadline = new Date(
    Date.now() + (deadlineDays || 30) * 24 * 60 * 60 * 1000,
  );

  let message = `🔄 ${studentName}، علشان تستفيد 100% من ${course.title}

بنقترح إعادة الكورس مع:`;

  if (includeSupport !== false) {
    message += `
✅ دعم شخصي (3 جلسات أسبوعياً)
✅ مراجعة جميع المشاريع والدروس
✅ متابعة مباشرة مع المدرب`;
  }

  message += `
✅ خصم ${discountPercentage || 40}% على إعادة الكورس

💰 **السعر بعد الخصم:** ${Math.round(course.price * (1 - (discountPercentage || 40) / 100))} ج.م فقط!
⏰ **العرض ساري حتى:** ${deadline.toLocaleDateString("ar-EG")}`;

  // إضافة نقاط الضweak
  const weakPoints = evaluation.weakPoints || [];
  if (weakPoints.length > 0) {
    const weakPointsAr = weakPoints.map((wp) => {
      const map = {
        understanding: "الفهم النظري",
        practice: "الممارسة العملية",
        attendance: "الحضور",
        participation: "المشاركة",
        homework: "الواجبات",
        projects: "المشاريع",
      };
      return map[wp] || wp;
    });

    message += `\n\n🎯 **هنركز معاك على:** ${weakPointsAr.join("، ")}`;
  }

  message += `

💪 **الهدف:** تكون مستعد 100% للمستوى القادم!
📞 **رد علينا علشان نحجز مكانك!**

*هذا العرض خاص بطلاب الإعادة فقط*

مع تحيات فريق Code School 💻✨`;

  return message;
}

// Helper: Send custom WhatsApp message
async function sendCustomWhatsAppMessage(data, userId) {
  try {
    console.log(
      `🤖 [Custom WhatsApp] Sending message to student: ${data.studentId}`,
    );

    const { studentId, whatsappNumber, message, metadata } = data;

    if (!studentId || !whatsappNumber || !message) {
      throw new Error("Missing required parameters");
    }

    // استخدام wapilotService
    const result = await wapilotService.sendAndLogMessage({
      studentId,
      phoneNumber: whatsappNumber,
      messageContent: message,
      messageType: "custom_upsell_offer",
      language: "ar",
      metadata: {
        ...metadata,
        createdBy: userId,
        createdByName: "Marketing User",
        automationType: "custom_message",
        timestamp: new Date(),
      },
    });

    return {
      success: result.success,
      messageId: result.messageId,
      studentId,
      whatsappNumber,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error(`❌ [Custom WhatsApp] Error:`, error);
    throw error;
  }
}
