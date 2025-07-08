#!/bin/bash

# Main script that coordinates copying both deployed addresses and TypeChain types
# This script calls both copy-deploy-addresses.sh and copy-typechain-types.sh

SCRIPT_DIR="$(dirname "$0")"

echo "Copying contract artifacts..."

# Copy TypeChain types first (needed for typecheck)
"$SCRIPT_DIR/copy-typechain-types.sh"

# Copy deployed addresses (requires actual deployment)
"$SCRIPT_DIR/copy-deploy-addresses.sh"