// components/Auth/SignUp.js (معدل)
"use client";
import React, { useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SocialSignUp from "../SocialSignUp";
import Logo from "@/components/Layout/Header/Logo";
import Loader from "@/components/Common/Loader";
import AuthDialogContext from "@/app/context/AuthDialogContext";
import { useI18n } from "@/i18n/I18nProvider";

const SignUp = ({ signUpOpen }) => {
  const router = useRouter();
  const authDialog = useContext(AuthDialogContext);
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: بيانات الأساسية، 2: التحقق
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  // دالة إرسال رمز التحقق
  const sendVerificationCode = async () => {
    if (!form.email) {
      toast.error(t("auth.validation.requiredEmail"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const result = await res.json();

      if (result.success) {
        setOtpSent(true);
        setStep(2);
        toast.success(t("auth.verificationSent"));

        // تفعيل عداد إعادة الإرسال
        setCanResend(false);
        setResendTimer(60);
        const timer = setInterval(() => {
          setResendTimer((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast.error(result.message || t("auth.verificationFailed"));
      }
    } catch (error) {
      toast.error(t("auth.verificationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!form.otp || form.otp.length !== 6) {
      toast.error(t("auth.validation.invalidOtp"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          otp: form.otp,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(t("auth.emailVerified"));
       
        setTimeout(async () => {
          await completeRegistration();
        }, 500);
      } else {
        toast.error(result.message || t("auth.invalidOtp"));
        setLoading(false);
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error(t("auth.verificationFailed"));
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
         
          toast.error(
            "هذا البريد الإلكتروني مسجل بالفعل. حاول تسجيل الدخول بدلاً من ذلك."
          );
          setTimeout(() => {
            router.push("/signin");
          }, 2000);
        } else if (res.status === 400) {
          toast.error(
            result.message || "لم يتم التحقق من البريد الإلكتروني بعد"
          );
          setCanResend(true);
          setResendTimer(0);
        } else {
          toast.error(result.message || t("auth.registrationFailed"));
        }
        setLoading(false);
        return;
      }

      if (result.success) {
        toast.success(t("auth.registrationSuccess"));
        if (signUpOpen) signUpOpen(false);

        authDialog?.setIsUserRegistered(true);
        setTimeout(() => authDialog?.setIsUserRegistered(false), 1500);

        setTimeout(() => router.push("/"), 1200);
      } else {
        toast.error(result.message || t("auth.registrationFailed"));
        setLoading(false);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(t("auth.registrationFailed"));
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 1) {
      // التحقق من البيانات الأساسية أولاً
      if (!form.name || !form.email || !form.password) {
        toast.error(t("auth.fillAllFields"));
        return;
      }
      await sendVerificationCode();
    } else if (step === 2) {
      await verifyOtp();
    }
  };

  return (
    <>
      <div className="mb-10 text-center mx-auto inline-block max-w-[160px]">
        <Logo />
      </div>

      {step === 1 && (
        <>
          <SocialSignUp />

          <span className="z-1 relative my-8 block text-center">
            <span className="-z-1 absolute left-0 top-1/2 block h-px w-full bg-border dark:bg-dark_border"></span>
            <span className="text-body-secondary relative z-10 inline-block bg-white dark:bg-darklight px-3 text-base">
              {t("auth.signUpWith")}
            </span>
          </span>

          <form onSubmit={handleSubmit}>
            <div className="mb-[22px]">
              <input
                type="text"
                placeholder={t("auth.name")}
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary"
              />
            </div>

            <div className="mb-[22px]">
              <input
                type="email"
                placeholder={t("auth.email")}
                name="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary"
              />
            </div>

            <div className="mb-[22px]">
              <input
                type="password"
                placeholder={t("auth.password")}
                name="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="w-full rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary"
              />
            </div>

            <div className="mb-9">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center rounded-md bg-primary px-5 py-3 text-base text-white transition duration-300 ease-in-out hover:!bg-darkprimary disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader />
                    <span className="pl-2">{t("auth.sendingCode")}</span>
                  </>
                ) : (
                  t("auth.sendVerification")
                )}
              </button>
            </div>
          </form>
        </>
      )}

      {step === 2 && (
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-4">
            {t("auth.verifyEmail")}
          </h3>
          <p className="mb-6 text-gray-600">
            {t("auth.verificationCodeSent")} <strong>{form.email}</strong>
          </p>

          <div className="mb-6">
            <input
              type="text"
              placeholder={t("auth.enterOtp")}
              value={form.otp}
              onChange={(e) =>
                setForm({ ...form, otp: e.target.value.replace(/\D/g, "") })
              }
              maxLength={6}
              className="w-full text-center text-2xl font-bold rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-gray-300 focus:border-primary"
            />
          </div>

          <div className="mb-6">
            <button
              onClick={handleSubmit}
              disabled={loading || form.otp.length !== 6}
              className="flex w-full cursor-pointer items-center justify-center rounded-md bg-primary px-5 py-3 text-base text-white transition duration-300 ease-in-out hover:!bg-darkprimary disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader />
                  <span className="pl-2">{t("auth.verifying")}</span>
                </>
              ) : (
                t("auth.verifyAndRegister")
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={sendVerificationCode}
              disabled={!canResend || loading}
              className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canResend
                ? t("auth.resendCode")
                : `${t("auth.resendIn")} ${resendTimer}s`}
            </button>
          </div>

          <div className="mt-4">
            <button
              onClick={() => setStep(1)}
              className="text-gray-600 hover:text-primary text-sm"
            >
              {t("auth.backToEdit")}
            </button>
          </div>
        </div>
      )}

      <p className="text-body-secondary mb-4 text-base">
        {t("auth.privacyAgreement")}{" "}
        <a href="/terms" className="text-primary hover:underline">
          {t("auth.termsOfService")}
        </a>{" "}
        {t("auth.and")}{" "}
        <a href="/privacy" className="text-primary hover:underline">
          {t("auth.privacyPolicy")}
        </a>
      </p>

      <p className="text-body-secondary text-base">
        {t("auth.haveAccount")}
        <Link
          href="/signin"
          className="pl-2 text-primary hover:bg-darkprimary hover:underline"
        >
          {t("auth.signIn")}
        </Link>
      </p>
    </>
  );
};

export default SignUp;
