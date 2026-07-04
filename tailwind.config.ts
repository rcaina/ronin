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
        // Brand ink — near-black used for the nav shell and dark surfaces.
        primary: {
          DEFAULT: "#0e0e10",
          50: "#f6f6f7",
          100: "#e7e7e9",
          200: "#d1d1d6",
          300: "#b0b0b8",
          400: "#888892",
          500: "#6d6d76",
          600: "#5d5d64",
          700: "#4f4f55",
          800: "#2a2a2e",
          900: "#1a1a1d",
          950: "#0e0e10",
        },
        // Brand gold — primary action color and accents.
        secondary: {
          DEFAULT: "#b9a15e",
          50: "#faf8f2",
          100: "#f4efe0",
          200: "#e8ddc0",
          300: "#d9c697",
          400: "#c9b075",
          500: "#b9a15e",
          600: "#a3894a",
          700: "#876f3d",
          800: "#6e5a35",
          900: "#5a4a2e",
          950: "#332917",
        },
        // Light gold — highlights, badges, hover washes.
        accent: {
          DEFAULT: "#fce5a0",
          50: "#fefbf0",
          100: "#fdf4d6",
          200: "#fce5a0",
          300: "#fad573",
          400: "#f7c14a",
          500: "#f3ab2a",
        },
        // Warm page surfaces — softer than plain gray. CSS-variable backed so
        // the whole app flips with the `.dark` class (see src/styles/globals.css).
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)",
          card: "rgb(var(--surface-card) / <alpha-value>)",
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
        soft: "0 1px 2px 0 rgb(14 14 16 / 0.03), 0 1px 3px 0 rgb(14 14 16 / 0.05)",
        card: "0 1px 2px rgb(14 14 16 / 0.04), 0 4px 16px -4px rgb(14 14 16 / 0.06)",
        lifted:
          "0 4px 8px -2px rgb(14 14 16 / 0.06), 0 16px 32px -8px rgb(14 14 16 / 0.10)",
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
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        "scale-in": "scale-in 0.2s ease-out both",
        "slide-up": "slide-up 0.25s ease-out both",
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
