#!/bin/bash

echo "🔍 Debugging iOS App Connection Issues..."
echo "========================================="
echo ""

BASE_URL="http://localhost:3000/api"

echo "1. Backend Health Check..."
health_response=$(curl -s "$BASE_URL/health")
echo "Health: $health_response"
echo ""

echo "2. Current API Response Structure..."
runs_response=$(curl -s "$BASE_URL/runs")
echo "Full Response: $runs_response"
echo ""

echo "3. Analyzing Response Structure..."
echo ""

# Check if response has the expected structure
if echo "$runs_response" | grep -q '"success":true'; then
    echo "✅ Success field present"
else
    echo "❌ Success field missing"
fi

if echo "$runs_response" | grep -q '"data":'; then
    echo "✅ Data field present"
else
    echo "❌ Data field missing"
fi

if echo "$runs_response" | grep -q '"count":'; then
    echo "✅ Count field present"
else
    echo "❌ Count field missing"
fi

echo ""

echo "4. Analyzing Data Array..."
# Extract the data array
data_array=$(echo "$runs_response" | grep -o '"data":\[[^\]]*\]' | head -1)
if [ -n "$data_array" ]; then
    echo "✅ Data array found: $data_array"
else
    echo "❌ Data array not found"
fi

echo ""

echo "5. Analyzing Individual Run Objects..."
# Count the number of run objects
run_count=$(echo "$runs_response" | grep -o '{"id":"[^}]*' | wc -l)
echo "Found $run_count run objects"

# Check each run object structure
echo "$runs_response" | grep -o '{"id":"[^}]*' | while read -r run; do
    echo "  Run: $run"
    
    # Check for required fields
    if echo "$run" | grep -q '"id":'; then
        echo "    ✅ ID field present"
    else
        echo "    ❌ ID field missing"
    fi
    
    if echo "$run" | grep -q '"date":'; then
        echo "    ✅ Date field present"
    else
        echo "    ❌ Date field missing"
    fi
    
    if echo "$run" | grep -q '"time":'; then
        echo "    ✅ Time field present"
    else
        echo "    ❌ Time field missing"
    fi
    
    if echo "$run" | grep -q '"location":'; then
        echo "    ✅ Location field present"
    else
        echo "    ❌ Location field missing"
    fi
    
    if echo "$run" | grep -q '"pace":'; then
        echo "    ✅ Pace field present"
    else
        echo "    ❌ Pace field missing"
    fi
    
    echo "    ---"
done

echo ""

echo "6. iOS App Expected Structure..."
echo "The iOS app expects:"
echo "  - APIResponse<[ScheduledRun]> wrapper"
echo "  - data field containing array of ScheduledRun objects"
echo "  - Each ScheduledRun with: id (UUID), date (Date), time (String), etc."
echo "  - Dates in ISO 8601 format that Swift's Date initializer can parse"

echo ""

echo "7. Potential Issues Identified..."
echo ""

# Check for common issues
if echo "$runs_response" | grep -q '"date":"[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}\.[0-9]\{3\}Z"'; then
    echo "✅ Date format is correct ISO 8601"
else
    echo "❌ Date format may be incorrect"
fi

if echo "$runs_response" | grep -q '"id":"[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}"'; then
    echo "✅ ID format is correct UUID"
else
    echo "❌ ID format may be incorrect"
fi

echo ""

echo "8. Recommendations..."
echo ""

if echo "$runs_response" | grep -q '"success":true' && echo "$runs_response" | grep -q '"data":' && echo "$runs_response" | grep -q '"count":'; then
    echo "✅ Backend response structure looks correct"
    echo "✅ Data format appears compatible with iOS app"
    echo ""
    echo "🔍 Next debugging steps:"
    echo "  1. Check iOS app console for specific decoding errors"
    echo "  2. Verify iOS app is not caching old data"
    echo "  3. Check if iOS app has different date decoding strategy"
    echo "  4. Verify network request is reaching the correct endpoint"
else
    echo "❌ Backend response structure may have issues"
    echo "❌ Check backend logs for errors"
fi

echo ""
echo "📱 Try building and running your iOS app again!"
echo "🔍 Check the iOS console for the exact error messages"
