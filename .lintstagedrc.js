module.exports = {
  // For frontend React/TypeScript files
  'apps/frontend/**/*.{js,ts,tsx}': [
    () => 'nx run-many -t lint,typecheck -p frontend --parallel',
  ],

  // For JavaScript/TypeScript files in the contracts library
  'libs/contracts/**/*.{js,ts}': [
    () => 'nx run-many -t lint-js,typecheck -p contracts --parallel',
  ],

  // For Solidity files in the contracts library
  'libs/contracts/**/*.sol': [
    'nx lint-sol contracts',
    'nx check-format-sol contracts',
  ],
};
