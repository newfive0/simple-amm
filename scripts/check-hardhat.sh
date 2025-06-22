#!/bin/bash

# Check if Hardhat node is running
# Shared logic between start-dev.sh and e2e tests

if curl -s -X POST -H "Content-Type: application/json" \
   --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
   http://localhost:8545 > /dev/null 2>&1; then
    exit 0  # Hardhat is running
else
    echo "❌ Hardhat node not running at localhost:8545. Please start it first with: ./start-dev.sh"
    exit 1  # Hardhat is not running
fi