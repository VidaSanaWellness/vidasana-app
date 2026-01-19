/** @type {import('tailwindcss').Config} */
module.exports = {
  plugins: [],
  darkMode: 'class',
  content: ['./src/**/*.{js,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Deep Wellness Green: primary buttons, headers, active states
        primary: '#00594f',
        // Vital Energy Orange: primary CTAs, icons, highlights
        secondary: '#eb3300',
        // Semantic aliases
        'deep-green': '#00594f',
        sage: '#9dc6bc', // backgrounds, cards, secondary buttons
        'vital-orange': '#eb3300',
        peach: '#ff8674', // accents, illustrations, soft emphasis
      },
      fontFamily: {
        sans: ['Nunito_400Regular'],
        nunito: ['Nunito_400Regular'],
        'nunito-bold': ['Nunito_700Bold'],
        'nunito-extra-bold': ['Nunito_800ExtraBold'],
        'nunito-black': ['Nunito_900Black'],
        'nunito-light': ['Nunito_300Light'],
      },
    },
  },
};
