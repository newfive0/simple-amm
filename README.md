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

## Deployment

### Deploy Smart Contracts

The project uses Hardhat Ignition for smart contract deployment. You can deploy the AMM system (tokens and pool) using the following steps:

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

**Deploy only tokens:**
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
- TokenA: ERC20 token for trading pair
- TokenB: ERC20 token for trading pair  
- AMMPool: Automated Market Maker pool contract

The deployment artifacts are saved in `libs/contracts/ignition/deployments/` for reuse.

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
nx check-format-sol contracts # Check if Solidity code is properly formatted without making changes
```

## Testing

To run the Solidity smart contract tests:

```sh
nx test contracts         # Run Hardhat tests for the contracts
```
