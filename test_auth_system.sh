#!/bin/bash

# ER-EMR Authentication System Test Script
# Tests all auth endpoints with comprehensive scenarios

set -e

API_URL="${API_URL:-http://localhost:8001/api}"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ER-EMR Authentication System Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Register Individual User via /auth/register
echo -e "${BLUE}Test 1: Register Individual User (/auth/register)${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "individual@test.com",
    "password": "test123",
    "name": "Dr. Individual Test",
    "role": "resident",
    "user_type": "individual",
    "mobile": "+919999999991",
    "specialization": "Emergency Medicine",
    "subscription_tier": "free"
  }')

if echo "$REGISTER_RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Individual user registered successfully${NC}"
  INDIVIDUAL_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token')
else
  echo -e "${RED}✗ Individual registration failed${NC}"
  echo "$REGISTER_RESPONSE" | jq .
fi

# Test 2: Signup Institutional User via /auth/signup (alias)
echo -e "\n${BLUE}Test 2: Signup Institutional User (/auth/signup)${NC}"
SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test-hospital.com",
    "password": "test123",
    "name": "Hospital Admin",
    "role": "hospital_admin",
    "user_type": "institutional",
    "mobile": "+919999999992",
    "hospital_name": "Test City Hospital",
    "hospital_type": "hospital",
    "hospital_city": "Mumbai",
    "hospital_state": "Maharashtra",
    "subscription_tier": "premium"
  }')

if echo "$SIGNUP_RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Institutional user signed up successfully${NC}"
  HOSPITAL_ADMIN_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.access_token')
  HOSPITAL_ID=$(echo "$SIGNUP_RESPONSE" | jq -r '.user.hospital_id')
  echo "  Hospital ID: $HOSPITAL_ID"
else
  echo -e "${RED}✗ Institutional signup failed${NC}"
  echo "$SIGNUP_RESPONSE" | jq .
fi

# Test 3: Login
echo -e "\n${BLUE}Test 3: Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "individual@test.com",
    "password": "test123"
  }')

if echo "$LOGIN_RESPONSE" | jq -e '.access_token' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Login successful${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "$LOGIN_RESPONSE" | jq .
fi

# Test 4: Get Current User Profile
echo -e "\n${BLUE}Test 4: Get Current User Profile${NC}"
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $INDIVIDUAL_TOKEN")

if echo "$PROFILE_RESPONSE" | jq -e '.email' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Profile retrieved successfully${NC}"
  echo "  Email: $(echo "$PROFILE_RESPONSE" | jq -r '.email')"
  echo "  Role: $(echo "$PROFILE_RESPONSE" | jq -r '.role')"
  echo "  User Type: $(echo "$PROFILE_RESPONSE" | jq -r '.user_type')"
else
  echo -e "${RED}✗ Profile retrieval failed${NC}"
  echo "$PROFILE_RESPONSE" | jq .
fi

# Test 5: Update Profile
echo -e "\n${BLUE}Test 5: Update Profile${NC}"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/auth/profile" \
  -H "Authorization: Bearer $INDIVIDUAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "specialization": "Critical Care Medicine",
    "mobile": "+919999999999"
  }')

if echo "$UPDATE_RESPONSE" | jq -e '.specialization' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Profile updated successfully${NC}"
  echo "  New Specialization: $(echo "$UPDATE_RESPONSE" | jq -r '.specialization')"
else
  echo -e "${RED}✗ Profile update failed${NC}"
  echo "$UPDATE_RESPONSE" | jq .
fi

# Test 6: Get Subscription Plans
echo -e "\n${BLUE}Test 6: Get Subscription Plans${NC}"
PLANS_RESPONSE=$(curl -s -X GET "$API_URL/subscription/plans")

if echo "$PLANS_RESPONSE" | jq -e '.plans' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Subscription plans retrieved${NC}"
  PLAN_COUNT=$(echo "$PLANS_RESPONSE" | jq '.plans | length')
  echo "  Available Plans: $PLAN_COUNT"
  echo "$PLANS_RESPONSE" | jq -r '.plans[] | "  - \(.name): ₹\(.price_monthly)/month"'
else
  echo -e "${RED}✗ Failed to get plans${NC}"
  echo "$PLANS_RESPONSE" | jq .
fi

# Test 7: Get Subscription Status
echo -e "\n${BLUE}Test 7: Get Subscription Status${NC}"
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/subscription/status" \
  -H "Authorization: Bearer $INDIVIDUAL_TOKEN")

if echo "$STATUS_RESPONSE" | jq -e '.tier' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Subscription status retrieved${NC}"
  echo "  Tier: $(echo "$STATUS_RESPONSE" | jq -r '.tier')"
  echo "  Status: $(echo "$STATUS_RESPONSE" | jq -r '.status')"
else
  echo -e "${RED}✗ Failed to get status${NC}"
  echo "$STATUS_RESPONSE" | jq .
fi

# Test 8: Get All Hospitals
echo -e "\n${BLUE}Test 8: Get All Hospitals${NC}"
HOSPITALS_RESPONSE=$(curl -s -X GET "$API_URL/hospitals" \
  -H "Authorization: Bearer $HOSPITAL_ADMIN_TOKEN")

if echo "$HOSPITALS_RESPONSE" | jq -e '.[0].name' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Hospitals list retrieved${NC}"
  HOSPITAL_COUNT=$(echo "$HOSPITALS_RESPONSE" | jq '. | length')
  echo "  Total Hospitals: $HOSPITAL_COUNT"
  echo "$HOSPITALS_RESPONSE" | jq -r '.[] | "  - \(.name) (\(.city))"'
else
  echo -e "${RED}✗ Failed to get hospitals${NC}"
  echo "$HOSPITALS_RESPONSE" | jq .
fi

# Test 9: Get Specific Hospital
if [ ! -z "$HOSPITAL_ID" ]; then
  echo -e "\n${BLUE}Test 9: Get Specific Hospital${NC}"
  HOSPITAL_RESPONSE=$(curl -s -X GET "$API_URL/hospitals/$HOSPITAL_ID" \
    -H "Authorization: Bearer $HOSPITAL_ADMIN_TOKEN")

  if echo "$HOSPITAL_RESPONSE" | jq -e '.name' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Hospital details retrieved${NC}"
    echo "  Name: $(echo "$HOSPITAL_RESPONSE" | jq -r '.name')"
    echo "  Subscription: $(echo "$HOSPITAL_RESPONSE" | jq -r '.subscription_tier')"
    echo "  Max Users: $(echo "$HOSPITAL_RESPONSE" | jq -r '.max_users')"
  else
    echo -e "${RED}✗ Failed to get hospital${NC}"
    echo "$HOSPITAL_RESPONSE" | jq .
  fi
fi

# Test 10: Get Hospital Users
if [ ! -z "$HOSPITAL_ID" ]; then
  echo -e "\n${BLUE}Test 10: Get Hospital Users${NC}"
  HOSPITAL_USERS_RESPONSE=$(curl -s -X GET "$API_URL/hospitals/$HOSPITAL_ID/users" \
    -H "Authorization: Bearer $HOSPITAL_ADMIN_TOKEN")

  if echo "$HOSPITAL_USERS_RESPONSE" | jq -e '.users' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Hospital users retrieved${NC}"
    USER_COUNT=$(echo "$HOSPITAL_USERS_RESPONSE" | jq '.total')
    echo "  Total Users: $USER_COUNT"
  else
    echo -e "${RED}✗ Failed to get hospital users${NC}"
    echo "$HOSPITAL_USERS_RESPONSE" | jq .
  fi
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All Authentication Tests Completed!${NC}"
echo -e "${BLUE}========================================${NC}"
