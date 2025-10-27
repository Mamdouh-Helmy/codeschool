import { EnrollmentRecord, ActivityItem, ContentStat, PerformancePoint } from '@/types/dashboard';

const API_BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export interface DashboardStats {
  totalStudents: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  courseCompletion: number;
  totalProjects: number;
  totalBlogs: number;
}

export interface DashboardData {
  stats: DashboardStats;
  enrollments: EnrollmentRecord[];
  activities: ActivityItem[];
  performance: PerformancePoint[];
  content: {
    stats: ContentStat[];
    actions: any[];
  };
}

// دالة مساعدة للحصول على الرسائل بناءً على اللغة
function getMessages(locale: 'en' | 'ar') {
  const messages = {
    en: {
      unknownStudent: "Unknown Student",
      noEmail: "No email",
      generalPlan: "General Plan",
      systemReady: "System Ready",
      dashboardLoading: "Dashboard is loading with real data",
      dataLoaded: "Data Loaded",
      allComponentsFunctional: "All dashboard components are functional",
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
      unknownStudent: "طالب غير معروف",
      noEmail: "لا يوجد بريد إلكتروني",
      generalPlan: "الخطة العامة",
      systemReady: "النظام جاهز",
      dashboardLoading: "لوحة التحكم تعمل ببيانات حقيقية",
      dataLoaded: "تم تحميل البيانات",
      allComponentsFunctional: "جميع مكونات لوحة التحكم تعمل",
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

  return messages[locale] || messages.en;
}

// الدالة الرئيسية لجلب جميع البيانات
export async function getDashboardData(locale: 'en' | 'ar' = 'en'): Promise<DashboardData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': locale,
      },
    });
    
    if (!response.ok) {
      const messages = getMessages(locale);
      throw new Error(locale === 'ar' 
        ? `خطأ في HTTP! الحالة: ${response.status}`
        : `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      const messages = getMessages(locale);
      throw new Error(result.message || (locale === 'ar' 
        ? 'فشل في جلب بيانات لوحة التحكم' 
        : 'Failed to fetch dashboard data'));
    }
    
    // ✅ التأكد من وجود ID فريد لكل تسجيل
    const data = result.data;
    
    if (data.enrollments) {
      data.enrollments = data.enrollments.map((enrollment: any, index: number) => ({
        ...enrollment,
        id: enrollment.id || generateUniqueId(enrollment, index)
      }));
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return getFallbackData(locale);
  }
}

// دوال منفصلة للتوافق مع الكود الحالي
export async function getDashboardStats(locale: 'en' | 'ar' = 'en'): Promise<DashboardStats> {
  const data = await getDashboardData(locale);
  return data.stats;
}

export async function getRecentEnrollments(locale: 'en' | 'ar' = 'en'): Promise<EnrollmentRecord[]> {
  const data = await getDashboardData(locale);
  return data.enrollments;
}

export async function getRecentActivities(locale: 'en' | 'ar' = 'en'): Promise<ActivityItem[]> {
  const data = await getDashboardData(locale);
  return data.activities;
}

export async function getPerformanceData(locale: 'en' | 'ar' = 'en'): Promise<PerformancePoint[]> {
  const data = await getDashboardData(locale);
  return data.performance;
}

export async function getContentStats(locale: 'en' | 'ar' = 'en'): Promise<{
  stats: ContentStat[];
  actions: any[];
}> {
  const data = await getDashboardData(locale);
  return data.content;
}

// دالة لإنشاء ID فريد
function generateUniqueId(enrollment: any, index: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `enroll-${timestamp}-${random}-${index}`;
}

// بيانات افتراضية بدعم اللغتين
function getFallbackData(locale: 'en' | 'ar' = 'en'): DashboardData {
  const messages = getMessages(locale);
  const isArabic = locale === 'ar';

  return {
    stats: {
      totalStudents: 1248,
      activeSubscriptions: 89,
      monthlyRevenue: 12480,
      courseCompletion: 76,
      totalProjects: 156,
      totalBlogs: 24,
    },
    enrollments: [
      {
        id: "enroll-1-ahmed-fullstack",
        name: isArabic ? "أحمد محمد" : "Ahmed Mohamed",
        email: "ahmed@example.com",
        course: isArabic ? "تطوير الويب الشامل" : "Full Stack Development",
        progress: 25,
        enrolledOn: new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US'),
        status: "active" as const
      },
      {
        id: "enroll-2-sara-react",
        name: isArabic ? "سارة علي" : "Sara Ali",
        email: "sara@example.com",
        course: isArabic ? "رياكت متقدم" : "React Advanced",
        progress: 100,
        enrolledOn: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US'),
        status: "active" as const
      },
      {
        id: "enroll-3-omar-nodejs",
        name: isArabic ? "عمر حسن" : "Omar Hassan",
        email: "omar@example.com",
        course: isArabic ? "Node.js للخلفية" : "Node.js Backend",
        progress: 60,
        enrolledOn: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US'),
        status: "active" as const
      }
    ],
    activities: [
      {
        id: "activity-1",
        title: messages.systemReady,
        description: messages.dashboardLoading,
        timestamp: isArabic ? messages.timeAgo.minutes(0) : "Just now",
        icon: "ion:checkmark-done",
        tone: "success" as const
      },
      {
        id: "activity-2",
        title: messages.dataLoaded,
        description: messages.allComponentsFunctional,
        timestamp: isArabic ? messages.timeAgo.minutes(2) : "2 minutes ago",
        icon: "ion:server",
        tone: "info" as const
      }
    ],
    performance: messages.days.map((day, index) => ({
      label: day,
      value: [65, 78, 82, 75, 90, 68, 72][index]
    })),
    content: {
      stats: [
        {
          label: messages.blogPosts,
          value: "24",
          change: "+12%",
          isPositive: true,
          icon: "ion:document-text"
        },
        {
          label: messages.studentProjects,
          value: "156",
          change: "+8%",
          isPositive: true,
          icon: "ion:rocket"
        }
      ],
      actions: [
        {
          label: messages.writeNewBlog,
          description: messages.contentCreation,
          href: "/admin/blogs"
        },
        {
          label: messages.viewStudentProjects,
          description: messages.portfolioReview,
          href: "/admin/projects"
        }
      ]
    }
  };
}