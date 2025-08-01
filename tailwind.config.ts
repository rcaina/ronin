import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-gradient-to-br',
    'from-blue-600',
    'to-purple-600',
    'from-green-600',
    'to-teal-600',
    'from-red-600',
    'to-pink-600',
    'from-yellow-600',
    'to-orange-600',
    'from-indigo-600',
    'to-blue-600',
    'from-purple-600',
    'to-pink-600',
    'from-emerald-600',
    'to-green-600',
    'from-rose-600',
    'to-red-600',
    'from-cyan-600',
    'to-blue-600',
    'from-violet-600',
    'to-purple-600',
    'from-amber-600',
    'to-yellow-600',
    'from-sky-600',
    'to-cyan-600',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

export default config
