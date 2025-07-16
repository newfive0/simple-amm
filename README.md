# Simple AMM DApp

**🚀 [Live Demo on Sepolia](https://simple-amm-995181507457.us-central1.run.app/)**

Built with React 19 and Solidity smart contracts. Features comprehensive testing, automated CI/CD, and enterprise-grade code quality standards.

## Key Highlights

- **Full Test Coverage**: Unit tests (Vitest), contract tests (Hardhat), E2E tests (Playwright + Synpress), visual regression testing (Argos CI)
- **Robust Code Quality**: TypeScript strict mode, ESLint + Prettier, Solidity linting, automated formatting, spell checking
- **Streamlined CI/CD**: GitHub Actions automate testing, linting, type checking, contract deployment, and Google Cloud Run deployment with Docker
- **Modern Architecture**: Nx monorepo, TypeChain type generation, React 19, Ethers.js v6, Hardhat Ignition deployment

Built with constant product formula (x * y = k) for ETH/SIMP token swaps, complete MetaMask integration, and responsive UI.

## Prerequisites

Before getting started, ensure you have the following installed:

- **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
- **pnpm** (package manager) - Install with: `npm install -g pnpm`
- **Nx CLI** (monorepo toolkit) - Install with: `pnpm add -g nx`

## Installation

**Clone and install dependencies:**
```sh
git clone <repository-url>
cd simple-amm
pnpm install
```

## Quick Start

**First time setup:**
```sh
# Generate TypeChain types (required for TypeScript compilation)
nx build contracts
```

**Start development environment:**
```sh
nx start-dev
```

This automatically:
- Starts Hardhat local network on `http://localhost:8545`
- Deploys smart contracts (Token and AMMPool)
- Launches frontend on `http://localhost:4200`
- Creates log files: `libs/contracts/hardhat.log` and `frontend.log`

Press `Ctrl+C` to stop all services.

## Run tasks

To run the dev server for your app, use:

```sh
# Using Nx
nx serve frontend

# Or using pnpm exec
pnpm exec nx serve frontend
```

To create a production bundle:

```sh
pnpm exec nx build frontend
```

To see all available targets to run for a project, run:

```sh
pnpm exec nx show project frontend
```

## Deployment

### Deploy Smart Contracts

The project uses Hardhat Ignition for smart contract deployment. You can deploy the AMM system (token and pool) using the following steps:

#### 1. Start Local Hardhat Network

```sh
cd libs/contracts
pnpm exec hardhat node
```

This will start a local Ethereum network for testing and development.

#### 2. Deploy Contracts

**Deploy everything (recommended):**

```sh
cd libs/contracts
pnpm exec hardhat ignition deploy ignition/modules/AMMPool.ts --network localhost
```

**Deploy only token:**

```sh
cd libs/contracts
pnpm exec hardhat ignition deploy ignition/modules/Token.ts --network localhost
```

**Deploy complete system:**

```sh
cd libs/contracts
pnpm exec hardhat ignition deploy ignition/modules/DeployAll.ts --network localhost
```

After successful deployment, you'll see the contract addresses output:

- SIMP: ERC20 token for trading with ETH
- AMMPool: Automated Market Maker pool contract for ETH/SIMP trading pair

The deployment artifacts are saved in `libs/contracts/ignition/deployments/` for reuse.

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
```

**Manual E2E Commands** (if you prefer to run from the e2e directory):

```sh
cd apps/e2e

# Run Playwright tests
pnpm exec playwright test --config=playwright.config.ts

# Show report
pnpm exec playwright show-report
```

**Note**: E2E tests automatically start and stop the development environment (Hardhat node, contract deployment, and frontend server).

#### Visual Regression Testing with Argos

Automated visual testing with [Argos CI](https://argos-ci.com/) - screenshots captured in CI, visual diffs in PRs, no local setup required.

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

## Important Notes

- **TypeChain Types**: This project uses TypeChain for type-safe contract interaction. The generated types are build artifacts and not committed to the repository.
- **After cloning**: Always run `nx build contracts` first to generate the required TypeChain types before running other commands.
- **Build Dependencies**: The frontend build automatically depends on contracts build, so running `nx build frontend` will also generate the types.
