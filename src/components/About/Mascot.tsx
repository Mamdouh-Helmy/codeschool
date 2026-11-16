import MascotFace, { type MascotMood } from "./MascotFace";
import { Arm, Leg, Neck, Torso } from "./MascotBody";

export type { MascotMood } from "./MascotFace";

interface MascotProps {
  mood: MascotMood;
  /** بيزيد مع كل نطة — بيعيد تشغيل أنيميشن النطة والتلويح */
  hopKey: number;
}

const INK = "#004d59";
const AMBER = "#feaf00";

const Defs = () => (
  <defs>
    <linearGradient id="mc-orange" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#ff8f3a" />
      <stop offset="0.55" stopColor="#ff6700" />
      <stop offset="1" stopColor="#e05200" />
    </linearGradient>
    <linearGradient id="mc-teal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor="#003c47" />
      <stop offset="0.4" stopColor="#0b6f7f" />
      <stop offset="1" stopColor="#003640" />
    </linearGradient>
    <linearGradient id="mc-screen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#00323c" />
      <stop offset="1" stopColor="#001a1f" />
    </linearGradient>
    <filter id="mc-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" />
    </filter>
  </defs>
);

const Head: React.FC<{ mood: MascotMood }> = ({ mood }) => (
  <g className="mascot-head">
    {/* headband — ورا الراس */}
    <path d="M52 138 C52 46 248 46 248 138" fill="none" stroke={INK} strokeWidth="8" strokeLinecap="round" />

    {/* ear cups */}
    {[38, 236].map((x) => (
      <g key={x}>
        <rect x={x} y="120" width="26" height="54" rx="13" fill="url(#mc-teal)" stroke={INK} strokeWidth="3" />
        <circle cx={x + 13} cy="147" r="7" fill={AMBER} stroke={INK} strokeWidth="2.5" />
      </g>
    ))}

    {/* head shell */}
    <rect x="62" y="72" width="176" height="140" rx="46" fill="url(#mc-orange)" stroke={INK} strokeWidth="5" />
    <path d="M84 100 Q90 84 120 82" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="6" strokeLinecap="round" />

    <MascotFace mood={mood} />

    {/* mic */}
    <path d="M48 172 Q50 204 96 205" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    <circle cx="101" cy="205" r="6" fill={AMBER} stroke={INK} strokeWidth="3" />

    {/* antenna */}
    <ellipse cx="150" cy="72" rx="14" ry="5" fill={INK} />
    <path
      d="M150 74 l-9 -5 l18 -5 l-18 -5 l18 -5 l-9 -5 V42"
      fill="none"
      stroke={INK}
      strokeWidth="3.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <circle className="mascot-halo" cx="150" cy="32" r="20" fill={AMBER} />
    <circle cx="150" cy="32" r="11" fill={AMBER} stroke={INK} strokeWidth="3.5" />
    <circle cx="146" cy="28" r="3" fill="#fff" opacity="0.8" />
  </g>
);

const Mascot: React.FC<MascotProps> = ({ mood, hopKey }) => {
  const hasHopped = hopKey > 0;

  return (
    <span className="mascot block" data-mood={mood}>
      <svg viewBox="0 0 300 400" className="h-auto w-full overflow-visible" aria-hidden>
        <Defs />

        <ellipse
          key={`shadow-${hopKey}`}
          className={`mascot-shadow ${hasHopped ? "mascot-shadow-hop" : ""}`}
          cx="150"
          cy="390"
          rx="64"
          ry="7"
          fill="#000"
          opacity="0.22"
        />

        <g key={hopKey} className={hasHopped ? "mascot-hop" : undefined}>
          <g className="mascot-breathe">
            <Arm x={78} />
            <Arm x={200} className="mascot-wave-arm" />
            <Leg x={114} />
            <Leg x={162} />
            <Neck />
            <Torso />
            <Head mood={mood} />
          </g>
        </g>
      </svg>
    </span>
  );
};

export default Mascot;