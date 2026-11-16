import type { CSSProperties } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";

const ICONS = ["logos:html-5", "logos:css-3", "logos:javascript", "logos:react", "logos:python"];
const STEP = 360 / ICONS.length;

/** شمس مسطحة + مدار بأيقونات اللغات بيلف ورا الشخصية */
const MascotOrbit = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute left-1/2 top-[56%] aspect-square w-full -translate-x-1/2 -translate-y-1/2"
  >
    <div className="absolute inset-[16%] rounded-full bg-amber-brand/25 dark:bg-primary/15" />

    <div className="orbit absolute inset-0 rounded-full border-2 border-dashed border-secondary/25 dark:border-white/20">
      {ICONS.map((icon, index) => (
        <span
          key={icon}
          className="absolute inset-0"
          style={{ "--a": `${index * STEP}deg`, transform: "rotate(var(--a))" } as CSSProperties}
        >
          <span className="orbit-item absolute left-1/2 top-0 -ml-6 -mt-6 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-secondary bg-white shadow-[3px_3px_0_0_#004d59] dark:border-white/30 dark:bg-darklight dark:shadow-none">
            <Icon icon={icon} className="text-2xl" />
          </span>
        </span>
      ))}
    </div>
  </div>
);

export default MascotOrbit;