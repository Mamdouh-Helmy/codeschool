"use client";
import { Icon } from "@iconify/react";
import * as simpleIcons from "simple-icons";

interface SkillIconProps {
  name?: string;
  size?: number;
  className?: string;
}

export default function SkillIcon({ name, size = 20, className = "" }: SkillIconProps) {
  if (!name) return null;

  // ✅ صورة مرفوعة يدويًا (URL أو base64)
  if (name.startsWith("http") || name.startsWith("data:")) {
    return (
      <img
        src={name}
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, objectFit: "contain", borderRadius: 4 }}
      />
    );
  }

  // ✅ صيغة iconify الجديدة: "prefix:name" (مثلاً "logos:figma")
  if (name.includes(":")) {
    return <Icon icon={name} width={size} height={size} className={className} />;
  }

  // ✅ توافق خلفي: simple-icons القديمة بصيغة slug بسيط
  const key = `si${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  const icon = (simpleIcons as any)[key];
  if (icon) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill={`#${icon.hex}`} className={className}>
        <path d={icon.path} />
      </svg>
    );
  }

  // ✅ fallback: إيموجي أو نص قديم
  return <span className={className} style={{ fontSize: size }}>{name}</span>;
}