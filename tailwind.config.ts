import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "bg-gradient-to-br",
    "from-blue-600",
    "to-purple-600",
    "from-green-600",
    "to-teal-600",
    "from-red-600",
    "to-pink-600",
    "from-yellow-600",
    "to-orange-600",
    "from-indigo-600",
    "to-blue-600",
    "from-purple-600",
    "to-pink-600",
    "from-emerald-600",
    "to-green-600",
    "from-rose-600",
    "to-red-600",
    "from-cyan-600",
    "to-blue-600",
    "from-violet-600",
    "to-purple-600",
    "from-amber-600",
    "to-yellow-600",
    "from-sky-600",
    "to-cyan-600",
  ],
  theme: {
    extend: {
      colors: {
        // Brand ink (obsidian) — warm near-black used for the nav shell and dark surfaces.
        primary: {
          DEFAULT: "#17150f",
          50: "#f7f6f3",
          100: "#ebe9e3",
          200: "#d6d2c8",
          300: "#b6b0a3",
          400: "#8f887a",
          500: "#6e685d",
          600: "#5a554c",
          700: "#4a463f",
          800: "#2b2822",
          900: "#1d1b16",
          950: "#17150f",
        },
        // Brand brass — primary action color and accents. CSS-variable backed and
        // re-ramped in dark mode (gilt fills, light-gold text); see globals.css.
        secondary: {
          DEFAULT: "rgb(var(--secondary-500) / <alpha-value>)",
          foreground: "rgb(var(--on-secondary) / <alpha-value>)",
          50: "rgb(var(--secondary-50) / <alpha-value>)",
          100: "rgb(var(--secondary-100) / <alpha-value>)",
          200: "rgb(var(--secondary-200) / <alpha-value>)",
          300: "rgb(var(--secondary-300) / <alpha-value>)",
          400: "rgb(var(--secondary-400) / <alpha-value>)",
          500: "rgb(var(--secondary-500) / <alpha-value>)",
          600: "rgb(var(--secondary-600) / <alpha-value>)",
          700: "rgb(var(--secondary-700) / <alpha-value>)",
          800: "rgb(var(--secondary-800) / <alpha-value>)",
          900: "rgb(var(--secondary-900) / <alpha-value>)",
          950: "rgb(var(--secondary-950) / <alpha-value>)",
        },
        // Champagne/gilt — highlights, badges, and gold on always-dark surfaces
        // (nav shell, auth pages, hero cards). Fixed in both themes.
        accent: {
          DEFAULT: "#f2e6c4",
          50: "#fcf9f0",
          100: "#f8f0da",
          200: "#f2e6c4",
          300: "#e8d49c",
          400: "#d4b064",
          500: "#b48a35",
        },
        // Warm page surfaces — softer than plain gray. CSS-variable backed so
        // the whole app flips with the `.dark` class (see src/styles/globals.css).
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)",
          card: "rgb(var(--surface-card) / <alpha-value>)",
        },
        // Danger surface — CSS-variable backed so red/destructive panels flip
        // with the `.dark` class instead of staying light (see globals.css).
        danger: {
          surface: "rgb(var(--danger-surface) / <alpha-value>)",
          border: "rgb(var(--danger-border) / <alpha-value>)",
          icon: "rgb(var(--danger-icon) / <alpha-value>)",
          "icon-bg": "rgb(var(--danger-icon-bg) / <alpha-value>)",
        },
        // Neutral ramp — CSS-variable backed and inverted in dark mode so existing
        // `text-gray-900` / `bg-gray-100` / `border-gray-300` usage adapts for free.
        gray: {
          50: "rgb(var(--gray-50) / <alpha-value>)",
          100: "rgb(var(--gray-100) / <alpha-value>)",
          200: "rgb(var(--gray-200) / <alpha-value>)",
          300: "rgb(var(--gray-300) / <alpha-value>)",
          400: "rgb(var(--gray-400) / <alpha-value>)",
          500: "rgb(var(--gray-500) / <alpha-value>)",
          600: "rgb(var(--gray-600) / <alpha-value>)",
          700: "rgb(var(--gray-700) / <alpha-value>)",
          800: "rgb(var(--gray-800) / <alpha-value>)",
          900: "rgb(var(--gray-900) / <alpha-value>)",
          950: "rgb(var(--gray-950) / <alpha-value>)",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        // Soft layered shadows — depth without hard edges.
        soft: "0 1px 2px 0 rgb(23 21 15 / 0.03), 0 1px 3px 0 rgb(23 21 15 / 0.05)",
        card: "0 1px 2px rgb(23 21 15 / 0.04), 0 4px 16px -4px rgb(23 21 15 / 0.06)",
        lifted:
          "0 4px 8px -2px rgb(23 21 15 / 0.06), 0 16px 32px -8px rgb(23 21 15 / 0.10)",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        "scale-in": "scale-in 0.2s ease-out both",
        "slide-up": "slide-up 0.25s ease-out both",
        "slide-in-left": "slide-in-left 0.25s cubic-bezier(0.22, 0.61, 0.36, 1) both",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
