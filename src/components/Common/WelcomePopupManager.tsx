"use client";
import { useState, useEffect, useRef } from "react";
import WelcomePopup from "./WelcomePopup";

const WelcomePopupManager = () => {
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
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

        // ✅ تأخير بسيط لتجنب التأثير على التحميل الأولي
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