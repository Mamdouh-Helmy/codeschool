interface SpeechBubbleProps {
  text: string;
  typed: string;
  thinking: boolean;
  visible: boolean;
}

const TypingDots = () => (
  <span aria-hidden className="flex items-center gap-1.5">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="stage-dot h-2.5 w-2.5 rounded-full bg-primary"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </span>
);

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, typed, thinking, visible }) => (
  <div
    role="status"
    className={`about-display relative z-10 mb-3 origin-bottom whitespace-nowrap rounded-2xl border-2 border-secondary bg-white px-5 py-2 text-lg font-bold text-secondary transition duration-300 ${
      visible ? "scale-100 opacity-100" : "scale-75 opacity-0"
    }`}
  >
    {!thinking && <span className="sr-only">{text}</span>}

    {/* النص الكامل مخفي بيحجز المقاس، فالفقاعة مبتتغيّرش وإحنا بنكتب */}
    <span aria-hidden className="grid">
      <span className="invisible col-start-1 row-start-1">{text}</span>
      <span className="col-start-1 row-start-1 flex items-center">
        {thinking ? <TypingDots /> : typed}
      </span>
    </span>

    <span
      aria-hidden
      className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-secondary bg-white"
    />
  </div>
);

export default SpeechBubble;