export default function TeacherCharacter({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 680 700"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%" }}
        role="img"
        aria-label="Teacher character illustration"
      >
        <defs>
          <style>{`
            .body-float { animation: bodyFloat 3.5s ease-in-out infinite; transform-origin: 340px 400px; }
            .arm-wave   { animation: armWave 2s ease-in-out infinite; transform-origin: 290px 310px; }
            .star1      { animation: starPop 2s 0.2s ease-in-out infinite; }
            .star2      { animation: starPop 2.4s 0.8s ease-in-out infinite; }
            .star3      { animation: starPop 1.8s 1.4s ease-in-out infinite; }
            .book-bob   { animation: bookBob 3.5s ease-in-out infinite; transform-origin: 420px 360px; }
            .eye-blink  { animation: blink 4s 2s ease-in-out infinite; transform-origin: 340px 175px; }
            .shadow-el  { animation: shadowPulse 3.5s ease-in-out infinite; transform-origin: 340px 620px; }
            .sparkle1   { animation: sparkleAnim 1.6s 0s ease-in-out infinite; }
            .sparkle2   { animation: sparkleAnim 1.6s 0.5s ease-in-out infinite; }
            .sparkle3   { animation: sparkleAnim 1.6s 1.0s ease-in-out infinite; }
            @keyframes bodyFloat {
              0%,100% { transform: translateY(0px); }
              50%     { transform: translateY(-18px); }
            }
            @keyframes armWave {
              0%,100% { transform: rotate(0deg); }
              30%     { transform: rotate(-22deg); }
              60%     { transform: rotate(8deg); }
            }
            @keyframes bookBob {
              0%,100% { transform: translateY(0px) rotate(0deg); }
              50%     { transform: translateY(-18px) rotate(3deg); }
            }
            @keyframes blink {
              0%,90%,100% { transform: scaleY(1); }
              95%         { transform: scaleY(0.05); }
            }
            @keyframes shadowPulse {
              0%,100% { transform: scaleX(1); opacity: 0.25; }
              50%     { transform: scaleX(0.75); opacity: 0.12; }
            }
            @keyframes starPop {
              0%,100% { transform: scale(1) rotate(0deg); opacity: 1; }
              50%     { transform: scale(1.4) rotate(20deg); opacity: 0.7; }
            }
            @keyframes sparkleAnim {
              0%,100% { opacity: 0; transform: scale(0.5); }
              50%     { opacity: 1; transform: scale(1.2); }
            }
          `}</style>

          <linearGradient id="tc-skinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFDBB5" />
            <stop offset="100%" stopColor="#F5C28A" />
          </linearGradient>
          <linearGradient id="tc-skinSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E8A96A" />
            <stop offset="100%" stopColor="#FFDBB5" />
          </linearGradient>
          <linearGradient id="tc-jacketGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#004d59" />
            <stop offset="100%" stopColor="#002a33" />
          </linearGradient>
          <linearGradient id="tc-jacketSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#001a22" />
            <stop offset="100%" stopColor="#004d59" />
          </linearGradient>
          <linearGradient id="tc-bookGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6700" />
            <stop offset="100%" stopColor="#cc4400" />
          </linearGradient>
          <linearGradient id="tc-bookSide" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#882200" />
            <stop offset="100%" stopColor="#ff6700" />
          </linearGradient>
          <linearGradient id="tc-pantsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a3a45" />
            <stop offset="100%" stopColor="#0a1e25" />
          </linearGradient>
          <linearGradient id="tc-hairGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d2010" />
            <stop offset="100%" stopColor="#1a0a05" />
          </linearGradient>
          <linearGradient id="tc-shoeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#222" />
            <stop offset="100%" stopColor="#111" />
          </linearGradient>
          <linearGradient id="tc-pageGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f5f0e8" />
            <stop offset="100%" stopColor="#fffdf8" />
          </linearGradient>
          <linearGradient id="tc-tieGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#feaf00" />
            <stop offset="100%" stopColor="#cc8800" />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="340" cy="624" rx="100" ry="14" fill="#004d59" className="shadow-el" />

        {/* ── FLOATING BODY ── */}
        <g className="body-float">
          {/* Legs */}
          <rect x="296" y="510" width="42" height="90" rx="14" fill="url(#tc-pantsGrad)" />
          <rect x="295" y="514" width="8" height="82" rx="4" fill="#0a1e25" />
          <rect x="342" y="510" width="42" height="90" rx="14" fill="url(#tc-pantsGrad)" />
          <rect x="376" y="514" width="8" height="82" rx="4" fill="#061217" />

          {/* Shoes */}
          <ellipse cx="315" cy="604" rx="24" ry="10" fill="url(#tc-shoeGrad)" />
          <ellipse cx="313" cy="604" rx="6" ry="9" fill="#333" />
          <ellipse cx="365" cy="604" rx="24" ry="10" fill="url(#tc-shoeGrad)" />
          <ellipse cx="363" cy="604" rx="6" ry="9" fill="#333" />

          {/* Jacket */}
          <rect x="239" y="295" width="18" height="220" rx="9" fill="url(#tc-jacketSide)" />
          <rect x="255" y="290" width="170" height="225" rx="22" fill="url(#tc-jacketGrad)" />
          <rect x="270" y="295" width="12" height="210" rx="6" fill="#006070" opacity="0.5" />

          {/* Shirt collar */}
          <path d="M315 290 Q340 320 365 290 L365 330 Q340 355 315 330 Z" fill="#f0f0f0" />
          <path d="M330 290 Q340 308 350 290" fill="none" stroke="#cccccc" strokeWidth="1.5" />

          {/* Tie */}
          <path d="M334 300 L346 300 L350 390 L340 400 L330 390 Z" fill="url(#tc-tieGrad)" />
          <ellipse cx="340" cy="302" rx="8" ry="6" fill="#cc8800" />

          {/* Lapels */}
          <path d="M255 295 Q310 340 315 330 L315 290" fill="#003840" opacity="0.6" />
          <path d="M425 295 Q370 340 365 330 L365 290" fill="#001820" opacity="0.6" />

          {/* Buttons */}
          <circle cx="340" cy="420" r="5" fill="#001a22" />
          <circle cx="340" cy="445" r="5" fill="#001a22" />
          <circle cx="340" cy="470" r="5" fill="#001a22" />

          {/* Waving arm (left) */}
          <g className="arm-wave">
            <rect x="220" y="290" width="40" height="90" rx="18" fill="url(#tc-jacketGrad)" />
            <rect x="218" y="295" width="10" height="80" rx="5" fill="#001a22" />
            <ellipse cx="228" cy="385" rx="19" ry="28" fill="url(#tc-skinGrad)" />
            <ellipse cx="218" cy="385" rx="6" ry="24" fill="url(#tc-skinSide)" />
            <ellipse cx="215" cy="365" rx="7" ry="10" fill="url(#tc-skinGrad)" transform="rotate(-20,215,365)" />
            <ellipse cx="207" cy="372" rx="7" ry="10" fill="url(#tc-skinGrad)" transform="rotate(-35,207,372)" />
            <ellipse cx="208" cy="385" rx="7" ry="10" fill="url(#tc-skinGrad)" transform="rotate(-45,208,385)" />
          </g>

          {/* Right arm */}
          <rect x="420" y="290" width="40" height="90" rx="18" fill="url(#tc-jacketGrad)" />
          <rect x="452" y="295" width="10" height="80" rx="5" fill="#001a22" />
          <ellipse cx="432" cy="388" rx="19" ry="28" fill="url(#tc-skinGrad)" />
        </g>

        {/* ── BOOK (bobs independently) ── */}
        <g className="book-bob">
          <rect x="390" y="340" width="18" height="90" rx="4" fill="url(#tc-bookSide)" />
          <rect x="390" y="337" width="95" height="10" rx="3" fill="#ff8833" />
          <rect x="405" y="340" width="90" height="90" rx="6" fill="url(#tc-bookGrad)" />
          <rect x="408" y="343" width="80" height="84" rx="4" fill="url(#tc-pageGrad)" />
          <line x1="416" y1="358" x2="480" y2="358" stroke="#ccc" strokeWidth="1.5" />
          <line x1="416" y1="368" x2="480" y2="368" stroke="#ccc" strokeWidth="1.5" />
          <line x1="416" y1="378" x2="480" y2="378" stroke="#ccc" strokeWidth="1.5" />
          <line x1="416" y1="388" x2="470" y2="388" stroke="#ccc" strokeWidth="1.5" />
          <line x1="416" y1="398" x2="474" y2="398" stroke="#ccc" strokeWidth="1.5" />
          <line x1="416" y1="408" x2="462" y2="408" stroke="#ccc" strokeWidth="1.5" />
          <rect x="405" y="340" width="5" height="90" rx="2" fill="#ff6700" />
        </g>

        {/* ── HEAD ── */}
        <g className="body-float">
          {/* Neck */}
          <rect x="320" y="232" width="40" height="35" rx="10" fill="url(#tc-skinGrad)" />
          <rect x="318" y="235" width="10" height="28" rx="5" fill="url(#tc-skinSide)" />

          {/* Head */}
          <ellipse cx="253" cy="175" rx="20" ry="65" fill="#E8A96A" />
          <ellipse cx="340" cy="170" rx="82" ry="82" fill="url(#tc-skinGrad)" />
          <ellipse cx="320" cy="130" rx="30" ry="22" fill="#FFE8CC" opacity="0.5" />
          <ellipse cx="278" cy="195" rx="16" ry="10" fill="#ff9977" opacity="0.3" />
          <ellipse cx="400" cy="195" rx="16" ry="10" fill="#ff9977" opacity="0.3" />

          {/* Hair */}
          <ellipse cx="340" cy="102" rx="78" ry="35" fill="url(#tc-hairGrad)" />
          <ellipse cx="270" cy="140" rx="20" ry="50" fill="#2a1008" />
          <ellipse cx="408" cy="140" rx="20" ry="45" fill="#1a0a05" />
          <ellipse cx="320" cy="98" rx="22" ry="10" fill="#6b3520" opacity="0.5" />

          {/* Eyes */}
          <g className="eye-blink">
            <ellipse cx="308" cy="178" rx="18" ry="17" fill="white" />
            <ellipse cx="372" cy="178" rx="18" ry="17" fill="white" />
            <circle cx="310" cy="179" r="11" fill="#1a3a45" />
            <circle cx="374" cy="179" r="11" fill="#1a3a45" />
            <circle cx="311" cy="180" r="6" fill="#0a0a0a" />
            <circle cx="375" cy="180" r="6" fill="#0a0a0a" />
            <circle cx="314" cy="175" r="3" fill="white" />
            <circle cx="378" cy="175" r="3" fill="white" />
            {/* Eyebrows */}
            <path d="M292 158 Q308 150 324 156" fill="none" stroke="#2a1008" strokeWidth="4" strokeLinecap="round" />
            <path d="M356 156 Q372 150 388 158" fill="none" stroke="#2a1008" strokeWidth="4" strokeLinecap="round" />
          </g>

          {/* Nose */}
          <ellipse cx="340" cy="200" rx="9" ry="7" fill="#E8A96A" />
          <ellipse cx="336" cy="202" rx="4" ry="3" fill="#d4946a" opacity="0.5" />

          {/* Smile */}
          <path d="M312 218 Q340 242 368 218" fill="none" stroke="#cc6644" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M318 222 Q340 236 362 222 Q340 228 318 222Z" fill="white" />

          {/* Glasses */}
          <rect x="283" y="167" width="42" height="26" rx="10" fill="none" stroke="#ff6700" strokeWidth="3" />
          <rect x="354" y="167" width="42" height="26" rx="10" fill="none" stroke="#ff6700" strokeWidth="3" />
          <line x1="325" y1="178" x2="354" y2="178" stroke="#ff6700" strokeWidth="3" />
          <ellipse cx="296" cy="172" rx="7" ry="4" fill="white" opacity="0.25" />
          <ellipse cx="367" cy="172" rx="7" ry="4" fill="white" opacity="0.25" />
          <line x1="283" y1="178" x2="258" y2="178" stroke="#ff6700" strokeWidth="2.5" />
          <line x1="396" y1="178" x2="420" y2="178" stroke="#ff6700" strokeWidth="2.5" />

          {/* Ears */}
          <ellipse cx="262" cy="180" rx="12" ry="17" fill="url(#tc-skinGrad)" />
          <ellipse cx="260" cy="180" rx="6" ry="10" fill="#E8A96A" opacity="0.6" />
          <ellipse cx="418" cy="180" rx="12" ry="17" fill="url(#tc-skinGrad)" />
          <ellipse cx="420" cy="180" rx="6" ry="10" fill="#FFE0B0" opacity="0.6" />
        </g>

        {/* ── DECORATIONS ── */}
        <g className="star1">
          <polygon points="140,180 148,200 168,200 152,212 158,232 140,220 122,232 128,212 112,200 132,200" fill="#feaf00" opacity="0.85" />
        </g>
        <g className="star2">
          <polygon points="530,150 536,165 551,165 539,174 543,189 530,180 517,189 521,174 509,165 524,165" fill="#ff6700" opacity="0.8" />
        </g>
        <g className="star3">
          <polygon points="175,400 179,412 192,412 182,420 186,432 175,424 164,432 168,420 158,412 171,412" fill="#ff6437" opacity="0.7" />
        </g>

        <g className="sparkle1" style={{ transformOrigin: "560px 280px" }}>
          <line x1="550" y1="280" x2="570" y2="280" stroke="#feaf00" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="560" y1="270" x2="560" y2="290" stroke="#feaf00" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="553" y1="273" x2="567" y2="287" stroke="#feaf00" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="567" y1="273" x2="553" y2="287" stroke="#feaf00" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <g className="sparkle2" style={{ transformOrigin: "125px 270px" }}>
          <line x1="115" y1="270" x2="135" y2="270" stroke="#ff6700" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="125" y1="260" x2="125" y2="280" stroke="#ff6700" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="118" y1="263" x2="132" y2="277" stroke="#ff6700" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="132" y1="263" x2="118" y2="277" stroke="#ff6700" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <g className="sparkle3" style={{ transformOrigin: "580px 440px" }}>
          <line x1="570" y1="440" x2="590" y2="440" stroke="#004d59" strokeWidth="2" strokeLinecap="round" />
          <line x1="580" y1="430" x2="580" y2="450" stroke="#004d59" strokeWidth="2" strokeLinecap="round" />
        </g>

        <circle cx="162" cy="310" r="7" fill="#ff6700" opacity="0.4" className="star2" />
        <circle cx="530" cy="370" r="5" fill="#feaf00" opacity="0.5" className="star1" />
        <circle cx="155" cy="460" r="5" fill="#004d59" opacity="0.4" className="star3" />
        <circle cx="545" cy="480" r="7" fill="#ff6437" opacity="0.4" className="star1" />
      </svg>
    </div>
  );
}