module.exports = {
  // Run lint and typecheck for all projects when any JS/TS file changes
  '**/*.{js,ts,tsx}': [
    () => 'nx run-many -t lint,typecheck --parallel',
  ],

  // For Solidity files in the contracts library
  'libs/contracts/**/*.sol': [
    'nx lint-sol contracts',
    'nx check-format-sol contracts',
  ],
};
