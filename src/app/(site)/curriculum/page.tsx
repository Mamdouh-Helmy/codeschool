import CurriculumTimeline from '@/components/Curriculum/CurriculumTimeline';
import HeroSub from "@/components/SharedComponent/HeroSub";
import React from "react";
import '@/Style/style.css'
import { Metadata } from "next";
import TicketSection from '@/components/Home/TicketSection';
export const metadata: Metadata = {
  title: "curriculum | Codeschool",
};

export default function CurriculumPage() {
  const breadcrumbLinks = [
    { href: "/", text: "Home" },
    { href: "/curriculum", text: "Curriculum" },
  ];
  return (
    <>
      <HeroSub
        title="Curriculum"
        description="Discover a wealth of insightful materials meticulously crafted to provide you with a comprehensive understanding of the subject matter."
        breadcrumbLinks={breadcrumbLinks}
      />
      <CurriculumTimeline />
      <TicketSection />
    </>
  );
}