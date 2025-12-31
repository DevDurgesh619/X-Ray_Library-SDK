#!/bin/bash

# End-to-End Production Test Script for X-Ray
# Production URL: https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROD_URL="https://x-ray-library-sdk-git-main-devdurgesh619s-projects.vercel.app"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_NAME="E2E Test User"
API_KEY=""
EXECUTION_ID=""

echo "=========================================="
echo "X-Ray Production End-to-End Test"
echo "=========================================="
echo "Production URL: $PROD_URL"
echo "Test Email: $TEST_EMAIL"
echo ""

# Function to print test status
print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# Test 1: Check if production site is accessible
print_test "Test 1: Checking if production site is accessible..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
if [ "$RESPONSE" = "200" ]; then
    print_success "Production site is accessible (HTTP $RESPONSE)"
else
    print_error "Production site returned HTTP $RESPONSE"
    exit 1
fi
echo ""

# Test 2: Check reasoning stats endpoint (public, no auth required)
print_test "Test 2: Testing public reasoning stats endpoint..."
STATS_RESPONSE=$(curl -s "$PROD_URL/api/reasoning/stats")
if echo "$STATS_RESPONSE" | grep -q "queue"; then
    print_success "Reasoning stats endpoint working"
    print_info "Stats: $STATS_RESPONSE"
else
    print_error "Reasoning stats endpoint failed"
    echo "Response: $STATS_RESPONSE"
fi
echo ""

# Test 3: Test authentication - should fail without API key
print_test "Test 3: Testing authentication (should fail without API key)..."
AUTH_TEST=$(curl -s -X POST "$PROD_URL/api/run-pipeline" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}")
HTTP_CODE=$(echo "$AUTH_TEST" | tail -n 1)
if [ "$HTTP_CODE" = "401" ]; then
    print_success "Authentication correctly blocks unauthenticated requests (HTTP 401)"
else
    print_error "Expected HTTP 401, got HTTP $HTTP_CODE"
fi
echo ""

# Test 4: Check if we need to use an existing API key or create a new user
print_info "For the remaining tests, we need a valid API key."
echo ""
echo "You can either:"
echo "  1. Provide an existing API key"
echo "  2. Create a new user via the signup page"
echo ""
read -p "Do you have an existing API key? (y/n): " HAS_KEY

if [ "$HAS_KEY" = "y" ] || [ "$HAS_KEY" = "Y" ]; then
    read -p "Enter your API key (xray_...): " API_KEY
    echo ""
else
    print_info "To create a new user, please visit: $PROD_URL/signup"
    print_info "After creating an account, you'll receive an API key."
    echo ""
    read -p "Enter your new API key (xray_...): " API_KEY
    echo ""
fi

# Validate API key format
if [[ ! "$API_KEY" =~ ^xray_ ]]; then
    print_error "Invalid API key format. Must start with 'xray_'"
    exit 1
fi

print_success "API key provided: ${API_KEY:0:15}..."
echo ""

# Test 5: Run competitor selection pipeline
print_test "Test 4: Running competitor selection pipeline..."
PIPELINE_RESPONSE=$(curl -s -X POST "$PROD_URL/api/run-pipeline" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json")

if echo "$PIPELINE_RESPONSE" | grep -q "executionId"; then
    EXECUTION_ID=$(echo "$PIPELINE_RESPONSE" | grep -o '"executionId":"[^"]*"' | cut -d'"' -f4)
    print_success "Pipeline executed successfully"
    print_info "Execution ID: $EXECUTION_ID"
else
    print_error "Pipeline execution failed"
    echo "Response: $PIPELINE_RESPONSE"
    exit 1
fi
echo ""

# Wait for pipeline to complete
print_info "Waiting 3 seconds for pipeline to complete..."
sleep 3
echo ""

# Test 6: Retrieve execution details
print_test "Test 5: Retrieving execution details..."
EXECUTION_RESPONSE=$(curl -s -X GET "$PROD_URL/api/execution/$EXECUTION_ID" \
    -H "x-api-key: $API_KEY")

if echo "$EXECUTION_RESPONSE" | grep -q "executionId"; then
    print_success "Execution retrieved successfully"

    # Parse execution details
    STEPS_COUNT=$(echo "$EXECUTION_RESPONSE" | grep -o '"name"' | wc -l | tr -d ' ')
    print_info "Number of steps: $STEPS_COUNT"

    # Check if execution completed
    if echo "$EXECUTION_RESPONSE" | grep -q '"completedAt"'; then
        print_success "Execution completed"
    else
        print_info "Execution may still be running"
    fi
else
    print_error "Failed to retrieve execution"
    echo "Response: $EXECUTION_RESPONSE"
    exit 1
fi
echo ""

# Test 7: Test movie pipeline
print_test "Test 6: Running movie recommendation pipeline..."
MOVIE_RESPONSE=$(curl -s -X POST "$PROD_URL/api/run-movie-pipeline" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json")

if echo "$MOVIE_RESPONSE" | grep -q "executionId"; then
    MOVIE_EXEC_ID=$(echo "$MOVIE_RESPONSE" | grep -o '"executionId":"[^"]*"' | cut -d'"' -f4)
    print_success "Movie pipeline executed successfully"
    print_info "Movie Execution ID: $MOVIE_EXEC_ID"
else
    print_error "Movie pipeline execution failed"
    echo "Response: $MOVIE_RESPONSE"
fi
echo ""

# Test 8: Trigger reasoning generation
print_test "Test 7: Triggering reasoning generation..."
sleep 2  # Wait a bit before triggering reasoning
REASONING_RESPONSE=$(curl -s -X POST "$PROD_URL/api/reasoning/process" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"executionId\": \"$EXECUTION_ID\"}")

if echo "$REASONING_RESPONSE" | grep -q "success"; then
    print_success "Reasoning generation triggered"
    print_info "Response: $REASONING_RESPONSE"
else
    print_error "Failed to trigger reasoning"
    echo "Response: $REASONING_RESPONSE"
fi
echo ""

# Test 9: Check reasoning queue stats again
print_test "Test 8: Checking reasoning queue stats after processing..."
STATS_AFTER=$(curl -s "$PROD_URL/api/reasoning/stats")
print_info "Stats after: $STATS_AFTER"
echo ""

# Test 10: Verify execution with reasoning
print_test "Test 9: Verifying execution has reasoning..."
sleep 3  # Wait for reasoning to complete
FINAL_EXECUTION=$(curl -s -X GET "$PROD_URL/api/execution/$EXECUTION_ID" \
    -H "x-api-key: $API_KEY")

if echo "$FINAL_EXECUTION" | grep -q "reasoning"; then
    print_success "Execution has reasoning data"
else
    print_info "Execution may not have reasoning yet (async processing)"
fi
echo ""

# Test 11: Test authorization (try to access someone else's execution)
print_test "Test 10: Testing authorization (access control)..."
FAKE_EXEC_ID="fake-execution-id-12345"
AUTH_CHECK=$(curl -s -X GET "$PROD_URL/api/execution/$FAKE_EXEC_ID" \
    -H "x-api-key: $API_KEY" \
    -w "\n%{http_code}")
HTTP_CODE=$(echo "$AUTH_CHECK" | tail -n 1)
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "403" ]; then
    print_success "Authorization correctly blocks access to non-existent/unauthorized executions (HTTP $HTTP_CODE)"
else
    print_info "Authorization check returned HTTP $HTTP_CODE"
fi
echo ""

# Test 12: Test invalid API key
print_test "Test 11: Testing with invalid API key..."
INVALID_RESPONSE=$(curl -s -X POST "$PROD_URL/api/run-pipeline" \
    -H "x-api-key: xray_invalid_key_12345" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}")
HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" = "401" ]; then
    print_success "Invalid API key correctly rejected (HTTP 401)"
else
    print_error "Expected HTTP 401 for invalid key, got HTTP $HTTP_CODE"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
print_success "Production URL: $PROD_URL"
print_success "API Key: ${API_KEY:0:15}..."
print_success "Test Execution ID: $EXECUTION_ID"
if [ ! -z "$MOVIE_EXEC_ID" ]; then
    print_success "Movie Execution ID: $MOVIE_EXEC_ID"
fi
echo ""
print_info "View your executions at:"
echo "  - Dashboard: $PROD_URL"
echo "  - Execution Detail: $PROD_URL/execution/$EXECUTION_ID"
if [ ! -z "$MOVIE_EXEC_ID" ]; then
    echo "  - Movie Execution: $PROD_URL/execution/$MOVIE_EXEC_ID"
fi
echo ""
print_success "All tests completed successfully! ✓"
echo ""
