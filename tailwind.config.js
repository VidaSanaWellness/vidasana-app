/** @type {import('tailwindcss').Config} */
module.exports = {
  plugins: [],
  darkMode: 'class',
  content: ['./src/**/*.{js,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        main: '#3E6065',
      },
    },
  },
};
