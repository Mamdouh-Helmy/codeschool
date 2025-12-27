"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState, useCallback } from "react";
import Logo from "./Logo";
import HeaderLink from "../Header/Navigation/HeaderLink";
import MobileHeaderLink from "../Header/Navigation/MobileHeaderLink";
import Signin from "@/components/Auth/SignIn";
import SignUp from "@/components/Auth/SignUp";
import ProfileModal from "@/components/Auth/ProfileModal";
import { useTheme } from "next-themes";
import { Icon } from "@iconify/react/dist/iconify.js";
import { SuccessfullLogin } from "@/components/Auth/AuthDialog/SuccessfulLogin";
import { FailedLogin } from "@/components/Auth/AuthDialog/FailedLogin";
import { UserRegistered } from "@/components/Auth/AuthDialog/UserRegistered";
import AuthDialogContext from "@/app/context/AuthDialogContext";
import { useLocale } from "@/app/context/LocaleContext";
import { useI18n } from "@/i18n/I18nProvider";
import { useHeaderData } from "@/hooks/useHeaderData";

const DEFAULT_AVATAR = "/images/default-avatar.jpg";

type LocalUser = {
  id?: string;
  name?: string;
  email?: string;
  username?: string;
  role?: string;
  image?: string | null;
  [key: string]: any;
};

// ✅ Cache خارج المكون لمنع إعادة الإنشاء
let userCache: {
  data: LocalUser | null;
  timestamp: number;
} | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 دقيقة

// ✅ Rate limiter لطلبات fetchUser
class UserFetchLimiter {
  private lastFetchTime = 0;
  private isFetching = false;
  private readonly COOLDOWN = 30000; // 30 ثانية بين الطلبات
  
  async fetchWithCooldown(fetchFn: () => Promise<any>): Promise<any> {
    const now = Date.now();
    
    if (this.isFetching) {
      return null;
    }
    
    if (now - this.lastFetchTime < this.COOLDOWN && userCache) {
      return userCache.data;
    }
    
    this.isFetching = true;
    try {
      const result = await fetchFn();
      this.lastFetchTime = now;
      return result;
    } finally {
      this.isFetching = false;
    }
  }
}

const userFetchLimiter = new UserFetchLimiter();

const Header: React.FC = () => {
  const pathUrl = usePathname();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [navbarOpen, setNavbarOpen] = useState(false);
  const [sticky, setSticky] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navbarRef = useRef<HTMLDivElement>(null);
  const signInRef = useRef<HTMLDivElement>(null);
  const signUpRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const { headerData, loading } = useHeaderData();

  // ✅ تحسين handleScroll باستخدام debounce
  const handleScroll = useCallback(() => {
    if (typeof window === 'undefined') return;
    setSticky(window.scrollY >= 80);
  }, []);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (signInRef.current && !signInRef.current.contains(event.target as Node))
      setIsSignInOpen(false);
    if (signUpRef.current && !signUpRef.current.contains(event.target as Node))
      setIsSignUpOpen(false);
    if (profileRef.current && !profileRef.current.contains(event.target as Node))
      setIsProfileOpen(false);
    if (
      mobileMenuRef.current &&
      !mobileMenuRef.current.contains(event.target as Node) &&
      navbarOpen
    )
      setNavbarOpen(false);
  }, [navbarOpen]);

  // ✅ تحسين useEffect مع debounce لـ scroll
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const debouncedHandleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 50);
    };
    
    window.addEventListener("scroll", debouncedHandleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener("scroll", debouncedHandleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [handleScroll, handleClickOutside]);

  const authDialog = useContext(AuthDialogContext);
  const { locale, toggleLocale } = useLocale();
  const { t } = useI18n();

  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const USER_ENDPOINT = "/api/users/me";

  // ✅ Ref لتتبع ما إذا تم جلب البيانات مسبقاً
  const hasFetched = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ تحسين fetchUser مع retry limit و caching
  const fetchUserWithToken = useCallback(async (token: string, retryCount = 0) => {
    if (retryCount > 2) {
      console.error("Max retries reached");
      setFetchError(true);
      return null;
    }

    // ✅ التحقق من الـ cache أولاً
    const now = Date.now();
    if (userCache && now - userCache.timestamp < CACHE_DURATION) {
      setLocalUser(userCache.data);
      return userCache.data;
    }

    try {
      setLoadingUser(true);
      setFetchError(false);

      const res = await fetch(USER_ENDPOINT, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // ✅ إضافة timeout للطلب
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          userCache = null;
          setLocalUser(null);
          return null;
        }
        
        if (retryCount < 2) {
          // ✅ exponential backoff
          const delay = 1000 * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchUserWithToken(token, retryCount + 1);
        }
        
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data?.success && data.user) {
        // ✅ حفظ في الـ cache
        userCache = {
          data: data.user,
          timestamp: now
        };
        
        setLocalUser(data.user);
        setFetchError(false);
        return data.user;
      } else {
        setLocalUser(null);
        localStorage.removeItem("token");
        userCache = null;
        return null;
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      setFetchError(true);
      setLocalUser(null);
      localStorage.removeItem("token");
      userCache = null;
      return null;
    } finally {
      setLoadingUser(false);
    }
  }, []);

  // ✅ تحسين useEffect مع rate limiting
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token || hasFetched.current) {
      return;
    }

    hasFetched.current = true;

    // ✅ استخدام rate limiter
    userFetchLimiter.fetchWithCooldown(async () => {
      return fetchUserWithToken(token);
    });

    // ✅ تنظيف عند unmount
    return () => {
      hasFetched.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchUserWithToken]);

  // ✅ إضافة effect للاستماع لتغيرات localStorage (لتحديث حالة المستخدم)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        setLocalUser(null);
        userCache = null;
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleProfileUpdate = useCallback((updatedUser: LocalUser) => {
    setLocalUser(updatedUser);
    // ✅ تحديث الـ cache
    userCache = {
      data: updatedUser,
      timestamp: Date.now()
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      localStorage.removeItem("token");
      setLocalUser(null);
      userCache = null;
      router.push("/");
    } catch (error) {
      console.error("حدث خطأ أثناء تسجيل الخروج:", error);
    }
  };

  const canAccessPortfolio = localUser &&
    (localUser.role === "student" || localUser.role === "admin" || localUser.role === "marketing");

  return (
    <>
      <div className="relative"></div>
      <header
        className={`fixed h-24 top-0 py-1 z-50 w-full bg-transparent transition-all ${
          sticky
            ? "shadow-lg dark:shadow-darkmd bg-white dark:bg-secondary"
            : "shadow-none"
        }`}
      >
        <div className="container">
          <div className="flex items-center justify-between py-6">
            <Logo />
            {!loading && (
              <ul className="hidden lg:flex flex-grow items-center justify-center gap-6">
                {headerData.map((item, index) => (
                  <HeaderLink key={index} item={item} />
                ))}

                {canAccessPortfolio && (
                  <li>
                    <Link
                      href="/portfolio/builder"
                      className={`text-base font-medium transition-colors duration-200 ${
                        pathUrl === "/portfolio/builder"
                          ? "text-primary"
                          : "text-gray-600 dark:text-gray-300 hover:text-primary"
                      }`}
                    >
                      {t("nav.createPortfolio") || "إنشاء بورتفليو"}
                    </Link>
                  </li>
                )}

                {canAccessPortfolio && localUser?.username && (
                  <li>
                    <Link
                      href={`/portfolio/${localUser.username}`}
                      className={`text-base font-medium transition-colors duration-200 ${
                        pathUrl === `/portfolio/${localUser.username}`
                          ? "text-primary"
                          : "text-gray-600 dark:text-gray-300 hover:text-primary"
                      }`}
                    >
                      {t("nav.myPortfolio") || "بورتفليو"}
                    </Link>
                  </li>
                )}

                {localUser?.role === "admin" && (
                  <li>
                    <Link
                      href="/admin"
                      className={`text-base font-medium transition-colors duration-200 ${
                        pathUrl === "/admin"
                          ? "text-primary"
                          : "text-gray-600 dark:text-gray-300 hover:text-primary"
                      }`}
                    >
                      {t("nav.dashboard")}
                    </Link>
                  </li>
                )}

                {localUser?.role === "marketing" && (
                  <li>
                    <Link
                      href="/marketing/blogs"
                      className={`text-base font-medium transition-colors duration-200 ${
                        pathUrl === "/marketing/blogs"
                          ? "text-primary"
                          : "text-gray-600 dark:text-gray-300 hover:text-primary"
                      }`}
                    >
                      {t("nav.addBlog") || "إضافة مدونة"}
                    </Link>
                  </li>
                )}
              </ul>
            )}

            <div className="flex items-center space-x-4">
              <button
                aria-label="Toggle language"
                onClick={toggleLocale}
                className="text-sm px-3 py-1 rounded border border-slate-300 dark:border-dark_border dark:text-white"
              >
                {locale === "en" ? "العربية" : "English"}
              </button>

              <button
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex h-8 w-8 items-center justify-center text-body-color duration-300 dark:text-white"
              >
                <svg
                  viewBox="0 0 23 23"
                  className={`h-8 w-8 text-dark dark:hidden ${
                    !sticky && pathUrl === "/" && "text-white"
                  }`}
                >
                  <path d="M16.6111 15.855C17.591 15.1394 18.3151 14.1979 18.7723 13.1623C16.4824 13.4065 14.1342 12.4631 12.6795 10.4711C11.2248 8.47905 11.0409 5.95516 11.9705 3.84818C10.8449 3.9685 9.72768 4.37162 8.74781 5.08719C5.7759 7.25747 5.12529 11.4308 7.29558 14.4028C9.46586 17.3747 13.6392 18.0253 16.6111 15.855Z" />
                </svg>

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="hidden dark:block h-4 w-4"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </button>

              {localUser ? (
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center space-x-2 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  <img
                    src={
                      localUser.image && localUser.image.length > 0
                        ? localUser.image
                        : DEFAULT_AVATAR
                    }
                    alt="user avatar"
                    className="h-9 w-9 rounded-full object-cover border-2 border-transparent hover:border-primary transition-all duration-200"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.fallback) {
                        img.src = DEFAULT_AVATAR;
                        img.dataset.fallback = "true";
                      }
                    }}
                  />
                  <span className="hidden lg:block text-sm font-medium dark:text-white">
                    {localUser.name || localUser.email}
                  </span>
                </button>
              ) : (
                <>
                  <Link
                    href="#"
                    className="hidden lg:block btn_outline btn-2 hover-outline-slide-down rounded-lg"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSignInOpen(true);
                    }}
                  >
                    <span className="!py-2 !px-4">{t("header.signIn")}</span>
                  </Link>

                  <Link
                    href="#"
                    className="hidden lg:block btn btn-1 hover-filled-slide-down rounded-lg overflow-hidden"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSignUpOpen(true);
                    }}
                  >
                    <span className="!py-2 !px-4">{t("header.signUp")}</span>
                  </Link>
                </>
              )}

              <button
                onClick={() => setNavbarOpen(!navbarOpen)}
                className="block lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                aria-label="Toggle menu"
              >
                <span
                  className={`block w-6 h-0.5 bg-black dark:bg-white transition-all duration-200 ${
                    navbarOpen ? "rotate-45 translate-y-2" : ""
                  }`}
                ></span>
                <span
                  className={`block w-6 h-0.5 bg-black dark:bg-white mt-1.5 transition-all duration-200 ${
                    navbarOpen ? "opacity-0" : ""
                  }`}
                ></span>
                <span
                  className={`block w-6 h-0.5 bg-black dark:bg-white mt-1.5 transition-all duration-200 ${
                    navbarOpen ? "-rotate-45 -translate-y-2" : ""
                  }`}
                ></span>
              </button>
            </div>
          </div>
        </div>

        {navbarOpen && (
          <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-40" />
        )}

        <div
          ref={mobileMenuRef}
          className={`lg:hidden fixed top-0 right-0 h-full w-full bg-white dark:bg-darkmode shadow-lg transform transition-transform duration-300 max-w-64 ${
            navbarOpen ? "translate-x-0" : "translate-x-full"
          } z-50`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-black dark:text-SlateBlueText">
              {t("header.menu")}
            </h2>
            <button
              onClick={() => setNavbarOpen(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className="dark:text-SlateBlueText"
              >
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col items-start p-4">
            {!loading &&
              headerData.map((item, index) => (
                <MobileHeaderLink key={index} item={item} />
              ))}

            {canAccessPortfolio && (
              <Link
                href="/portfolio/builder"
                onClick={() => setNavbarOpen(false)}
                className="block w-full text-left text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              >
                {t("nav.createPortfolio") || "إنشاء بورتفليو"}
              </Link>
            )}

            {canAccessPortfolio && localUser?.username && (
              <Link
                href={`/portfolio/${localUser.username}`}
                onClick={() => setNavbarOpen(false)}
                className="block w-full text-left text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              >
                {t("nav.myPortfolio") || "بورتفليو"}
              </Link>
            )}

            {localUser?.role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setNavbarOpen(false)}
                className="block w-full text-left text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              >
                {t("nav.dashboard")}
              </Link>
            )}

            {localUser?.role === "marketing" && (
              <Link
                href="/marketing/blogs"
                onClick={() => setNavbarOpen(false)}
                className="block w-full text-left text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
              >
                {t("nav.addBlog") || "إضافة مدونة"}
              </Link>
            )}

            <div className="mt-4 flex flex-col space-y-4 w-full">
              {!localUser ? (
                <>
                  <button
                    className="bg-transparent border border-primary text-primary px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200"
                    onClick={() => {
                      setIsSignInOpen(true);
                      setNavbarOpen(false);
                    }}
                  >
                    {t("header.signIn")}
                  </button>
                  <button
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200"
                    onClick={() => {
                      setIsSignUpOpen(true);
                      setNavbarOpen(false);
                    }}
                  >
                    {t("header.signUp")}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <img
                      src={
                        localUser.image && localUser.image.length > 0
                          ? localUser.image
                          : DEFAULT_AVATAR
                      }
                      alt="user avatar"
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.fallback) {
                          img.src = DEFAULT_AVATAR;
                          img.dataset.fallback = "true";
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {localUser.name || localUser.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {localUser.email}
                      </p>
                    </div>
                  </div>

                  <button
                    className="bg-transparent border border-primary text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-all duration-200"
                    onClick={() => {
                      setIsProfileOpen(true);
                      setNavbarOpen(false);
                    }}
                  >
                    {t("header.profile")}
                  </button>
                  <button
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200"
                    onClick={() => {
                      handleSignOut();
                      setNavbarOpen(false);
                    }}
                  >
                    {t("header.signOut")}
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>

        <div
          className={`fixed top-6 end-1/2 translate-x-1/2 z-50 transition-all duration-300 ${
            authDialog?.isSuccessDialogOpen
              ? "opacity-100 transform translate-y-0"
              : "opacity-0 transform -translate-y-4 pointer-events-none"
          }`}
        >
          <SuccessfullLogin />
        </div>
        <div
          className={`fixed top-6 end-1/2 translate-x-1/2 z-50 transition-all duration-300 ${
            authDialog?.isFailedDialogOpen
              ? "opacity-100 transform translate-y-0"
              : "opacity-0 transform -translate-y-4 pointer-events-none"
          }`}
        >
          <FailedLogin />
        </div>
        <div
          className={`fixed top-6 end-1/2 translate-x-1/2 z-50 transition-all duration-300 ${
            authDialog?.isUserRegistered
              ? "opacity-100 transform translate-y-0"
              : "opacity-0 transform -translate-y-4 pointer-events-none"
          }`}
        >
          <UserRegistered />
        </div>
      </header>

      {isSignInOpen && (
        <div
          ref={signInRef}
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg bg-white px-8 py-14 text-center dark:bg-darklight">
            <button
              onClick={() => setIsSignInOpen(false)}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full absolute -top-5 -right-3 mr-8 mt-8"
            >
              <Icon
                icon="ic:round-close"
                className="text-2xl dark:text-white"
              />
            </button>
            <Signin
              signInOpen={(value: boolean) => setIsSignInOpen(value)}
              onSuccess={(userData) => {
                setLocalUser(userData);
                // ✅ تحديث الـ cache
                userCache = {
                  data: userData,
                  timestamp: Date.now()
                };
              }}
            />
          </div>
        </div>
      )}

      {isSignUpOpen && (
        <div
          ref={signUpRef}
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg bg-white px-8 py-14 text-center dark:bg-darklight">
            <button
              onClick={() => setIsSignUpOpen(false)}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full absolute -top-5 -right-3 mr-8 mt-8"
            >
              <Icon
                icon="ic:round-close"
                className="text-2xl dark:text-white"
              />
            </button>
            <SignUp
              signUpOpen={(value: boolean) => setIsSignUpOpen(value)}
              onSuccess={(userData) => {
                setLocalUser(userData);
                // ✅ تحديث الـ cache
                userCache = {
                  data: userData,
                  timestamp: Date.now()
                };
              }}
            />
          </div>
        </div>
      )}

      {isProfileOpen && (
        <div
          ref={profileRef}
          className="fixed inset-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg bg-white px-8 py-14 text-center dark:bg-darklight">
            <button
              onClick={() => setIsProfileOpen(false)}
              className="hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full absolute -top-5 -right-3 mr-8 mt-8"
            >
              <Icon
                icon="ic:round-close"
                className="text-2xl dark:text-white"
              />
            </button>
            <ProfileModal
              onClose={() => setIsProfileOpen(false)}
              onProfileUpdate={handleProfileUpdate}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Header;