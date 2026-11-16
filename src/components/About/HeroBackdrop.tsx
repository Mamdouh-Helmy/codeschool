// الإحداثيات بـ inset-inline-end عشان الرموز تفضل ناحية الشخصية في العربي والإنجليزي
const SYMBOLS = [
  { char: "{ }", top: "18%", end: "42%", delay: 0 },
  { char: "</>", top: "12%", end: "10%", delay: 1.2 },
  { char: "=>", top: "38%", end: "2%", delay: 2.4 },
  { char: "[ ]", top: "52%", end: "44%", delay: 1.8 },
];

const HeroBackdrop = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0">
    {SYMBOLS.map(({ char, top, end, delay }, index) => (
      <span
        key={char}
        dir="ltr"
        className={`stage-symbol absolute hidden font-mono text-3xl font-bold md:block ${
          index % 2 ? "text-primary/40" : "text-secondary/30 dark:text-white/25"
        }`}
        style={{ top, insetInlineEnd: end, animationDelay: `${delay}s` }}
      >
        {char}
      </span>
    ))}

    <div className="stage-floor absolute inset-x-0 bottom-0 h-20 border-t-4 border-amber-brand bg-secondary dark:bg-brand-deep">
      <p
        dir="ltr"
        className="absolute bottom-6 hidden font-mono text-sm text-white/50 sm:block"
        style={{ insetInlineStart: "6%" }}
      >
        <span className="text-amber-brand">$</span> npm run learn
        <span className="stage-caret ms-1 text-primary">▍</span>
      </p>
    </div>
  </div>
);

export default HeroBackdrop;