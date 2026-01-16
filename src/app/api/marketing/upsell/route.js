import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import StudentEvaluation from "../../../models/StudentEvaluation";
import Student from "../../../models/Student";
import Group from "../../../models/Group";
import Course from "../../../models/Course";
import MarketingAction from "../../../models/MarketingAction";

export async function GET(req) {
  try {
    console.log("🎯 [Marketing Upsell API] Request received");

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);

    if (!user || (user.role !== "marketing" && user.role !== "admin")) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "month";
    const groupId = searchParams.get("groupId");
    const status = searchParams.get("status");
    const showOnlyReady = searchParams.get("showOnlyReady") === "true";

    // بناء استعلام الطلاب المؤهلين للترقية
    const upsellQuery = {
      isDeleted: false,
      "metadata.evaluatedAt": getDateFilter(timeframe),
      finalDecision: "pass",
    };

    if (groupId) {
      upsellQuery.groupId = groupId;
    }

    // جلب الطلاب المؤهلين للترقية
    const eligibleStudents = await getUpsellEligibleStudents(
      upsellQuery,
      showOnlyReady
    );

    // جلب إحصائيات الترقية
    const upsellStats = await getUpsellStats(timeframe);

    // جلب الحملات النشطة للترقية
    const activeCampaigns = await MarketingAction.find({
      actionType: "upsell",
      status: status || { $in: ["pending", "in_progress", "completed"] },
      createdAt: getDateFilter(timeframe),
    })
      .populate(
        "targetStudent",
        "personalInfo.fullName personalInfo.whatsappNumber"
      )
      .populate("targetGroup", "name code")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // جلب الكورسات المتاحة للترقية
    const availableCourses = await Course.find({
      isActive: true,
      level: { $in: ["intermediate", "advanced"] },
    })
      .select("title level price description")
      .lean();

    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        timeframe,
        filters: {
          groupId,
          status,
          showOnlyReady,
        },
        eligibleStudents,
        upsellStats,
        activeCampaigns,
        availableCourses,
        summary: {
          totalEligible: eligibleStudents.length,
          readyForUpsell: eligibleStudents.filter((s) => s.isReadyForUpsell)
            .length,
          pendingUpsell: upsellStats.pendingCount,
          completedUpsell: upsellStats.completedCount,
          conversionRate: upsellStats.conversionRate,
          estimatedRevenue: upsellStats.estimatedRevenue,
        },
      },
    };

    console.log(
      `✅ [Marketing Upsell] Returned ${eligibleStudents.length} eligible students`
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Marketing Upsell API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات الترقية",
        error: error.message,
        code: "UPSELL_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    console.log("🚀 [Marketing Upsell API] Creating upsell action");

    const user = await getUserFromRequest(req);

    if (!user || (user.role !== "marketing" && user.role !== "admin")) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالإنشاء",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();

    // التحقق من البيانات
    if (!body.studentId || !body.targetCourseId || !body.offerDetails) {
      return NextResponse.json(
        {
          success: false,
          message: "بيانات الطالب والعرض مطلوبة",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // التحقق من الطالب والتقييم
    const evaluation = await StudentEvaluation.findOne({
      studentId: body.studentId,
      isDeleted: false,
      finalDecision: "pass",
    })
      .populate(
        "studentId",
        "personalInfo.fullName personalInfo.whatsappNumber"
      )
      .populate("groupId", "name code courseId")
      .populate({
        path: "groupId",
        populate: {
          path: "courseId",
          select: "title level",
        },
      });

    if (!evaluation) {
      return NextResponse.json(
        {
          success: false,
          message: "الطالب غير مؤهل للترقية أو غير موجود",
          code: "STUDENT_NOT_ELIGIBLE",
        },
        { status: 404 }
      );
    }

    // التحقق من الكورس المستهدف
    const targetCourse = await Course.findById(body.targetCourseId);
    if (!targetCourse || !targetCourse.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "الكورس المستهدف غير متوفر",
          code: "COURSE_NOT_AVAILABLE",
        },
        { status: 404 }
      );
    }

    // إنشاء إجراء الترقية
    const upsellAction = await MarketingAction.create({
      actionType: "upsell",
      targetStudent: body.studentId,
      targetGroup: evaluation.groupId._id,
      evaluationId: evaluation._id,
      actionData: {
        currentCourse: evaluation.groupId.courseId?.title,
        targetCourse: targetCourse.title,
        currentLevel: evaluation.groupId.courseId?.level,
        targetLevel: targetCourse.level,
        discountPercentage: body.offerDetails.discountPercentage || 15,
        originalPrice: targetCourse.price,
        discountedPrice: calculateDiscountedPrice(
          targetCourse.price,
          body.offerDetails.discountPercentage
        ),
        deadline:
          body.offerDetails.deadline ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        customMessage: generateUpsellMessage(
          evaluation,
          targetCourse,
          body.offerDetails
        ),
        aiGenerated: true,
        generatedAt: new Date(),
      },
      communicationChannels: {
        whatsapp: true,
        email: evaluation.studentId.personalInfo?.email ? true : false,
        sms: false,
      },
      status: "pending",
      metadata: {
        createdBy: user.id,
        createdAt: new Date(),
        campaignType: "manual_upsell",
        priority: body.priority || "medium",
      },
    });

    console.log(
      `✅ [Marketing Upsell] Created upsell action: ${upsellAction._id}`
    );

    return NextResponse.json({
      success: true,
      message: "تم إنشاء إجراء الترقية بنجاح",
      action: upsellAction,
      nextStep: "سيتم إرسال العرض للطالب تلقائياً",
    });
  } catch (error) {
    console.error("❌ [Marketing Upsell API] Error creating upsell:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في إنشاء إجراء الترقية",
        error: error.message,
        code: "UPSELL_CREATION_ERROR",
      },
      { status: 500 }
    );
  }
}

// Helper: Get upsell eligible students
async function getUpsellEligibleStudents(query, showOnlyReady = false) {
  const evaluations = await StudentEvaluation.find(query)
    .populate(
      "studentId",
      "personalInfo.fullName personalInfo.whatsappNumber personalInfo.email enrollmentNumber"
    )
    .populate("groupId", "name code courseId")
    .populate({
      path: "groupId",
      populate: {
        path: "courseId",
        select: "title level price",
      },
    })
    .lean();

  const eligibleStudents = await Promise.all(
    evaluations.map(async (evaluation) => {
      const student = evaluation.studentId;
      const group = evaluation.groupId;
      const currentCourse = group.courseId;

      // حساب جاهزية الطالب للترقية
      const readinessScore = calculateUpsellReadiness(evaluation);
      const isReadyForUpsell = readinessScore >= 70;

      // إذا كان المطلوب فقط الجاهزين للترقية
      if (showOnlyReady && !isReadyForUpsell) {
        return null;
      }

      // جلب الكورسات المتاحة للترقية
      const availableCourses = await getAvailableUpsellCourses(
        currentCourse?.level
      );

      // التحقق من وجود إجراء ترقية سابق
      const existingUpsell = await MarketingAction.findOne({
        targetStudent: student._id,
        actionType: "upsell",
        status: { $in: ["pending", "in_progress"] },
      }).lean();

      return {
        studentId: student._id,
        studentName: student.personalInfo?.fullName,
        whatsappNumber: student.personalInfo?.whatsappNumber,
        email: student.personalInfo?.email,
        enrollmentNumber: student.enrollmentNumber,
        groupId: group._id,
        groupName: group.name,
        groupCode: group.code,
        currentCourseId: currentCourse?._id,
        currentCourseName: currentCourse?.title,
        currentCourseLevel: currentCourse?.level,
        evaluationId: evaluation._id,
        overallScore: evaluation.calculatedStats?.overallScore,
        finalDecision: evaluation.finalDecision,
        studentCategory: evaluation.marketing?.studentCategory,
        readinessScore,
        isReadyForUpsell,
        readinessFactors: getReadinessFactors(evaluation),
        availableCourses,
        hasExistingUpsell: !!existingUpsell,
        existingUpsellStatus: existingUpsell?.status,
        suggestedOffer: generateSuggestedOffer(
          evaluation,
          currentCourse,
          availableCourses
        ),
        estimatedConversionProbability: calculateConversionProbability(
          evaluation,
          readinessScore
        ),
      };
    })
  );

  // تصفية القيم null والعودة بالنتائج مرتبة
  return eligibleStudents
    .filter((student) => student !== null)
    .sort((a, b) => b.readinessScore - a.readinessScore);
}

// Helper: Calculate upsell readiness score
function calculateUpsellReadiness(evaluation) {
  let score = 0;

  // عامل: النتيجة العامة
  if (evaluation.calculatedStats?.overallScore >= 4.5) score += 40;
  else if (evaluation.calculatedStats?.overallScore >= 4.0) score += 30;
  else if (evaluation.calculatedStats?.overallScore >= 3.5) score += 20;
  else score += 10;

  // عامل: نقاط القوة
  const strengthCount = evaluation.strengths?.length || 0;
  score += strengthCount * 5;

  // عامل: فئة الطالب
  if (evaluation.marketing?.studentCategory === "star_student") score += 30;
  else if (evaluation.marketing?.studentCategory === "ready_for_next_level")
    score += 20;
  else if (evaluation.marketing?.studentCategory === "needs_support")
    score += 10;

  // عامل: نقاط الضعف
  const weakPointCount = evaluation.weakPoints?.length || 0;
  score -= weakPointCount * 5;

  return Math.max(0, Math.min(score, 100));
}

// Helper: Get readiness factors
function getReadinessFactors(evaluation) {
  const factors = [];

  if (evaluation.calculatedStats?.overallScore >= 4.0) {
    factors.push(`نتيجة ممتازة: ${evaluation.calculatedStats.overallScore}`);
  }

  if (evaluation.marketing?.studentCategory === "star_student") {
    factors.push("طالب متميز");
  }

  if (evaluation.strengths?.includes("fast_learner")) {
    factors.push("يتعلم بسرعة");
  }

  if (evaluation.strengths?.includes("hard_worker")) {
    factors.push("مجتهد");
  }

  if (evaluation.strengths?.includes("consistent")) {
    factors.push("منتظم");
  }

  if (evaluation.weakPoints?.length === 0) {
    factors.push("لا توجد نقاط ضعف");
  }

  return factors;
}

// Helper: Get available upsell courses
async function getAvailableUpsellCourses(currentLevel) {
  const nextLevels = {
    beginner: "intermediate",
    intermediate: "advanced",
  };

  const targetLevel = nextLevels[currentLevel];

  if (!targetLevel) {
    return [];
  }

  return await Course.find({
    level: targetLevel,
    isActive: true,
  })
    .select("title description price level thumbnail")
    .limit(5)
    .lean();
}

// Helper: Generate suggested offer
function generateSuggestedOffer(evaluation, currentCourse, availableCourses) {
  if (availableCourses.length === 0) {
    return null;
  }

  const targetCourse = availableCourses[0]; // أول كورس متاح

  // حساب الخصم بناءً على الأداء
  let discountPercentage = 10; // خصم أساسي

  if (evaluation.calculatedStats?.overallScore >= 4.5) {
    discountPercentage = 20;
  } else if (evaluation.calculatedStats?.overallScore >= 4.0) {
    discountPercentage = 15;
  } else if (evaluation.calculatedStats?.overallScore >= 3.5) {
    discountPercentage = 10;
  }

  // سعر بعد الخصم
  const discountedPrice = targetCourse.price * (1 - discountPercentage / 100);

  return {
    targetCourseId: targetCourse._id,
    targetCourseName: targetCourse.title,
    targetCourseLevel: targetCourse.level,
    originalPrice: targetCourse.price,
    discountPercentage,
    discountedPrice: Math.round(discountedPrice),
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // أسبوع واحد
    message: `مبروك ${evaluation.studentId.personalInfo?.fullName}! أداؤك في ${currentCourse?.title} كان ممتازاً 🎉 نقدم لك ${targetCourse.title} بخصم ${discountPercentage}% خاص!`,
  };
}

// Helper: Calculate conversion probability
function calculateConversionProbability(evaluation, readinessScore) {
  let probability = readinessScore; // نقطة بداية

  // تعديل بناءً على عوامل إضافية
  if (evaluation.marketing?.studentCategory === "star_student") {
    probability += 10;
  }

  if (evaluation.strengths?.includes("fast_learner")) {
    probability += 5;
  }

  if (evaluation.weakPoints?.length > 0) {
    probability -= evaluation.weakPoints.length * 3;
  }

  return Math.max(0, Math.min(probability, 95));
}

// Helper: Get upsell statistics
async function getUpsellStats(timeframe) {
  const dateFilter = getDateFilter(timeframe);

  const stats = await MarketingAction.aggregate([
    {
      $match: {
        actionType: "upsell",
        createdAt: dateFilter,
      },
    },
    {
      $facet: {
        // حسب الحالة
        byStatus: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalRevenue: {
                $sum: {
                  $cond: [
                    { $eq: ["$status", "completed"] },
                    { $ifNull: ["$actionData.discountedPrice", 0] },
                    0,
                  ],
                },
              },
            },
          },
        ],

        // معدل التحويل
        conversionStats: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
              },
              pending: {
                $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
              },
              inProgress: {
                $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
              },
            },
          },
        ],

        // الإيرادات
        revenueStats: [
          {
            $match: {
              status: "completed",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$createdAt" },
              },
              count: { $sum: 1 },
              revenue: {
                $sum: { $ifNull: ["$actionData.discountedPrice", 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  const totals = stats[0]?.conversionStats[0] || {};
  const total = totals.total || 0;
  const completed = totals.completed || 0;
  const conversionRate =
    total > 0 ? parseFloat(((completed / total) * 100).toFixed(2)) : 0;

  // تقدير الإيرادات المتوقعة
  const pending = totals.pending || 0;
  const avgRevenuePerConversion = await getAverageUpsellRevenue();
  const estimatedRevenue = Math.round(
    pending * (conversionRate / 100) * avgRevenuePerConversion
  );

  return {
    totalCount: total,
    completedCount: completed,
    pendingCount: totals.pending || 0,
    inProgressCount: totals.inProgress || 0,
    conversionRate,
    totalRevenue:
      stats[0]?.byStatus.reduce(
        (sum, item) => sum + (item.totalRevenue || 0),
        0
      ) || 0,
    estimatedRevenue,
    byStatus: stats[0]?.byStatus || [],
    revenueTrend: stats[0]?.revenueStats || [],
  };
}

// Helper: Get average upsell revenue
async function getAverageUpsellRevenue() {
  const result = await MarketingAction.aggregate([
    {
      $match: {
        actionType: "upsell",
        status: "completed",
        "actionData.discountedPrice": { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        avgRevenue: { $avg: "$actionData.discountedPrice" },
      },
    },
  ]);

  return result[0]?.avgRevenue || 1000; // قيمة افتراضية
}

// Helper: Calculate discounted price
function calculateDiscountedPrice(originalPrice, discountPercentage) {
  return Math.round(originalPrice * (1 - (discountPercentage || 0) / 100));
}

// Helper: Generate upsell message
function generateUpsellMessage(evaluation, targetCourse, offerDetails) {
  const studentName =
    evaluation.studentId.personalInfo?.fullName || "طالبنا العزيز";
  const currentCourse = evaluation.groupId.courseId?.title || "الكورس الحالي";

  return `🎉 مبروك ${studentName}!

أداؤك في ${currentCourse} كان ممتازاً وظهرت موهبتك بوضوح! 🏆

بناءً على أدائك المتميز، نقدم لك فرصة خاصة للتسجيل في:
**${targetCourse.title}**

🎯 **العرض الخاص:**
• سعر الكورس: ${targetCourse.price} ج.م
• الخصم الخاص: ${offerDetails.discountPercentage || 15}%
• السعر بعد الخصم: ${calculateDiscountedPrice(
    targetCourse.price,
    offerDetails.discountPercentage
  )} ج.م فقط!
• العرض ساري حتى: ${new Date(
    offerDetails.deadline || Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toLocaleDateString("ar-EG")}

🚀 **مميزات المستوى المتقدم:**
• مشاريع واقعية
• تدريب عملي مكثف
• شهادة معتمدة
• فرص عمل مميزة

📞 للاستفادة من العرض، رد على هذه الرسالة بكلمة "نعم" أو اتصل بنا مباشرة.

مع تحيات فريق Code School 💻✨`;
}

// Helper function for date filtering
function getDateFilter(timeframe) {
  const now = new Date();
  let startDate;

  switch (timeframe) {
    case "day":
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "quarter":
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  return { $gte: startDate };
}
