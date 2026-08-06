"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import WelcomePopup from "./WelcomePopup";
import GuestPopupManager from "./GuestPopupManager";

const WelcomePopupManager = () => {
    const { data: session, status } = useSession();
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const isGuest = session?.user?.role === "guest";
    console.log("WelcomePopupManager: session", isGuest);


    useEffect(() => {
        // ✅ لسه بنستنى الـ session تتحمل عشان منقررش غلط
        if (status === "loading") return;

        // ✅ لو المستخدم guest، الپوب أب ده منظهروش خالص
        if (isGuest) return;

        const checkAndShowPopup = () => {
            const isHomePage = window.location.pathname === "/" || window.location.pathname === "/ar";
            const hasSeenPopup = sessionStorage.getItem("welcomePopupSeen");

            if (isHomePage && !hasSeenPopup) {
                timerRef.current = setTimeout(() => {
                    setShowWelcomePopup(true);
                    sessionStorage.setItem("welcomePopupSeen", "true");
                }, 2000);
            }
        };

        const delayedCheck = setTimeout(checkAndShowPopup, 100);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            clearTimeout(delayedCheck);
        };
    }, [status, isGuest]);

    const handleCloseWelcomePopup = () => {
        setShowWelcomePopup(false);
    };

    // ✅ لسه بنستنى نعرف حالة تسجيل الدخول
    if (status === "loading") return null;

    // ✅ لو guest، اعرضي الـ Popup التاني بدل الأصلي
    if (isGuest) return <GuestPopupManager />;

    return (
        <WelcomePopup
            isOpen={showWelcomePopup}
            onClose={handleCloseWelcomePopup}
        />
    );
};

export default WelcomePopupManager;