/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Design & Other Stories - warm, artistic, handcrafted feel
        'daos': {
          'cream': '#faf8f5',
          'paper': '#f5f0e8',
          'warm': '#e8dfd3',
          'clay': '#c4a77d',
          'terracotta': '#c67c4e',
          'ink': '#2d2a26',
          'charcoal': '#4a4641',
          'sage': '#7d8471',
        }
      },
      fontFamily: {
        'display': ['"Playfair Display"', 'Georgia', 'serif'],
        'body': ['"Libre Baskerville"', 'Georgia', 'serif'],
        'sans': ['"Work Sans"', 'system-ui', 'sans-serif'],
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
  plugins: [],
}
