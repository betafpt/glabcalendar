import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        ink: "var(--color-ink)",
        secondary: "var(--color-secondary)",
        pink: "var(--color-pink)",
        lilac: "var(--color-lilac)",
        mint: "var(--color-mint)",
        yellow: "var(--color-yellow)",
        sky: "var(--color-sky)",
        coral: "var(--color-coral)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        stroke: "var(--color-stroke)",
      },
      borderRadius: {
        r10: "var(--radius-10)",
        r16: "var(--radius-16)",
        r22: "var(--radius-22)",
        r28: "var(--radius-28)",
        pill: "var(--radius-pill)",
      },
      fontFamily: {
        display: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 24px rgba(9, 9, 9, 0.05)",
        nav: "0 16px 40px rgba(9, 9, 9, 0.18)",
      },
      transitionDuration: {
        fast: "180ms",
        base: "220ms",
        slow: "280ms",
      },
      scale: {
        press: "0.97",
      },
    },
  },
  plugins: [],
};

export default config;
