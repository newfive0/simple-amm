# Frontend E2E Tests

Visual tests for the Simple AMM using Playwright and Synpress.

## Quick Start

1. **Start Hardhat network:**
   ```bash
   cd libs/contracts && npx hardhat node
   ```

2. **Deploy contracts:**
   ```bash
   cd libs/contracts && npx hardhat ignition deploy ignition/modules/DeployAll.ts --network localhost
   ```

3. **Copy artifacts:**
   ```bash
   pnpm exec nx copy-artifacts contracts
   ```

4. **Run tests:**
   ```bash
   pnpm exec nx run frontend-e2e:e2e
   ```

## Update Snapshots

```bash
pnpm exec nx run frontend-e2e:e2e --update-snapshots
```

## What the Test Does

1. Connects MetaMask to the dApp
2. Waits for token symbol (SIMP) to load from contracts
3. Takes a full-page screenshot for visual regression testing

## Troubleshooting

- **Hardhat network not available**: Ensure step 1 is running
- **Token symbol not found**: Complete steps 1-3 in order
- **Snapshot differences**: Use `--update-snapshots` flag