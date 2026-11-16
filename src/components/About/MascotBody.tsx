const INK = "#004d59";
const DEEP = "#002a33";

const LEDS = [
  { cx: 132, fill: "#feaf00", delay: 0 },
  { cx: 150, fill: "#4ade80", delay: 0.5 },
  { cx: 168, fill: "#ffffff", delay: 1 },
];

interface ArmProps {
  x: number;
  className?: string;
}

export const Arm: React.FC<ArmProps> = ({ x, className = "" }) => (
  <g className={`mascot-arm ${className}`}>
    <rect x={x} y="250" width="22" height="58" rx="11" fill="url(#mc-teal)" />
    <circle cx={x + 11} cy="278" r="7" fill={DEEP} opacity="0.35" />
    <circle cx={x + 11} cy="314" r="13" fill="#feaf00" stroke={INK} strokeWidth="3" />
    <circle cx={x + 7} cy="310" r="3" fill="#fff" opacity="0.55" />
  </g>
);

export const Leg: React.FC<{ x: number }> = ({ x }) => (
  <g>
    <rect x={x} y="320" width="24" height="56" rx="10" fill="url(#mc-teal)" />
    <rect x={x - 10} y="366" width="44" height="22" rx="11" fill="url(#mc-orange)" stroke={INK} strokeWidth="3" />
    <path d={`M${x - 3} 374 H${x + 10}`} stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
  </g>
);

export const Neck = () => (
  <g>
    <rect x="134" y="206" width="32" height="32" rx="8" fill="url(#mc-teal)" />
    <path d="M134 220 H166 M134 228 H166" stroke={DEEP} strokeOpacity="0.4" strokeWidth="2" />
  </g>
);

export const Torso = () => (
  <g>
    <rect x="96" y="232" width="108" height="98" rx="32" fill="url(#mc-orange)" stroke={INK} strokeWidth="5" />
    <path d="M110 252 Q108 272 112 292" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round" />
    <circle cx="110" cy="244" r="2.5" fill="#c24a00" />
    <circle cx="190" cy="244" r="2.5" fill="#c24a00" />

    <rect x="118" y="252" width="64" height="44" rx="12" fill="url(#mc-screen)" stroke={INK} strokeWidth="3" />
    <text
      x="150"
      y="281"
      textAnchor="middle"
      fontFamily="monospace"
      fontWeight="800"
      fontSize="20"
      fill="#feaf00"
    >
      {"</>"}
    </text>

    {LEDS.map(({ cx, fill, delay }) => (
      <circle
        key={cx}
        className="mascot-led"
        cx={cx}
        cy="312"
        r="4.5"
        fill={fill}
        style={{ animationDelay: `${delay}s` }}
      />
    ))}

    <path d="M104 323 H196" stroke="#c24a00" strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" opacity="0.6" />
  </g>
);