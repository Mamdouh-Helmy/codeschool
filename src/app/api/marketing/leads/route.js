import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import MarketingLead from "../../../models/MarketingLead";
import Student from "../../../models/Student";
import Group from "../../../models/Group";

export async function GET(req) {
  try {
    console.log("📥 [Marketing Leads API] Request received");

    // التحقق من المستخدم
    const user = await getUserFromRequest(req);

    if (
      !user ||
      (user.role !== "marketing" &&
        user.role !== "admin" &&
        user.role !== "sales")
    ) {
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
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assignedTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // بناء الاستعلام
    const query = {
      isDeleted: false,
    };

    if (status) {
      query.status = status;
    }

    if (source) {
      query.source = source;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // فلترة التاريخ
    if (timeframe !== "all") {
      const dateFilter = getDateFilter(timeframe);
      query["metadata.createdAt"] = dateFilter;
    }

    // الترتيب
    const sort = {};
    if (sortBy === "leadScore") {
      sort["leadScore.score"] = sortOrder === "desc" ? -1 : 1;
    } else if (sortBy === "lastContacted") {
      sort["metadata.lastContacted"] = sortOrder === "desc" ? -1 : 1;
    } else {
      sort["metadata.createdAt"] = sortOrder === "desc" ? -1 : 1;
    }

    // الحصول على الإحصائيات
    const stats = await MarketingLead.getLeadStats(timeframe);

    // الحصول على الـ Leads
    const totalLeads = await MarketingLead.countDocuments(query);
    const leads = await MarketingLead.find(query)
      .populate("assignedTo", "name email phone")
      .populate("conversion.courseId", "title")
      .populate("conversion.groupId", "name code")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Leads التي تحتاج لمتابعة
    const leadsNeedingFollowup = await MarketingLead.findLeadsNeedingFollowup(
      5
    );

    // High potential leads
    const highPotentialLeads = await MarketingLead.find({
      ...query,
      "leadScore.score": { $gte: 75 },
    })
      .sort({ "leadScore.score": -1 })
      .limit(5)
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
          status,
          source,
          assignedTo,
          page,
          limit,
          sortBy,
          sortOrder,
        },
        pagination: {
          page,
          limit,
          total: totalLeads,
          totalPages: Math.ceil(totalLeads / limit),
        },
        stats,
        leads: leads.map((lead) => ({
          ...lead,
          daysSinceCreation: lead.daysSinceCreation,
          daysSinceLastContact: lead.daysSinceLastContact,
          isOverdue: lead.isOverdue,
        })),
        leadsNeedingFollowup,
        highPotentialLeads,
        summary: {
          totalLeads,
          newLeads: stats.byStatus.find((s) => s._id === "new")?.count || 0,
          contactedLeads:
            stats.byStatus.find((s) => s._id === "contacted")?.count || 0,
          convertedLeads: stats.totals.converted,
          conversionRate: stats.totals.conversionRate,
          totalRevenue: stats.totals.revenue,
        },
      },
    };

    console.log(`✅ [Marketing Leads] Returned ${leads.length} leads`);
    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ [Marketing Leads API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحميل بيانات الـ Leads",
        error: error.message,
        code: "LEADS_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    console.log("📝 [Marketing Leads API] Creating new lead");

    const user = await getUserFromRequest(req);

    if (
      !user ||
      (user.role !== "marketing" &&
        user.role !== "admin" &&
        user.role !== "sales")
    ) {
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
    if (!body.fullName || !body.phone) {
      return NextResponse.json(
        {
          success: false,
          message: "الاسم ورقم الهاتف مطلوبان",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // التحقق من عدم وجود lead بنفس الرقم
    const existingLead = await MarketingLead.findOne({
      phone: body.phone,
      isDeleted: false,
    });

    if (existingLead) {
      return NextResponse.json(
        {
          success: false,
          message: "هذا الرقم مسجل مسبقاً",
          lead: existingLead,
          code: "DUPLICATE_LEAD",
        },
        { status: 409 }
      );
    }

    // إنشاء الـ Lead
    const leadData = {
      ...body,
      metadata: {
        ...body.metadata,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const newLead = await MarketingLead.create(leadData);

    // إضافة سجل التواصل الأول
    if (body.initialMessage) {
      await newLead.addCommunication({
        channel: "whatsapp",
        message: body.initialMessage,
        direction: "outbound",
        status: "sent",
      });
    }

    console.log(`✅ [Marketing Leads] Created new lead: ${newLead._id}`);

    return NextResponse.json({
      success: true,
      message: "تم إنشاء الـ Lead بنجاح",
      lead: newLead,
    });
  } catch (error) {
    console.error("❌ [Marketing Leads API] Error creating lead:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في إنشاء الـ Lead",
        error: error.message,
        code: "LEAD_CREATION_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    console.log("🔄 [Marketing Leads API] Updating lead");

    const user = await getUserFromRequest(req);

    if (
      !user ||
      (user.role !== "marketing" &&
        user.role !== "admin" &&
        user.role !== "sales")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "غير مصرح بالتحديث",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");
    const body = await req.json();

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "معرف الـ Lead مطلوب",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    // البحث عن الـ Lead
    const lead = await MarketingLead.findById(leadId);

    if (!lead || lead.isDeleted) {
      return NextResponse.json(
        {
          success: false,
          message: "الـ Lead غير موجود",
          code: "LEAD_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // تحديث البيانات
    const updates = {
      ...body,
      "metadata.updatedAt": new Date(),
      "metadata.lastModifiedBy": user.id,
    };

    const updatedLead = await MarketingLead.findByIdAndUpdate(
      leadId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    console.log(`✅ [Marketing Leads] Updated lead: ${leadId}`);

    return NextResponse.json({
      success: true,
      message: "تم تحديث الـ Lead بنجاح",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("❌ [Marketing Leads API] Error updating lead:", error);
    return NextResponse.json(
      {
        success: false,
        message: "فشل في تحديث الـ Lead",
        error: error.message,
        code: "LEAD_UPDATE_ERROR",
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
