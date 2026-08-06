// components/hero/Social.tsx
import {
    FaGithub,
    FaLinkedinIn,
    FaTwitter,
    FaGlobe,
    FaBehance,
    FaDribbble,
    FaInstagram,
    FaYoutube,
    FaFacebookF,
} from "react-icons/fa";
import type { SocialLink } from "@/types/portfolio";

const iconMap: Record<string, React.ReactNode> = {
    github: <FaGithub />,
    linkedin: <FaLinkedinIn />,
    twitter: <FaTwitter />,
    website: <FaGlobe />,
    behance: <FaBehance />,
    dribbble: <FaDribbble />,
    instagram: <FaInstagram />,
    youtube: <FaYoutube />,
    facebook: <FaFacebookF />,
};

interface SocialProps {
    socialLinks?: SocialLink[];
    containerStyles?: string;
    iconStyles?: string;
}

const Social = ({ socialLinks = [], containerStyles, iconStyles }: SocialProps) => {
    if (!socialLinks.length) return null;

    return (
        <div className={containerStyles}>
            {socialLinks.map((item) => {
                const icon = iconMap[item.platform];
                if (!icon) return null; // منصة مش معرّفة عندنا، منعرضهاش كنص خام

                return (
                    <a
                        key={item.id}
                        href={item.url}
                        className={iconStyles}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.platform}
                    >
                        {icon}
                    </a>
                );
            })}
        </div>
    );
};

export default Social;