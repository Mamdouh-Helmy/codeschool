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

type SignUpProps = {
  signUpOpen: (value: boolean) => void;
  onSuccess: (userData: any) => void;
};

const SignUp: React.FC<SignUpProps> = ({ signUpOpen, onSuccess }) => {
  const router = useRouter();
  const authDialog = useContext(AuthDialogContext);
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
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
      toast.error(t("auth.validation.requiredEmail") || "Email is required");
      return;
    }

    setLoading(true);
    try {
      console.log("📨 Sending verification code to:", form.email);
      
      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const result = await res.json();

      if (result.success) {
        setOtpSent(true);
        setStep(2);
        toast.success(t("auth.verificationSent") || "Verification code sent to your email");

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
        
        console.log("✅ Verification code sent successfully");
      } else {
        console.error("❌ Failed to send verification:", result.message);
        toast.error(result.message || (t("auth.verificationFailed") || "Failed to send verification code"));
      }
    } catch (error) {
      console.error("💥 Error sending verification:", error);
      toast.error(t("auth.verificationFailed") || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!form.otp || form.otp.length !== 6) {
      toast.error(t("auth.validation.invalidOtp") || "Please enter a valid 6-digit code");
      return;
    }

    setLoading(true);
    try {
      console.log("🔐 Verifying OTP for:", form.email);
      
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
        toast.success(t("auth.emailVerified") || "Email verified successfully!");

        setTimeout(async () => {
          await completeRegistration();
        }, 500);
      } else {
        console.error("❌ OTP verification failed:", result.message);
        toast.error(result.message || (t("auth.invalidOtp") || "Invalid verification code"));
        setLoading(false);
      }
    } catch (error) {
      console.error("💥 Verification error:", error);
      toast.error(t("auth.verificationFailed") || "Verification failed");
      setLoading(false);
    }
  };

  const completeRegistration = async () => {
    try {
      console.log("👤 Completing registration for:", form.email);
      
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
        console.error("❌ Registration failed:", result);
        
        if (res.status === 409) {
          toast.error(
            "This email is already registered. Try logging in instead."
          );
          setTimeout(() => {
            router.push("/signin");
          }, 2000);
        } else if (res.status === 400) {
          toast.error(
            result.message || "Email not verified yet"
          );
          setCanResend(true);
          setResendTimer(0);
        } else {
          toast.error(result.message || (t("auth.registrationFailed") || "Registration failed"));
        }
        setLoading(false);
        return;
      }

      if (result.success) {
        console.log("✅ Registration successful:", result.user);
        toast.success(t("auth.registrationSuccess") || "Account created successfully!");

        // تسجيل الدخول التلقائي بعد التسجيل الناجح
        try {
          console.log("🔐 Attempting auto login...");
          
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: form.email.trim().toLowerCase(),
              password: form.password
            }),
          });

          const loginData = await loginRes.json();

          if (loginRes.ok && loginData.success) {
            // تخزين التوكن
            if (loginData.accessToken) {
              localStorage.setItem("token", loginData.accessToken);
            }

            // تحديث حالة المستخدم
            if (onSuccess && loginData.user) {
              onSuccess(loginData.user);
            }

            toast.success(t("auth.autoLoginSuccess") || "Logged in automatically!");

            // إغلاق modal التسجيل
            if (signUpOpen) signUpOpen(false);

            // إظهار dialog النجاح
            if (authDialog?.setIsSuccessDialogOpen) {
              authDialog.setIsSuccessDialogOpen(true);
              setTimeout(() => authDialog.setIsSuccessDialogOpen(false), 1100);
            }

            // التوجيه بناءً على دور المستخدم
            setTimeout(() => {
              if (loginData.user?.role === "admin") {
                window.location.href = "/admin";
              } else {
                window.location.href = "/";
              }
            }, 600);
          } else {
            throw new Error("Auto login failed");
          }
        } catch (loginError) {
          console.error("❌ Auto login failed:", loginError);
          // فتح modal تسجيل الدخول يدوياً
          toast.success(t("auth.registrationSuccessManualLogin") || "Account created! Please log in.");
          if (signUpOpen) signUpOpen(false);

          setTimeout(() => {
            router.push("/signin");
          }, 1200);
        }
      } else {
        toast.error(result.message || t("auth.registrationFailed"));
        setLoading(false);
      }
    } catch (error) {
      console.error("💥 Registration error:", error);
      toast.error(t("auth.registrationFailed") || "Registration failed");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (step === 1) {
      if (!form.name || !form.email || !form.password) {
        toast.error(t("auth.fillAllFields") || "Please fill all fields");
        return;
      }
      await sendVerificationCode();
    } else if (step === 2) {
      await verifyOtp();
    }
  };

  return (
    <>
      <div className="text-center mx-auto inline-block max-w-[160px]">
        <Logo />
      </div>

      {step === 1 && (
        <>
          <SocialSignUp />

          <span className="z-1 relative my-8 block text-center">
            <span className="-z-1 absolute left-0 top-1/2 block h-px w-full bg-border dark:bg-dark_border"></span>
            <span className="text-body-secondary relative z-10 inline-block bg-white dark:bg-darklight px-3 text-base">
              {t("auth.signUpWith") || "Or sign up with"}
            </span>
          </span>

          <form onSubmit={handleSubmit}>
            <div className="mb-[18px]">
              <input
                type="text"
                placeholder={t("auth.name") || "Full Name"}
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
                placeholder={t("auth.email") || "Email Address"}
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
                placeholder={t("auth.password") || "Password"}
                name="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
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
                    <span className="pl-2">{t("auth.sendingCode") || "Sending Code..."}</span>
                  </>
                ) : (
                  t("auth.sendVerification") || "Send Verification Code"
                )}
              </button>
            </div>
          </form>
        </>
      )}

      {step === 2 && (
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-4">
            {t("auth.verifyEmail") || "Verify Your Email"}
          </h3>
          <p className="mb-6 text-gray-600">
            {t("auth.verificationCodeSent") || "We sent a verification code to"} <strong>{form.email}</strong>
          </p>
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <input
                type="text"
                placeholder={t("auth.enterOtp") || "Enter 6-digit code"}
                value={form.otp}
                onChange={(e) =>
                  setForm({ ...form, otp: e.target.value.replace(/\D/g, "").substring(0, 6) })
                }
                maxLength={6}
                className="w-full text-center text-2xl font-bold rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-dark outline-none transition placeholder:text-gray-300 focus:border-primary"
              />
            </div>

            <div className="mb-6">
              <button
                type="submit"
                disabled={loading || form.otp.length !== 6}
                className="flex w-full cursor-pointer items-center justify-center rounded-md bg-primary px-5 py-3 text-base text-white transition duration-300 ease-in-out hover:!bg-darkprimary disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader />
                    <span className="pl-2">{t("auth.verifying") || "Verifying..."}</span>
                  </>
                ) : (
                  t("auth.verifyAndRegister") || "Verify & Register"
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={sendVerificationCode}
                disabled={!canResend || loading}
                className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canResend
                  ? t("auth.resendCode") || "Resend Code"
                  : `${t("auth.resendIn") || "Resend in"} ${resendTimer}s`}
              </button>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-gray-600 hover:text-primary text-sm"
              >
                {t("auth.backToEdit") || "Back to edit details"}
              </button>
            </div>
          </form>
        </div>
      )}

      <p className="text-body-secondary mb-4 text-base">
        {t("auth.privacyAgreement") || "By signing up, you agree to our"}{" "}
        <a href="/terms" className="text-primary hover:underline">
          {t("auth.termsOfService") || "Terms of Service"}
        </a>{" "}
        {t("auth.and") || "and"}{" "}
        <a href="/privacy" className="text-primary hover:underline">
          {t("auth.privacyPolicy") || "Privacy Policy"}
        </a>
      </p>

      <p className="text-body-secondary text-base">
        {t("auth.haveAccount") || "Already have an account?"}
        <Link
          href="/signin"
          className="pl-2 text-primary hover:bg-darkprimary hover:underline"
        >
          {t("auth.signIn") || "Sign In"}
        </Link>
      </p>
    </>
  );
};

export default SignUp;