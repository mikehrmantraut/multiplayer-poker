import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        card: {
          red: '#dc2626',
          black: '#1f2937',
        },
        chip: {
          white: '#f8fafc',
          red: '#dc2626',
          green: '#16a34a',
          blue: '#2563eb',
          black: '#1f2937',
          purple: '#7c3aed',
          orange: '#ea580c',
          yellow: '#ca8a04',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      animation: {
        'card-deal': 'cardDeal 0.5s ease-out',
        'chip-move': 'chipMove 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        cardDeal: {
          '0%': { transform: 'translateX(-100px) rotateY(-90deg)', opacity: '0' },
          '50%': { transform: 'translateX(-20px) rotateY(-45deg)', opacity: '0.5' },
          '100%': { transform: 'translateX(0) rotateY(0deg)', opacity: '1' },
        },
        chipMove: {
          '0%': { transform: 'scale(1) translateY(0)', opacity: '1' },
          '50%': { transform: 'scale(1.1) translateY(-10px)', opacity: '0.8' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(34, 197, 94, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.8), 0 0 30px rgba(34, 197, 94, 0.4)' },
        },
      },
      backgroundImage: {
        'felt-texture': 'radial-gradient(ellipse at center, #16a34a 0%, #15803d 50%, #14532d 100%)',
        'card-back': 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%)',
      },
      dropShadow: {
        'card': '0 4px 8px rgba(0, 0, 0, 0.3)',
        'chip': '0 2px 4px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 10px rgba(34, 197, 94, 0.5)',
      },
    },
  },
  plugins: [],
} satisfies Config