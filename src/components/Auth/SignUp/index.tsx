"use client";
import React, { useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import SocialSignUp from "../SocialSignUp";
import Logo from "@/components/Layout/Header/Logo";
import Loader from "@/components/Common/Loader";
import AuthDialogContext from "@/app/context/AuthDialogContext";

type Errors = {
  name?: string;
  email?: string;
  password?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateName = (name: string) => {
  if (!name || !name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  return "";
};

const validateEmail = (email: string) => {
  if (!email || !email.trim()) return "Email is required";
  if (!emailRegex.test(email.trim())) return "Invalid email";
  return "";
};

const validatePassword = (password: string) => {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return "";
};

const SignUp = ({ signUpOpen }: { signUpOpen?: (open: boolean) => void }) => {
  const router = useRouter();
  const authDialog = useContext(AuthDialogContext);

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));

    // تحقق لحظي وحذف الخطأ عند التعديل
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

    // نرسل الإيميل بصيغة lowercase عشان نتجنب التكرار بحروف مختلفة
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
        // حالة 409: إيميل موجود بالفعل
        if (res.status === 409) {
          const message = result?.message || "Email already registered";
          setErrors((p) => ({ ...p, email: message }));
          toast.error(message);
        } else if (result?.errors && typeof result.errors === "object") {
          // إذا السيرفر رجع أخطاء حقول
          setErrors(result.errors);
          toast.error(result.message || "Validation failed");
        } else {
          toast.error(result?.message || "Registration failed");
        }
        setLoading(false);
        return;
      }

      // نجاح
      toast.success("Successfully registered! Redirecting...");
      // أغلق المودال فقط بعد النجاح
      if (typeof signUpOpen === "function") signUpOpen(false);

      authDialog?.setIsUserRegistered(true);
      setTimeout(() => authDialog?.setIsUserRegistered(false), 1500);

      setLoading(false);
      setTimeout(() => router.push("/"), 1200);
    } catch (err: any) {
      console.error("Register error:", err);
      toast.error(err?.message || "Registration failed");
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
          OR
        </span>
      </span>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-[22px]">
          <input
            type="text"
            placeholder="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className={`w-full rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary ${
              errors.name ? "border-red-500" : ""
            }`}
          />
          {errors.name && (
            <p className="text-sm text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        <div className="mb-[22px]">
          <input
            type="email"
            placeholder="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className={`w-full rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary ${
              errors.email ? "border-red-500" : ""
            }`}
          />
          {errors.email && (
            <p className="text-sm text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        <div className="mb-[22px]">
          <input
            type="password"
            placeholder="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className={`w-full rounded-md border border-border dark:border-dark_border border-solid bg-transparent px-5 py-3 text-base text-dark outline-none transition placeholder:text-gray-300 focus:border-primary ${
              errors.password ? "border-red-500" : ""
            }`}
          />
          {errors.password && (
            <p className="text-sm text-red-500 mt-1">{errors.password}</p>
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
                <span className="pl-2">Signing up...</span>
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </div>
      </form>

      <p className="text-body-secondary mb-4 text-base">
        By creating an account you are agree with our{" "}
        <a href="/#" className="text-primary hover:underline">
          Privacy
        </a>{" "}
        and{" "}
        <a href="/#" className="text-primary hover:underline">
          Policy
        </a>
      </p>

      <p className="text-body-secondary text-base">
        Already have an account?
        <Link
          href="/signin"
          className="pl-2 text-primary hover:bg-darkprimary hover:underline"
        >
          Sign In
        </Link>
      </p>
    </>
  );
};

export default SignUp;
