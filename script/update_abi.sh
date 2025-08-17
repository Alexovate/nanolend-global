#!/bin/bash

# Script to update ABI after contract deployment
# This prevents ABI errors in the mini-app

echo "🔄 Updating ABI files..."

# Check if forge out directory exists
if [ ! -d "out" ]; then
    echo "❌ Error: 'out' directory not found. Please run 'forge build' first."
    exit 1
fi

# Check if the contract artifact exists
CONTRACT_ARTIFACT="out/CrossChainBNPL.sol/CrossChainBNPL.json"
if [ ! -f "$CONTRACT_ARTIFACT" ]; then
    echo "❌ Error: Contract artifact not found at $CONTRACT_ARTIFACT"
    echo "Please run 'forge build' first."
    exit 1
fi

# Create abi directory if it doesn't exist
mkdir -p src/mini-app/src/abi

# Extract ABI from the contract artifact
echo "📄 Extracting ABI from contract artifact..."
jq '.abi' "$CONTRACT_ARTIFACT" > src/mini-app/src/abi/CrossChainBNPL.json

# Verify the ABI was extracted correctly
if [ $? -eq 0 ]; then
    echo "✅ ABI successfully updated in src/mini-app/src/abi/CrossChainBNPL.json"
    echo "📊 ABI contains $(jq length src/mini-app/src/abi/CrossChainBNPL.json) functions/events"
    
    # Verify our key functions are present
    echo ""
    echo "🔍 Verifying enhanced functions..."
    
    if jq '.[] | select(.name == "getUserDashboardData")' src/mini-app/src/abi/CrossChainBNPL.json > /dev/null; then
        echo "✅ getUserDashboardData function found"
    else
        echo "❌ getUserDashboardData function missing"
    fi
    
    if jq '.[] | select(.name == "getCurrentBalance")' src/mini-app/src/abi/CrossChainBNPL.json > /dev/null; then
        echo "✅ getCurrentBalance function found"
    else
        echo "❌ getCurrentBalance function missing"
    fi
    
    if jq '.[] | select(.name == "calculateInterest")' src/mini-app/src/abi/CrossChainBNPL.json > /dev/null; then
        echo "✅ calculateInterest function found"
    else
        echo "❌ calculateInterest function missing"
    fi
    
else
    echo "❌ Error: Failed to extract ABI"
    exit 1
fi

echo ""
echo "✅ ABI update complete!"
echo ""
echo "Next steps:"
echo "1. Update your environment variables (.env.local and deployment.env)"
echo "2. Restart your mini-app development server: cd src/mini-app && npm run dev"
