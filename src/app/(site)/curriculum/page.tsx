import CurriculumTimeline from '@/components/Curriculum/CurriculumTimeline';
import HeroSub from "@/components/SharedComponent/HeroSub";
import React from "react";
import '@/Style/style.css'
import { Metadata } from "next";
export const metadata: Metadata = {
  title: "curriculum | Codeschool",
};

export default function CurriculumPage() {
  const breadcrumbLinks = [
    { href: "/", text: "Home" },
    { href: "/schedules", text: "Schedules" },
  ];
  return (
    <>
      <HeroSub
        title="Event Schedules"
        description="Discover a wealth of insightful materials meticulously crafted to provide you with a comprehensive."
        breadcrumbLinks={breadcrumbLinks}
      />
      <CurriculumTimeline />
    </>
  );
}