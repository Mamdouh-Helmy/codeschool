// app/marketing/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LocalUser = {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
  role?: string;
  image?: string | null;
  [key: string]: any;
};

type Blog = {
  id: string;
  title: string;
  views: number;
  likes: number;
  status: "published" | "draft" | "scheduled";
  publishDate: string;
};

type Campaign = {
  id: string;
  name: string;
  type: "email" | "social" | "ad";
  budget: number;
  clicks: number;
  conversions: number;
  status: "active" | "paused" | "completed";
};

export default function MarketingDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [blogs, setBlogs] = useState<Blog[]>([
    { id: "1", title: "أفضل 10 أدوات لتطوير الويب في 2024", views: 1245, likes: 89, status: "published", publishDate: "2024-01-15" },
    { id: "2", title: "كيف تبدأ في تعلم React.js", views: 892, likes: 67, status: "published", publishDate: "2024-01-10" },
    { id: "3", title: "أساسيات التسويق الرقمي", views: 567, likes: 45, status: "draft", publishDate: "2024-01-20" },
    { id: "4", title: "تحسين محركات البحث للمبتدئين", views: 0, likes: 0, status: "scheduled", publishDate: "2024-01-25" },
  ]);

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: "1", name: "كامبين الدورات الجديدة", type: "email", budget: 5000, clicks: 1245, conversions: 89, status: "active" },
    { id: "2", name: "إعلانات فيسبوك", type: "ad", budget: 3000, clicks: 2341, conversions: 156, status: "active" },
    { id: "3", name: "تغريدات ترويجية", type: "social", budget: 1500, clicks: 987, conversions: 67, status: "paused" },
    { id: "4", name: "نشرة إخبارية", type: "email", budget: 2000, clicks: 0, conversions: 0, status: "completed" },
  ]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/signin");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("فشل في جلب بيانات المستخدم");
        }

        const data = await res.json();
        if (data.success && data.user) {
          if (data.user.role !== "marketing") {
            router.push("/");
            return;
          }
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error:", error);
        router.push("/signin");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalViews = blogs.reduce((sum, blog) => sum + blog.views, 0);
  const totalLikes = blogs.reduce((sum, blog) => sum + blog.likes, 0);
  const publishedBlogs = blogs.filter(b => b.status === "published").length;
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const totalBudget = campaigns.reduce((sum, campaign) => sum + campaign.budget, 0);
  const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-darkmode">
      {/* Dashboard Header */}
      <div className="bg-white dark:bg-secondary shadow">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                لوحة تحكم التسويق
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                مرحباً بك، {user.name || user.email}
              </p>
            </div>
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <span className="px-3 py-1 bg-pink-600/10 text-pink-600 dark:text-pink-400 rounded-full text-sm">
                تسويق
              </span>
              <Link
                href="/"
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                العودة للرئيسية
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">إجمالي المشاهدات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{totalViews.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">المدونات المنشورة</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{publishedBlogs}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.801 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">نقرات الحملات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{totalClicks.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">ميزانية الحملات</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{totalBudget.toLocaleString()} ريال</h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* المدونات */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                المدونات الأخيرة
              </h3>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <Link
                  href="/marketing/blogs"
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  عرض الكل
                </Link>
                <Link
                  href="/marketing/blogs/create"
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm"
                >
                  إنشاء مدونة
                </Link>
              </div>
            </div>
            
            <div className="space-y-4">
              {blogs.map((blog) => (
                <div key={blog.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white line-clamp-1">{blog.title}</h4>
                      <div className="flex items-center space-x-4 rtl:space-x-reverse mt-2">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{blog.views.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{blog.likes}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          blog.status === "published" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : blog.status === "draft"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {blog.status === "published" ? "منشور" : blog.status === "draft" ? "مسودة" : "مجدول"}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/marketing/blogs/${blog.id}`}
                      className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm"
                    >
                      تعديل
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* الحملات */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                الحملات التسويقية
              </h3>
              <Link
                href="/marketing/campaigns/create"
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm"
              >
                إنشاء حملة
              </Link>
            </div>
            
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{campaign.name}</h4>
                      <div className="flex items-center space-x-4 rtl:space-x-reverse mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          campaign.status === "active" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : campaign.status === "paused"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                        }`}>
                          {campaign.status === "active" ? "نشط" : campaign.status === "paused" ? "متوقف" : "مكتمل"}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {campaign.type === "email" ? "بريد إلكتروني" : campaign.type === "social" ? "تواصل اجتماعي" : "إعلان"}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/marketing/campaigns/${campaign.id}`}
                      className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 text-sm"
                    >
                      التفاصيل
                    </Link>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">الميزانية</p>
                      <p className="font-medium text-gray-900 dark:text-white">{campaign.budget.toLocaleString()} ريال</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">النقرات</p>
                      <p className="font-medium text-gray-900 dark:text-white">{campaign.clicks.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">التحويلات</p>
                      <p className="font-medium text-gray-900 dark:text-white">{campaign.conversions}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* التحليلات والإجراءات السريعة */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* التحليلات */}
          <div className="lg:col-span-2 bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              التحليلات
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">أداء المدونات</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>معدل التفاعل</span>
                      <span>4.2%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>وقت القراءة</span>
                      <span>3.5 دقائق</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>معدل المشاركة</span>
                      <span>12%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '12%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">أداء الحملات</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>معدل التحويل</span>
                      <span>7.1%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-pink-600 h-2 rounded-full" style={{ width: '71%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>تكلفة التحويل</span>
                      <span>56 ريال</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-red-600 h-2 rounded-full" style={{ width: '56%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>عائد الاستثمار</span>
                      <span>248%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* الإجراءات السريعة */}
          <div className="bg-white dark:bg-secondary rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              الإجراءات السريعة
            </h3>
            <div className="space-y-3">
              <Link
                href="/marketing/blogs/create"
                className="flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <span className="text-gray-700 dark:text-gray-300">إنشاء مدونة جديدة</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">كتابة وإعداد محتوى جديد</p>
                </div>
              </Link>

              <Link
                href="/marketing/campaigns/create"
                className="flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <span className="text-gray-700 dark:text-gray-300">بدء حملة جديدة</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">إطلاق حملة تسويقية</p>
                </div>
              </Link>

              <Link
                href="/marketing/analytics"
                className="flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-gray-700 dark:text-gray-300">عرض التحليلات</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">تحليل أداء التسويق</p>
                </div>
              </Link>

              <Link
                href="/marketing/schedule"
                className="flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-gray-700 dark:text-gray-300">جدولة محتوى</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">برمجة النشر المستقبلي</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}