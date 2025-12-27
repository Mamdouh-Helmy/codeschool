"use client";
import { useState, useEffect, useRef } from "react";
import WelcomePopup from "./WelcomePopup";

const WelcomePopupManager = () => {
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // ✅ استخدام requestAnimationFrame بدل setTimeout لتحسين الأداء
        const checkAndShowPopup = () => {
            const isHomePage = window.location.pathname === "/";
            const hasSeenPopup = sessionStorage.getItem("welcomePopupSeen");

            if (isHomePage && !hasSeenPopup) {
                timerRef.current = setTimeout(() => {
                    setShowWelcomePopup(true);
                    sessionStorage.setItem("welcomePopupSeen", "true");
                }, 2000);
            }
        };

        // ✅ تأخير التنفيذ قليلاً لمنع التأثير على التحميل الأولي
        const delayedCheck = setTimeout(checkAndShowPopup, 100);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            clearTimeout(delayedCheck);
        };
    }, []);

    const handleCloseWelcomePopup = () => {
        setShowWelcomePopup(false);
    };

    return (
        <WelcomePopup
            isOpen={showWelcomePopup}
            onClose={handleCloseWelcomePopup}
        />
    );
};

export default WelcomePopupManager;