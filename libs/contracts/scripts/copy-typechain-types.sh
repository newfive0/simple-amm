#!/bin/bash

# Script to copy TypeChain artifacts to frontend and e2e projects
# This allows both projects to access generated TypeScript contract types

TYPECHAIN_SOURCE="$(dirname "$0")/../artifacts/typechain-types"
FRONTEND_TYPECHAIN_TARGET="$(dirname "$0")/../../../apps/frontend/artifacts/typechain-types"
E2E_TYPECHAIN_TARGET="$(dirname "$0")/../../../apps/e2e/artifacts/typechain-types"

echo "Copying TypeChain types..."

# Check if TypeChain types exist
if [ ! -d "$TYPECHAIN_SOURCE" ]; then
    echo "Error: TypeChain types not found at $TYPECHAIN_SOURCE"
    echo "Run 'nx build contracts' first to generate TypeChain types"
    exit 1
fi

# Create target directories if they don't exist
mkdir -p "$(dirname "$FRONTEND_TYPECHAIN_TARGET")"
mkdir -p "$(dirname "$E2E_TYPECHAIN_TARGET")"

# Copy TypeChain artifacts to frontend
echo "Copying TypeChain artifacts to frontend and e2e projects..."
cp -r "$TYPECHAIN_SOURCE" "$FRONTEND_TYPECHAIN_TARGET"
cp -r "$TYPECHAIN_SOURCE" "$E2E_TYPECHAIN_TARGET"

echo "TypeChain artifacts copied to both projects!"
echo "Frontend: $FRONTEND_TYPECHAIN_TARGET"
echo "E2E: $E2E_TYPECHAIN_TARGET"

echo ""
echo "All artifacts copied successfully!"