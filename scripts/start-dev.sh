#!/bin/bash

# Function to check if Hardhat node is ready
check_hardhat_ready() {
    echo "Checking Hardhat node..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    for i in {1..30}; do
        # Try to connect to Hardhat directly
        response=$(curl -s -X POST -H "Content-Type: application/json" \
           --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
           http://localhost:8545 2>/dev/null || echo "")
        
        if echo "$response" | grep -q '"result"'; then
            echo "Hardhat node is ready!"
            return 0
        fi
        
        if [ $i -eq 30 ]; then
            echo "Hardhat node failed to start"
            echo "Last response: $response"
            return 1
        fi
        echo "⏳ Waiting for Hardhat node... (attempt $i/30)"
        sleep 1
    done
}

# Kill services function
kill_services() {
    pkill -f "hardhat node" 2>/dev/null || true
    pkill -f "nx serve" 2>/dev/null || true
}

# Cleanup function
cleanup() {
    echo "Stopping services..."
    kill_services
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "Starting development environment..."

# Clean up any existing processes
echo "Cleaning up existing processes..."
kill_services

# Start Hardhat
cd libs/contracts
npx hardhat node > hardhat.log 2>&1 &
HARDHAT_PID=$!
echo "Hardhat started (PID: $HARDHAT_PID)"

# Check Hardhat node liveness
if ! check_hardhat_ready; then
    exit 1
fi

# Deploy contracts
echo "Deploying contracts..."
npx hardhat ignition deploy ignition/modules/AMMPool.ts --network localhost --reset

# Copy artifacts to frontend
cd ../..
echo "Copying contract artifacts..."
nx copy-artifacts contracts

# Start frontend
echo "Starting frontend..."
nx serve frontend > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

echo "Ready! Hardhat: http://localhost:8545 | Frontend: http://localhost:4200"
echo "Logs: libs/contracts/hardhat.log | frontend.log"
echo "Press Ctrl+C to stop"

# Keep running
while true; do sleep 1; done 