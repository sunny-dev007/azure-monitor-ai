#!/bin/bash

# Script to assign Contributor role to service principal for AI Agent functionality
# This allows the service principal to create, modify, and delete Azure resources

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                 ║${NC}"
echo -e "${BLUE}║   Assign Contributor Role for AI Agent Resource Cloning        ║${NC}"
echo -e "${BLUE}║                                                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
  echo -e "${GREEN}✓${NC} Found .env file, loading credentials..."
  export $(cat .env | grep -v '^#' | xargs)
else
  echo -e "${RED}✗${NC} .env file not found!"
  echo "Please create a .env file with your Azure credentials."
  exit 1
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
  echo -e "${RED}✗${NC} Azure CLI is not installed"
  echo "Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
  exit 1
fi

echo -e "${GREEN}✓${NC} Azure CLI is installed"

# Check if logged in
if ! az account show &> /dev/null; then
  echo -e "${YELLOW}⚠${NC} Not logged in to Azure CLI"
  echo "Logging you in..."
  az login
fi

echo -e "${GREEN}✓${NC} Logged in to Azure CLI"

# Get current credentials
CURRENT_CLIENT_ID="${AZURE_CLIENT_ID}"
CURRENT_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID}"

if [ -z "$CURRENT_CLIENT_ID" ] || [ -z "$CURRENT_SUBSCRIPTION_ID" ]; then
  echo -e "${RED}✗${NC} Missing AZURE_CLIENT_ID or AZURE_SUBSCRIPTION_ID in .env"
  exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Current Configuration:${NC}"
echo -e "  Client ID:       ${CURRENT_CLIENT_ID}"
echo -e "  Subscription ID: ${CURRENT_SUBSCRIPTION_ID}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check current roles
echo -e "${BLUE}Checking current role assignments...${NC}"
CURRENT_ROLES=$(az role assignment list --assignee "$CURRENT_CLIENT_ID" --subscription "$CURRENT_SUBSCRIPTION_ID" --output json)

if echo "$CURRENT_ROLES" | grep -q '"roleDefinitionName": "Contributor"'; then
  echo -e "${GREEN}✓${NC} Service principal already has Contributor role!"
  exit 0
elif echo "$CURRENT_ROLES" | grep -q '"roleDefinitionName": "Owner"'; then
  echo -e "${GREEN}✓${NC} Service principal already has Owner role (which includes Contributor)!"
  exit 0
fi

echo -e "${YELLOW}⚠${NC} Service principal does NOT have Contributor role"
echo ""
echo -e "${BLUE}Current roles:${NC}"
echo "$CURRENT_ROLES" | jq -r '.[] | "  - " + .roleDefinitionName' || echo "  (Unable to parse roles)"
echo ""

# Ask for confirmation
echo -e "${YELLOW}This script will assign the Contributor role to the service principal.${NC}"
echo ""
echo -e "${YELLOW}⚠ IMPORTANT:${NC}"
echo "  • Contributor role allows creating, modifying, and deleting resources"
echo "  • This is required for the AI Agent to clone resource groups"
echo "  • You need Owner or User Access Administrator role to assign this"
echo ""
read -p "Do you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Assign Contributor role
echo ""
echo -e "${BLUE}Assigning Contributor role...${NC}"

if az role assignment create \
  --assignee "$CURRENT_CLIENT_ID" \
  --role "Contributor" \
  --subscription "$CURRENT_SUBSCRIPTION_ID" \
  --output none 2>&1; then
  
  echo -e "${GREEN}✓${NC} Contributor role assigned successfully!"
else
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Contributor role assigned successfully!"
  else
    echo -e "${RED}✗${NC} Failed to assign Contributor role"
    echo ""
    echo -e "${YELLOW}Possible reasons:${NC}"
    echo "  1. You don't have Owner or User Access Administrator role"
    echo "  2. The service principal doesn't exist"
    echo "  3. Network connectivity issues"
    echo ""
    echo -e "${BLUE}Try running this command manually:${NC}"
    echo "  az role assignment create \\"
    echo "    --assignee \"$CURRENT_CLIENT_ID\" \\"
    echo "    --role \"Contributor\" \\"
    echo "    --subscription \"$CURRENT_SUBSCRIPTION_ID\""
    exit 1
  fi
fi

# Verify the assignment
echo ""
echo -e "${BLUE}Verifying role assignment...${NC}"
sleep 3  # Wait for Azure to propagate the change

UPDATED_ROLES=$(az role assignment list --assignee "$CURRENT_CLIENT_ID" --subscription "$CURRENT_SUBSCRIPTION_ID" --output json)

if echo "$UPDATED_ROLES" | grep -q '"roleDefinitionName": "Contributor"'; then
  echo -e "${GREEN}✓${NC} Verification successful! Service principal now has Contributor role."
else
  echo -e "${YELLOW}⚠${NC} Role assignment created, but verification failed. This might be due to propagation delay."
  echo "Please wait a few minutes and check again with:"
  echo "  az role assignment list --assignee \"$CURRENT_CLIENT_ID\""
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ SETUP COMPLETE!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Current roles for service principal:${NC}"
echo "$UPDATED_ROLES" | jq -r '.[] | "  ✓ " + .roleDefinitionName' || echo "  (Unable to parse roles)"
echo ""
echo -e "${GREEN}The AI Agent can now create and clone Azure resources!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Restart your backend server: npm start"
echo "  2. Go to AI Agent in the web interface"
echo "  3. Try cloning a resource group"
echo ""

