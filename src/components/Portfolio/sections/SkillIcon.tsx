"use client";
import * as simpleIcons from "simple-icons";

interface SkillIconProps {
  name?: string;      // slug زي "react" أو "nodedotjs"
  size?: number;
  className?: string;
}

export default function SkillIcon({ name, size = 20, className = "" }: SkillIconProps) {
  if (!name) return null;

  const key = `si${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  const icon = (simpleIcons as any)[key];

  // ✅ Fallback: لو كانت قيمة قديمة (إيموجي نصي) اعرضها زي ما هي
  if (!icon) {
    return <span className={className} style={{ fontSize: size }}>{name}</span>;
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={`#${icon.hex}`}
      className={className}
    >
      <path d={icon.path} />
    </svg>
  );
}