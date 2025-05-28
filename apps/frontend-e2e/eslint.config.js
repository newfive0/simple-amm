// Import the base config using CommonJS import style
import baseConfigModule from '../../eslint.config.js';
export default [
  ...baseConfigModule,
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