// app/api/marketing/all-students/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import StudentEvaluation from "../../../models/StudentEvaluation";
import Student from "../../../models/Student";
import Group from "../../../models/Group";
import Course from "../../../models/Course";
import Session from "../../../models/Session";
import MarketingAction from "../../../models/MarketingAction";

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

// Helper: Get attendance data for a student
async function getAttendanceData(studentId, groupId) {
  try {
    const sessions = await Session.find({
      groupId,
      isDeleted: false,
      status: { $in: ["completed", "scheduled"] },
    }).lean();

    if (sessions.length === 0) {
      return {
        attendancePercentage: 0,
        completedSessions: 0,
        totalSessions: 0,
        lastSessionDate: null,
        daysSinceLastSession: null,
      };
    }

    const completedSessions = sessions.filter(s => s.status === "completed");
    const attendanceRecords = completedSessions.flatMap(
      (session) =>
        session.attendance?.filter(
          (att) => att.studentId.toString() === studentId.toString()
        ) || []
    );

    const presentCount = attendanceRecords.filter(
      (att) => att.status === "present"
    ).length;
    const attendancePercentage =
      completedSessions.length > 0
        ? Math.round((presentCount / completedSessions.length) * 100)
        : 0;

    // آخر سيشن
    const lastSession = sessions.sort(
      (a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate)
    )[0];

    return {
      attendancePercentage,
      completedSessions: presentCount,
      totalSessions: completedSessions.length,
      lastSessionDate: lastSession?.scheduledDate,
      daysSinceLastSession: lastSession
        ? Math.floor(
            (new Date() - new Date(lastSession.scheduledDate)) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    };
  } catch (error) {
    console.error("❌ Error getting attendance data:", error);
    return {
      attendancePercentage: 0,
      completedSessions: 0,
      totalSessions: 0,
      lastSessionDate: null,
      daysSinceLastSession: null,
    };
  }
}

// Helper: Get available courses based on student category
async function getAvailableCourses(currentLevel, finalDecision, studentCategory) {
  try {
    // للطلاب المتميزين والجاهزين للترقية: كورسات المستوى الأعلى
    if (studentCategory === "star_student" || studentCategory === "ready_for_next_level") {
      const nextLevels = {
        beginner: "intermediate",
        intermediate: "advanced",
        advanced: "advanced" // للطلاب المتقدمين، نقدم دورات متقدمة أخرى
      };

      const targetLevel = nextLevels[currentLevel] || "intermediate";
      return await Course.find({
        level: targetLevel,
        isActive: true,
      })
        .select("_id title level price description thumbnail")
        .limit(5)
        .lean();
    }

    // للطلاب الذين يحتاجون إعادة: نفس الكورس الحالي أو كورسات دعم
    if (finalDecision === "repeat" || studentCategory === "needs_repeat") {
      // جلب نفس الكورس الحالي إذا كان نشطاً
      const sameCourse = await Course.find({
        isActive: true,
        level: currentLevel,
      })
        .select("_id title level price description thumbnail")
        .limit(3)
        .lean();

      // جلب كورسات دعم أو مراجعة
      const supportCourses = await Course.find({
        isActive: true,
        $or: [
          { title: { $regex: "مراجعة|دعم|مكثف|متقدم", $options: "i" } },
          { description: { $regex: "مراجعة|دعم|مكثف", $options: "i" } }
        ]
      })
        .select("_id title level price description thumbnail")
        .limit(2)
        .lean();

      return [...sameCourse, ...supportCourses].slice(0, 5);
    }

    // للطلاب الذين يحتاجون دعم: كورسات دعم وجلسات علاجية
    if (studentCategory === "needs_support" || finalDecision === "review") {
      return await Course.find({
        isActive: true,
        $or: [
          { title: { $regex: "دعم|مراجعة|علاجي|مكثف", $options: "i" } },
          { description: { $regex: "دعم|مراجعة|علاجي|مكثف", $options: "i" } },
          { level: currentLevel } // كورسات بنفس المستوى
        ]
      })
        .select("_id title level price description thumbnail")
        .limit(5)
        .lean();
    }

    // للطلاب المعرضين للخطر: أي كورسات نشطة
    if (studentCategory === "at_risk") {
      return await Course.find({
        isActive: true,
        $or: [
          { level: currentLevel },
          { level: "beginner" }, // كورسات للمبتدئين كبداية جديدة
          { title: { $regex: "أساسيات|مبتدئ|تمهيدي", $options: "i" } }
        ]
      })
        .select("_id title level price description thumbnail")
        .limit(5)
        .lean();
    }

    // بشكل افتراضي: كورسات المستوى الحالي
    return await Course.find({
      level: currentLevel,
      isActive: true,
    })
      .select("_id title level price description thumbnail")
      .limit(5)
      .lean();
  } catch (error) {
    console.error("❌ Error getting available courses:", error);
    return [];
  }
}

// Helper: Generate suggested offer based on student category
function generateSuggestedOffer(evaluation, currentCourse, availableCourses) {
  if (availableCourses.length === 0 || !currentCourse) {
    return null;
  }

  const studentCategory = evaluation.marketing?.studentCategory || "needs_support";
  const finalDecision = evaluation.finalDecision;
  const overallScore = evaluation.calculatedStats?.overallScore || 3;

  // تحديد الكورس المستهدف
  let targetCourse = availableCourses[0];

  // إذا كان الطالب متميزاً أو جاهزاً للترقية، اختر كورس المستوى الأعلى
  if (studentCategory === "star_student" || studentCategory === "ready_for_next_level") {
    const advancedCourse = availableCourses.find(c => 
      c.level === "advanced" || c.level === "intermediate"
    );
    if (advancedCourse) targetCourse = advancedCourse;
  }

  // تحديد نسبة الخصم بناءً على فئة الطالب والنتيجة
  let discountPercentage = 10; // خصم أساسي

  switch (studentCategory) {
    case "star_student":
      discountPercentage = overallScore >= 4.5 ? 25 : 20;
      break;
    
    case "ready_for_next_level":
      discountPercentage = overallScore >= 4.0 ? 18 : 15;
      break;
    
    case "needs_support":
      discountPercentage = 20;
      break;
    
    case "needs_repeat":
      discountPercentage = 40;
      break;
    
    case "at_risk":
      discountPercentage = 50;
      break;
    
    default:
      discountPercentage = 15;
  }

  // تعديل الخصم بناءً على القرار النهائي
  if (finalDecision === "repeat") {
    discountPercentage = Math.max(discountPercentage, 40);
  } else if (finalDecision === "review") {
    discountPercentage = Math.max(discountPercentage, 25);
  }

  // حساب السعر بعد الخصم
  const discountedPrice = Math.round(targetCourse.price * (1 - discountPercentage / 100));

  // تحديد نوع العرض
  let offerType = "standard";
  switch (studentCategory) {
    case "star_student":
      offerType = "premium_upsell";
      break;
    case "ready_for_next_level":
      offerType = "level_upgrade";
      break;
    case "needs_support":
      offerType = "support_package";
      break;
    case "needs_repeat":
      offerType = "repeat_with_support";
      break;
    case "at_risk":
      offerType = "retention_offer";
      break;
  }

  return {
    targetCourseId: targetCourse._id,
    targetCourseName: targetCourse.title,
    targetCourseLevel: targetCourse.level,
    originalPrice: targetCourse.price,
    discountPercentage,
    discountedPrice,
    offerType,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // أسبوع واحد
  };
}

// Helper: Calculate conversion probability
function calculateConversionProbability(evaluation, attendanceData) {
  let probability = 50; // احتمال أساسي

  // عامل: النتيجة العامة
  const overallScore = evaluation.calculatedStats?.overallScore || 3;
  if (overallScore >= 4.5) probability += 25;
  else if (overallScore >= 4.0) probability += 15;
  else if (overallScore >= 3.5) probability += 5;
  else if (overallScore <= 2.5) probability -= 20;

  // عامل: فئة الطالب
  const studentCategory = evaluation.marketing?.studentCategory;
  switch (studentCategory) {
    case "star_student":
      probability += 30;
      break;
    case "ready_for_next_level":
      probability += 20;
      break;
    case "needs_support":
      probability += 5;
      break;
    case "needs_repeat":
      probability -= 10;
      break;
    case "at_risk":
      probability -= 25;
      break;
  }

  // عامل: القرار النهائي
  switch (evaluation.finalDecision) {
    case "pass":
      probability += 15;
      break;
    case "review":
      probability += 0;
      break;
    case "repeat":
      probability -= 15;
      break;
  }

  // عامل: نسبة الحضور
  if (attendanceData.attendancePercentage >= 90) probability += 10;
  else if (attendanceData.attendancePercentage >= 80) probability += 5;
  else if (attendanceData.attendancePercentage <= 60) probability -= 10;

  // عامل: نقاط الضعف
  const weakPointCount = evaluation.weakPoints?.length || 0;
  probability -= weakPointCount * 3;

  // عامل: نقاط القوة
  const strengthCount = evaluation.strengths?.length || 0;
  probability += strengthCount * 2;

  // التأكد من أن الاحتمال بين 5% و 95%
  return Math.max(5, Math.min(95, probability));
}

// Helper: Get marketing statistics
async function getMarketingStats(timeframe) {
  try {
    const dateFilter = getDateFilter(timeframe);

    // إحصائيات الطلاب حسب التصنيف
    const evaluations = await StudentEvaluation.aggregate([
      {
        $match: {
          "metadata.evaluatedAt": dateFilter,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$marketing.studentCategory",
          count: { $sum: 1 },
          avgScore: { $avg: "$calculatedStats.overallScore" },
          passCount: { $sum: { $cond: [{ $eq: ["$finalDecision", "pass"] }, 1, 0] } },
          reviewCount: { $sum: { $cond: [{ $eq: ["$finalDecision", "review"] }, 1, 0] } },
          repeatCount: { $sum: { $cond: [{ $eq: ["$finalDecision", "repeat"] }, 1, 0] } },
        },
      },
    ]);

    // تحويل النتائج إلى تنسيق سهل
    const categoryStats = {
      star_student: { count: 0, avgScore: 0 },
      ready_for_next_level: { count: 0, avgScore: 0 },
      needs_support: { count: 0, avgScore: 0 },
      needs_repeat: { count: 0, avgScore: 0 },
      at_risk: { count: 0, avgScore: 0 },
    };

    evaluations.forEach(stat => {
      const category = stat._id || "needs_support";
      if (categoryStats[category]) {
        categoryStats[category].count = stat.count;
        categoryStats[category].avgScore = stat.avgScore ? parseFloat(stat.avgScore.toFixed(2)) : 0;
      }
    });

    // إجمالي الطلاب
    const totalStudents = Object.values(categoryStats).reduce((sum, stat) => sum + stat.count, 0);

    // إحصائيات العروض
    const offerStats = await MarketingAction.aggregate([
      {
        $match: {
          createdAt: dateFilter,
          actionType: { $in: ["upsell", "support", "re_enroll"] },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalOffers: { $sum: 1 },
          completedOffers: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          totalRevenue: { $sum: { $ifNull: ["$actionData.discountedPrice", 0] } },
          conversionRate: {
            $avg: {
              $cond: [
                { $eq: ["$status", "completed"] },
                100,
                0
              ]
            }
          },
        },
      },
    ]);

    const offers = offerStats[0] || {
      totalOffers: 0,
      completedOffers: 0,
      totalRevenue: 0,
      conversionRate: 0,
    };

    // إحصائيات القرارات النهائية
    const decisionStats = await StudentEvaluation.aggregate([
      {
        $match: {
          "metadata.evaluatedAt": dateFilter,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$finalDecision",
          count: { $sum: 1 },
        },
      },
    ]);

    const decisions = {
      pass: decisionStats.find(d => d._id === "pass")?.count || 0,
      review: decisionStats.find(d => d._id === "review")?.count || 0,
      repeat: decisionStats.find(d => d._id === "repeat")?.count || 0,
    };

    return {
      totalStudents,
      starStudents: categoryStats.star_student.count,
      readyForNextLevel: categoryStats.ready_for_next_level.count,
      needsSupport: categoryStats.needs_support.count,
      needsRepeat: categoryStats.needs_repeat.count,
      atRisk: categoryStats.at_risk.count,
      totalOffersMade: offers.totalOffers,
      completedOffers: offers.completedOffers,
      conversionRate: offers.conversionRate ? parseFloat(offers.conversionRate.toFixed(2)) : 0,
      estimatedRevenue: offers.totalRevenue,
      decisions,
      categoryAverages: {
        star_student: categoryStats.star_student.avgScore,
        ready_for_next_level: categoryStats.ready_for_next_level.avgScore,
        needs_support: categoryStats.needs_support.avgScore,
        needs_repeat: categoryStats.needs_repeat.avgScore,
        at_risk: categoryStats.at_risk.avgScore,
      },
    };
  } catch (error) {
    console.error("❌ Error getting marketing stats:", error);
    return {
      totalStudents: 0,
      starStudents: 0,
      readyForNextLevel: 0,
      needsSupport: 0,
      needsRepeat: 0,
      atRisk: 0,
      totalOffersMade: 0,
      completedOffers: 0,
      conversionRate: 0,
      estimatedRevenue: 0,
      decisions: { pass: 0, review: 0, repeat: 0 },
      categoryAverages: {
        star_student: 0,
        ready_for_next_level: 0,
        needs_support: 0,
        needs_repeat: 0,
        at_risk: 0,
      },
    };
  }
}

// Helper: Get student progress data
async function getStudentProgress(studentId, groupId) {
  try {
    // جلب آخر إجراء تسويقي للطالب
    const lastAction = await MarketingAction.findOne({
      targetStudent: studentId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .select("status createdAt results.conversion")
      .lean();

    // جلب عدد العروض السابقة
    const totalOffers = await MarketingAction.countDocuments({
      targetStudent: studentId,
      isDeleted: false,
    });

    // جلب آخر تفاعل
    const lastResponse = await MarketingAction.findOne({
      targetStudent: studentId,
      "results.responseReceived": true,
      isDeleted: false,
    })
      .sort({ "results.responseAt": -1 })
      .select("results.response results.responseAt")
      .lean();

    return {
      lastOfferStatus: lastAction?.status || "none",
      lastOfferDate: lastAction?.createdAt,
      totalOffers,
      lastResponse: lastResponse?.results?.response,
      lastResponseDate: lastResponse?.results?.responseAt,
      hasConverted: lastAction?.results?.conversion || false,
    };
  } catch (error) {
    console.error("❌ Error getting student progress:", error);
    return {
      lastOfferStatus: "none",
      lastOfferDate: null,
      totalOffers: 0,
      lastResponse: null,
      lastResponseDate: null,
      hasConverted: false,
    };
  }
}

// Main GET function
export async function GET(req) {
  try {
    console.log("📊 [Marketing All Students API] Request received");

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
    const categoryFilter = searchParams.get("category");
    const decisionFilter = searchParams.get("decision");
    const levelFilter = searchParams.get("level");

    // بناء استعلام التقييمات
    const evaluationQuery = {
      isDeleted: false,
      "metadata.evaluatedAt": getDateFilter(timeframe),
    };

    if (groupId) {
      evaluationQuery.groupId = groupId;
    }

    if (categoryFilter && categoryFilter !== "all") {
      evaluationQuery["marketing.studentCategory"] = categoryFilter;
    }

    if (decisionFilter && decisionFilter !== "all") {
      evaluationQuery.finalDecision = decisionFilter;
    }

    // جلب جميع التقييمات
    const evaluations = await StudentEvaluation.find(evaluationQuery)
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

    console.log(`📊 Found ${evaluations.length} evaluations`);

    // معالجة بيانات الطلاب
    const studentsData = await Promise.all(
      evaluations.map(async (evaluation) => {
        const student = evaluation.studentId;
        const group = evaluation.groupId;
        const course = group?.courseId;

        // تخطي الطلاب الذين لا يوجد لديهم بيانات كافية
        if (!student || !group || !course) {
          return null;
        }

        // جلب بيانات الحضور
        const attendanceData = await getAttendanceData(student._id, group._id);

        // جلب الكورسات المتاحة
        const availableCourses = await getAvailableCourses(
          course.level,
          evaluation.finalDecision,
          evaluation.marketing?.studentCategory
        );

        // إنشاء عرض مقترح
        const suggestedOffer = generateSuggestedOffer(
          evaluation,
          course,
          availableCourses
        );

        // حساب احتمالية التحويل
        const conversionProbability = calculateConversionProbability(evaluation, attendanceData);

        // جلب تقدم الطالب التسويقي
        const progressData = await getStudentProgress(student._id, group._id);

        return {
          studentId: student._id.toString(),
          studentName: student.personalInfo?.fullName || "طالب",
          whatsappNumber: student.personalInfo?.whatsappNumber || "",
          email: student.personalInfo?.email || "",
          enrollmentNumber: student.enrollmentNumber || "",
          currentCourseName: course.title,
          currentCourseLevel: course.level,
          overallScore: evaluation.calculatedStats?.overallScore || 0,
          studentCategory: evaluation.marketing?.studentCategory || "needs_support",
          finalDecision: evaluation.finalDecision,
          groupName: group.name,
          groupCode: group.code,
          attendancePercentage: attendanceData.attendancePercentage,
          weakPoints: evaluation.weakPoints || [],
          strengths: evaluation.strengths || [],
          availableCourses,
          suggestedOffer,
          estimatedConversionProbability: conversionProbability,
          progress: progressData,
          aiAnalysis: evaluation.marketing?.aiAnalysis,
          notes: evaluation.notes,
          evaluatedAt: evaluation.metadata?.evaluatedAt,
        };
      })
    );

    // تصفية القيم null
    const validStudents = studentsData.filter(student => student !== null);

    // جلب الإحصائيات
    const stats = await getMarketingStats(timeframe);

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
          applied: {
            groupId,
            category: categoryFilter,
            decision: decisionFilter,
            level: levelFilter,
          },
          available: {
            groups: await getAvailableGroups(),
            categories: [
              { value: "all", label: "كل التصنيفات" },
              { value: "star_student", label: "طلاب متميزون" },
              { value: "ready_for_next_level", label: "جاهز للمستوى التالي" },
              { value: "needs_support", label: "يحتاج دعم" },
              { value: "needs_repeat", label: "يحتاج إعادة" },
              { value: "at_risk", label: "معرض للخطر" },
            ],
            decisions: [
              { value: "all", label: "كل القرارات" },
              { value: "pass", label: "ناجح" },
              { value: "review", label: "مراجعة" },
              { value: "repeat", label: "إعادة" },
            ],
            levels: [
              { value: "all", label: "كل المستويات" },
              { value: "beginner", label: "مبتدئ" },
              { value: "intermediate", label: "متوسط" },
              { value: "advanced", label: "متقدم" },
            ],
          },
        },
        students: validStudents,
        stats,
        summary: {
          totalStudents: validStudents.length,
          starStudents: validStudents.filter(s => s.studentCategory === "star_student").length,
          readyForNextLevel: validStudents.filter(s => s.studentCategory === "ready_for_next_level").length,
          needsSupport: validStudents.filter(s => s.studentCategory === "needs_support").length,
          needsRepeat: validStudents.filter(s => s.studentCategory === "needs_repeat").length,
          atRisk: validStudents.filter(s => s.studentCategory === "at_risk").length,
          averageScore: validStudents.length > 0 
            ? parseFloat((validStudents.reduce((sum, s) => sum + s.overallScore, 0) / validStudents.length).toFixed(2))
            : 0,
          averageConversionProbability: validStudents.length > 0
            ? parseFloat((validStudents.reduce((sum, s) => sum + s.estimatedConversionProbability, 0) / validStudents.length).toFixed(2))
            : 0,
        },
      },
    };

    console.log(
      `✅ [Marketing All Students] Returned ${validStudents.length} students`
    );
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Marketing All Students API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات جميع الطلاب",
        error: error.message,
        code: "ALL_STUDENTS_ERROR",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Helper: Get available groups for filtering
async function getAvailableGroups() {
  try {
    const groups = await Group.find({
      isDeleted: false,
      status: { $in: ["active", "completed"] },
    })
      .select("_id name code")
      .sort({ name: 1 })
      .limit(50)
      .lean();

    return [
      { value: "all", label: "كل المجموعات" },
      ...groups.map(group => ({
        value: group._id.toString(),
        label: `${group.name} (${group.code})`,
      })),
    ];
  } catch (error) {
    console.error("❌ Error getting available groups:", error);
    return [{ value: "all", label: "كل المجموعات" }];
  }
}

// POST function for creating offers
export async function POST(req) {
  try {
    console.log("🚀 [Marketing All Students] Creating offer");

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

    // جلب بيانات الطالب والتقييم
    const evaluation = await StudentEvaluation.findOne({
      studentId: body.studentId,
      isDeleted: false,
    })
      .populate(
        "studentId",
        "personalInfo.fullName personalInfo.whatsappNumber personalInfo.email"
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

    if (!evaluation) {
      return NextResponse.json(
        {
          success: false,
          message: "الطالب غير موجود أو لم يتم تقييمه",
          code: "STUDENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // جلب الكورس المستهدف
    const targetCourse = await Course.findById(body.targetCourseId).lean();
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

    // تحديد نوع الإجراء بناءً على فئة الطالب
    let actionType = "upsell";
    switch (body.studentCategory) {
      case "needs_support":
        actionType = "support";
        break;
      case "needs_repeat":
      case "at_risk":
        actionType = "re_enroll";
        break;
      default:
        actionType = "upsell";
    }

    // حساب السعر بعد الخصم
    const discountPercentage = body.offerDetails.discountPercentage || 15;
    const discountedPrice = Math.round(
      targetCourse.price * (1 - discountPercentage / 100)
    );

    // إنشاء إجراء التسويق
    const marketingAction = await MarketingAction.create({
      actionType,
      targetStudent: body.studentId,
      targetGroup: evaluation.groupId?._id,
      evaluationId: evaluation._id,
      actionData: {
        currentCourse: evaluation.groupId?.courseId?.title,
        targetCourse: targetCourse.title,
        currentLevel: evaluation.groupId?.courseId?.level,
        targetLevel: targetCourse.level,
        discountPercentage,
        originalPrice: targetCourse.price,
        discountedPrice,
        deadline: body.offerDetails.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        customMessage: body.offerDetails.message,
        offerType: body.offerType || "manual",
        studentCategory: body.studentCategory,
        finalDecision: evaluation.finalDecision,
        aiGenerated: false,
        generatedAt: new Date(),
      },
      communicationChannels: {
        whatsapp: true,
        email: evaluation.studentId?.personalInfo?.email ? true : false,
        sms: false,
      },
      status: "pending",
      results: {
        messageSent: false,
        responseReceived: false,
        conversion: false,
      },
      metadata: {
        createdBy: user.id,
        createdAt: new Date(),
        campaignType: "all_students_manual",
        priority: body.priority || "medium",
      },
    });

    console.log(
      `✅ [Marketing All Students] Created marketing action: ${marketingAction._id}`
    );

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الإجراء التسويقي بنجاح",
      action: marketingAction,
      nextStep: "يجب إرسال الرسالة عبر WhatsApp",
    });
  } catch (error) {
    console.error("❌ [Marketing All Students] Error creating offer:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في إنشاء الإجراء التسويقي",
        error: error.message,
        code: "OFFER_CREATION_ERROR",
      },
      { status: 500 }
    );
  }
}