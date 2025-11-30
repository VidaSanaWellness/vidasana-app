module.exports = {
  tabWidth: 2,
  printWidth: 150,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: false,
  bracketSameLine: true,
  tailwindAttributes: ['className'],
  plugins: [require.resolve('prettier-plugin-tailwindcss')],
};
