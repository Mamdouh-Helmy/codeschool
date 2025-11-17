// app/scanner/page.jsx
import React from "react";
import '@/Style/style.css'
import QRScanner from "@/components/QRScanner/QRScanner";
import HeroSub from "@/components/SharedComponent/HeroSub";

export default function ScannerPage() {
    const breadcrumbLinks = [
        { href: "/", text: "Home" },
        { href: "/scanner", text: "Scanner" },
    ];

    return (
        <>
            <HeroSub
                title="QR Code Scanner"
                description="Scan QR codes effortlessly to get user information and record attendance"
                breadcrumbLinks={breadcrumbLinks}
            />
            <div className="min-h-screen bg-IcyBreeze dark:bg-darkmode py-12">
                <div className="container mx-auto px-4">
                    <QRScanner />
                </div>
            </div>
        </>
    );
}