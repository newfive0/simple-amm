# SimpleAmm

## Run tasks

To run the dev server for your app, use:

```sh
npx nx serve frontend
```

To create a production bundle:

```sh
npx nx build frontend
```

To see all available targets to run for a project, run:

```sh
npx nx show project frontend
```

## Linting

For TypeScript/JavaScript linting:

```sh
nx lint-js contracts      # Check for linting issues
nx lint-js-fix contracts  # Automatically fix linting issues when possible
```

For Solidity linting:

```sh
# Run solhint to check your Solidity code
nx lint-sol contracts      # Check your Solidity code
nx lint-sol-fix contracts  # Automatically fix Solidity linting issues
nx format-sol contracts    # Format Solidity code using prettier
```
