#!/bin/bash

# Start development environment
echo "Starting development environment..."
cd ../..
./scripts/start-dev.sh 2>&1 | tee /tmp/simple-amm-e2e-start-dev.log &
DEV_PID=$!
cd apps/frontend-e2e

# Cleanup function
cleanup() {
    echo "Stopping development environment..."
    kill $DEV_PID 2>/dev/null
    exit 0
}
trap cleanup EXIT

# Process arguments
UPDATE_SNAPSHOTS=""
TEST_FILES=""

for arg in "$@"; do
    if [ "$arg" = "--update-snapshots" ]; then
        UPDATE_SNAPSHOTS="--update-snapshots"
    else
        # Assume it's a test file
        TEST_FILES="$TEST_FILES $arg"
    fi
done

# Start synpress setup in parallel
echo "Setting up synpress..."
synpress &
SYNPRESS_PID=$!

# Wait for development environment to be ready
echo "Waiting for development environment to be ready..."
for i in {1..60}; do
    if grep -q "Ready!" /tmp/simple-amm-e2e-start-dev.log 2>/dev/null; then
        echo "Development environment is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "Development environment failed to start"
        exit 1
    fi
    sleep 2
done

# Wait for synpress to complete
echo "Waiting for synpress setup to complete..."
wait $SYNPRESS_PID

# Run tests
echo "Running e2e tests..."
npx playwright test --config=synpress.config.ts $UPDATE_SNAPSHOTS $TEST_FILES

echo "Tests completed"