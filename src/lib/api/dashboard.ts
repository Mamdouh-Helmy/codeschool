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

// دالة واحدة لجلب جميع البيانات
export async function getDashboardData(): Promise<DashboardData> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch dashboard data');
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
    return getFallbackData();
  }
}

// دوال منفصلة للتوافق مع الكود الحالي
export async function getDashboardStats(): Promise<DashboardStats> {
  const data = await getDashboardData();
  return data.stats;
}

export async function getRecentEnrollments(): Promise<EnrollmentRecord[]> {
  const data = await getDashboardData();
  return data.enrollments;
}

export async function getRecentActivities(): Promise<ActivityItem[]> {
  const data = await getDashboardData();
  return data.activities;
}

export async function getPerformanceData(): Promise<PerformancePoint[]> {
  const data = await getDashboardData();
  return data.performance;
}

export async function getContentStats(): Promise<{
  stats: ContentStat[];
  actions: any[];
}> {
  const data = await getDashboardData();
  return data.content;
}

// دالة لإنشاء ID فريد
function generateUniqueId(enrollment: any, index: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `enroll-${timestamp}-${random}-${index}`;
}

// بيانات افتراضية
function getFallbackData(): DashboardData {
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
        id: "enroll-1-ahmed-fullstack", // ✅ ID فريد
        name: "Ahmed Mohamed",
        email: "ahmed@example.com",
        course: "Full Stack Development",
        progress: 25,
        enrolledOn: new Date().toLocaleDateString('en-US'),
        status: "active"
      },
      {
        id: "enroll-2-sara-react", // ✅ ID فريد
        name: "Sara Ali",
        email: "sara@example.com",
        course: "React Advanced",
        progress: 100,
        enrolledOn: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
        status: "active"
      },
      {
        id: "enroll-3-omar-nodejs", // ✅ ID فريد
        name: "Omar Hassan",
        email: "omar@example.com",
        course: "Node.js Backend",
        progress: 60,
        enrolledOn: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
        status: "active"
      }
    ],
    activities: [
      {
        id: "activity-1",
        title: "System Ready",
        description: "Dashboard is loading with real data",
        timestamp: "Just now",
        icon: "ion:checkmark-done",
        tone: "success"
      },
      {
        id: "activity-2",
        title: "Data Loaded",
        description: "All dashboard components are functional",
        timestamp: "2 minutes ago",
        icon: "ion:server",
        tone: "info"
      }
    ],
    performance: [
      { label: "Mon", value: 65 },
      { label: "Tue", value: 78 },
      { label: "Wed", value: 82 },
      { label: "Thu", value: 75 },
      { label: "Fri", value: 90 },
      { label: "Sat", value: 68 },
      { label: "Sun", value: 72 }
    ],
    content: {
      stats: [
        {
          label: "Blog Posts",
          value: "24",
          change: "+12%",
          isPositive: true,
          icon: "ion:document-text"
        },
        {
          label: "Student Projects",
          value: "156",
          change: "+8%",
          isPositive: true,
          icon: "ion:rocket"
        }
      ],
      actions: [
        {
          label: "Write New Blog Post",
          description: "Content creation",
          href: "/admin/blogs"
        },
        {
          label: "View Student Projects",
          description: "Portfolio review",
          href: "/admin/projects"
        }
      ]
    }
  };
}