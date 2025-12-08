#!/bin/bash

echo "=========================================="
echo "Deployment Fix Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will help you fix the deployment issues.${NC}"
echo ""
echo "Steps:"
echo "1. Copy fixed files to server"
echo "2. Rebuild project"
echo "3. Test database connection"
echo "4. Restart PM2"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo -e "${YELLOW}Step 1: Files that need to be copied to server${NC}"
echo "----------------------------------------"
echo "From your local machine, copy these files to your server:"
echo ""
echo "  scp server/src/index.ts root@84.247.131.178:~/project/Truck_management_backend/src/"
echo "  scp server/src/middleware/security.ts root@84.247.131.178:~/project/Truck_management_backend/src/middleware/"
echo "  scp server/check-db-connection.sh root@84.247.131.178:~/project/Truck_management_backend/"
echo ""
echo -e "${YELLOW}Step 2: On your server, run these commands:${NC}"
echo "----------------------------------------"
echo ""
echo "cd ~/project/Truck_management_backend"
echo "npm run build"
echo "chmod +x check-db-connection.sh"
echo "./check-db-connection.sh"
echo "pm2 restart truckflow-backend --update-env"
echo "pm2 logs truckflow-backend --lines 20"
echo ""

