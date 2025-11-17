"use client";
import { useState, useEffect } from "react";
import WelcomePopup from "./WelcomePopup";

const WelcomePopupManager = () => {
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);

    useEffect(() => {

        const isHomePage = window.location.pathname === "/";
        const hasSeenPopup = sessionStorage.getItem("welcomePopupSeen");

        if (isHomePage && !hasSeenPopup) {

            const timer = setTimeout(() => {
                setShowWelcomePopup(true);
                sessionStorage.setItem("welcomePopupSeen", "true");
            }, 2000);

            return () => clearTimeout(timer);
        }
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