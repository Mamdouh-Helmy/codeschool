import Image from 'next/image';
import Link from 'next/link';

const Logo: React.FC = () => {
  return (
    <Link href="/">
      <img
        src="/images/logo/logo.png"
        alt="logo"
        width={60}
        height={50}
       
        className="dark:hidden"
      />

      <img
        src="/images/logo/footer-logo-white.png"
        alt="logo"
        width={60}
        height={50}
       
        className="dark:block hidden "
      />
    </Link>
  );
};

export default Logo;