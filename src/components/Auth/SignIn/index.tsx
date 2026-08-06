"use client";
import Link from "next/link";
import { useState, useContext } from "react";
import { signIn, getSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import Logo from "@/components/Layout/Header/Logo";
import Loader from "@/components/Common/Loader";
import AuthDialogContext from "@/app/context/AuthDialogContext";
import SocialSignIn from "../SocialSignIn";
import { useI18n } from "@/i18n/I18nProvider";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string) => {
  if (!email || !email.trim()) return "auth.validation.required";
  if (!emailRegex.test(email.trim())) return "auth.validation.invalidEmail";
  return "";
};

const validatePassword = (password: string) => {
  if (!password) return "auth.validation.required";
  if (password.length < 6) return "auth.validation.shortPassword";
  return "";
};

type SigninProps = {
  signInOpen: (value: boolean) => void;
  onSuccess: (userData: any) => void;
};

const Signin: React.FC<SigninProps> = ({ signInOpen, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const authDialog = useContext(AuthDialogContext);
  const { t } = useI18n();

  const handleChangeEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: validateEmail(value) || "" }));
  };

  const handleChangePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: validatePassword(value) || "" }));
  };

  const validateAll = () => {
    const emailError = validateEmail(email);
    const passError = validatePassword(password);
    const newErrors: { email?: string; password?: string } = {};
    if (emailError) newErrors.email = emailError;
    if (passError) newErrors.password = passError;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validateAll()) return;

    setLoading(true);
    try {
      // ✅ بقينا بنستخدم next-auth signIn بدل ما نكلم /api/auth/login مباشرة
      // عشان الـ session تتحدث فورًا في كل مكان (useSession) وميحصلش تعارض
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      setLoading(false);

      if (!result || result.error) {
        toast.error(t("auth.loginFailed"));
        authDialog?.setIsFailedDialogOpen(true);
        setTimeout(() => authDialog?.setIsFailedDialogOpen(false), 1100);
        return;
      }

      // toast.success(t("auth.loginSuccess"));
      authDialog?.setIsSuccessDialogOpen(true);
      setTimeout(() => authDialog?.setIsSuccessDialogOpen(false), 1100);

      // ✅ نجيب الـ session المحدثة من next-auth عشان نعرف بيانات المستخدم والـ role
      const session = await getSession();

      // تحديث بيانات المستخدم
      if (onSuccess && session?.user) {
        onSuccess(session.user);
      }

      setTimeout(() => {
        signInOpen && signInOpen(false);
        if (session?.user?.role === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }
      }, 600);
    } catch (err) {
      setLoading(false);
      console.error(err);
      toast.error(t("common.error"));
      authDialog?.setIsFailedDialogOpen(true);
      setTimeout(() => authDialog?.setIsFailedDialogOpen(false), 1100);
    }
  };

  return (
    <>
      <div className="mb-10 text-center mx-auto inline-block max-w-[160px]">
        <Logo />
      </div>

      <SocialSignIn />

      <span className="relative my-8 block text-center">
        <span className="absolute left-0 top-1/2 block h-px w-full bg-border dark:bg-dark_border"></span>
        <span className="relative z-10 inline-block bg-white dark:bg-darklight px-3 text-base dark:bg-dark">
          {t("auth.signInWith")}
        </span>
        <Toaster />
      </span>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-[22px]">
          <input
            type="email"
            placeholder={t("auth.email")}
            required
            value={email}
            onChange={handleChangeEmail}
            className={`w-full rounded-md border border-border dark:border-dark_border bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary dark:text-white dark:focus:border-primary ${
              errors.email ? "border-red-500" : ""
            }`}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{t(errors.email)}</p>
          )}
        </div>

        <div className="mb-[22px]">
          <input
            type="password"
            placeholder={t("auth.password")}
            required
            value={password}
            onChange={handleChangePassword}
            className={`w-full rounded-md border border-border dark:border-dark_border bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary dark:text-white dark:focus:border-primary ${
              errors.password ? "border-red-500" : ""
            }`}
          />
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">{t(errors.password)}</p>
          )}
        </div>

        <div className="mb-9">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md bg-primary px-5 py-3 text-base text-white transition duration-300 ease-in-out hover:!bg-darkprimary disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader />
                <span className="pl-2">{t("auth.signingIn")}</span>
              </>
            ) : (
              t("auth.signIn")
            )}
          </button>
        </div>
      </form>

      <p className="text-body-secondary text-base">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="text-primary hover:underline">
          {t("auth.signUp")}
        </Link>
      </p>
    </>
  );
};

export default Signin;