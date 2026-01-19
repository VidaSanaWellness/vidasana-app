/* eslint-env node */
const {defineConfig} = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const unusedImports = require('eslint-plugin-unused-imports');

module.exports = defineConfig([
  expoConfig,
  {ignores: ['dist/*']},
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      'react/display-name': 'off',
      'no-unused-vars': 'off', // off so that unused-imports can handle it
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', {vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_'}],
    },
  },
]);
