import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import MarketingCampaign from "../../../models/MarketingCampaign";
import MarketingAction from "../../../models/MarketingAction";
import StudentEvaluation from "../../../models/StudentEvaluation";
import Student from "../../../models/Student";
import Group from "../../../models/Group";
import Course from "../../../models/Course";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    console.log("🎯 [Marketing Campaigns API] Request received");

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);
    
    if (!user || (user.role !== "marketing" && user.role !== "admin")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالوصول",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "month";
    const campaignType = searchParams.get("campaignType");
    const status = searchParams.get("status");
    const createdBy = searchParams.get("createdBy");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // بناء الاستعلام
    const query = {
      isDeleted: false
    };

    if (campaignType) {
      query.campaignType = campaignType;
    }

    if (status) {
      query.status = status;
    }

    if (createdBy) {
      query["metadata.createdBy"] = createdBy;
    }

    // فلترة التاريخ
    if (timeframe !== "all") {
      const dateFilter = getDateFilter(timeframe);
      query["metadata.createdAt"] = dateFilter;
    }

    // الترتيب
    const sort = {};
    if (sortBy === "performance") {
      sort["stats.conversionRate"] = sortOrder === "desc" ? -1 : 1;
    } else if (sortBy === "revenue") {
      sort["stats.totalRevenue"] = sortOrder === "desc" ? -1 : 1;
    } else if (sortBy === "targets") {
      sort["stats.totalTargets"] = sortOrder === "desc" ? -1 : 1;
    } else {
      sort["metadata.createdAt"] = sortOrder === "desc" ? -1 : 1;
    }

    // جلب إحصائيات الحملات
    const campaignStats = await getCampaignStats(timeframe);
    
    // جلب الحملات
    const totalCampaigns = await MarketingCampaign.countDocuments(query);
    const campaigns = await MarketingCampaign.find(query)
      .populate("metadata.createdBy", "name email")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // إضافة إحصائيات مفصلة لكل حملة
    const campaignsWithDetails = await Promise.all(
      campaigns.map(async (campaign) => {
        const campaignActions = await MarketingAction.countDocuments({
          $or: [
            { "metadata.campaignId": campaign._id },
            { evaluationId: { $in: await getEvaluationIdsForCampaign(campaign) } }
          ]
        });
        
        const campaignRevenue = await calculateCampaignRevenue(campaign._id);
        const campaignConversions = await MarketingAction.countDocuments({
          $or: [
            { "metadata.campaignId": campaign._id },
            { evaluationId: { $in: await getEvaluationIdsForCampaign(campaign) } }
          ],
          status: "completed"
        });

        return {
          ...campaign,
          detailedStats: {
            totalActions: campaignActions,
            totalRevenue: campaignRevenue,
            conversions: campaignConversions,
            conversionRate: campaignActions > 0 ? 
              parseFloat(((campaignConversions / campaignActions) * 100).toFixed(2)) : 0,
            costPerAction: campaign.stats?.totalTargets > 0 ? 
              parseFloat((campaignRevenue / campaign.stats.totalTargets).toFixed(2)) : 0,
            roi: campaignRevenue > 0 ? 
              parseFloat(((campaignRevenue / (campaignRevenue * 0.1)) * 100).toFixed(2)) : 0 // افتراضي 10% تكلفة
          },
          performanceScore: calculateCampaignPerformanceScore(campaign, campaignActions, campaignConversions, campaignRevenue),
          daysSinceStart: campaign.stats?.startDate ? 
            Math.floor((new Date() - new Date(campaign.stats.startDate)) / (1000 * 60 * 60 * 24)) : 0,
          remainingDays: campaign.stats?.endDate ? 
            Math.max(0, Math.floor((new Date(campaign.stats.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : null
        };
      })
    );

    // الحملات الأفضل أداءً
    const topPerformingCampaigns = [...campaignsWithDetails]
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5);

    // الحملات التي تحتاج انتباه
    const campaignsNeedingAttention = campaignsWithDetails.filter(campaign => {
      if (campaign.status !== 'active') return false;
      
      // إذا كانت نسبة التحويل أقل من 10%
      if (campaign.detailedStats.conversionRate < 10) return true;
      
      // إذا كانت الحملة نشطة منذ أكثر من 7 أيام وعدد الإجراءات قليل
      if (campaign.daysSinceStart > 7 && campaign.detailedStats.totalActions < 10) return true;
      
      return false;
    });

    // تحليل الحملات حسب النوع
    const campaignsByType = await analyzeCampaignsByType(timeframe);

    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        timeframe,
        filters: {
          campaignType,
          status,
          createdBy,
          page,
          limit,
          sortBy,
          sortOrder
        },
        pagination: {
          page,
          limit,
          total: totalCampaigns,
          totalPages: Math.ceil(totalCampaigns / limit)
        },
        campaignStats,
        campaigns: campaignsWithDetails,
        topPerformingCampaigns,
        campaignsNeedingAttention,
        campaignsByType,
        summary: {
          totalCampaigns,
          activeCampaigns: campaignStats.activeCampaigns,
          totalRevenue: campaignStats.totalRevenue,
          totalConversions: campaignStats.totalConversions,
          overallConversionRate: campaignStats.overallConversionRate,
          avgCostPerAction: campaignStats.avgCostPerAction,
          avgROI: campaignStats.avgROI
        }
      }
    };

    console.log(`✅ [Marketing Campaigns] Returned ${campaigns.length} campaigns`);
    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ [Marketing Campaigns API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات الحملات",
        error: error.message,
        code: "CAMPAIGNS_ERROR"
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    console.log("📝 [Marketing Campaigns API] Creating new campaign");

    const user = await getUserFromRequest(req);
    
    if (!user || (user.role !== "marketing" && user.role !== "admin")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالإنشاء",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await req.json();
    
    // التحقق من البيانات
    if (!body.name || !body.campaignType || !body.automationRules?.trigger) {
      return NextResponse.json(
        {
          success: false,
          message: "اسم الحملة، نوعها، ومشغل الأتمتة مطلوبون",
          code: "VALIDATION_ERROR"
        },
        { status: 400 }
      );
    }

    // حساب الأهداف
    const targetCount = await calculateTargetCount(body);
    
    // إنشاء الحملة
    const campaignData = {
      ...body,
      stats: {
        totalTargets: targetCount,
        messagesSent: 0,
        responsesReceived: 0,
        conversions: 0,
        conversionRate: 0,
        startDate: body.stats?.startDate || new Date(),
        endDate: body.stats?.endDate || null,
        totalRevenue: 0
      },
      status: body.status || "draft",
      metadata: {
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      }
    };

    const newCampaign = await MarketingCampaign.create(campaignData);

    // إذا كانت الحملة active، تنفيذها تلقائياً
    if (newCampaign.status === "active") {
      await executeCampaign(newCampaign._id, user.id);
    }

    console.log(`✅ [Marketing Campaigns] Created new campaign: ${newCampaign._id}`);
    
    return NextResponse.json({
      success: true,
      message: "تم إنشاء الحملة بنجاح",
      campaign: newCampaign,
      targetCount,
      nextSteps: newCampaign.status === "active" ? 
        "سيبدأ تنفيذ الحملة تلقائياً" : 
        "يمكنك تفعيل الحملة عندما تكون جاهزاً"
    });

  } catch (error) {
    console.error("❌ [Marketing Campaigns API] Error creating campaign:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في إنشاء الحملة",
        error: error.message,
        code: "CAMPAIGN_CREATION_ERROR"
      },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    console.log("🔄 [Marketing Campaigns API] Updating campaign");

    const user = await getUserFromRequest(req);
    
    if (!user || (user.role !== "marketing" && user.role !== "admin")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالتحديث",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const body = await req.json();

    if (!campaignId) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف الحملة مطلوب",
          code: "VALIDATION_ERROR"
        },
        { status: 400 }
      );
    }

    // البحث عن الحملة
    const campaign = await MarketingCampaign.findById(campaignId);
    
    if (!campaign || campaign.isDeleted) {
      return NextResponse.json(
        {
          success: false,
          message: "الحملة غير موجودة",
          code: "CAMPAIGN_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    // التحقق من حالة الحملة
    if (campaign.status === "completed" || campaign.status === "archived") {
      return NextResponse.json(
        {
          success: false,
          message: "لا يمكن تعديل الحملة المكتملة أو المؤرشفة",
          code: "CAMPAIGN_LOCKED"
        },
        { status: 400 }
      );
    }

    // تسجيل التعديلات
    const updates = {
      ...body,
      "metadata.updatedAt": new Date(),
      "metadata.lastModifiedBy": user.id,
      "metadata.version": (campaign.metadata?.version || 1) + 1
    };

    // إذا كانت الحملة يتم تفعيلها
    if (body.status === "active" && campaign.status !== "active") {
      updates.stats = {
        ...campaign.stats,
        startDate: new Date()
      };
    }

    // إذا كانت الحملة يتم إكمالها
    if (body.status === "completed" && campaign.status !== "completed") {
      updates.stats = {
        ...campaign.stats,
        endDate: new Date()
      };
    }

    const updatedCampaign = await MarketingCampaign.findByIdAndUpdate(
      campaignId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // إذا تم تفعيل الحملة، تنفيذها
    if (body.status === "active" && campaign.status !== "active") {
      await executeCampaign(campaignId, user.id);
    }

    console.log(`✅ [Marketing Campaigns] Updated campaign: ${campaignId}`);
    
    return NextResponse.json({
      success: true,
      message: "تم تحديث الحملة بنجاح",
      campaign: updatedCampaign,
      changes: Object.keys(body)
    });

  } catch (error) {
    console.error("❌ [Marketing Campaigns API] Error updating campaign:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحديث الحملة",
        error: error.message,
        code: "CAMPAIGN_UPDATE_ERROR"
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    console.log("🗑️ [Marketing Campaigns API] Deleting campaign");

    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { 
          success: false, 
          message: "غير مصرح بالحذف",
          code: "UNAUTHORIZED"
        },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const permanent = searchParams.get("permanent") === "true";

    if (!campaignId) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف الحملة مطلوب",
          code: "VALIDATION_ERROR"
        },
        { status: 400 }
      );
    }

    const campaign = await MarketingCampaign.findById(campaignId);
    
    if (!campaign) {
      return NextResponse.json(
        {
          success: false,
          message: "الحملة غير موجودة",
          code: "CAMPAIGN_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    if (permanent) {
      // حذف نهائي
      await MarketingCampaign.findByIdAndDelete(campaignId);
      console.log(`🗑️ [Marketing Campaigns] Permanently deleted campaign: ${campaignId}`);
      
      return NextResponse.json({
        success: true,
        message: "تم حذف الحملة نهائياً"
      });
    } else {
      // حذف ناعم
      await MarketingCampaign.findByIdAndUpdate(campaignId, {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: "archived",
          "metadata.deletedBy": user.id
        }
      });
      
      console.log(`🗑️ [Marketing Campaigns] Soft deleted campaign: ${campaignId}`);
      
      return NextResponse.json({
        success: true,
        message: "تم أرشفة الحملة بنجاح",
        canRestore: true,
        deletedAt: new Date()
      });
    }

  } catch (error) {
    console.error("❌ [Marketing Campaigns API] Error deleting campaign:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في حذف الحملة",
        error: error.message,
        code: "CAMPAIGN_DELETE_ERROR"
      },
      { status: 500 }
    );
  }
}

// Helper Functions

// حساب عدد الأهداف
async function calculateTargetCount(campaignData) {
  let count = 0;
  
  switch (campaignData.campaignType) {
    case "evaluation_followup":
      if (campaignData.targetCriteria?.evaluationDecisions) {
        const evaluations = await StudentEvaluation.countDocuments({
          finalDecision: { $in: campaignData.targetCriteria.evaluationDecisions },
          isDeleted: false
        });
        count = evaluations;
      }
      break;
      
    case "retention":
      if (campaignData.targetCriteria?.groups) {
        const students = await Student.countDocuments({
          "academicInfo.groupIds": { $in: campaignData.targetCriteria.groups },
          "enrollmentInfo.status": "Active",
          isDeleted: false
        });
        count = students;
      }
      break;
      
    case "upsell":
      if (campaignData.targetCriteria?.groups) {
        const evaluations = await StudentEvaluation.countDocuments({
          groupId: { $in: campaignData.targetCriteria.groups },
          finalDecision: "pass",
          isDeleted: false,
          "marketing.studentCategory": { $in: ["star_student", "ready_for_next_level"] }
        });
        count = evaluations;
      }
      break;
      
    case "re_enrollment":
      if (campaignData.targetCriteria?.groups) {
        const evaluations = await StudentEvaluation.countDocuments({
          groupId: { $in: campaignData.targetCriteria.groups },
          finalDecision: "repeat",
          isDeleted: false,
          "marketing.studentCategory": "needs_repeat"
        });
        count = evaluations;
      }
      break;
      
    case "referral":
      if (campaignData.targetCriteria?.students) {
        count = campaignData.targetCriteria.students.length;
      } else {
        // افتراضي: جميع الطلاب النشطين
        const students = await Student.countDocuments({
          "enrollmentInfo.status": "Active",
          isDeleted: false
        });
        count = students;
      }
      break;
      
    default:
      count = 0;
  }
  
  return count;
}

// تنفيذ الحملة
async function executeCampaign(campaignId, userId) {
  try {
    console.log(`🚀 [Campaign Execution] Starting campaign: ${campaignId}`);
    
    const campaign = await MarketingCampaign.findById(campaignId).lean();
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    
    switch (campaign.campaignType) {
      case "evaluation_followup":
        await executeEvaluationFollowupCampaign(campaign, userId);
        break;
        
      case "upsell":
        await executeUpsellCampaign(campaign, userId);
        break;
        
      case "re_enrollment":
        await executeReEnrollmentCampaign(campaign, userId);
        break;
        
      case "retention":
        await executeRetentionCampaign(campaign, userId);
        break;
        
      case "referral":
        await executeReferralCampaign(campaign, userId);
        break;
        
      default:
        console.warn(`⚠️ Unknown campaign type: ${campaign.campaignType}`);
    }
    
    console.log(`✅ [Campaign Execution] Campaign ${campaignId} executed successfully`);
    
  } catch (error) {
    console.error(`❌ [Campaign Execution] Error executing campaign ${campaignId}:`, error);
    throw error;
  }
}

// تنفيذ حملة متابعة التقييمات
async function executeEvaluationFollowupCampaign(campaign, userId) {
  const evaluations = await StudentEvaluation.find({
    finalDecision: { $in: campaign.targetCriteria?.evaluationDecisions || ["pass", "review", "repeat"] },
    isDeleted: false,
    "marketing.followupStatus": { $ne: "completed" }
  })
  .populate("studentId", "personalInfo.fullName personalInfo.whatsappNumber")
  .populate("groupId", "name code courseId")
  .populate({
    path: "groupId",
    populate: {
      path: "courseId",
      select: "title level"
    }
  })
  .lean();

  console.log(`📊 Found ${evaluations.length} evaluations for followup campaign`);
  
  for (const evaluation of evaluations) {
    try {
      // إنشاء إجراء تسويقي
      const marketingAction = await MarketingAction.create({
        actionType: getActionTypeByDecision(evaluation.finalDecision),
        targetStudent: evaluation.studentId._id,
        targetGroup: evaluation.groupId._id,
        evaluationId: evaluation._id,
        actionData: {
          campaignId: campaign._id,
          campaignName: campaign.name,
          customMessage: generateCampaignMessage(evaluation, campaign),
          discountPercentage: campaign.offers?.discountPercentage || getDefaultDiscount(evaluation.finalDecision),
          deadline: new Date(Date.now() + (campaign.offers?.deadlineDays || 7) * 24 * 60 * 60 * 1000),
          aiGenerated: campaign.messages?.aiEnhanced || true,
          generatedAt: new Date()
        },
        communicationChannels: {
          whatsapp: true,
          email: evaluation.studentId.personalInfo?.email ? true : false,
          sms: false
        },
        status: "pending",
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          campaignId: campaign._id,
          campaignType: campaign.campaignType
        }
      });
      
      // تحديث الحملة
      await MarketingCampaign.findByIdAndUpdate(campaign._id, {
        $inc: {
          "stats.messagesSent": 1
        }
      });
      
    } catch (error) {
      console.error(`❌ Error processing evaluation ${evaluation._id}:`, error.message);
    }
  }
}

// تنفيذ حملة الترقية
async function executeUpsellCampaign(campaign, userId) {
  const evaluations = await StudentEvaluation.find({
    groupId: { $in: campaign.targetCriteria?.groups || [] },
    finalDecision: "pass",
    isDeleted: false,
    "marketing.studentCategory": { $in: ["star_student", "ready_for_next_level"] }
  })
  .populate("studentId", "personalInfo.fullName personalInfo.whatsappNumber")
  .populate("groupId", "name code courseId")
  .populate({
    path: "groupId",
    populate: {
      path: "courseId",
      select: "title level price"
    }
  })
  .lean();

  // جلب الكورسات المستهدفة
  const targetCourses = await Course.find({
    level: { $in: ["intermediate", "advanced"] },
    isActive: true
  })
  .select("title price level")
  .lean();

  if (targetCourses.length === 0) {
    console.warn("⚠️ No target courses available for upsell campaign");
    return;
  }

  console.log(`📊 Found ${evaluations.length} students for upsell campaign`);
  
  for (const evaluation of evaluations) {
    try {
      const currentCourse = evaluation.groupId.courseId;
      const targetCourse = targetCourses.find(course => 
        course.level === (currentCourse?.level === "beginner" ? "intermediate" : "advanced")
      ) || targetCourses[0];

      const marketingAction = await MarketingAction.create({
        actionType: "upsell",
        targetStudent: evaluation.studentId._id,
        targetGroup: evaluation.groupId._id,
        evaluationId: evaluation._id,
        actionData: {
          campaignId: campaign._id,
          campaignName: campaign.name,
          currentCourse: currentCourse?.title,
          targetCourse: targetCourse.title,
          discountPercentage: campaign.offers?.discountPercentage || 15,
          originalPrice: targetCourse.price,
          discountedPrice: Math.round(targetCourse.price * (1 - (campaign.offers?.discountPercentage || 15) / 100)),
          deadline: new Date(Date.now() + (campaign.offers?.deadlineDays || 7) * 24 * 60 * 60 * 1000),
          customMessage: generateUpsellCampaignMessage(evaluation, currentCourse, targetCourse, campaign),
          aiGenerated: true,
          generatedAt: new Date()
        },
        communicationChannels: {
          whatsapp: true,
          email: evaluation.studentId.personalInfo?.email ? true : false,
          sms: false
        },
        status: "pending",
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          campaignId: campaign._id,
          campaignType: campaign.campaignType
        }
      });
      
      await MarketingCampaign.findByIdAndUpdate(campaign._id, {
        $inc: {
          "stats.messagesSent": 1
        }
      });
      
    } catch (error) {
      console.error(`❌ Error processing student ${evaluation.studentId._id}:`, error.message);
    }
  }
}

// تنفيذ حملة إعادة التسجيل
async function executeReEnrollmentCampaign(campaign, userId) {
  const evaluations = await StudentEvaluation.find({
    groupId: { $in: campaign.targetCriteria?.groups || [] },
    finalDecision: "repeat",
    isDeleted: false,
    "marketing.studentCategory": "needs_repeat"
  })
  .populate("studentId", "personalInfo.fullName personalInfo.whatsappNumber")
  .populate("groupId", "name code courseId")
  .populate({
    path: "groupId",
    populate: {
      path: "courseId",
      select: "title price"
    }
  })
  .lean();

  console.log(`📊 Found ${evaluations.length} students for re-enrollment campaign`);
  
  for (const evaluation of evaluations) {
    try {
      const course = evaluation.groupId.courseId;
      
      const marketingAction = await MarketingAction.create({
        actionType: "re_enroll",
        targetStudent: evaluation.studentId._id,
        targetGroup: evaluation.groupId._id,
        evaluationId: evaluation._id,
        actionData: {
          campaignId: campaign._id,
          campaignName: campaign.name,
          courseName: course?.title,
          discountPercentage: campaign.offers?.discountPercentage || 40,
          originalPrice: course?.price || 0,
          discountedPrice: Math.round((course?.price || 0) * (1 - (campaign.offers?.discountPercentage || 40) / 100)),
          includeSupport: campaign.offers?.supportSessions > 0,
          supportSessions: campaign.offers?.supportSessions || 3,
          deadline: new Date(Date.now() + (campaign.offers?.deadlineDays || 30) * 24 * 60 * 60 * 1000),
          customMessage: generateReEnrollmentCampaignMessage(evaluation, course, campaign),
          aiGenerated: true,
          generatedAt: new Date()
        },
        communicationChannels: {
          whatsapp: true,
          email: evaluation.studentId.personalInfo?.email ? true : false,
          sms: false
        },
        status: "pending",
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          campaignId: campaign._id,
          campaignType: campaign.campaignType
        }
      });
      
      await MarketingCampaign.findByIdAndUpdate(campaign._id, {
        $inc: {
          "stats.messagesSent": 1
        }
      });
      
    } catch (error) {
      console.error(`❌ Error processing student ${evaluation.studentId._id}:`, error.message);
    }
  }
}

// تنفيذ حملة الاحتفاظ
async function executeRetentionCampaign(campaign, userId) {
  // جلب الطلاب المعرضين للخطر
  const atRiskStudents = await getAtRiskStudentsForCampaign(campaign);
  
  console.log(`📊 Found ${atRiskStudents.length} at-risk students for retention campaign`);
  
  for (const student of atRiskStudents) {
    try {
      const marketingAction = await MarketingAction.create({
        actionType: "support",
        targetStudent: student._id,
        targetGroup: student.groupId,
        actionData: {
          campaignId: campaign._id,
          campaignName: campaign.name,
          riskLevel: student.riskLevel,
          riskReasons: student.riskReasons,
          supportPackage: campaign.offers?.supportSessions > 0 ? 
            `${campaign.offers.supportSessions} جلسات دعم` : "دعم أساسي",
          discountPercentage: campaign.offers?.discountPercentage || 25,
          deadline: new Date(Date.now() + (campaign.offers?.deadlineDays || 14) * 24 * 60 * 60 * 1000),
          customMessage: generateRetentionCampaignMessage(student, campaign),
          aiGenerated: true,
          generatedAt: new Date()
        },
        communicationChannels: {
          whatsapp: true,
          email: student.email ? true : false,
          sms: false
        },
        status: "pending",
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          campaignId: campaign._id,
          campaignType: campaign.campaignType
        }
      });
      
      await MarketingCampaign.findByIdAndUpdate(campaign._id, {
        $inc: {
          "stats.messagesSent": 1
        }
      });
      
    } catch (error) {
      console.error(`❌ Error processing student ${student._id}:`, error.message);
    }
  }
}

// تنفيذ حملة الإحالات
async function executeReferralCampaign(campaign, userId) {
  const eligibleStudents = await Student.find({
    "enrollmentInfo.status": "Active",
    isDeleted: false,
    ...(campaign.targetCriteria?.students ? 
      { _id: { $in: campaign.targetCriteria.students } } : {})
  })
  .select("personalInfo.fullName personalInfo.whatsappNumber enrollmentNumber")
  .lean();

  console.log(`📊 Found ${eligibleStudents.length} students for referral campaign`);
  
  for (const student of eligibleStudents) {
    try {
      // توليد كود إحالة
      const referralCode = `REF-${student.enrollmentNumber || student._id.toString().slice(-8)}-${Date.now().toString(36)}`;
      
      const marketingAction = await MarketingAction.create({
        actionType: "referral",
        targetStudent: student._id,
        actionData: {
          campaignId: campaign._id,
          campaignName: campaign.name,
          referralCode,
          referralBonus: campaign.offers?.referralBonus || "خصم 15% لك ولصديقك",
          deadline: new Date(Date.now() + (campaign.offers?.deadlineDays || 30) * 24 * 60 * 60 * 1000),
          customMessage: generateReferralCampaignMessage(student, referralCode, campaign),
          aiGenerated: true,
          generatedAt: new Date()
        },
        communicationChannels: {
          whatsapp: true,
          email: false,
          sms: false
        },
        status: "pending",
        metadata: {
          createdBy: userId,
          createdAt: new Date(),
          campaignId: campaign._id,
          campaignType: campaign.campaignType
        }
      });
      
      await MarketingCampaign.findByIdAndUpdate(campaign._id, {
        $inc: {
          "stats.messagesSent": 1
        }
      });
      
    } catch (error) {
      console.error(`❌ Error processing student ${student._id}:`, error.message);
    }
  }
}

// جلب الطلاب المعرضين للخطر للحملة
async function getAtRiskStudentsForCampaign(campaign) {
  const evaluations = await StudentEvaluation.find({
    groupId: { $in: campaign.targetCriteria?.groups || [] },
    isDeleted: false,
    finalDecision: { $in: ["review", "repeat"] }
  })
  .populate("studentId", "personalInfo.fullName personalInfo.whatsappNumber personalInfo.email")
  .populate("groupId", "name code")
  .lean();

  return evaluations.map(evaluation => {
    const riskScore = calculateRiskScore(evaluation);
    return {
      _id: evaluation.studentId._id,
      name: evaluation.studentId.personalInfo?.fullName,
      whatsappNumber: evaluation.studentId.personalInfo?.whatsappNumber,
      email: evaluation.studentId.personalInfo?.email,
      groupId: evaluation.groupId._id,
      groupName: evaluation.groupId.name,
      finalDecision: evaluation.finalDecision,
      overallScore: evaluation.calculatedStats?.overallScore,
      riskLevel: riskScore >= 80 ? "high" : riskScore >= 50 ? "medium" : "low",
      riskReasons: getRiskReasons(evaluation)
    };
  }).filter(student => student.riskLevel === "high" || student.riskLevel === "medium");
}

// حساب درجة المخاطرة
function calculateRiskScore(evaluation) {
  let score = 0;
  
  if (evaluation.finalDecision === 'repeat') score += 80;
  else if (evaluation.finalDecision === 'review') score += 60;
  
  if (evaluation.calculatedStats?.overallScore <= 2.5) score += 30;
  else if (evaluation.calculatedStats?.overallScore <= 3.5) score += 15;
  
  return Math.min(score, 100);
}

// أسباب المخاطرة
function getRiskReasons(evaluation) {
  const reasons = [];
  
  if (evaluation.finalDecision === 'repeat') reasons.push('يحتاج إعادة الكورس');
  if (evaluation.finalDecision === 'review') reasons.push('يحتاج مراجعة وتدعيم');
  if (evaluation.calculatedStats?.overallScore <= 2.5) reasons.push('نتيجة ضعيفة جداً');
  
  return reasons;
}

// توليد رسائل الحملات
function generateCampaignMessage(evaluation, campaign) {
  const studentName = evaluation.studentId.personalInfo?.fullName || "طالبنا العزيز";
  const courseName = evaluation.groupId.courseId?.title || "الكورس";
  
  let message = `🎯 ${studentName}، `;
  
  switch (evaluation.finalDecision) {
    case "pass":
      message += campaign.messages?.pass?.template || 
        `مبروك على إتمام ${courseName} بنجاح! 🎉
نقدم لك عرضاً خاصاً للمستوى التالي بخصم ${campaign.offers?.discountPercentage || 15}%`;
      break;
      
    case "review":
      message += campaign.messages?.review?.template || 
        `أداؤك في ${courseName} جيد! 👋
لكن محتاج بعض التدعيم. عندنا جلسات دعم خاصة بخصم ${campaign.offers?.discountPercentage || 25}%`;
      break;
      
    case "repeat":
      message += campaign.messages?.repeat?.template || 
        `للاستفادة الكاملة من ${courseName}، ننصح بإعادة الكورس. 🔄
عرض خاص: خصم ${campaign.offers?.discountPercentage || 40}% على الإعادة + جلسات دعم مجانية!`;
      break;
  }
  
  return message;
}

function generateUpsellCampaignMessage(evaluation, currentCourse, targetCourse, campaign) {
  const studentName = evaluation.studentId.personalInfo?.fullName || "طالبنا العزيز";
  
  return `🎉 مبروك ${studentName}!

بناءً على أدائك المتميز في ${currentCourse?.title}، نقدم لك عرضاً خاصاً للتسجيل في:
**${targetCourse.title}**

خصم ${campaign.offers?.discountPercentage || 15}% حصرياً لك!

سارع بالاستفادة، العرض ساري حتى ${new Date(Date.now() + (campaign.offers?.deadlineDays || 7) * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG')}

مع تحيات فريق Code School 💻✨`;
}

function generateReEnrollmentCampaignMessage(evaluation, course, campaign) {
  const studentName = evaluation.studentId.personalInfo?.fullName || "طالبنا العزيز";
  
  return `🔄 ${studentName}،

للاستفادة الكاملة من ${course?.title}، نقدم لك:
• خصم ${campaign.offers?.discountPercentage || 40}% على إعادة الكورس
• ${campaign.offers?.supportSessions || 3} جلسات دعم مجانية
• متابعة شخصية مع المدرب

العرض ساري حتى ${new Date(Date.now() + (campaign.offers?.deadlineDays || 30) * 24 * 60 * 60 * 1000).toLocaleDateString('ar-EG')}

رد بكلمة "نعم" للاستفادة!`;
}

function generateRetentionCampaignMessage(student, campaign) {
  return `🔔 ${student.name}،

نلاحظ أنك بحاجة دعم في ${student.groupName}.

نقدم لك:
• جلسات دعم مخصصة
• خصم ${campaign.offers?.discountPercentage || 25}% للاستمرار
• متابعة مباشرة مع المدرب

هدفنا نوصل معاك لـ 100% استفادة!

تواصل معنا الآن 📞`;
}

function generateReferralCampaignMessage(student, referralCode, campaign) {
  return `🤝 ${student.personalInfo?.fullName}،

أداؤك المتميز أهلّك لبرنامج الإحالات الخاص بنا!

كود إحالتك: **${referralCode}**
المكافأة: ${campaign.offers?.referralBonus || "خصم 15% لك ولصديقك"}

شارك الكود مع أصدقائك واستفد أنت وهم!

العرض ساري لمدة ${campaign.offers?.deadlineDays || 30} يوم

مع تحيات فريق Code School 💻✨`;
}

// إحصائيات الحملات
async function getCampaignStats(timeframe) {
  const dateFilter = timeframe !== "all" ? getDateFilter(timeframe) : {};
  
  const stats = await MarketingCampaign.aggregate([
    {
      $match: {
        ...dateFilter,
        isDeleted: false
      }
    },
    {
      $facet: {
        // الإحصائيات العامة
        overall: [
          {
            $group: {
              _id: null,
              totalCampaigns: { $sum: 1 },
              activeCampaigns: {
                $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
              },
              totalTargets: { $sum: { $ifNull: ["$stats.totalTargets", 0] } },
              totalMessages: { $sum: { $ifNull: ["$stats.messagesSent", 0] } },
              totalConversions: { $sum: { $ifNull: ["$stats.conversions", 0] } },
              totalRevenue: { $sum: { $ifNull: ["$stats.totalRevenue", 0] } }
            }
          }
        ],
        
        // حسب النوع
        byType: [
          {
            $group: {
              _id: "$campaignType",
              count: { $sum: 1 },
              active: {
                $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
              },
              totalTargets: { $sum: { $ifNull: ["$stats.totalTargets", 0] } },
              totalMessages: { $sum: { $ifNull: ["$stats.messagesSent", 0] } },
              totalConversions: { $sum: { $ifNull: ["$stats.conversions", 0] } },
              totalRevenue: { $sum: { $ifNull: ["$stats.totalRevenue", 0] } },
              avgConversionRate: {
                $avg: { $ifNull: ["$stats.conversionRate", 0] }
              }
            }
          }
        ],
        
        // حسب الحالة
        byStatus: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalTargets: { $sum: { $ifNull: ["$stats.totalTargets", 0] } },
              totalMessages: { $sum: { $ifNull: ["$stats.messagesSent", 0] } },
              totalConversions: { $sum: { $ifNull: ["$stats.conversions", 0] } }
            }
          }
        ],
        
        // حسب الشهر
        monthlyTrend: [
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m", date: "$metadata.createdAt" }
              },
              count: { $sum: 1 },
              active: {
                $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
              },
              totalMessages: { $sum: { $ifNull: ["$stats.messagesSent", 0] } },
              totalConversions: { $sum: { $ifNull: ["$stats.conversions", 0] } },
              totalRevenue: { $sum: { $ifNull: ["$stats.totalRevenue", 0] } }
            }
          },
          { $sort: { "_id": 1 } }
        ]
      }
    }
  ]);
  
  const overall = stats[0]?.overall[0] || {};
  const totalCampaigns = overall.totalCampaigns || 0;
  const totalTargets = overall.totalTargets || 0;
  const totalMessages = overall.totalMessages || 0;
  const totalConversions = overall.totalConversions || 0;
  const totalRevenue = overall.totalRevenue || 0;
  
  const overallConversionRate = totalMessages > 0 ? 
    parseFloat(((totalConversions / totalMessages) * 100).toFixed(2)) : 0;
  
  const avgCostPerAction = totalMessages > 0 ? 
    parseFloat((totalRevenue / totalMessages).toFixed(2)) : 0;
  
  const avgROI = totalRevenue > 0 ? 
    parseFloat(((totalRevenue / (totalRevenue * 0.1)) * 100).toFixed(2)) : 0; // افتراضي 10% تكلفة
  
  return {
    totalCampaigns,
    activeCampaigns: overall.activeCampaigns || 0,
    totalTargets,
    totalMessages,
    totalConversions,
    totalRevenue,
    overallConversionRate,
    avgCostPerAction,
    avgROI,
    byType: stats[0]?.byType || [],
    byStatus: stats[0]?.byStatus || [],
    monthlyTrend: stats[0]?.monthlyTrend || []
  };
}

// تحليل الحملات حسب النوع
async function analyzeCampaignsByType(timeframe) {
  const dateFilter = timeframe !== "all" ? getDateFilter(timeframe) : {};
  
  const analysis = await MarketingCampaign.aggregate([
    {
      $match: {
        ...dateFilter,
        isDeleted: false,
        status: { $in: ["active", "completed"] }
      }
    },
    {
      $group: {
        _id: "$campaignType",
        totalCampaigns: { $sum: 1 },
        avgDuration: {
          $avg: {
            $cond: [
              { $and: ["$stats.startDate", "$stats.endDate"] },
              { $divide: [
                { $subtract: ["$stats.endDate", "$stats.startDate"] },
                1000 * 60 * 60 * 24 // تحويل إلى أيام
              ]},
              null
            ]
          }
        },
        avgConversionRate: { $avg: { $ifNull: ["$stats.conversionRate", 0] } },
        avgRevenue: { $avg: { $ifNull: ["$stats.totalRevenue", 0] } },
        bestCampaign: { 
          $max: {
            conversionRate: { $ifNull: ["$stats.conversionRate", 0] },
            campaignId: "$_id",
            name: "$name"
          }
        },
        worstCampaign: { 
          $min: {
            conversionRate: { $ifNull: ["$stats.conversionRate", 0] },
            campaignId: "$_id",
            name: "$name"
          }
        }
      }
    },
    {
      $project: {
        campaignType: "$_id",
        totalCampaigns: 1,
        avgDuration: { $round: ["$avgDuration", 1] },
        avgConversionRate: { $round: ["$avgConversionRate", 2] },
        avgRevenue: { $round: ["$avgRevenue", 2] },
        bestCampaign: {
          campaignId: "$bestCampaign.campaignId",
          name: "$bestCampaign.name",
          conversionRate: { $round: ["$bestCampaign.conversionRate", 2] }
        },
        worstCampaign: {
          campaignId: "$worstCampaign.campaignId",
          name: "$worstCampaign.name",
          conversionRate: { $round: ["$worstCampaign.conversionRate", 2] }
        }
      }
    }
  ]);
  
  return analysis;
}

// حساب إيرادات الحملة
async function calculateCampaignRevenue(campaignId) {
  const actions = await MarketingAction.find({
    $or: [
      { "metadata.campaignId": campaignId },
      { evaluationId: { $in: await getEvaluationIdsForCampaign(await MarketingCampaign.findById(campaignId)) } }
    ],
    status: "completed"
  }).lean();
  
  return actions.reduce((sum, action) => {
    if (action.actionData?.discountedPrice) {
      return sum + action.actionData.discountedPrice;
    }
    return sum;
  }, 0);
}

// الحصول على معرفات التقييمات للحملة
async function getEvaluationIdsForCampaign(campaign) {
  if (!campaign) return [];
  
  let evaluationIds = [];
  
  switch (campaign.campaignType) {
    case "evaluation_followup":
      if (campaign.targetCriteria?.evaluationDecisions) {
        const evaluations = await StudentEvaluation.find({
          finalDecision: { $in: campaign.targetCriteria.evaluationDecisions },
          isDeleted: false
        }).select("_id").lean();
        evaluationIds = evaluations.map(e => e._id);
      }
      break;
      
    case "upsell":
      if (campaign.targetCriteria?.groups) {
        const evaluations = await StudentEvaluation.find({
          groupId: { $in: campaign.targetCriteria.groups },
          finalDecision: "pass",
          isDeleted: false
        }).select("_id").lean();
        evaluationIds = evaluations.map(e => e._id);
      }
      break;
      
    case "re_enrollment":
      if (campaign.targetCriteria?.groups) {
        const evaluations = await StudentEvaluation.find({
          groupId: { $in: campaign.targetCriteria.groups },
          finalDecision: "repeat",
          isDeleted: false
        }).select("_id").lean();
        evaluationIds = evaluations.map(e => e._id);
      }
      break;
  }
  
  return evaluationIds;
}

// حساب أداء الحملة
function calculateCampaignPerformanceScore(campaign, totalActions, conversions, revenue) {
  let score = 0;
  
  // عامل: نسبة التحويل (40 نقطة كحد أقصى)
  const conversionRate = totalActions > 0 ? (conversions / totalActions) * 100 : 0;
  score += Math.min(conversionRate * 0.4, 40);
  
  // عامل: الإيرادات (30 نقطة كحد أقصى)
  const revenueScore = revenue > 0 ? Math.min(revenue / 1000, 30) : 0; // كل 1000 جنيه = 1 نقطة
  score += revenueScore;
  
  // عامل: عدد الأهداف (10 نقاط كحد أقصى)
  const targets = campaign.stats?.totalTargets || 0;
  score += Math.min(targets / 10, 10);
  
  // عامل: المدة (10 نقاط كحد أقصى)
  if (campaign.stats?.startDate && campaign.stats?.endDate) {
    const duration = (new Date(campaign.stats.endDate) - new Date(campaign.stats.startDate)) / (1000 * 60 * 60 * 24);
    const durationScore = duration <= 30 ? 10 : duration <= 60 ? 7 : duration <= 90 ? 5 : 3;
    score += durationScore;
  } else {
    score += 5; // متوسط إذا لم تكن المدة محددة
  }
  
  // عامل: الحالة (10 نقاط)
  const statusScores = {
    'active': 10,
    'completed': 8,
    'paused': 5,
    'draft': 3,
    'archived': 1
  };
  score += statusScores[campaign.status] || 5;
  
  return Math.round(score);
}

// تحديد نوع الإجراء حسب القرار
function getActionTypeByDecision(decision) {
  const actionMap = {
    'pass': 'upsell',
    'review': 'support',
    'repeat': 're_enroll'
  };
  return actionMap[decision] || 'support';
}

// الحصول على الخصم الافتراضي
function getDefaultDiscount(decision) {
  const discounts = {
    'pass': 15,
    'review': 25,
    'repeat': 40
  };
  return discounts[decision] || 20;
}

// فلترة التاريخ
function getDateFilter(timeframe) {
  const now = new Date();
  let startDate;
  
  switch (timeframe) {
    case 'day':
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'quarter':
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }
  
  return { $gte: startDate };
}