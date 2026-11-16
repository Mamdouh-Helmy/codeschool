import React from 'react';
import Hero from '@/components/Home/Hero';
import YoungStars from '@/components/Home/YoungStars';
import Projects from '@/components/Home/Projects';
import EventTicket from '@/components/Home/EventTicket';
import Highlight from '@/components/Home/YearHighlight/page';
import Upcoming from '@/components/Home/Upcoming';
import Testimonials from '@/components/Home/Testimonials';
import { connectDB } from "@/lib/mongodb";
import SectionImageHero from "@/app/models/SectionImageHero";

async function getHeroContent() {
  try {
    await connectDB();
    const doc = await SectionImageHero.findOne({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  } catch (e) {
    console.error("hero fetch error", e);
    return null; // الـ Hero هيرجع يجيبها من الـ API لو فشلت
  }
}

export default async function Home() {
  const hero = await getHeroContent();
  return (
    <main>
      <Hero initialContent={hero} />
      <YoungStars />
      <Projects />
      <EventTicket />
      <Highlight />
      <Upcoming />
      <Testimonials />
    </main>
  );
}