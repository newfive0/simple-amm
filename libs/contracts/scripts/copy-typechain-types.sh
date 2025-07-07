#!/bin/bash

# Script to copy TypeChain types to frontend and e2e projects
# This can be run after contract compilation without requiring deployment

TYPECHAIN_SOURCE="$(dirname "$0")/../artifacts/typechain-types"
TYPECHAIN_FRONTEND_TARGET="$(dirname "$0")/../../../apps/frontend/artifacts/typechain-types"
TYPECHAIN_E2E_TARGET="$(dirname "$0")/../../../apps/e2e/artifacts/typechain-types"

if [ -d "$TYPECHAIN_SOURCE" ]; then
    echo "Copying TypeChain artifacts to frontend and e2e projects..."
    
    # Create target directories if they don't exist
    mkdir -p "$(dirname "$TYPECHAIN_FRONTEND_TARGET")"
    mkdir -p "$(dirname "$TYPECHAIN_E2E_TARGET")"
    
    # Copy TypeChain types to both projects
    cp -r "$TYPECHAIN_SOURCE" "$TYPECHAIN_FRONTEND_TARGET"
    cp -r "$TYPECHAIN_SOURCE" "$TYPECHAIN_E2E_TARGET"
    
    echo "TypeChain artifacts copied to both projects!"
    echo "Frontend: $TYPECHAIN_FRONTEND_TARGET"
    echo "E2E: $TYPECHAIN_E2E_TARGET"
else
    echo "Error: TypeChain artifacts not found at $TYPECHAIN_SOURCE"
    echo "Run 'nx build contracts' to generate TypeChain types first"
    exit 1
fi