#!/bin/bash

# Script to copy both deployed contract addresses and TypeChain types
# This is a convenience script that runs both copy-deploy-addresses.sh and copy-typechain-types.sh

SCRIPT_DIR="$(dirname "$0")"

echo "Copying deployed contract addresses..."
"$SCRIPT_DIR/copy-deploy-addresses.sh"

echo ""
echo "Copying TypeChain types..."
"$SCRIPT_DIR/copy-typechain-types.sh"

echo ""
echo "All artifacts copied successfully!"