/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        void: '#05050A',
        surface: '#0D0D14',
        panel: '#13131C',
        border: '#1E1E2E',
        muted: '#2A2A3E',
        ghost: '#3D3D5C',
        dim: '#6B6B8A',
        text: '#E2E2F0',
        bright: '#F0F0FF',
        accent: {
          DEFAULT: '#6C63FF',
          hover: '#8B84FF',
          dim: '#6C63FF33',
        },
        amber: {
          DEFAULT: '#F59E0B',
          dim: '#F59E0B22',
        },
        emerald: {
          DEFAULT: '#10B981',
          dim: '#10B98122',
        },
        rose: {
          DEFAULT: '#F43F5E',
          dim: '#F43F5E22',
        },
        sky: {
          DEFAULT: '#38BDF8',
          dim: '#38BDF822',
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231E1E2E' fill-opacity='0.6'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
        'score-fill': 'scoreFill 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scoreFill: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: 'var(--target-offset)' },
        },
      },
    },
  },
  plugins: [],
}