#!/bin/bash

echo "🧪 Testing Run With Kam API Endpoints..."
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000/api"

# Test health endpoint
echo "1. Testing Health Check..."
response=$(curl -s "$BASE_URL/health")
echo "Response: $response"
echo ""

# Test get all runs
echo "2. Testing Get All Runs..."
response=$(curl -s "$BASE_URL/runs")
echo "Response: $response"
echo ""

# Test create a new run
echo "3. Testing Create New Run..."
new_run_data='{
  "date": "2025-08-28T10:00:00.000Z",
  "time": "10:00",
  "location": "High Line Park",
  "pace": "10:00/mile",
  "description": "Leisurely walk/run on the High Line"
}'

response=$(curl -s -X POST "$BASE_URL/runs" \
  -H "Content-Type: application/json" \
  -d "$new_run_data")
echo "Response: $response"
echo ""

# Extract the ID from the response for update/delete tests
run_id=$(echo $response | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Created run with ID: $run_id"
echo ""

# Test get specific run
echo "4. Testing Get Specific Run..."
response=$(curl -s "$BASE_URL/runs/$run_id")
echo "Response: $response"
echo ""

# Test update run
echo "5. Testing Update Run..."
update_data='{
  "date": "2025-08-28T10:00:00.000Z",
  "time": "10:30",
  "location": "High Line Park",
  "pace": "9:45/mile",
  "description": "Leisurely walk/run on the High Line (updated time)"
}'

response=$(curl -s -X PUT "$BASE_URL/runs/$run_id" \
  -H "Content-Type: application/json" \
  -d "$update_data")
echo "Response: $response"
echo ""

# Test delete run
echo "6. Testing Delete Run..."
response=$(curl -s -X DELETE "$BASE_URL/runs/$run_id")
echo "Response: $response"
echo ""

# Verify run was deleted
echo "7. Verifying Run Was Deleted..."
response=$(curl -s "$BASE_URL/runs/$run_id")
echo "Response: $response"
echo ""

# Final check - get all runs
echo "8. Final Check - Get All Runs..."
response=$(curl -s "$BASE_URL/runs")
echo "Response: $response"
echo ""

echo "✅ API testing completed!"
echo "📱 Your iOS app should now be able to connect to: $BASE_URL"
echo "🌐 Your web admin should now be able to connect to: $BASE_URL"
