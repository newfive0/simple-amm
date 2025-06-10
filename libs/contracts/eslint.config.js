const baseConfig = require('../../eslint.config.js');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.d.ts', 'typechain-types/**/*'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: '.',
      },
    },
    rules: {},
  },
];
