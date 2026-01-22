"use client";

import { useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import PrimarySidebar, { type DashboardNavItem, type CategoryItem } from "./PrimarySidebar";
import SecondarySidebar from "./SecondarySidebar";
import TopBar from "./TopBar";
import { useI18n } from "@/i18n/I18nProvider";
import { useLocale } from "@/app/context/LocaleContext";

const createBadge = (value: string) => (
  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
    {value}
  </span>
);

const DashboardLayout = ({ children, user }: { children: ReactNode; user?: any }) => {
  const { t } = useI18n();
  const { locale } = useLocale();
  const pathname = usePathname();
  const [isPrimarySidebarOpen, setPrimarySidebarOpen] = useState(false);
  const [isSecondarySidebarOpen, setSecondarySidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const isRTL = locale === "ar";

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    // Check on mount
    checkMobile();

    // Add event listener for resize
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-close sidebars on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setPrimarySidebarOpen(false);
      setSecondarySidebarOpen(false);
    }
  }, [pathname, isMobile]);

  const NAVIGATION_CATEGORIES: CategoryItem[] = useMemo(() => [
    {
      id: "content",
      label: t('dashboard.content') || "Content Management",
      icon: "ion:document-text-outline",
      items: [
        { label: t('dashboard.overview') || "Overview", href: "/admin", icon: "ion:speedometer-outline" },
        {
          label: t('dashboard.webinars') || "Webinars",
          href: "/admin/webinars",
          icon: "ion:videocam-outline",
          badge: createBadge(t('common.new') || "New"),
        },
        {
          label: t('dashboard.projects') || "Projects",
          href: "/admin/projects",
          icon: "ion:briefcase-outline",
        },
        {
          label: t('dashboard.blogs') || "Blogs",
          href: "/admin/blogs",
          icon: "ion:newspaper-outline",
        },
        {
          label: t('dashboard.events') || "Events",
          href: "/admin/events",
          icon: "ion:calendar-outline",
        },
        {
          label: t('dashboard.testimonials') || "Testimonials",
          href: "/admin/Testimonials",
          icon: "ion:chatbubbles-outline",
        },
        {
          label: t('dashboard.sectionImages') || "Section Images",
          href: "/admin/sectionImages",
          icon: "ion:images-outline",
          badge: createBadge(t('common.new') || "New"),
        },
        {
          label: t('dashboard.sectionImagesHero') || "Hero Images",
          href: "/admin/sectionImagesHero",
          icon: "ion:images-outline",
          badge: createBadge(t('common.new') || "New"),
        },
      ]
    },
    {
      id: "learning",
      label: t('dashboard.learning') || "Learning Management",
      icon: "ion:school-outline",
      items: [
        {
          label: t('nav.curriculum') || "Curriculum",
          href: "/admin/curriculum",
          icon: "ion:school-outline",
          badge: createBadge(t('common.new') || "New"),
        },
        {
          label: t('dashboard.courses') || "Courses",
          href: "/admin/courses",
          icon: "ion:book-outline",
          badge: createBadge(t('common.new') || "New"),
        },
        {
          label: t('dashboard.groups') || "Groups",
          href: "/admin/groups",
          icon: "ion:people-outline",
          badge: createBadge(t('common.new') || "New"),
        },
        {
          label: t('nav.schedules') || "Schedules",
          href: "/admin/schedules",
          icon: "ion:time-outline",
        },
      ]
    },
    {
      id: "users",
      label: t('dashboard.users') || "User Management",
      icon: "ion:people-outline",
      items: [
        {
          label: t('dashboard.students') || "Students",
          href: "/admin/allStudents",
          icon: "ion:person-outline",
          badge: createBadge(t('common.new') || "New"),
        },
        {
          label: t('dashboard.instructors') || "Instructors",
          href: "/admin/InstructorsPage",
          icon: "ion:people-outline",
          badge: createBadge(t('common.new') || "New"),
        },
      ]
    },
    {
      id: "subscriptions",
      label: t('dashboard.subscriptions') || "Subscriptions",
      icon: "ion:card-outline",
      items: [
        {
          label: t('nav.pricing') || "Pricing",
          href: "/admin/pricing",
          icon: "ion:cash-outline",
        },
        {
          label: t('nav.subscriptions') || "Subscriptions",
          href: "/admin/subscriptions",
          icon: "ion:card-outline",
        },
      ]
    },
    {
      id: "communication",
      label: t('dashboard.communication') || "Communication",
      icon: "ion:chatbubble-outline",
      items: [
        {
          label: t('dashboard.contacts') || "Contacts",
          href: "/admin/ContactsPage",
          icon: "ion:chatbubble-ellipses-outline",
          badge: createBadge(t('common.new') || "New"),
        },
        {
          label: t('nav.newsletter') || "Newsletter",
          href: "/admin/newsletter",
          icon: "ion:mail-outline",
          badge: createBadge(t('common.new') || "New"),
        },
        {
          label: t('nav.blogSubscribers') || "Blog Subscribers",
          href: "/admin/blog-subscribers",
          icon: "ion:newspaper-outline",
          badge: createBadge(t('common.new') || "New"),
        },
      ]
    },
    {
      id: "system",
      label: t('dashboard.system') || "System",
      icon: "ion:settings-outline",
      items: [
        {
          label: t('nav.homepage') || "Home",
          href: "/",
          icon: "ion:home-outline",
        },
        {
          label: t('nav.settings') || "Settings",
          href: "/admin/settings",
          icon: "ion:settings-outline",
        },
      ]
    }
  ], [t]);

  // Flatten all items for active path detection
  const ALL_ITEMS: DashboardNavItem[] = useMemo(() => {
    return NAVIGATION_CATEGORIES.flatMap(category => category.items);
  }, [NAVIGATION_CATEGORIES]);

  const activePath = useMemo(() => {
    if (!pathname) return null;

    let bestMatch = ALL_ITEMS[0];

    for (const item of ALL_ITEMS) {
      if (pathname === item.href) {
        return item.href;
      }

      if (
        pathname.startsWith(item.href + "/") &&
        item.href.length > bestMatch.href.length
      ) {
        bestMatch = item;
      }
    }

    return bestMatch.href;
  }, [pathname, ALL_ITEMS]);

  // Find active category based on active path
  const currentCategory = useMemo(() => {
    if (!activePath) return null;

    for (const category of NAVIGATION_CATEGORIES) {
      if (category.items.some((item: DashboardNavItem) => item.href === activePath)) {
        return category.id;
      }
    }

    return null;
  }, [activePath, NAVIGATION_CATEGORIES]);

  // Set initial active category based on current path
  useEffect(() => {
    if (currentCategory && !isMobile) {
      setActiveCategory(currentCategory);
      setSecondarySidebarOpen(true);
    }
  }, [currentCategory, isMobile]);

  const handleCategoryClick = (categoryId: string) => {
    if (isMobile) {
      setActiveCategory(categoryId);
      setSecondarySidebarOpen(true);
      setPrimarySidebarOpen(false);
    } else {
      if (activeCategory === categoryId) {
        setSecondarySidebarOpen(!isSecondarySidebarOpen);
      } else {
        setActiveCategory(categoryId);
        setSecondarySidebarOpen(true);
      }
    }
  };

  const selectedCategory = useMemo(() => {
    return NAVIGATION_CATEGORIES.find(cat => cat.id === activeCategory);
  }, [activeCategory, NAVIGATION_CATEGORIES]);

  // Handle window resize effect
  useEffect(() => {
    if (!isMobile) {
      setPrimarySidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <div className={`min-h-screen bg-slate-100 text-slate-900 dark:bg-darkmode dark:text-white ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="flex min-h-screen w-full">
        {/* Primary Sidebar - Shows Categories */}
        <PrimarySidebar
          categories={NAVIGATION_CATEGORIES}
          activeCategory={activeCategory}
          isOpen={isPrimarySidebarOpen}
          onClose={() => setPrimarySidebarOpen(false)}
          onCategoryClick={handleCategoryClick}
          isMobile={isMobile}
          isRTL={isRTL}
        />

        {/* Secondary Sidebar - Shows Items of Selected Category */}
        {selectedCategory && (
          <SecondarySidebar
            category={selectedCategory}
            activePath={activePath}
            isOpen={isSecondarySidebarOpen}
            onClose={() => {
              setSecondarySidebarOpen(false);
              if (isMobile) setActiveCategory(null);
            }}
            currentCategory={currentCategory}
            isMobile={isMobile}
            isRTL={isRTL}
          />
        )}

        {/* Main Content Area */}
        <div className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${!isMobile && isSecondarySidebarOpen && activeCategory
            ? isRTL ? 'lg:mr-[17rem]' : 'lg:ml-[17rem]'
            : ''
          }`}>
          <TopBar
            onMenuClick={() => setPrimarySidebarOpen(true)}
            user={user}
            showSecondaryToggle={activeCategory !== null && !isMobile}
            onSecondaryToggle={() => setSecondarySidebarOpen(!isSecondarySidebarOpen)}
            isRTL={isRTL}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;