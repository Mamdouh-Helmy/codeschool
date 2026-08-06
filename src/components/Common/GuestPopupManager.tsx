"use client";
import { useState, useEffect, useRef } from "react";
import GuestWelcomePopup from "./GuestWelcomePopup";

const GuestPopupManager = () => {
    const [showPopup, setShowPopup] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const checkAndShowPopup = () => {
            const isHomePage = window.location.pathname === "/" || window.location.pathname === "/ar";
            const hasSeenPopup = sessionStorage.getItem("guestPopupSeen");

            if (isHomePage && !hasSeenPopup) {
                timerRef.current = setTimeout(() => {
                    setShowPopup(true);
                    sessionStorage.setItem("guestPopupSeen", "true");
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
    }, []);

    const handleClose = () => {
        setShowPopup(false);
    };

    return (
        <GuestWelcomePopup
            isOpen={showPopup}
            onClose={handleClose}
        />
    );
};

export default GuestPopupManager;