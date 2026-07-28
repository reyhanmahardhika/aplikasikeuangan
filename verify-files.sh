#!/bin/bash
# FILE REGISTRY & VERIFICATION SCRIPT
# Gunakan untuk memverifikasi semua files sudah ada

echo "=== WALLET MANAGEMENT & GOLD WALLET IMPLEMENTATION ==="
echo "File Registry & Verification"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check file
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}?${NC} $1"
        return 0
    else
        echo -e "${RED}?${NC} $1 (NOT FOUND)"
        return 1
    fi
}

echo "BACKEND FILES:"
echo "=============="
check_file "database/migrations/014_wallet_gold_support.sql"
check_file "apps/server/src/services/goldPriceService.ts"
check_file "apps/server/src/services/walletManagementService.ts"
check_file "apps/server/src/routes/walletManagementRoutes.ts"
check_file "apps/server/src/routes/__tests__/walletManagement.test.ts"

echo ""
echo "FRONTEND FILES:"
echo "==============="
check_file "apps/client/src/hooks/useWalletManagement.ts"
check_file "apps/client/src/components/WalletManagement.tsx"
check_file "apps/client/src/lib/walletManagementTranslations.ts"

echo ""
echo "DOCUMENTATION FILES:"
echo "===================="
check_file "docs/WALLET_MANAGEMENT_API.md"
check_file "IMPLEMENTATION_SUMMARY.md"
check_file "INTEGRATION_CHECKLIST.md"
check_file "QUICK_START_GUIDE.md"
check_file "INTEGRATION_CODE_TEMPLATES.md"
check_file "DELIVERY_SUMMARY.md"

echo ""
echo "=== VERIFICATION COMPLETE ==="
