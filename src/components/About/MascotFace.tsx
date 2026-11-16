export type MascotMood = "idle" | "busy" | "happy";

const AMBER = "#feaf00";
const INK = "#004d59";
const DEEP = "#002a33";
const EYE_CENTERS = [120, 180];

const Mouth: React.FC<{ mood: MascotMood }> = ({ mood }) => {
  if (mood === "happy") {
    return (
      <g>
        <path
          d="M132 159 Q150 190 168 159 Z"
          fill={AMBER}
          stroke={AMBER}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <ellipse cx="150" cy="172" rx="8" ry="4.5" fill="#ff6437" />
      </g>
    );
  }
  if (mood === "busy") {
    return <path d="M138 168 H162" stroke="#fff" strokeWidth="5" strokeLinecap="round" />;
  }
  return (
    <path d="M136 164 Q150 178 164 164" fill="none" stroke={AMBER} strokeWidth="5" strokeLinecap="round" />
  );
};

/** شاشة الوش: العينين والحواجب والخدود والبوق */
const MascotFace: React.FC<{ mood: MascotMood }> = ({ mood }) => (
  <g>
    <rect x="80" y="96" width="140" height="96" rx="32" fill="url(#mc-screen)" stroke={DEEP} strokeWidth="3" />
    <path
      d="M96 108 Q96 102 104 102 L146 102 L114 184 L104 184 Q96 184 96 176 Z"
      fill="#fff"
      opacity="0.06"
    />

    <g className="mascot-face">
      <ellipse cx="98" cy="160" rx="9" ry="5" fill="#ff6437" opacity="0.5" />
      <ellipse cx="202" cy="160" rx="9" ry="5" fill="#ff6437" opacity="0.5" />

      <g className="mascot-brows" fill="none" stroke={AMBER} strokeWidth="4" strokeLinecap="round">
        <path d="M107 111 Q120 105 133 111" />
        <path d="M167 111 Q180 105 193 111" />
      </g>

      <g className="mascot-eyes">
        {EYE_CENTERS.map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy="134" rx="16" ry="19" fill={AMBER} opacity="0.5" filter="url(#mc-glow)" />
            <ellipse cx={cx} cy="134" rx="13" ry="16" fill="#fff" />
            <g className="mascot-pupil">
              <circle cx={cx} cy="135" r="9" fill={INK} />
              <circle cx={cx} cy="135" r="5" fill={DEEP} />
              <circle cx={cx - 3.5} cy="130.5" r="3" fill="#fff" />
              <circle cx={cx + 3} cy="139" r="1.5" fill="#fff" />
            </g>
          </g>
        ))}
      </g>

      <Mouth mood={mood} />
    </g>
  </g>
);

export default MascotFace;