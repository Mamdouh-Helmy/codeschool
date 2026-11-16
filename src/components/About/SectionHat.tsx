import Block, { type Tone } from "./Block";

interface SectionHatProps {
  title: string;
  tone?: Tone;
}

const SectionHat: React.FC<SectionHatProps> = ({ title, tone = "teal" }) => (
  <div className="mb-14 pb-3" data-aos="fade-up">
    <Block
      tone={tone}
      hat
      className="about-display px-8 pb-4 pt-6 text-3xl font-extrabold sm:text-4xl"
    >
      {title}
    </Block>
  </div>
);

export default SectionHat;