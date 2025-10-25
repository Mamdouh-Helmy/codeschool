import React, { FC } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

const Footer: FC = () => {
  const { t } = useI18n();

  return (
    <footer className="bg-secondary">
      <div className="container">
        <div className="flex items-center justify-between flex-wrap md:pt-44 pt-16 md:pb-20 pb-6 border-b border-solid border-dark_border">
          <div>
            <Link href="/">
              {/* Using absolute path from public folder */}
              <img 
                src="/images/logo/footer-logo-white.png" 
                alt={t("footer.logoAlt")} 
                className="w-24 " 
              />
            </Link>
          </div>
          
          {/* Rest of your footer content remains the same */}
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
              {/* Social media icons remain the same */}
              <li>
                <Link href="/" className="group">
                  <svg
                    width="26"
                    height="27"
                    fill="white"
                    viewBox="0 0 26 27"
                    className="group-hover:fill-ElectricAqua"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* SVG path remains the same */}
                    <path d="M23.8293 1.63855H2.14412C1.40159 1.639 0.799656 2.24123 0.799805 2.98405V24.6692C0.800251 25.4118 1.40248 26.0137 2.14531 26.0135H13.8204V16.5873H10.6545V12.8977H13.8204V10.1824C13.8204 7.03366 15.7427 5.31979 18.5516 5.31979C19.8969 5.31979 21.053 5.42007 21.39 5.46485V8.75586H19.4531C17.9249 8.75586 17.629 9.48202 17.629 10.5478V12.8977H21.2829L20.8068 16.5873H17.629V26.0135H23.8293C24.5723 26.0137 25.1747 25.4116 25.1748 24.6686C25.1748 24.6685 25.1748 24.6683 25.1748 24.668V2.98286C25.1745 2.24034 24.5721 1.6384 23.8293 1.63855Z" />
                  </svg>
                </Link>
              </li>
              {/* Other social icons... */}
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
              <form className="newsletter-form bg-white dark:bg-transparent flex rounded-md justify-end overflow-hidden rounded-tl-lg rounded-bl-lg">
                <input
                  type="email"
                  placeholder={t("footer.emailPlaceholder")}
                  className="p-4 text-base border-0 rounded-md outline-0 w-[calc(100%_-_137px)] flex dark:bg-midnight_text dark:text-white dark:rounded-none dark:w-full dark:bg-darkmode"
                />
                <button
                  type="submit"
                  className="btn btn-1 hover-filled-slide-down bg-RegalBlue"
                >
                  <span className="!border-0 !text-white">{t("footer.subscribe")}</span>
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