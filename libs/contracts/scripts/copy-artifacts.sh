#!/bin/bash

# Script to copy deployed contract addresses to frontend public directory
# Note: ABIs are no longer needed since we use TypeChain factories

DEPLOYED_ADDRESSES_SOURCE="$(dirname "$0")/../ignition/deployments/chain-31337/deployed_addresses.json"
DEPLOYED_ADDRESSES_TARGET="$(dirname "$0")/../../../apps/frontend/public/deployed_addresses.json"

# Copy deployed addresses if they exist
if [ -f "$DEPLOYED_ADDRESSES_SOURCE" ]; then
    cp "$DEPLOYED_ADDRESSES_SOURCE" "$DEPLOYED_ADDRESSES_TARGET"
    echo "Deployed addresses copied successfully!"
else
    echo "Error: Deployed addresses not found at $DEPLOYED_ADDRESSES_SOURCE"
    exit 1
fi

echo "Contract addresses copied successfully!"