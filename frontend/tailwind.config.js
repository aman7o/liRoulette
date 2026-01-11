/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'roulette-green': '#0a7536',
        'roulette-red': '#c71f2d',
        'roulette-black': '#1a1a1a',
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(1440deg)' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        winnerPop: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '70%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        breatheGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(251, 191, 36, 0.4), 0 0 20px rgba(251, 191, 36, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.3)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'wheel-spin': 'spin 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
        'chip-bounce': 'bounce 0.6s ease-in-out',
        'fadeIn': 'fadeIn 0.3s ease-out',
        'scaleIn': 'scaleIn 0.3s ease-out',
        'winner-pop': 'winnerPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'breathe-glow': 'breatheGlow 2.5s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      boxShadow: {
        'glow-gold': '0 0 15px rgba(251, 191, 36, 0.5), 0 0 30px rgba(251, 191, 36, 0.3)',
        'glow-green': '0 0 15px rgba(34, 197, 94, 0.5), 0 0 30px rgba(34, 197, 94, 0.3)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.5), 0 0 30px rgba(239, 68, 68, 0.3)',
        'inner-glow': 'inset 0 0 10px rgba(251, 191, 36, 0.3)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 1px rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
