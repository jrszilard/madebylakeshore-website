/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Incubator - techy, experimental, playful
        'inc': {
          'void': '#0a0a0f',
          'night': '#12121a',
          'steel': '#1e1e2e',
          'zinc': '#3f3f5a',
          'silver': '#a1a1b5',
          'white': '#f4f4f8',
          'lime': '#84cc16',
          'cyan': '#22d3ee',
          'violet': '#8b5cf6',
        }
      },
      fontFamily: {
        'display': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        'body': ['"Inter"', 'system-ui', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(132, 204, 22, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(132, 204, 22, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
