"use client";
import { useState, useEffect } from "react";
import WebinarPopupModal from "./WebinarPopupModal";
import { useActiveWebinar } from "@/hooks/useApiData";

const WebinarPopupManager = () => {
  const [showPopup, setShowPopup] = useState(false);
  const { data: activeWebinar, loading } = useActiveWebinar();

  useEffect(() => {

    if (loading || !activeWebinar) return;
    const timer = setTimeout(() => setShowPopup(true), 1000);

    return () => clearTimeout(timer);
  }, [activeWebinar, loading]);

  const handleClose = () => {
    setShowPopup(false);
  };

  return (
    <WebinarPopupModal
      isOpen={showPopup}
      onClose={handleClose}
    />
  );
};

export default WebinarPopupManager;
