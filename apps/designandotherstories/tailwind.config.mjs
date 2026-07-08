/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Design & Other Stories — Bold / Vivid brand palette
        'daos': {
          'cream':          '#FBF3E4',   // primary surface
          'paper':          '#F5EAD4',   // secondary surface
          'warm':           '#E7DAC0',   // rules & dividers
          'clay':           '#A08D6E',   // muted / metadata
          'terracotta':     '#EE4322',   // primary accent — coral / flame
          'terracotta-dark':'#CC2E0F',   // hover
          'ink':            '#181410',   // primary type
          'charcoal':       '#5C4A38',   // secondary type
          'sage':           '#4E6547',   // retained for green-tinted use
          'thread':         '#DED9E4',   // Electric rule / divider
          // Extended vivid accents
          'cobalt':         '#0F7FBF',
          'marigold':       '#F5A81C',
          'jade':           '#0E9E6E',
          'magenta':        '#D6336C',
          // Sunset palette
          'sunset-paper':   '#FDEFDC',
          'sunset-ink':     '#2A150E',
          'sunset-mute':    '#B08A6A',
          'sunset-rule':    '#F1D9BB',
        }
      },
      fontFamily: {
        'display': ['"Fraunces"', 'Georgia', 'serif'],
        'body':    ['"Fraunces"', 'Georgia', 'serif'],
        'sans':    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        'serif':   ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-xl': ['6rem',   { lineHeight: '0.92', letterSpacing: '-0.03em' }],
        'display-lg': ['4.25rem',{ lineHeight: '0.96', letterSpacing: '-0.025em' }],
        'display':    ['3rem',   { lineHeight: '1.02', letterSpacing: '-0.02em' }],
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
