/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'mbl': {
          'ink': '#1a1a2e',
          'dusk': '#F5A81C',
          'slate': '#A05C1F',
          'stone': '#4a5568',
          'mist': '#AFB9B8',
          'cloud': '#f7fafc',
          'accent': 'oklch(0.62 0.13 200 / <alpha-value>)',
          'accent-dark': 'oklch(0.50 0.13 200 / <alpha-value>)',
          'warm': 'oklch(0.55 0.10 200 / <alpha-value>)',
          'secondary': '#AFB9B8',
        }
      },
      fontFamily: {
        'display': ['"Roboto Slab"', 'Georgia', 'serif'],
        'heading': ['"Roboto Slab"', 'Georgia', 'serif'],
        'body': ['"Inter"', 'system-ui', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['6rem',    { lineHeight: '0.92', letterSpacing: '-0.03em' }],
        'display-lg': ['4.25rem', { lineHeight: '0.96', letterSpacing: '-0.025em' }],
        'display':    ['3rem',    { lineHeight: '1.02', letterSpacing: '-0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
