"use client"
import { useState } from 'react';
import Link from 'next/link';
import { HeaderItem } from '../../../../types/menu';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';

const HeaderLink: React.FC<{ item: HeaderItem }> = ({ item }) => {
  const { t } = useI18n();
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const path = usePathname();

  const handleMouseEnter = () => {
    if (item.submenu) {
      setSubmenuOpen(true);
    }
  };

  const handleMouseLeave = () => {
    setSubmenuOpen(false);
  };

  const getDisplayText = (menuItem: any) => {
    if (menuItem.isDynamic) {
      return menuItem.label;
    }
    return t(`nav.${menuItem.label.toLowerCase()}`);
  };

  return (
    <li
      className={`${item.submenu ? "relative" : ""} ${item.label === "speakers" ? 'xl:block hidden' : "block"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={item.href}
        className={`text-base text-MidnightNavyText py-3 dark:text-white flex font-normal hover:text-primary dark:hover:text-primary ${
          path === item.href ? 'text-primary dark:!text-primary' : 'text-black dark:text-white'
        } ${path.startsWith(`/${item.label.toLowerCase()}`) ? 'text-primary dark:!text-primary' : null}`}
      >
        {getDisplayText(item)}
        {item.submenu && (
          <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m7 10l5 5l5-5" />
          </svg>
        )}
      </Link>
      {submenuOpen && (
        <div
          className="absolute py-2 left-0 mt-0.5 top-9 w-60 bg-white dark:bg-darklight shadow-lg dark:shadow-black/40 rounded-lg border border-gray-100 dark:border-dark_border"
          data-aos="fade-up"
          data-aos-duration="500"
        >
          {item.submenu?.map((subItem, index) => (
            <Link
              key={index}
              href={subItem.href}
              className={`block px-4 py-2 text-[15px] transition-colors duration-150 ${
                path === subItem.href
                  ? "bg-primary text-white"
                  : "text-black hover:bg-gray-100 dark:hover:bg-darkhover dark:text-white hover:text-dark dark:hover:text-white"
              }`}
            >
              {getDisplayText(subItem)}
            </Link>
          ))}
        </div>
      )}
    </li>
  );
};

export default HeaderLink;