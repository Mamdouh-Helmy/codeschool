// utils/portfolioThemes.ts
export interface ThemeStyles {
  container: string;
  header: string;
  card: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    white: string;
  };
  background: {
    primary: string;
    secondary: string;
  };
  border: string;
  skillBar: string;
  skillFill: string;
}

export const applyTheme = (theme: string, layout: string): ThemeStyles => {
  const defaultTheme = {
    container: "bg-gray-900", // 🔥 تغيير الافتراضي إلى dark
    header: "portfolio-header portfolio-header-dark",
    card: "bg-gray-800 border border-gray-700 rounded-lg",
    text: {
      primary: "text-white",
      secondary: "text-gray-300",
      muted: "text-gray-400",
      white: "text-white",
    },
    background: {
      primary: "bg-gray-800",
      secondary: "bg-gray-900",
    },
    border: "border-gray-700",
    skillBar: "bg-gray-700",
    skillFill: "bg-blue-400",
  };

  const baseThemes = {
    light: {
      container: "bg-gray-50",
      header: "portfolio-header portfolio-header-light",
      card: "bg-white border border-gray-200 rounded-lg",
      text: {
        primary: "text-gray-900",
        secondary: "text-gray-700",
        muted: "text-gray-500",
        white: "text-white",
      },
      background: {
        primary: "bg-white",
        secondary: "bg-gray-50",
      },
      border: "border-gray-200",
      skillBar: "bg-gray-200",
      skillFill: "bg-blue-500",
    },
    dark: {
      container: "bg-gray-900",
      header: "portfolio-header portfolio-header-dark",
      card: "bg-gray-800 border border-gray-700 rounded-lg",
      text: {
        primary: "text-white",
        secondary: "text-gray-300",
        muted: "text-gray-400",
        white: "text-white",
      },
      background: {
        primary: "bg-gray-800",
        secondary: "bg-gray-900",
      },
      border: "border-gray-700",
      skillBar: "bg-gray-700",
      skillFill: "bg-blue-400",
    },
    blue: {
      container: "bg-blue-50",
      header: "portfolio-header portfolio-header-blue",
      card: "bg-blue-100 border border-blue-200 rounded-lg",
      text: {
        primary: "text-gray-900",
        secondary: "text-gray-800",
        muted: "text-gray-700",
        white: "text-white",
      },
      background: {
        primary: "bg-blue-100",
        secondary: "bg-blue-50",
      },
      border: "border-blue-200",
      skillBar: "bg-blue-200",
      skillFill: "bg-blue-600",
    },
    green: {
      container: "bg-green-50",
      header: "portfolio-header portfolio-header-green",
      card: "bg-green-100 border border-green-200 rounded-lg",
      text: {
        primary: "text-gray-900",
        secondary: "text-gray-800",
        muted: "text-gray-700",
        white: "text-white",
      },
      background: {
        primary: "bg-green-100",
        secondary: "bg-green-50",
      },
      border: "border-green-200",
      skillBar: "bg-green-200",
      skillFill: "bg-green-600",
    },
  };

  const layoutStyles = {
    standard: "rounded-lg",
    minimal: "rounded-none border-0",
    creative: "rounded-2xl shadow-xl",
  };

  const selectedTheme = baseThemes[theme as keyof typeof baseThemes] || defaultTheme;
  const selectedLayout = layoutStyles[layout as keyof typeof layoutStyles] || layoutStyles.standard;

  return {
    ...selectedTheme,
    card: `${selectedTheme.card} ${selectedLayout}`,
    container: `${selectedTheme.container}`,
  };
};