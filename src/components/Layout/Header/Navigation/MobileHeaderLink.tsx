import { useState } from 'react';
import Link from 'next/link';
import { HeaderItem } from '../../../../types/menu';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nProvider';

const MobileHeaderLink: React.FC<{ item: HeaderItem }> = ({ item }) => {
  const { t } = useI18n();
  const [submenuOpen, setSubmenuOpen] = useState(false);

  // دالة مساعدة لعرض النص
  const getDisplayText = (menuItem: any) => {
    if (menuItem.isDynamic) {
      return menuItem.label;
    }
    return t(`nav.${menuItem.label.toLowerCase()}`);
  };

  const handleToggle = () => {
    setSubmenuOpen(!submenuOpen);
  };

  const router = useRouter();

  const handleNavigate = () => {
    router.push(item.href);
  }

  const path = usePathname();

  return (
    <div className="relative w-full">
      <button
        onClick={item.submenu ? handleToggle : handleNavigate}
        className={`flex items-center justify-between w-full py-2 text-black dark:text-white focus:outline-none ${path == item.href ? '!text-primary' : null} ${path.startsWith(`/${item.label.toLowerCase()}`) ? '!text-primary' : null}`}
      >
        {getDisplayText(item)}
        {item.submenu && (
          <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m7 10l5 5l5-5" />
          </svg>
        )}
      </button>
      {submenuOpen && item.submenu && (
        <div className="bg-white dark:bg-darkmode p-2 w-full">
          {item.submenu.map((subItem, index) => (
            <Link key={index} href={subItem.href} className="block py-2 text-gray-500 ">
              {getDisplayText(subItem)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileHeaderLink;
