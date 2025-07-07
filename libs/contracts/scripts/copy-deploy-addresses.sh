#!/bin/bash

# Script to generate environment variables from deployed contract addresses
# This automatically creates .env.local with contract addresses after deployment

DEPLOYED_ADDRESSES_SOURCE="$(dirname "$0")/../ignition/deployments/chain-31337/deployed_addresses.json"
FRONTEND_ENV_TARGET="$(dirname "$0")/../../../apps/frontend/artifacts/.env.local"
E2E_ENV_TARGET="$(dirname "$0")/../../../apps/e2e/artifacts/.env.local"

echo "Copying deployed contract addresses..."

# Check if deployment file exists
if [ ! -f "$DEPLOYED_ADDRESSES_SOURCE" ]; then
    echo "Error: Deployed addresses not found at $DEPLOYED_ADDRESSES_SOURCE"
    exit 1
fi

# Extract addresses from JSON and generate environment variables
echo "Generating environment variables from deployed addresses..."

# Create artifacts directories if they don't exist
mkdir -p "$(dirname "$FRONTEND_ENV_TARGET")"
mkdir -p "$(dirname "$E2E_ENV_TARGET")"

# Parse JSON and extract addresses
TOKEN_ADDRESS=$(cat "$DEPLOYED_ADDRESSES_SOURCE" | grep -o '"TokenModule#SimplestToken": "[^"]*"' | cut -d'"' -f4)
AMM_POOL_ADDRESS=$(cat "$DEPLOYED_ADDRESSES_SOURCE" | grep -o '"AMMPoolModule#AMMPool": "[^"]*"' | cut -d'"' -f4)

# Validate addresses were extracted
if [ -z "$TOKEN_ADDRESS" ] || [ -z "$AMM_POOL_ADDRESS" ]; then
    echo "Error: Could not extract contract addresses from deployment file"
    exit 1
fi

# Generate .env.local file for frontend
cat > "$FRONTEND_ENV_TARGET" << EOF
# Auto-generated contract addresses from deployment
# Generated on $(date)
VITE_TOKEN_ADDRESS=$TOKEN_ADDRESS
VITE_AMM_POOL_ADDRESS=$AMM_POOL_ADDRESS
VITE_NETWORK_CHAIN_ID=31337
EOF

# Generate .env.local file for e2e
cat > "$E2E_ENV_TARGET" << EOF
# Auto-generated contract addresses from deployment
# Generated on $(date)
VITE_TOKEN_ADDRESS=$TOKEN_ADDRESS
VITE_AMM_POOL_ADDRESS=$AMM_POOL_ADDRESS
VITE_NETWORK_CHAIN_ID=31337
EOF

echo "Environment variables generated successfully!"
echo "Token Address: $TOKEN_ADDRESS"
echo "AMM Pool Address: $AMM_POOL_ADDRESS"
echo "Frontend env saved to: $FRONTEND_ENV_TARGET"
echo "E2E env saved to: $E2E_ENV_TARGET"