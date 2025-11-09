#!/bin/bash

# Manual Permission Assignment Script
# Use this if you want to manually assign permissions for Azure-Central-AI-Hub

set -e

echo "🔐 Manual Azure Permission Assignment"
echo "======================================"
echo ""
echo "This script will assign required permissions to Azure-Central-AI-Hub service principal"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Service principal details
CLIENT_ID="1f16c4c4-8c61-4083-bda0-b5cd4f847dff"
TENANT_ID="a8f047ad-e0cb-4b81-badd-4556c4cd71f4"

echo "Service Principal Details:"
echo "  Name: Azure-Central-AI-Hub"
echo "  Client ID: $CLIENT_ID"
echo "  Tenant ID: $TENANT_ID"
echo ""

# Check Azure CLI
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed"
    echo "Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check login
print_status "Checking Azure login..."
if ! az account show &> /dev/null; then
    print_warning "Not logged in. Logging in now..."
    az login
fi

# Get subscription ID
echo ""
print_status "Available subscriptions:"
az account list --query "[].{Name:name, ID:id, IsDefault:isDefault}" --output table

echo ""
read -p "Enter the Subscription ID you want to use: " SUBSCRIPTION_ID

if [ -z "$SUBSCRIPTION_ID" ]; then
    print_error "Subscription ID is required"
    exit 1
fi

# Set subscription
print_status "Setting active subscription..."
az account set --subscription "$SUBSCRIPTION_ID"
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
print_success "Using subscription: $SUBSCRIPTION_NAME"

echo ""
print_status "Checking current role assignments..."
echo ""
az role assignment list \
    --assignee "$CLIENT_ID" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --query "[].{Role:roleDefinitionName, Scope:scope}" \
    --output table || echo "No roles currently assigned"

echo ""
print_warning "About to assign the following roles:"
echo "  1. Reader (for subscription and resource access)"
echo "  2. Cost Management Reader (for cost data access)"
echo ""
read -p "Continue? (Y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Nn]$ ]]; then
    print_warning "Aborted by user"
    exit 0
fi

# Assign Reader role
echo ""
print_status "Assigning Reader role..."
if az role assignment create \
    --assignee "$CLIENT_ID" \
    --role "Reader" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --output none 2>/dev/null; then
    print_success "Reader role assigned successfully"
else
    # Check if already assigned
    if az role assignment list \
        --assignee "$CLIENT_ID" \
        --scope "/subscriptions/$SUBSCRIPTION_ID" \
        --role "Reader" \
        --query "[].roleDefinitionName" \
        --output tsv | grep -q "Reader"; then
        print_success "Reader role already assigned"
    else
        print_error "Failed to assign Reader role"
        echo "You may not have sufficient permissions. Contact your subscription administrator."
        exit 1
    fi
fi

# Assign Cost Management Reader role
echo ""
print_status "Assigning Cost Management Reader role..."
if az role assignment create \
    --assignee "$CLIENT_ID" \
    --role "Cost Management Reader" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --output none 2>/dev/null; then
    print_success "Cost Management Reader role assigned successfully"
else
    # Check if already assigned
    if az role assignment list \
        --assignee "$CLIENT_ID" \
        --scope "/subscriptions/$SUBSCRIPTION_ID" \
        --role "Cost Management Reader" \
        --query "[].roleDefinitionName" \
        --output tsv | grep -q "Cost Management Reader"; then
        print_success "Cost Management Reader role already assigned"
    else
        print_error "Failed to assign Cost Management Reader role"
        echo "You may not have sufficient permissions. Contact your subscription administrator."
        exit 1
    fi
fi

# Verify assignments
echo ""
print_status "Verifying role assignments..."
echo ""
az role assignment list \
    --assignee "$CLIENT_ID" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --query "[].{Role:roleDefinitionName, Scope:scope}" \
    --output table

echo ""
print_success "✅ Permission assignment complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with these credentials:"
echo "   AZURE_TENANT_ID=$TENANT_ID"
echo "   AZURE_CLIENT_ID=$CLIENT_ID"
echo "   AZURE_CLIENT_SECRET=YOUR_CLIENT_SECRET_FROM_AZURE_PORTAL"
echo "   AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
echo ""
echo "2. Wait 5-10 minutes for role assignments to propagate"
echo ""
echo "3. Restart your application:"
echo "   npm run dev"
echo ""
echo "4. Test the permissions:"
echo "   curl http://localhost:5000/api/azure/validate-permissions"
echo ""

