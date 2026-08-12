// /src/app/api/guest/dashboard/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Portfolio from "../../../models/Portfolio";
import ContactMessage from "../../../models/ContactMessage";
// ⚠️ افتراض: فيه helper اسمه requireAuth بيتحقق من إن فيه مستخدم مسجل دخول
// (بنفس أسلوب requireAdmin الموجود في portfolio-broadcast/route.js) وبيرجع
// { authorized, response, user }. لو الاسم مختلف عندك غيّره هنا بس.
import { requireAuth } from "@/utils/authMiddleware";

export async function GET(req) {
  const authCheck = await requireAuth(req);
  if (!authCheck.authorized) return authCheck.response;

  try {
    await connectDB();

    const currentUser = authCheck.user;
    const userId = currentUser?.id || currentUser?._id;

    const portfolio = await Portfolio.findOne({ userId }).lean();

    // ── لسه معملش بورتفوليو ────────────────────────────────────────────────
    if (!portfolio) {
      return NextResponse.json({
        success: true,
        data: {
          hasPortfolio: false,
          portfolio: null,
          stats: {
            views: 0,
            projectsCount: 0,
            skillsCount: 0,
            certificatesCount: 0,
            messagesCount: 0,
            messagesThisWeek: 0,
          },
          recentMessages: [],
        },
      });
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // ✅ الـ 3 queries دي مستقلة عن بعض، فبتتنفذ بالتوازي بدل sequential
    const [totalMessages, messagesThisWeek, recentMessagesRaw] = await Promise.all([
      ContactMessage.countDocuments({ portfolioId: portfolio._id }),
      ContactMessage.countDocuments({
        portfolioId: portfolio._id,
        createdAt: { $gte: weekAgo },
      }),
      ContactMessage.find({ portfolioId: portfolio._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const recentMessages = recentMessagesRaw.map((m) => ({
      _id: m._id,
      name: `${m.senderInfo?.firstName || ""} ${m.senderInfo?.lastName || ""}`.trim(),
      email: m.senderInfo?.email || "",
      phoneNumber: m.senderInfo?.phoneNumber || "",
      service: m.service || "",
      message: m.message || "",
      createdAt: m.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        hasPortfolio: true,
        portfolio: {
          _id: portfolio._id,
          title: portfolio.title,
          description: portfolio.description,
          isPublished: portfolio.isPublished,
          views: portfolio.views || 0,
        },
        stats: {
          views: portfolio.views || 0,
          projectsCount: portfolio.projects?.length || 0,
          skillsCount: portfolio.skills?.length || 0,
          certificatesCount: portfolio.certificates?.length || 0,
          messagesCount: totalMessages,
          messagesThisWeek,
        },
        recentMessages,
      },
    });
  } catch (error) {
    console.error("GET /api/guest/dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "حصل خطأ أثناء تحميل بيانات لوحة التحكم" },
      { status: 500 }
    );
  }
}