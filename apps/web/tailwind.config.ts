import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-rounded', '"SF Pro Rounded"', '"Nunito"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: { 50: '#eef6ff', 100: '#d9eaff', 200: '#bcdaff', 300: '#8ec2ff', 400: '#599fff', 500: '#337bff', 600: '#1d5cf5', 700: '#1647e1', 800: '#193bb6', 900: '#1a378f' },
        sun: { 300: '#fde68a', 400: '#fcd34d', 500: '#f59e0b' },
        leaf: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
        berry: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48' },
      },
      boxShadow: { pop: '0 4px 0 0 rgba(0,0,0,0.15)' },
      keyframes: {
        pop: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } },
      },
      animation: { pop: 'pop 180ms ease-out', shake: 'shake 300ms ease-in-out' },
    },
  },
  plugins: [],
} satisfies Config;
