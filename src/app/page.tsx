import React from 'react';
import Hero from '@/components/Home/Hero';
import YoungStars from '@/components/Home/YoungStars';
import Projects from '@/components/Home/Projects';
import EventTicket from '@/components/Home/EventTicket';
import Highlight from '@/components/Home/YearHighlight/page';
import Upcoming from '@/components/Home/Upcoming';
import Testimonials from '@/components/Home/Testimonials';

// تم نقل generateMetadata إلى ملف layout.tsx
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
  );
}