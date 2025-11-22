import Testimonials from "@/components/Home/Testimonials";
import TicketSection from "@/components/Home/TicketSection";
import WorkSpeakers from "@/components/Home/Projects";
import HeroSub from "@/components/SharedComponent/HeroSub";
import DynamicPricing from "@/components/Home/Pricing/DynamicPricing";
import React from "react";
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Speakers | Codeschool",
};

const page = () => {
  const breadcrumbLinks = [
    { href: "/", text: "Home" },
    { href: "/subscriptions", text: "subscriptions" },
  ];
  return (
    <>
      <HeroSub
        title="Subscriptions"
        description="Discover a wealth of insightful materials meticulously crafted to provide you with a comprehensive."
        breadcrumbLinks={breadcrumbLinks}
      />
      <DynamicPricing />
      {/* <TicketSection /> */}
    </>
  );
};

export default page;
