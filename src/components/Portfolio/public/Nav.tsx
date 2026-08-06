"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePortfolio } from "../../../../context/PortfolioContext";

const links = [
  { name: "home", path: "" },
  { name: "services", path: "/services" },
  { name: "resume", path: "/resume" },
  { name: "work", path: "/work" },
  { name: "contact", path: "/contact" },
];

const Nav = () => {
  const pathname = usePathname();
  const { basePath } = usePortfolio();

  return (
    <nav className="flex gap-8">
      {links.map((link, index) => {
        const href = `${basePath}${link.path}`;
        const isActive = pathname === href;
        return (
          <Link
            href={href}
            key={index}
            className={`${
              isActive && "text-accent border-b-2 border-accent"
            } capitalize font-medium hover:text-accent transition-all`}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
};

export default Nav;