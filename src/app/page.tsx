import React from 'react'
import { Metadata } from "next";
import Hero from '@/components/Home/Hero';
import YoungStars from '@/components/Home/YoungStars';
import Projects from '@/components/Home/Projects';
import EventTicket from '@/components/Home/EventTicket';
import Highlight from '@/components/Home/YearHighlight/page';
import Upcoming from '@/components/Home/Upcoming';
import Testimonials from '@/components/Home/Testimonials';
import TicketSection from '@/components/Home/TicketSection';
import DynamicPricing from '@/components/Home/Pricing/DynamicPricing';
export const metadata: Metadata = {
  title: "Codeschool",
};


export default function Home() {
  return (
    <main>
      <Hero />
      <YoungStars />
      <Projects />
      <EventTicket />
      <Highlight />
      <Upcoming />
      {/* <DynamicPricing /> */}
      <Testimonials />
      {/* <TicketSection /> */}
    </main>
  )
}
