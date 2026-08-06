// components/Portfolio/public/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import Nav from "./Nav";
import MobileNav from "./MobileNav";
import { usePortfolio } from "../../../../context/PortfolioContext";

const Header = () => {
  const { basePath, portfolio } = usePortfolio();

  const displayName = portfolio.ownerName || "Portfolio";
  const firstName = displayName.split(" ")[0];
  const restOfName = ".";

  return (
    <header className="py-8 xl:py-12 text-white" dir="ltr">
      <div className="container mx-auto flex justify-between items-center">
        <Link href={basePath}>
          <h1 className="text-4xl font-semibold">
            {firstName}
            {restOfName && <span className="text-primary"> {restOfName}</span>}
          </h1>
        </Link>

        <div className="hidden xl:flex items-center gap-8">
          <Nav />
          <Link href={`${basePath}/contact`} className="hidden xl:block">
            <Button className="bg-primary">Hire me</Button>
          </Link>
        </div>

        <div className="xl:hidden">
          <MobileNav />
        </div>
      </div>
    </header>
  );
};

export default Header;