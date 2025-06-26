const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const js = require('@eslint/js');
const reactHooksPlugin = require('eslint-plugin-react-hooks');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'out-tsc/**',
      '.nx/**',
      'src/typechain-types/**',
      '**/*.min.js',
      '**/*.bundle.js',
      '**/*.d.ts',
      '**/*.d.ts.map',
      '**/*.tsbuildinfo',
      '**/vite.config.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.app.json', './tsconfig.spec.json'],
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        test: 'readonly',
        beforeEach: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
