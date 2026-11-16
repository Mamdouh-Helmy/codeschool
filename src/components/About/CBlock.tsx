import type { ReactNode } from "react";
import type { Tone } from "./Block";

interface CBlockProps {
  tone: Tone;
  title: ReactNode;
  children: ReactNode;
}

/** بلوك على شكل C: عنوان فوق، وجسم بيلفّ عليه من جنب */
const CBlock: React.FC<CBlockProps> = ({ tone, title, children }) => (
  <div className={`blk-tone-${tone}`}>
    <div className="blk-c-head about-display text-xl">{title}</div>
    <div className="blk-c-body text-lg leading-8 text-gray-700 dark:text-darkmuted">{children}</div>
    <div className="blk-c-foot" />
  </div>
);

export default CBlock;