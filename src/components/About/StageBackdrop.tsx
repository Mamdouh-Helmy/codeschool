const SYMBOLS = [
  { char: "{ }", top: "14%", left: "9%", delay: 0 },
  { char: "</>", top: "10%", left: "74%", delay: 1.2 },
  { char: "=>", top: "38%", left: "83%", delay: 2.4 },
  { char: ";", top: "42%", left: "8%", delay: 0.8 },
  { char: "[ ]", top: "57%", left: "81%", delay: 1.8 },
  { char: "( )", top: "60%", left: "10%", delay: 3 },
];

const StageBackdrop = () => (
  <>
    <div aria-hidden className="about-dots absolute inset-0" />

    <div aria-hidden dir="ltr" className="absolute inset-0 font-mono font-bold">
      {SYMBOLS.map(({ char, top, left, delay }, index) => (
        <span
          key={char}
          className={`stage-symbol absolute text-2xl ${
            index % 2 ? "text-primary/40" : "text-secondary/30 dark:text-white/25"
          }`}
          style={{ top, left, animationDelay: `${delay}s` }}
        >
          {char}
        </span>
      ))}
    </div>

    <div
      aria-hidden
      className="stage-floor absolute inset-x-0 bottom-0 h-[16%] border-t-4 border-amber-brand bg-secondary dark:bg-brand-deep"
    />
  </>
);

export default StageBackdrop;