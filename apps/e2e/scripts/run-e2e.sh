#!/bin/bash

# Start development environment
echo "Starting development environment..."
cd ../..
./scripts/start-dev.sh 2>&1 | tee /tmp/simple-amm-e2e-start-dev.log &
DEV_PID=$!
cd apps/e2e

# Variable to track test exit code
TEST_EXIT_CODE=0

# Cleanup function
cleanup() {
    echo "Stopping development environment..."
    kill $DEV_PID 2>/dev/null
    exit $TEST_EXIT_CODE
}
trap cleanup EXIT

# Start synpress setup in parallel
echo "Setting up synpress..."
pnpm exec synpress &
SYNPRESS_PID=$!

# Wait for development environment to be ready
echo "Waiting for development environment to be ready..."
for i in {1..60}; do
    # Check if both hardhat (8545) and frontend (4200) are ready
    if curl -s http://localhost:8545 >/dev/null 2>&1 && curl -s http://localhost:4200 >/dev/null 2>&1; then
        echo "Development environment is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "Development environment failed to start - ensure frontend is running on port 4200"
        exit 1
    fi
    sleep 2
done

# Wait for synpress to complete
echo "Waiting for synpress setup to complete..."
wait $SYNPRESS_PID

# Run tests
echo "Running e2e tests..."
pnpm exec playwright test --config=playwright.config.ts "$@"
TEST_EXIT_CODE=$?

echo "Tests completed"