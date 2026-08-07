"use client";

import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CiMenuFries } from "react-icons/ci";
import { usePortfolio } from "../../../../context/PortfolioContext";

const links = [
  { name: "home", path: "" },
  { name: "services", path: "/services" },
  { name: "resume", path: "/resume" },
  { name: "work", path: "/work" },
  { name: "contact", path: "/contact" },
];

const MobileNav = () => {
  const pathname = usePathname();
  const { basePath, portfolio } = usePortfolio();

  const firstName = (portfolio.ownerName || "Portfolio").split(" ")[0];

  return (
    <Sheet>
      <SheetTrigger className="flex justify-center items-center">
        <CiMenuFries className="text-[32px] text-accent" />
      </SheetTrigger>
      <SheetContent className="flex flex-col bg-white text-secondary dark:bg-darkmode dark:text-white">
        <div className="mt-32 mb-40 text-center text-2xl">
          <Link href={basePath}>
            <h1 className="text-4xl font-semibold">
              {firstName}
              <span className="text-primary">.</span>
            </h1>
          </Link>
        </div>
        <nav className="flex flex-col justify-center items-center gap-8">
          {links.map((link, index) => {
            const href = `${basePath}${link.path}`;
            const isActive = pathname === href;
            return (
              <Link
                href={href}
                key={index}
                className={`${
                  isActive
                    ? "text-accent border-b-2 border-accent"
                    : "text-secondary dark:text-white"
                } text-xl capitalize hover:text-accent transition-all`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;