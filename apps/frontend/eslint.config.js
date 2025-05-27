import { baseConfig } from '../../eslint.config.js';

export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: '.',
      }
    },
    rules: {
    }
  }
];