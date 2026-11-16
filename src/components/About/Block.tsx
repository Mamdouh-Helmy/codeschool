import type { CSSProperties, ReactNode } from "react";

export type Tone = "primary" | "teal" | "amber" | "deep";

interface BlockClassOptions {
  hat?: boolean;
  drop?: boolean;
}

export const blockClass = (tone: Tone, { hat, drop }: BlockClassOptions = {}) =>
  ["blk", `blk-tone-${tone}`, hat && "blk-hat", drop && "blk-drop"].filter(Boolean).join(" ");

interface BlockProps {
  tone: Tone;
  hat?: boolean;
  active?: boolean;
  /** ترتيب البلوك في أنيميشن النزول — لو مش متحدد مفيش أنيميشن */
  index?: number;
  className?: string;
  children: ReactNode;
}

const Block: React.FC<BlockProps> = ({ tone, hat, active, index, className = "", children }) => {
  const style = index !== undefined ? ({ "--i": index } as CSSProperties) : undefined;

  return (
    <div
      className={`${blockClass(tone, { hat, drop: index !== undefined })} ${className}`}
      data-active={active || undefined}
      style={style}
    >
      {children}
    </div>
  );
};

export default Block;