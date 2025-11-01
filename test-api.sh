#!/bin/bash

# Truck Management API Test Script
# Make sure the server is running on port 5000 before running this script

API_BASE="http://localhost:5000"

echo "🧪 Testing Truck Management System API"
echo "========================================"

# Test health endpoint
echo ""
echo "1️⃣  Testing Health Check..."
curl -s "${API_BASE}/health" | jq .

# Test dashboard stats
echo ""
echo "2️⃣  Testing Dashboard Stats..."
curl -s "${API_BASE}/api/dashboard/stats" | jq .

# Test getting all trucks
echo ""
echo "3️⃣  Testing Get All Trucks..."
curl -s "${API_BASE}/api/trucks" | jq '. | length'

# Test creating a new truck
echo ""
echo "4️⃣  Testing Create Truck..."
TRUCK_RESPONSE=$(curl -s -X POST "${API_BASE}/api/trucks" \
  -H "Content-Type: application/json" \
  -d '{
    "license_plate": "TEST-001",
    "model": "Test Truck Model",
    "year": 2023,
    "capacity": 25.0,
    "status": "active"
  }')
echo $TRUCK_RESPONSE | jq .
TRUCK_ID=$(echo $TRUCK_RESPONSE | jq -r '.id')

# Test getting the created truck
if [ "$TRUCK_ID" != "null" ] && [ "$TRUCK_ID" != "" ]; then
  echo ""
  echo "5️⃣  Testing Get Specific Truck (ID: $TRUCK_ID)..."
  curl -s "${API_BASE}/api/trucks/${TRUCK_ID}" | jq .
  
  # Test updating the truck
  echo ""
  echo "6️⃣  Testing Update Truck..."
  curl -s -X PUT "${API_BASE}/api/trucks/${TRUCK_ID}" \
    -H "Content-Type: application/json" \
    -d '{
      "license_plate": "TEST-001-UPDATED",
      "model": "Updated Test Truck Model",
      "year": 2023,
      "capacity": 30.0,
      "status": "maintenance"
    }' | jq .
  
  # Test deleting the truck
  echo ""
  echo "7️⃣  Testing Delete Truck..."
  curl -s -X DELETE "${API_BASE}/api/trucks/${TRUCK_ID}"
  echo "✅ Truck deleted"
else
  echo "❌ Failed to create truck, skipping update/delete tests"
fi

# Test getting all products
echo ""
echo "8️⃣  Testing Get All Products..."
curl -s "${API_BASE}/api/products" | jq '. | length'

# Test getting all employees
echo ""
echo "9️⃣  Testing Get All Employees..."
curl -s "${API_BASE}/api/employees" | jq '. | length'

# Test getting all deliveries
echo ""
echo "🔟 Testing Get All Deliveries..."
curl -s "${API_BASE}/api/deliveries" | jq '. | length'

# Test getting all expenses
echo ""
echo "1️⃣1️⃣ Testing Get All Expenses..."
curl -s "${API_BASE}/api/expenses" | jq '. | length'

# Test recent deliveries
echo ""
echo "1️⃣2️⃣ Testing Recent Deliveries..."
curl -s "${API_BASE}/api/dashboard/recent-deliveries" | jq '. | length'

# Test recent expenses
echo ""
echo "1️⃣3️⃣ Testing Recent Expenses..."
curl -s "${API_BASE}/api/dashboard/recent-expenses" | jq '. | length'

echo ""
echo "✅ API Testing Complete!"
echo ""
echo "📚 Full API Documentation: ${API_BASE}/api-docs"
echo "🏥 Health Check: ${API_BASE}/health"


