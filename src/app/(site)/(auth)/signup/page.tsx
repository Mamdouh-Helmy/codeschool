"use client";

import { useRouter } from "next/navigation";
import SignUp from "@/components/Auth/SignUp";
import Breadcrumb from "@/components/Common/Breadcrumb";

const SignupPage = () => {
  const router = useRouter();

  const handleSuccess = (userData: any) => {
    // next-auth بيدير الـ session تلقائيًا، مش محتاجين نخزّن يدويًا
  };

  const handleSignUpOpen = (value: boolean) => {
    console.log("SignUp modal open:", value);
  };

  return (
    <>
      <Breadcrumb pageName="Sign Up Page" />

      <SignUp
        signUpOpen={handleSignUpOpen}
        onSuccess={handleSuccess}
        onSwitchToSignIn={() => router.push("/signin")}
      />
    </>
  );
};

export default SignupPage;