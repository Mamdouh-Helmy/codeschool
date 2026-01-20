// app/api/marketing-dashboard/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import MarketingCampaign from "../../models/MarketingCampaign";
import StudentEvaluation from "../../models/StudentEvaluation";
import MarketingAction from "../../models/MarketingAction";
import Student from "../../models/Student";
import Lead from "../../models/MarketingLead";

export async function GET(req) {
  try {
    console.log("📈 [Marketing Dashboard API] Request received");

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

    // 1. إحصائيات الإجراءات التسويقية
    const dateFilter = getDateFilter(timeframe);
    
    const actionStats = await MarketingAction.aggregate([
      {
        $match: {
          createdAt: dateFilter,
          isDeleted: false
        }
      },
      {
        $facet: {
          // إحصائيات عامة
          overview: [
            {
              $group: {
                _id: null,
                totalActions: { $sum: 1 },
                completed: { 
                  $sum: { 
                    $cond: [{ $eq: ["$status", "completed"] }, 1, 0] 
                  } 
                },
                pending: { 
                  $sum: { 
                    $cond: [{ $eq: ["$status", "pending"] }, 1, 0] 
                  } 
                },
                failed: { 
                  $sum: { 
                    $cond: [{ $eq: ["$status", "failed"] }, 1, 0] 
                  } 
                }
              }
            }
          ],
          
          // حسب النوع
          byType: [
            {
              $group: {
                _id: "$actionType",
                count: { $sum: 1 },
                completed: { 
                  $sum: { 
                    $cond: [{ $eq: ["$status", "completed"] }, 1, 0] 
                  } 
                },
                revenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "completed"] },
                      { $ifNull: ["$actionData.discountedPrice", 0] },
                      0
                    ]
                  }
                }
              }
            }
          ],
          
          // حسب الشهر
          monthlyTrend: [
            {
              $group: {
                _id: {
                  month: { $month: "$createdAt" },
                  year: { $year: "$createdAt" }
                },
                count: { $sum: 1 },
                revenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", "completed"] },
                      { $ifNull: ["$actionData.discountedPrice", 0] },
                      0
                    ]
                  }
                }
              }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 6 }
          ]
        }
      }
    ]);

    const overview = actionStats[0]?.overview[0] || {
      totalActions: 0,
      completed: 0,
      pending: 0,
      failed: 0
    };

    // 2. إحصائيات الحملات
    const campaignStats = await MarketingCampaign.aggregate([
      {
        $match: {
          status: "active",
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          activeCampaigns: { $sum: 1 },
          totalTargets: { $sum: "$stats.totalTargets" },
          messagesSent: { $sum: "$stats.messagesSent" },
          conversions: { $sum: "$stats.conversions" },
          conversionRate: { $avg: "$stats.conversionRate" }
        }
      }
    ]);

    const campaigns = campaignStats[0] || {
      activeCampaigns: 0,
      totalTargets: 0,
      messagesSent: 0,
      conversions: 0,
      conversionRate: 0
    };

    // 3. إحصائيات التقييمات
    const evaluationStats = await StudentEvaluation.aggregate([
      {
        $match: {
          "metadata.evaluatedAt": dateFilter,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: "$finalDecision",
          count: { $sum: 1 },
          avgScore: { $avg: "$calculatedStats.overallScore" }
        }
      }
    ]);

    const evaluations = {
      pass: evaluationStats.find(e => e._id === "pass")?.count || 0,
      review: evaluationStats.find(e => e._id === "review")?.count || 0,
      repeat: evaluationStats.find(e => e._id === "repeat")?.count || 0,
      total: evaluationStats.reduce((sum, e) => sum + e.count, 0)
    };

    // 4. إحصائيات Leads
    const leadStats = await Lead.aggregate([
      {
        $match: {
          createdAt: dateFilter,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgScore: { $avg: "$leadScore.score" }
        }
      }
    ]);

    const leads = {
      new: leadStats.find(l => l._id === "new")?.count || 0,
      contacted: leadStats.find(l => l._id === "contacted")?.count || 0,
      qualified: leadStats.find(l => l._id === "qualified")?.count || 0,
      converted: leadStats.find(l => l._id === "converted")?.count || 0,
      total: leadStats.reduce((sum, l) => sum + l.count, 0)
    };

    // 5. الحملات النشطة
    const activeCampaigns = await MarketingCampaign.find({
      status: "active",
      isDeleted: false
    })
      .select("name description campaignType status stats")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 6. أحدث الإجراءات
    const recentActions = await MarketingAction.find({
      isDeleted: false
    })
      .populate("targetStudent", "personalInfo.fullName")
      .populate("targetGroup", "name")
      .select("actionType status createdAt results")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 7. التصنيفات التسويقية للطلاب
    const studentCategories = await StudentEvaluation.aggregate([
      {
        $match: {
          isDeleted: false,
          "marketing.studentCategory": { $exists: true }
        }
      },
      {
        $group: {
          _id: "$marketing.studentCategory",
          count: { $sum: 1 },
          avgScore: { $avg: "$calculatedStats.overallScore" }
        }
      }
    ]);

    // تجميع البيانات النهائية
    const stats = {
      total: {
        actions: overview.totalActions,
        completed: overview.completed,
        students: await Student.countDocuments({ isDeleted: false }),
        successRate: overview.totalActions > 0 
          ? Math.round((overview.completed / overview.totalActions) * 100) 
          : 0
      },
      campaigns: {
        active: campaigns.activeCampaigns,
        totalTargets: campaigns.totalTargets,
        messagesSent: campaigns.messagesSent,
        conversions: campaigns.conversions,
        conversionRate: campaigns.conversionRate ? parseFloat(campaigns.conversionRate.toFixed(2)) : 0
      },
      evaluations: {
        pass: evaluations.pass,
        review: evaluations.review,
        repeat: evaluations.repeat,
        total: evaluations.total
      },
      leads: {
        new: leads.new,
        contacted: leads.contacted,
        qualified: leads.qualified,
        converted: leads.converted,
        total: leads.total
      },
      byActionType: actionStats[0]?.byType?.reduce((acc, item) => {
        if (item._id) {
          acc[item._id] = {
            count: item.count,
            completed: item.completed,
            revenue: item.revenue,
            successRate: item.count > 0 ? Math.round((item.completed / item.count) * 100) : 0
          };
        }
        return acc;
      }, {}) || {},
      monthlyTrend: actionStats[0]?.monthlyTrend?.map(item => ({
        month: item._id.month,
        year: item._id.year,
        count: item.count,
        revenue: item.revenue
      })) || [],
      studentCategories: studentCategories.map(cat => ({
        category: cat._id,
        count: cat.count,
        avgScore: cat.avgScore ? parseFloat(cat.avgScore.toFixed(2)) : 0
      }))
    };

    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        timeframe,
        stats,
        activeCampaigns,
        recentActions,
        summary: {
          totalRevenue: stats.byActionType.upsell?.revenue || 0,
          conversionRate: stats.total.successRate,
          studentRetentionRate: evaluations.total > 0 
            ? Math.round(((evaluations.pass + evaluations.review) / evaluations.total) * 100)
            : 0,
          leadConversionRate: leads.total > 0
            ? Math.round((leads.converted / leads.total) * 100)
            : 0
        }
      }
    };

    console.log("✅ [Marketing Dashboard] Data loaded successfully");
    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ [Marketing Dashboard API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات لوحة الماركتنج",
        error: error.message,
        code: "MARKETING_DASHBOARD_ERROR"
      },
      { status: 500 }
    );
  }
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