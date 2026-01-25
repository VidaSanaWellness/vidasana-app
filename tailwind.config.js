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
        primary: '#00594F',
        // Vital Energy Orange: primary CTAs, icons, highlights
        secondary: '#EB3300',
        // Semantic aliases
        'deep-green': '#00594F',
        sage: '#9DC6BC', // backgrounds, cards, secondary buttons
        'vital-orange': '#EB3300',
        peach: '#FF8674', // accents, illustrations, soft emphasis
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
