import SignUp from "@/components/Auth/SignUp";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Sign Up | Codeschool",
};

const SignupPage = () => {
  const handleSuccess = (userData: any) => {
   
    localStorage.setItem("user", JSON.stringify(userData));
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
      />
    </>
  );
};

export default SignupPage;



