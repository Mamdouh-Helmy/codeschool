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

type Errors = {
  name?: string;
  email?: string;
  password?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateName = (name: string) => {
  if (!name || !name.trim()) return "auth.validation.required";
  if (name.trim().length < 2) return "auth.validation.shortName";
  return "";
};

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

const SignUp = ({ signUpOpen }: { signUpOpen?: (open: boolean) => void }) => {
  const router = useRouter();
  const authDialog = useContext(AuthDialogContext);
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));

    if (name === "name")
      setErrors((p) => ({ ...p, name: validateName(value) || "" }));
    if (name === "email")
      setErrors((p) => ({ ...p, email: validateEmail(value) || "" }));
    if (name === "password")
      setErrors((p) => ({ ...p, password: validatePassword(value) || "" }));
  };

  const validateAll = (): boolean => {
    const eName = validateName(form.name);
    const eEmail = validateEmail(form.email);
    const ePass = validatePassword(form.password);
    const newErrors: Errors = {};
    if (eName) newErrors.name = eName;
    if (eEmail) newErrors.email = eEmail;
    if (ePass) newErrors.password = ePass;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateAll()) return;

    setLoading(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          const message = result?.message || "auth.emailExists";
          setErrors((p) => ({ ...p, email: message }));
          toast.error(t(message));
        } else if (result?.errors && typeof result.errors === "object") {
          setErrors(result.errors);
          toast.error(result.message || "auth.registrationFailed");
        } else {
          toast.error(result?.message || "auth.registrationFailed");
        }
        setLoading(false);
        return;
      }

      toast.success(t("auth.registrationSuccess"));
      if (typeof signUpOpen === "function") signUpOpen(false);

      authDialog?.setIsUserRegistered(true);
      setTimeout(() => authDialog?.setIsUserRegistered(false), 1500);

      setLoading(false);
      setTimeout(() => router.push("/"), 1200);
    } catch (err: any) {
      console.error("Register error:", err);
      toast.error(err?.message || t("auth.registrationFailed"));
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-10 text-center mx-auto inline-block max-w-[160px]">
        <Logo />
      </div>

      <SocialSignUp />

      <span className="z-1 relative my-8 block text-center">
        <span className="-z-1 absolute left-0 top-1/2 block h-px w-full bg-border dark:bg-dark_border"></span>
        <span className="text-body-secondary relative z-10 inline-block bg-white dark:bg-darklight px-3 text-base dark:bg-dark">
          {t("auth.signUpWith")}
        </span>
      </span>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-[22px]">
          <input
            type="text"
            placeholder={t("auth.name")}
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className={`w-full rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary ${
              errors.name ? "border-red-500" : ""
            }`}
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{t(errors.name)}</p>
          )}
        </div>

        <div className="mb-[22px]">
          <input
            type="email"
            placeholder={t("auth.email")}
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className={`w-full rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary ${
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
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className={`w-full rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary ${
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
            className="flex w-full cursor-pointer items-center justify-center rounded-md bg-primary px-5 py-3 text-base text-white transition duration-300 ease-in-out hover:!bg-darkprimary dark:hover:!bg-darkprimary disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader />
                <span className="pl-2">{t("auth.signingUp")}</span>
              </>
            ) : (
              t("auth.signUp")
            )}
          </button>
        </div>
      </form>

      <p className="text-body-secondary mb-4 text-base">
        {t("auth.privacyAgreement")}{" "}
        <a href="/#" className="text-primary hover:underline">
          {t("auth.termsOfService")}
        </a>{" "}
        {t("auth.and")}{" "}
        <a href="/#" className="text-primary hover:underline">
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