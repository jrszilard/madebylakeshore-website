/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Design & Other Stories — Fog·Moss brand palette
        'daos': {
          'cream': '#ECEBE3',
          'paper': '#E4E3DA',
          'warm': '#CFCFC2',
          'clay': '#858779',
          'terracotta': '#B5481F',
          'terracotta-dark': '#8F3614',
          'ink': '#20221C',
          'charcoal': '#3D3F38',
          'sage': '#4E6547',
        }
      },
      fontFamily: {
        'display': ['"Fraunces"', 'Georgia', 'serif'],
        'body': ['"Fraunces"', 'Georgia', 'serif'],
        'sans': ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'display-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'display': ['2.25rem', { lineHeight: '1.2' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },
  ],
}
