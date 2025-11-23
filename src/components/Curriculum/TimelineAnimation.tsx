'use client';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, useEffect } from 'react';

gsap.registerPlugin(ScrollTrigger);

interface TimelineAnimationProps {
    stagesCount: number;
}

const TimelineAnimation = ({ stagesCount }: TimelineAnimationProps) => {
    const lineRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!lineRef.current) return;

        console.log('Initializing timeline animation...');

        // تأكد أن الخط مرئي أولاً
        gsap.set(lineRef.current, { opacity: 1 });

        // أنيميشن بسيطة للخط
        gsap.fromTo(lineRef.current,
            { 
                scaleY: 0,
                transformOrigin: "top center" 
            },
            { 
                scaleY: 1,
                duration: 1.5,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 70%",
                    end: "bottom 30%",
                    toggleActions: "play none none reverse",
                }
            }
        );

    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="absolute hidden md:block left-1/2 top-0 bottom-0 w-1.5 transform -translate-x-1/2 z-0">
            <div 
                ref={lineRef}
                className="w-full h-full bg-gradient-to-b from-primary via-ElectricAqua to-Aquamarine rounded-full shadow-lg opacity-0"
            />
        </div>
    );
};

export default TimelineAnimation;