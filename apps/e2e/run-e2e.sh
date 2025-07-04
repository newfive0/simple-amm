#!/bin/bash

# Start development environment
echo "Starting development environment..."
cd ../..
./scripts/start-dev.sh 2>&1 | tee /tmp/simple-amm-e2e-start-dev.log &
DEV_PID=$!
cd apps/e2e

# Cleanup function
cleanup() {
    echo "Stopping development environment..."
    kill $DEV_PID 2>/dev/null
    exit 0
}
trap cleanup EXIT

# Process arguments
TEST_FILES=""
GREP_PATTERN=""

for arg in "$@"; do
    # Skip empty args that come from Nx parameter substitution
    if [ -n "$arg" ] && [ "$arg" != "{args.file}" ] && [ "$arg" != "{args.grep}" ]; then
        # Check if this looks like a grep pattern (starts with --grep)
        if [[ "$arg" == "--grep="* ]]; then
            GREP_PATTERN="$arg"
        elif [ -z "$GREP_PATTERN" ] && [[ "$arg" != *.spec.ts ]] && [[ "$arg" != src/* ]]; then
            # If no explicit --grep= and not a test file, treat as grep pattern
            GREP_PATTERN="--grep=$arg"
        else
            # Assume it's a test file
            TEST_FILES="$TEST_FILES $arg"
        fi
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
npx playwright test --config=playwright.config.ts $GREP_PATTERN $TEST_FILES

echo "Tests completed"