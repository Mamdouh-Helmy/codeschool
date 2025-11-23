'use client';
import { memo } from 'react';
import { Play, Code, Blocks, Rocket } from 'lucide-react';

interface PlatformIconProps {
    platform: string;
}

const PlatformIcon = memo(({ platform }: PlatformIconProps) => {
    const platformIcons: Record<string, JSX.Element> = {
        'Code.org': <Code className="w-5 h-5" />,
        'Scratch': <Blocks className="w-5 h-5" />,
        'Replit': <Play className="w-5 h-5" />,
        'Python': <Code className="w-5 h-5" />,
        'JavaScript': <Code className="w-5 h-5" />,
        'HTML/CSS': <Code className="w-5 h-5" />,
        'Unity': <Rocket className="w-5 h-5" />,
        'default': <Code className="w-5 h-5" />,
    };

    return platformIcons[platform] ?? platformIcons["default"];
});

PlatformIcon.displayName = 'PlatformIcon';

export default PlatformIcon;