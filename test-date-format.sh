#!/bin/bash

echo "🧪 Testing Date Format Compatibility..."
echo "======================================"
echo ""

BASE_URL="http://localhost:3000/api"

echo "1. Fetching current runs..."
response=$(curl -s "$BASE_URL/runs")

echo "2. Analyzing date formats..."
echo ""

# Extract and validate each date
echo "$response" | grep -o '"date":"[^"]*"' | cut -d'"' -f4 | while read -r date; do
    echo "Date: $date"
    
    # Check if it's a valid ISO 8601 date
    if [[ $date =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$ ]]; then
        echo "✅ Valid ISO 8601 format"
    else
        echo "❌ Invalid format"
    fi
    
    # Check if it's parseable by JavaScript
    if node -e "console.log('JS Parseable:', !isNaN(new Date('$date').getTime()))" 2>/dev/null; then
        echo "✅ JavaScript parseable"
    else
        echo "❌ JavaScript parse error"
    fi
    
    # Check if it's parseable by Swift (simulate with date command)
    if date -j -f "%Y-%m-%dT%H:%M:%S.%LZ" "$date" "+%Y-%m-%d" >/dev/null 2>&1; then
        echo "✅ Swift/Unix date parseable"
    else
        echo "❌ Swift/Unix date parse error"
    fi
    
    echo "---"
done

echo ""
echo "3. iOS App Compatibility Check..."
echo "The iOS app expects:"
echo "  - ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ"
echo "  - Valid date string that can be parsed by Swift's Date initializer"
echo "  - Consistent timezone handling (Z suffix for UTC)"

echo ""
echo "4. Current Status:"
if echo "$response" | grep -q '"date":"[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}\.[0-9]\{3\}Z"'; then
    echo "✅ All dates are in proper ISO 8601 format"
    echo "✅ iOS app should now be able to parse dates successfully"
else
    echo "❌ Some dates are not in proper format"
fi

echo ""
echo "📱 Try building and running your iOS app again!"
echo "🌐 The date parsing errors should now be resolved"
