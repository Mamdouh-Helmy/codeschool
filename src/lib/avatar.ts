// lib/avatar.ts
export const DEFAULT_AVATAR = "/images/default-avatar.jpg";

export function resolveAvatar(src?: string | null) {
  const v = src?.trim();
  if (!v) return DEFAULT_AVATAR;
  if (/^(https?:)?\/\//.test(v) || v.startsWith("/") || v.startsWith("data:")) return v;
  return `/${v}`;
}