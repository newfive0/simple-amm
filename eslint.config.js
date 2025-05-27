const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const js = require('@eslint/js');
const prettierConfig = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');

const baseConfig = [
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'typechain-types/**',
      'cache/**',
      'artifacts/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'off',
      'prettier/prettier': 'error',
    },
  },
  prettierConfig,
];

module.exports = baseConfig;