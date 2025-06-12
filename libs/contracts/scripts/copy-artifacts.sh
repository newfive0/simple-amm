#!/bin/bash

# Script to copy contract artifacts to frontend public directory

SOURCE_DIR="$(dirname "$0")/../artifacts/src"
TARGET_DIR="$(dirname "$0")/../../../apps/frontend/public/artifacts"
DEPLOYED_ADDRESSES_SOURCE="$(dirname "$0")/../ignition/deployments/chain-31337/deployed_addresses.json"
DEPLOYED_ADDRESSES_TARGET="$(dirname "$0")/../../../apps/frontend/public/deployed_addresses.json"

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Copy Token artifact
if [ -f "$SOURCE_DIR/Token.sol/Token.json" ]; then
    cp "$SOURCE_DIR/Token.sol/Token.json" "$TARGET_DIR/"
    echo "Token artifact copied successfully!"
else
    echo "Error: Token artifact not found at $SOURCE_DIR/Token.sol/Token.json"
    exit 1
fi

# Copy AMMPool artifact
if [ -f "$SOURCE_DIR/AMMPool.sol/AMMPool.json" ]; then
    cp "$SOURCE_DIR/AMMPool.sol/AMMPool.json" "$TARGET_DIR/"
    echo "AMMPool artifact copied successfully!"
else
    echo "Error: AMMPool artifact not found at $SOURCE_DIR/AMMPool.sol/AMMPool.json"
    exit 1
fi

# Copy deployed addresses if they exist
if [ -f "$DEPLOYED_ADDRESSES_SOURCE" ]; then
    cp "$DEPLOYED_ADDRESSES_SOURCE" "$DEPLOYED_ADDRESSES_TARGET"
    echo "Deployed addresses copied successfully!"
else
    echo "Warning: Deployed addresses not found at $DEPLOYED_ADDRESSES_SOURCE"
fi

echo "All artifacts copied successfully!"