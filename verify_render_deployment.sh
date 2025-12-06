#!/bin/bash

# Render Deployment Verification Script
# Run this after deploying to Render to verify everything works

if [ -z "$1" ]; then
  echo "Usage: ./verify_render_deployment.sh <your-render-url>"
  echo "Example: ./verify_render_deployment.sh https://er-emr.onrender.com"
  exit 1
fi

RENDER_URL="$1"
API_URL="$RENDER_URL/api"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Render Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Testing: $RENDER_URL\n"

# Test 1: Health Check
echo -e "${BLUE}[1/6] Health Check${NC}"
HEALTH=$(curl -s -w "\n%{http_code}" "$RENDER_URL/health" 2>/dev/null)
HTTP_CODE=$(echo "$HEALTH" | tail -n1)
RESPONSE=$(echo "$HEALTH" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
  echo "$RESPONSE" | jq -r '"  Status: \(.status), Service: \(.service)"' 2>/dev/null || echo "  $RESPONSE"
else
  echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
  echo "  Response: $RESPONSE"
  echo -e "${YELLOW}  → Check if backend is running on Render${NC}"
fi

# Test 2: API Documentation
echo -e "\n${BLUE}[2/6] API Documentation${NC}"
DOCS=$(curl -s -w "\n%{http_code}" "$RENDER_URL/docs" 2>/dev/null)
HTTP_CODE=$(echo "$DOCS" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ API docs accessible${NC}"
  echo "  Visit: $RENDER_URL/docs"
else
  echo -e "${RED}✗ API docs not accessible (HTTP $HTTP_CODE)${NC}"
fi

# Test 3: Register Endpoint
echo -e "\n${BLUE}[3/6] Register Endpoint${NC}"
REGISTER=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "verify-test-'$(date +%s)'@test.com",
    "password": "test123",
    "name": "Verify Test",
    "role": "resident",
    "user_type": "individual",
    "subscription_tier": "free"
  }' 2>/dev/null)

HTTP_CODE=$(echo "$REGISTER" | tail -n1)
RESPONSE=$(echo "$REGISTER" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Register endpoint working${NC}"
  TEST_EMAIL=$(echo "$RESPONSE" | jq -r '.user.email' 2>/dev/null)
  TEST_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token' 2>/dev/null)
  echo "  Created user: $TEST_EMAIL"
  echo "  Token received: ${TEST_TOKEN:0:20}..."
elif [ "$HTTP_CODE" = "400" ]; then
  echo -e "${YELLOW}⚠ Register endpoint exists but validation failed${NC}"
  echo "  This is OK if testing with same email multiple times"
else
  echo -e "${RED}✗ Register endpoint failed (HTTP $HTTP_CODE)${NC}"
  echo "  Response: $RESPONSE"
  echo -e "${YELLOW}  → Check MONGO_URL environment variable${NC}"
  echo -e "${YELLOW}  → Check MongoDB Atlas IP whitelist (0.0.0.0/0)${NC}"
fi

# Test 4: Signup Endpoint (Alias)
echo -e "\n${BLUE}[4/6] Signup Endpoint (Alias)${NC}"
SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "verify-signup-'$(date +%s)'@test.com",
    "password": "test123",
    "name": "Signup Test",
    "role": "resident",
    "user_type": "individual",
    "subscription_tier": "free"
  }' 2>/dev/null)

HTTP_CODE=$(echo "$SIGNUP" | tail -n1)
RESPONSE=$(echo "$SIGNUP" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Signup endpoint working${NC}"
elif [ "$HTTP_CODE" = "404" ]; then
  echo -e "${RED}✗ Signup endpoint not found${NC}"
  echo -e "${YELLOW}  → Check if code is deployed correctly${NC}"
  echo -e "${YELLOW}  → Try 'Clear build cache & deploy' on Render${NC}"
else
  echo -e "${YELLOW}⚠ Signup endpoint responded (HTTP $HTTP_CODE)${NC}"
fi

# Test 5: Login Endpoint
if [ ! -z "$TEST_EMAIL" ]; then
  echo -e "\n${BLUE}[5/6] Login Endpoint${NC}"
  LOGIN=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_EMAIL\",
      \"password\": \"test123\"
    }" 2>/dev/null)

  HTTP_CODE=$(echo "$LOGIN" | tail -n1)
  RESPONSE=$(echo "$LOGIN" | sed '$d')

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Login endpoint working${NC}"
    LOGIN_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token' 2>/dev/null)
    echo "  Token received: ${LOGIN_TOKEN:0:20}..."
  elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}✗ Login endpoint not found (HTTP $HTTP_CODE)${NC}"
    echo -e "${YELLOW}  → This means /api/auth/login is missing${NC}"
    echo -e "${YELLOW}  → Check if server.py has login endpoint${NC}"
    echo -e "${YELLOW}  → Verify deployment completed successfully${NC}"
  else
    echo -e "${RED}✗ Login failed (HTTP $HTTP_CODE)${NC}"
    echo "  Response: $RESPONSE"
  fi
else
  echo -e "\n${BLUE}[5/6] Login Endpoint${NC}"
  echo -e "${YELLOW}⚠ Skipped (no test user created)${NC}"
fi

# Test 6: Subscription Plans
echo -e "\n${BLUE}[6/6] Subscription Plans${NC}"
PLANS=$(curl -s -w "\n%{http_code}" "$API_URL/subscription/plans" 2>/dev/null)
HTTP_CODE=$(echo "$PLANS" | tail -n1)
RESPONSE=$(echo "$PLANS" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Subscription plans endpoint working${NC}"
  PLAN_COUNT=$(echo "$RESPONSE" | jq '.plans | length' 2>/dev/null)
  echo "  Available plans: $PLAN_COUNT"
else
  echo -e "${RED}✗ Subscription plans failed (HTTP $HTTP_CODE)${NC}"
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "\n${GREEN}✅ If all tests passed:${NC}"
echo "  1. Your backend is deployed correctly"
echo "  2. All auth endpoints are working"
echo "  3. Database is connected"
echo "  4. React Native app should work"

echo -e "\n${YELLOW}⚠ If tests failed:${NC}"
echo "  1. Check Render logs for errors"
echo "  2. Verify environment variables"
echo "  3. Check MongoDB Atlas connection"
echo "  4. Try 'Clear build cache & deploy'"
echo "  5. See RENDER_TROUBLESHOOTING.md"

echo -e "\n${BLUE}Useful Links:${NC}"
echo "  API Docs: $RENDER_URL/docs"
echo "  Health: $RENDER_URL/health"
echo "  Render Dashboard: https://dashboard.render.com"

echo -e "\n${BLUE}========================================${NC}"
