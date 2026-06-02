// tailwind.config.js
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/utils/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern: /(bg|from|to|text)-(blue|green|gray)-(50|100|200|300|400|500|600|700|800|900)/,
    },
    {
      pattern: /bg-gradient-to-r/,
    },
    "portfolio-header",
    "portfolio-header-light",
    "portfolio-header-green",
    "portfolio-header-blue",
    "portfolio-header-dark",
  ],
  theme: {
    extend: {
      maxWidth: {
        "219": "13.6875rem",
        "266": "16.625rem",
        "286": "17.875rem",
        "364": "22.8rem",
        "404": "25.25rem",
        "506": "31.625rem",
        "632": "39.5rem",
        "920": "57.5rem",
        "1068": "66.75rem",
        "1170": "73.125rem",
        "1200": "75rem",
      },
      height: {
        "109": "6.8125rem",
        "397": "24.8125rem",
        "687": "42.9375rem",
        "650": "40.625rem",
      },
      width: {
        "109": "6.8125rem",
        "397": "24.8125rem",
        "526": "32.875rem",
        "770": "48.125rem",
        "687": "42.9375rem",
        "1/2": "30%",
        "1/4": "37%",
        "2/3": "63%",
        "2/2": "60%",
      },
      gap: {
        "30": "1.875rem",
        "14": "0.875rem",
        "13": "3.125rem",
      },
      boxShadow: {
        "hero-box": "0px 10px 20px 0px #00000026",
        "round-box": "0px 6px 10px 0px #00000026",
        darkmd:
          "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px",
        // ── Brand shadows ──
        "brand-sm": "0 2px 8px 0 rgba(255,103,0,0.15)",
        "brand-md": "0 4px 16px 0 rgba(255,103,0,0.2)",
        "brand-lg": "0 8px 32px 0 rgba(0,77,89,0.25)",
      },
      borderRadius: {
        "14": "0.875rem",
        "22": "1.375rem",
        "166": "10.375rem",
        "182": "11.375rem",
        "214": "13.375rem",
      },
      transitionProperty: {
        "max-height": "max-height",
        opacity: "opacity",
        transform: "transform",
        width: "width",
        all: "all",
      },
      transitionDuration: {
        "0": "0ms",
        "0.4s": "0.4s",
        "2000": "2000ms",
      },
      transitionTimingFunction: {
        "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1);",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
      transform: {
        "-translate-y-4": "-translate-y-1rem",
      },
      zIndex: {
        "1": "1",
        "3": "3",
      },
      colors: {
        // ── Brand Palette ──────────────────────────────────
        primary:    "#ff6700",   
        secondary:  "#004d59",  

        // ── Brand Aliases ──────────────────────────────────
        SereneSky:          "#004d59",
        ElectricAqua:       "#ff6437",
        RegalBlue:          "#004d59",
        LightYellow:        "#feaf00",
        IcyBreeze:          "#fff8f0",
        PaleCyan:           "#ffe8d6",
        Aquamarine:         "#ff6437",
        MidnightNavyText:   "#004d59",
        SlateBlueText:      "#004d59",
        PaleSkyBlu:         "#fff3e0",
        MistyTealText:      "#004d59",
        OliveDrab:          "#f67d00",
        CadetBlue:          "#004d59",
        Dandelion:          "#feaf00",
        SkyBlueMist:        "#ffd9b3",
        LightSkyBlue:       "#ffcba4",
        Salem:              "#004d59",
        YellowRating:       "#feaf00",
        PaleCerulean:       "#ff6437",
        PeriwinkleBorder:   "#ffd9b3",
        LightBlueBorder:    "#ff6700",
        OceanDepthsDarkBorder: "#004d59",
        PowderBlueBorder:   "#fff3e0",
        darkLineColor:      "#004d59",

        // ── Dark Mode Surfaces (brand-aligned) ─────────────
        //    مأخوذة من InstructorDashboard
        darkmode:   "#0a0f17",   // الخلفية الرئيسية  — كان: #011120
        darklight:  "#161b22",   // Cards / Sidebar   — كان: #0d1a2c
        dark_border: "#30363d",  // Borders            — كان: #224767
        dark_input:  "#21262d",  // Inputs / Skeletons — كان: #1B2430

        // ── إضافة: مستويات إضافية للـ dark mode ──────────
        darkdeep:   "#0a0f17",   // أعمق خلفية (= darkmode)
        darkmid:    "#161b22",   // Cards (= darklight)
        darkcard:   "#161b22",   // alias واضح للـ cards
        darkhover:  "#21262d",   // hover state
        darktext:   "#7F8487",   // نص ثانوي — لم يتغير
        darkmuted:  "#8b949e",   // نص خافت
        darksubtle: "#6e7681",   // نص أخفت

        // ── Brand accent shades ────────────────────────────
        "orange-brand":  "#ff6700",
        "orange-deep":   "#f67d00",
        "orange-coral":  "#ff6437",
        "teal-brand":    "#004d59",
        "teal-dark":     "#002a33",
        "teal-deeper":   "#001a1f",
        "amber-brand":   "#feaf00",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        // ── Brand Gradients ──
        "brand-primary":
          "linear-gradient(135deg, #004d59 0%, #ff6700 100%)",
        "brand-warm":
          "linear-gradient(135deg, #ff6700 0%, #feaf00 100%)",
        "brand-cool":
          "linear-gradient(135deg, #004d59 0%, #ff6437 100%)",
        "brand-full":
          "linear-gradient(135deg, #004d59 0%, #ff6700 50%, #feaf00 100%)",
        "brand-dark":
          "linear-gradient(135deg, #0a0f17 0%, #001a1f 100%)",
      },
      fontSize: {
        58: ["3.625rem",  { lineHeight: "5.375rem"  }],
        53: ["3.3125rem", { lineHeight: "3.875rem"  }],
        40: ["2.5rem",    { lineHeight: "3.4375rem" }],
        48: ["3rem",      { lineHeight: "3.39rem"   }],
        36: ["2.25rem",   { lineHeight: "2.625rem"  }],
        34: ["2.125rem",  { lineHeight: "2.7669rem" }],
        32: ["2rem",      { lineHeight: "2.5rem"    }],
        28: ["1.75rem",   { lineHeight: "2.25rem"   }],
        26: ["1.625rem",  { lineHeight: "2.1156rem" }],
        24: ["1.5rem",    { lineHeight: "2rem"      }],
        22: ["1.375rem",  { lineHeight: "2rem"      }],
        20: ["1.25rem",   { lineHeight: "2.125rem"  }],
        19: ["1.1875rem", { lineHeight: "1.625rem"  }],
        17: ["1.0625rem", { lineHeight: "1.4875rem" }],
        16: ["1rem",      { lineHeight: "1.6875rem" }],
        15: ["0.9375rem", { lineHeight: "1.4375rem" }],
        14: ["0.875rem",  { lineHeight: "1.225rem"  }],
      },
    },
  },
  plugins: [],
};
export default config;