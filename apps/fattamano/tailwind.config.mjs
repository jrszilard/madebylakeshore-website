/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // fattamano — loud, hand-feel, a little ridiculous
        'ft': {
          'paper': '#FBF9F4',   // warm off-white background
          'ink': '#1A1A1A',     // body text
          'shout': '#FF3D2E',   // punchy red — primary accent
          'splash': '#FFD93D',  // hot yellow — secondary accent
          'sea': '#2E86AB',     // a calm balancing blue
          'olive': '#5C6E3A',   // earthy contrast
          'smudge': '#8A8580',  // muted gray
        }
      },
      fontFamily: {
        'display': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        'body': ['"Inter"', 'system-ui', 'sans-serif'],
        'hand': ['"Caveat"', 'cursive'],
      },
      fontSize: {
        'huge': ['5rem', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        'big': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      rotate: {
        '1.5': '1.5deg',
        '-1.5': '-1.5deg',
      },
    },
  },
  plugins: [],
};
