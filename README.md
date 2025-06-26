# SimpleAmm

This is a simple Automated Market Maker (AMM) DApp built with React frontend and Solidity smart contracts.

For detailed development instructions and project information, see [CLAUDE.md](CLAUDE.md).

## Quick Start

**First time setup after cloning:**

```sh
# Generate TypeChain types (required for TypeScript compilation)
nx build contracts
```

To start the complete development environment (Hardhat + contracts deployment + frontend):

```sh
./scripts/start-dev.sh
```

This script will:

1. Start Hardhat local network on `http://localhost:8545`
2. Deploy smart contracts (Token and AMMPool)
3. Start frontend development server on `http://localhost:4200` (or next available port)
4. Create log files: `libs/contracts/hardhat.log` and `frontend.log`

Press `Ctrl+C` to stop all services.

## Run tasks

To run the dev server for your app, use:

```sh
# Using Nx
nx serve frontend

# Or using npx
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

## Deployment

### Deploy Smart Contracts

The project uses Hardhat Ignition for smart contract deployment. You can deploy the AMM system (token and pool) using the following steps:

#### 1. Start Local Hardhat Network

```sh
cd libs/contracts
npx hardhat node
```

This will start a local Ethereum network for testing and development.

#### 2. Deploy Contracts

**Deploy everything (recommended):**

```sh
cd libs/contracts
npx hardhat ignition deploy ignition/modules/AMMPool.ts --network localhost
```

**Deploy only token:**

```sh
cd libs/contracts
npx hardhat ignition deploy ignition/modules/Token.ts --network localhost
```

**Deploy complete system:**

```sh
cd libs/contracts
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network localhost
```

After successful deployment, you'll see the contract addresses output:

- SIMP: ERC20 token for trading with ETH
- AMMPool: Automated Market Maker pool contract for ETH/SIMP trading pair

The deployment artifacts are saved in `libs/contracts/ignition/deployments/` for reuse.

## Linting

### Project-wide

For project-wide linting:

```sh
nx run-many -t lint            # Check all projects
nx run-many -t lint:fix        # Fix all projects
```

### Frontend (React/TypeScript)

For frontend React/TypeScript linting:

```sh
nx lint frontend                # Check for linting issues
nx lint:fix frontend           # Automatically fix linting issues
```

### Contracts (TypeScript/JavaScript)

For TypeScript/JavaScript linting:

```sh
nx lint-js contracts      # Check for linting issues
nx lint-js-fix contracts  # Automatically fix linting issues when possible
```

### Solidity

For Solidity linting:

```sh
nx lint-sol contracts      # Check your Solidity code
nx lint-sol-fix contracts  # Automatically fix Solidity linting issues
nx format-sol contracts    # Format Solidity code using prettier
nx check-format-sol contracts # Check if Solidity code is properly formatted without making changes
```

## Testing

### Smart Contract Tests

To run the Solidity smart contract tests:

```sh
nx test contracts         # Run Hardhat tests for the contracts
```

### Unit Tests (Frontend)

To run frontend unit tests:

```sh
nx test frontend          # Run frontend unit tests with Vitest
```

### E2E Testing (Playwright)

The project includes end-to-end testing with Playwright and Synpress (for MetaMask integration):

```sh
# Run all E2E tests (automatically starts Hardhat node and frontend)
nx test e2e

# Show Playwright test report in browser
nx show-report e2e

# Update visual snapshots when UI changes
nx update-snapshots e2e
```

**Manual E2E Commands** (if you prefer to run from the e2e directory):

```sh
cd apps/e2e

# Run regular Playwright tests
npx playwright test --config=playwright.config.ts

# Run MetaMask integration tests  
npx playwright test --config=synpress.config.ts

# Update snapshots
npx playwright test --update-snapshots

# Show report
npx playwright show-report
```

**Note**: E2E tests automatically start and stop the development environment (Hardhat node, contract deployment, and frontend server).

## Important Notes

- **TypeChain Types**: This project uses TypeChain for type-safe contract interaction. The generated types are build artifacts and not committed to the repository.
- **After cloning**: Always run `nx build contracts` first to generate the required TypeChain types before running other commands.
- **Build Dependencies**: The frontend build automatically depends on contracts build, so running `nx build frontend` will also generate the types.
