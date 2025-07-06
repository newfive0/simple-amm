#!/bin/bash

# Script to generate environment variables from deployed contract addresses
# This automatically creates .env.local with contract addresses after deployment

DEPLOYED_ADDRESSES_SOURCE="$(dirname "$0")/../ignition/deployments/chain-31337/deployed_addresses.json"
JOURNAL_SOURCE="$(dirname "$0")/../ignition/deployments/chain-31337/journal.jsonl"
ENV_TARGET="$(dirname "$0")/../../../apps/frontend/artifacts/.env.local"
E2E_ENV_TARGET="$(dirname "$0")/../../../apps/e2e/.env.local"

# Check if deployment files exist
if [ ! -f "$DEPLOYED_ADDRESSES_SOURCE" ]; then
    echo "Error: Deployed addresses not found at $DEPLOYED_ADDRESSES_SOURCE"
    exit 1
fi

if [ ! -f "$JOURNAL_SOURCE" ]; then
    echo "Error: Deployment journal not found at $JOURNAL_SOURCE"
    exit 1
fi

# Extract addresses from JSON and generate environment variables
echo "Generating environment variables from deployed addresses..."

# Create artifacts directory if it doesn't exist
mkdir -p "$(dirname "$ENV_TARGET")"

# Parse JSON and extract addresses
TOKEN_ADDRESS=$(cat "$DEPLOYED_ADDRESSES_SOURCE" | grep -o '"TokenModule#SimplestToken": "[^"]*"' | cut -d'"' -f4)
AMM_POOL_ADDRESS=$(cat "$DEPLOYED_ADDRESSES_SOURCE" | grep -o '"AMMPoolModule#AMMPool": "[^"]*"' | cut -d'"' -f4)

# Extract deployment block number (last deployment completed)
DEPLOYMENT_BLOCK=$(grep '"blockNumber"' "$JOURNAL_SOURCE" | tail -1 | grep -o '"blockNumber":[0-9]*' | cut -d':' -f2)

# Validate addresses and block number were extracted
if [ -z "$TOKEN_ADDRESS" ] || [ -z "$AMM_POOL_ADDRESS" ]; then
    echo "Error: Could not extract contract addresses from deployment file"
    exit 1
fi

if [ -z "$DEPLOYMENT_BLOCK" ]; then
    echo "Error: Could not extract deployment block number from journal file"
    exit 1
fi

# Generate .env.local file for frontend
cat > "$ENV_TARGET" << EOF
# Auto-generated contract addresses from deployment
# Generated on $(date)
VITE_TOKEN_ADDRESS=$TOKEN_ADDRESS
VITE_AMM_POOL_ADDRESS=$AMM_POOL_ADDRESS
VITE_NETWORK_CHAIN_ID=31337
EOF

# Generate .env.local file for e2e tests
cat > "$E2E_ENV_TARGET" << EOF
# Auto-generated contract addresses and deployment info for e2e tests
# Generated on $(date)
TOKEN_ADDRESS=$TOKEN_ADDRESS
AMM_POOL_ADDRESS=$AMM_POOL_ADDRESS
DEPLOYMENT_BLOCK_NUMBER=$DEPLOYMENT_BLOCK
CHAIN_ID=31337
EOF

echo "Environment variables generated successfully!"
echo "Token Address: $TOKEN_ADDRESS"
echo "AMM Pool Address: $AMM_POOL_ADDRESS"
echo "Deployment Block: $DEPLOYMENT_BLOCK"
echo "Frontend config saved to: $ENV_TARGET"
echo "E2E config saved to: $E2E_ENV_TARGET"