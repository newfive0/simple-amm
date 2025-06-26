# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commit Message Guidelines

Use minimal, descriptive commit messages without boilerplate text. Focus on what changed, not who made the change or what tools were used. Do not append Claude or AI assistance to commit messages.

## Project Overview

This is a simple Automated Market Maker (AMM) DApp built with React frontend and Solidity smart contracts. The project uses Nx monorepo structure with two main components:

- **Frontend** (`apps/frontend`): React application with MetaMask integration for interacting with the AMM
- **Contracts** (`libs/contracts`): Hardhat-based smart contracts including ERC20 token and AMM pool

The AMM implements a constant product formula (x * y = k) for ETH/SIMP token swaps with liquidity provision functionality.

## Quick Development Start

**First time setup after cloning:**
```bash
# Generate TypeChain types (required for TypeScript compilation)
nx build contracts
```

Use the convenience script to start the complete development environment:
```bash
./scripts/start-dev.sh
```
This starts Hardhat network, deploys contracts, and launches the frontend.

## Essential Commands

### Project-wide Commands
```bash
# Lint all projects
nx run-many -t lint
nx run-many -t lint:fix

# Type checking
nx typecheck frontend
nx typecheck contracts
```

### Frontend Development
```bash
# Serve frontend
nx serve frontend

# Build frontend
nx build frontend

# Frontend linting
nx lint frontend
nx lint:fix frontend
```

### Smart Contract Development
```bash
# From libs/contracts directory:
npx hardhat node                    # Start local network
npx hardhat test                    # Run contract tests
nx test contracts                   # Run tests via Nx

# Build contracts (compiles and generates TypeChain types)
nx build contracts                  # Generates TypeChain types in apps/frontend/src/typechain-types/

# Contract deployment
npx hardhat ignition deploy ignition/modules/AMMPool.ts --network localhost
npx hardhat ignition deploy ignition/modules/DeployAll.ts --network localhost

# Copy artifacts to frontend
nx copy-artifacts contracts        # Copy deployed addresses to frontend (ABIs no longer needed - TypeChain used)

# Linting
nx lint-js contracts               # TypeScript/JS linting
nx lint-js-fix contracts
nx lint-sol contracts             # Solidity linting
nx lint-sol-fix contracts
nx format-sol contracts           # Format Solidity code
```

### End-to-End Testing
```bash
# Run all e2e tests (requires Hardhat node running)
nx e2e frontend-e2e

# Update visual snapshots
nx update-snapshots frontend-e2e

# Show test report
nx show-report frontend-e2e
```

**E2E Test Coverage:**
- Visual tests: Connect wallet flow and AMM interface
- AMM functionality: Add liquidity (10 ETH + 20 SIMP), swap ETH→SIMP, swap SIMP→ETH
- Tests use Synpress with MetaMask automation on localhost:8545

## Architecture Notes

### Smart Contracts
- **AMMPool.sol**: Main AMM contract implementing constant product formula for ETH/SIMP swaps
- **Token.sol**: ERC20 token contract for the SIMP token
- Uses OpenZeppelin contracts for security and standards compliance
- Hardhat Ignition for deployment with artifact management

### Frontend Architecture
- React 19 with TypeScript and SCSS modules
- Ethers.js v6 for blockchain interaction
- Component structure: WalletInfo, Swap, Liquidity components
- Contract artifacts and deployed addresses loaded from `/public/` directory
- MetaMask integration for wallet connectivity

### Key Integration Points
- Deployed addresses automatically copied from `libs/contracts/ignition/deployments/chain-31337/deployed_addresses.json` to `apps/frontend/public/deployed_addresses.json`
- Frontend uses TypeChain-generated factories for type-safe contract interaction
- Contract ABIs are embedded in TypeChain factories (no longer need to copy ABIs)
- Use `nx copy-artifacts contracts` after deployment to sync deployed addresses to frontend

## Development Workflow

**After fresh clone:**
1. Generate TypeChain types: `nx build contracts`

**Regular development:**
1. Start local Hardhat network
2. Deploy contracts using Ignition modules
3. Copy artifacts to frontend: `nx copy-artifacts contracts`
4. Start frontend development server
5. Connect MetaMask to localhost:8545 for testing

Always run linting and type checking before committing changes.

**Note:** TypeChain types are generated build artifacts and not committed to the repository. They must be generated locally after cloning.