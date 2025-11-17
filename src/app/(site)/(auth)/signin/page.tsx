import Signin from "@/components/Auth/SignIn";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Sign In | Codeschool",
};



const SigninPage = () => {
  const handleSuccess = (userData: any) => {
 
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleSignInOpen = (value: boolean) => {
   
    console.log("Signin modal open:", value);
  };

  return (
    <>
      <Breadcrumb pageName="Sign In Page" />

      <Signin 
        signInOpen={handleSignInOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
};


export default SigninPage;
