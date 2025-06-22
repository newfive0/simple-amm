#!/bin/bash

# Check if Hardhat node is running
# Shared logic between start-dev.sh and e2e tests

# Try to connect to Hardhat node and check for valid response
response=$(curl -s -X POST -H "Content-Type: application/json" \
   --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
   http://localhost:8545 2>/dev/null || echo "")

# Check if we got a valid JSON-RPC response with result field
if echo "$response" | grep -q '"result"'; then
    exit 0  # Hardhat is running
else
    echo "❌ Hardhat node not running at localhost:8545. Please start it first with: ./scripts/start-dev.sh"
    exit 1  # Hardhat is not running
fi