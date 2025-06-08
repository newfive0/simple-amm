module.exports = {
  // For frontend React/TypeScript files
  'apps/frontend/**/*.{js,ts,tsx}': ['nx lint frontend'],

  // For JavaScript/TypeScript files in the contracts library
  'libs/contracts/**/*.{js,ts}': ['nx lint-js contracts'],

  // For Solidity files in the contracts library
  'libs/contracts/**/*.sol': [
    'nx lint-sol contracts',
    'nx check-format-sol contracts',
  ],
};
