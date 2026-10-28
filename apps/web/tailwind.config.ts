import type { Config } from 'tailwindcss';

/**
 * «Түнгі аспан» (Night sky) theme.
 * Every palette is a CSS variable (RGB triplet) so the same class names work in two scopes:
 * the default night theme (:root) and `.theme-day` (admin area), see globals.css.
 */
const scale = (name: string, steps: number[]) =>
  Object.fromEntries(steps.map((s) => [s, `rgb(var(--${name}-${s}) / <alpha-value>)`]));
const ALL = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'ui-rounded', '"SF Pro Rounded"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        night: { DEFAULT: '#0d0b26', 800: '#151238', 700: '#1d1a44', 600: '#2a2470' },
        star: '#f7cc4b',
        coral: '#fb8371',
        mint: '#59d38c',
        lilac: '#cfd6ff',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        slate: scale('slate', ALL),
        brand: scale('brand', ALL),
        sun: scale('sun', [300, 400, 500]),
        leaf: scale('leaf', [400, 500, 600]),
        berry: scale('berry', [400, 500, 600]),
        green: scale('green', ALL),
        amber: scale('amber', ALL),
        rose: scale('rose', ALL),
        red: scale('red', ALL),
        sky: scale('sky', ALL),
      },
      boxShadow: {
        pop: '0 4px 0 0 rgba(0,0,0,0.25)',
        glow: '0 0 40px var(--tw-shadow-color)',
        'glow-sm': '0 0 18px var(--tw-shadow-color)',
        'glow-lg': '0 0 80px var(--tw-shadow-color)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } },
        twinkle: { '0%,100%': { filter: 'brightness(1)' }, '50%': { filter: 'brightness(1.18)' } },
      },
      animation: { pop: 'pop 180ms ease-out', shake: 'shake 300ms ease-in-out', twinkle: 'twinkle 3.2s ease-in-out infinite' },
    },
  },
  plugins: [],
} satisfies Config;
