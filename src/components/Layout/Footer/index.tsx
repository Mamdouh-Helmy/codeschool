import React, { FC, useState, useRef } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";
import toast from "react-hot-toast";

const Footer: FC = () => {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!email) {
    toast.error("Please enter your email address");
    return;
  }

  // منع الإرسال المزدوج بشكل أكثر فعالية
  if (loading) {
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/api/newsletter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (result.success) {
      toast.success(t("footer.subscribeSuccess") || "Successfully subscribed to newsletter!");
      setEmail("");
    } else {
      toast.error(result.message || "Failed to subscribe");
    }
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    toast.error("An error occurred. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <footer className="bg-secondary">
      <div className="container">
        <div className="flex items-center justify-between flex-wrap md:pt-44 pt-16 md:pb-20 pb-6 border-b border-solid border-dark_border">
          <div>
            <Link href="/">
              <img
                src="/images/logo/footer-logo-white.png"
                alt={t("footer.logoAlt")}
                className="w-24"
              />
            </Link>
          </div>

          <div>
            <ul className="flex items-center flex-wrap md:gap-30 gap-3 md:py-0 py-5">
              <li className="text-PaleCerulean sm:text-xl text-lg font-normal transition-all duration-0.4s hover:text-primary">
                <Link href="/">{t("nav.homepage")}</Link>
              </li>
              <li className="text-PaleCerulean sm:text-xl text-lg font-normal transition-all duration-0.4s hover:text-primary">
                <Link href="/speakers">{t("nav.speakers")}</Link>
              </li>
              <li className="text-PaleCerulean sm:text-xl text-lg font-normal transition-all duration-0.4s hover:text-primary">
                <Link href="/schedules">{t("nav.schedules")}</Link>
              </li>
              <li className="text-PaleCerulean sm:text-xl text-lg font-normal transition-all duration-0.4s hover:text-primary">
                <Link href="/about">{t("footer.about")}</Link>
              </li>
              <li className="text-PaleCerulean sm:text-xl text-lg font-normal transition-all duration-0.4s hover:text-primary">
                <Link href="/sponsors">{t("footer.sponsors")}</Link>
              </li>
            </ul>
          </div>

          <div>
            <ul className="flex items-center gap-5">
              <li>
                <Link
                  href="https://www.facebook.com/share/1D6EzJebTD/"
                  className="group"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    width="26"
                    height="27"
                    fill="white"
                    viewBox="0 0 26 27"
                    className="group-hover:fill-ElectricAqua"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_7_993)">
                      <path d="M23.8293 1.63855H2.14412C1.40159 1.639 0.799656 2.24123 0.799805 2.98405V24.6692C0.800251 25.4118 1.40248 26.0137 2.14531 26.0135H13.8204V16.5873H10.6545V12.8977H13.8204V10.1824C13.8204 7.03366 15.7427 5.31979 18.5516 5.31979C19.8969 5.31979 21.053 5.42007 21.39 5.46485V8.75586H19.4531C17.9249 8.75586 17.629 9.48202 17.629 10.5478V12.8977H21.2829L20.8068 16.5873H17.629V26.0135H23.8293C24.5723 26.0137 25.1747 25.4116 25.1748 24.6686C25.1748 24.6685 25.1748 24.6683 25.1748 24.668V2.98286C25.1745 2.24034 24.5721 1.6384 23.8293 1.63855Z" />
                    </g>
                    <defs>
                      <clipPath id="clip0_7_993">
                        <rect
                          width="26"
                          height="26"
                          fill="white"
                          transform="translate(0 0.838745)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.instagram.com/codeschoolprogramming?igsh=MTJkMnoyYWRkeXViMg%3D%3D"
                  className="group"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    width="26"
                    height="27"
                    viewBox="0 0 26 27"
                    fill="#fff"
                    className="group-hover:fill-ElectricAqua"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M18.3333 2.16675H7.66667C4.365 2.16675 1.66667 4.86508 1.66667 8.16675V18.8334C1.66667 22.1351 4.365 24.8334 7.66667 24.8334H18.3333C21.635 24.8334 24.3333 22.1351 24.3333 18.8334V8.16675C24.3333 4.86508 21.635 2.16675 18.3333 2.16675ZM13 18.8334C10.2383 18.8334 8.00001 16.5951 8.00001 13.8334C8.00001 11.0717 10.2383 8.83341 13 8.83341C15.7617 8.83341 18 11.0717 18 13.8334C18 16.5951 15.7617 18.8334 13 18.8334ZM18.3333 8.16675C17.6883 8.16675 17.1667 7.64508 17.1667 7.00008C17.1667 6.35508 17.6883 5.83341 18.3333 5.83341C18.9783 5.83341 19.5 6.35508 19.5 7.00008C19.5 7.64508 18.9783 8.16675 18.3333 8.16675Z" />
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.linkedin.com/company/code.school"
                  className="group"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    width="26"
                    height="28"
                    viewBox="0 0 26 28"
                    fill="#fff"
                    className="group-hover:fill-ElectricAqua"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_7_997)">
                      <path d="M24.1249 0H1.87514C0.839478 0 0 0.893637 0 1.99611V25.6813C0 26.7838 0.839478 27.6774 1.87514 27.6774H24.1249C25.1605 27.6774 26 26.7838 26 25.6813V1.99611C26 0.893637 25.1605 0 24.1249 0ZM9.22235 20.9202H6.05626V10.7805H9.22235V20.9202ZM7.6394 9.39586H7.61877C6.55634 9.39586 5.8692 8.61731 5.8692 7.64427C5.8692 6.64928 6.57736 5.89226 7.66043 5.89226C8.7435 5.89226 9.41 6.64928 9.43063 7.64427C9.43063 8.61731 8.7435 9.39586 7.6394 9.39586ZM20.6386 20.9202H17.4729V15.4957C17.4729 14.1324 17.0145 13.2027 15.8689 13.2027C14.9944 13.2027 14.4734 13.8298 14.2445 14.4352C14.1608 14.6519 14.1404 14.9547 14.1404 15.2577V20.9202H10.9745C10.9745 20.9202 11.016 11.7317 10.9745 10.7805H14.1404V12.2161C14.5611 11.5252 15.3139 10.5425 16.9937 10.5425C19.0767 10.5425 20.6386 11.9917 20.6386 15.1061V20.9202Z" />
                    </g>
                    <defs>
                      <clipPath id="clip0_7_997">
                        <rect width="26" height="27.6774" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  href="https://linktr.ee/Code_school"
                  className="group"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="#fff"
                    className="group-hover:fill-ElectricAqua"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M13.5 2.5H10.5V21.5H13.5V2.5ZM19.5 7.5H16.5V21.5H19.5V7.5ZM7.5 12.5H4.5V21.5H7.5V12.5Z" />
                  </svg>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-12 grid-cols-1 items-center py-8">
          <div className="col-span-5">
            <p className="text-base font-normal text-PaleCerulean">
              {t("footer.copyright")}{" "}
              <Link
                href="https://codeschool.online/"
                className="hover:text-white"
              >
                {t("footer.codeSchool")}
              </Link>
            </p>
          </div>

          <div className="col-span-7 grid md:grid-cols-12 grid-cols-1 items-center gap-6">
            <p className="text-xl text-PaleCerulean font-normal col-span-4">
              {t("footer.newsletter")}
            </p>
            <div className="w-full col-span-8">
              <form
                onSubmit={handleNewsletterSubmit}
                className="newsletter-form bg-white dark:bg-transparent flex rounded-md justify-end overflow-hidden rounded-tl-lg rounded-bl-lg"
              >
                <input
                  type="email"
                  placeholder={t("footer.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="p-4 text-base border-0 rounded-md outline-0 w-[calc(100%_-_137px)] flex dark:bg-midnight_text dark:text-white dark:rounded-none dark:w-full dark:bg-darkmode"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-1 hover-filled-slide-down bg-RegalBlue disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="!border-0 !text-white">
                    {loading ? (t("footer.subscribing") || "Subscribing...") : t("footer.subscribe")}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;