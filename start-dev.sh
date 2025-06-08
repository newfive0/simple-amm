#!/bin/bash

# Function to check if Hardhat node is ready
check_hardhat_ready() {
    echo "Checking Hardhat node..."
    for i in {1..30}; do
        if curl -s -X POST -H "Content-Type: application/json" \
           --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
           http://localhost:8545 > /dev/null 2>&1; then
            echo "Hardhat node is ready!"
            return 0
        fi
        if [ $i -eq 30 ]; then
            echo "Hardhat node failed to start"
            return 1
        fi
        sleep 1
    done
}

# Cleanup function
cleanup() {
    echo "Stopping services..."
    pkill -f "hardhat node"
    pkill -f "nx serve"
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "Starting development environment..."

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

# Start frontend
cd ../..
echo "Starting frontend..."
nx serve frontend > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

echo "Ready! Hardhat: http://localhost:8545 | Frontend: http://localhost:4200"
echo "Logs: libs/contracts/hardhat.log | frontend.log"
echo "Press Ctrl+C to stop"

# Keep running
while true; do sleep 1; done 