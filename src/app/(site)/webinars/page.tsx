"use client";
import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Webinar } from "@/lib/types";
import { useEffect, useState } from "react";

const isRegistrationOpen = (webinar: Webinar) => {
  const now = new Date();
  const start = webinar.registrationStart ? new Date(webinar.registrationStart) : undefined;
  const end = webinar.registrationEnd ? new Date(webinar.registrationEnd) : undefined;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
};

export default function WebinarsPage() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/webinars', { cache: 'no-store' });
        const json = await res.json();
        setWebinars(json.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container py-16">
      <h1 className="text-4xl font-bold text-MidnightNavyText dark:text-white mb-8">Webinars</h1>
      <div className="grid md:grid-cols-3 gap-8">
        {webinars.map((w) => {
          const isPast = new Date(`${w.date}T23:59:59`) < new Date();
          const open = isRegistrationOpen(w);
          return (
            <div key={w.id} className={`rounded-2xl overflow-hidden border shadow-sm transition ${isPast ? 'opacity-60 grayscale' : 'dark:border-dark_border'} ${w.isActive ? 'bg-white dark:bg-darkmode ring-1 ring-primary/20' : 'bg-white dark:bg-darkmode'}`}>
              <div className="relative h-40 w-full">
                <Image src={w.image || '/images/webinars/placeholder.jpg'} alt={w.title} fill className="object-cover" />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-semibold text-MidnightNavyText dark:text-white">{w.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${isPast ? 'bg-gray-100 text-gray-600' : (w.isActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}`}>{isPast ? 'Expired' : (w.isActive ? 'Active' : 'Upcoming')}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-3">{w.description}</p>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">{w.date} • {w.time} • {w.duration}</div>

                {/* Speakers */}
                {w.speakers && w.speakers.length > 0 && (
                  <div className="flex -space-x-2 mb-4">
                    {w.speakers.slice(0, 5).map((s, idx) => (
                      <Image key={idx} src={s.imageUrl} alt={s.name} width={36} height={36} className="rounded-full ring-2 ring-white dark:ring-darkmode" />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Capacity: {w.currentAttendees}/{w.maxAttendees}</div>
                  {open ? (
                    <Link target="_blank" href={w.crmRegistrationUrl || '#'} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90">
                      Register
                    </Link>
                  ) : (
                    <button disabled className="px-4 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm font-semibold cursor-not-allowed">
                      Registration Closed
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


