"use client";
import React from "react";

// TODO: ضع الصور الخاصة بك في المجلد public/images/
// (badge.png, stem.png, iAIDL.png, kidsafe.png, finland.png, code-logo.png)

const CertificateTemplate = ({
    studentName = "Youssef Mourad",
    moduleTitle = "Grade 5-6 Module 1 Chatbot Dev 1",
    signatureName = "Aya Elnagar",
    date = "15/12/2025",
    achievements = [
        "Define the concept of a chatbot and recognize its role in various applications",
        "Explain the fundamentals of algorithms and their significance in chatbot dev",
        "Python syntax, including variables, data types, and control structures",
        "Apply Python syntax to solve programming problems",
    ],
    backgroundStyle = "navy-orange",
}) => {
    const getBackground = (style) => {
        const styles = {
            "navy-orange": { outerBg: "#0d2b3e", accentColor: "#ff6a00", stripeColor: "#123a52" },
            "blue-orange": { outerBg: "#1c4e80", accentColor: "#ff6a00", stripeColor: "#2a5f94" },
            "gold-teal": { outerBg: "#d4a017", accentColor: "#0f6b6b", stripeColor: "#c99310" },
            "orange-teal": { outerBg: "#c9531e", accentColor: "#0f6b6b", stripeColor: "#b3481a" },
            "teal-gold": { outerBg: "#0f6b6b", accentColor: "#d4a017", stripeColor: "#0c5757" },
            "navy-gold": { outerBg: "#0d2b3e", accentColor: "#d4a017", stripeColor: "#123a52" },
        };
        return styles[style] || styles["navy-orange"];
    };

    const theme = getBackground(backgroundStyle);

    return (
        <>
            {/* استيراد نفس خطوط الشهادة الأصلية (عنوان + توقيع) — 
               حطيناها جوه الكومبوننت عشان تشتغل في أي مكان يترندر فيه:
               صفحة الـ test أو توليد الصورة عن طريق puppeteer */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,900;1,400&display=swap');
            `}</style>
            <div
                style={{
                    backgroundColor: theme.outerBg,
                    width: "1200px",
                    padding: "45px",
                    position: "relative",
                    boxSizing: "border-box",
                    fontFamily: "'Georgia', 'Playfair Display', serif",
                    margin: "0 auto",
                    overflow: "hidden",
                }}
            >
                <div style={{ position: "absolute", top: 0, left: 0, width: "260px", height: "400px", background: `linear-gradient(135deg, transparent 48%, ${theme.accentColor} 48%, ${theme.accentColor} 52%, transparent 52%)`, opacity: 0.5 }} />
                <div style={{ position: "absolute", top: 0, left: "40px", width: "260px", height: "400px", background: `linear-gradient(135deg, transparent 48%, ${theme.stripeColor} 48%, ${theme.stripeColor} 52%, transparent 52%)`, opacity: 0.7 }} />
                <div style={{ position: "absolute", bottom: 0, right: 0, width: "260px", height: "400px", background: `linear-gradient(135deg, transparent 48%, ${theme.accentColor} 48%, ${theme.accentColor} 52%, transparent 52%)`, opacity: 0.5 }} />
                <div style={{ position: "absolute", bottom: 0, right: "40px", width: "260px", height: "400px", background: `linear-gradient(135deg, transparent 48%, ${theme.stripeColor} 48%, ${theme.stripeColor} 52%, transparent 52%)`, opacity: 0.7 }} />

                {/* الورقة البيضاء */}
                <div
                    style={{
                        backgroundColor: "white",
                        width: "100%",
                        height: "100%",
                        position: "relative",
                        zIndex: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        boxShadow: `inset 0 0 0 2px ${theme.accentColor}, 0 0 0 12px white, 0 0 0 14px ${theme.accentColor}`,
                        borderRadius: "18px",
                        padding: "50px 70px",
                        boxSizing: "border-box",
                    }}
                >
                    {/* الشارة */}
                    <div style={{ position: "absolute", top: "-30px", left: "10px", zIndex: 10 }}>
                        <img src="/images/badge.png" alt="Badge" style={{ width: "290px" }} />
                    </div>

                    {/* Logo */}
                    <div style={{ marginTop: "20px" }}>
                        <img src="/images/code-logo.png" alt="Code School" style={{ height: "", width: "350px" }} />
                    </div>

                    {/* النص العلوي */}
                    <div style={{ textAlign: "center", marginTop: "" }}>
                        <p style={{ fontSize: "26px", color: "#222", marginBottom: "4px", letterSpacing: "1px" }}>
                            Proudly present this official
                        </p>
                        <h1
                            style={{
                                fontSize: "150px",
                                fontWeight: "bold",
                                color: "#0d2b3e",
                                margin: "0",
                                letterSpacing: "4px",
                                fontFamily: "'Playfair Display', serif",
                                fontVariant: "small-caps",
                                marginBottom: "40px",
                            }}
                        >
                            Certificate
                        </h1>
                        <p style={{ fontSize: "24px", color: "#0d2b3e" }}>
                            To our beloved, young & dedicated member:
                        </p>
                    </div>

                    {/* اسم الطالب */}
                    <h2
                        style={{
                            fontSize: "54px",
                            color: theme.accentColor,
                            fontWeight: "bold",
                            margin: "22px 0",
                            fontFamily: "'Playfair Display', serif",
                        }}
                    >
                        {studentName}
                    </h2>

                    {/* الإنجازات */}
                    <div style={{ textAlign: "center", padding: "0 30px", width: "100%", color: "#0d2b3e" }}>
                        <div style={{ display: "inline-block", textAlign: "center", fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}>
                            <p style={{ fontSize: "26px", margin: "12px 0" }}>
                                You have successfully completed <strong>{moduleTitle}</strong>
                            </p>
                            <p style={{ fontSize: "23px", margin: "12px 0" }}>
                                Throughout this module, you have achieved the following outcomes:
                            </p>
                            {achievements.map((item, index) => (
                                <p key={index} style={{ fontSize: "23px", margin: "12px 0" }}>
                                    <span style={{ fontWeight: "bold" }}>•</span> {item}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* تمنيات الختام */}
                    <div style={{ textAlign: "center", marginTop: "30px" }}>
                        <h3 style={{ fontSize: "34px", color: "#0d2b3e", margin: "0", fontWeight: "bold" }}>
                            We wish you all the best!
                        </h3>
                    </div>

                    {/* الشعارات */}
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "35px" }}>
                        <img src="/images/stem.png" alt="STEM" style={{ width: "130px" }} />
                        <img src="/images/iAIDL.png" alt="iAIDL" style={{width: "130px" }} />
                        <img src="/images/finland.png" alt="Finland" style={{ width: "130px"}} />
                        <img src="/images/kidsafe.png" alt="KidSAFE" style={{  width: "130px" }} />
                    </div>

                    {/* التاريخ والتوقيع */}
                    <div style={{ display: "flex", justifyContent: "space-between", width: "82%", marginTop: "40px", color: "#0d2b3e" }}>
                        <div style={{ textAlign: "left", paddingLeft: "20px" }}>
                            <p style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "4px" }}>Date</p>
                            <p style={{ fontSize: "22px", marginTop: "0" }}>{date}</p>
                        </div>
                        <div style={{ textAlign: "center", paddingRight: "20px" }}>
                            <p
                                style={{
                                    fontSize: "56px",
                                    fontFamily: "'Alex Brush', 'Dancing Script', 'Great Vibes', cursive",
                                    color: "#0d2b3e",
                                    margin: "0 0 6px",
                                    fontWeight: "normal",
                                }}
                            >
                                {signatureName}
                            </p>
                            <p style={{ fontSize: "22px", fontWeight: "bold", margin: "0" }}>{signatureName}</p>
                            <p style={{ fontSize: "17px", margin: "2px 0 0" }}>Head Of Education</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CertificateTemplate;