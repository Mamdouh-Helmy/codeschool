import Image from 'next/image';
import Link from 'next/link';

const Logo: React.FC = () => {

  return (
    <Link href="/">
      <Image
        src="/images/logo/logo.png"
        alt="logo"
        width={110}
        height={50}
        // style={{ width: 'auto', height: 'auto' }}
        quality={100}
        className='dark:hidden -mt-8'
      />
      <Image
        src="/images/logo/footer-logo-white.png"
        alt="logo"
        width={110}
        height={50}
        // style={{ width: 'auto', height: 'auto' }}
        quality={100}
        className='dark:block hidden -mt-8'
      />
    </Link>
  );
};

export default Logo;
