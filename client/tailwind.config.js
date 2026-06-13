/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B1F4B',
          light: '#1A3A7C',
        },
        accent: {
          DEFAULT: '#F97316',
          light: '#FED7AA',
        },
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        text: {
          primary: '#0F172A',
          secondary: '#64748B',
        },
        sidebar: {
          bg: '#0B1F4B',
          text: '#CBD5E1',
          active: '#F97316',
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        input: '8px',
        modal: '16px',
        lg2: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)',
        cardHover: '0 4px 12px rgba(11,31,75,.12)',
        focus: '0 0 0 3px rgba(11,31,75,.1)',
        modal: '0 20px 60px rgba(0,0,0,.25)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(110%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shake: {
          '10%, 90%': { transform: 'translateX(-1px)' },
          '20%, 80%': { transform: 'translateX(2px)' },
          '30%, 50%, 70%': { transform: 'translateX(-4px)' },
          '40%, 60%': { transform: 'translateX(4px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
      },
      animation: {
        'fade-in': 'fade-in .2s ease-out',
        'fade-slide-up': 'fade-slide-up .4s ease-out both',
        'scale-in': 'scale-in .15s ease-out',
        'slide-in-right': 'slide-in-right .3s ease-out',
        shake: 'shake .5s ease-in-out',
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
