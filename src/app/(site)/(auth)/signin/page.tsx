"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Signin from "@/components/Auth/SignIn";
import Breadcrumb from "@/components/Common/Breadcrumb";

const SigninPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // ✅ لو المستخدم مسجل دخول بالفعل، رجّعه فورًا لمكانه المطلوب
  // (redirect query param) أو الصفحة الرئيسية، من غير ما يشوف فورم الدخول
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const redirectTo = searchParams.get("redirect") || "/";
      router.replace(redirectTo);
    }
  }, [status, session, router, searchParams]);

  // ✅ next-auth بيدير كل حاجة عن طريق useSession — مش محتاجين
  // نخزّن أي حاجة في localStorage يدويًا زي الكود القديم
  const handleSuccess = () => {
    // مفيش حاجة إضافية مطلوبة هنا — useSession هيتحدث لوحده بعد signIn()
  };

  const handleSignInOpen = (value: boolean) => {
    if (!value) {
      router.push("/");
    }
  };

  // لسه بيحمّل حالة الـ session، أو المستخدم هيتوجه دلوقتي — منعرضش الفورم
  if (status === "loading" || status === "authenticated") {
    return null;
  }

  return (
    <>
      <Breadcrumb pageName="Sign In Page" />

      <Signin signInOpen={handleSignInOpen} onSuccess={handleSuccess} />
    </>
  );
};

export default SigninPage;