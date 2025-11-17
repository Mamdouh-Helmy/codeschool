// components/QRScanner/QRScanner.tsx
"use client";
import { useState, useEffect } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { useI18n } from "@/i18n/I18nProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  message?: string;
  createdAt: string;
}

interface AttendanceData {
  time: string;
  scannedBy: string;
}

export default function QRScanner() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [tokenFromUrl, setTokenFromUrl] = useState<string | null>(null);
  const [hasProcessedToken, setHasProcessedToken] = useState<boolean>(false);
  const [scannerInitialized, setScannerInitialized] = useState<boolean>(false);

  const { data: session } = useSession();
  const { t } = useI18n();
  const router = useRouter();

  // معالجة الـ token من الـ URL مرة واحدة فقط
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    setTokenFromUrl(token || null);
  }, []);

  // معالجة الـ token عندما يصبح جاهزاً - مع منع التكرار
  useEffect(() => {
    if (tokenFromUrl && !scanResult && !userData && !hasProcessedToken) {
      setHasProcessedToken(true);
      handleScanResult(tokenFromUrl);
    }
  }, [tokenFromUrl, scanResult, userData, hasProcessedToken]);

  // تهيئة الماسح الضوئي
  useEffect(() => {
    if (tokenFromUrl || scanResult || userData || scannerInitialized) return;

    const scannerElement = document.getElementById("qr-scanner");
    if (!scannerElement) return;

    let scanner: Html5QrcodeScanner | null = null;

    try {
      scanner = new Html5QrcodeScanner(
        "qr-scanner",
        {
          qrbox: { width: 250, height: 250 },
          fps: 5,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false 
      );

      scanner.render(
        (result: string) => {
          scanner
            ?.clear()
            .then(() => {
              setScannerInitialized(false);
              handleScanResult(result);
            })
            .catch((err) => {
              console.error("Error clearing scanner:", err);
            });
        },
        (err: string) => {
          if (!err.includes("NotFoundException")) {
            console.log("Scanner error:", err);
          }
        }
      );

      setScannerInitialized(true);
    } catch (err) {
      console.error("❌ Scanner initialization error:", err);
    }

    return () => {
      if (scanner) {
        scanner
          .clear()
          .catch((error) => console.error("Failed to clear scanner:", error));
        setScannerInitialized(false);
      }
    };
  }, [scannerInitialized, tokenFromUrl, scanResult, userData]);

  const extractTokenFromUrl = (scannedData: string): string | null => {
    if (scannedData.includes("/scanner?token=")) {
      try {
        const url = new URL(scannedData);
        return url.searchParams.get("token");
      } catch (err) {
        console.error("❌ Error parsing URL:", err);
      }
    }

    if (scannedData.startsWith("eyJhbGciOiJ")) return scannedData;
    console.log("❌ No valid token found");
    return null;
  };

  const handleScanResult = async (scannedData: string) => {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const qrToken = extractTokenFromUrl(scannedData);
      if (!qrToken) {
        setError(t("scanner.invalidQR") || "QR code غير صالح");
        toast.error(t("scanner.invalidQR") || "QR code غير صالح");
        setLoading(false);
        return;
      }

      if (!qrToken.startsWith("eyJ")) {
        setError("QR code تالف - التوكن غير صالح");
        toast.error("QR code تالف");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/scan-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken,
          scannedBy: session?.user?.id || "anonymous",
        }),
      });

      const data = await res.json();

      if (data.success) {
        setUserData(data.user);
        setAttendanceData(data.attendance || null);
        setScanResult(scannedData);

        if (data.scanType === "attendance") {
          toast.success(
            t("scanner.attendanceSuccess", { name: data.user.name }) ||
              `تم تسجيل حضور ${data.user.name}`
          );
        } else {
          toast.success(
            data.message || t("scanner.scanSuccess") || "تم المسح بنجاح"
          );
        }
      } else {
        setError(data.message || t("scanner.invalidQR") || "QR code غير صالح");
        toast.error(
          data.message || t("scanner.invalidQR") || "QR code غير صالح"
        );
      }
    } catch (err) {
      console.error("💥 Scan error:", err);
      setError(t("scanner.scanError") || "حدث خطأ أثناء المسح");
      toast.error(t("scanner.scanError") || "حدث خطأ أثناء المسح");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setUserData(null);
    setAttendanceData(null);
    setError("");
    setHasProcessedToken(false);
    setScannerInitialized(false);

    if (tokenFromUrl) {
      router.replace("/scanner");
    } else {
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const showScanner = !tokenFromUrl && !scanResult && !userData && !loading;

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-darklight rounded-2xl shadow-round-box p-8 border border-PowderBlueBorder dark:border-dark_border">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-primary to-ElectricAqua rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
        </div>
        <h2 className="text-32 font-bold text-MidnightNavyText dark:text-white">
          {t("scanner.title") || "QR Code Scanner"}
        </h2>
        <p className="text-SlateBlueText dark:text-darktext mt-2">
          {t("scanner.subtitle") || "Scan QR codes to get user information"}
        </p>
      </div>

      {/* Scanner Area */}
      {showScanner && (
        <div className="bg-IcyBreeze dark:bg-dark_input rounded-14 p-6 mb-6 border border-PaleCyan dark:border-dark_border">
          <div id="qr-scanner" className="mb-4"></div>
          <p className="text-sm text-SlateBlueText dark:text-darktext text-center">
            {t("scanner.instructions") || "ضع الكود أمام الكاميرا للمسح"}
          </p>
        </div>
      )}

      {/* Loading, Error, Success States */}
      {loading && (
        <div className="text-center py-8 bg-PaleSkyBlu dark:bg-dark_input rounded-14 border border-PaleCyan dark:border-dark_border">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-MidnightNavyText dark:text-white font-medium">
            {t("scanner.processing") || "جاري المعالجة..."}
          </p>
          <p className="text-sm text-SlateBlueText dark:text-darktext mt-2">
            {t("scanner.pleaseWait") || "يرجى الانتظار..."}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-14 p-6 mb-6">
          <div className="flex items-center justify-center mb-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <p className="text-red-700 dark:text-red-300 text-center font-medium mb-4">
            {error}
          </p>
          <button
            onClick={resetScanner}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-14 transition-all duration-200 font-medium shadow-round-box"
          >
            {t("scanner.tryAgain") || "حاول مرة أخرى"}
          </button>
        </div>
      )}

      {userData && (
        <div className="bg-gradient-to-br from-green-50 to-Aquamarine/20 dark:from-green-900/20 dark:to-green-800/10 rounded-14 p-6 border border-green-200 dark:border-green-800 shadow-round-box">
          {/* Success Header & User Info */}
          <div className="text-center mb-6">
            {userData.image ? (
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg">
                  <img
                    src={userData.image}
                    alt={userData.name}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            )}
            <h3 className="text-24 font-bold text-green-800 dark:text-green-300">
              {attendanceData
                ? t("scanner.attendanceRecorded") || "تم تسجيل الحضور ✅"
                : t("scanner.scanSuccess") || "تم المسح بنجاح 👋"}
            </h3>
            {userData.message && (
              <p className="text-green-700 dark:text-green-400 mt-2 font-medium text-lg">
                {userData.message}
              </p>
            )}
            {attendanceData && (
              <p className="text-green-700 dark:text-green-400 mt-2 font-medium">
                {t("scanner.time") || "الساعة"}:{" "}
                {new Date(attendanceData.time).toLocaleTimeString("ar-EG")}
              </p>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-green-200 dark:border-green-700">
              <span className="font-semibold text-MidnightNavyText dark:text-white">
                {t("common.name") || "الاسم"}:
              </span>
              <span className="text-SlateBlueText dark:text-darktext font-medium">
                {userData.name}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-green-200 dark:border-green-700">
              <span className="font-semibold text-MidnightNavyText dark:text-white">
                {t("auth.email") || "البريد الإلكتروني"}:
              </span>
              <span className="text-SlateBlueText dark:text-darktext font-medium">
                {userData.email}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-green-200 dark:border-green-700">
              <span className="font-semibold text-MidnightNavyText dark:text-white">
                {t("profile.role") || "الدور"}:
              </span>
              <span className="capitalize bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary px-3 py-1 rounded-full text-sm font-medium">
                {userData.role}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-green-200 dark:border-green-700">
              <span className="font-semibold text-MidnightNavyText dark:text-white">
                {t("scanner.memberSince") || "عضو منذ"}:
              </span>
              <span className="text-SlateBlueText dark:text-darktext font-medium">
                {new Date(userData.createdAt).toLocaleDateString("ar-EG")}
              </span>
            </div>
            {attendanceData && (
              <div className="flex justify-between items-center py-3 border-b border-green-200 dark:border-green-700">
                <span className="font-semibold text-MidnightNavyText dark:text-white">
                  {t("scanner.recordedBy") || "مسجل بواسطة"}:
                </span>
                <span className="text-SlateBlueText dark:text-darktext font-medium">
                  {attendanceData.scannedBy}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={resetScanner}
            className="w-full bg-gradient-to-r from-primary to-ElectricAqua hover:from-primary/90 hover:to-ElectricAqua/90 text-white py-4 rounded-14 transition-all duration-200 font-bold shadow-round-box hover:shadow-lg flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t("scanner.scanAnother") || "مسح رمز آخر"}
          </button>
        </div>
      )}

      {!userData && !loading && !error && (
        <div className="text-center mt-6">
          <p className="text-sm text-SlateBlueText dark:text-darktext">
            {t("scanner.footerNote") || "امسح QR code لعرض معلومات المستخدم"}
          </p>
        </div>
      )}
    </div>
  );
}
