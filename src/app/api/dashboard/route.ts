import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "../../models/User";
import Subscription from "../../models/Subscription";
import Project from "../../models/Project";
import BlogPost from "../../models/BlogPost";
import Event from "../../models/Event";
import Webinar from "../../models/Webinar";

// دالة لاستخراج اللغة من الـ headers
function getLocaleFromHeaders(headers: Headers): 'ar' | 'en' {
  const acceptLanguage = headers.get('accept-language');
  return acceptLanguage?.startsWith('ar') ? 'ar' : 'en';
}

// رسائل باللغتين
const messages = {
  en: {
    noRealData: "No real data available yet",
    failedToFetch: "Failed to fetch dashboard data",
    unknownStudent: "Unknown Student",
    noEmail: "No email",
    generalPlan: "General Plan",
    newStudentRegistration: "New Student Registration",
    joinedPlatform: "joined the platform",
    newSubscription: "New Subscription",
    subscribedTo: "subscribed to",
    newProjectSubmitted: "New Project Submitted",
    created: "created",
    blogPosts: "Blog Posts",
    studentProjects: "Student Projects",
    writeNewBlog: "Write New Blog Post",
    contentCreation: "Content creation",
    viewStudentProjects: "View Student Projects",
    portfolioReview: "Portfolio review",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    timeAgo: {
      minutes: (mins: number) => `${mins} minutes ago`,
      hours: (hours: number) => `${hours} hours ago`,
      days: (days: number) => `${days} days ago`
    }
  },
  ar: {
    noRealData: "لا توجد بيانات حقيقية متاحة بعد",
    failedToFetch: "فشل في جلب بيانات لوحة التحكم",
    unknownStudent: "طالب غير معروف",
    noEmail: "لا يوجد بريد إلكتروني",
    generalPlan: "الخطة العامة",
    newStudentRegistration: "تسجيل طالب جديد",
    joinedPlatform: "انضم إلى المنصة",
    newSubscription: "اشتراك جديد",
    subscribedTo: "اشترك في",
    newProjectSubmitted: "تم تقديم مشروع جديد",
    created: "أنشأ",
    blogPosts: "مقالات المدونة",
    studentProjects: "مشاريع الطلاب",
    writeNewBlog: "كتابة مقال جديد",
    contentCreation: "إنشاء محتوى",
    viewStudentProjects: "عرض مشاريع الطلاب",
    portfolioReview: "مراجعة المحفظة",
    days: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    timeAgo: {
      minutes: (mins: number) => `قبل ${mins} دقيقة`,
      hours: (hours: number) => `قبل ${hours} ساعة`,
      days: (days: number) => `قبل ${days} يوم`
    }
  }
};

export async function GET(request: Request) {
  try {
    const locale = getLocaleFromHeaders(request.headers);
    const msg = messages[locale];
    
    await connectDB();

    const [
      totalStudents,
      activeSubscriptions,
      totalProjects,
      totalBlogs,
      totalEvents,
      totalWebinars,
      subscriptions,
      recentSubscriptions,
      recentUsers,
      recentProjects,
      allSubscriptions,
      weeklySubscriptions,
      userActivity,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      Subscription.countDocuments({ status: "active" }),
      Project.countDocuments({ isActive: true }),
      BlogPost.countDocuments({ status: "published" }),
      Event.countDocuments({ isActive: true }),
      Webinar.countDocuments({ isActive: true }),
      Subscription.find({ status: "active" }).populate("plan"),
      Subscription.find({})
        .populate("user", "name email")
        .populate("plan", "name")
        .sort({ createdAt: -1 })
        .limit(5),
      User.find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .select("name email createdAt"),
      Project.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("title student createdAt"),
      Subscription.find({}).populate("plan"),
      Subscription.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$createdAt" },
            count: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
      Subscription.aggregate([
        {
          $match: {
            status: "active",
            startDate: { $exists: true },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$startDate",
              },
            },
            activeUsers: { $sum: "$studentCount" },
            dailyRevenue: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $limit: 7,
        },
      ]),
    ]);

    const hasRealData = checkIfHasRealData({
      totalStudents,
      activeSubscriptions,
      totalProjects,
      totalBlogs,
      recentSubscriptions,
      recentUsers,
      recentProjects,
      weeklySubscriptions,
      userActivity,
    });

    if (!hasRealData) {
      return NextResponse.json({
        success: true,
        data: null,
        message: msg.noRealData,
        hasData: false,
        timestamp: new Date().toISOString(),
      });
    }

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const monthlyRevenueFromSubscriptions = allSubscriptions.reduce(
      (total, sub) => {
        const subDate = new Date(sub.startDate);
        if (sub.status === "active" && subDate >= last30Days) {
          return total + (sub.totalAmount || 0);
        }
        return total;
      },
      0
    );

    const performanceData = generateRealPerformanceData(
      weeklySubscriptions,
      userActivity,
      locale
    );

    const enrollments = recentSubscriptions.map((subscription, index) => ({
      id: subscription._id?.toString() || `sub-${index}-${Date.now()}`,
      name: subscription.user?.name || msg.unknownStudent,
      email: subscription.user?.email || msg.noEmail,
      course: subscription.plan?.name || msg.generalPlan,
      progress: calculateProgress(subscription),
      enrolledOn: new Date(subscription.startDate).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US'),
      status: mapSubscriptionStatus(subscription.status),
    }));

    const activities = [];

    recentUsers.forEach((user, index) => {
      activities.push({
        id: user._id?.toString() || `user-${index}-${Date.now()}`,
        title: msg.newStudentRegistration,
        description: `${user.name} ${msg.joinedPlatform}`,
        timestamp: formatTimestamp(user.createdAt, locale),
        icon: "ion:person-add",
        tone: "success",
      });
    });

    recentSubscriptions.forEach((sub, index) => {
      activities.push({
        id: sub._id?.toString() || `sub-act-${index}-${Date.now()}`,
        title: msg.newSubscription,
        description: `${sub.user?.name || "User"} ${msg.subscribedTo} ${sub.plan?.name || "a plan"}`,
        timestamp: formatTimestamp(sub.createdAt, locale),
        icon: "ion:card",
        tone: "info",
      });
    });

    recentProjects.forEach((project, index) => {
      activities.push({
        id: project._id?.toString() || `project-${index}-${Date.now()}`,
        title: msg.newProjectSubmitted,
        description: `${project.student?.name || "Student"} ${msg.created} "${project.title}"`,
        timestamp: formatTimestamp(project.createdAt, locale),
        icon: "ion:rocket",
        tone: "warning",
      });
    });

    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          activeSubscriptions,
          monthlyRevenue: monthlyRevenueFromSubscriptions,
          courseCompletion: calculateCourseCompletion(allSubscriptions),
          totalProjects,
          totalBlogs,
          totalEvents,
          totalWebinars,
        },
        enrollments: enrollments.slice(0, 5),
        activities: activities.slice(0, 5),
        performance: performanceData,
        content: {
          stats: [
            {
              label: msg.blogPosts,
              value: totalBlogs.toString(),
              change: "+12%",
              isPositive: true,
              icon: "ion:document-text",
            },
            {
              label: msg.studentProjects,
              value: totalProjects.toString(),
              change: "+8%",
              isPositive: true,
              icon: "ion:rocket",
            },
          ],
          actions: [
            {
              label: msg.writeNewBlog,
              description: msg.contentCreation,
              href: "/admin/blogs",
            },
            {
              label: msg.viewStudentProjects,
              description: msg.portfolioReview,
              href: "/admin/projects",
            },
          ],
        },
      },
      hasData: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    const locale = getLocaleFromHeaders(new Headers());
    const msg = messages[locale];
    
    return NextResponse.json(
      {
        success: false,
        message: msg.failedToFetch,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

function checkIfHasRealData(data: {
  totalStudents: number;
  activeSubscriptions: number;
  totalProjects: number;
  totalBlogs: number;
  recentSubscriptions: any[];
  recentUsers: any[];
  recentProjects: any[];
  weeklySubscriptions: any[];
  userActivity: any[];
}): boolean {
  const {
    totalStudents,
    activeSubscriptions,
    totalProjects,
    totalBlogs,
    recentSubscriptions,
    recentUsers,
    recentProjects,
    weeklySubscriptions,
    userActivity,
  } = data;

  const hasStudents = totalStudents > 0;
  const hasSubscriptions = activeSubscriptions > 0;
  const hasProjects = totalProjects > 0;
  const hasBlogs = totalBlogs > 0;
  const hasRecentSubscriptions = recentSubscriptions.length > 0;
  const hasRecentUsers = recentUsers.length > 0;
  const hasRecentProjects = recentProjects.length > 0;
  const hasWeeklyData = weeklySubscriptions.length > 0;
  const hasUserActivity = userActivity.length > 0;

  return (
    hasStudents ||
    hasSubscriptions ||
    hasProjects ||
    hasBlogs ||
    hasRecentSubscriptions ||
    hasRecentUsers ||
    hasRecentProjects ||
    hasWeeklyData ||
    hasUserActivity
  );
}

function generateRealPerformanceData(
  weeklySubscriptions: any[],
  userActivity: any[],
  locale: 'ar' | 'en' = 'en'
) {
  if (weeklySubscriptions.length === 0 && userActivity.length === 0) {
    return [];
  }

  const msg = messages[locale];
  const daysOfWeek = msg.days;

  if (weeklySubscriptions.length > 0) {
    const performanceData = daysOfWeek.map((day, index) => {
      const mongoDay = index === 0 ? 7 : index;
      const dayData = weeklySubscriptions.find((item) => item._id === mongoDay);

      if (dayData) {
        const subscriptionCount = dayData.count || 0;
        const revenue = dayData.totalRevenue || 0;
        let engagementRate = Math.min(
          100,
          subscriptionCount * 15 + revenue / 10
        );
        engagementRate = Math.max(40, Math.min(95, engagementRate));

        return {
          label: day,
          value: Math.round(engagementRate),
        };
      }

      return {
        label: day,
        value: 0,
      };
    });

    return performanceData;
  }

  if (userActivity.length > 0) {
    const last7Days = getLast7Days(locale);

    const performanceData = last7Days.map((day, index) => {
      const dayData = userActivity.find((item) => item._id === day.date);

      if (dayData) {
        const activeUsers = dayData.activeUsers || 0;
        let engagementRate = Math.min(100, activeUsers * 20);
        engagementRate = Math.max(40, Math.min(95, engagementRate));

        return {
          label: day.label,
          value: Math.round(engagementRate),
        };
      }

      return {
        label: day.label,
        value: 0,
      };
    });

    return performanceData;
  }

  return [];
}

function getLast7Days(locale: 'ar' | 'en' = 'en') {
  const msg = messages[locale];
  const days = [];
  const dayLabels = msg.days;

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    days.push({
      date: date.toISOString().split("T")[0],
      label: dayLabels[date.getDay()],
    });
  }

  return days;
}

function calculateCourseCompletion(subscriptions: any[]): number {
  if (subscriptions.length === 0) return 0;

  const activeSubscriptions = subscriptions.filter(
    (sub) => sub.status === "active"
  );

  if (activeSubscriptions.length === 0) return 0;

  const totalProgress = activeSubscriptions.reduce((sum, sub) => {
    return sum + calculateProgress(sub);
  }, 0);

  const averageProgress = Math.round(
    totalProgress / activeSubscriptions.length
  );

  return Math.max(0, Math.min(100, averageProgress));
}

function formatTimestamp(date: Date, locale: 'ar' | 'en' = 'en'): string {
  const msg = messages[locale];
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return msg.timeAgo.minutes(diffMins);
  } else if (diffHours < 24) {
    return msg.timeAgo.hours(diffHours);
  } else {
    return msg.timeAgo.days(diffDays);
  }
}

function calculateProgress(subscription: any): number {
  if (!subscription.startDate || !subscription.endDate) return 0;

  const start = new Date(subscription.startDate).getTime();
  const end = new Date(subscription.endDate).getTime();
  const now = new Date().getTime();

  if (now >= end) return 100;
  if (now <= start) return 0;

  const total = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.round((elapsed / total) * 100));
}

function mapSubscriptionStatus(status: string): "active" | "pending" | "trial" {
  switch (status) {
    case "active":
      return "active";
    case "pending":
      return "pending";
    default:
      return "trial";
  }
}